import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { getCorsHeaders } from "../_shared/cors.ts";
import { callLovableGateway } from "../_shared/llm-gateway.ts";

// Revenue-critical functions worth testing for the exact failure mode that
// broke Video Ads earlier: a module-level `export` crash in a shared file
// (e.g. _shared/video-quota.ts) kills EVERY function that imports it at
// parse time, before Deno.serve's handler ever runs -- so even a bare
// OPTIONS preflight never gets answered. Pinging OPTIONS is free (every
// function in this repo answers it before any auth/business logic) and
// catches a boot crash with zero side effects and zero API spend.
const PING_FUNCTIONS = [
  "list-ad-actors",
  "generate-video-ad",
  "video-ad-status",
  "generate-strategy",
  "generate-ad-script",
  "generate-caption-variants",
  "check-subscription",
  "create-checkout",
  "customer-portal",
  "ai-chat",
];

interface CheckResult {
  name: string;
  ok: boolean;
  detail: string;
  latency_ms?: number;
}

async function pingFunction(baseUrl: string, name: string): Promise<CheckResult> {
  const started = Date.now();
  try {
    const res = await fetch(`${baseUrl}/functions/v1/${name}`, {
      method: "OPTIONS",
      signal: AbortSignal.timeout(8000),
    });
    const latency_ms = Date.now() - started;
    // A boot crash never reaches the OPTIONS handler and the platform
    // returns a 5xx (or the fetch itself errors) -- any response at all,
    // even a 4xx, proves the module loaded and the handler ran.
    if (res.status >= 500) {
      return { name, ok: false, detail: `HTTP ${res.status} on OPTIONS — module likely failed to boot`, latency_ms };
    }
    return { name, ok: true, detail: `HTTP ${res.status}`, latency_ms };
  } catch (e) {
    return {
      name,
      ok: false,
      detail: `unreachable: ${e instanceof Error ? e.message : String(e)}`,
      latency_ms: Date.now() - started,
    };
  }
}

async function checkAnthropic(): Promise<CheckResult> {
  const key = Deno.env.get("ANTHROPIC_API_KEY");
  if (!key) return { name: "anthropic", ok: false, detail: "ANTHROPIC_API_KEY not configured" };
  const started = Date.now();
  try {
    const res = await callLovableGateway(key, {
      model: "claude-haiku-4-5",
      messages: [{ role: "user", content: "ping" }],
      max_tokens: 4,
    });
    const latency_ms = Date.now() - started;
    if (!res.ok) {
      const body = await res.text();
      return { name: "anthropic", ok: false, detail: `HTTP ${res.status}: ${body.slice(0, 200)}`, latency_ms };
    }
    return { name: "anthropic", ok: true, detail: "live ping succeeded", latency_ms };
  } catch (e) {
    return { name: "anthropic", ok: false, detail: e instanceof Error ? e.message : String(e), latency_ms: Date.now() - started };
  }
}

async function checkStripe(): Promise<CheckResult> {
  const key = Deno.env.get("STRIPE_SECRET_KEY");
  if (!key) return { name: "stripe", ok: false, detail: "STRIPE_SECRET_KEY not configured" };
  const started = Date.now();
  try {
    const stripe = new Stripe(key, { apiVersion: "2025-08-27.basil" });
    await stripe.balance.retrieve();
    const mode = key.startsWith("sk_live_") ? "live" : key.startsWith("sk_test_") ? "test" : "unknown";
    return { name: "stripe", ok: true, detail: `key valid (${mode} mode)`, latency_ms: Date.now() - started };
  } catch (e) {
    return { name: "stripe", ok: false, detail: e instanceof Error ? e.message : String(e), latency_ms: Date.now() - started };
  }
}

/**
 * HeyGen: deliberately does NOT make a live API call on every run (this
 * function may run every 15 minutes and HeyGen's catalog rarely changes).
 * Instead it reads the same video_ad_avatars_cache row list-ad-actors
 * maintains -- an empty/missing/stale cache here means the next real user
 * to open Video Ads will hit exactly the failure this check exists to
 * catch. Secret presence is also checked separately since a missing key
 * and an empty cache are different failures worth telling apart.
 */
