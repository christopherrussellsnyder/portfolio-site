import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface InvitationRequest {
  email: string;
  invitationToken: string;
  role: string;
  inviterName?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, invitationToken, role, inviterName } = await req.json() as InvitationRequest;
    
    // Validate required fields
    if (!email || !invitationToken || !role) {
      console.error("Missing required fields:", { email: !!email, invitationToken: !!invitationToken, role: !!role });
      return new Response(
        JSON.stringify({ error: "Missing required fields: email, invitationToken, and role are required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    
    // Get the base URL for the invite link
    const origin = req.headers.get('origin') || Deno.env.get('SUPABASE_URL')?.replace('.supabase.co', '') || 'https://app.korex.io';
    const inviteLink = `${origin}/accept-invite/${invitationToken}`;
    
    console.log("Processing invitation request:", { 
      email, 
      role, 
      inviterName,
      hasResendKey: !!resendApiKey,
      inviteLink 
    });
    
    if (!resendApiKey) {
      console.log("RESEND_API_KEY not configured, simulating email send");
      console.log("Simulated invite link:", inviteLink);
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          simulated: true,
          message: `Email would be sent to ${email} with invitation link`,
          inviteLink
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Import Resend dynamically
    const { Resend } = await import("https://esm.sh/resend@2.0.0");
    const resend = new Resend(resendApiKey);

    const roleDescription = {
      viewer: "view content and analytics",
      editor: "create and edit content",
      admin: "manage team and all content"
    }[role] || "access the team";

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Team Invitation</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0f172a; margin: 0; padding: 40px 20px;">
        <div style="max-width: 520px; margin: 0 auto;">
          <!-- Main Card -->
          <div style="background: linear-gradient(135deg, #1e1b4b 0%, #312e81 100%); border-radius: 16px; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);">
            <div style="padding: 48px 40px; text-align: center;">
              <!-- Logo -->
              <div style="width: 72px; height: 72px; background: linear-gradient(135deg, #CC0000, #990000); border-radius: 18px; margin: 0 auto 28px; display: inline-flex; align-items: center; justify-content: center;">
                <span style="color: white; font-size: 32px; font-weight: bold; line-height: 72px;">K</span>
              </div>
              
              <!-- Heading -->
              <h1 style="color: white; font-size: 28px; font-weight: 700; margin: 0 0 16px; letter-spacing: -0.5px;">You're Invited!</h1>
              
              <!-- Description -->
              <p style="color: #c7d2fe; font-size: 16px; line-height: 1.6; margin: 0 0 32px;">
                ${inviterName ? `<strong style="color: #a5b4fc;">${inviterName}</strong> has` : 'You have been'} invited you to join their team on <strong style="color: white;">Korex</strong> as a <strong style="color: #c4b5fd;">${role.charAt(0).toUpperCase() + role.slice(1)}</strong>.
              </p>
              
              <!-- Role Info -->
              <div style="background: rgba(204, 0, 0, 0.1); border: 1px solid rgba(204, 0, 0, 0.2); border-radius: 12px; padding: 16px; margin-bottom: 32px;">
                <p style="color: #a5b4fc; font-size: 14px; margin: 0;">
                  As a <strong>${role}</strong>, you'll be able to ${roleDescription}.
                </p>
              </div>
              
              <!-- CTA Button -->
              <a href="${inviteLink}" style="display: inline-block; background: linear-gradient(135deg, #CC0000, #990000); color: white; text-decoration: none; padding: 16px 40px; border-radius: 10px; font-weight: 600; font-size: 16px; letter-spacing: 0.5px; box-shadow: 0 4px 14px rgba(204, 0, 0, 0.4);">
                Accept Invitation
              </a>
              
              <!-- Expiry Notice -->
              <p style="color: #6b7280; font-size: 13px; margin-top: 32px; margin-bottom: 0;">
                This invitation expires in <strong>7 days</strong>.
              </p>
            </div>
          </div>
          
          <!-- Footer -->
          <div style="text-align: center; margin-top: 24px;">
            <p style="color: #4b5563; font-size: 12px; margin: 0;">
              If you didn't expect this invitation, you can safely ignore this email.
            </p>
            <p style="color: #374151; font-size: 11px; margin-top: 16px;">
              © ${new Date().getFullYear()} Korex Intelligence Systems. All rights reserved.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    console.log("Sending email via Resend to:", email);

    const emailResponse = await resend.emails.send({
      from: "Korex Team <team@resend.dev>",
      to: [email],
      subject: `You've been invited to join a team on Korex`,
      html: emailHtml,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending invitation email:", error);
    return new Response(
      JSON.stringify({ error: error.message, details: error.toString() }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);