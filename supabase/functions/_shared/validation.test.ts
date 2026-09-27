import { describe, expect, it } from 'vitest';
import { LongText, NonEmptyString, parseJsonBody, ShortText, UUID } from './validation';

// jsonResponse() (used on parseJsonBody's failure branches) calls
// getAllowedOrigins() -> Deno.env.get(), which has no Node equivalent, so
// only the success path is exercised here. The primitives and the schema
// building blocks are pure and fully covered.

describe('NonEmptyString', () => {
  it('accepts a trimmed non-empty string', () => {
    expect(NonEmptyString.safeParse('hello').success).toBe(true);
  });

  it('rejects an empty string', () => {
    expect(NonEmptyString.safeParse('').success).toBe(false);
  });

  it('rejects a whitespace-only string', () => {
    expect(NonEmptyString.safeParse('   ').success).toBe(false);
  });

  it('rejects a string over 10,000 characters', () => {
    expect(NonEmptyString.safeParse('a'.repeat(10_001)).success).toBe(false);
  });
});

describe('UUID', () => {
  it('accepts a valid UUID', () => {
    expect(UUID.safeParse('123e4567-e89b-12d3-a456-426614174000').success).toBe(true);
  });

  it('rejects a non-UUID string', () => {
    expect(UUID.safeParse('not-a-uuid').success).toBe(false);
  });
});

describe('ShortText', () => {
  it('accepts text within 500 characters', () => {
    expect(ShortText.safeParse('a'.repeat(500)).success).toBe(true);
  });

  it('rejects text over 500 characters', () => {
    expect(ShortText.safeParse('a'.repeat(501)).success).toBe(false);
  });

  it('accepts an empty string (unlike NonEmptyString)', () => {
    expect(ShortText.safeParse('').success).toBe(true);
  });
});

describe('LongText', () => {
  it('accepts text within 20,000 characters', () => {
    expect(LongText.safeParse('a'.repeat(20_000)).success).toBe(true);
  });

  it('rejects text over 20,000 characters', () => {
    expect(LongText.safeParse('a'.repeat(20_001)).success).toBe(false);
  });
});

describe('parseJsonBody', () => {
  it('returns parsed data when the body matches the schema', async () => {
    const req = new Request('https://example.com', {
      method: 'POST',
      body: JSON.stringify({ name: 'Ada' }),
    });
    const schema = { safeParse: (v: unknown) => ({ success: true, data: v }) } as never;
    const result = await parseJsonBody(req, schema);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toEqual({ name: 'Ada' });
    }
  });
});
