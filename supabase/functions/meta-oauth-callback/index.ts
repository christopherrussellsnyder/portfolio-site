// Meta (Facebook Login for Business) OAuth flow for connecting ad accounts.
//
// POST  { redirect_to }  — authenticated. Creates an OAuth state row and
//                          returns the Facebook authorize URL. (Called from
//                          Settings via supabase.functions.invoke.)
// GET   ?code&state      — the Facebook redirect. Exchanges the code for a
//                          long-lived token, encrypts it server-side, upserts
//                          the user's ad accounts, then redirects back to the
//                          app. Never returns tokens to the browser.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { serviceClient } from "../_shared/supabase.ts";
import { encryptToken } from "../_shared/meta-crypto.ts";
import { checkRateLimit, clientKey } from "../_shared/rate-limit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GRAPH = "https://graph.facebook.com/v19.0";
const SCOPES = ["ads_read", "read_insights", "business_management"].join(",");

const META_APP_ID = Deno.env.get("META_APP_ID") ?? "";
const META_APP_SECRET = Deno.env.get("META_APP_SECRET") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const CALLBACK_URL = `${SUPABASE_URL}/functions/v1/meta-oauth-callback`;

function appRedirect(to: string | null, params: Record<string, string>): Response {
  // Only same-app redirect targets supplied at flow start are honored; fall
  // back to a safe relative default otherwise.
  const base = to && /^https?:\/\//.test(to) ? to : null;
  const url = base ? new URL(base) : null;
  const target = url ? url.toString() : "https://korexintelligencesystems.com/settings";
  const u = new URL(target);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  return new Response(null, { status: 302, headers: { Location: u.toString() } });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const rl = await checkRateLimit(clientKey(req, "meta-oauth"), { limit: 30, windowMs: 60_000 });
  if (!rl.ok) {
    return new Response(JSON.stringify({ error: "Too many requests" }), {
      status: 429,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = serviceClient();

  // ---------- Flow start (authenticated POST) ----------
  if (req.method === "POST") {
    try {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        return new Response(JSON.stringify({ error: "Not authenticated" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: { user }, error: authError } = await supabase.auth.getUser(
        authHeader.replace("Bearer ", ""),
      );
      if (authError || !user) {
        return new Response(JSON.stringify({ error: "Invalid token" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (!META_APP_ID || !META_APP_SECRET) {
        return new Response(JSON.stringify({ error: "Meta app credentials not configured" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const body = await req.json().catch(() => ({}));
      const redirectTo =
        typeof body?.redirect_to === "string" && /^https?:\/\//.test(body.redirect_to)
          ? body.redirect_to.slice(0, 500)
          : null;

      const state = crypto.randomUUID();
      const { error: stateErr } = await supabase.from("oauth_states").insert({
        state,
        user_id: user.id,
        platform: "meta",
        redirect_to: redirectTo,
      });
      if (stateErr) throw new Error(`state insert failed: ${stateErr.message}`);

      const authUrl =
        `https://www.facebook.com/v19.0/dialog/oauth?client_id=${encodeURIComponent(META_APP_ID)}` +
        `&redirect_uri=${encodeURIComponent(CALLBACK_URL)}` +
        `&state=${encodeURIComponent(state)}` +
        `&response_type=code&scope=${encodeURIComponent(SCOPES)}`;

      return new Response(JSON.stringify({ url: authUrl }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (e: any) {
      console.error("meta-oauth start error:", e?.message);
      return new Response(JSON.stringify({ error: e?.message || "Failed to start OAuth" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  // ---------- Facebook redirect (GET) ----------
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const fbError = url.searchParams.get("error_description") || url.searchParams.get("error");

  // Resolve the state row first so we know where to send the user back to.
  const { data: stateRow } = state
    ? await supabase.from("oauth_states").select("*").eq("state", state).maybeSingle()
    : { data: null };
  const redirectTo: string | null = stateRow?.redirect_to ?? null;

  if (fbError) {
    if (stateRow) await supabase.from("oauth_states").delete().eq("state", state);
    return appRedirect(redirectTo, { tab: "ads", meta: "error", reason: fbError.slice(0, 120) });
  }
  if (!code || !state || !stateRow) {
    return appRedirect(redirectTo, { tab: "ads", meta: "error", reason: "invalid_state" });
  }
  if (new Date(stateRow.expires_at).getTime() < Date.now()) {
    await supabase.from("oauth_states").delete().eq("state", state);
    return appRedirect(redirectTo, { tab: "ads", meta: "error", reason: "state_expired" });
  }
  // State is single-use.
  await supabase.from("oauth_states").delete().eq("state", state);

  try {
    // 1. code -> short-lived token
    const shortRes = await fetch(
      `${GRAPH}/oauth/access_token?client_id=${encodeURIComponent(META_APP_ID)}` +
        `&client_secret=${encodeURIComponent(META_APP_SECRET)}` +
        `&redirect_uri=${encodeURIComponent(CALLBACK_URL)}&code=${encodeURIComponent(code)}`,
    );
    const shortData = await shortRes.json();
    if (!shortRes.ok || !shortData.access_token) {
      console.error("code exchange failed", shortData);
      return appRedirect(redirectTo, { tab: "ads", meta: "error", reason: "token_exchange_failed" });
    }

    // 2. short-lived -> long-lived token (~60 days)
    const longRes = await fetch(
      `${GRAPH}/oauth/access_token?grant_type=fb_exchange_token` +
        `&client_id=${encodeURIComponent(META_APP_ID)}` +
        `&client_secret=${encodeURIComponent(META_APP_SECRET)}` +
        `&fb_exchange_token=${encodeURIComponent(shortData.access_token)}`,
    );
    const longData = await longRes.json();
    const accessToken = longData.access_token || shortData.access_token;
    const expiresIn: number = longData.expires_in ?? shortData.expires_in ?? 3600;
    const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    // 3. Discover the user's ad accounts.
    const acctRes = await fetch(
      `${GRAPH}/me/adaccounts?fields=id,name,account_status,currency,timezone_name&limit=50` +
        `&access_token=${encodeURIComponent(accessToken)}`,
    );
    const acctData = await acctRes.json();
    if (!acctRes.ok) {
      console.error("adaccounts fetch failed", acctData);
      return appRedirect(redirectTo, { tab: "ads", meta: "error", reason: "no_ad_accounts" });
    }
    const accounts: any[] = acctData.data ?? [];
    if (!accounts.length) {
      return appRedirect(redirectTo, { tab: "ads", meta: "error", reason: "no_ad_accounts" });
    }

    // 4. Encrypt once, store per account. Server-side only.
    const encrypted = await encryptToken(accessToken);
    const userId = stateRow.user_id;

    for (const acct of accounts) {
      const { error } = await supabase.from("connected_ad_accounts").upsert(
        {
          user_id: userId,
          platform: "meta",
          account_id: String(acct.id).replace(/^act_/, ""),
          account_name: acct.name ?? null,
          currency: acct.currency ?? null,
          timezone_name: acct.timezone_name ?? null,
          access_token_enc: encrypted,
          refresh_token_enc: null,
          token_expires_at: tokenExpiresAt,
          scopes: SCOPES.split(","),
          status: "active",
          last_error: null,
          connected_at: new Date().toISOString(),
        },
        { onConflict: "user_id,platform,account_id" },
      );
      if (error) console.error("account upsert failed:", error.message);
    }

    return appRedirect(redirectTo, { tab: "ads", meta: "connected" });
  } catch (e: any) {
    console.error("meta-oauth callback error:", e?.message);
    return appRedirect(redirectTo, { tab: "ads", meta: "error", reason: "unexpected" });
  }
});
