import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Plus, Trash2, Loader2, Tag, Calendar } from 'lucide-react';

interface Promotion {
  id?: string;
  name: string;
  promo_type: string;
  offer_details: string;
  discount_value: string;
  promo_code: string;
  start_date: string;
  end_date: string;
  platforms: string[];
  target_products: string;
  cta_url: string;
  priority: string;
  notes: string;
  is_active: boolean;
}

const empty = (): Promotion => ({
  name: '',
  promo_type: 'discount',
  offer_details: '',
  discount_value: '',
  promo_code: '',
  start_date: new Date().toISOString().split('T')[0],
  end_date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
  platforms: [],
  target_products: '',
  cta_url: '',
  priority: 'normal',
  notes: '',
  is_active: true,
});

const PROMO_TYPES = ['discount', 'sale', 'bogo', 'free_shipping', 'bundle', 'limited_time_offer', 'flash_sale', 'seasonal', 'launch', 'giveaway', 'other'];
const PLATFORMS = ['Instagram', 'Facebook', 'TikTok', 'LinkedIn', 'Twitter/X', 'YouTube', 'Google Ads', 'Email'];

export const PromotionsSection: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [promos, setPromos] = useState<Promotion[]>([]);
  const [draft, setDraft] = useState<Promotion>(empty());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data, error } = await supabase
        .from('business_promotions')
        .select('*')
        .eq('user_id', user.id)
        .order('start_date', { ascending: false });
      if (!error && data) {
        setPromos(data.map((d: any) => ({ ...d, platforms: Array.isArray(d.platforms) ? d.platforms : [] })));
      }
      setLoading(false);
    })();
  }, [user]);

  const addPromo = async () => {
    if (!user) return;
    if (!draft.name.trim() || !draft.offer_details.trim()) {
      toast({ title: 'Missing info', description: 'Name and offer details are required.', variant: 'destructive' });
      return;
    }
    if (new Date(draft.end_date) < new Date(draft.start_date)) {
      toast({ title: 'Invalid dates', description: 'End date must be after start date.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const { data, error } = await supabase
      .from('business_promotions')
      .insert({ ...draft, user_id: user.id })
      .select()
      .single();
    setSaving(false);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }
    setPromos([{ ...(data as any), platforms: (data as any).platforms || [] }, ...promos]);
    setDraft(empty());
    toast({ title: 'Promotion added', description: 'It will be factored into your next strategy generation.' });
  };

  const removePromo = async (id?: string) => {
    if (!id) return;
    const { error } = await supabase.from('business_promotions').delete().eq('id', id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }
    setPromos(promos.filter(p => p.id !== id));
  };

  const togglePlatform = (platform: string, target: 'draft' | string) => {
    if (target === 'draft') {
      setDraft(prev => ({
        ...prev,
        platforms: prev.platforms.includes(platform) ? prev.platforms.filter(p => p !== platform) : [...prev.platforms, platform],
      }));
    }
  };

  const toggleActive = async (promo: Promotion) => {
    if (!promo.id) return;
    const newVal = !promo.is_active;
    await supabase.from('business_promotions').update({ is_active: newVal }).eq('id', promo.id);
    setPromos(promos.map(p => p.id === promo.id ? { ...p, is_active: newVal } : p));
  };

  if (loading) return <div className="py-8 flex justify-center"><Loader2 className="w-5 h-5 animate-spin" /></div>;

  return (
    <div className="space-y-6 pt-4">
      <div className="text-sm text-muted-foreground">
        Active and upcoming promotions falling within a strategy's date range are automatically injected into strategy generation — the AI will plan promo-specific posts, urgency CTAs, and timing around your offers.
      </div>

      {/* Existing promos */}
      {promos.length > 0 && (
        <div className="space-y-2">
          <Label className="text-xs uppercase text-muted-foreground">Your Promotions ({promos.length})</Label>
          {promos.map(promo => {
            const now = new Date();
            const start = new Date(promo.start_date);
            const end = new Date(promo.end_date);
            const status = !promo.is_active ? 'inactive' : end < now ? 'expired' : start > now ? 'upcoming' : 'active';
            const statusColor = { active: 'bg-green-500/20 text-green-400', upcoming: 'bg-blue-500/20 text-blue-400', expired: 'bg-muted text-muted-foreground', inactive: 'bg-muted text-muted-foreground' }[status];
            return (
              <Card key={promo.id} className="p-3 flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Tag className="w-3.5 h-3.5 text-primary" />
                    <span className="font-medium text-sm">{promo.name}</span>
                    <Badge variant="outline" className="text-xs">{promo.promo_type.replace(/_/g, ' ')}</Badge>
                    <Badge className={`text-xs ${statusColor}`}>{status}</Badge>
                    {promo.discount_value && <Badge variant="secondary" className="text-xs">{promo.discount_value}</Badge>}
                    {promo.promo_code && <Badge variant="secondary" className="text-xs">code: {promo.promo_code}</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{promo.offer_details}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                    <Calendar className="w-3 h-3" />
                    {promo.start_date} → {promo.end_date}
                    {promo.platforms?.length > 0 && <span>· {promo.platforms.join(', ')}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={promo.is_active} onCheckedChange={() => toggleActive(promo)} />
                  <Button aria-label="Delete promotion" variant="ghost" size="icon" onClick={() => removePromo(promo.id)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add new */}
      <Card className="p-4 space-y-4 border-dashed">
        <Label className="text-xs uppercase text-muted-foreground">Add Promotion</Label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Promo Name *</Label>
            <Input value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} placeholder="Summer Sale 2026" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Type</Label>
            <Select value={draft.promo_type} onValueChange={v => setDraft({ ...draft, promo_type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PROMO_TYPES.map(t => <SelectItem key={t} value={t}>{t.replace(/_/g, ' ')}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label className="text-xs">Offer Details *</Label>
            <Textarea value={draft.offer_details} maxLength={500} rows={2} onChange={e => setDraft({ ...draft, offer_details: e.target.value })} placeholder="20% off all annual subscriptions for new customers" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Discount Value</Label>
            <Input value={draft.discount_value} onChange={e => setDraft({ ...draft, discount_value: e.target.value })} placeholder="20% off, $50, BOGO" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Promo Code</Label>
            <Input value={draft.promo_code} onChange={e => setDraft({ ...draft, promo_code: e.target.value })} placeholder="SUMMER20" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Start Date *</Label>
            <Input type="date" value={draft.start_date} onChange={e => setDraft({ ...draft, start_date: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">End Date *</Label>
            <Input type="date" value={draft.end_date} onChange={e => setDraft({ ...draft, end_date: e.target.value })} />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label className="text-xs">Target Products / Audience (optional)</Label>
            <Input value={draft.target_products} onChange={e => setDraft({ ...draft, target_products: e.target.value })} placeholder="Pro plan, returning customers, etc." />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Landing URL (optional)</Label>
            <Input value={draft.cta_url} onChange={e => setDraft({ ...draft, cta_url: e.target.value })} placeholder="https://..." />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Priority</Label>
            <Select value={draft.priority} onValueChange={v => setDraft({ ...draft, priority: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="high">High — heavily feature in strategies</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label className="text-xs">Platforms to feature on (leave empty for all)</Label>
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map(p => (
                <Badge
                  key={p}
                  variant={draft.platforms.includes(p) ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => togglePlatform(p, 'draft')}
                >
                  {p}
                </Badge>
              ))}
            </div>
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label className="text-xs">Notes for the AI (optional)</Label>
            <Textarea value={draft.notes} maxLength={300} rows={2} onChange={e => setDraft({ ...draft, notes: e.target.value })} placeholder="Lead with urgency in week 2, hold a teaser the first 3 days, etc." />
          </div>
        </div>
        <Button onClick={addPromo} disabled={saving} className="w-full">
          {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
          Add Promotion
        </Button>
      </Card>
    </div>
  );
};
