import { serviceClient, userClient } from "../_shared/supabase.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { sendResendEmail, EmailSendError } from "../_shared/resend.ts";

// Resend can only send from a domain verified in your Resend account (SPF/
// DKIM DNS records) -- it can't relay mail "from" an arbitrary Gmail
// mailbox the way the old Gmail-API version of this function legitimately
// could. korexintelligencesystems.com is the domain already verified and
// proven working elsewhere (invite-workspace-member).
const FROM_ADDRESS = "Korex Intelligence Systems <no-reply@korexintelligencesystems.com>";

function toHtml(body: string): string {
  const escaped = body
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  return `<div style="font-family:Inter,system-ui,sans-serif;white-space:pre-wrap;line-height:1.5;color:#1a1a1a">${escaped}</div>`;
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: 'RESEND_API_KEY not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Auth check — user must be owner or admin
    const authHeader = req.headers.get('Authorization') ?? '';
    const supabase = userClient(authHeader);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const admin = serviceClient();
    const { data: roles } = await admin
      .from('user_roles').select('role').eq('user_id', user.id);
    const allowed = (roles ?? []).some((r: any) => r.role === 'owner' || r.role === 'admin');
    if (!allowed) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const submissionId = String(body.submissionId ?? '').trim();
    const replyBody = String(body.body ?? '').trim();
    const subjectOverride = body.subject ? String(body.subject).trim() : null;
    if (!submissionId || !replyBody || replyBody.length > 10000) {
      return new Response(JSON.stringify({ error: 'Invalid input' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: sub, error: subErr } = await admin
      .from('contact_submissions').select('*').eq('id', submissionId).maybeSingle();
    if (subErr || !sub) {
      return new Response(JSON.stringify({ error: 'Submission not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Not a native Gmail-thread reply (no Gmail API involved anymore) --
    // the "Re:" subject is what most mail clients group on without a real
    // Message-ID to reference, since the inbound submission came through our
    // own contact form, not through Gmail.
    const subject = subjectOverride || `Re: ${sub.subject || 'Your message to Korex Intelligence'}`;

    let sendResult: { id: string };
    try {
      sendResult = await sendResendEmail(RESEND_API_KEY, {
        from: FROM_ADDRESS,
        to: sub.email,
        subject,
        html: toHtml(replyBody),
        text: replyBody,
      });
    } catch (e) {
      const msg = e instanceof EmailSendError ? e.message : (e instanceof Error ? e.message : 'Unknown error');
      console.error('Resend send failed', msg);
      return new Response(JSON.stringify({ error: 'Email send failed', details: msg }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    await admin.from('contact_submissions').update({
      status: 'replied',
      replied_at: new Date().toISOString(),
      reply_body: replyBody,
      replied_by: user.id,
      gmail_message_id: sendResult.id ?? null,
    }).eq('id', submissionId);

    return new Response(JSON.stringify({ success: true, id: sendResult.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'Unknown error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
