import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { serviceClient } from "../_shared/supabase.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PRODUCT_TO_TIER: Record<string, string> = {
  // Current live products
  "prod_UuPs7XFGchuAOC": "pro",
  "prod_UuPsofAJQj79gO": "pro",
  "prod_UuPsM90xu8d47e": "agency",
  "prod_UuPtrGta7sU60Q": "agency",
  // Historical products retained for existing subscriptions
  "prod_UJLxjx4LDdH1Ps": "pro",
  "prod_UJLxyYaqUCGjHg": "pro",
  "prod_UJLyj76FsosYjb": "agency",
  "prod_UJLyrKQhr9PclL": "agency",
};

// Cache Stripe reads for 15 min — subscription state rarely changes minute-to-minute.
// Client can force fresh check by sending { force: true }.
const STRIPE_CACHE_TTL_MS = 15 * 60 * 1000;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = serviceClient();

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    let force = false;
    if (req.method === "POST") {
      try {
        const body = await req.json();
        force = !!body?.force;
      } catch {
        // no body
      }
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated");

    // Parallel: local subscription cache + lifetime usage
    const [subRes, usageRes] = await Promise.all([
      supabaseClient
        .from("subscriptions")
        .select("plan_type, status, current_period_end, stripe_customer_id, updated_at")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabaseClient
        .from("usage_tracking")
        .select("lifetime_strategies_generated")
        .eq("user_id", user.id)
        .order("lifetime_strategies_generated", { ascending: false })
        .limit(1),
    ]);

    const strategiesUsed = usageRes.data?.[0]?.lifetime_strategies_generated ?? 0;
    const localSub = subRes.data;

    // Fast path: return cached subscription if fresh and not forced.
    if (!force && localSub?.updated_at) {
      const age = Date.now() - new Date(localSub.updated_at).getTime();
      if (age < STRIPE_CACHE_TTL_MS) {
        const isActive =
          localSub.status === "active" &&
          (localSub.plan_type === "pro" || localSub.plan_type === "agency");
        return new Response(JSON.stringify({
          subscribed: !!isActive,
          tier: isActive ? localSub.plan_type : null,
          subscription_end: localSub.current_period_end ?? null,
          strategies_used: strategiesUsed,
          source: "cache",
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }
    }

    // Slow path: hit Stripe & refresh local cache.
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });

    if (customers.data.length === 0) {
      await supabaseClient
        .from("subscriptions")
        .upsert({
          user_id: user.id,
          status: "inactive",
          plan_type: null,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" });
      return new Response(JSON.stringify({
        subscribed: false,
        tier: null,
        subscription_end: null,
        strategies_used: strategiesUsed,
        source: "stripe",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    const subscriptions = await stripe.subscriptions.list({ customer: customerId, limit: 1 });
    const activeSub = subscriptions.data.find(s => s.status === "active");

    if (!activeSub) {
      await supabaseClient
        .from("subscriptions")
        .upsert({
          user_id: user.id,
          stripe_customer_id: customerId,
          status: "inactive",
          plan_type: null,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" });
      return new Response(JSON.stringify({
        subscribed: false,
        tier: null,
        subscription_end: null,
        strategies_used: strategiesUsed,
        source: "stripe",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const productId = activeSub.items.data[0].price.product as string;
    const tier = PRODUCT_TO_TIER[productId] || "pro";
    const subscriptionEnd = new Date(activeSub.current_period_end * 1000).toISOString();

    await supabaseClient
      .from("subscriptions")
      .upsert({
        user_id: user.id,
        stripe_customer_id: customerId,
        stripe_subscription_id: activeSub.id,
        plan_type: tier,
        status: activeSub.status,
        current_period_end: subscriptionEnd,
        cancel_at_period_end: activeSub.cancel_at_period_end,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });

    return new Response(JSON.stringify({
      subscribed: true,
      tier,
      subscription_end: subscriptionEnd,
      strategies_used: strategiesUsed,
      source: "stripe",
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
