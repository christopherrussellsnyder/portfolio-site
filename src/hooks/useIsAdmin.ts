import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/** Resolves whether the signed-in user has the 'owner' or 'admin' role. */
export function useIsAdmin() {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ['user-role', user?.id],
    enabled: !!user,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data } = await supabase.from('user_roles').select('role').eq('user_id', user!.id);
      return (data ?? []).some((r) => r.role === 'owner' || r.role === 'admin');
    },
  });

  return { isAdmin: query.data === true, isLoading: query.isLoading };
}
