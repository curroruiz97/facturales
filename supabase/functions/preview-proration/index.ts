import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@17?target=deno";
import { getCorsHeaders, handleCorsOptions, jsonResponse } from "../_shared/cors.ts";

const VALID_PLANS = ["starter", "pro", "business"] as const;
const VALID_INTERVALS = ["monthly", "yearly"] as const;
type Plan = (typeof VALID_PLANS)[number];
type Interval = (typeof VALID_INTERVALS)[number];

const PLAN_RANK: Record<string, number> = { starter: 1, pro: 2, business: 3 };

function getPriceId(plan: Plan, interval: Interval): string | null {
  const key = `STRIPE_PRICE_${plan.toUpperCase()}_${interval.toUpperCase()}`;
  return Deno.env.get(key) || null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return handleCorsOptions(req);
  }

  try {
    const { new_plan, new_interval } = (await req.json()) as {
      new_plan: string;
      new_interval: string;
    };

    if (!new_plan || !VALID_PLANS.includes(new_plan as Plan)) {
      return jsonResponse(req, { error: "plan inválido" }, 400);
    }
    if (!new_interval || !VALID_INTERVALS.includes(new_interval as Interval)) {
      return jsonResponse(req, { error: "interval inválido" }, 400);
    }

    const newPriceId = getPriceId(new_plan as Plan, new_interval as Interval);
    if (!newPriceId) {
      return jsonResponse(req, { error: "Precio no configurado" }, 500);
    }

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
      .select("*")
      .eq("user_id", user.id)
      .in("status", ["active", "trialing"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!sub || !sub.stripe_subscription_id) {
      return jsonResponse(req, { error: "No tienes una suscripción activa" }, 404);
    }

    if (sub.plan === new_plan) {
      return jsonResponse(req, { error: "Ya tienes este plan" }, 400);
    }

    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeSecretKey) {
      return jsonResponse(req, { error: "Stripe no configurado" }, 500);
    }
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2024-12-18.acacia",
    });

    const isUpgrade =
      (PLAN_RANK[new_plan] || 0) > (PLAN_RANK[sub.plan] || 0);

    if (isUpgrade) {
      const stripeSub = await stripe.subscriptions.retrieve(
        sub.stripe_subscription_id,
      );
      const currentItemId = stripeSub.items.data[0]?.id;
      if (!currentItemId) {
        return jsonResponse(
          { error: "No se pudo obtener el item de la suscripción" },
          500,
        );
      }

      const prorationDate = Math.floor(Date.now() / 1000);

      const preview = await stripe.invoices.createPreview({
        customer: sub.stripe_customer_id,
        subscription: sub.stripe_subscription_id,
        subscription_details: {
          items: [{ id: currentItemId, price: newPriceId }],
          proration_date: prorationDate,
          proration_behavior: "always_invoice",
        },
      });

      // Filter only proration lines (credit for old plan + charge for new plan)
      // Exclude regular upcoming subscription charges
      const prorationLines = preview.lines.data.filter((l: any) => {
        // Proration lines have period.start <= proration date
        // Regular subscription lines have period.start at the next billing cycle
        return l.proration === true || l.period?.start === prorationDate;
      });

      const prorationAmount = prorationLines.reduce(
        (sum: number, l: any) => sum + l.amount,
        0,
      ) / 100;

      const currency = preview.currency.toUpperCase();

      return jsonResponse(req, {
        type: "upgrade",
        amount_due: Math.max(prorationAmount, 0),
        currency: currency,
        current_plan: sub.plan,
        new_plan: new_plan,
        new_interval: new_interval,
        period_end: sub.current_period_end,
        lines: prorationLines.map((l: any) => ({
          description: l.description,
          amount: l.amount / 100,
          proration: l.proration || false,
        })),
      });
    } else {
      return jsonResponse(req, {
        type: "downgrade",
        amount_due: 0,
        currency: "EUR",
        current_plan: sub.plan,
        new_plan: new_plan,
        new_interval: new_interval,
        period_end: sub.current_period_end,
        message:
          "El cambio se aplicará al final del periodo actual. Seguirás con tu plan actual hasta entonces.",
      });
    }
  } catch (error) {
    console.error("preview-proration error:", error);
    return jsonResponse(req, { error: error.message || "Error interno" }, 500);
  }
});
