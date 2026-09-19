import React, { useState } from 'react';
import { 
  Calendar, Target, TrendingUp, Users, Eye, Heart, MousePointer,
  Download, FileText, Table, Edit, RefreshCw, ExternalLink, ShoppingCart,
  Instagram, Linkedin, Twitter, Facebook, Video, ChevronDown, ChevronUp,
  Lightbulb, AlertTriangle, CheckCircle, Zap, Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { StrategyOverview } from '@/hooks/useStrategyGeneration';
import { format } from 'date-fns';

interface StrategyOverviewCardProps {
  strategy: StrategyOverview;
  postsCount: number;
  onViewCalendar?: () => void;
  onExportPDF?: () => void;
  onExportCSV?: () => void;
  onEdit?: () => void;
  onRegenerate?: () => void;
  compact?: boolean;
}

const platformIcons: Record<string, React.ReactNode> = {
  instagram: <Instagram className="w-5 h-5" />,
  linkedin: <Linkedin className="w-5 h-5" />,
  twitter: <Twitter className="w-5 h-5" />,
  facebook: <Facebook className="w-5 h-5" />,
  tiktok: <Video className="w-5 h-5" />,
};

// Neutral, brand-consistent surface for every platform — no per-platform color blocks.
const PLATFORM_SURFACE = 'bg-muted/40 text-foreground';

export function StrategyOverviewCard({
  strategy,
  postsCount,
  onViewCalendar,
  onExportPDF,
  onExportCSV,
  onEdit,
  onRegenerate,
  compact = false,
}: StrategyOverviewCardProps) {
  const [showTactics, setShowTactics] = useState(false);
  const [showMilestones, setShowMilestones] = useState(false);
  const [showRisks, setShowRisks] = useState(false);

  const contentMix = strategy.content_mix || {};
  const postTypeDistribution = strategy.post_type_distribution || {};
  const predictedMetrics = strategy.predicted_metrics || {
    total_reach: 0,
    total_impressions: 0,
    avg_engagement_rate: 0,
    expected_follower_growth: 0,
    expected_profile_visits: 0,
    expected_website_clicks: 0,
    expected_conversions: 0,
  };
  const strategicApproach = strategy.strategic_approach || {};
  const keyTactics = strategy.key_tactics || [];
  const successMilestones = strategy.success_milestones || {};
  const riskAssessment = strategy.risk_assessment || {};
  
  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), 'MMM d, yyyy');
    } catch {
      return dateStr;
    }
  };

  if (compact) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-md ${PLATFORM_SURFACE} border border-border`}>
              {platformIcons[strategy.platform || ''] || <Calendar className="w-5 h-5" />}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground truncate">{strategy.title}</h3>
              <p className="text-sm text-muted-foreground">
                {formatDate(strategy.start_date)} - {formatDate(strategy.end_date)}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="secondary">{postsCount} posts</Badge>
                <Badge variant="outline">{strategy.duration_days} days</Badge>
              </div>
            </div>
            <Button size="sm" variant="ghost" onClick={onViewCalendar}>
              <ExternalLink className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border overflow-hidden">
      <CardHeader className="bg-muted/30 border-b border-border">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <span className="text-muted-foreground">
              {platformIcons[strategy.platform || ''] || <Calendar className="w-6 h-6" />}
            </span>
            <div>
              <CardTitle className="text-xl text-foreground">{strategy.title}</CardTitle>
              <p className="text-muted-foreground text-sm mt-1">
                {formatDate(strategy.start_date)} - {formatDate(strategy.end_date)}
              </p>
            </div>
          </div>
          <Badge variant="outline" className="shrink-0">
            {postsCount} posts
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="p-6 space-y-6">
        {/* Strategic Approach */}
        {strategicApproach.core_strategy && (
          <div className="p-4 bg-muted/30 rounded-md border border-border">
            <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" /> Strategic Approach
            </h4>
            <p className="text-sm text-foreground mb-2">{strategicApproach.core_strategy}</p>
            {strategicApproach.key_differentiator && (
              <p className="text-xs text-muted-foreground">
                <strong>Differentiator:</strong> {strategicApproach.key_differentiator}
              </p>
            )}
          </div>
        )}

        {/* Predicted Metrics - Enhanced Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="text-center p-3 bg-muted/30 rounded-md border border-border/60">
            <Eye className="w-4 h-4 mx-auto mb-1 text-primary" />
            <p className="text-lg font-bold text-foreground">
              {(predictedMetrics.total_reach || 0).toLocaleString()}
            </p>
            <p className="text-[10px] text-muted-foreground">Reach</p>
          </div>
          <div className="text-center p-3 bg-muted/30 rounded-md border border-border/60">
            <Heart className="w-4 h-4 mx-auto mb-1 text-primary" />
            <p className="text-lg font-bold text-foreground">
              {predictedMetrics.avg_engagement_rate || 0}%
            </p>
            <p className="text-[10px] text-muted-foreground">Engagement</p>
          </div>
          <div className="text-center p-3 bg-muted/30 rounded-md border border-border/60">
            <Users className="w-4 h-4 mx-auto mb-1 text-primary" />
            <p className="text-lg font-bold text-foreground">
              +{(predictedMetrics.expected_follower_growth || 0).toLocaleString()}
            </p>
            <p className="text-[10px] text-muted-foreground">Followers</p>
          </div>
          <div className="text-center p-3 bg-muted/30 rounded-md border border-border/60">
            <MousePointer className="w-4 h-4 mx-auto mb-1 text-primary" />
            <p className="text-lg font-bold text-foreground">
              {(predictedMetrics.expected_website_clicks || 0).toLocaleString()}
            </p>
            <p className="text-[10px] text-muted-foreground">Clicks</p>
          </div>
        </div>

        {/* Extended Metrics Row */}
        <div className="flex items-center justify-between text-sm border-t border-b border-border py-3">
          <div className="flex items-center gap-1 text-muted-foreground">
            <Eye className="w-3 h-3" />
            <span>{(predictedMetrics.total_impressions || 0).toLocaleString()} impressions</span>
          </div>
          <div className="flex items-center gap-1 text-muted-foreground">
            <Users className="w-3 h-3" />
            <span>{(predictedMetrics.expected_profile_visits || 0).toLocaleString()} profile visits</span>
          </div>
          <div className="flex items-center gap-1 text-muted-foreground">
            <ShoppingCart className="w-3 h-3" />
            <span>{predictedMetrics.expected_conversions || 0} conversions</span>
          </div>
        </div>

        {/* Goals */}
        {strategy.goals && strategy.goals.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
              <Target className="w-4 h-4" /> Goals
            </h4>
            <div className="flex flex-wrap gap-2">
              {strategy.goals.map((goal, i) => (
                <Badge key={i} variant="outline">{goal}</Badge>
              ))}
            </div>
          </div>
        )}

        {/* Content Mix */}
        <div>
          <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" /> Content Mix
          </h4>
          <div className="space-y-2">
            {Object.entries(contentMix).map(([type, percentage]) => (
              <div key={type}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted-foreground capitalize">{type.replace('_', ' ')}</span>
                  <span className="font-medium text-foreground">{percentage}%</span>
                </div>
                <Progress value={percentage as number} className="h-1.5" />
              </div>
            ))}
          </div>
        </div>

        {/* Post Type Distribution */}
        {Object.keys(postTypeDistribution).length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-2">Post Types</h4>
            <div className="flex flex-wrap gap-2">
              {Object.entries(postTypeDistribution).map(([type, count]) => (
                <Badge key={type} variant="secondary" className="text-xs">
                  {type}: {count}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Key Tactics - Collapsible */}
        {keyTactics.length > 0 && (
          <Collapsible open={showTactics} onOpenChange={setShowTactics}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between p-0 h-auto">
                <span className="text-sm font-semibold flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-muted-foreground" /> Key Tactics ({keyTactics.length})
                </span>
                {showTactics ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2">
              <ul className="space-y-1">
                {keyTactics.map((tactic, i) => (
                  <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                    <CheckCircle className="w-3 h-3 mt-1 text-muted-foreground flex-shrink-0" />
                    {tactic}
                  </li>
                ))}
              </ul>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Success Milestones - Collapsible */}
        {Object.keys(successMilestones).length > 0 && (
          <Collapsible open={showMilestones} onOpenChange={setShowMilestones}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between p-0 h-auto">
                <span className="text-sm font-semibold flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" /> Weekly Milestones
                </span>
                {showMilestones ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2">
              <div className="space-y-2">
                {Object.entries(successMilestones).map(([week, milestone]) => (
                  <div key={week} className="flex items-start gap-2 text-sm">
                    <Badge variant="outline" className="text-xs shrink-0">
                      {week.replace('_', ' ').toUpperCase()}
                    </Badge>
                    <span className="text-muted-foreground">{milestone}</span>
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Risk Assessment - Collapsible */}
        {riskAssessment.potential_challenges && riskAssessment.potential_challenges.length > 0 && (
          <Collapsible open={showRisks} onOpenChange={setShowRisks}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between p-0 h-auto">
                <span className="text-sm font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-muted-foreground" /> Risk Assessment
                </span>
                {showRisks ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2">
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Challenges:</p>
                  <div className="flex flex-wrap gap-1">
                    {riskAssessment.potential_challenges.map((challenge, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {challenge}
                      </Badge>
                    ))}
                  </div>
                </div>
                {riskAssessment.mitigation_strategies && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Mitigation:</p>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      {riskAssessment.mitigation_strategies.map((strategy, i) => (
                        <li key={i} className="flex items-start gap-1">
                          <span>•</span> {strategy}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-2 pt-2">
          {onViewCalendar && (
            <Button onClick={onViewCalendar} className="flex-1">
              <Calendar className="w-4 h-4 mr-2" />
              View Calendar
            </Button>
          )}
          {onExportPDF && (
            <Button aria-label="Export PDF" variant="outline" size="icon" onClick={onExportPDF} title="Export PDF">
              <FileText className="w-4 h-4" />
            </Button>
          )}
          {onExportCSV && (
            <Button aria-label="Export CSV" variant="outline" size="icon" onClick={onExportCSV} title="Export CSV">
              <Table className="w-4 h-4" />
            </Button>
          )}
          {onEdit && (
            <Button aria-label="Edit strategy" variant="outline" size="icon" onClick={onEdit} title="Edit Strategy">
              <Edit className="w-4 h-4" />
            </Button>
          )}
          {onRegenerate && (
            <Button aria-label="Regenerate strategy" variant="outline" size="icon" onClick={onRegenerate} title="Regenerate">
              <RefreshCw className="w-4 h-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
