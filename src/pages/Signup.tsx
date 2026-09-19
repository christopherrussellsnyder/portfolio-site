import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { KorexLogoLockup } from '@/components/branding/KorexLogoLockup';

const getPasswordStrength = (password: string): { label: string; color: string; width: string } => {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 2) return { label: 'Weak', color: 'bg-red-500', width: 'w-1/3' };
  if (score <= 3) return { label: 'Moderate', color: 'bg-yellow-500', width: 'w-2/3' };
  return { label: 'Strong', color: 'bg-green-500', width: 'w-full' };
};

export default function Signup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showVerification, setShowVerification] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(false);
  const navigate = useNavigate();

  const strength = getPasswordStrength(password);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast({ title: 'Passwords do not match', description: 'Please make sure both passwords are identical', variant: 'destructive' });
      return;
    }

    if (password.length < 8) {
      toast({ title: 'Password too short', description: 'Password must be at least 8 characters', variant: 'destructive' });
      return;
    }

    if (!/[0-9]/.test(password)) {
      toast({ title: 'Password too weak', description: 'Password must contain at least 1 number', variant: 'destructive' });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/confirm`,
        },
      });

      if (error) throw error;

      setShowVerification(true);
    } catch (error: any) {
      if (import.meta.env.DEV) console.error('Signup error:', error);
      toast({ title: 'Signup failed', description: 'Something went wrong. Please try again.', variant: 'destructive' });
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      const { error } = await supabase.auth.resend({ type: 'signup', email: email.trim() });
      if (error) throw error;
      toast({ title: 'Email resent!', description: 'Check your inbox for the verification link.' });
      setResendCooldown(true);
      setTimeout(() => setResendCooldown(false), 60000);
    } catch {
      toast({ title: 'Failed to resend', description: 'Something went wrong. Please try again.', variant: 'destructive' });
    } finally {
      setResending(false);
    }
  };

  if (showVerification) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <KorexLogoLockup height={56} className="mx-auto mb-10" />
          <div className="card-glass rounded-2xl p-8">
            <h1 className="text-2xl font-bold mb-2">Verify Your Email Address</h1>
            <p className="text-muted-foreground mb-2">
              We've sent a verification link to <strong className="text-foreground">{email}</strong>.
            </p>
            <p className="text-muted-foreground text-sm mb-6">Click the link in the email to activate your account.</p>
            <p className="text-muted-foreground text-xs mb-4">Didn't receive it? Check your spam folder or click below to resend.</p>
            <button onClick={handleResend} disabled={resending || resendCooldown}
              className="w-full bg-primary text-primary-foreground font-semibold py-3 rounded-lg hover:bg-korex-red-light transition-colors disabled:opacity-50 shadow-glow mb-4">
              {resendCooldown ? 'Email resent!' : resending ? 'Resending...' : 'Resend Verification Email'}
            </button>
            <Link to="/login" className="text-primary hover:text-korex-red-light font-medium text-sm transition-colors">
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center justify-center mb-8">
          <KorexLogoLockup height={56} showTagline={false} className="mb-2" />
        </div>

        <div className="card-glass rounded-2xl p-8">
          <h1 className="text-2xl font-bold mb-2 text-foreground">Create your account</h1>
          <p className="text-muted-foreground mb-6">Start free — no credit card required</p>

          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-muted-foreground mb-2">Email</label>
              <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                className="w-full bg-secondary border border-border rounded-lg px-4 py-3 text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary focus:shadow-glow transition-all"
                placeholder="you@example.com" />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-muted-foreground mb-2">Password</label>
              <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8}
                className="w-full bg-secondary border border-border rounded-lg px-4 py-3 text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary focus:shadow-glow transition-all"
                placeholder="At least 8 characters with 1 number" />
              {password.length > 0 && (
                <div className="mt-2">
                  <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                    <div className={`h-full ${strength.color} ${strength.width} transition-all duration-300 rounded-full`} />
                  </div>
                  <p className={`text-xs mt-1 ${strength.color === 'bg-red-500' ? 'text-red-500' : strength.color === 'bg-yellow-500' ? 'text-yellow-500' : 'text-green-500'}`}>
                    {strength.label}
                  </p>
                </div>
              )}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-muted-foreground mb-2">Confirm Password</label>
              <input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={8}
                className="w-full bg-secondary border border-border rounded-lg px-4 py-3 text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary focus:shadow-glow transition-all"
                placeholder="Confirm your password" />
            </div>

            <button type="submit" disabled={loading}
              className="w-full bg-primary text-primary-foreground font-semibold py-3 rounded-lg hover:bg-korex-red-light transition-colors disabled:opacity-50 shadow-glow">
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-muted-foreground text-sm mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-primary hover:text-korex-red-light font-medium transition-colors">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
