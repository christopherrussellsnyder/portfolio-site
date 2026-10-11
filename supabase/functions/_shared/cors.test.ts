import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getCorsHeaders } from './cors';

// getCorsHeaders reads Deno.env.get('ALLOWED_ORIGINS'), which has no
// equivalent under Node/Vitest -- stub it the same way other _shared tests
// stub `fetch`, so the ALLOWED_ORIGINS-unset (default list) path is exercised
// exactly as it runs in production when that secret isn't configured.
beforeEach(() => {
  vi.stubGlobal('Deno', { env: { get: () => undefined } });
});
afterEach(() => {
  vi.unstubAllGlobals();
});

function originHeader(origin: string): Request {
  return new Request('https://example.com', { headers: { Origin: origin } });
}

describe('getCorsHeaders', () => {
  it('reflects an explicitly allowlisted production origin', () => {
    const headers = getCorsHeaders(originHeader('https://korexintelligencesystems.com'));
    expect(headers['Access-Control-Allow-Origin']).toBe('https://korexintelligencesystems.com');
  });

  it('reflects any localhost origin regardless of port', () => {
    // The actual regression this guards: Vite falls back to 8081, 8082, ...
    // when its default port is taken, and a hardcoded single dev-port entry
    // made every request from that port fail as an opaque browser-level CORS
    // error -- which, upstream, looked exactly like a backend logic bug
    // (SubscriptionContext silently falling back to its signed-out default).
    expect(getCorsHeaders(originHeader('http://localhost:8080'))['Access-Control-Allow-Origin']).toBe(
      'http://localhost:8080',
    );
    expect(getCorsHeaders(originHeader('http://localhost:8081'))['Access-Control-Allow-Origin']).toBe(
      'http://localhost:8081',
    );
    expect(getCorsHeaders(originHeader('http://localhost:5173'))['Access-Control-Allow-Origin']).toBe(
      'http://localhost:5173',
    );
    expect(getCorsHeaders(originHeader('http://localhost:34567'))['Access-Control-Allow-Origin']).toBe(
      'http://localhost:34567',
    );
  });

  it('falls back to the first allowed origin for an unrecognized origin', () => {
    const headers = getCorsHeaders(originHeader('https://evil.example.com'));
    expect(headers['Access-Control-Allow-Origin']).toBe('https://korexintelligencesystems.com');
  });

  it('does not treat a localhost lookalike as localhost', () => {
    // Guards the regex against being fooled by a crafted Origin header --
    // these must fall back, not be reflected.
    const lookalikes = [
      'http://localhost.evil.com',
      'http://evil.com/localhost:8080',
      'http://notlocalhost:8080',
    ];
    for (const origin of lookalikes) {
      expect(getCorsHeaders(originHeader(origin))['Access-Control-Allow-Origin']).toBe(
        'https://korexintelligencesystems.com',
      );
    }
  });

  it('always sets Vary: Origin so caches never serve one origin a response meant for another', () => {
    expect(getCorsHeaders(originHeader('http://localhost:8081'))['Vary']).toBe('Origin');
  });
});
