import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

// Real-time subscription sync. Without this, the `subscriptions` table only
// updates when check-subscription happens to run (page load, with a 15-min
// cache) -- a cancellation or failed payment can sit stale for a while, and
// nothing proactively reacts to it. This closes that gap: Stripe pushes the
// state change the moment it happens.
//
// Kept as a strict ADDITION, not a replacement -- check-subscription's live
// Stripe lookup stays as the source of truth a client can always force-
// refresh; this just keeps the cached row current without waiting on that.
//
// PRODUCT_TO_TIER is intentionally duplicated from check-subscription/index.ts
// rather than extracted to a shared module in this change -- the goal here
// is additive-only (new function, new webhook secret, zero risk to the
// already-working checkout/portal/check-subscription flows). Keep both
// copies in sync if a new price tier is ever added.
const PRODUCT_TO_TIER: Record<string, string> = {
  "prod_UuPs7XFGchuAOC": "pro",
  "prod_UuPsofAJQj79gO": "pro",
  "prod_UuPsM90xu8d47e": "agency",
  "prod_UuPtrGta7sU60Q": "agency",
  "prod_UJLxjx4LDdH1Ps": "pro",
  "prod_UJLxyYaqUCGjHg": "pro",
  "prod_UJLyj76FsosYjb": "agency",
  "prod_UJLyrKQhr9PclL": "agency",
};

const RELEVANT_EVENTS = new Set([
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
]);

async function upsertFromSubscription(
  supabase: ReturnType<typeof createClient>,
  stripe: Stripe,
  subscription: Stripe.Subscription,
): Promise<void> {
  let userId = subscription.metadata?.supabase_user_id as string | undefined;

  // Fallback for subscriptions created before this webhook existed (no
  // metadata yet): resolve the Supabase user the same way check-subscription
  // does, by the Stripe customer's email.
  if (!userId) {
    const customerId =
      typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
    const customer = await stripe.customers.retrieve(customerId);
    const email = !customer.deleted ? customer.email : null;
    if (!email) {
      console.error(`[stripe-webhook] subscription ${subscription.id} has no metadata.supabase_user_id and its customer has no email -- cannot map to a user`);
      return;
    }
    const { data: authUsers } = await supabase.auth.admin.listUsers({ page: 1, perPage: 200 });
    const match = authUsers?.users?.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (!match) {
      console.error(`[stripe-webhook] no Supabase user found for email on subscription ${subscription.id}`);
      return;
    }
    userId = match.id;
  }

  const active = subscription.status === "active" || subscription.status === "trialing";
  const productId = subscription.items.data[0]?.price?.product;
  const productIdStr = typeof productId === "string" ? productId : productId?.id;
  const tier = active ? PRODUCT_TO_TIER[productIdStr ?? ""] ?? "pro" : null;

  const customerId =
    typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;

  const { error } = await supabase.from("subscriptions").upsert(
    {
      user_id: userId,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscription.id,
      plan_type: tier,
      status: active ? subscription.status : "inactive",
      // Matches check-subscription's exact field access (activeSub.current_period_end)
      // for consistency -- that function's live Stripe reads are the proven-working
      // reference for this SDK/API version in this codebase.
      current_period_end: subscription.current_period_end
        ? new Date(subscription.current_period_end * 1000).toISOString()
        : null,
      cancel_at_period_end: subscription.cancel_at_period_end,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (error) {
    console.error(`[stripe-webhook] upsert failed for user ${userId}:`, error.message);
    throw error;
  }
  console.log(`[stripe-webhook] synced user ${userId}: status=${subscription.status} tier=${tier ?? "none"}`);
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  if (!webhookSecret || !stripeKey) {
    console.error("[stripe-webhook] STRIPE_WEBHOOK_SECRET or STRIPE_SECRET_KEY not configured");
    return new Response("Server configuration error", { status: 500 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return new Response("Missing stripe-signature header", { status: 400 });
  }

  // Signature verification needs the exact raw bytes Stripe signed -- reading
  // as text (not parsing JSON first) is required, a re-serialized body will
  // not match the signature even if the content is logically identical.
  const body = await req.text();

  const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
  // constructEvent's default crypto provider uses Node's `crypto` module,
  // unavailable in Deno's edge runtime -- constructEventAsync with an
  // explicit SubtleCryptoProvider is Stripe's documented path for
  // Deno/edge environments (Web Crypto instead of Node crypto).
  const cryptoProvider = Stripe.createSubtleCryptoProvider();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret, undefined, cryptoProvider);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[stripe-webhook] signature verification failed:", message);
    return new Response(`Webhook signature verification failed: ${message}`, { status: 400 });
  }

  if (!RELEVANT_EVENTS.has(event.type)) {
    // Acknowledge everything else so Stripe doesn't retry events we don't act on.
    return new Response(JSON.stringify({ received: true, ignored: event.type }), { status: 200 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );

  try {
    const subscription = event.data.object as Stripe.Subscription;
    await upsertFromSubscription(supabase, stripe, subscription);
  } catch (err) {
    // Non-2xx tells Stripe to retry with backoff -- correct behavior for a
    // transient DB error, which is the only kind upsertFromSubscription throws.
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[stripe-webhook] handling ${event.type} failed:`, message);
    return new Response("Internal error", { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), { status: 200 });
});
