// Pulls real campaign/ad-set/ad performance from the Meta Marketing API for a
// user's connected ad accounts and stores it in ad_performance_snapshots
// (data_source_type = 'real_api').
//
// - Runs on demand (dashboard views call it when data is stale) and can be
//   driven by a scheduler with the service key.
// - Refreshes long-lived tokens that expire within 10 days (fb_exchange_token).
// - Fails soft: rate limits, downtime and partial failures never clear or
//   block existing cached rows — the response includes the freshest cached
//   data with its timestamps and per-account status.
// - Revoked/expired tokens mark the account status so the UI can prompt a
//   reconnect instead of silently serving stale data.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { serviceClient } from "../_shared/supabase.ts";
import { decryptToken, encryptToken } from "../_shared/meta-crypto.ts";
import { checkRateLimit, clientKey } from "../_shared/rate-limit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GRAPH = "https://graph.facebook.com/v19.0";
const META_APP_ID = Deno.env.get("META_APP_ID") ?? "";
const META_APP_SECRET = Deno.env.get("META_APP_SECRET") ?? "";
const STALE_AFTER_MS = 24 * 3600 * 1000;
const REFRESH_WITHIN_MS = 10 * 24 * 3600 * 1000;

const INSIGHT_FIELDS = [
  "campaign_name", "adset_name", "ad_name", "objective", "spend", "impressions",
  "reach", "clicks", "ctr", "cpc", "cpm", "frequency", "actions", "action_values",
  "purchase_roas",
].join(",");

function isRateLimit(err: any): boolean {
  const code = err?.error?.code;
  return err?.status === 429 || [4, 17, 32, 613, 80000, 80001].includes(code);
}
function isAuthFailure(err: any): boolean {
  const code = err?.error?.code;
  const sub = err?.error?.error_subcode;
  return err?.status === 401 || code === 190 || sub === 463 || sub === 467;
}

async function graphGet(path: string, params: Record<string, string>): Promise<any> {
  const q = new URLSearchParams(params);
  const res = await fetch(`${GRAPH}${path}?${q.toString()}`);
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body?.error) throw { status: res.status, error: body?.error ?? body };
  return body;
}

/** Re-exchange a long-lived token that is nearing expiry. */
async function maybeRefreshToken(account: any): Promise<string> {
  const token = await decryptToken(account.access_token_enc);
  const expiresAt = account.token_expires_at ? new Date(account.token_expires_at).getTime() : 0;
  if (expiresAt - Date.now() > REFRESH_WITHIN_MS) return token;

  try {
    const data = await graphGet("/oauth/access_token", {
      grant_type: "fb_exchange_token",
      client_id: META_APP_ID,
      client_secret: META_APP_SECRET,
      fb_exchange_token: token,
    });
    if (data.access_token) {
      await serviceClient().from("connected_ad_accounts").update({
        access_token_enc: await encryptToken(data.access_token),
        token_expires_at: new Date(Date.now() + (data.expires_in ?? 5_184_000) * 1000).toISOString(),
        last_error: null,
      }).eq("id", account.id);
      return data.access_token;
    }
  } catch (e: any) {
    if (isAuthFailure(e)) throw e; // handled by caller as expired/revoked
    console.warn("token refresh failed, using existing token:", e?.error?.message);
  }
  return token;
}

function extractPurchaseMetrics(actions: any[], values: any[], roas: any[]) {
  const purchases = (actions ?? []).find((a) => a.action_type === "purchase");
  const value = (values ?? []).find((a) => a.action_type === "purchase");
  const r = (roas ?? []).find((a) => a.action_type === "purchase");
  return {
    purchases: purchases ? Number(purchases.value) : 0,
    purchase_value: value ? Number(value.value) : 0,
    roas: r ? Number(r.value) : null,
  };
}

