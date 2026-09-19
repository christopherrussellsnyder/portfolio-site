import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Lock, Eye, EyeOff, Check, X } from 'lucide-react';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const passwordRequirements = [
    { label: 'At least 8 characters', met: password.length >= 8 },
    { label: 'Include uppercase letter', met: /[A-Z]/.test(password) },
    { label: 'Include lowercase letter', met: /[a-z]/.test(password) },
    { label: 'Include number', met: /[0-9]/.test(password) },
  ];

  const allRequirementsMet = passwordRequirements.every((req) => req.met);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast({
        title: 'Error',
        description: 'Passwords do not match',
        variant: 'destructive',
      });
      return;
    }

    if (!allRequirementsMet) {
      toast({
        title: 'Error',
        description: 'Please meet all password requirements',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Password updated successfully!',
      });
      navigate('/ai-strategist');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to reset password',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="bg-card border border-border rounded-xl p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-2xl font-bold text-foreground">
              Create new password
            </h2>
            <p className="text-muted-foreground mt-2">
              Choose a strong password for your account
            </p>
          </div>

          <form onSubmit={handleReset} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="password">New password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Enter new password"
                  className="bg-background pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm password</Label>
              <Input
                id="confirmPassword"
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                placeholder="Confirm new password"
                className="bg-background"
              />
            </div>

            <div className="bg-muted/50 rounded-lg p-4">
              <p className="text-sm font-medium text-foreground mb-2">
                Password requirements:
              </p>
              <ul className="space-y-1">
                {passwordRequirements.map((req, index) => (
                  <li
                    key={index}
                    className={`text-sm flex items-center gap-2 ${
                      req.met ? 'text-green-500' : 'text-muted-foreground'
                    }`}
                  >
                    {req.met ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <X className="w-4 h-4" />
                    )}
                    {req.label}
                  </li>
                ))}
              </ul>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={loading || !allRequirementsMet}
            >
              {loading ? 'Updating...' : 'Reset password'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
