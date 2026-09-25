import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { serviceClient } from "../_shared/supabase.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { requirePro } from "../_shared/require-pro.ts";
import { scrapeAdLibraryTerm, countryCodeFor } from "../_shared/strategy-intel.ts";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = any;

function json(corsHeaders: Record<string, string>, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/** Scrapes one competitor's current ads, diffs against their last snapshot,
 *  records a new snapshot, and writes an alert row for each genuinely new
 *  ad snippet. Returns how many new ads were found. */
async function checkCompetitor(
  admin: Db,
  userId: string,
  competitor: { id: string; name: string },
  countryCode: string,
): Promise<number> {
  const snippets = await scrapeAdLibraryTerm(competitor.name, countryCode);
  if (!snippets.length) return 0;

  const { data: lastSnapshot } = await admin
    .from("competitor_ad_snapshots")
    .select("snippets")
    .eq("competitor_id", competitor.id)
    .order("checked_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const priorSet = new Set<string>((lastSnapshot?.snippets as string[] | null) || []);
  const newSnippets = snippets.filter((s) => !priorSet.has(s));

  await admin.from("competitor_ad_snapshots").insert({
    user_id: userId,
    competitor_id: competitor.id,
    snippets,
  });

  // First-ever snapshot isn't "new" ads, it's just establishing a baseline —
  // alerting on it would flood a freshly-added competitor with noise.
  if (lastSnapshot && newSnippets.length) {
    await admin.from("competitor_alerts").insert(
      newSnippets.map((snippet) => ({
        user_id: userId,
        competitor_id: competitor.id,
        snippet,
      })),
    );
  }

  return lastSnapshot ? newSnippets.length : 0;
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const authHeader = req.headers.get("Authorization") ?? "";
  const isCron = req.headers.get("Lovable-Context") === "cron" || authHeader === `Bearer ${serviceKey}`;

  try {
    const admin = serviceClient();
    const body = await req.json().catch(() => ({}));
    const { action, competitorData, competitorId, alertId } = body ?? {};

    // Weekly batch sweep across every user's tracked competitors -- cron-only,
    // same shape as ml-model-training's train_all_users.
    if (action === "check_all_users") {
      if (!isCron) return json(corsHeaders, { error: "Forbidden" }, 403);

      const { data: competitors, error } = await admin
        .from("competitors")
        .select("id, name, user_id")
        .eq("is_active", true);
      if (error) throw error;

      // Country isn't tracked per competitor; default to US. Good enough for
      // a v1 -- the ad-library search itself is the source of truth either way.
      let checked = 0;
      let alerted = 0;
      for (const c of competitors || []) {
        try {
          const found = await checkCompetitor(admin, c.user_id, { id: c.id, name: c.name }, "US");
          checked++;
          alerted += found;
        } catch (e) {
          console.error(`competitor check failed for ${c.id}:`, e instanceof Error ? e.message : e);
        }
      }

      return json(corsHeaders, { success: true, competitorsChecked: checked, newAdsFound: alerted });
    }

    // Everything else requires a real user session and an active subscription
    // -- this does a live ad-library scrape per action, same cost tier as
    // analyze-audience-targeting.
    const gate = await requirePro(req);
    if (gate instanceof Response) return gate;
    const userId = gate.userId;

    if (action === "get_competitors") {
      const { data, error } = await admin
        .from("competitors")
        .select("*")
        .eq("user_id", userId)
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return json(corsHeaders, { success: true, competitors: data || [] });
    }

    if (action === "add_competitor") {
      const name = String(competitorData?.name || "").trim();
      if (!name) return json(corsHeaders, { error: "Competitor name is required" }, 400);
      const { data, error } = await admin
        .from("competitors")
        .insert({
          user_id: userId,
          name,
          industry: competitorData?.industry || null,
          website: competitorData?.website || null,
        })
        .select()
        .single();
      if (error) throw error;
      return json(corsHeaders, { success: true, competitor: data });
    }

    if (action === "remove_competitor") {
      if (!competitorId) return json(corsHeaders, { error: "competitorId is required" }, 400);
      const { error } = await admin
        .from("competitors")
        .update({ is_active: false })
        .eq("id", competitorId)
        .eq("user_id", userId);
      if (error) throw error;
      return json(corsHeaders, { success: true });
    }

    if (action === "check_now") {
      const { data: competitors, error } = await admin
        .from("competitors")
        .select("id, name")
        .eq("user_id", userId)
        .eq("is_active", true);
      if (error) throw error;
      if (!competitors?.length) {
        return json(corsHeaders, { success: true, competitorsChecked: 0, newAdsFound: 0 });
      }

      const { data: businessInfo } = await admin
        .from("business_information")
        .select("geographic_focus")
        .eq("user_id", userId)
        .maybeSingle();
      const geo = Array.isArray(businessInfo?.geographic_focus) ? businessInfo.geographic_focus.join(", ") : "";
      const countryCode = countryCodeFor(geo);

      let alerted = 0;
      for (const c of competitors) {
        alerted += await checkCompetitor(admin, userId, c, countryCode);
      }

      return json(corsHeaders, { success: true, competitorsChecked: competitors.length, newAdsFound: alerted });
    }

    if (action === "get_alerts") {
      const { data, error } = await admin
        .from("competitor_alerts")
        .select("*, competitors(name)")
        .eq("user_id", userId)
        .order("detected_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return json(corsHeaders, { success: true, alerts: data || [] });
    }

    if (action === "mark_alert_read") {
      if (!alertId) return json(corsHeaders, { error: "alertId is required" }, 400);
      const { error } = await admin
        .from("competitor_alerts")
        .update({ is_read: true })
        .eq("id", alertId)
        .eq("user_id", userId);
      if (error) throw error;
      return json(corsHeaders, { success: true });
    }

    return json(corsHeaders, { error: "Invalid action" }, 400);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[competitor-monitoring] ERROR:", message);
    return json(corsHeaders, { error: message }, 500);
  }
});
