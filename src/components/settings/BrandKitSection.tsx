import React, { useEffect, useState } from 'react';
import { Palette, Save, Upload, Lock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface BrandKit {
  workspace_id: string;
  logo_url: string | null;
  primary_color: string;
  accent_color: string;
  company_name: string | null;
  tagline: string | null;
  contact_email: string | null;
  contact_website: string | null;
  footer_note: string | null;
}

const FOUNDER_EMAIL = 'chrissnyder3456@gmail.com';

export function BrandKitSection() {
  const { activeWorkspace } = useWorkspace();
  const { tier, subscribed } = useSubscription();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [kit, setKit] = useState<BrandKit | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const isFounder = user?.email?.toLowerCase() === FOUNDER_EMAIL;
  const isAgency = isFounder || (subscribed && tier === 'agency');

  useEffect(() => {
    if (!activeWorkspace?.id || !isAgency) { setLoading(false); return; }
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from('brand_kits')
        .select('*')
        .eq('workspace_id', activeWorkspace.id)
        .maybeSingle();
      setKit(
        (data as any) ?? {
          workspace_id: activeWorkspace.id,
          logo_url: null,
          primary_color: 'hsl(var(--primary))',
          accent_color: 'hsl(var(--muted))',
          company_name: activeWorkspace.name,
          tagline: null,
          contact_email: null,
          contact_website: null,
          footer_note: null,
        }
      );
      setLoading(false);
    })();
  }, [activeWorkspace?.id, isAgency]);

  const save = async () => {
    if (!kit || !activeWorkspace) return;
    setSaving(true);
    const { error } = await supabase
      .from('brand_kits')
      .upsert({ ...kit, workspace_id: activeWorkspace.id }, { onConflict: 'workspace_id' });
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success('Brand kit saved');
  };

  const uploadLogo = async (file: File) => {
    if (!activeWorkspace) return;
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `brand-kits/${activeWorkspace.id}/logo-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('media').upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from('media').getPublicUrl(path);
      setKit((k) => (k ? { ...k, logo_url: data.publicUrl } : k));
      toast.success('Logo uploaded');
    } catch (e: any) {
      toast.error(e?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  if (!isAgency) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-foreground mb-1">Brand Kit</h2>
          <p className="text-sm text-muted-foreground">White-label your client reports with your logo, colors, and contact info.</p>
        </div>
        <Card className="bg-card border-border">
          <CardContent className="p-8 text-center space-y-4">
            <Lock className="h-10 w-10 mx-auto text-primary" />
            <div>
              <h3 className="text-lg font-semibold">Agency-tier feature</h3>
              <p className="text-sm text-muted-foreground">Upgrade to Agency to brand your client reports.</p>
            </div>
            <Button onClick={() => navigate('/pricing')} className="bg-primary hover:bg-[hsl(var(--primary-dark))]">Upgrade to Agency</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading || !kit) {
    return <div className="text-sm text-muted-foreground">Loading brand kit…</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground mb-1">Brand Kit</h2>
        <p className="text-sm text-muted-foreground">
          Applied to shared client reports for <strong>{activeWorkspace?.name}</strong>.
        </p>
      </div>

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Palette className="h-4 w-4 text-primary" /> Identity</CardTitle>
          <CardDescription>Logo, colors, and company info shown on reports.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            {kit.logo_url ? (
              <img src={kit.logo_url} alt="Logo" className="h-16 w-auto object-contain bg-white rounded p-2" />
            ) : (
              <div className="h-16 w-16 rounded bg-muted border border-border flex items-center justify-center text-xs text-muted-foreground">No logo</div>
            )}
            <div>
              <input
                id="logo-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadLogo(f); }}
              />
              <label htmlFor="logo-upload">
                <Button asChild variant="outline" disabled={uploading}>
                  <span className="cursor-pointer"><Upload className="h-4 w-4 mr-2" />{uploading ? 'Uploading…' : 'Upload logo'}</span>
                </Button>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="primary">Primary color</Label>
              <div className="flex gap-2">
                <Input id="primary" type="color" value={kit.primary_color} onChange={(e) => setKit({ ...kit, primary_color: e.target.value })} className="w-16 h-10 p-1" />
                <Input value={kit.primary_color} onChange={(e) => setKit({ ...kit, primary_color: e.target.value })} />
              </div>
            </div>
            <div>
              <Label htmlFor="accent">Accent / header color</Label>
              <div className="flex gap-2">
                <Input id="accent" type="color" value={kit.accent_color} onChange={(e) => setKit({ ...kit, accent_color: e.target.value })} className="w-16 h-10 p-1" />
                <Input value={kit.accent_color} onChange={(e) => setKit({ ...kit, accent_color: e.target.value })} />
              </div>
            </div>
          </div>

          <div>
            <Label htmlFor="company">Company name</Label>
            <Input id="company" value={kit.company_name ?? ''} onChange={(e) => setKit({ ...kit, company_name: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="tagline">Tagline</Label>
            <Input id="tagline" value={kit.tagline ?? ''} onChange={(e) => setKit({ ...kit, tagline: e.target.value })} placeholder="e.g. Growth partner for modern brands" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="email">Contact email</Label>
              <Input id="email" type="email" value={kit.contact_email ?? ''} onChange={(e) => setKit({ ...kit, contact_email: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="website">Contact website</Label>
              <Input id="website" value={kit.contact_website ?? ''} onChange={(e) => setKit({ ...kit, contact_website: e.target.value })} placeholder="https://…" />
            </div>
          </div>
          <div>
            <Label htmlFor="footer">Footer note</Label>
            <Textarea id="footer" rows={2} value={kit.footer_note ?? ''} onChange={(e) => setKit({ ...kit, footer_note: e.target.value })} placeholder="Prepared by …" />
          </div>

          <Button onClick={save} disabled={saving} className="bg-primary hover:bg-[hsl(var(--primary-dark))]">
            <Save className="h-4 w-4 mr-2" /> {saving ? 'Saving…' : 'Save brand kit'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