async function syncAccount(supabase: any, account: any) {
  const token = await maybeRefreshToken(account);
  const actId = account.account_id;
  let synced = 0;

  for (const level of ["campaign", "adset", "ad"]) {
    const data = await graphGet(`/act_${actId}/insights`, {
      level,
      fields: INSIGHT_FIELDS,
      date_preset: "last_30d",
      limit: "250",
      access_token: token,
    });
    const rows: any[] = data?.data ?? [];
    for (const r of rows) {
      const objectId = r.campaign_id ?? r.adset_id ?? r.ad_id ?? `${account.id}-${level}`;
      const objectName = r.campaign_name ?? r.adset_name ?? r.ad_name ?? null;
      const m = extractPurchaseMetrics(r.actions, r.action_values, r.purchase_roas);
      const { error } = await supabase.from("ad_performance_snapshots").upsert(
        {
          user_id: account.user_id,
          connected_account_id: account.id,
          platform: "meta",
          account_id: actId,
          level,
          object_id: String(objectId),
          object_name: objectName,
          objective: r.objective ?? null,
          status: r.effective_status ?? null,
          date_start: r.date_start ?? null,
          date_stop: r.date_stop ?? null,
          spend: Number(r.spend ?? 0),
          impressions: Number(r.impressions ?? 0),
          reach: Number(r.reach ?? 0),
          clicks: Number(r.clicks ?? 0),
          ctr: r.ctr != null ? Number(r.ctr) : null,
          cpc: r.cpc != null ? Number(r.cpc) : null,
          cpm: r.cpm != null ? Number(r.cpm) : null,
          frequency: r.frequency != null ? Number(r.frequency) : null,
          purchases: m.purchases,
          purchase_value: m.purchase_value,
          roas: m.roas,
          raw: {},
          data_source_type: "real_api",
          fetched_at: new Date().toISOString(),
        },
        { onConflict: "connected_account_id,level,object_id,date_start,date_stop" },
      );
      if (error) console.error("snapshot upsert failed:", error.message);
      else synced++;
    }
  }

  await supabase.from("connected_ad_accounts").update({
    last_synced_at: new Date().toISOString(),
    status: "active",
    last_error: null,
  }).eq("id", account.id);

  return synced;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const rl = await checkRateLimit(clientKey(req, "fetch-meta-perf"), { limit: 20, windowMs: 60_000 });
  if (!rl.ok) {
    return new Response(JSON.stringify({ error: "Too many requests" }), {
      status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabase = serviceClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const force = body?.force === true;

    const { data: accounts, error: acctErr } = await supabase
      .from("connected_ad_accounts")
      .select("*")
      .eq("user_id", user.id)
      .eq("platform", "meta");
    if (acctErr) throw new Error(acctErr.message);

    const results: any[] = [];

    for (const account of accounts ?? []) {
      // Expired/revoked accounts: don't attempt API calls; surface for reconnect.
      if (account.status === "revoked") {
        results.push({ account_id: account.account_id, status: "revoked", synced: 0, from_cache: true });
        continue;
      }

      const stale =
        !account.last_synced_at ||
        Date.now() - new Date(account.last_synced_at).getTime() > STALE_AFTER_MS;

      if (!force && !stale) {
        results.push({ account_id: account.account_id, status: account.status, synced: 0, from_cache: true, reason: "fresh" });
        continue;
      }

      try {
        const synced = await syncAccount(supabase, account);
        results.push({ account_id: account.account_id, status: "active", synced, from_cache: false });
      } catch (e: any) {
        console.error(`sync failed for ${account.account_id}:`, e?.error ?? e?.message);

        if (isAuthFailure(e)) {
          const expired =
            account.token_expires_at &&
            new Date(account.token_expires_at).getTime() < Date.now();
          await supabase.from("connected_ad_accounts").update({
            status: expired ? "expired" : "revoked",
            last_error: "Meta rejected the access token — reconnect required.",
          }).eq("id", account.id);
          results.push({
            account_id: account.account_id,
            status: expired ? "expired" : "revoked",
            synced: 0,
            from_cache: true,
          });
        } else if (isRateLimit(e)) {
          await supabase.from("connected_ad_accounts").update({
            last_error: "Meta rate limit reached; serving cached data.",
          }).eq("id", account.id);
          results.push({ account_id: account.account_id, status: "active", synced: 0, from_cache: true, reason: "rate_limited" });
        } else {
          await supabase.from("connected_ad_accounts").update({
            status: "error",
            last_error: (e?.error?.message ?? e?.message ?? "sync failed").slice(0, 300),
          }).eq("id", account.id);
          results.push({ account_id: account.account_id, status: "error", synced: 0, from_cache: true, reason: "api_error" });
        }
      }
    }

    // Fail-soft payload: always return the freshest cached snapshots we have.
    const { data: snapshots } = await supabase
      .from("ad_performance_snapshots")
      .select("level, object_id, object_name, objective, spend, impressions, clicks, ctr, cpc, cpm, roas, purchases, purchase_value, date_start, date_stop, fetched_at, account_id, data_source_type")
      .eq("user_id", user.id)
      .eq("platform", "meta")
      .order("spend", { ascending: false })
      .limit(100);

    return new Response(
      JSON.stringify({
        results,
        snapshots: snapshots ?? [],
        fetched_at: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e: any) {
    console.error("fetch-meta-ad-performance error:", e?.message);
    return new Response(JSON.stringify({ error: e?.message ?? "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
