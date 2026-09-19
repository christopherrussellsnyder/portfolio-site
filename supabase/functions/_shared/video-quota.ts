// Shared gate for AI video ad generation.
// Resolves the caller's tier, monthly video allowance, and current usage.
// Returns a Response (401/402) when the caller may not render, otherwise the quota context.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Founder accounts bypass every tier and quota check.
const FOUNDER_EMAILS = new Set(["chrissnyder3456@gmail.com"]);

export type VideoTier = "starter" | "pro" | "agency" | "founder";

// Monthly rendered-video allowance per tier.
// Starter gets a small lifetime trial rather than a monthly allowance.
export const VIDEO_LIMITS: Record<VideoTier, number> = {
  starter: 2, // lifetime trial, not monthly
  pro: 10,
  agency: 35,
  founder: Number.POSITIVE_INFINITY,
};

export interface VideoQuotaContext {
  userId: string;
  email: string;
  tier: VideoTier;
  limit: number;
  used: number;
  remaining: number;
  isTrial: boolean;
  supabase: ReturnType<typeof createClient>;
}

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/**
 * Authenticates the request and resolves the caller's video rendering allowance.
 * Pass `consume: false` to read quota without enforcing it (used by the status/list endpoints).
 */
export async function resolveVideoQuota(
  req: Request,
  opts: { enforce?: boolean } = {},
): Promise<VideoQuotaContext | Response> {
  const enforce = opts.enforce ?? true;

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return json({ error: "Authentication required", code: "UNAUTHENTICATED" }, 401);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );

  const token = authHeader.replace("Bearer ", "");
  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData.user) {
    return json({ error: "Invalid session", code: "UNAUTHENTICATED" }, 401);
  }

  const user = userData.user;
  const email = (user.email ?? "").toLowerCase();

  let tier: VideoTier = "starter";
  if (FOUNDER_EMAILS.has(email)) {
    tier = "founder";
  } else {
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("status, plan_type")
      .eq("user_id", user.id)
      .maybeSingle();

    if (sub?.status === "active" && (sub.plan_type === "pro" || sub.plan_type === "agency")) {
      tier = sub.plan_type as VideoTier;
    }
  }

  const limit = VIDEO_LIMITS[tier];
  const isTrial = tier === "starter";

  // Starter's allowance is lifetime; paid tiers reset each calendar month.
  let usedQuery = supabase
    .from("video_ads")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("counts_against_quota", true)
    .neq("status", "failed");

  if (!isTrial && tier !== "founder") {
    const periodStart = new Date();
    periodStart.setUTCDate(1);
    periodStart.setUTCHours(0, 0, 0, 0);
    usedQuery = usedQuery.gte("created_at", periodStart.toISOString());
  }

  const { count } = await usedQuery;
  const used = count ?? 0;
  const remaining = limit === Number.POSITIVE_INFINITY ? Number.POSITIVE_INFINITY : Math.max(0, limit - used);

  if (enforce && remaining <= 0) {
    if (isTrial) {
      return json(
        {
          error:
            "You've used both of your free trial videos. Upgrade to Pro for 10 AI video ads every month.",
          code: "UPGRADE_REQUIRED",
          tier,
          limit,
          used,
        },
        402,
      );
    }
    return json(
      {
        error: `You've used all ${limit} video renders in your plan this month. Your allowance resets on the 1st.`,
        code: "VIDEO_QUOTA_EXHAUSTED",
        tier,
        limit,
        used,
      },
      402,
    );
  }

  return { userId: user.id, email, tier, limit, used, remaining, isTrial, supabase };
}

export { corsHeaders as videoCorsHeaders };
