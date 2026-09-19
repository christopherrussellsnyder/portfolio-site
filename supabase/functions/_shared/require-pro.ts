// Shared server-side gate: require an active Pro or Agency subscription.
// Returns null when authorized, or a Response (402/401) that the caller should return.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { getCorsHeaders } from "./cors.ts";

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
  const FOUNDER_EMAILS = new Set(["chrissnyder3456@gmail.com"]);
  if (user.email && FOUNDER_EMAILS.has(user.email.toLowerCase())) {
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
