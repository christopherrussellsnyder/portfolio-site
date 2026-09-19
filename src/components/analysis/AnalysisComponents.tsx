import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Zap,
  Target,
  Palette,
  BarChart3,
} from 'lucide-react';

interface AssessmentScoreProps {
  score: number;
  label?: string;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function AssessmentScore({ score, label, showLabel = true, size = 'md' }: AssessmentScoreProps) {
  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-green-500';
    if (score >= 6) return 'text-blue-500';
    if (score >= 4) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 8) return 'Excellent';
    if (score >= 6) return 'Good';
    if (score >= 4) return 'Needs Improvement';
    return 'Critical';
  };

  const getScoreBg = (score: number) => {
    if (score >= 8) return 'bg-green-500/10 border-green-500/20';
    if (score >= 6) return 'bg-blue-500/10 border-blue-500/20';
    if (score >= 4) return 'bg-yellow-500/10 border-yellow-500/20';
    return 'bg-red-500/10 border-red-500/20';
  };

  const sizeClasses = {
    sm: 'w-10 h-10 text-lg',
    md: 'w-14 h-14 text-2xl',
    lg: 'w-20 h-20 text-3xl',
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className={cn(
          'rounded-full border-2 flex items-center justify-center font-bold',
          getScoreBg(score),
          getScoreColor(score),
          sizeClasses[size]
        )}
      >
        {score}
      </div>
      {showLabel && (
        <div className="text-center">
          <div className={cn('text-sm font-medium', getScoreColor(score))}>
            {label || getScoreLabel(score)}
          </div>
        </div>
      )}
    </div>
  );
}

interface SophisticationLevelProps {
  level: number;
  evidence?: string;
}

export function SophisticationLevel({ level, evidence }: SophisticationLevelProps) {
  const levels = [
    { label: 'Product-centric', description: 'Just describing what it is' },
    { label: 'Feature-focused', description: 'Listing what it does' },
    { label: 'Benefit-driven', description: 'Explaining what customer gets' },
    { label: 'Identity-based', description: 'Showing who customer becomes' },
    { label: 'Experience-focused', description: 'Demonstrating transformation' },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Zap className="w-4 h-4 text-primary" />
        <span className="font-medium">Marketing Sophistication</span>
        <Badge variant="outline" className="ml-auto">
          Level {level}/5
        </Badge>
      </div>
      <div className="space-y-2">
        {levels.map((l, i) => (
          <div
            key={i}
            className={cn(
              'flex items-center gap-3 p-2 rounded-lg transition-colors',
              i + 1 === level
                ? 'bg-primary/10 border border-primary/20'
                : i + 1 < level
                ? 'opacity-50'
                : 'opacity-30'
            )}
          >
            <div
              className={cn(
                'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold',
                i + 1 === level
                  ? 'bg-primary text-primary-foreground'
                  : i + 1 < level
                  ? 'bg-green-500/20 text-green-500'
                  : 'bg-muted text-muted-foreground'
              )}
            >
              {i + 1 <= level ? '✓' : i + 1}
            </div>
            <div className="flex-1">
              <div className={cn('text-sm font-medium', i + 1 === level && 'text-primary')}>
                {l.label}
              </div>
              <div className="text-xs text-muted-foreground">{l.description}</div>
            </div>
          </div>
        ))}
      </div>
      {evidence && (
        <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-2">
          <strong>Evidence:</strong> {evidence}
        </div>
      )}
    </div>
  );
}

interface StrengthWeaknessListProps {
  strengths: string[];
  weaknesses: string[];
}

