// Shared server-side gate: require an active Pro or Agency subscription.
// Returns null when authorized, or a Response (402/401) that the caller should return.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { getCorsHeaders } from "./cors.ts";
import { isFounderEmail } from "./founder.ts";

export async function requirePro(req: Request): Promise<{ userId: string } | Response> {
  const corsHeaders = getCorsHeaders(req);
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(
      JSON.stringify({ error: "Authentication required", code: "UNAUTHENTICATED" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );

  const token = authHeader.replace("Bearer ", "");
  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData.user) {
    return new Response(
      JSON.stringify({ error: "Invalid session", code: "UNAUTHENTICATED" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const user = userData.user;

  // Founder accounts always have full access.
  if (isFounderEmail(user.email)) {
    return { userId: user.id };
  }

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("status, plan_type")
    .eq("user_id", user.id)
    .maybeSingle();

  const isPaid =
    sub?.status === "active" && (sub?.plan_type === "pro" || sub?.plan_type === "agency");

  if (!isPaid) {
    return new Response(
      JSON.stringify({
        error: "This feature requires a Pro or Agency subscription.",
        code: "UPGRADE_REQUIRED",
      }),
      { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  return { userId: user.id };
}

// Same shape as requirePro(), but for the handful of features (client
// reports, white-label) the pricing page sells as Agency-only rather than
// Pro-or-Agency. Duplicated rather than composed on top of requirePro()
// because the two need different subscription queries -- this one can't
// early-return on a Pro plan.
export async function requireAgency(req: Request): Promise<{ userId: string } | Response> {
  const corsHeaders = getCorsHeaders(req);
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(
      JSON.stringify({ error: "Authentication required", code: "UNAUTHENTICATED" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );

  const token = authHeader.replace("Bearer ", "");
  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData.user) {
    return new Response(
      JSON.stringify({ error: "Invalid session", code: "UNAUTHENTICATED" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const user = userData.user;

  if (isFounderEmail(user.email)) {
    return { userId: user.id };
  }

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("status, plan_type")
    .eq("user_id", user.id)
    .maybeSingle();

  const isAgency = sub?.status === "active" && sub?.plan_type === "agency";

  if (!isAgency) {
    return new Response(
      JSON.stringify({
        error: "This feature requires an Agency subscription.",
        code: "UPGRADE_REQUIRED",
      }),
      { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  return { userId: user.id };
}
