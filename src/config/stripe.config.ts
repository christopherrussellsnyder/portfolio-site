export const STRIPE_TIERS = {
  pro: {
    name: 'Pro',
    monthly: {
      price_id: 'price_1UXlJXRqQfcik3t88ZpjRvTL',
      product_id: 'prod_VYt5CjLBpTePqD',
      price: 99,
    },
    yearly: {
      price_id: 'price_1UXlKARqQfcik3t8UqjW5lfA',
      product_id: 'prod_VYt6dCVnbWXMqE',
      price: 831,
    },
    // Enforced server-side in generate-strategy/index.ts -- keep these two
    // numbers in sync with that file's STRATEGY_LIMITS if either changes.
    strategies_limit: 20,
  },
  agency: {
    name: 'Agency',
    monthly: {
      price_id: 'price_1UXlKVRqQfcik3t8CfTZlZqo',
      product_id: 'prod_VYt6bNaQcpp2g8',
      price: 299,
    },
    yearly: {
      price_id: 'price_1UXlLDRqQfcik3t8WOGW61w8',
      product_id: 'prod_VYt7EJtr1KRDeR',
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
  'prod_VYt5CjLBpTePqD': 'pro',
  'prod_VYt6dCVnbWXMqE': 'pro',
  'prod_VYt6bNaQcpp2g8': 'agency',
  'prod_VYt7EJtr1KRDeR': 'agency',
};

export type SubscriptionTier = 'pro' | 'agency' | null;

export interface SubscriptionState {
  subscribed: boolean;
  tier: SubscriptionTier;
  subscription_end: string | null;
  isLoading: boolean;
}
