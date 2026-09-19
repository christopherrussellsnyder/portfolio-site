import { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { toast } from '@/hooks/use-toast';
import type {
  AdActor,
  AdScriptVariant,
  AdVoice,
  VideoAdRecord,
  VideoQuota,
} from '@/config/video.config';

const POLL_INTERVAL_MS = 8000;

/** Calls an edge function directly so we can read the server's error `code`. */
async function invokeFn<T>(name: string, body: unknown): Promise<T> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${name}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(body ?? {}),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const err = new Error(
      (payload as { error?: string })?.error ?? `Request failed (HTTP ${response.status})`,
    ) as Error & { code?: string; status?: number };
    err.code = (payload as { code?: string })?.code;
    err.status = response.status;
    throw err;
  }

  return payload as T;
}

/** Routes plan-limit failures into the upgrade funnel instead of a raw error toast. */
function handleFailure(error: unknown, fallbackTitle: string) {
  const err = error as Error & { code?: string };
  const code = err?.code;
  const message = err?.message ?? 'Something went wrong.';

  if (code === 'UPGRADE_REQUIRED' || code === 'VIDEO_QUOTA_EXHAUSTED' || code === 'AI_CREDITS_DEPLETED') {
    window.dispatchEvent(
      new CustomEvent('korex:upgrade-required', { detail: { reason: code, message } }),
    );
    return;
  }

  toast({ title: fallbackTitle, description: message, variant: 'destructive' });
}

/* -------------------------------------------------------------------------- */
/* Actor catalog + quota                                                       */
/* -------------------------------------------------------------------------- */

interface ActorsResponse {
  actors?: AdActor[];
  voices?: AdVoice[];
  quota?: VideoQuota;
  error?: string;
  code?: string;
}

export function useAdActors() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['ad-actors', user?.id ?? 'anon'],
    queryFn: () => invokeFn<ActorsResponse>('list-ad-actors', {}),
    enabled: !!user,
    // Catalog is server-cached for 24h; don't refetch aggressively.
    staleTime: 60 * 60 * 1000,
    gcTime: 2 * 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  });
}

/* -------------------------------------------------------------------------- */
/* Script generation                                                           */
/* -------------------------------------------------------------------------- */

export interface ScriptRequest {
  angle?: string;
  durationSeconds?: number;
  count?: number;
  promoCode?: string;
  promoDetail?: string;
  customBrief?: string;
  /** Ties the ad's visual treatment to a specific strategy day. */
  strategyPostId?: string;
  /** Target ad platform — drives the niche intelligence + production spec. */
  platform?: string;
}


export function useAdScripts() {
  const { activeWorkspaceId } = useWorkspace();
  const [variants, setVariants] = useState<AdScriptVariant[]>([]);

  const mutation = useMutation({
    mutationFn: (req: ScriptRequest) =>
      invokeFn<{ variants: AdScriptVariant[] }>('generate-ad-script', {
        ...req,
        workspaceId: activeWorkspaceId,
      }),
    onSuccess: (data) => {
      setVariants(data.variants ?? []);
      toast({
        title: 'Scripts ready',
        description: `${data.variants?.length ?? 0} hook angles written from your business context.`,
      });
    },
    onError: (error) => handleFailure(error, 'Script generation failed'),
  });

  return {
    variants,
    setVariants,
    generate: mutation.mutate,
    generateAsync: mutation.mutateAsync,
    isGenerating: mutation.isPending,
  };
}

/* -------------------------------------------------------------------------- */
/* Video library + rendering                                                   */
/* -------------------------------------------------------------------------- */

export function useVideoAds() {
  const { user } = useAuth();
  const { activeWorkspaceId } = useWorkspace();
  const queryClient = useQueryClient();
  const queryKey = ['video-ads', user?.id ?? 'anon', activeWorkspaceId ?? 'all'];

  const listQuery = useQuery({
    queryKey,
    queryFn: async (): Promise<VideoAdRecord[]> => {
      let q = supabase
        .from('video_ads')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(60);
      if (activeWorkspaceId) q = q.eq('workspace_id', activeWorkspaceId);

      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as VideoAdRecord[];
    },
    enabled: !!user,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: false,
  });

  // Signed playback URLs, resolved on demand and refreshed when they expire.
  const [urls, setUrls] = useState<Record<string, string>>({});
  const pollingRef = useRef<number | null>(null);

  const refreshStatus = useCallback(
    async (id: string) => {
      try {
        const res = await invokeFn<{ status: string; url?: string | null; error?: string }>(
          'video-ad-status',
          { id },
        );
        if (res.url) {
          setUrls((prev) => ({ ...prev, [id]: res.url as string }));
        }
        if (res.status === 'completed' || res.status === 'failed') {
          queryClient.invalidateQueries({ queryKey });
        }
        return res;
      } catch (error) {
        console.error('[video-ads] status check failed', error);
        return null;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [queryClient, activeWorkspaceId, user?.id],
  );

  // Poll only while something is actually rendering.
  const pending = (listQuery.data ?? []).filter(
    (v) => v.status === 'queued' || v.status === 'processing',
  );
  const pendingIds = pending.map((p) => p.id).join(',');

  useEffect(() => {
    if (!pendingIds) {
      if (pollingRef.current) {
        window.clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
      return;
    }

    const tick = () => {
      pendingIds.split(',').forEach((id) => id && refreshStatus(id));
    };
    tick();
    pollingRef.current = window.setInterval(tick, POLL_INTERVAL_MS);

    return () => {
      if (pollingRef.current) {
        window.clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [pendingIds, refreshStatus]);

  const createMutation = useMutation({
    mutationFn: (input: {
      script: string;
      hook?: string;
      title?: string;
      angle?: string;
      avatarId: string;
      avatarName?: string;
      avatarPreviewUrl?: string;
      voiceId: string;
      aspectRatio: string;
      strategyPostId?: string;
      productionPlan?: unknown;
    }) => invokeFn<{ id: string }>('generate-video-ad', { ...input, workspaceId: activeWorkspaceId }),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: ['ad-actors'] });
      toast({
        title: 'Render started',
        description: 'Your video is being produced. This usually takes one to three minutes.',
      });
    },
    onError: (error) => handleFailure(error, 'Could not start the render'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('video_ads').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast({ title: 'Video deleted' });
    },
    onError: (error) =>
      toast({
        title: 'Could not delete',
        description: (error as Error).message,
        variant: 'destructive',
      }),
  });

  /** Resolves (or refreshes) a signed playback URL for a finished video. */
  const getPlaybackUrl = useCallback(
    async (id: string) => {
      if (urls[id]) return urls[id];
      const res = await refreshStatus(id);
      return res?.url ?? null;
    },
    [urls, refreshStatus],
  );

  return {
    videos: listQuery.data ?? [],
    isLoading: listQuery.isLoading,
    error: listQuery.error,
    urls,
    getPlaybackUrl,
    refreshStatus,
    createVideo: createMutation.mutate,
    isCreating: createMutation.isPending,
    deleteVideo: deleteMutation.mutate,
    isDeleting: deleteMutation.isPending,
  };
}
