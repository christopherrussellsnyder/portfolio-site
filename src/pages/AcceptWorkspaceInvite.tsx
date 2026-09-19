import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function AcceptWorkspaceInvite() {
  const { token } = useParams<{ token: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [state, setState] = useState<'idle' | 'accepting' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      // Preserve token, then redirect after login
      sessionStorage.setItem('pending_workspace_invite', token || '');
      navigate(`/login?redirect=/accept-workspace-invite/${token}`);
      return;
    }
    if (!token || state !== 'idle') return;

    (async () => {
      setState('accepting');
      try {
        const { data, error } = await supabase.functions.invoke('accept-workspace-invitation', {
          body: { token },
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        setMessage(`You've joined ${data.workspace_name || 'the workspace'}.`);
        setState('success');
        toast.success('Invitation accepted');
        setTimeout(() => navigate('/ai-strategist'), 1600);
      } catch (err: any) {
        setMessage(err?.message || 'Failed to accept invitation');
        setState('error');
      }
    })();
  }, [authLoading, user, token, navigate, state]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <Card className="max-w-md w-full bg-card border-border">
        <CardContent className="p-8 text-center space-y-4">
          {(state === 'idle' || state === 'accepting') && (
            <>
              <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
              <h1 className="text-lg font-semibold">Accepting invitation…</h1>
            </>
          )}
          {state === 'success' && (
            <>
              <CheckCircle2 className="h-10 w-10 text-green-500 mx-auto" />
              <h1 className="text-lg font-semibold">Welcome aboard</h1>
              <p className="text-sm text-muted-foreground">{message}</p>
            </>
          )}
          {state === 'error' && (
            <>
              <XCircle className="h-10 w-10 text-destructive mx-auto" />
              <h1 className="text-lg font-semibold">Invitation problem</h1>
              <p className="text-sm text-muted-foreground">{message}</p>
              <Button onClick={() => navigate('/ai-strategist')} className="bg-primary hover:bg-[hsl(var(--primary)/0.9)]">
                Go to app
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
