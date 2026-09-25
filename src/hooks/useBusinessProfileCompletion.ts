import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { calculateBusinessInfoCompletion } from '@/lib/businessProfileCompletion';

/** Lightweight completion check -- fetches just business_information and
 *  scores it, without loading the full Settings form. Used by the
 *  onboarding checklist and the profile-completeness nudge. */
export function useBusinessProfileCompletion() {
  const { data, isLoading } = useQuery({
    queryKey: ['business-profile-completion'],
    staleTime: 60_000,
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return 0;
      const { data: info } = await supabase
        .from('business_information')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      return calculateBusinessInfoCompletion(info);
    },
  });

  return { percentage: data ?? 0, isLoading };
}
