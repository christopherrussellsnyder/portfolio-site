export const STRIPE_TIERS = {
  pro: {
    name: 'Pro',
    monthly: {
      price_id: 'price_1U1Y9eL7HyckspfcrBl45Coy',
      product_id: 'prod_UuPs7XFGchuAOC',
      price: 99,
    },
    yearly: {
      price_id: 'price_1U1YHXL7HyckspfcTI9T3cWH',
      product_id: 'prod_UuPsofAJQj79gO',
      price: 831,
    },
    // Enforced server-side in generate-strategy/index.ts -- keep these two
    // numbers in sync with that file's STRATEGY_LIMITS if either changes.
    strategies_limit: 20,
  },
  agency: {
    name: 'Agency',
    monthly: {
      price_id: 'price_1U1YAIL7HyckspfcyT4yah1y',
      product_id: 'prod_UuPsM90xu8d47e',
      price: 299,
    },
    yearly: {
      price_id: 'price_1U1YHqL7HyckspfcXu9IV3Bk',
      product_id: 'prod_UuPtrGta7sU60Q',
      price: 2511,
    },
    strategies_limit: 75,
  },
} as const;

// Lifetime cap for the free Starter plan
export const STARTER_STRATEGY_LIMIT = 2;
// Backwards-compat alias (used by existing imports)
export const TRIAL_STRATEGY_LIMIT = STARTER_STRATEGY_LIMIT;

// Map all product IDs to tiers. Keep this in sync with the backend's own
// copies (check-subscription/index.ts, stripe-webhook/index.ts) -- those are
// the actual enforcement source of truth; this export has no current
// frontend caller, but a stale version here would mislabel legacy
// subscribers' tier if something ever reads it for display.
export const PRODUCT_TO_TIER: Record<string, string> = {
  // Current live products
  'prod_UuPs7XFGchuAOC': 'pro',
  'prod_UuPsofAJQj79gO': 'pro',
  'prod_UuPsM90xu8d47e': 'agency',
  'prod_UuPtrGta7sU60Q': 'agency',
  // Historical products retained for existing subscriptions
  'prod_UJLxjx4LDdH1Ps': 'pro',
  'prod_UJLxyYaqUCGjHg': 'pro',
  'prod_UJLyj76FsosYjb': 'agency',
  'prod_UJLyrKQhr9PclL': 'agency',
};

export type SubscriptionTier = 'pro' | 'agency' | null;

export interface SubscriptionState {
  subscribed: boolean;
  tier: SubscriptionTier;
  subscription_end: string | null;
  isLoading: boolean;
}
