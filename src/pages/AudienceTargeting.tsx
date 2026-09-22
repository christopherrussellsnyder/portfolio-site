import { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowLeft, Users, RefreshCw, Loader2, Copy, Check, Settings2,
  Facebook, Linkedin, Twitter, Music2, Compass,
} from 'lucide-react';

import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { UpgradeModal } from '@/components/UpgradeModal';
import { toast } from '@/hooks/use-toast';
import { DataSourceBadge } from '@/components/DataSourceBadge';

interface FbIgTargeting {
  detailed_targeting?: { interests?: string[]; behaviors?: string[]; demographics?: string[] };
  age_range?: { min: number; max: number };
  locations?: string[];
  custom_audiences?: string[];
  lookalike_suggestions?: string[];
  targeting_string?: string;
}
interface LinkedInTargeting {
  job_titles?: string[];
  industries?: string[];
  company_sizes?: string[];
  seniority_levels?: string[];
  skills?: string[];
  groups?: string[];
  targeting_string?: string;
}
interface TwitterTargeting {
  keywords?: string[];
  hashtags?: string[];
  interests?: string[];
  follower_lookalikes?: string[];
  conversation_topics?: string[];
  targeting_string?: string;
}
interface TikTokTargeting {
  content_categories?: string[];
  hashtag_strategy?: string[];
  trending_topics?: string[];
  creator_types?: string[];
  targeting_string?: string;
}
interface OverallStrategy {
  primary_platform?: string;
  secondary_platforms?: string[];
  budget_allocation?: Record<string, string>;
  key_insights?: string[];
  testing_recommendations?: string[];
}
interface Recommendations {
  facebook_instagram?: FbIgTargeting;
  linkedin?: LinkedInTargeting;
  twitter?: TwitterTargeting;
  tiktok?: TikTokTargeting;
  overall_strategy?: OverallStrategy;
}

interface BusinessProfile {
  business_name: string;
  industry: string;
  niche: string;
  target_age_min: number;
  target_age_max: number;
  target_genders: string[];
  target_locations: string[];
  target_interests: string[];
  business_goals: string[];
  average_order_value: number;
  price_point: string;
  products_services: string;
  unique_selling_points: string[];
  competitor_names: string[];
}

function asStringArray(v: unknown): string[] {
  if (Array.isArray(v)) return v.filter((x): x is string => typeof x === 'string');
  if (typeof v === 'string' && v.trim()) return v.split(',').map((s) => s.trim()).filter(Boolean);
  return [];
}

function ChipList({ items }: { items?: string[] }) {
  if (!items?.length) return <p className="text-xs text-muted-foreground">None suggested.</p>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item, i) => (
        <Badge key={i} variant="secondary" className="text-[11px]">{item}</Badge>
      ))}
    </div>
  );
}

