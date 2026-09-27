import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowLeft, Radar, Loader2, Plus, X, Bell, Search, CheckCircle2,
} from 'lucide-react';

import { supabase } from '@/integrations/supabase/client';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { UpgradeModal } from '@/components/UpgradeModal';
import { toast } from '@/hooks/use-toast';
import { DataSourceBadge } from '@/components/DataSourceBadge';

interface Competitor {
  id: string;
  name: string;
  industry: string | null;
  website: string | null;
}

interface Alert {
  id: string;
  competitor_id: string;
  snippet: string;
  detected_at: string;
  is_read: boolean;
  competitors?: { name: string } | null;
}

export default function CompetitorMonitoring() {
  const navigate = useNavigate();
  const { isPro } = useSubscription();
  const [loading, setLoading] = useState(true);
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [newName, setNewName] = useState('');
  const [newWebsite, setNewWebsite] = useState('');
  const [adding, setAdding] = useState(false);
  const [checking, setChecking] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);

  const callAction = async (body: Record<string, unknown>) => {
    const { data, error } = await supabase.functions.invoke('competitor-monitoring', { body });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return data;
  };

  const load = async () => {
    setLoading(true);
    try {
      const [competitorsData, alertsData] = await Promise.all([
        callAction({ action: 'get_competitors' }),
        callAction({ action: 'get_alerts' }),
      ]);
      setCompetitors(competitorsData.competitors || []);
      setAlerts(alertsData.alerts || []);
    } catch (e) {
      console.error('Failed to load competitor monitoring data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addCompetitor = async () => {
    if (!isPro) {
      setShowUpgrade(true);
      return;
    }
    if (!newName.trim()) return;
    setAdding(true);
    try {
      await callAction({
        action: 'add_competitor',
        competitorData: { name: newName.trim(), website: newWebsite.trim() || undefined },
      });
      setNewName('');
      setNewWebsite('');
      toast({ title: `Now tracking ${newName.trim()}` });
      load();
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Try again in a moment.';
      toast({ title: 'Could not add competitor', description: message, variant: 'destructive' });
    } finally {
      setAdding(false);
    }
  };

  const removeCompetitor = async (competitorId: string, name: string) => {
    try {
      await callAction({ action: 'remove_competitor', competitorId });
      setCompetitors((prev) => prev.filter((c) => c.id !== competitorId));
      toast({ title: `Stopped tracking ${name}` });
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Try again in a moment.';
      toast({ title: 'Could not remove competitor', description: message, variant: 'destructive' });
    }
  };

  const checkNow = async () => {
    if (!isPro) {
      setShowUpgrade(true);
      return;
    }
    setChecking(true);
    try {
      const data = await callAction({ action: 'check_now' });
      toast({
        title: data.newAdsFound > 0
          ? `${data.newAdsFound} new ad${data.newAdsFound === 1 ? '' : 's'} found`
          : 'No new ads found',
        description: `Checked ${data.competitorsChecked} tracked competitor${data.competitorsChecked === 1 ? '' : 's'}.`,
      });
      load();
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Try again in a moment.';
      toast({ title: 'Could not run check', description: message, variant: 'destructive' });
    } finally {
      setChecking(false);
    }
  };

  const markRead = async (alertId: string) => {
    setAlerts((prev) => prev.map((a) => (a.id === alertId ? { ...a, is_read: true } : a)));
    try {
      await callAction({ action: 'mark_alert_read', alertId });
    } catch (e) {
      console.error('Failed to mark alert read:', e);
    }
  };

  const unreadCount = alerts.filter((a) => !a.is_read).length;

  return (
    <>
      <UpgradeModal open={showUpgrade} onClose={() => setShowUpgrade(false)} />
      <Helmet>
        <title>Competitor Monitoring | Korex Intelligence</title>
        <meta
          name="description"
          content="Track competitors and get alerted when they run new ads, sourced from live Meta Ad Library recon."
        />
      </Helmet>

      <div className="min-h-screen bg-background text-foreground">
        <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-40 px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <Button aria-label="Go back" variant="ghost" size="icon" onClick={() => navigate('/ai-strategist')}>
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div className="flex items-center gap-2">
                <Radar className="w-4 h-4 text-primary" />
                <h1 className="text-xl font-semibold tracking-tight">Competitor Monitoring</h1>
              </div>
              <DataSourceBadge type="real_api" />
              {unreadCount > 0 && (
                <Badge className="text-[10px]">{unreadCount} new</Badge>
              )}
            </div>
            <Button size="sm" onClick={checkNow} disabled={checking || !competitors.length} className="gap-1.5">
              {checking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
              Check now
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Tracks currently-running ads for each competitor via live Meta Ad Library recon and alerts you to new ones. Checked automatically every week.
          </p>
        </header>

        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
          {loading ? (
            <div className="space-y-4" aria-busy="true" aria-label="Loading competitor monitoring">
              <Skeleton className="h-24 rounded-md" />
              <Skeleton className="h-48 rounded-md" />
            </div>
          ) : (
            <>
              <Card className="bg-card border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Tracked competitors</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {competitors.map((c) => (
                      <Badge key={c.id} variant="secondary" className="text-xs gap-1.5 pr-1">
                        {c.name}
                        <button
                          onClick={() => removeCompetitor(c.id, c.name)}
                          aria-label={`Stop tracking ${c.name}`}
                          className="hover:text-destructive"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                    {competitors.length === 0 && (
                      <p className="text-xs text-muted-foreground">No competitors tracked yet.</p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Input
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="Competitor name (e.g. Blue Bottle)"
                      className="h-8 text-xs bg-muted border-border max-w-[220px]"
                    />
                    <Input
                      value={newWebsite}
                      onChange={(e) => setNewWebsite(e.target.value)}
                      placeholder="Website (optional)"
                      className="h-8 text-xs bg-muted border-border max-w-[220px]"
                    />
                    <Button size="sm" variant="outline" onClick={addCompetitor} disabled={adding || !newName.trim()} className="gap-1.5">
                      {adding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                      Track
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Bell className="w-4 h-4 text-primary" />
                    Alerts
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {alerts.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-6 text-center">
                      No new ads detected yet. Add a competitor and run a check, or wait for the weekly automatic scan.
                    </p>
                  ) : (
                    alerts.map((alert) => (
                      <div
                        key={alert.id}
                        className={`flex items-start justify-between gap-3 p-3 rounded-md border ${
                          alert.is_read ? 'bg-muted/20 border-border/60' : 'bg-primary/5 border-primary/30'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-foreground">{alert.competitors?.name || 'Competitor'}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{alert.snippet}</p>
                          <p className="text-[10px] text-muted-foreground mt-1">
                            {new Date(alert.detected_at).toLocaleDateString()}
                          </p>
                        </div>
                        {!alert.is_read && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 shrink-0"
                            onClick={() => markRead(alert.id)}
                            aria-label="Mark as read"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </main>
      </div>
    </>
  );
}
