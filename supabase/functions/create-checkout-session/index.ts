// Supabase Edge Function: create-checkout-session
// Crea una Stripe Checkout Session para suscripciones.
// Requiere JWT del usuario autenticado.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@17?target=deno";
import { getCorsHeaders, handleCorsOptions, jsonResponse } from "../_shared/cors.ts";

// ============================================
// Allowlists
// ============================================
const VALID_PLANS = ["starter", "pro", "business"] as const;
const VALID_INTERVALS = ["monthly", "yearly"] as const;
type Plan = (typeof VALID_PLANS)[number];
type Interval = (typeof VALID_INTERVALS)[number];

// Plans that qualify for free trial
const TRIAL_PLANS: ReadonlySet<string> = new Set(["starter", "pro", "business"]);
const TRIAL_DAYS = 14;

// ============================================
// Resolve Stripe Price ID from env vars
// ============================================
function getPriceId(plan: Plan, interval: Interval): string | null {
  const key = `STRIPE_PRICE_${plan.toUpperCase()}_${interval.toUpperCase()}`;
  return Deno.env.get(key) || null;
}

// ============================================
// Handler
// ============================================
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return handleCorsOptions(req);
  }

  try {
    // ── 1. Parse payload ──────────────────────────────────
    const { plan, interval } = await req.json() as { plan: string; interval: string };

    if (!plan || !VALID_PLANS.includes(plan as Plan)) {
      return jsonResponse(req, { error: "plan inválido. Valores permitidos: starter, pro, business" }, 400);
    }
    if (!interval || !VALID_INTERVALS.includes(interval as Interval)) {
      return jsonResponse(req, { error: "interval inválido. Valores permitidos: monthly, yearly" }, 400);
    }

    // ── 2. Resolve price ID ───────────────────────────────
    const priceId = getPriceId(plan as Plan, interval as Interval);
    if (!priceId) {
      console.error(`Missing env var: STRIPE_PRICE_${plan.toUpperCase()}_${interval.toUpperCase()}`);
      return jsonResponse(req, { error: "Precio no configurado para este plan/intervalo" }, 500);
    }

    // ── 3. Validate JWT ───────────────────────────────────
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization")!;

    const supabaseUser = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return jsonResponse(req, { error: "No autenticado" }, 401);
    }

    // ── 4. Init Stripe ────────────────────────────────────
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeSecretKey) {
      return jsonResponse(req, { error: "Stripe no configurado" }, 500);
    }
    const stripe = new Stripe(stripeSecretKey, { apiVersion: "2024-12-18.acacia" });

    // ── 5. Find or create Stripe customer ─────────────────
    let stripeCustomerId: string | null = null;

    const { data: existingSub } = await supabaseAdmin
      .from("billing_subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingSub?.stripe_customer_id) {
      stripeCustomerId = existingSub.stripe_customer_id;
    } else {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { user_id: user.id },
      });
      stripeCustomerId = customer.id;
    }

    // ── 6. Create Checkout Session ────────────────────────
    const appUrl = Deno.env.get("APP_URL") || "https://facturales.es";

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      customer: stripeCustomerId,
      mode: "subscription",
      allow_promotion_codes: true,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/billing/cancel?plan=${plan}`,
      metadata: { user_id: user.id, plan, interval },
      subscription_data: {
        metadata: { user_id: user.id, plan, interval },
      },
    };

    if (TRIAL_PLANS.has(plan)) {
      sessionParams.subscription_data!.trial_period_days = TRIAL_DAYS;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    return jsonResponse(req, { url: session.url, sessionId: session.id });
  } catch (error) {
    console.error("create-checkout-session error:", error);
    return jsonResponse(req, { error: error.message || "Error interno" }, 500);
  }
});
