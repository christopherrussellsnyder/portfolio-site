import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { serviceClient } from "../_shared/supabase.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const { userId } = await req.json();
    if (!userId) {
      return new Response(JSON.stringify({ error: 'userId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabase = serviceClient();

    // Parallel fetch all intelligence data
    const [
      businessRes,
      behaviorRes,
      analyticsRes,
      strategiesRes,
      performanceRes,
      learningRes,
      trendsRes,
    ] = await Promise.all([
      supabase.from('business_context').select('*').eq('user_id', userId).eq('is_active', true).maybeSingle(),
      supabase.from('user_behavior_patterns').select('*').eq('user_id', userId),
      supabase.from('uploaded_analytics').select('*').eq('user_id', userId).order('uploaded_at', { ascending: false }).limit(5),
      supabase.from('content_strategies').select('id, platform, created_at, predicted_metrics, total_posts').eq('user_id', userId).order('created_at', { ascending: false }).limit(10),
      supabase.from('content_performance').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(20),
      supabase.from('ai_learning_metrics').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(100),
      supabase.from('content_trends').select('*').eq('is_active', true).limit(20),
    ]);

    // Business Profile Maturity
    const bp = businessRes.data?.business_profile;
    let profileMaturity = 0;
    if (bp) {
      if (bp.businessName) profileMaturity += 10;
      if (bp.industry) profileMaturity += 10;
      if (bp.targetAudience?.ageRange) profileMaturity += 15;
      if (bp.brandIdentity?.valueProposition) profileMaturity += 15;
      if (bp.productsServices?.length) profileMaturity += 15;
      if (bp.competitors?.length) profileMaturity += 10;
      if (bp.marketingMaturity?.websiteQuality) profileMaturity += 10;
      if (bp.summary) profileMaturity += 15;
    }

    // Behavior Pattern Map
    const behaviorMap: any = {};
    const overallConfidence = behaviorRes.data?.length
      ? behaviorRes.data.reduce((sum: number, b: any) => sum + (b.learning_confidence || 0), 0) / behaviorRes.data.length
      : 0;
    
    behaviorRes.data?.forEach((b: any) => {
      behaviorMap[b.platform] = {
        confidence: b.learning_confidence,
        preferences: b.behavior_data,
        lastAnalyzed: b.last_analyzed,
      };
    });

    // Performance Trends (30/60/90 day)
    const now = new Date();
    const analytics = analyticsRes.data || [];
    const performanceTrends = {
      total_uploads: analytics.length,
      latest_health_score: analytics[0]?.overall_health_score || null,
      latest_performance_rating: analytics[0]?.performance_rating || null,
      platforms_tracked: [...new Set(analytics.map((a: any) => a.platform).filter(Boolean))],
    };

    // AI Prediction Accuracy
    const learningData = learningRes.data || [];
    let predictionAccuracy: any = { total_predictions: 0, avg_accuracy: 0, trend: 'insufficient_data' };
    if (learningData.length > 0) {
      const avgAcc = learningData.reduce((s: number, m: any) => s + (m.accuracy_score || 0), 0) / learningData.length;
      const avgVariance = learningData.reduce((s: number, m: any) => s + (m.variance || 0), 0) / learningData.length;
      
      // Check if improving
      const recent = learningData.slice(0, Math.min(10, learningData.length));
      const older = learningData.slice(Math.min(10, learningData.length));
      const recentAvg = recent.length ? recent.reduce((s: number, m: any) => s + (m.accuracy_score || 0), 0) / recent.length : 0;
      const olderAvg = older.length ? older.reduce((s: number, m: any) => s + (m.accuracy_score || 0), 0) / older.length : recentAvg;
      
      predictionAccuracy = {
        total_predictions: learningData.length,
        avg_accuracy: Math.round(avgAcc * 100) / 100,
        avg_variance: Math.round(avgVariance * 100) / 100,
        trend: recentAvg > olderAvg + 0.02 ? 'improving' : recentAvg < olderAvg - 0.02 ? 'declining' : 'stable',
        recent_accuracy: Math.round(recentAvg * 100) / 100,
        bias: avgVariance > 0.05 ? 'underestimate' : avgVariance < -0.05 ? 'overestimate' : 'calibrated',
      };
    }

    // Opportunity Scoring
    const opportunities: any[] = [];
    if (profileMaturity < 50) opportunities.push({ action: 'Complete business profile', score: 90, effort: 'low' });
    if (!analyticsRes.data?.length) opportunities.push({ action: 'Upload first analytics screenshot', score: 85, effort: 'low' });
    if (overallConfidence < 0.3) opportunities.push({ action: 'Upload more analytics for better AI predictions', score: 80, effort: 'low' });
    if (!strategiesRes.data?.length) opportunities.push({ action: 'Generate first content strategy', score: 75, effort: 'medium' });
    
    // Platform-specific opportunities
    Object.entries(behaviorMap).forEach(([platform, data]: [string, any]) => {
      if (data.confidence < 0.5) {
        opportunities.push({ action: `Upload more ${platform} analytics (current confidence: ${(data.confidence * 100).toFixed(0)}%)`, score: 70, effort: 'low' });
      }
    });

    opportunities.sort((a, b) => b.score - a.score);

    // Risk Factors
    const risks: any[] = [];
    if (analytics.length >= 2) {
      const latest = analytics[0]?.overall_health_score;
      const prev = analytics[1]?.overall_health_score;
      if (latest && prev && latest < prev - 1) {
        risks.push({ risk: 'Health score declining', severity: 'high', from: prev, to: latest });
      }
    }
    if (predictionAccuracy.trend === 'declining') {
      risks.push({ risk: 'AI prediction accuracy declining', severity: 'medium', action: 'Review recent strategy execution' });
    }

    // Compile intelligence report
    const report = {
      generated_at: new Date().toISOString(),
      profile_maturity: { score: profileMaturity, max: 100, status: profileMaturity > 70 ? 'strong' : profileMaturity > 40 ? 'moderate' : 'needs_work' },
      behavior_intelligence: {
        platforms_tracked: Object.keys(behaviorMap),
        overall_confidence: Math.round(overallConfidence * 100) / 100,
        platform_details: behaviorMap,
        personalization_level: overallConfidence > 0.7 ? 'highly_personalized' : overallConfidence > 0.4 ? 'moderately_personalized' : 'industry_benchmarks',
      },
      performance_trends: performanceTrends,
      prediction_accuracy: predictionAccuracy,
      strategies_created: strategiesRes.data?.length || 0,
      content_performance_tracked: performanceRes.data?.length || 0,
      active_trends: trendsRes.data?.length || 0,
      opportunities: opportunities.slice(0, 7),
      risks,
      recommended_next_actions: opportunities.slice(0, 3).map((o: any) => o.action),
    };

    return new Response(JSON.stringify({ success: true, intelligence: report }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('Intelligence analysis error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
