import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Brain, TrendingUp, Target, Zap, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';

interface BehaviorPattern {
  id: string;
  platform: string;
  behavior_data: any;
  learning_confidence: number;
  last_analyzed: string;
}

interface ContentTrend {
  id: string;
  platform: string;
  trend_type: string;
  content_category: string;
  trend_data: any;
  confidence_score: number;
  is_active: boolean;
}

const ConfidenceBadge = ({ score }: { score: number }) => {
  const level = score >= 0.85 ? 'High' : score >= 0.7 ? 'Medium' : 'Low';
  const color = score >= 0.85
    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
    : score >= 0.7
    ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
    : 'bg-red-500/20 text-red-400 border-red-500/30';
  return (
    <Badge variant="outline" className={`${color} gap-1 text-[10px] px-1.5 py-0`}>
      {level} {Math.round(score * 100)}%
    </Badge>
  );
};

export function IntelligenceCards() {
  const { user } = useAuth();
  const [patterns, setPatterns] = useState<BehaviorPattern[]>([]);
  const [trends, setTrends] = useState<ContentTrend[]>([]);
  const [predictionCount, setPredictionCount] = useState(0);
  const [avgAccuracy, setAvgAccuracy] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [hasData, setHasData] = useState(false);

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    const [pRes, tRes, mRes] = await Promise.all([
      supabase.from('user_behavior_patterns').select('*').eq('user_id', user.id),
      supabase.from('content_trends').select('*').eq('is_active', true).order('last_updated', { ascending: false }).limit(10),
      supabase.from('ai_learning_metrics').select('accuracy_score').eq('user_id', user.id).order('created_at', { ascending: false }).limit(50),
    ]);
    const p = pRes.data || [];
    const t = tRes.data || [];
    const m = mRes.data || [];
    setPatterns(p);
    setTrends(t);
    setPredictionCount(m.length);
    setAvgAccuracy(m.length > 0 ? m.reduce((s, x) => s + (x.accuracy_score || 0), 0) / m.length : 0);
    setHasData(p.length > 0 || t.length > 0 || m.length > 0);
  };

  if (!hasData) return null;

  const allBehavior = patterns[0]?.behavior_data || {};

  // Radar data
  const contentPrefs = allBehavior.content_type_preferences || {};
  const radarData = Object.entries(contentPrefs).map(([key, val]) => ({
    subject: key.charAt(0).toUpperCase() + key.slice(1).replace('_', ' '),
    score: Math.round((val as number) * 100),
    fullMark: 100,
  }));

  // Engagement distribution
  const engPatterns = allBehavior.engagement_patterns || {};
  const engData = Object.entries(engPatterns).map(([key, val]) => ({
    type: key.replace('_ratio', '').replace(/\b\w/g, l => l.toUpperCase()),
    ratio: Math.round((val as number) * 100),
  }));

  // Hook data
  const hookData = Object.entries(allBehavior.hook_effectiveness || {}).map(([key, val]) => ({
    hook: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    effectiveness: Math.round((val as number) * 100),
  }));

  const trendIcon = (type: string) => {
    if (type === 'rising' || type === 'viral') return '🔥';
    if (type === 'declining') return '📉';
    return '➡️';
  };

  return (
    <div className="mx-auto max-w-4xl px-6 pb-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between gap-2 px-4 py-2.5 rounded-xl bg-primary/5 border border-primary/10 hover:bg-primary/10 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">Audience Intelligence</span>
          {patterns[0] && <ConfidenceBadge score={patterns[0].learning_confidence} />}
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Target className="w-3 h-3" /> {Math.round(avgAccuracy * 100)}% accuracy</span>
            <span className="flex items-center gap-1"><Zap className="w-3 h-3" /> {predictionCount} predictions</span>
            <span className="flex items-center gap-1"><TrendingUp className="w-3 h-3" /> {trends.length} trends</span>
          </div>
          {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </div>
      </button>

      {expanded && (
        <div className="mt-3 space-y-3 animate-fade-in">
          {/* Stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { label: 'Learning Confidence', value: `${Math.round((patterns[0]?.learning_confidence || 0) * 100)}%`, icon: Target, color: 'text-primary' },
              { label: 'Prediction Accuracy', value: `${Math.round(avgAccuracy * 100)}%`, icon: Target, color: 'text-emerald-400' },
              { label: 'Active Trends', value: `${trends.length}`, icon: TrendingUp, color: 'text-amber-400' },
              { label: 'Predictions Made', value: `${predictionCount}`, icon: Zap, color: 'text-blue-400' },
            ].map(s => (
              <Card key={s.label} className="bg-card/50">
                <CardContent className="p-3 flex items-center gap-2">
                  <s.icon className={`w-4 h-4 ${s.color}`} />
                  <div>
                    <p className="text-[10px] text-muted-foreground leading-tight">{s.label}</p>
                    <p className="text-sm font-bold">{s.value}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {radarData.length > 0 && (
              <Card className="bg-card/50">
                <CardHeader className="py-2 px-3">
                  <CardTitle className="text-xs">Content Type Preferences</CardTitle>
                </CardHeader>
                <CardContent className="px-2 pb-2">
                  <ResponsiveContainer width="100%" height={200}>
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="hsl(var(--border))" />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} />
                      <Radar dataKey="score" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.25} />
                    </RadarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {hookData.length > 0 && (
              <Card className="bg-card/50">
                <CardHeader className="py-2 px-3">
                  <CardTitle className="text-xs">Hook Effectiveness</CardTitle>
                </CardHeader>
                <CardContent className="px-2 pb-2">
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={hookData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="hook" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9 }} />
                      <YAxis domain={[0, 100]} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9 }} />
                      <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 11 }} />
                      <Bar dataKey="effectiveness" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Engagement distribution */}
          {engData.length > 0 && (
            <Card className="bg-card/50">
              <CardHeader className="py-2 px-3">
                <CardTitle className="text-xs">Engagement Distribution</CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3 space-y-2">
                {engData.map(d => (
                  <div key={d.type}>
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs font-medium">{d.type}</span>
                      <span className="text-xs text-muted-foreground">{d.ratio}%</span>
                    </div>
                    <Progress value={d.ratio} className="h-1.5" />
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Trends */}
          {trends.length > 0 && (
            <Card className="bg-card/50">
              <CardHeader className="py-2 px-3">
                <CardTitle className="text-xs">Active Trends</CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3 space-y-1.5">
                {trends.slice(0, 5).map(t => (
                  <div key={t.id} className="flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span>{trendIcon(t.trend_type)}</span>
                      <span className="truncate font-medium">{t.content_category || 'General'}</span>
                      <Badge variant="outline" className="text-[10px] px-1 py-0 capitalize">{t.platform}</Badge>
                    </div>
                    <ConfidenceBadge score={t.confidence_score} />
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Optimal times */}
          {allBehavior.time_preferences && (
            <Card className="bg-card/50">
              <CardHeader className="py-2 px-3">
                <CardTitle className="text-xs">Optimal Posting Times</CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3 flex flex-wrap gap-1.5">
                {(allBehavior.time_preferences.peak_hours || []).map((h: string) => (
                  <Badge key={h} variant="outline" className="text-xs">{h}</Badge>
                ))}
                {(allBehavior.time_preferences.peak_days || []).map((d: string) => (
                  <Badge key={d} className="bg-primary/20 text-primary text-xs border-primary/30">{d}</Badge>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