function TargetingStringRow({ value }: { value?: string }) {
  const [copied, setCopied] = useState(false);
  if (!value) return null;
  return (
    <div className="flex items-start gap-2 p-2.5 rounded-md bg-muted/30 border border-border/60">
      <p className="text-xs text-foreground flex-1">{value}</p>
      <Button
        variant="ghost"
        size="sm"
        className="h-6 px-2 shrink-0"
        onClick={() => {
          navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }}
      >
        {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
      </Button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">{label}</p>
      {children}
    </div>
  );
}

export default function AudienceTargeting() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isPro } = useSubscription();
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendations | null>(null);
  const [intelSources, setIntelSources] = useState<string[]>([]);
  const [lastGenerated, setLastGenerated] = useState<string | null>(null);
  const [profileIncomplete, setProfileIncomplete] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      const [settingsRes, infoRes, insightsRes] = await Promise.all([
        supabase.from('user_business_settings').select('*').eq('user_id', user.id).maybeSingle(),
        supabase.from('business_information').select('*').eq('user_id', user.id).maybeSingle(),
        supabase.from('audience_insights').select('*').eq('user_id', user.id).eq('insight_type', 'targeting_recommendation'),
      ]);
      if (cancelled) return;

      const settings = settingsRes.data;
      const info = infoRes.data;

      const genderDist = (info?.gender_distribution as { male?: number; female?: number } | null) || {};
      const targetGenders: string[] = [];
      if ((genderDist.male ?? 0) > 0) targetGenders.push('male');
      if ((genderDist.female ?? 0) > 0) targetGenders.push('female');

      const topCompetitors = Array.isArray(info?.top_competitors)
        ? (info!.top_competitors as unknown[]).map((c) => (typeof c === 'string' ? c : (c as { name?: string })?.name)).filter((n): n is string => !!n)
        : [];

      const built: BusinessProfile = {
        business_name: settings?.business_name || info?.business_name || '',
        industry: settings?.industry || info?.industry || '',
        niche: settings?.industry || info?.industry || '',
        target_age_min: info?.target_age_min ?? 18,
        target_age_max: info?.target_age_max ?? 65,
        target_genders: targetGenders.length ? targetGenders : ['all'],
        target_locations: Array.from(new Set([
          ...asStringArray(settings?.geographic_focus),
          ...asStringArray(info?.geographic_focus),
        ])),
        target_interests: [],
        business_goals: asStringArray(settings?.marketing_goals),
        average_order_value: 0,
        price_point: settings?.price_range || '',
        products_services: asStringArray(settings?.products_services).join(', ') || info?.primary_products_services || '',
        unique_selling_points: [settings?.unique_value_proposition || info?.unique_value_proposition, info?.competitive_advantage]
          .filter((s): s is string => !!s),
        competitor_names: asStringArray(settings?.competitors).length ? asStringArray(settings?.competitors) : topCompetitors,
      };
      setProfile(built);
      setProfileIncomplete(!built.industry || !built.products_services);

      // Reconstruct the last-generated recommendations from persisted per-platform
      // rows so a page revisit doesn't cost a fresh AI call. overall_strategy isn't
      // persisted per-platform, so it's only present right after a fresh generate.
      const rows = insightsRes.data || [];
      if (rows.length) {
        const byPlatform: Record<string, unknown> = {};
        let latest = '';
        for (const row of rows) {
          byPlatform[row.platform] = row.targeting_parameters;
          if (row.analysis_date && row.analysis_date > latest) latest = row.analysis_date;
        }
        setRecommendations({
          facebook_instagram: byPlatform.facebook as FbIgTargeting,
          linkedin: byPlatform.linkedin as LinkedInTargeting,
          twitter: byPlatform.twitter as TwitterTargeting,
          tiktok: byPlatform.tiktok as TikTokTargeting,
        });
        setLastGenerated(latest || null);
      }

      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const generate = async () => {
    if (!profile) return;
    if (!isPro) {
      setShowUpgrade(true);
      return;
    }
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-audience-targeting', {
        body: { businessProfile: profile },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setRecommendations(data.recommendations);
      setIntelSources(data.intel_sources || []);
      setLastGenerated(new Date().toISOString());
      toast({ title: 'Targeting recommendations updated' });
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Try again in a moment.';
      toast({ title: 'Could not generate recommendations', description: message, variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  };

  const fb = recommendations?.facebook_instagram;
  const li = recommendations?.linkedin;
  const tw = recommendations?.twitter;
  const tt = recommendations?.tiktok;
  const strategy = recommendations?.overall_strategy;

  const profileSummary = useMemo(() => {
    if (!profile) return '';
    const parts = [
      profile.industry,
      profile.target_locations.length ? profile.target_locations.join(', ') : null,
      `age ${profile.target_age_min}-${profile.target_age_max}`,
      profile.competitor_names.length ? `vs. ${profile.competitor_names.slice(0, 3).join(', ')}` : null,
    ].filter(Boolean);
    return parts.join(' · ');
  }, [profile]);

  return (
    <>
      <UpgradeModal open={showUpgrade} onClose={() => setShowUpgrade(false)} />
      <Helmet>
        <title>Audience Targeting | Korex Intelligence</title>
        <meta
          name="description"
          content="Platform-specific audience targeting recommendations grounded in real search demand, competitor ad recon and customer language."
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
                <Users className="w-4 h-4 text-primary" />
                <h1 className="text-xl font-semibold tracking-tight">Audience Targeting</h1>
              </div>
              {intelSources.length > 0 ? (
                <DataSourceBadge type="real_api" />
              ) : (
                <DataSourceBadge type="ai_estimated" />
              )}
            </div>
            <Button size="sm" onClick={generate} disabled={loading || generating || !profile} className="gap-1.5">
              {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              {recommendations ? 'Regenerate' : 'Generate recommendations'}
            </Button>
          </div>
        </header>

        <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
          {loading ? (
            <div className="space-y-4" aria-busy="true" aria-label="Loading audience targeting">
              <Skeleton className="h-20 rounded-md" />
              <Skeleton className="h-64 rounded-md" />
            </div>
          ) : (
            <>
              <Card className="bg-card border-border">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {profile?.business_name || 'Your business'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {profileSummary || 'Add your business profile in Settings for better recommendations.'}
                      </p>
                      {lastGenerated && (
                        <p className="text-[10px] text-muted-foreground mt-1">
                          Last generated {new Date(lastGenerated).toLocaleDateString()}
                          {intelSources.length > 0 && ` · grounded in ${intelSources.join(', ')}`}
                        </p>
                      )}
                    </div>
                    <Button variant="outline" size="sm" onClick={() => navigate('/settings')} className="gap-1.5 shrink-0">
                      <Settings2 className="w-3.5 h-3.5" />
                      Edit business profile
                    </Button>
                  </div>
                  {profileIncomplete && (
                    <p className="text-xs text-amber-500 mt-2">
                      Your business profile is missing industry or products/services — recommendations will be generic until you fill these in.
                    </p>
                  )}
                </CardContent>
              </Card>

              {!recommendations ? (
                <Card className="bg-card border-border">
                  <CardContent className="p-10 text-center text-sm text-muted-foreground">
                    <Compass className="w-8 h-8 mx-auto mb-3 opacity-50" />
                    No targeting recommendations yet. Generate them from your business profile above.
                  </CardContent>
                </Card>
              ) : (
                <Tabs defaultValue="facebook" className="w-full">
                  <TabsList className="bg-background border border-card flex-wrap h-auto">
                    <TabsTrigger value="facebook" className="text-xs gap-1.5">
                      <Facebook className="w-3.5 h-3.5" /> Facebook/Instagram
                    </TabsTrigger>
                    <TabsTrigger value="linkedin" className="text-xs gap-1.5">
                      <Linkedin className="w-3.5 h-3.5" /> LinkedIn
                    </TabsTrigger>
                    <TabsTrigger value="twitter" className="text-xs gap-1.5">
                      <Twitter className="w-3.5 h-3.5" /> Twitter
                    </TabsTrigger>
                    <TabsTrigger value="tiktok" className="text-xs gap-1.5">
                      <Music2 className="w-3.5 h-3.5" /> TikTok
                    </TabsTrigger>
                    {strategy && (
                      <TabsTrigger value="strategy" className="text-xs gap-1.5">
                        <Compass className="w-3.5 h-3.5" /> Strategy
                      </TabsTrigger>
                    )}
                  </TabsList>

                  <TabsContent value="facebook" className="mt-4">
                    <Card className="bg-card border-border">
                      <CardContent className="p-4 space-y-4">
                        <TargetingStringRow value={fb?.targeting_string} />
                        <div className="grid sm:grid-cols-2 gap-4">
                          <Field label="Interests"><ChipList items={fb?.detailed_targeting?.interests} /></Field>
                          <Field label="Behaviors"><ChipList items={fb?.detailed_targeting?.behaviors} /></Field>
                          <Field label="Demographics"><ChipList items={fb?.detailed_targeting?.demographics} /></Field>
                          <Field label="Locations"><ChipList items={fb?.locations} /></Field>
                          <Field label="Custom audiences"><ChipList items={fb?.custom_audiences} /></Field>
                          <Field label="Lookalike suggestions"><ChipList items={fb?.lookalike_suggestions} /></Field>
                        </div>
                        {fb?.age_range && (
                          <p className="text-xs text-muted-foreground">Age range: {fb.age_range.min}–{fb.age_range.max}</p>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="linkedin" className="mt-4">
                    <Card className="bg-card border-border">
                      <CardContent className="p-4 space-y-4">
                        <TargetingStringRow value={li?.targeting_string} />
                        <div className="grid sm:grid-cols-2 gap-4">
                          <Field label="Job titles"><ChipList items={li?.job_titles} /></Field>
                          <Field label="Industries"><ChipList items={li?.industries} /></Field>
                          <Field label="Company sizes"><ChipList items={li?.company_sizes} /></Field>
                          <Field label="Seniority levels"><ChipList items={li?.seniority_levels} /></Field>
                          <Field label="Skills"><ChipList items={li?.skills} /></Field>
                          <Field label="Groups"><ChipList items={li?.groups} /></Field>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="twitter" className="mt-4">
                    <Card className="bg-card border-border">
                      <CardContent className="p-4 space-y-4">
                        <TargetingStringRow value={tw?.targeting_string} />
                        <div className="grid sm:grid-cols-2 gap-4">
                          <Field label="Keywords"><ChipList items={tw?.keywords} /></Field>
                          <Field label="Hashtags"><ChipList items={tw?.hashtags} /></Field>
                          <Field label="Interests"><ChipList items={tw?.interests} /></Field>
                          <Field label="Follower lookalikes"><ChipList items={tw?.follower_lookalikes} /></Field>
                          <Field label="Conversation topics"><ChipList items={tw?.conversation_topics} /></Field>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="tiktok" className="mt-4">
                    <Card className="bg-card border-border">
                      <CardContent className="p-4 space-y-4">
                        <TargetingStringRow value={tt?.targeting_string} />
                        <div className="grid sm:grid-cols-2 gap-4">
                          <Field label="Content categories"><ChipList items={tt?.content_categories} /></Field>
                          <Field label="Hashtag strategy"><ChipList items={tt?.hashtag_strategy} /></Field>
                          <Field label="Trending topics"><ChipList items={tt?.trending_topics} /></Field>
                          <Field label="Creator types"><ChipList items={tt?.creator_types} /></Field>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {strategy && (
                    <TabsContent value="strategy" className="mt-4">
                      <Card className="bg-card border-border">
                        <CardContent className="p-4 space-y-4">
                          <div className="flex items-center gap-2 flex-wrap">
                            {strategy.primary_platform && (
                              <Badge className="text-xs">Primary: {strategy.primary_platform}</Badge>
                            )}
                            {strategy.secondary_platforms?.map((p, i) => (
                              <Badge key={i} variant="outline" className="text-xs">{p}</Badge>
                            ))}
                          </div>
                          {strategy.budget_allocation && (
                            <Field label="Budget allocation">
                              <div className="flex flex-wrap gap-2">
                                {Object.entries(strategy.budget_allocation).map(([platform, pct]) => (
                                  <Badge key={platform} variant="secondary" className="text-[11px]">{platform}: {pct}</Badge>
                                ))}
                              </div>
                            </Field>
                          )}
                          {strategy.key_insights && strategy.key_insights.length > 0 && (
                            <Field label="Key insights">
                              <ul className="space-y-1">
                                {strategy.key_insights.map((insight, i) => (
                                  <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                                    <span className="text-primary">•</span> {insight}
                                  </li>
                                ))}
                              </ul>
                            </Field>
                          )}
                          {strategy.testing_recommendations && strategy.testing_recommendations.length > 0 && (
                            <Field label="Testing recommendations">
                              <ul className="space-y-1">
                                {strategy.testing_recommendations.map((rec, i) => (
                                  <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                                    <span className="text-primary">•</span> {rec}
                                  </li>
                                ))}
                              </ul>
                            </Field>
                          )}
                        </CardContent>
                      </Card>
                    </TabsContent>
                  )}
                </Tabs>
              )}
            </>
          )}
        </main>
      </div>
    </>
  );
}
