import React, { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DataSourceBadge } from '@/components/DataSourceBadge';
import {
  Plug, RefreshCw, Loader2, Unplug, AlertTriangle, Megaphone,
  TrendingUp, MousePointerClick, DollarSign, Eye,
} from 'lucide-react';

interface ConnectedAccount {
  id: string;
  platform: string;
  account_id: string;
  account_name: string | null;
  currency: string | null;
  status: 'active' | 'expired' | 'revoked' | 'error';
  token_expires_at: string | null;
  last_synced_at: string | null;
  last_error: string | null;
  connected_at: string;
}

interface Snapshot {
  level: string;
  object_id: string;
  object_name: string | null;
  objective: string | null;
  spend: number | null;
  impressions: number | null;
  clicks: number | null;
  ctr: number | null;
  cpc: number | null;
  roas: number | null;
  purchases: number | null;
  purchase_value: number | null;
  date_start: string | null;
  date_stop: string | null;
  fetched_at: string;
  account_id: string;
}

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/30',
  expired: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30',
  revoked: 'bg-destructive/10 text-destructive border-destructive/30',
  error: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30',
};

const fmt = (n: number | null, digits = 2) =>
  n == null ? '—' : n >= 1000 ? `${(n / 1000).toFixed(1)}k` : n.toFixed(digits);

