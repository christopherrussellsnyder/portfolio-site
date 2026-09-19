import React, { createContext, useContext, useCallback, useEffect, useState, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { toast as sonnerToast } from 'sonner';

export interface Workspace {
  id: string;
  owner_id: string;
  name: string;
  slug: string | null;
  logo_url: string | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

interface WorkspaceContextType {
  workspaces: Workspace[];
  activeWorkspace: Workspace | null;
  activeWorkspaceId: string | null;
  isLoading: boolean;
  canCreateMore: boolean;
  workspaceLimit: number;
  switchWorkspace: (id: string) => Promise<void>;
  createWorkspace: (name: string) => Promise<Workspace | null>;
  renameWorkspace: (id: string, name: string) => Promise<boolean>;
  deleteWorkspace: (id: string) => Promise<boolean>;
  refresh: () => Promise<void>;
}

const FOUNDER_EMAIL = 'chrissnyder3456@gmail.com';

const WorkspaceContext = createContext<WorkspaceContextType>({
  workspaces: [],
  activeWorkspace: null,
  activeWorkspaceId: null,
  isLoading: true,
  canCreateMore: false,
  workspaceLimit: 1,
  switchWorkspace: async () => {},
  createWorkspace: async () => null,
  renameWorkspace: async () => false,
  deleteWorkspace: async () => false,
  refresh: async () => {},
});

export const useWorkspace = () => useContext(WorkspaceContext);

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { tier, subscribed } = useSubscription();
  const queryClient = useQueryClient();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isFounder = user?.email?.toLowerCase() === FOUNDER_EMAIL;

  const workspaceLimit = useMemo(() => {
    if (isFounder) return 999;
    if (subscribed && tier === 'agency') return 10;
    return 1;
  }, [isFounder, subscribed, tier]);

  const load = useCallback(async () => {
    if (!user?.id) {
      setWorkspaces([]);
      setActiveWorkspaceId(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const [{ data: ws }, { data: profile }] = await Promise.all([
        supabase
          .from('workspaces')
          .select('*')
          .order('is_default', { ascending: false })
          .order('created_at', { ascending: true }),
        supabase
          .from('user_profiles')
          .select('active_workspace_id')
          .eq('user_id', user.id)
          .maybeSingle(),
      ]);

      const list = (ws || []) as Workspace[];
      setWorkspaces(list);

      // Determine active workspace
      const savedId = (profile as any)?.active_workspace_id as string | null | undefined;
      const active = list.find((w) => w.id === savedId) || list.find((w) => w.is_default) || list[0];
      setActiveWorkspaceId(active?.id ?? null);
    } catch (err) {
      console.error('Workspace load failed:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const switchWorkspace = useCallback(
    async (id: string) => {
      if (!user?.id || id === activeWorkspaceId) return;
      setActiveWorkspaceId(id);
      await supabase
        .from('user_profiles')
        .update({ active_workspace_id: id, updated_at: new Date().toISOString() })
        .eq('user_id', user.id);
      // Drop all workspace-scoped caches so pages refetch under the new context.
      queryClient.invalidateQueries();
    },
    [user?.id, activeWorkspaceId, queryClient]
  );

  const createWorkspace = useCallback(
    async (name: string): Promise<Workspace | null> => {
      if (!user?.id) return null;
      const trimmed = name.trim();
      if (!trimmed) {
        sonnerToast.error('Please enter a workspace name');
        return null;
      }
      if (workspaces.length >= workspaceLimit) {
        sonnerToast.error(
          workspaceLimit === 1
            ? 'Upgrade to Agency to manage multiple brands'
            : `You've reached the ${workspaceLimit}-workspace limit`
        );
        return null;
      }
      try {
        const { data, error } = await supabase
          .from('workspaces')
          .insert({ owner_id: user.id, name: trimmed, is_default: false })
          .select()
          .single();
        if (error) throw error;

        // Add owner membership
        await supabase.from('workspace_members').insert({
          workspace_id: data.id,
          user_id: user.id,
          role: 'owner',
        });

        const created = data as Workspace;
        setWorkspaces((prev) => [...prev, created]);
        await switchWorkspace(created.id);
        sonnerToast.success(`Workspace "${trimmed}" created`);
        return created;
      } catch (err: any) {
        console.error('Create workspace failed:', err);
        sonnerToast.error(err?.message || 'Failed to create workspace');
        return null;
      }
    },
    [user?.id, workspaces.length, workspaceLimit, switchWorkspace]
  );

  const renameWorkspace = useCallback(
    async (id: string, name: string): Promise<boolean> => {
      const trimmed = name.trim();
      if (!trimmed) return false;
      try {
        const { error } = await supabase
          .from('workspaces')
          .update({ name: trimmed, updated_at: new Date().toISOString() })
          .eq('id', id);
        if (error) throw error;
        setWorkspaces((prev) => prev.map((w) => (w.id === id ? { ...w, name: trimmed } : w)));
        sonnerToast.success('Workspace renamed');
        return true;
      } catch (err: any) {
        sonnerToast.error(err?.message || 'Failed to rename workspace');
        return false;
      }
    },
    []
  );

  const deleteWorkspace = useCallback(
    async (id: string): Promise<boolean> => {
      const target = workspaces.find((w) => w.id === id);
      if (!target) return false;
      if (target.is_default) {
        sonnerToast.error("You can't delete your default workspace");
        return false;
      }
      if (workspaces.length <= 1) {
        sonnerToast.error('You must have at least one workspace');
        return false;
      }
      try {
        const { error } = await supabase.from('workspaces').delete().eq('id', id);
        if (error) throw error;
        const next = workspaces.filter((w) => w.id !== id);
        setWorkspaces(next);
        if (activeWorkspaceId === id) {
          const fallback = next.find((w) => w.is_default) || next[0];
          if (fallback) await switchWorkspace(fallback.id);
        }
        sonnerToast.success('Workspace deleted');
        return true;
      } catch (err: any) {
        sonnerToast.error(err?.message || 'Failed to delete workspace');
        return false;
      }
    },
    [workspaces, activeWorkspaceId, switchWorkspace]
  );

  const activeWorkspace = useMemo(
    () => workspaces.find((w) => w.id === activeWorkspaceId) ?? null,
    [workspaces, activeWorkspaceId]
  );

  const canCreateMore = workspaces.length < workspaceLimit;

  return (
    <WorkspaceContext.Provider
      value={{
        workspaces,
        activeWorkspace,
        activeWorkspaceId,
        isLoading,
        canCreateMore,
        workspaceLimit,
        switchWorkspace,
        createWorkspace,
        renameWorkspace,
        deleteWorkspace,
        refresh: load,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}