async function checkHeygen(
  supabase: ReturnType<typeof createClient>,
): Promise<CheckResult> {
  const hasKey = !!Deno.env.get("HEYGEN_API_KEY");
  if (!hasKey) return { name: "heygen", ok: false, detail: "HEYGEN_API_KEY not configured" };

  const { data: cached, error } = await supabase
    .from("video_ad_avatars_cache")
    .select("payload, fetched_at")
    .eq("provider", "heygen")
    .maybeSingle();

  if (error) return { name: "heygen", ok: false, detail: `cache read failed: ${error.message}` };

  const payload = cached?.payload as { actors?: unknown[]; voices?: unknown[] } | undefined;
  const actorCount = payload?.actors?.length ?? 0;
  if (!cached || actorCount === 0) {
    return { name: "heygen", ok: false, detail: "key configured but actor cache is empty — Video Ads will show no actors" };
  }
  const ageHours = cached.fetched_at ? (Date.now() - new Date(cached.fetched_at as string).getTime()) / 3_600_000 : null;
  return {
    name: "heygen",
    ok: true,
    detail: `${actorCount} actors cached${ageHours !== null ? `, last refreshed ${ageHours.toFixed(1)}h ago` : ""}`,
  };
}

function checkLovableKey(): CheckResult {
  // Presence-only: this key backs the Lovable-Cloud-native email pipeline
  // (auth-email-hook, process-email-queue, handle-email-suppression) which
  // has no safe, side-effect-free way to live-ping from here (every real
  // call either sends mail or requires a signed webhook payload this
  // function doesn't have). A present key does not guarantee the email
  // pipeline works end to end -- only that the most common failure mode
  // (missing key) isn't the problem. Check email_send_log for the real
  // signal on whether mail is actually going out.
  const hasKey = !!Deno.env.get("LOVABLE_API_KEY");
  return {
    name: "lovable_api_key",
    ok: hasKey,
    detail: hasKey
      ? "configured (presence only — does not confirm the email pipeline is actually sending)"
      : "not configured — auth emails (signup/reset/magic link/invite) cannot send",
  };
}

async function checkEmailPipeline(
  supabase: ReturnType<typeof createClient>,
): Promise<CheckResult> {
  const since = new Date(Date.now() - 24 * 3_600_000).toISOString();
  const [{ count: sent }, { count: failed }] = await Promise.all([
    supabase.from("email_send_log").select("id", { count: "exact", head: true }).eq("status", "sent").gte("created_at", since),
    supabase.from("email_send_log").select("id", { count: "exact", head: true }).in("status", ["failed", "dlq"]).gte("created_at", since),
  ]);
  const sentCount = sent ?? 0;
  const failedCount = failed ?? 0;
  if (sentCount === 0 && failedCount === 0) {
    return { name: "email_pipeline", ok: true, detail: "no email activity in the last 24h (nothing to report)" };
  }
  const ok = failedCount === 0 || sentCount / Math.max(1, sentCount + failedCount) > 0.8;
  return {
    name: "email_pipeline",
    ok,
    detail: `${sentCount} sent, ${failedCount} failed/DLQ'd in the last 24h`,
  };
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  // Same cron-or-admin gate as calculate-prediction-accuracy: a nightly/
  // scheduled run, or an admin/owner checking status from /health.
  const authHeader = req.headers.get("Authorization") ?? "";
  const isCron = req.headers.get("Lovable-Context") === "cron" || authHeader === `Bearer ${serviceKey}`;
  if (!isCron) {
    const { data: userData } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    const uid = userData?.user?.id;
    let isAdmin = false;
    if (uid) {
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", uid);
      isAdmin = (roles ?? []).some((r: { role: string }) => r.role === "admin" || r.role === "owner");
    }
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  const [pings, anthropic, stripe, heygen, emailPipeline] = await Promise.all([
    Promise.all(PING_FUNCTIONS.map((name) => pingFunction(supabaseUrl, name))),
    checkAnthropic(),
    checkStripe(),
    checkHeygen(supabase),
    checkEmailPipeline(supabase),
  ]);
  const lovableKey = checkLovableKey();

  const results: CheckResult[] = [...pings, anthropic, stripe, heygen, lovableKey, emailPipeline];
  const overallOk = results.every((r) => r.ok || r.name === "lovable_api_key");
  // lovable_api_key presence is informational, not a hard failure signal on
  // its own (see checkLovableKey) -- email_pipeline's real send/fail ratio
  // is what actually determines overall health for that system.

  const { error: insertError } = await supabase.from("system_health_checks").insert({
    overall_ok: overallOk,
    results,
  });
  if (insertError) {
    console.error("[system-health-check] failed to log result:", insertError.message);
  }

  return new Response(JSON.stringify({ overall_ok: overallOk, checked_at: new Date().toISOString(), results }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
