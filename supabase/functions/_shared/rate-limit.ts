// Rate limiting for Deno edge functions.
//
// Two layers:
//  1. In-memory fixed window (per isolate) — instant, free, absorbs bursts.
//  2. Durable Postgres counter (`public.consume_rate_limit`) — shared across every
//     isolate and region, so an attacker cannot dodge limits by fanning out
//     requests until Supabase spins up new instances.
//
// The DB layer fails OPEN: if the database call errors we fall back to the
// in-memory verdict rather than locking real users out.
//
// Usage:
//   const rl = await checkRateLimit(clientKey(req, "support-chat"), { limit: 30, windowMs: 60_000 });
//   if (!rl.ok) return jsonResponse({ error: "Too many requests" }, 429);

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

// Opportunistic cleanup so the map cannot grow without bound.
const MAX_ENTRIES = 10_000;

export interface RateLimitOptions {
  limit: number;
  windowMs: number;
}

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  resetAt: number;
}

function checkRateLimitLocal(key: string, opts: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  let b = buckets.get(key);
  if (!b || b.resetAt <= now) {
    b = { count: 0, resetAt: now + opts.windowMs };
    buckets.set(key, b);
  }
  b.count += 1;

  if (buckets.size > MAX_ENTRIES) {
    for (const [k, v] of buckets) {
      if (v.resetAt <= now) buckets.delete(k);
      if (buckets.size <= MAX_ENTRIES / 2) break;
    }
  }

  return {
    ok: b.count <= opts.limit,
    remaining: Math.max(0, opts.limit - b.count),
    resetAt: b.resetAt,
  };
}

let admin: ReturnType<typeof createClient> | null = null;
function adminClient() {
  if (admin) return admin;
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return null;
  admin = createClient(url, key, { auth: { persistSession: false } });
  return admin;
}

/**
 * Consume one unit from the rate-limit budget for `key`.
 * Always await — the durable layer is a network call.
 */
export async function checkRateLimit(key: string, opts: RateLimitOptions): Promise<RateLimitResult> {
  const local = checkRateLimitLocal(key, opts);
  if (!local.ok) return local; // already over locally — no need to hit the DB

  const client = adminClient();
  if (!client) return local;

  try {
    const { data, error } = await client.rpc("consume_rate_limit", {
      _key: key,
      _limit: opts.limit,
      _window_seconds: Math.max(1, Math.round(opts.windowMs / 1000)),
    });
    if (error) return local; // fail open
    if (data === false) {
      return { ok: false, remaining: 0, resetAt: local.resetAt };
    }
  } catch (_e) {
    return local; // fail open
  }

  return local;
}

/** Synchronous, isolate-local check. Use only where awaiting is impossible. */
export { checkRateLimitLocal };

export function clientKey(req: Request, prefix: string): string {
  const fwd = req.headers.get("x-forwarded-for") ?? "";
  const ip = fwd.split(",")[0]?.trim() || req.headers.get("cf-connecting-ip") || "unknown";
  return `${prefix}:${ip}`;
}
