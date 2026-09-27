import { describe, expect, it } from 'vitest';
import { checkRateLimitLocal, clientKey } from './rate-limit';

// Only the pure, synchronous local-bucket logic and the header-parsing helper
// are exercised here. checkRateLimit() itself calls Deno.env.get() via
// adminClient(), which has no equivalent under Node/Vitest -- that path needs
// a real Deno test runner (unavailable in this environment), not a unit test.

describe('checkRateLimitLocal', () => {
  it('allows requests up to the limit within the window', () => {
    const key = `test-${Math.random()}`;
    const opts = { limit: 3, windowMs: 60_000 };
    expect(checkRateLimitLocal(key, opts).ok).toBe(true);
    expect(checkRateLimitLocal(key, opts).ok).toBe(true);
    expect(checkRateLimitLocal(key, opts).ok).toBe(true);
  });

  it('rejects requests once the limit is exceeded within the window', () => {
    const key = `test-${Math.random()}`;
    const opts = { limit: 2, windowMs: 60_000 };
    checkRateLimitLocal(key, opts);
    checkRateLimitLocal(key, opts);
    const third = checkRateLimitLocal(key, opts);
    expect(third.ok).toBe(false);
    expect(third.remaining).toBe(0);
  });

  it('tracks remaining budget correctly as it is consumed', () => {
    const key = `test-${Math.random()}`;
    const opts = { limit: 5, windowMs: 60_000 };
    expect(checkRateLimitLocal(key, opts).remaining).toBe(4);
    expect(checkRateLimitLocal(key, opts).remaining).toBe(3);
    expect(checkRateLimitLocal(key, opts).remaining).toBe(2);
  });

  it('keeps separate buckets for different keys', () => {
    const keyA = `test-a-${Math.random()}`;
    const keyB = `test-b-${Math.random()}`;
    const opts = { limit: 1, windowMs: 60_000 };
    expect(checkRateLimitLocal(keyA, opts).ok).toBe(true);
    expect(checkRateLimitLocal(keyA, opts).ok).toBe(false);
    // A fresh key's budget is untouched by keyA's usage.
    expect(checkRateLimitLocal(keyB, opts).ok).toBe(true);
  });

  it('resets the bucket after the window elapses', async () => {
    const key = `test-${Math.random()}`;
    const opts = { limit: 1, windowMs: 20 };
    expect(checkRateLimitLocal(key, opts).ok).toBe(true);
    expect(checkRateLimitLocal(key, opts).ok).toBe(false);
    await new Promise((r) => setTimeout(r, 30));
    expect(checkRateLimitLocal(key, opts).ok).toBe(true);
  });

  it('never returns a negative remaining count', () => {
    const key = `test-${Math.random()}`;
    const opts = { limit: 1, windowMs: 60_000 };
    checkRateLimitLocal(key, opts);
    checkRateLimitLocal(key, opts);
    const third = checkRateLimitLocal(key, opts);
    expect(third.remaining).toBe(0);
  });
});

describe('clientKey', () => {
  const makeReq = (headers: Record<string, string>) => new Request('https://example.com', { headers });

  it('prefers x-forwarded-for, using the first hop', () => {
    const req = makeReq({ 'x-forwarded-for': '1.2.3.4, 5.6.7.8' });
    expect(clientKey(req, 'my-fn')).toBe('my-fn:1.2.3.4');
  });

  it('falls back to cf-connecting-ip when x-forwarded-for is absent', () => {
    const req = makeReq({ 'cf-connecting-ip': '9.9.9.9' });
    expect(clientKey(req, 'my-fn')).toBe('my-fn:9.9.9.9');
  });

  it('falls back to "unknown" when neither header is present', () => {
    const req = makeReq({});
    expect(clientKey(req, 'my-fn')).toBe('my-fn:unknown');
  });

  it('trims whitespace around the forwarded IP', () => {
    const req = makeReq({ 'x-forwarded-for': '  1.2.3.4  , 5.6.7.8' });
    expect(clientKey(req, 'my-fn')).toBe('my-fn:1.2.3.4');
  });
});
