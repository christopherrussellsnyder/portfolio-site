import { serviceClient, userClient } from "../_shared/supabase.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GATEWAY = 'https://connector-gateway.lovable.dev/google_mail/gmail/v1';

function encodeBase64Url(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function buildRawEmail(opts: {
  fromName: string;
  fromEmail: string;
  to: string;
  subject: string;
  body: string;
  inReplyTo?: string | null;
  references?: string | null;
}) {
  const headers = [
    `From: ${opts.fromName} <${opts.fromEmail}>`,
    `To: ${opts.to}`,
    `Subject: ${opts.subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: 7bit',
  ];
  if (opts.inReplyTo) headers.push(`In-Reply-To: ${opts.inReplyTo}`);
  if (opts.references) headers.push(`References: ${opts.references}`);
  return encodeBase64Url(headers.join('\r\n') + '\r\n\r\n' + opts.body);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const GOOGLE_MAIL_API_KEY = Deno.env.get('GOOGLE_MAIL_API_KEY');
    if (!LOVABLE_API_KEY || !GOOGLE_MAIL_API_KEY) {
      return new Response(JSON.stringify({ error: 'Gmail connector not configured' }), {
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

    const subject = subjectOverride || `Re: ${sub.subject || 'Your message to Korex Intelligence'}`;
    const raw = buildRawEmail({
      fromName: 'Korex Intelligence Systems',
      fromEmail: 'korexintelligencesystems@gmail.com',
      to: sub.email,
      subject,
      body: replyBody,
    });

    const gmailRes = await fetch(`${GATEWAY}/users/me/messages/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'X-Connection-Api-Key': GOOGLE_MAIL_API_KEY,
      },
      body: JSON.stringify({ raw }),
    });

    const gmailJson = await gmailRes.json();
    if (!gmailRes.ok) {
      console.error('Gmail send failed', gmailRes.status, gmailJson);
      return new Response(JSON.stringify({ error: 'Gmail send failed', details: gmailJson }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    await admin.from('contact_submissions').update({
      status: 'replied',
      replied_at: new Date().toISOString(),
      reply_body: replyBody,
      replied_by: user.id,
      gmail_message_id: gmailJson.id ?? null,
      gmail_thread_id: gmailJson.threadId ?? null,
    }).eq('id', submissionId);

    return new Response(JSON.stringify({ success: true, id: gmailJson.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'Unknown error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
