// Supabase Edge Function: stripe-webhook
// Recibe eventos de Stripe, verifica firma, y sincroniza billing_subscriptions + business_info.
// NO requiere JWT — autenticación vía firma del webhook.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@17?target=deno";

// ============================================
// Helpers
// ============================================
function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// Map Stripe subscription status to internal status
function mapStripeStatus(stripeStatus: string): string {
  switch (stripeStatus) {
    case "trialing":
      return "trialing";
    case "active":
      return "active";
    case "past_due":
    case "unpaid":
      return "past_due";
    case "canceled":
    case "incomplete_expired":
      return "canceled";
    default:
      return stripeStatus;
  }
}

// Extract plan/interval from subscription metadata, falling back to session metadata
function extractPlanInfo(metadata: Record<string, string> | null): { plan: string; interval: string } {
  const plan = metadata?.plan || "starter";
  const interval = metadata?.interval || "monthly";
  return { plan, interval };
}

// Safely convert a Stripe unix timestamp to ISO string
function toISO(ts: number | null | undefined): string | null {
  if (!ts || typeof ts !== "number") return null;
  try {
    return new Date(ts * 1000).toISOString();
  } catch {
    return null;
  }
}

// ============================================
// Helpers: resolve user_id
// ============================================

/**
 * Resolves user_id from subscription metadata, falling back to
 * looking it up in billing_subscriptions by stripe_subscription_id.
 * This is critical for Stripe-initiated events (expiration, payment
 * failure) where metadata.user_id may be absent.
 */
async function resolveUserId(
  metadata: Record<string, string> | null,
  stripeSubscriptionId: string,
  supabase: ReturnType<typeof createClient>,
): Promise<string | null> {
  if (metadata?.user_id) return metadata.user_id;

  const { data } = await supabase
    .from("billing_subscriptions")
    .select("user_id")
    .eq("stripe_subscription_id", stripeSubscriptionId)
    .maybeSingle();

  if (data?.user_id) {
    console.log(`Resolved user_id ${data.user_id} from billing_subscriptions for ${stripeSubscriptionId}`);
    return data.user_id;
  }

  console.error(`Cannot resolve user_id for subscription ${stripeSubscriptionId}`);
  return null;
}

// ============================================
// Event handlers
// ============================================

async function handleSetupCheckoutCompleted(
  session: Stripe.Checkout.Session,
  stripe: Stripe,
) {
  const setupIntentId = session.setup_intent as string;
  if (!setupIntentId) return;

  const setupIntent = await stripe.setupIntents.retrieve(setupIntentId);
  const paymentMethodId = setupIntent.payment_method as string;
  if (!paymentMethodId) return;

  const customerId = session.customer as string;
  const subscriptionId = session.metadata?.subscription_id;

  // Set as customer's default payment method
  await stripe.customers.update(customerId, {
    invoice_settings: { default_payment_method: paymentMethodId },
  });

  // Also set as subscription's default if we have the subscription ID
  if (subscriptionId) {
    await stripe.subscriptions.update(subscriptionId, {
      default_payment_method: paymentMethodId,
    });
  }

  console.log(
    `Payment method ${paymentMethodId} set as default for customer ${customerId}`,
  );
}

async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session,
  stripe: Stripe,
  supabase: ReturnType<typeof createClient>,
) {
  // Handle setup mode (payment method update)
  if (session.mode === "setup") {
    await handleSetupCheckoutCompleted(session, stripe);
    return;
  }

  const userId = session.metadata?.user_id;
  if (!userId) {
    console.error("checkout.session.completed: missing user_id in metadata");
    return;
  }

  const subscriptionId = session.subscription as string;
  if (!subscriptionId) {
    console.warn("checkout.session.completed: no subscription (one-time payment?)");
    return;
  }

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const { plan, interval } = extractPlanInfo(subscription.metadata);
  const status = mapStripeStatus(subscription.status);

  // Upsert billing_subscriptions
  const { error: upsertError } = await supabase
    .from("billing_subscriptions")
    .upsert(
      {
        user_id: userId,
        stripe_customer_id: session.customer as string,
        stripe_subscription_id: subscriptionId,
        stripe_checkout_session_id: session.id,
        plan,
        interval,
        status,
        current_period_start: toISO(subscription.current_period_start),
        current_period_end: toISO(subscription.current_period_end),
        cancel_at_period_end: subscription.cancel_at_period_end,
        trial_start: toISO(subscription.trial_start),
        trial_end: toISO(subscription.trial_end),
      },
      { onConflict: "stripe_subscription_id" },
    );

  if (upsertError) {
    console.error("Error upserting billing_subscriptions:", upsertError);
  }

  // Sync business_info
  await syncBusinessInfo(supabase, userId, plan, interval);
}

