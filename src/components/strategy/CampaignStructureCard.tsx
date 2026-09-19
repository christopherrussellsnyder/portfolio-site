import React from 'react';
import { Target, TrendingUp, Users, Layers, Repeat, FlaskConical, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DataSourceBadge } from '@/components/DataSourceBadge';

export interface RecommendedCampaignStructure {
  structure_type?: string;
  rationale?: string;
  budget_split?: { prospecting?: number; retargeting?: number } | Record<string, number>;
  audience_approach?: string;
  creative_volume?: string;
  why_this_works_in_your_niche?: string;
  roas_trend_signal?: string;
  alternative_to_test?: string;
  first_30_day_action_plan?: string;
}

interface Props {
  data?: RecommendedCampaignStructure | null;
  platform?: string | null;
}

export function CampaignStructureCard({ data, platform }: Props) {
  if (!data || !data.structure_type) return null;

  const split = data.budget_split || {};
  const splitEntries = Object.entries(split);

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="w-4 h-4 text-primary" />
            Recommended Campaign Structure
          </CardTitle>
          <div className="flex items-center gap-2">
            <DataSourceBadge type="ai_estimated" />
            <Badge variant="outline" className="text-xs">
              {data.structure_type}
            </Badge>
          </div>
        </div>
        {platform && (
          <p className="text-xs text-muted-foreground capitalize">
            For paid ads on {platform} — directional AI estimate, not measured platform data
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        {data.rationale && (
          <div>
            <p className="text-foreground leading-relaxed">{data.rationale}</p>
          </div>
        )}

        {data.roas_trend_signal && (
          <div className="flex gap-2 items-start p-3 rounded-md bg-muted/30 border border-border">
            <TrendingUp className="w-4 h-4 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                AI-estimated trend (not live data)
              </p>
              <p className="text-foreground text-xs leading-relaxed">{data.roas_trend_signal}</p>
            </div>
          </div>
        )}

        {data.why_this_works_in_your_niche && (
          <div className="flex gap-2 items-start">
            <Sparkles className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
            <p className="text-muted-foreground text-xs leading-relaxed">
              {data.why_this_works_in_your_niche}
            </p>
          </div>
        )}

        {splitEntries.length > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1">
              <Layers className="w-3.5 h-3.5" />
              Budget split
            </p>
            <div className="flex gap-2 flex-wrap">
              {splitEntries.map(([key, value]) => (
                <Badge key={key} variant="secondary" className="capitalize">
                  {key.replace(/_/g, ' ')}: {value}%
                </Badge>
              ))}
            </div>
          </div>
        )}

        {data.audience_approach && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1 flex items-center gap-1">
              <Users className="w-3.5 h-3.5" />
              Audience approach
            </p>
            <p className="text-foreground text-xs leading-relaxed">{data.audience_approach}</p>
          </div>
        )}

        {data.creative_volume && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1 flex items-center gap-1">
              <Repeat className="w-3.5 h-3.5" />
              Creative cadence
            </p>
            <p className="text-foreground text-xs leading-relaxed">{data.creative_volume}</p>
          </div>
        )}

        {data.first_30_day_action_plan && (
          <div className="p-3 rounded-md bg-muted/30 border border-border">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              First 30 days
            </p>
            <p className="text-foreground text-xs leading-relaxed">{data.first_30_day_action_plan}</p>
          </div>
        )}

        {data.alternative_to_test && (
          <div className="flex gap-2 items-start pt-2 border-t border-border/50">
            <FlaskConical className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">
                A/B test against
              </p>
              <p className="text-muted-foreground text-xs leading-relaxed">{data.alternative_to_test}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
