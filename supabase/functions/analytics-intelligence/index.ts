import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { serviceClient } from "../_shared/supabase.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, dateFrom, dateTo, platform } = await req.json();
    
    const supabase = serviceClient();
    
    console.log('Analyzing analytics for user:', userId);
    
    const dateFromObj = new Date(dateFrom);
    const dateToObj = new Date(dateTo);
    const midpoint = new Date((dateFromObj.getTime() + dateToObj.getTime()) / 2);
    
    // Get current period metrics
    const { data: currentMetrics, error: currentError } = await supabase.rpc('get_analytics_summary', {
      p_user_id: userId,
      p_date_from: dateFrom,
      p_date_to: dateTo,
      p_platform: platform || 'all'
    });
    
    if (currentError) {
      console.error('Current metrics error:', currentError);
    }
    
    // Get first half metrics for trend comparison
    const { data: firstHalf } = await supabase.rpc('get_analytics_summary', {
      p_user_id: userId,
      p_date_from: dateFrom,
      p_date_to: midpoint.toISOString(),
      p_platform: platform || 'all'
    });
    
    // Get second half metrics
    const { data: secondHalf } = await supabase.rpc('get_analytics_summary', {
      p_user_id: userId,
      p_date_from: midpoint.toISOString(),
      p_date_to: dateTo,
      p_platform: platform || 'all'
    });
    
    const metrics = currentMetrics?.[0] || {};
    const firstMetrics = firstHalf?.[0] || {};
    const secondMetrics = secondHalf?.[0] || {};
    
    // Calculate trends
    const trends = {
      engagementTrend: calculatePercentageChange(firstMetrics.avg_engagement_rate || 0, secondMetrics.avg_engagement_rate || 0),
      impressionsTrend: calculatePercentageChange(firstMetrics.total_impressions || 0, secondMetrics.total_impressions || 0),
      postsTrend: calculatePercentageChange(firstMetrics.total_posts || 0, secondMetrics.total_posts || 0)
    };
    
    // Get top performing posts
    const { data: topPosts } = await supabase.rpc('get_top_posts_analytics', {
      p_user_id: userId,
      p_limit: 10,
      p_platform: platform || 'all'
    });
    
    // Analyze content performance by type
    const { data: contentPerformance } = await supabase.rpc('analyze_content_performance_by_type', {
      p_user_id: userId,
      p_platform: platform || 'all'
    });
    
    const bestContentType = contentPerformance?.[0]?.content_type || 'text';
    const bestEngagement = contentPerformance?.[0]?.avg_engagement_rate || 0;
    
    // Extract common keywords and hashtags from top posts
    const commonKeywords = extractKeywords(topPosts || []);
    const commonHashtags = extractHashtags(topPosts || []);
    
    // Generate insights
    const insights = generateInsights(metrics, trends, contentPerformance, topPosts);
    
    // Get industry benchmarks
    const benchmarks = getIndustryBenchmarks(platform || 'all');
    const comparison = {
      engagementRate: {
        yours: metrics.avg_engagement_rate || 0,
        industry: benchmarks.avgEngagementRate,
        percentile: calculatePercentile(metrics.avg_engagement_rate || 0, benchmarks.distribution),
        status: (metrics.avg_engagement_rate || 0) > benchmarks.avgEngagementRate ? 'above' : 'below'
      },
      postFrequency: {
        yours: (metrics.total_posts || 0) / 30,
        industry: benchmarks.avgPostsPerDay,
        status: ((metrics.total_posts || 0) / 30) >= benchmarks.avgPostsPerDay ? 'good' : 'low'
      }
    };
    
    // Get posting trends
    const { data: trendData } = await supabase.rpc('get_posting_trends', {
      p_user_id: userId,
      p_days: 30
    });
    
    console.log('Analytics analysis complete');
    
    return new Response(
      JSON.stringify({
        success: true,
        overview: {
          totalPosts: metrics.total_posts || 0,
          totalImpressions: metrics.total_impressions || 0,
          totalEngagement: metrics.total_engagement || 0,
          avgEngagementRate: metrics.avg_engagement_rate || 0,
          totalLikes: metrics.total_likes || 0,
          totalShares: metrics.total_shares || 0,
          totalComments: metrics.total_comments || 0,
          totalClicks: metrics.total_clicks || 0
        },
        trends: {
          engagement: {
            change: trends.engagementTrend,
            direction: trends.engagementTrend > 0 ? 'up' : trends.engagementTrend < 0 ? 'down' : 'stable',
            label: Math.abs(trends.engagementTrend) > 10 ? (trends.engagementTrend > 0 ? 'Strong Growth' : 'Declining') : 'Stable'
          },
          impressions: {
            change: trends.impressionsTrend,
            direction: trends.impressionsTrend > 0 ? 'up' : trends.impressionsTrend < 0 ? 'down' : 'stable'
          },
          posts: {
            change: trends.postsTrend,
            direction: trends.postsTrend > 0 ? 'up' : trends.postsTrend < 0 ? 'down' : 'stable'
          }
        },
        contentAnalysis: {
          bestPerformingType: bestContentType,
          bestEngagementRate: bestEngagement,
          typeBreakdown: contentPerformance || [],
          successfulKeywords: commonKeywords.slice(0, 10),
          successfulHashtags: commonHashtags.slice(0, 5)
        },
        topPosts: (topPosts || []).slice(0, 5).map((p: any) => ({
          id: p.id,
          preview: (p.content || '').substring(0, 100) + (p.content?.length > 100 ? '...' : ''),
          platform: p.platform,
          engagement: p.engagement_total,
          rate: p.engagement_rate,
          date: p.published_at
        })),
        benchmarking: comparison,
        insights: insights,
        chartData: {
          timeline: trendData || []
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Analytics intelligence error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function calculatePercentageChange(oldVal: number, newVal: number): number {
  if (oldVal === 0) return newVal > 0 ? 100 : 0;
  return Math.round(((newVal - oldVal) / oldVal) * 100);
}

function extractKeywords(posts: any[]): string[] {
  const allWords = posts.flatMap(p => 
    (p.content || '').toLowerCase().match(/\b\w{4,}\b/g) || []
  );
  const frequency: Record<string, number> = {};
  allWords.forEach(word => {
    frequency[word] = (frequency[word] || 0) + 1;
  });
  return Object.entries(frequency)
    .sort((a, b) => b[1] - a[1])
    .map(([word]) => word);
}

function extractHashtags(posts: any[]): string[] {
  const allHashtags = posts.flatMap(p =>
    ((p.content || '').match(/#\w+/g) || []).map((h: string) => h.toLowerCase())
  );
  const frequency: Record<string, number> = {};
  allHashtags.forEach(tag => {
    frequency[tag] = (frequency[tag] || 0) + 1;
  });
  return Object.entries(frequency)
    .sort((a, b) => b[1] - a[1])
    .map(([tag]) => tag);
}

function generateInsights(metrics: any, trends: any, contentPerf: any[], topPosts: any[]): any[] {
  const insights = [];
  
  // Low engagement warning
  if ((metrics.avg_engagement_rate || 0) < 2.5) {
    insights.push({
      type: 'warning',
      priority: 'high',
      title: 'Low engagement rate',
      description: `Your ${(metrics.avg_engagement_rate || 0).toFixed(1)}% engagement is below average`,
      actions: [
        'Ask questions in your posts to encourage responses',
        'Use more visual content (images/videos)',
        'Post during peak audience activity times',
        'Include clear calls-to-action'
      ],
      expectedImpact: '+35% engagement'
    });
  } else if ((metrics.avg_engagement_rate || 0) > 4) {
    insights.push({
      type: 'success',
      priority: 'low',
      title: 'Excellent engagement',
      description: `Your ${(metrics.avg_engagement_rate || 0).toFixed(1)}% engagement is above average`,
      actions: ['Maintain current content strategy', 'Document what\'s working']
    });
  }
  
  // Declining engagement warning
  if (trends.engagementTrend < -10) {
    insights.push({
      type: 'warning',
      priority: 'high',
      title: 'Declining engagement',
      description: `Engagement down ${Math.abs(trends.engagementTrend)}% from previous period`,
      actions: [
        'Review recent content for changes',
        'Test new content formats',
        'Analyze competitor strategies',
        'Re-engage with your audience'
      ],
      expectedImpact: 'Recover lost engagement'
    });
  } else if (trends.engagementTrend > 10) {
    insights.push({
      type: 'success',
      priority: 'medium',
      title: 'Growing engagement',
      description: `Engagement up ${trends.engagementTrend}%`,
      actions: ['Double down on what\'s working', 'Increase posting frequency']
    });
  }
  
  // Low posting frequency
  if ((metrics.total_posts || 0) < 15) {
    insights.push({
      type: 'opportunity',
      priority: 'medium',
      title: 'Low posting frequency',
      description: 'Posting less than once every 2 days',
      actions: [
        'Increase to 1 post per day minimum',
        'Use AI to generate content faster',
        'Batch create content in advance',
        'Set up recurring posts'
      ],
      expectedImpact: '+50% reach'
    });
  }
  
  // Content type optimization
  if (contentPerf && contentPerf.length > 1) {
    const best = contentPerf[0];
    const bestType = best.content_type;
    const userCount = contentPerf.find((c: any) => c.content_type === bestType)?.post_count || 0;
    const totalPosts = metrics.total_posts || 1;
    
    if (userCount < totalPosts * 0.3) {
      insights.push({
        type: 'opportunity',
        priority: 'high',
        title: `${bestType} content performs best`,
        description: `Your ${bestType} posts get ${best.avg_engagement_rate.toFixed(1)}% engagement`,
        actions: [
          `Create more ${bestType} content`,
          `Aim for at least 30% ${bestType} posts`,
          'Test different formats within this type'
        ],
        expectedImpact: `+${Math.round((best.avg_engagement_rate / 2.5 - 1) * 100)}% engagement`
      });
    }
  }
  
  return insights.sort((a, b) => {
    const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });
}

function getIndustryBenchmarks(platform: string) {
  const benchmarks: Record<string, { avgEngagementRate: number; avgPostsPerDay: number; distribution: number[] }> = {
    twitter: { avgEngagementRate: 2.5, avgPostsPerDay: 1.2, distribution: [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 5] },
    linkedin: { avgEngagementRate: 3.5, avgPostsPerDay: 0.8, distribution: [1, 2, 2.5, 3, 3.5, 4, 4.5, 5, 6] },
    instagram: { avgEngagementRate: 4.5, avgPostsPerDay: 1.5, distribution: [2, 3, 3.5, 4, 4.5, 5, 5.5, 6, 7] },
    facebook: { avgEngagementRate: 2.0, avgPostsPerDay: 1.0, distribution: [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 5] }
  };
  return benchmarks[platform] || benchmarks.twitter;
}

function calculatePercentile(value: number, distribution: number[]): number {
  const sorted = [...distribution].sort((a, b) => a - b);
  const index = sorted.findIndex(v => v >= value);
  if (index === -1) return 100;
  return Math.round((index / sorted.length) * 100);
}
