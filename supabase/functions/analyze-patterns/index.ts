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
    const { userId, platform } = await req.json();
    
    const supabase = serviceClient();
    
    console.log('Analyzing content patterns for user:', userId);
    
    // Run comprehensive pattern analysis
    const { data: patterns, error: patternsError } = await supabase
      .rpc('analyze_content_patterns_comprehensive', {
        p_user_id: userId,
        p_platform: platform || 'all'
      });
    
    if (patternsError) {
      console.error('Pattern analysis error:', patternsError);
      throw patternsError;
    }
    
    // Get top performing hashtags
    const { data: topHashtags } = await supabase
      .rpc('get_top_performing_elements', {
        p_user_id: userId,
        p_element_type: 'hashtags',
        p_limit: 10
      });
    
    // Get top posts
    const { data: topPosts } = await supabase
      .rpc('get_top_posts_analytics', {
        p_user_id: userId,
        p_limit: 5,
        p_platform: platform || 'all'
      });
    
    // Group patterns by type
    const patternsByType: Record<string, Array<{
      value: string;
      postCount: number;
      avgEngagement: number;
      score: number;
    }>> = {};
    
    patterns?.forEach((p: { pattern_type: string; pattern_value: string; post_count: number; avg_engagement_rate: number; performance_score: number }) => {
      if (!patternsByType[p.pattern_type]) {
        patternsByType[p.pattern_type] = [];
      }
      patternsByType[p.pattern_type].push({
        value: p.pattern_value,
        postCount: Number(p.post_count),
        avgEngagement: Number(p.avg_engagement_rate),
        score: Number(p.performance_score)
      });
    });
    
    // Generate insights
    const insights = generatePatternInsights(patternsByType, topHashtags);
    
    // Generate recommendations
    const recommendations = generateContentRecommendations(patternsByType, topHashtags);
    
    return new Response(
      JSON.stringify({
        success: true,
        patterns: patternsByType,
        topElements: {
          hashtags: topHashtags || []
        },
        topPosts: (topPosts || []).map((p: { id: string; content: string; platform: string; engagement_rate: number; published_at: string }) => ({
          id: p.id,
          preview: (p.content || '').substring(0, 150) + '...',
          platform: p.platform,
          engagementRate: p.engagement_rate,
          date: p.published_at
        })),
        insights: insights,
        recommendations: recommendations,
        summary: {
          totalPatterns: patterns?.length || 0,
          dataPoints: patterns?.reduce((sum: number, p: { post_count: number }) => sum + Number(p.post_count), 0) || 0,
          confidence: (patterns?.length || 0) >= 20 ? 'high' : (patterns?.length || 0) >= 10 ? 'medium' : 'low'
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error: unknown) {
    console.error('Pattern analysis error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

interface PatternData {
  value: string;
  postCount: number;
  avgEngagement: number;
  score: number;
}

interface HashtagData {
  element: string;
  usage_count: number;
  avg_engagement: number;
}

function generatePatternInsights(
  patterns: Record<string, PatternData[]>, 
  hashtags: HashtagData[] | null
) {
  const insights: Array<{
    type: string;
    title: string;
    description: string;
    recommendation: string;
    impact: string;
  }> = [];
  
  // Content type insights
  if (patterns.content_type && patterns.content_type.length > 0) {
    const sorted = [...patterns.content_type].sort((a, b) => b.avgEngagement - a.avgEngagement);
    const best = sorted[0];
    const worst = sorted[sorted.length - 1];
    
    if (best && worst && best.avgEngagement > worst.avgEngagement * 1.3) {
      insights.push({
        type: 'content_type',
        title: `${capitalizeFirst(best.value)} content performs ${Math.round((best.avgEngagement / worst.avgEngagement - 1) * 100)}% better`,
        description: `Your ${best.value} posts average ${best.avgEngagement.toFixed(1)}% engagement vs ${worst.avgEngagement.toFixed(1)}% for ${worst.value}`,
        recommendation: `Create more ${best.value} content to maximize engagement`,
        impact: 'high'
      });
    }
  }
  
  // Content length insights
  if (patterns.content_length && patterns.content_length.length > 0) {
    const sorted = [...patterns.content_length].sort((a, b) => b.avgEngagement - a.avgEngagement);
    const best = sorted[0];
    
    insights.push({
      type: 'content_length',
      title: `${capitalizeFirst(best.value)} posts work best for you`,
      description: `${capitalizeFirst(best.value)}-length posts get ${best.avgEngagement.toFixed(1)}% engagement`,
      recommendation: `Keep your posts ${best.value} (${getLengthRange(best.value)}) for best results`,
      impact: 'medium'
    });
  }
  
  // Question insights
  if (patterns.has_question && patterns.has_question.length > 0) {
    const withQuestion = patterns.has_question.find(p => p.value === 'yes');
    const withoutQuestion = patterns.has_question.find(p => p.value === 'no');
    
    if (withQuestion && withoutQuestion && withoutQuestion.avgEngagement > 0) {
      const boost = ((withQuestion.avgEngagement / withoutQuestion.avgEngagement - 1) * 100);
      if (boost > 15) {
        insights.push({
          type: 'engagement_driver',
          title: `Questions boost engagement by ${Math.round(boost)}%`,
          description: `Posts with questions get ${withQuestion.avgEngagement.toFixed(1)}% vs ${withoutQuestion.avgEngagement.toFixed(1)}% without`,
          recommendation: 'End your posts with engaging questions to drive interaction',
          impact: 'high'
        });
      }
    }
  }
  
  // Posting time insights
  if (patterns.posting_time && patterns.posting_time.length > 0) {
    const sorted = [...patterns.posting_time].sort((a, b) => b.avgEngagement - a.avgEngagement);
    const best = sorted[0];
    
    insights.push({
      type: 'timing',
      title: `${capitalizeFirst(best.value)} is your best posting time`,
      description: `${capitalizeFirst(best.value)} posts get ${best.avgEngagement.toFixed(1)}% engagement`,
      recommendation: `Schedule more posts in the ${best.value} for better performance`,
      impact: 'medium'
    });
  }
  
  // Hashtag insights
  if (hashtags && hashtags.length > 0) {
    const topHashtag = hashtags[0];
    insights.push({
      type: 'hashtags',
      title: `${topHashtag.element} is your top-performing hashtag`,
      description: `Used ${topHashtag.usage_count} times with ${Number(topHashtag.avg_engagement).toFixed(1)}% avg engagement`,
      recommendation: `Continue using ${topHashtag.element} and similar hashtags`,
      impact: 'low'
    });
  }
  
  return insights;
}

function generateContentRecommendations(
  patterns: Record<string, PatternData[]>, 
  hashtags: HashtagData[] | null
) {
  const recommendations: Array<{
    action: string;
    reason: string;
    target: string;
    expectedImpact: string;
  }> = [];
  
  // Video content recommendation
  if (patterns.content_type) {
    const videoContent = patterns.content_type.find(p => p.value === 'video');
    const totalPosts = patterns.content_type.reduce((sum, p) => sum + p.postCount, 0);
    
    if (videoContent && videoContent.avgEngagement > 4 && videoContent.postCount < totalPosts * 0.3) {
      recommendations.push({
        action: 'Increase video content',
        reason: `Video gets ${videoContent.avgEngagement.toFixed(1)}% engagement but only ${Math.round((videoContent.postCount / totalPosts) * 100)}% of your posts`,
        target: 'Aim for 30% video content',
        expectedImpact: '+25% overall engagement'
      });
    }
  }
  
  // Question recommendation
  if (patterns.has_question) {
    const withQuestion = patterns.has_question.find(p => p.value === 'yes');
    const totalPosts = patterns.has_question.reduce((sum, p) => sum + p.postCount, 0);
    
    if (withQuestion && withQuestion.postCount < totalPosts * 0.5) {
      recommendations.push({
        action: 'Ask more questions',
        reason: 'Only ' + Math.round((withQuestion.postCount / totalPosts) * 100) + '% of your posts include questions',
        target: 'Include questions in 50%+ of posts',
        expectedImpact: '+20% engagement'
      });
    }
  }
  
  // Hashtag recommendation
  if (hashtags && hashtags.length >= 3) {
    recommendations.push({
      action: 'Use proven hashtags',
      reason: `You have ${hashtags.length} high-performing hashtags`,
      target: `Focus on: ${hashtags.slice(0, 3).map(h => h.element).join(', ')}`,
      expectedImpact: '+15% reach'
    });
  }
  
  return recommendations;
}

function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).replace('_', ' ');
}

function getLengthRange(lengthType: string): string {
  const ranges: Record<string, string> = {
    short: 'under 100 characters',
    medium: '100-200 characters',
    long: 'over 200 characters'
  };
  return ranges[lengthType] || lengthType;
}
