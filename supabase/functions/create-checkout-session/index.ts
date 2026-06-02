// Supabase Edge Function: create-checkout-session
// Crea una Stripe Checkout Session para suscripciones.
// verify_jwt=false en el gateway: por eso validamos el token SIEMPRE contra
// Supabase Auth (auth.getUser), que verifica la FIRMA. No basta con decodificar el JWT.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@17?target=deno";
import { handleCorsOptions, jsonResponse } from "../_shared/cors.ts";

const VALID_PLANS = ["starter", "pro", "business"] as const;
const VALID_INTERVALS = ["monthly", "yearly"] as const;
type Plan = (typeof VALID_PLANS)[number];
type Interval = (typeof VALID_INTERVALS)[number];

const TRIAL_PLANS: ReadonlySet<string> = new Set(["starter", "pro", "business"]);
const TRIAL_DAYS = 14;

function getPriceId(plan: Plan, interval: Interval): string | null {
  const key = `STRIPE_PRICE_${plan.toUpperCase()}_${interval.toUpperCase()}`;
  return Deno.env.get(key) || null;
}

/**
 * Valida el token contra Supabase Auth (verifica la FIRMA, no solo decodifica el payload).
 * Imprescindible porque el gateway corre con verify_jwt=false: sin esto, un JWT
 * fabricado con cualquier `sub` sería aceptado (suplantación de identidad).
 */
async function authenticateUser(authHeader: string): Promise<{ id: string; email?: string } | null> {
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey);
  const { data, error } = await supabaseAuth.auth.getUser(token);
  if (error || !data?.user) return null;
  return { id: data.user.id, email: data.user.email ?? undefined };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return handleCorsOptions(req);

  try {
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader) return jsonResponse(req, { error: "Falta header Authorization" }, 401);
    const jwt = await authenticateUser(authHeader);
    if (!jwt) return jsonResponse(req, { error: "No autorizado: token inválido" }, 401);

    const { plan, interval } = await req.json() as { plan: string; interval: string };
    if (!plan || !VALID_PLANS.includes(plan as Plan)) {
      return jsonResponse(req, { error: "plan inválido. Valores permitidos: starter, pro, business" }, 400);
    }
    if (!interval || !VALID_INTERVALS.includes(interval as Interval)) {
      return jsonResponse(req, { error: "interval inválido. Valores permitidos: monthly, yearly" }, 400);
    }

    const priceId = getPriceId(plan as Plan, interval as Interval);
    if (!priceId) {
      console.error(`Missing env var: STRIPE_PRICE_${plan.toUpperCase()}_${interval.toUpperCase()}`);
      return jsonResponse(req, { error: "Precio no configurado para este plan/intervalo" }, 500);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeSecretKey) {
      return jsonResponse(req, { error: "Stripe no configurado (falta STRIPE_SECRET_KEY)" }, 500);
    }
    const stripe = new Stripe(stripeSecretKey, { apiVersion: "2024-12-18.acacia" });

    // Find or create Stripe customer
    let stripeCustomerId: string | null = null;
    const { data: existingSub } = await supabaseAdmin
      .from("billing_subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", jwt.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingSub?.stripe_customer_id) {
      stripeCustomerId = existingSub.stripe_customer_id;
    } else {
      const customer = await stripe.customers.create({
        email: jwt.email,
        metadata: { user_id: jwt.id },
      });
      stripeCustomerId = customer.id;
    }

    // Prefer request origin for redirects (soporta app.facturales.es y facturales.es)
    const origin = req.headers.get("Origin") || Deno.env.get("APP_URL") || "https://app.facturales.es";

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      customer: stripeCustomerId,
      mode: "subscription",
      allow_promotion_codes: true,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/billing/cancel?plan=${plan}`,
      metadata: { user_id: jwt.id, plan, interval },
      subscription_data: { metadata: { user_id: jwt.id, plan, interval } },
    };

    if (TRIAL_PLANS.has(plan)) {
      sessionParams.subscription_data!.trial_period_days = TRIAL_DAYS;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);
    return jsonResponse(req, { url: session.url, sessionId: session.id });
  } catch (error) {
    console.error("create-checkout-session error:", error);
    return jsonResponse(req, { error: (error as Error).message || "Error interno" }, 500);
  }
});
