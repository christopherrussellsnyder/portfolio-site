export const STRIPE_TIERS = {
  pro: {
    name: 'Pro',
    monthly: {
      price_id: 'price_1UXlf72L0QxUPUo7rp3rlVJD',
      product_id: 'prod_VYtSv2K8Ql2hRQ',
      price: 99,
    },
    yearly: {
      price_id: 'price_1UXlhB2L0QxUPUo7s6gBxFoU',
      product_id: 'prod_VYtUDGBCu97oWs',
      price: 831,
    },
    // Enforced server-side in generate-strategy/index.ts -- keep these two
    // numbers in sync with that file's STRATEGY_LIMITS if either changes.
    strategies_limit: 20,
  },
  agency: {
    name: 'Agency',
    monthly: {
      price_id: 'price_1UXlit2L0QxUPUo754lJn4pt',
      product_id: 'prod_VYtVdc8DeXEEYj',
      price: 299,
    },
    yearly: {
      price_id: 'price_1UXlkt2L0QxUPUo7OmDAgwQ2',
      product_id: 'prod_VYtXMV4VBsnjpU',
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
  'prod_VYtSv2K8Ql2hRQ': 'pro',
  'prod_VYtUDGBCu97oWs': 'pro',
  'prod_VYtVdc8DeXEEYj': 'agency',
  'prod_VYtXMV4VBsnjpU': 'agency',
};

export type SubscriptionTier = 'pro' | 'agency' | null;

export interface SubscriptionState {
  subscribed: boolean;
  tier: SubscriptionTier;
  subscription_end: string | null;
  isLoading: boolean;
}
