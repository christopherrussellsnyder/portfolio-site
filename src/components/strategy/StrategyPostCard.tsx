import React, { useState } from 'react';
import { 
  Copy, Edit, Sparkles, Clock, Eye, Heart, Hash, 
  ChevronDown, ChevronUp, Check, Image, Video, 
  FileText, Layout, MessageCircle, Share2, Bookmark,
  Lightbulb, Target, Palette, AlertCircle, Zap, ThumbsUp, Loader2, FlaskConical
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { StrategyPost } from '@/hooks/useStrategyGeneration';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { UpgradeModal } from '@/components/UpgradeModal';
import { useNavigate } from 'react-router-dom';
import {
  saveContentHandoff,
  aspectForPost,
  durationForPost,
  angleForTheme,
  platformForPost,
} from '@/lib/contentHandoff';

interface CaptionVariant {
  label: string;
  angle?: string;
  hook?: string;
  caption: string;
}

interface StrategyPostCardProps {
  post: StrategyPost;
  onEdit?: (post: StrategyPost) => void;
  onAskAI?: (post: StrategyPost) => void;
}

const getFunctionErrorMessage = async (error: any, fallback: string) => {
  const context = error?.context;
  if (context && typeof context.json === 'function') {
    try {
      const payload = await context.clone().json();
      return payload?.error || payload?.message || fallback;
    } catch (_) {
      // Fall through to the SDK message below.
    }
  }
  return error?.message || fallback;
};


const postTypeIcons: Record<string, React.ReactNode> = {
  carousel: <Layout className="w-4 h-4" />,
  reel: <Video className="w-4 h-4" />,
  single_image: <Image className="w-4 h-4" />,
  video: <Video className="w-4 h-4" />,
  story: <MessageCircle className="w-4 h-4" />,
  text: <FileText className="w-4 h-4" />,
};

const themeColors: Record<string, string> = {
  educational: '',
  promotional: '',
  engagement: '',
  social_proof: '',
  behind_scenes: '',
};

const confidenceColors: Record<string, string> = {
  High: 'text-foreground',
  Medium: 'text-muted-foreground',
  Low: 'text-muted-foreground',
};

export function StrategyPostCard({ post, onEdit, onAskAI }: StrategyPostCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [variants, setVariants] = useState<CaptionVariant[]>([]);
  const [activeCaption, setActiveCaption] = useState<string>(post.caption);
  const [loadingVariants, setLoadingVariants] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const { isPro } = useSubscription();
  const navigate = useNavigate();



  const generateVariants = async () => {
    if (!isPro) { setShowUpgrade(true); return; }
    setLoadingVariants(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-caption-variants', {
        body: {
          caption: activeCaption,
          hook: post.hook,
          platform: (post as any).platform,
          postType: post.post_type,
          theme: post.theme,
          contentCategory: post.content_category,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const v: CaptionVariant[] = data?.variants || [];
      if (!v.length) throw new Error('No variants returned');
      setVariants(v);
      toast({ title: 'A/B variants generated', description: 'Two alternative angles ready to compare.' });
    } catch (e: any) {
      toast({ title: 'Could not generate variants', description: e?.message || 'Try again in a moment.', variant: 'destructive' });
    } finally {
      setLoadingVariants(false);
    }
  };

  const useVariant = (v: CaptionVariant) => {
    setActiveCaption(v.caption);
    toast({ title: `${v.label} applied`, description: 'Caption swapped in for this post.' });
  };


  const copyToClipboard = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast({ title: 'Copied to clipboard!' });
    setTimeout(() => setCopiedField(null), 2000);
  };

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), 'EEE, MMM d');
    } catch {
      return dateStr;
    }
  };

  const formatTime = (timeStr: string | null) => {
    if (!timeStr) return '';
    try {
      const [hours, minutes] = timeStr.split(':');
      const hour = parseInt(hours);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const hour12 = hour % 12 || 12;
      return `${hour12}:${minutes} ${ampm}`;
    } catch {
      return timeStr;
    }
  };

  const hashtagsString = post.hashtags?.join(' ') || '';
  const visualGuidance = post.visual_guidance || {};
  const hashtagMix = post.hashtag_mix || {};
  const strategicRationale = post.strategic_rationale || {};
  const optimizationTips = post.optimization_tips || {};

  const vg: any = visualGuidance;
  const line = (label: string, value?: string | null) => (value ? `${label}: ${value}\n` : '');

  const imageBrief =
    `Day ${post.day_number} — ${post.theme || 'post'} (${post.post_type || 'single image'})\n` +
    line('Hook to visualise', post.hook) +
    line('Scene', vg.description) +
    line('Visual style', vg.visual_type) +
    line('Colour palette', vg.color_palette) +
    line('On-image text', vg.text_overlay) +
    line('Attention device', vg.attention_hook) +
    line('Emotion to convey', post.primary_emotion) +
    line('Content pillar', post.content_pillar) +
    line('CTA shown', post.cta) +
    `Caption this image supports: ${activeCaption}`;

  const videoBrief =
    `Day ${post.day_number} — ${post.theme || 'post'} video ad (${post.post_type || 'reel'})\n` +
    line('Opening line the presenter says', post.hook) +
    line('Core message', post.opening_text || post.body_text) +
    line('Emotion / tone', post.primary_emotion) +
    line('Visual direction for b-roll', vg.description) +
    line('Colour palette', vg.color_palette) +
    line('On-screen text', vg.text_overlay) +
    line('Close with this CTA', post.cta) +
    `Suggested length: ${post.post_type === 'story' ? '15' : '30'} seconds\n` +
    `Full script reference (caption): ${activeCaption}`;

  // Hand the whole day off to Content Generation pre-filled — script direction,
  // visual concept, palette, on-screen text, format and length — so the user
  // never retypes what the strategy already decided.
  const openContentGeneration = (tab: 'video' | 'image') => {
    saveContentHandoff({
      postId: post.id,
      theme: post.theme ?? undefined,
      dayNumber: post.day_number,
      videoBrief,
      angle: angleForTheme(post.theme),
      durationSeconds: durationForPost(post.post_type),
      aspectRatio: aspectForPost(post.post_type, (post as any).platform),
      promoDetail: post.theme === 'promotional' ? post.cta ?? undefined : undefined,
      imageConcept: imageBrief,
      textOverlay: vg.text_overlay || undefined,
      palette: vg.color_palette || undefined,
      platform: platformForPost((post as any).platform),
      tab,
    });
    navigate(
      `/content-generation?strategyPostId=${encodeURIComponent(post.id)}${
        post.theme ? `&theme=${encodeURIComponent(post.theme)}` : ''
      }`,
    );
  };

  const CopyButton = ({ text, field, label }: { text: string; field: string; label: string }) => (
    <Button
      variant="outline"
      size="sm"
      onClick={() => copyToClipboard(text, field)}
      className="gap-1"
    >
      {copiedField === field ? (
        <Check className="w-3 h-3 text-green-500" />
      ) : (
        <Copy className="w-3 h-3" />
      )}
      {label}
    </Button>
  );

  return (
    <>
    <UpgradeModal open={showUpgrade} onClose={() => setShowUpgrade(false)} />
    <Card className="bg-card border-border hover:border-primary/50 transition-colors">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardContent className="p-4">
          {/* Header - Always visible */}
          <div className="flex items-start gap-4">
            <div className="flex flex-col items-center">
              <div className="w-11 h-11 rounded-md bg-muted/40 border border-border flex items-center justify-center text-foreground font-semibold">
                {post.day_number}
              </div>
              <span className="text-xs text-muted-foreground mt-1">Day</span>
              {post.week_number && (
                <span className="text-[10px] text-muted-foreground">W{post.week_number}</span>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-medium text-foreground">
                  {formatDate(post.post_date)}
                </span>
                {post.post_time && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatTime(post.post_time)}
                  </span>
                )}
                {post.is_edited && (
                  <Badge variant="outline" className="text-[10px]">
                    Edited
                  </Badge>
                )}
              </div>
              
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                {post.post_type && (
                  <Badge variant="secondary" className="text-xs gap-1">
                    {postTypeIcons[post.post_type] || <FileText className="w-3 h-3" />}
                    {post.post_type.replace('_', ' ')}
                  </Badge>
                )}
                {(post.content_category || post.theme) && (
                  <Badge 
                    variant="outline" 
                    className={`text-xs ${themeColors[post.content_category || post.theme || ''] || ''}`}
                  >
                    {(post.content_category || post.theme || '').replace('_', ' ')}
                  </Badge>
                )}
                {post.primary_emotion && (
                  <Badge variant="outline" className="text-xs">
                    {post.primary_emotion}
                  </Badge>
                )}
              </div>

              {/* Hook - Always visible */}
              {post.hook && (
                <div className="mb-2">
                  <p className="font-semibold text-foreground text-base leading-snug">
                    "{post.hook}"
                  </p>
                  {post.hook_technique && (
                    <p className="text-xs text-muted-foreground mt-1">
                      <span className="text-primary">{post.hook_technique.replace('_', ' ')}</span>
                      {post.hook_principle && ` — ${post.hook_principle}`}
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="flex flex-col items-end gap-2">
              {/* Performance Predictions */}
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                {post.predicted_reach && (
                  <span className="flex items-center gap-1" title="Predicted Reach">
                    <Eye className="w-3 h-3" />
                    {post.predicted_reach.toLocaleString()}
                  </span>
                )}
                {post.predicted_engagement && (
                  <span className="flex items-center gap-1" title="Predicted Engagement">
                    <Heart className="w-3 h-3" />
                    {post.predicted_engagement}%
                  </span>
                )}
              </div>
              
              {/* Confidence Badge */}
              {post.performance_confidence && (
                <Badge 
                  variant="outline" 
                  className={`text-[10px] ${confidenceColors[post.performance_confidence] || ''}`}
                >
                  {post.performance_confidence} confidence
                </Badge>
              )}
              
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm">
                  {isOpen ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
            </div>
          </div>

          {/* Expanded content */}
          <CollapsibleContent>
            <div className="mt-4 pt-4 border-t border-border">
              <Tabs defaultValue="content" className="w-full">
                <TabsList className="grid w-full grid-cols-4 mb-4">
                  <TabsTrigger value="content">Content</TabsTrigger>
                  <TabsTrigger value="brief">Brief</TabsTrigger>
                  <TabsTrigger value="metrics">Metrics</TabsTrigger>
                  <TabsTrigger value="strategy">Strategy</TabsTrigger>
                </TabsList>

                {/* Content Tab */}
                <TabsContent value="content" className="space-y-4">
                  {/* Opening */}
                  {post.opening_text && (
                    <div>
                      <h4 className="text-sm font-semibold text-foreground mb-2">Opening</h4>
                      <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
                        {post.opening_text}
                      </p>
                    </div>
                  )}

                  {/* Caption */}
                  <div>
                    <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                      <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                        Full Caption
                        {activeCaption !== post.caption && (
                          <Badge variant="outline" className="text-[10px] text-primary border-primary/30">Variant active</Badge>
                        )}
                      </h4>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={generateVariants}
                          disabled={loadingVariants}
                          className="gap-1"
                        >
                          {loadingVariants ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <FlaskConical className="w-3 h-3" />
                          )}
                          {variants.length ? 'Regenerate A/B' : 'Generate A/B variants'}
                        </Button>
                        <CopyButton text={activeCaption} field="caption" label="Copy" />
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground whitespace-pre-line bg-muted/50 p-3 rounded-md max-h-48 overflow-y-auto">
                      {activeCaption}
                    </p>
                    {activeCaption !== post.caption && (
                      <button
                        onClick={() => setActiveCaption(post.caption)}
                        className="text-xs text-muted-foreground hover:text-foreground mt-1 underline"
                      >
                        Revert to original
                      </button>
                    )}

                    {variants.length > 0 && (
                      <div className="mt-3 space-y-2">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">A/B Variants</p>
                        <div className="grid gap-2 md:grid-cols-2">
                          {variants.map((v, i) => {
                            const isActive = activeCaption === v.caption;
                            return (
                              <div
                                key={i}
                                className={`p-3 rounded-md border ${isActive ? 'border-primary bg-primary/5' : 'border-border bg-muted/30'}`}
                              >
                                <div className="flex items-center justify-between mb-1">
                                  <Badge variant="outline" className="text-[10px]">{v.label}</Badge>
                                  {v.angle && (
                                    <span className="text-[10px] text-muted-foreground italic">{v.angle}</span>
                                  )}
                                </div>
                                {v.hook && (
                                  <p className="text-sm font-semibold text-foreground mb-1 leading-tight">"{v.hook}"</p>
                                )}
                                <p className="text-xs text-muted-foreground whitespace-pre-line max-h-32 overflow-y-auto">
                                  {v.caption}
                                </p>
                                <div className="flex items-center gap-2 mt-2">
                                  <Button
                                    size="sm"
                                    variant={isActive ? 'secondary' : 'default'}
                                    className="h-7 text-xs gap-1"
                                    onClick={() => useVariant(v)}
                                    disabled={isActive}
                                  >
                                    <Check className="w-3 h-3" />
                                    {isActive ? 'In use' : 'Use this'}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 text-xs gap-1"
                                    onClick={() => copyToClipboard(v.caption, `variant-${i}`)}
                                  >
                                    {copiedField === `variant-${i}` ? (
                                      <Check className="w-3 h-3 text-green-500" />
                                    ) : (
                                      <Copy className="w-3 h-3" />
                                    )}
                                    Copy
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>


                  {/* Hashtags with breakdown */}
                  {post.hashtags && post.hashtags.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-semibold text-foreground flex items-center gap-1">
                          <Hash className="w-4 h-4" /> Hashtags
                        </h4>
                        <CopyButton text={hashtagsString} field="hashtags" label="Copy All" />
                      </div>
                      
                      {/* Hashtag mix breakdown */}
                      {hashtagMix && Object.keys(hashtagMix).length > 0 ? (
                        <div className="space-y-2">
                          {hashtagMix.high_volume && hashtagMix.high_volume.length > 0 && (
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">High Volume (100K+):</p>
                              <div className="flex flex-wrap gap-1">
                                {hashtagMix.high_volume.map((tag: string, i: number) => (
                                  <Badge key={i} variant="secondary" className="text-xs">
                                    {tag.startsWith('#') ? tag : `#${tag}`}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                          {hashtagMix.medium_volume && hashtagMix.medium_volume.length > 0 && (
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Medium Volume (10K-100K):</p>
                              <div className="flex flex-wrap gap-1">
                                {hashtagMix.medium_volume.map((tag: string, i: number) => (
                                  <Badge key={i} variant="secondary" className="text-xs">
                                    {tag.startsWith('#') ? tag : `#${tag}`}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                          {hashtagMix.niche && hashtagMix.niche.length > 0 && (
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Niche (1K-10K):</p>
                              <div className="flex flex-wrap gap-1">
                                {hashtagMix.niche.map((tag: string, i: number) => (
                                  <Badge key={i} variant="secondary" className="text-xs">
                                    {tag.startsWith('#') ? tag : `#${tag}`}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                          {hashtagMix.branded && hashtagMix.branded.length > 0 && (
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Branded:</p>
                              <div className="flex flex-wrap gap-1">
                                {hashtagMix.branded.map((tag: string, i: number) => (
                                  <Badge key={i} variant="secondary" className="text-xs">
                                    {tag.startsWith('#') ? tag : `#${tag}`}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {post.hashtags.map((tag, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                              {tag.startsWith('#') ? tag : `#${tag}`}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* CTA */}
                  {post.cta && (
                    <div>
                      <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                        Call to Action
                        {post.cta_type && (
                          <Badge variant="outline" className="text-xs">{post.cta_type}</Badge>
                        )}
                        {post.cta_strength && (
                          <Badge variant="outline" className="text-xs">{post.cta_strength}</Badge>
                        )}
                      </h4>
                      <p className="text-sm text-foreground bg-muted/30 border border-border px-3 py-2 rounded-md inline-block">
                        {post.cta}
                      </p>
                    </div>
                  )}
                </TabsContent>

                {/* Content Brief Tab — handoff to Content Generation */}
                <TabsContent value="brief" className="space-y-4">
                  <div className="p-3 rounded-md border border-border bg-muted/30 space-y-2">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-primary" />
                      <h4 className="text-sm font-semibold text-foreground">Use this in Content Generation</h4>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Open Content Generation from here and the scripts, storyboard and on-screen
                      visuals are built around this exact day — same promise, same angle.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs gap-1"
                        onClick={() => openContentGeneration('video')}
                      >
                        Open Content Generation
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 text-xs gap-1"
                        onClick={() => openContentGeneration('image')}
                      >
                        Go straight to images
                      </Button>
                    </div>


                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <Image className="w-4 h-4" /> Image prompt
                      </h4>
                      <CopyButton text={imageBrief} field="image-brief" label="Copy" />
                    </div>
                    <p className="text-sm text-muted-foreground whitespace-pre-line bg-muted/50 p-3 rounded-md max-h-64 overflow-y-auto">
                      {imageBrief}
                    </p>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <Video className="w-4 h-4" /> Video ad brief
                      </h4>
                      <CopyButton text={videoBrief} field="video-brief" label="Copy" />
                    </div>
                    <p className="text-sm text-muted-foreground whitespace-pre-line bg-muted/50 p-3 rounded-md max-h-64 overflow-y-auto">
                      {videoBrief}
                    </p>
                  </div>
                </TabsContent>


                {/* Metrics Tab */}
                <TabsContent value="metrics" className="space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="text-center p-3 bg-muted/30 border border-border/60 rounded-md">
                      <Eye className="w-4 h-4 mx-auto mb-1 text-primary" />
                      <p className="text-lg font-bold text-foreground">
                        {(post.predicted_reach || 0).toLocaleString()}
                      </p>
                      <p className="text-[10px] text-muted-foreground">Reach</p>
                    </div>
                    <div className="text-center p-3 bg-muted/30 border border-border/60 rounded-md">
                      <Heart className="w-4 h-4 mx-auto mb-1 text-primary" />
                      <p className="text-lg font-bold text-foreground">
                        {post.predicted_engagement || 0}%
                      </p>
                      <p className="text-[10px] text-muted-foreground">Engagement</p>
                    </div>
                    <div className="text-center p-3 bg-muted/30 border border-border/60 rounded-md">
                      <ThumbsUp className="w-4 h-4 mx-auto mb-1 text-primary" />
                      <p className="text-lg font-bold text-foreground">
                        {(post.predicted_likes || 0).toLocaleString()}
                      </p>
                      <p className="text-[10px] text-muted-foreground">Likes</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-2">
                    <div className="text-center p-2 bg-muted/20 border border-border/60 rounded-md">
                      <p className="text-sm font-semibold text-foreground">{post.predicted_comments || 0}</p>
                      <p className="text-[10px] text-muted-foreground">Comments</p>
                    </div>
                    <div className="text-center p-2 bg-muted/20 border border-border/60 rounded-md">
                      <p className="text-sm font-semibold text-foreground">{post.predicted_shares || 0}</p>
                      <p className="text-[10px] text-muted-foreground">Shares</p>
                    </div>
                    <div className="text-center p-2 bg-muted/20 border border-border/60 rounded-md">
                      <p className="text-sm font-semibold text-foreground">{post.predicted_saves || 0}</p>
                      <p className="text-[10px] text-muted-foreground">Saves</p>
                    </div>
                    <div className="text-center p-2 bg-muted/20 border border-border/60 rounded-md">
                      <p className="text-sm font-semibold text-foreground">
                        {(post.predicted_impressions || 0).toLocaleString()}
                      </p>
                      <p className="text-[10px] text-muted-foreground">Impressions</p>
                    </div>
                  </div>

                  {post.prediction_basis && (
                    <div className="p-3 bg-muted/30 rounded-md">
                      <p className="text-xs text-muted-foreground">
                        <strong>Prediction basis:</strong> {post.prediction_basis}
                      </p>
                    </div>
                  )}
                </TabsContent>

                {/* Strategy Tab */}
                <TabsContent value="strategy" className="space-y-4">
                  {/* Strategic Rationale */}
                  {strategicRationale && Object.keys(strategicRationale).length > 0 && (
                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <Target className="w-4 h-4" /> Strategic Rationale
                      </h4>
                      {strategicRationale.why_this_day && (
                        <div>
                          <p className="text-xs text-muted-foreground">Why This Day:</p>
                          <p className="text-sm text-foreground">{strategicRationale.why_this_day}</p>
                        </div>
                      )}
                      {strategicRationale.arc_positioning && (
                        <div>
                          <p className="text-xs text-muted-foreground">Arc Positioning:</p>
                          <p className="text-sm text-foreground">{strategicRationale.arc_positioning}</p>
                        </div>
                      )}
                      {strategicRationale.builds_toward && (
                        <div>
                          <p className="text-xs text-muted-foreground">Builds Toward:</p>
                          <p className="text-sm text-foreground">{strategicRationale.builds_toward}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Optimization Tips */}
                  {optimizationTips && Object.keys(optimizationTips).length > 0 && (
                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <Lightbulb className="w-4 h-4 text-muted-foreground" /> Optimization Tips
                      </h4>
                      {optimizationTips.engagement_boosters && optimizationTips.engagement_boosters.length > 0 && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Engagement Boosters:</p>
                          <ul className="text-sm text-foreground space-y-1">
                            {optimizationTips.engagement_boosters.map((tip: string, i: number) => (
                              <li key={i} className="flex items-start gap-2">
                                <Zap className="w-3 h-3 mt-1 text-muted-foreground flex-shrink-0" />
                                {tip}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {optimizationTips.a_b_test_ideas && optimizationTips.a_b_test_ideas.length > 0 && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">A/B Test Ideas:</p>
                          <ul className="text-sm text-foreground space-y-1">
                            {optimizationTips.a_b_test_ideas.map((idea: string, i: number) => (
                              <li key={i} className="flex items-start gap-2">
                                <Sparkles className="w-3 h-3 mt-1 text-muted-foreground flex-shrink-0" />
                                {idea}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {optimizationTips.potential_issues && optimizationTips.potential_issues.length > 0 && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Potential Issues:</p>
                          <ul className="text-sm text-foreground space-y-1">
                            {optimizationTips.potential_issues.map((issue: string, i: number) => (
                              <li key={i} className="flex items-start gap-2">
                                <AlertCircle className="w-3 h-3 mt-1 text-muted-foreground flex-shrink-0" />
                                {issue}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Legacy Rationale fallback */}
                  {post.rationale && !strategicRationale.why_this_day && (
                    <div>
                      <h4 className="text-sm font-semibold text-foreground mb-2">Why This Post?</h4>
                      <p className="text-sm text-muted-foreground italic">
                        {post.rationale}
                      </p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2 pt-4 mt-4 border-t border-border">
                <CopyButton text={post.hook || ''} field="hook" label="Hook" />
                <CopyButton text={post.caption} field="caption" label="Caption" />
                <CopyButton text={hashtagsString} field="hashtags" label="Hashtags" />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(
                    `${post.hook}\n\n${post.caption}\n\n${hashtagsString}`,
                    'all'
                  )}
                  className="gap-1"
                >
                  {copiedField === 'all' ? (
                    <Check className="w-3 h-3 text-green-500" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                  Copy All
                </Button>
                
                <div className="flex-1" />
                
                {onEdit && (
                  <Button variant="outline" size="sm" onClick={() => onEdit(post)}>
                    <Edit className="w-4 h-4 mr-1" />
                    Edit
                  </Button>
                )}
                {onAskAI && (
                  <Button variant="outline" size="sm" onClick={() => onAskAI(post)}>
                    <Sparkles className="w-4 h-4 mr-1" />
                    Revise
                  </Button>
                )}
              </div>
            </div>
          </CollapsibleContent>
        </CardContent>
      </Collapsible>
    </Card>
    </>
  );
}
