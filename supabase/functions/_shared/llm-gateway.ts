// Single source of truth for the Lovable AI Gateway's request shape (URL,
// auth header, content type). Every generation function was independently
// duplicating this fetch call — deduplicating it here means the endpoint or
// auth format only ever needs to change in one place.
//
// This deliberately returns the raw fetch Response rather than parsed text:
// callers differ meaningfully in status-code handling (some retry on 429/5xx,
// some fall back to deterministic generation on any failure, some return
// custom error payloads) and in how they use the parsed body (token usage
// logging, tool-call extraction, plain message content) — none of that
// interpretation belongs in a shared layer.
const LOVABLE_GATEWAY_URL = 'https://ai.gateway.lovable.dev/v1/chat/completions';

export async function callLovableGateway(
  apiKey: string,
  body: Record<string, unknown>,
): Promise<Response> {
  return fetch(LOVABLE_GATEWAY_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
}
