import React, { createContext, useContext, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { TRIAL_STRATEGY_LIMIT } from '@/config/stripe.config';

export type SubscriptionTier = 'pro' | 'agency' | null;

interface SubscriptionData {
  subscribed: boolean;
  tier: SubscriptionTier;
  subscription_end: string | null;
  strategies_used: number;
}

interface SubscriptionContextType extends Omit<SubscriptionData, 'strategies_used'> {
  isLoading: boolean;
  refreshSubscription: () => Promise<void>;
  planLabel: string;
  strategiesUsed: number;
  canGenerateStrategy: boolean;
  isPro: boolean;
}

const defaultData: SubscriptionData = {
  subscribed: false,
  tier: null,
  subscription_end: null,
  strategies_used: 0,
};

const SubscriptionContext = createContext<SubscriptionContextType>({
  ...defaultData,
  isLoading: true,
  refreshSubscription: async () => {},
  planLabel: 'Starter',
  strategiesUsed: 0,
  canGenerateStrategy: true,
  isPro: false,
});

export const useSubscription = () => useContext(SubscriptionContext);

const SUB_QUERY_KEY = ['subscription'] as const;

async function fetchSubscription(force = false): Promise<SubscriptionData> {
  const { data, error } = await supabase.functions.invoke('check-subscription', {
    body: force ? { force: true } : {},
  });
  if (error) throw error;
  return {
    subscribed: !!data?.subscribed,
    tier: (data?.tier as SubscriptionTier) ?? null,
    subscription_end: data?.subscription_end ?? null,
    strategies_used: data?.strategies_used ?? 0,
  };
}

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: [...SUB_QUERY_KEY, user?.id ?? 'anon'],
    queryFn: () => fetchSubscription(false),
    enabled: !!user,
    // Subscription state changes rarely. Cache for 5min; refresh in background beyond that.
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 1,
  });

  const state = data ?? defaultData;

  const refreshSubscription = useCallback(async () => {
    // Force a Stripe re-check (bypasses the edge function's local cache).
    const fresh = await fetchSubscription(true);
    queryClient.setQueryData([...SUB_QUERY_KEY, user?.id ?? 'anon'], fresh);
  }, [queryClient, user?.id]);

  const planLabel = state.subscribed
    ? state.tier
      ? `${state.tier.charAt(0).toUpperCase() + state.tier.slice(1)} Plan`
      : 'Active'
    : 'Starter';

  const canGenerateStrategy = state.subscribed || state.strategies_used < TRIAL_STRATEGY_LIMIT;
  const isPro = state.subscribed && (state.tier === 'pro' || state.tier === 'agency');

  return (
    <SubscriptionContext.Provider
      value={{
        subscribed: state.subscribed,
        tier: state.tier,
        subscription_end: state.subscription_end,
        isLoading: isLoading && !!user,
        refreshSubscription,
        planLabel,
        strategiesUsed: state.strategies_used,
        canGenerateStrategy,
        isPro,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}