async function handleSubscriptionChange(
  eventSub: Stripe.Subscription,
  stripe: Stripe,
  supabase: ReturnType<typeof createClient>,
) {
  console.log(`handleSubscriptionChange: sub=${eventSub.id}, status=${eventSub.status}, period_start=${eventSub.current_period_start}, period_end=${eventSub.current_period_end}`);

  // The webhook event payload (API 2024-12-18.acacia) may omit period dates.
  // Always retrieve the full subscription from Stripe API to get accurate dates.
  const subscription = await stripe.subscriptions.retrieve(eventSub.id);
  console.log(`handleSubscriptionChange (retrieved): period_start=${subscription.current_period_start}, period_end=${subscription.current_period_end}`);

  const userId = await resolveUserId(subscription.metadata, subscription.id, supabase);

  const { plan, interval } = extractPlanInfo(subscription.metadata);
  const status = mapStripeStatus(subscription.status);

  const updatePayload: Record<string, unknown> = {
    plan,
    interval,
    status,
    cancel_at_period_end: subscription.cancel_at_period_end,
    pending_downgrade_plan: null,
    pending_downgrade_interval: null,
    current_period_start: toISO(subscription.current_period_start),
    current_period_end: toISO(subscription.current_period_end),
    trial_start: toISO(subscription.trial_start),
    trial_end: toISO(subscription.trial_end),
  };

  const { error } = await supabase
    .from("billing_subscriptions")
    .update(updatePayload)
    .eq("stripe_subscription_id", subscription.id);

  if (error) {
    console.error("Error updating billing_subscriptions:", error);
  }

  // Sync business_info (requires user_id)
  if (userId) {
    if (status === "canceled") {
      await syncBusinessInfo(supabase, userId, null, null);
    } else {
      await syncBusinessInfo(supabase, userId, plan, interval);
    }
  }
}

async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription,
  supabase: ReturnType<typeof createClient>,
) {
  const userId = await resolveUserId(subscription.metadata, subscription.id, supabase);

  const { error } = await supabase
    .from("billing_subscriptions")
    .update({
      status: "canceled",
      cancel_at_period_end: false,
      pending_downgrade_plan: null,
      pending_downgrade_interval: null,
    })
    .eq("stripe_subscription_id", subscription.id);

  if (error) {
    console.error("Error marking subscription canceled:", error);
  }

  if (userId) {
    await syncBusinessInfo(supabase, userId, null, null);
  }
}

async function handleInvoicePaymentFailed(
  invoice: Stripe.Invoice,
  supabase: ReturnType<typeof createClient>,
) {
  const subscriptionId = invoice.subscription as string;
  if (!subscriptionId) return;

  const { error } = await supabase
    .from("billing_subscriptions")
    .update({ status: "past_due" })
    .eq("stripe_subscription_id", subscriptionId);

  if (error) {
    console.error("Error updating subscription to past_due:", error);
  }
}

async function handleInvoicePaymentSucceeded(
  invoice: Stripe.Invoice,
  stripe: Stripe,
  supabase: ReturnType<typeof createClient>,
) {
  const subscriptionId = invoice.subscription as string;
  if (!subscriptionId) return;

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const status = mapStripeStatus(subscription.status);
  const { plan, interval } = extractPlanInfo(subscription.metadata);

  const { error } = await supabase
    .from("billing_subscriptions")
    .update({
      plan,
      interval,
      status,
      pending_downgrade_plan: null,
      pending_downgrade_interval: null,
      current_period_start: toISO(subscription.current_period_start),
      current_period_end: toISO(subscription.current_period_end),
    })
    .eq("stripe_subscription_id", subscriptionId);

  if (error) {
    console.error("Error updating subscription after payment:", error);
  }

  const userId = await resolveUserId(subscription.metadata, subscriptionId, supabase);
  if (userId) {
    await syncBusinessInfo(supabase, userId, plan, interval);
  }
}

// Keep business_info in sync (for quick reads from frontend)
async function syncBusinessInfo(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  plan: string,
  interval: string,
) {
  const { error } = await supabase
    .from("business_info")
    .update({
      subscription_plan: plan,
      subscription_interval: interval,
      subscription_updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  if (error) {
    console.error("Error syncing business_info:", error);
  }
}

// ============================================
// Main handler
// ============================================
Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!stripeSecretKey || !webhookSecret) {
    console.error("Missing STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET");
    return jsonResponse({ error: "Webhook not configured" }, 500);
  }

  const stripe = new Stripe(stripeSecretKey, { apiVersion: "2024-12-18.acacia" });

  // ── 1. Verify signature ─────────────────────────────────
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return jsonResponse({ error: "Missing stripe-signature header" }, 400);
  }

  const rawBody = await req.text();
  let event: Stripe.Event;

  try {
    event = await stripe.webhooks.constructEventAsync(rawBody, signature, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return jsonResponse({ error: "Invalid signature" }, 400);
  }

  // ── 2. Idempotency check ────────────────────────────────
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const { data: existingEvent } = await supabase
    .from("billing_events")
    .select("stripe_event_id")
    .eq("stripe_event_id", event.id)
    .maybeSingle();

  if (existingEvent) {
    return jsonResponse({ received: true, duplicate: true });
  }

  // ── 3. Route event ──────────────────────────────────────
  // Process FIRST, then mark as processed. This way if the handler
  // throws, Stripe will retry and the event won't be blocked.
  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session, stripe, supabase);
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionChange(subscription, stripe, supabase);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription, supabase);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaymentFailed(invoice, supabase);
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaymentSucceeded(invoice, stripe, supabase);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
  } catch (err) {
    console.error(`Error processing ${event.type} (${event.id}):`, err?.message || err, err?.stack || "");
    return jsonResponse({ error: "Error processing event" }, 500);
  }

  // ── 4. Mark event as processed (after successful handling) ──
  const { error: insertError } = await supabase
    .from("billing_events")
    .insert({ stripe_event_id: event.id, event_type: event.type });

  if (insertError && insertError.code !== "23505") {
    console.error("Error inserting billing_event:", insertError);
  }

  return jsonResponse({ received: true });
});
