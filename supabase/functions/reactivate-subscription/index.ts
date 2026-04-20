// Supabase Edge Function: reactivate-subscription
// Revierte cancel_at_period_end a false en Stripe y actualiza billing_subscriptions.

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

    // Buscar suscripción con cancel_at_period_end=true
    const { data: sub, error: subError } = await supabaseAdmin
      .from("billing_subscriptions")
      .select("stripe_subscription_id, plan, current_period_end")
      .eq("user_id", user.id)
      .eq("cancel_at_period_end", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (subError) {
      console.error("Error fetching subscription:", subError);
      return jsonResponse(req, { error: "Error consultando suscripción" }, 500);
    }

    if (!sub || !sub.stripe_subscription_id) {
      return jsonResponse(
        req,
        { error: "No tienes una suscripción pendiente de cancelación" },
        404,
      );
    }

    // Verificar que el periodo no haya expirado
    if (new Date(sub.current_period_end) <= new Date()) {
      return jsonResponse(
        req,
        { error: "El periodo de tu suscripción ya ha finalizado" },
        400,
      );
    }

    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeSecretKey) {
      return jsonResponse(req, { error: "Stripe no configurado" }, 500);
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2024-12-18.acacia",
    });

    await stripe.subscriptions.update(sub.stripe_subscription_id, {
      cancel_at_period_end: false,
    });

    // Actualizar DB inmediatamente
    await supabaseAdmin
      .from("billing_subscriptions")
      .update({
        cancel_at_period_end: false,
        status: "active",
        updated_at: new Date().toISOString(),
      })
      .eq("stripe_subscription_id", sub.stripe_subscription_id);

    return jsonResponse(req, {
      success: true,
      cancel_at_period_end: false,
      plan: sub.plan,
    });
  } catch (error) {
    console.error("reactivate-subscription error:", error);
    return jsonResponse(req, { error: error.message || "Error interno" }, 500);
  }
});
