import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { Loader2, ShieldCheck, ShieldAlert } from 'lucide-react';

interface Factor {
  id: string;
  status: string;
  friendly_name?: string | null;
}

export function TwoFactorSection() {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [factors, setFactors] = useState<Factor[]>([]);
  const [enrolling, setEnrolling] = useState<{ id: string; qr: string; secret: string } | null>(null);
  const [code, setCode] = useState('');

  const verified = factors.filter((f) => f.status === 'verified');

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.auth.mfa.listFactors();
    if (!error) setFactors(((data?.all ?? []) as Factor[]).filter((f) => !!f.id));
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const startEnroll = async () => {
    setBusy(true);
    try {
      // Clean up any abandoned unverified factors first.
      for (const f of factors.filter((x) => x.status !== 'verified')) {
        await supabase.auth.mfa.unenroll({ factorId: f.id });
      }
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: `Authenticator ${new Date().toISOString().slice(0, 10)}`,
      });
      if (error) throw error;
      setEnrolling({ id: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
    } catch (e: any) {
      toast({ title: 'Could not start 2FA setup', description: e.message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const confirmEnroll = async () => {
    if (!enrolling || code.trim().length < 6) return;
    setBusy(true);
    try {
      const { data: ch, error: chErr } = await supabase.auth.mfa.challenge({ factorId: enrolling.id });
      if (chErr) throw chErr;
      const { error } = await supabase.auth.mfa.verify({
        factorId: enrolling.id,
        challengeId: ch.id,
        code: code.trim(),
      });
      if (error) throw error;
      toast({ title: 'Two-factor authentication enabled' });
      setEnrolling(null);
      setCode('');
      await load();
    } catch (e: any) {
      toast({ title: 'Invalid code', description: e.message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const disable = async (factorId: string) => {
    setBusy(true);
    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId });
      if (error) throw error;
      toast({ title: 'Two-factor authentication disabled' });
      await load();
    } catch (e: any) {
      toast({ title: 'Could not disable 2FA', description: e.message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {verified.length > 0 ? (
            <ShieldCheck className="w-5 h-5 text-primary" />
          ) : (
            <ShieldAlert className="w-5 h-5 text-muted-foreground" />
          )}
          Two-Factor Authentication
        </CardTitle>
        <CardDescription>
          Add an authenticator app (Google Authenticator, 1Password, Authy) as a second step at sign-in.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        ) : verified.length > 0 ? (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              2FA is <span className="text-foreground font-medium">enabled</span> on this account.
            </p>
            <Button variant="outline" disabled={busy} onClick={() => disable(verified[0].id)}>
              Disable
            </Button>
          </div>
        ) : enrolling ? (
          <div className="space-y-4">
            <img
              src={enrolling.qr}
              alt="QR code for setting up two-factor authentication"
              className="w-44 h-44 rounded-lg bg-white p-2"
            />
            <p className="text-xs text-muted-foreground break-all">
              Can't scan? Enter this key manually: <span className="text-foreground">{enrolling.secret}</span>
            </p>
            <div className="space-y-2 max-w-xs">
              <Label htmlFor="totp-code">6-digit code</Label>
              <Input
                id="totp-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                placeholder="123456"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={confirmEnroll} disabled={busy || code.length < 6}>
                {busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Verify & enable
              </Button>
              <Button variant="ghost" onClick={() => setEnrolling(null)} disabled={busy}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">2FA is not enabled.</p>
            <Button onClick={startEnroll} disabled={busy}>
              {busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Enable 2FA
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
