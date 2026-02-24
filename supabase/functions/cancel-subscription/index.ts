// Supabase Edge Function: cancel-subscription
// Marca cancel_at_period_end=true en Stripe y actualiza billing_subscriptions.
// Requiere JWT del usuario autenticado.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@17?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // ── 1. Validate JWT ───────────────────────────────────
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization")!;

    const supabaseUser = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const {
      data: { user },
      error: authError,
    } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return jsonResponse({ error: "No autenticado" }, 401);
    }

    // ── 2. Get active subscription from DB ─────────────────
    const { data: sub, error: subError } = await supabaseAdmin
      .from("billing_subscriptions")
      .select("stripe_subscription_id, current_period_end, plan")
      .eq("user_id", user.id)
      .in("status", ["trialing", "active"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (subError) {
      console.error("Error fetching subscription:", subError);
      return jsonResponse({ error: "Error consultando suscripción" }, 500);
    }

    if (!sub || !sub.stripe_subscription_id) {
      return jsonResponse({ error: "No tienes una suscripción activa" }, 404);
    }

    // ── 3. Call Stripe to set cancel_at_period_end ─────────
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeSecretKey) {
      return jsonResponse({ error: "Stripe no configurado" }, 500);
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2024-12-18.acacia",
    });

    const updatedSub = await stripe.subscriptions.update(
      sub.stripe_subscription_id,
      { cancel_at_period_end: true },
    );

    // ── 4. Update our DB immediately (webhook will also fire) ──
    const { error: updateError } = await supabaseAdmin
      .from("billing_subscriptions")
      .update({
        cancel_at_period_end: true,
        updated_at: new Date().toISOString(),
      })
      .eq("stripe_subscription_id", sub.stripe_subscription_id);

    if (updateError) {
      console.error("Error updating billing_subscriptions:", updateError);
    }

    const periodEnd = new Date(
      updatedSub.current_period_end * 1000,
    ).toISOString();

    return jsonResponse({
      success: true,
      cancel_at_period_end: true,
      current_period_end: periodEnd,
      plan: sub.plan,
    });
  } catch (error) {
    console.error("cancel-subscription error:", error);
    return jsonResponse(
      { error: error.message || "Error interno" },
      500,
    );
  }
});
