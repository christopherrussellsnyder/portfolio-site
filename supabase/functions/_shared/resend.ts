// Direct Resend API client, replacing the Lovable-Cloud-native
// `npm:@lovable.dev/email-js` sendLovableEmail call (which posts to
// api.lovable.dev using LOVABLE_API_KEY -- a credential that only exists
// when this project is actually deployed through Lovable Cloud, which it
// currently is not: LOVABLE_API_KEY is absent from this project's Supabase
// secrets, so every email send through that path was failing outright).
//
// Resend's HTTP API (https://resend.com/docs/api-reference/emails/send-email)
// is a plain POST with a bearer token -- no SDK, no extra dependency surface.

export interface SendEmailArgs {
  to: string;
  from: string;
  subject: string;
  html: string;
  text?: string;
  /** Resend deduplicates sends with the same key for 24h -- maps directly
   *  onto this codebase's own idempotency_key field. */
  idempotencyKey?: string;
  headers?: Record<string, string>;
}

export class EmailSendError extends Error {
  status: number;
  retryAfterSeconds: number | null;
  constructor(message: string, status: number, retryAfterSeconds: number | null = null) {
    super(message);
    this.name = "EmailSendError";
    this.status = status;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export async function sendResendEmail(apiKey: string, args: SendEmailArgs): Promise<{ id: string }> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };
  if (args.idempotencyKey) headers["Idempotency-Key"] = args.idempotencyKey;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers,
    body: JSON.stringify({
      from: args.from,
      to: args.to,
      subject: args.subject,
      html: args.html,
      text: args.text,
      headers: args.headers,
    }),
  });

  const text = await res.text();
  if (!res.ok) {
    let message = text;
    try {
      const parsed = JSON.parse(text);
      message = parsed?.message ?? text;
    } catch {
      // leave message as raw text
    }
    const retryAfterHeader = res.headers.get("Retry-After");
    const retryAfterSeconds = retryAfterHeader ? Number(retryAfterHeader) || null : null;
    throw new EmailSendError(`Resend request failed (${res.status}): ${message}`, res.status, retryAfterSeconds);
  }

  let parsed: { id?: string };
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Resend returned a malformed response");
  }
  return { id: parsed?.id ?? "" };
}
