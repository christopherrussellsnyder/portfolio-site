import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { KorexLogoLockup } from '@/components/branding/KorexLogoLockup';

export default function AuthConfirm() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const confirmEmail = async () => {
      try {
        // The URL contains the token params that Supabase uses
        const { error } = await supabase.auth.exchangeCodeForSession(
          window.location.href.split('?')[1] || window.location.hash.substring(1)
        );
        if (error) throw error;
        setStatus('success');
      } catch {
        setStatus('error');
      }
    };
    confirmEmail();
  }, []);

  const handleResend = async () => {
    setResending(true);
    try {
      // We don't know the email here, redirect to login
      navigate('/login');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center">
        <KorexLogoLockup height={56} className="mx-auto mb-10" />

        {status === 'loading' && (
          <div>
            <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-6" />
            <h1 className="text-2xl font-bold mb-2">Verifying your account...</h1>
            <p className="text-muted-foreground">Please wait while we confirm your email.</p>
          </div>
        )}

        {status === 'success' && (
          <div>
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-6" />
            <h1 className="text-2xl font-bold mb-2">Email Verified!</h1>
            <p className="text-muted-foreground mb-8">Your Korex account is now active. Welcome to the platform.</p>
            <Link to="/ai-strategist"
              className="inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-primary to-[hsl(var(--primary-dark))] text-white font-bold rounded-lg hover:scale-105 transition-all shadow-[0_0_20px_hsl(var(--primary) / 0.3)]">
              Enter Korex →
            </Link>
          </div>
        )}

        {status === 'error' && (
          <div>
            <AlertCircle className="w-16 h-16 text-primary mx-auto mb-6" />
            <h1 className="text-2xl font-bold mb-2">Verification Link Expired</h1>
            <p className="text-muted-foreground mb-8">This verification link has expired or is invalid. Request a new one below.</p>
            <button onClick={handleResend} disabled={resending}
              className="px-8 py-3 bg-gradient-to-r from-primary to-[hsl(var(--primary-dark))] text-white font-bold rounded-lg hover:scale-105 transition-all shadow-[0_0_20px_hsl(var(--primary) / 0.3)] disabled:opacity-50">
              {resending ? 'Redirecting...' : 'Resend Verification Email'}
            </button>
          </div>
        )}

        <div className="mt-8">
          <Link to="/login" className="text-[hsl(var(--text-tertiary))] hover:text-primary transition-colors text-sm">
            ← Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}