export const AdAccountsSection: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // OAuth redirect landing feedback.
  useEffect(() => {
    const meta = searchParams.get('meta');
    if (!meta) return;
    if (meta === 'connected') {
      toast({ title: 'Ad account connected', description: 'Your Meta ad account is now linked. First sync may take a moment.' });
    } else if (meta === 'error') {
      const reason = searchParams.get('reason') || 'unknown';
      toast({
        title: 'Connection failed',
        description: reason === 'no_ad_accounts'
          ? 'No Meta ad accounts were found on that Facebook profile.'
          : 'Meta connection could not be completed. Please try again.',
        variant: 'destructive',
      });
    }
    const next = new URLSearchParams(searchParams);
    next.delete('meta');
    next.delete('reason');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams, toast]);

  const loadAccounts = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('connected_ad_accounts')
      .select('id, platform, account_id, account_name, currency, status, token_expires_at, last_synced_at, last_error, connected_at')
      .eq('platform', 'meta')
      .order('connected_at', { ascending: false });
    if (error) {
      console.error('failed to load ad accounts', error.message);
    }
    setAccounts((data as ConnectedAccount[]) ?? []);
  }, [user]);

  const loadSnapshots = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('ad_performance_snapshots')
      .select('level, object_id, object_name, objective, spend, impressions, clicks, ctr, cpc, roas, purchases, purchase_value, date_start, date_stop, fetched_at, account_id')
      .eq('platform', 'meta')
      .eq('level', 'campaign')
      .order('spend', { ascending: false })
      .limit(12);
    setSnapshots((data as Snapshot[]) ?? []);
  }, [user]);

  // On-demand stale refresh: when the user views this page and data is older
  // than 24h, the edge function refreshes it (and fails soft to cache).
  const syncPerformance = useCallback(async (force = false, silent = false) => {
    if (!user) return;
    if (!silent) setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('fetch-meta-ad-performance', {
        body: { force },
      });
      if (error) throw error;
      if (data?.snapshots) {
        const campaigns = (data.snapshots as Snapshot[])
          .filter((s) => s.level === 'campaign')
          .slice(0, 12);
        setSnapshots(campaigns);
      }
      const needsReconnect = (data?.results ?? []).some(
        (r: any) => r.status === 'revoked' || r.status === 'expired',
      );
      if (needsReconnect) {
        toast({
          title: 'Reconnect required',
          description: 'A Meta ad account authorization has expired. Reconnect it to resume live syncing.',
          variant: 'destructive',
        });
      }
      await loadAccounts();
    } catch (e: any) {
      if (!silent) {
        toast({
          title: 'Sync failed',
          description: 'Could not refresh ad performance right now — showing the last cached data.',
          variant: 'destructive',
        });
      }
    } finally {
      if (!silent) setSyncing(false);
    }
  }, [user, toast, loadAccounts]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await loadAccounts();
      setLoading(false);
    })();
  }, [loadAccounts]);

  // Trigger stale-check sync once accounts are loaded.
  useEffect(() => {
    if (loading) return;
    if (!accounts.length) {
      void loadSnapshots();
      return;
    }
    const stale = accounts.some(
      (a) => a.status === 'active' &&
        (!a.last_synced_at || Date.now() - new Date(a.last_synced_at).getTime() > 24 * 3600 * 1000),
    );
    if (stale) void syncPerformance(false, true);
    else void loadSnapshots();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, accounts.length]);

  const startConnect = async () => {
    setConnecting(true);
    try {
      const { data, error } = await supabase.functions.invoke('meta-oauth-callback', {
        body: { redirect_to: `${window.location.origin}/settings?tab=ads` },
      });
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
        return;
      }
      throw new Error(data?.error || 'No authorization URL returned');
    } catch (e: any) {
      toast({
        title: 'Could not start connection',
        description: e?.message || 'Meta OAuth is not configured yet.',
        variant: 'destructive',
      });
      setConnecting(false);
    }
  };

  const disconnect = async (id: string) => {
    const { error } = await supabase.from('connected_ad_accounts').delete().eq('id', id);
    if (error) {
      toast({ title: 'Disconnect failed', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Disconnected', description: 'Ad account removed.' });
      await loadAccounts();
      await loadSnapshots();
    }
  };

  const lastFetched = snapshots.reduce<string | null>(
    (acc, s) => (!acc || s.fetched_at > acc ? s.fetched_at : acc),
    null,
  );

  return (
    <div className="space-y-6">
      <Card className="bg-card border-border">
        <CardHeader>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-primary" />
                Connected Ad Accounts
              </CardTitle>
              <CardDescription>
                Link your Meta ad account to replace AI-estimated trends with real performance data from the Meta Marketing API.
                Tokens are encrypted and stored server-side only.
              </CardDescription>
            </div>
            <Button onClick={startConnect} disabled={connecting}>
              {connecting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plug className="w-4 h-4 mr-2" />}
              Connect Ad Account
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading connected accounts…
            </div>
          ) : accounts.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-5 space-y-2">
              <p className="text-sm font-medium">No ad account connected</p>
              <p className="text-sm text-muted-foreground">
                Until you connect a real account, market intelligence in strategies and research remains an{' '}
                <span className="font-medium">AI-estimated trend</span> — clearly labeled throughout the app.
                Connecting unlocks real spend, CTR, CPC and ROAS pulled straight from Meta.
              </p>
            </div>
          ) : (
            accounts.map((acct) => (
              <div
                key={acct.id}
                className="rounded-lg border border-border p-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm truncate">
                      {acct.account_name || `Meta account ${acct.account_id}`}
                    </span>
                    <Badge variant="outline" className={STATUS_STYLES[acct.status] ?? ''}>
                      {acct.status}
                    </Badge>
                    {acct.status === 'active' && <DataSourceBadge type="real_api" />}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    act_{acct.account_id}
                    {acct.last_synced_at && (
                      <> · last synced {new Date(acct.last_synced_at).toLocaleString()}</>
                    )}
                    {acct.token_expires_at && (
                      <> · token renews {new Date(acct.token_expires_at).toLocaleDateString()}</>
                    )}
                  </p>
                  {(acct.status === 'expired' || acct.status === 'revoked') && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Authorization {acct.status === 'expired' ? 'expired' : 'was revoked'} — reconnect to resume live data. Cached data remains below.
                    </p>
                  )}
                  {acct.status === 'error' && acct.last_error && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" /> {acct.last_error}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {(acct.status === 'expired' || acct.status === 'revoked') ? (
                    <Button size="sm" onClick={startConnect} disabled={connecting}>
                      <Plug className="w-4 h-4 mr-1.5" /> Reconnect
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => syncPerformance(true)}
                      disabled={syncing}
                    >
                      {syncing ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-1.5" />}
                      Sync now
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => disconnect(acct.id)}
                  >
                    <Unplug className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {snapshots.length > 0 && (
        <Card className="bg-card border-border">
          <CardHeader>
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  Real Campaign Performance
                  <DataSourceBadge type="real_api" />
                </CardTitle>
                <CardDescription>
                  Meta Marketing API · last 30 days
                  {lastFetched && <> · last updated {new Date(lastFetched).toLocaleString()}</>}
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => syncPerformance(true)} disabled={syncing}>
                {syncing ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-1.5" />}
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground">
                    <th className="py-2 pr-4 font-medium">Campaign</th>
                    <th className="py-2 pr-4 font-medium"><DollarSign className="w-3.5 h-3.5 inline mr-1" />Spend</th>
                    <th className="py-2 pr-4 font-medium"><Eye className="w-3.5 h-3.5 inline mr-1" />Impr.</th>
                    <th className="py-2 pr-4 font-medium"><MousePointerClick className="w-3.5 h-3.5 inline mr-1" />CTR</th>
                    <th className="py-2 pr-4 font-medium">CPC</th>
                    <th className="py-2 font-medium"><TrendingUp className="w-3.5 h-3.5 inline mr-1" />ROAS</th>
                  </tr>
                </thead>
                <tbody>
                  {snapshots.map((s) => (
                    <tr key={`${s.account_id}-${s.object_id}`} className="border-b border-border/50 last:border-0">
                      <td className="py-2.5 pr-4 max-w-[220px] truncate">
                        {s.object_name || s.object_id}
                        {s.objective && (
                          <span className="block text-xs text-muted-foreground">{s.objective}</span>
                        )}
                      </td>
                      <td className="py-2.5 pr-4">${fmt(s.spend)}</td>
                      <td className="py-2.5 pr-4">{fmt(s.impressions, 0)}</td>
                      <td className="py-2.5 pr-4">{s.ctr == null ? '—' : `${s.ctr.toFixed(2)}%`}</td>
                      <td className="py-2.5 pr-4">{s.cpc == null ? '—' : `$${s.cpc.toFixed(2)}`}</td>
                      <td className="py-2.5 font-medium">{s.roas == null ? '—' : `${s.roas.toFixed(2)}x`}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdAccountsSection;
