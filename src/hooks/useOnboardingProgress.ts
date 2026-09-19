import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  done: boolean;
  to: string;
}

const DISMISS_KEY = 'korex.onboarding.dismissed';
const EDIT_STUDIO_KEY = 'korex.editstudio.visited';

async function countRows(table: 'research_personalizations' | 'content_strategies' | 'content_library' | 'ai_generated_videos', userId: string) {
  const { count } = await supabase
    .from(table)
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);
  return count ?? 0;
}

export function useOnboardingProgress() {
  const [dismissed, setDismissed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(DISMISS_KEY) === 'true';
    } catch {
      return false;
    }
  });

  // Ticks as soon as the user has actually opened the Edit studio.
  const [visitedEditStudio, setVisitedEditStudio] = useState<boolean>(() => {
    try {
      return localStorage.getItem(EDIT_STUDIO_KEY) === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const sync = () => {
      try {
        setVisitedEditStudio(localStorage.getItem(EDIT_STUDIO_KEY) === 'true');
      } catch {
        /* no-op */
      }
    };
    window.addEventListener('korex:edit-studio-visited', sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener('korex:edit-studio-visited', sync);
      window.removeEventListener('storage', sync);
    };
  }, []);


  const { data, isLoading } = useQuery({
    queryKey: ['onboarding-progress'],
    staleTime: 60_000,
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const [context, research, strategies, assets, videos] = await Promise.all([
        supabase
          .from('business_context')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id),
        countRows('research_personalizations', user.id),
        countRows('content_strategies', user.id),
        countRows('content_library', user.id),
        countRows('ai_generated_videos', user.id),
      ]);

      return {
        hasContext: (context.count ?? 0) > 0,
        hasResearch: research > 0,
        hasStrategy: strategies > 0,
        hasAsset: assets > 0 || videos > 0,
      };
    },
  });

  const dismiss = useCallback(() => {
    try {
      localStorage.setItem(DISMISS_KEY, 'true');
    } catch {
      /* no-op */
    }
    setDismissed(true);
  }, []);

  const steps: OnboardingStep[] = [
    {
      id: 'context',
      title: 'Add your business context',
      description: 'Analyze your website so every output is grounded in your brand.',
      done: !!data?.hasContext,
      to: '/settings',
    },
    {
      id: 'research',
      title: 'Run a research analysis',
      description: 'Pull live demand, competitor and audience signals for your niche.',
      done: !!data?.hasResearch,
      to: '/research',
    },
    {
      id: 'strategy',
      title: 'Generate your first strategy',
      description: 'Turn that intelligence into a day-by-day 7 or 14 day plan.',
      done: !!data?.hasStrategy,
      to: '/strategies',
    },
    {
      id: 'content',
      title: 'Create your first asset',
      description: 'Use a post brief to produce a matching image or video ad.',
      done: !!data?.hasAsset,
      to: '/content-generation',
    },
    {
      id: 'edit',
      title: 'Finish it in the Edit studio',
      description: 'Follow the beat-by-beat brief to add text and cuts — no editing experience needed.',
      done: visitedEditStudio,
      to: '/content-generation?tab=edit',
    },
  ];


  const completed = steps.filter((s) => s.done).length;

  // Auto-dismiss once everything is finished.
  useEffect(() => {
    if (!isLoading && data && completed === steps.length && !dismissed) {
      dismiss();
    }
  }, [isLoading, data, completed, steps.length, dismissed, dismiss]);

  return {
    steps,
    completed,
    total: steps.length,
    isLoading,
    visible: !isLoading && !!data && !dismissed && completed < steps.length,
    dismiss,
  };
}
