import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization");
    if (!auth) throw new Error("Sign in to accept this invitation");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { data: userData, error: userErr } = await supabase.auth.getUser(
      auth.replace("Bearer ", "")
    );
    if (userErr || !userData.user?.email) throw new Error("Not authenticated");
    const user = userData.user;

    const { token } = await req.json();
    if (!token) throw new Error("Missing invitation token");

    const { data: inv, error: invErr } = await supabase
      .from("workspace_invitations")
      .select("*, workspaces(id, name)")
      .eq("token", token)
      .maybeSingle();
    if (invErr || !inv) throw new Error("Invitation not found");
    if (inv.status !== "pending") throw new Error(`Invitation is ${inv.status}`);
    if (new Date(inv.expires_at) < new Date()) {
      await supabase.from("workspace_invitations").update({ status: "expired" }).eq("id", inv.id);
      throw new Error("Invitation has expired");
    }
    if (inv.email.toLowerCase() !== user.email.toLowerCase()) {
      throw new Error(`This invitation was sent to ${inv.email}. Sign in with that email to accept.`);
    }

    // Add membership (ignore conflict)
    await supabase
      .from("workspace_members")
      .upsert(
        { workspace_id: inv.workspace_id, user_id: user.id, role: inv.role },
        { onConflict: "workspace_id,user_id" }
      );

    await supabase
      .from("workspace_invitations")
      .update({ status: "accepted", accepted_at: new Date().toISOString(), accepted_by: user.id })
      .eq("id", inv.id);

    // Auto-switch active workspace
    await supabase
      .from("user_profiles")
      .update({ active_workspace_id: inv.workspace_id, updated_at: new Date().toISOString() })
      .eq("user_id", user.id);

    return new Response(
      JSON.stringify({ success: true, workspace_id: inv.workspace_id, workspace_name: (inv as any).workspaces?.name }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[accept-workspace-invitation]", msg);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
