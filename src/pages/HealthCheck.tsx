import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle, XCircle, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface HealthStatus {
  app: 'checking' | 'ok' | 'error';
  database: 'checking' | 'ok' | 'error';
  auth: 'checking' | 'ok' | 'error';
}

interface BackendCheck {
  name: string;
  ok: boolean;
  detail: string;
  latency_ms?: number;
}

const CHECK_LABELS: Record<string, string> = {
  'list-ad-actors': 'Video ads — actor catalog',
  'generate-video-ad': 'Video ads — render',
  'video-ad-status': 'Video ads — status poll',
  'generate-strategy': 'Strategy generation',
  'generate-ad-script': 'Ad script generation',
  'generate-caption-variants': 'Caption variants',
  'check-subscription': 'Billing — subscription check',
  'create-checkout': 'Billing — checkout',
  'customer-portal': 'Billing — customer portal',
  'ai-chat': 'AI strategist chat',
  anthropic: 'Anthropic (AI generation)',
  stripe: 'Stripe (payments)',
  heygen: 'HeyGen (video rendering)',
  lovable_api_key: 'Lovable API key (email pipeline)',
  email_pipeline: 'Email send success rate (24h)',
};

export default function HealthCheck() {
  const [status, setStatus] = useState<HealthStatus>({
    app: 'checking',
    database: 'checking',
    auth: 'checking'
  });
  const [backendChecks, setBackendChecks] = useState<BackendCheck[] | null>(null);
  const [backendError, setBackendError] = useState<string | null>(null);
  const [backendLoading, setBackendLoading] = useState(true);
  const [lastChecked, setLastChecked] = useState<Date>(new Date());

  const runBackendCheck = async () => {
    setBackendLoading(true);
    setBackendError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not signed in');
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/system-health-check`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: '{}',
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload?.error ?? `HTTP ${res.status}`);
      setBackendChecks(payload.results ?? []);
    } catch (e) {
      setBackendError(e instanceof Error ? e.message : String(e));
    } finally {
      setBackendLoading(false);
    }
  };

  useEffect(() => {
    const checkHealth = async () => {
      // Check database
      try {
        const { error } = await supabase.from('user_profiles').select('id').limit(1);
        setStatus(prev => ({
          ...prev,
          database: error ? 'error' : 'ok'
        }));
      } catch {
        setStatus(prev => ({ ...prev, database: 'error' }));
      }

      // Check auth
      try {
        const { error } = await supabase.auth.getSession();
        setStatus(prev => ({
          ...prev,
          auth: error ? 'error' : 'ok'
        }));
      } catch {
        setStatus(prev => ({ ...prev, auth: 'error' }));
      }

      // App is ok if we got here
      setStatus(prev => ({ ...prev, app: 'ok' }));
      setLastChecked(new Date());
    };

    checkHealth();
    runBackendCheck();
  }, []);

  const allOk = Object.values(status).every(s => s === 'ok') && (backendChecks ?? []).every((c) => c.ok);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 py-12">
      <div className="max-w-2xl w-full bg-card border border-border rounded-xl p-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-foreground text-center flex-1">
            System Health
          </h1>
          <Button variant="ghost" size="icon" onClick={runBackendCheck} disabled={backendLoading} aria-label="Re-run health check">
            <RefreshCw className={`w-4 h-4 ${backendLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        <div className="space-y-4 mb-6">
          <HealthItem label="Application" status={status.app} />
          <HealthItem label="Database" status={status.database} />
          <HealthItem label="Authentication" status={status.auth} />
        </div>

        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Backend &amp; providers
        </h2>
        <div className="space-y-2 mb-6">
          {backendError && (
            <p className="text-sm text-destructive">Could not run backend checks: {backendError}</p>
          )}
          {!backendError && backendChecks === null && backendLoading && (
            <HealthItem label="Running checks…" status="checking" />
          )}
          {(backendChecks ?? []).map((c) => (
            <div key={c.name} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg gap-4">
              <div className="min-w-0">
                <div className="text-foreground font-medium">{CHECK_LABELS[c.name] ?? c.name}</div>
                <div className="text-xs text-muted-foreground truncate">{c.detail}</div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {c.ok ? (
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                ) : (
                  <XCircle className="w-4 h-4 text-destructive" />
                )}
              </div>
            </div>
          ))}
        </div>

        <div className={`p-4 rounded-lg text-center ${
          allOk
            ? 'bg-emerald-500/10 border border-emerald-500/20'
            : 'bg-destructive/10 border border-destructive/20'
        }`}>
          <p className={`font-medium ${allOk ? 'text-emerald-400' : 'text-destructive'}`}>
            {allOk ? 'All Systems Operational' : 'Issues Detected'}
          </p>
        </div>

        <p className="text-xs text-muted-foreground text-center mt-4">
          Last checked: {lastChecked.toLocaleTimeString()} · A scheduled check also runs every 15 minutes in the background
        </p>
      </div>
    </div>
  );
}

function HealthItem({ label, status }: { label: string; status: 'checking' | 'ok' | 'error' }) {
  return (
    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
      <span className="text-foreground font-medium">{label}</span>
      <div className="flex items-center gap-2">
        {status === 'checking' && (
          <>
            <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />
            <span className="text-sm text-muted-foreground">Checking...</span>
          </>
        )}
        {status === 'ok' && (
          <>
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <span className="text-sm text-emerald-400">OK</span>
          </>
        )}
        {status === 'error' && (
          <>
            <XCircle className="w-4 h-4 text-destructive" />
            <span className="text-sm text-destructive">Error</span>
          </>
        )}
      </div>
    </div>
  );
}
