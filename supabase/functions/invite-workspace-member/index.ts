import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AGENCY_SEAT_LIMIT = 10;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization");
    if (!auth) throw new Error("No authorization header");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { data: userData, error: userErr } = await supabase.auth.getUser(
      auth.replace("Bearer ", "")
    );
    if (userErr || !userData.user) throw new Error("Not authenticated");
    const user = userData.user;

    const { workspace_id, email, role } = await req.json();
    if (!workspace_id || !email) throw new Error("workspace_id and email are required");
    const cleanEmail = String(email).trim().toLowerCase();
    const cleanRole = role === "manager" ? "manager" : "viewer";

    // Verify caller owns the workspace
    const { data: ws, error: wsErr } = await supabase
      .from("workspaces")
      .select("id, owner_id, name")
      .eq("id", workspace_id)
      .maybeSingle();
    if (wsErr || !ws) throw new Error("Workspace not found");
    if (ws.owner_id !== user.id) throw new Error("Only the workspace owner can invite members");

    // Seat cap
    const { data: seatCountRaw } = await supabase.rpc("workspace_seat_count", { _workspace_id: workspace_id });
    const seatCount = Number(seatCountRaw ?? 0);
    if (seatCount >= AGENCY_SEAT_LIMIT) {
      throw new Error(`Seat limit reached (${AGENCY_SEAT_LIMIT}). Remove an existing member or invite.`);
    }

    // Block self-invite / already-member
    if (user.email?.toLowerCase() === cleanEmail) throw new Error("You are already the owner");
    const { data: existingMemberIds } = await supabase
      .from("workspace_members")
      .select("user_id")
      .eq("workspace_id", workspace_id);
    if (existingMemberIds && existingMemberIds.length > 0) {
      const ids = existingMemberIds.map((r) => r.user_id);
      // Check the auth.users list via admin API for matching email
      const { data: matches } = await supabase.auth.admin.listUsers({ page: 1, perPage: 200 });
      const alreadyMember = matches?.users?.some(
        (u) => ids.includes(u.id) && u.email?.toLowerCase() === cleanEmail
      );
      if (alreadyMember) throw new Error("That user is already a member of this workspace");
    }

    // Upsert invitation (revoke existing pending, create new)
    await supabase
      .from("workspace_invitations")
      .update({ status: "revoked" })
      .eq("workspace_id", workspace_id)
      .eq("status", "pending")
      .ilike("email", cleanEmail);

    const { data: inv, error: invErr } = await supabase
      .from("workspace_invitations")
      .insert({
        workspace_id,
        email: cleanEmail,
        role: cleanRole,
        invited_by: user.id,
      })
      .select()
      .single();
    if (invErr) throw invErr;

    // Send email via Resend
    const origin = req.headers.get("origin") || "https://korexintelligencesystems.com";
    const inviteUrl = `${origin}/accept-workspace-invite/${inv.token}`;
    const resendKey = Deno.env.get("RESEND_API_KEY");
    let emailSent = false;

    if (resendKey) {
      const inviterName =
        (user.user_metadata?.full_name as string | undefined) || user.email || "A teammate";
      const html = `
        <div style="font-family:Inter,system-ui,sans-serif;max-width:560px;margin:0 auto;padding:32px;background:#0F1013;color:#F5F5F7;border-radius:12px">
          <h1 style="color:#CC0000;font-size:22px;margin:0 0 12px">You're invited to Korex</h1>
          <p style="line-height:1.5;color:#B0B0B8">${inviterName} invited you to collaborate on <strong style="color:#F5F5F7">${ws.name}</strong> as a <strong>${cleanRole}</strong>.</p>
          <p style="margin:24px 0"><a href="${inviteUrl}" style="background:#CC0000;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600">Accept invitation</a></p>
          <p style="font-size:12px;color:#6C6C74">Or paste this link: ${inviteUrl}</p>
          <p style="font-size:12px;color:#6C6C74;margin-top:24px">This invite expires in 14 days.</p>
        </div>`;

      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: "Korex Intelligence <no-reply@korexintelligencesystems.com>",
          to: [cleanEmail],
          subject: `You're invited to ${ws.name} on Korex`,
          html,
        }),
      });
      emailSent = res.ok;
      if (!res.ok) console.error("Resend error:", await res.text());
    }

    return new Response(
      JSON.stringify({ success: true, invitation: inv, inviteUrl, emailSent }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[invite-workspace-member]", msg);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
