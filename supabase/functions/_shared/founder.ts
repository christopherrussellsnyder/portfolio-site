// Single source of truth for founder-account access. Founder accounts bypass
// every tier, quota, and paywall check across the app. Do not duplicate this
// list elsewhere — import isFounderEmail instead.
const FOUNDER_EMAILS = new Set(["chrissnyder3456@gmail.com"]);

export function isFounderEmail(email: string | null | undefined): boolean {
  return !!email && FOUNDER_EMAILS.has(email.toLowerCase());
}
