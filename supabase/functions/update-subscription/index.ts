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
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { new_plan, new_interval } = (await req.json()) as {
      new_plan: string;
      new_interval: string;
    };

    if (!new_plan || !VALID_PLANS.includes(new_plan as Plan)) {
      return jsonResponse({ error: "plan inválido" }, 400);
    }
    if (!new_interval || !VALID_INTERVALS.includes(new_interval as Interval)) {
      return jsonResponse({ error: "interval inválido" }, 400);
    }

    const newPriceId = getPriceId(new_plan as Plan, new_interval as Interval);
    if (!newPriceId) {
      return jsonResponse({ error: "Precio no configurado" }, 500);
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
      return jsonResponse({ error: "No autenticado" }, 401);
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
      return jsonResponse({ error: "No tienes una suscripción activa" }, 404);
    }

    if (sub.plan === new_plan) {
      return jsonResponse({ error: "Ya tienes este plan" }, 400);
    }

    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeSecretKey) {
      return jsonResponse({ error: "Stripe no configurado" }, 500);
    }
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2024-12-18.acacia",
    });

    const isUpgrade =
      (PLAN_RANK[new_plan] || 0) > (PLAN_RANK[sub.plan] || 0);

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

    if (isUpgrade) {
      // ─── UPGRADE: apply immediately, charge proration now ───
      const updated = await stripe.subscriptions.update(
        sub.stripe_subscription_id,
        {
          items: [{ id: currentItemId, price: newPriceId }],
          proration_behavior: "always_invoice",
          metadata: {
            user_id: user.id,
            plan: new_plan,
            interval: new_interval,
          },
        },
      );

      await supabaseAdmin
        .from("billing_subscriptions")
        .update({
          plan: new_plan,
          interval: new_interval,
          status: updated.status,
          pending_downgrade_plan: null,
          pending_downgrade_interval: null,
          updated_at: new Date().toISOString(),
        })
        .eq("stripe_subscription_id", sub.stripe_subscription_id);

      await supabaseAdmin
        .from("business_info")
        .update({
          subscription_plan: new_plan,
          subscription_interval: new_interval,
          subscription_updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);

      return jsonResponse({
        success: true,
        type: "upgrade",
        plan: new_plan,
        status: updated.status,
      });
    } else {
      // ─── DOWNGRADE: schedule at period end ───
      // Create a subscription schedule from the current subscription,
      // then add a phase that starts at period_end with the new plan.
      // This ensures Stripe automatically switches the plan at renewal.

      let schedule: Stripe.SubscriptionSchedule;
      if (stripeSub.schedule) {
        schedule = await stripe.subscriptionSchedules.retrieve(
          stripeSub.schedule as string,
        );
      } else {
        schedule = await stripe.subscriptionSchedules.create({
          from_subscription: sub.stripe_subscription_id,
        });
      }

      // Build phases: current phase keeps current plan, next phase starts with new plan
      const currentPhaseEnd = stripeSub.current_period_end;

      await stripe.subscriptionSchedules.update(schedule.id, {
        phases: [
          {
            items: [{ price: stripeSub.items.data[0].price.id, quantity: 1 }],
            start_date: stripeSub.current_period_start,
            end_date: currentPhaseEnd,
            proration_behavior: "none",
          },
          {
            items: [{ price: newPriceId, quantity: 1 }],
            start_date: currentPhaseEnd,
            proration_behavior: "none",
            metadata: {
              user_id: user.id,
              plan: new_plan,
              interval: new_interval,
            },
          },
        ],
        metadata: {
          user_id: user.id,
          pending_plan: new_plan,
          pending_interval: new_interval,
        },
      });

      // Store pending downgrade in our DB (plan stays the same until renewal)
      await supabaseAdmin
        .from("billing_subscriptions")
        .update({
          pending_downgrade_plan: new_plan,
          pending_downgrade_interval: new_interval,
          updated_at: new Date().toISOString(),
        })
        .eq("stripe_subscription_id", sub.stripe_subscription_id);

      return jsonResponse({
        success: true,
        type: "downgrade",
        current_plan: sub.plan,
        new_plan: new_plan,
        period_end: sub.current_period_end,
      });
    }
  } catch (error) {
    console.error("update-subscription error:", error);
    return jsonResponse({ error: error.message || "Error interno" }, 500);
  }
});
