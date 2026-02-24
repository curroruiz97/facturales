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

    // Get the user's active subscription to find stripe_customer_id
    const { data: sub } = await supabaseAdmin
      .from("billing_subscriptions")
      .select("stripe_customer_id, stripe_subscription_id")
      .eq("user_id", user.id)
      .in("status", ["active", "trialing"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!sub || !sub.stripe_customer_id) {
      return jsonResponse(
        { error: "No se encontró una suscripción activa" },
        404,
      );
    }

    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeSecretKey) {
      return jsonResponse({ error: "Stripe no configurado" }, 500);
    }
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2024-12-18.acacia",
    });

    const appUrl = Deno.env.get("APP_URL") || "https://facturales.es";

    const session = await stripe.checkout.sessions.create({
      mode: "setup",
      customer: sub.stripe_customer_id,
      payment_method_types: ["card"],
      success_url: `${appUrl}/settings.html?payment_updated=true`,
      cancel_url: `${appUrl}/settings.html`,
      metadata: {
        user_id: user.id,
        subscription_id: sub.stripe_subscription_id,
      },
    });

    return jsonResponse({ url: session.url });
  } catch (error) {
    console.error("update-payment-method error:", error);
    return jsonResponse({ error: error.message || "Error interno" }, 500);
  }
});