export function StrengthWeaknessList({ strengths, weaknesses }: StrengthWeaknessListProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-green-500 font-medium">
          <CheckCircle className="w-4 h-4" />
          <span>Top Strengths</span>
        </div>
        <ul className="space-y-1.5">
          {strengths.map((s, i) => (
            <li key={i} className="flex items-start gap-2 text-sm">
              <span className="text-green-500 mt-0.5">✓</span>
              <span>{s}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-yellow-500 font-medium">
          <AlertTriangle className="w-4 h-4" />
          <span>Areas for Improvement</span>
        </div>
        <ul className="space-y-1.5">
          {weaknesses.map((w, i) => (
            <li key={i} className="flex items-start gap-2 text-sm">
              <span className="text-yellow-500 mt-0.5">!</span>
              <span>{w}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

interface ColorPaletteDisplayProps {
  colors: string[];
  primaryColor?: { hex: string; name?: string; psychology?: string };
}

export function ColorPaletteDisplay({ colors, primaryColor }: ColorPaletteDisplayProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Palette className="w-4 h-4 text-primary" />
        <span className="font-medium">Brand Colors</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {primaryColor?.hex && (
          <div className="flex flex-col items-center gap-1">
            <div
              className="w-12 h-12 rounded-lg border-2 border-primary shadow-sm"
              style={{ backgroundColor: primaryColor.hex }}
              title={primaryColor.name || primaryColor.hex}
            />
            <span className="text-[10px] text-muted-foreground">Primary</span>
          </div>
        )}
        {colors.slice(0, 8).map((color, i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <div
              className="w-10 h-10 rounded-lg border shadow-sm"
              style={{ backgroundColor: color }}
              title={color}
            />
            <span className="text-[10px] text-muted-foreground truncate max-w-[40px]">
              {color}
            </span>
          </div>
        ))}
      </div>
      {primaryColor?.psychology && (
        <div className="text-xs text-muted-foreground">
          <strong>Psychology:</strong> {primaryColor.psychology}
        </div>
      )}
    </div>
  );
}

interface VoiceScalesDisplayProps {
  scales: {
    formality?: number;
    playfulness?: number;
    complexity?: number;
    confidence?: number;
    warmth?: number;
  };
}

export function VoiceScalesDisplay({ scales }: VoiceScalesDisplayProps) {
  const scaleItems = [
    { key: 'formality', label: 'Formality', low: 'Very Formal', high: 'Very Casual' },
    { key: 'playfulness', label: 'Playfulness', low: 'Serious', high: 'Playful' },
    { key: 'complexity', label: 'Complexity', low: 'Simple', high: 'Complex' },
    { key: 'confidence', label: 'Confidence', low: 'Humble', high: 'Bold' },
    { key: 'warmth', label: 'Warmth', low: 'Corporate', high: 'Personal' },
  ];

  return (
    <div className="space-y-3">
      {scaleItems.map((item) => {
        const value = scales[item.key as keyof typeof scales] || 5;
        return (
          <div key={item.key} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{item.low}</span>
              <span className="font-medium">{item.label}</span>
              <span className="text-muted-foreground">{item.high}</span>
            </div>
            <div className="relative h-2 bg-muted rounded-full">
              <div
                className="absolute h-2 bg-primary rounded-full transition-all"
                style={{ width: `${value * 10}%` }}
              />
              <div
                className="absolute w-3 h-3 bg-primary rounded-full -top-0.5 transform -translate-x-1/2 border-2 border-background"
                style={{ left: `${value * 10}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

interface QuickWinCardProps {
  opportunity: string;
  impact: string;
  effort: string;
  implementation: string;
  expectedResult: string;
  priority: string;
}

export function QuickWinCard({
  opportunity,
  impact,
  effort,
  implementation,
  expectedResult,
  priority,
}: QuickWinCardProps) {
  const getPriorityColor = (p: string) => {
    if (p === 'P0') return 'bg-red-500';
    if (p === 'P1') return 'bg-orange-500';
    if (p === 'P2') return 'bg-yellow-500';
    return 'bg-blue-500';
  };

  const getImpactColor = (i: string) => {
    if (i.toLowerCase() === 'high') return 'text-green-500';
    if (i.toLowerCase() === 'medium') return 'text-yellow-500';
    return 'text-muted-foreground';
  };

  return (
    <div className="border rounded-lg p-4 space-y-3 hover:border-primary/50 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <Badge className={cn('text-white', getPriorityColor(priority))}>{priority}</Badge>
          <span className="font-medium text-sm">{opportunity}</span>
        </div>
      </div>
      
      <div className="flex items-center gap-4 text-xs">
        <div className="flex items-center gap-1">
          <TrendingUp className={cn('w-3 h-3', getImpactColor(impact))} />
          <span>Impact: {impact}</span>
        </div>
        <div className="flex items-center gap-1">
          <BarChart3 className="w-3 h-3 text-muted-foreground" />
          <span>Effort: {effort}</span>
        </div>
      </div>

      {implementation && (
        <div className="text-xs text-muted-foreground bg-muted/50 rounded p-2">
          <strong>How:</strong> {implementation}
        </div>
      )}

      {expectedResult && (
        <div className="text-xs text-green-600 dark:text-green-400">
          <strong>Expected:</strong> {expectedResult}
        </div>
      )}
    </div>
  );
}

interface RedFlagCardProps {
  issue: string;
  severity: string;
  risk: string;
  recommendation: string;
}

export function RedFlagCard({ issue, severity, risk, recommendation }: RedFlagCardProps) {
  const getSeverityColor = (s: string) => {
    if (s.toLowerCase() === 'critical') return 'bg-red-500 text-white';
    if (s.toLowerCase() === 'high') return 'bg-orange-500 text-white';
    return 'bg-yellow-500 text-black';
  };

  return (
    <div className="border border-red-500/30 bg-red-500/5 rounded-lg p-4 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-500" />
          <span className="font-medium text-sm">{issue}</span>
        </div>
        <Badge className={getSeverityColor(severity)}>{severity}</Badge>
      </div>
      
      {risk && (
        <div className="text-xs text-red-600 dark:text-red-400">
          <strong>Risk:</strong> {risk}
        </div>
      )}

      {recommendation && (
        <div className="text-xs text-muted-foreground">
          <strong>Action:</strong> {recommendation}
        </div>
      )}
    </div>
  );
}

interface PlatformRecommendationCardProps {
  platform: string;
  rationale: string;
  contentApproach: string;
  priority: string;
}

export function PlatformRecommendationCard({
  platform,
  rationale,
  contentApproach,
  priority,
}: PlatformRecommendationCardProps) {
  const getPlatformIcon = (p: string) => {
    const lower = p.toLowerCase();
    if (lower.includes('instagram')) return '📸';
    if (lower.includes('tiktok')) return '🎵';
    if (lower.includes('linkedin')) return '💼';
    if (lower.includes('facebook')) return '👥';
    if (lower.includes('twitter') || lower.includes('x')) return '🐦';
    if (lower.includes('youtube')) return '📺';
    if (lower.includes('pinterest')) return '📌';
    return '🌐';
  };

  const getPriorityBadge = (p: string) => {
    if (p.toLowerCase() === 'primary') return 'bg-green-500 text-white';
    if (p.toLowerCase() === 'secondary') return 'bg-blue-500 text-white';
    return 'bg-muted text-muted-foreground';
  };

  return (
    <div className="border rounded-lg p-4 space-y-2 hover:border-primary/50 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">{getPlatformIcon(platform)}</span>
          <span className="font-medium">{platform}</span>
        </div>
        <Badge className={getPriorityBadge(priority)}>{priority}</Badge>
      </div>
      
      <div className="text-xs text-muted-foreground">
        <strong>Why:</strong> {rationale}
      </div>

      <div className="text-xs">
        <strong>Content Focus:</strong> {contentApproach}
      </div>
    </div>
  );
}
