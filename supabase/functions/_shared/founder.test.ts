import { describe, expect, it } from 'vitest';
import { isFounderEmail } from './founder';

describe('isFounderEmail', () => {
  it('matches the founder email exactly', () => {
    expect(isFounderEmail('chrissnyder3456@gmail.com')).toBe(true);
  });

  it('is case-insensitive', () => {
    expect(isFounderEmail('ChrisSnyder3456@GMAIL.com')).toBe(true);
  });

  it('rejects other emails', () => {
    expect(isFounderEmail('someone-else@gmail.com')).toBe(false);
  });

  it('rejects null, undefined, and empty string without throwing', () => {
    expect(isFounderEmail(null)).toBe(false);
    expect(isFounderEmail(undefined)).toBe(false);
    expect(isFounderEmail('')).toBe(false);
  });

  it('does not match on substring or partial overlap', () => {
    expect(isFounderEmail('chrissnyder3456@gmail.com.evil.com')).toBe(false);
    expect(isFounderEmail('notchrissnyder3456@gmail.com')).toBe(false);
  });
});
