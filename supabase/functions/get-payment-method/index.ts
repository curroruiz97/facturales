import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@17?target=deno";
import { getCorsHeaders, handleCorsOptions, jsonResponse } from "../_shared/cors.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return handleCorsOptions(req);
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
      return jsonResponse(req, { error: "No autenticado" }, 401);
    }

    const { data: sub } = await supabaseAdmin
      .from("billing_subscriptions")
      .select("stripe_customer_id, stripe_subscription_id")
      .eq("user_id", user.id)
      .in("status", ["active", "trialing"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!sub || !sub.stripe_customer_id) {
      return jsonResponse(req, { payment_method: null });
    }

    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeSecretKey) {
      return jsonResponse(req, { error: "Stripe no configurado" }, 500);
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2024-12-18.acacia",
    });

    const customer = await stripe.customers.retrieve(sub.stripe_customer_id) as Stripe.Customer;

    const defaultPmId =
      (customer.invoice_settings?.default_payment_method as string) ||
      (customer.default_source as string) ||
      null;

    if (!defaultPmId) {
      return jsonResponse(req, { payment_method: null });
    }

    const pm = await stripe.paymentMethods.retrieve(defaultPmId);

    if (pm.type === "card" && pm.card) {
      return jsonResponse(req, {
        payment_method: {
          type: "card",
          brand: pm.card.brand,
          last4: pm.card.last4,
          exp_month: pm.card.exp_month,
          exp_year: pm.card.exp_year,
        },
      });
    }

    return jsonResponse(req, {
      payment_method: {
        type: pm.type,
        brand: null,
        last4: null,
        exp_month: null,
        exp_year: null,
      },
    });
  } catch (error) {
    console.error("get-payment-method error:", error);
    return jsonResponse(req, { error: error.message || "Error interno" }, 500);
  }
});
