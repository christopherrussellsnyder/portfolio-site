import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

interface HealthStatus {
  app: 'checking' | 'ok' | 'error';
  database: 'checking' | 'ok' | 'error';
  auth: 'checking' | 'ok' | 'error';
}

export default function HealthCheck() {
  const [status, setStatus] = useState<HealthStatus>({
    app: 'checking',
    database: 'checking',
    auth: 'checking'
  });
  const [lastChecked, setLastChecked] = useState<Date>(new Date());
  
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
  }, []);
  
  const allOk = Object.values(status).every(s => s === 'ok');
  
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-card border border-border rounded-xl p-8">
        <h1 className="text-2xl font-bold text-foreground mb-6 text-center">
          System Health
        </h1>
        
        <div className="space-y-4 mb-6">
          <HealthItem label="Application" status={status.app} />
          <HealthItem label="Database" status={status.database} />
          <HealthItem label="Authentication" status={status.auth} />
        </div>
        
        <div className={`p-4 rounded-lg text-center ${
          allOk 
            ? 'bg-emerald-500/10 border border-emerald-500/20' 
            : 'bg-destructive/10 border border-destructive/20'
        }`}>
          <p className={`font-medium ${allOk ? 'text-emerald-400' : 'text-destructive'}`}>
            {allOk ? '✓ All Systems Operational' : '✗ Issues Detected'}
          </p>
        </div>
        
        <p className="text-xs text-muted-foreground text-center mt-4">
          Last checked: {lastChecked.toLocaleTimeString()}
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
