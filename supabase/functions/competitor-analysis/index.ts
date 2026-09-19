import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { serviceClient } from "../_shared/supabase.ts";
import { requirePro } from "../_shared/require-pro.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const gate = await requirePro(req);
  if (gate instanceof Response) return gate;

  try {
    const { userId, action, competitorData, industry } = await req.json();
    
    const supabase = serviceClient();
    
    console.log('Competitor analysis action:', action, 'for user:', userId);
    
    if (action === 'add_competitor') {
      const { data: competitor, error } = await supabase
        .from('competitors')
        .insert({
          user_id: userId,
          name: competitorData.name,
          industry: competitorData.industry,
          website: competitorData.website,
          social_handles: competitorData.socialHandles || {},
          notes: competitorData.notes
        })
        .select()
        .single();
      
      if (error) throw error;
      
      return new Response(
        JSON.stringify({ success: true, competitor }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (action === 'get_competitors') {
      const { data: competitors } = await supabase
        .from('competitors')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      
      return new Response(
        JSON.stringify({ success: true, competitors: competitors || [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (action === 'industry_comparison') {
      const { data: comparison } = await supabase
        .rpc('compare_to_industry', {
          p_user_id: userId,
          p_industry: industry,
          p_platform: 'all'
        });
      
      const { data: insights } = await supabase
        .rpc('generate_competitive_insights', {
          p_user_id: userId,
          p_industry: industry
        });
      
      const { data: userMetrics } = await supabase
        .rpc('get_analytics_summary', {
          p_user_id: userId,
          p_date_from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          p_date_to: new Date().toISOString(),
          p_platform: 'all'
        });
      
      const gapAnalysis = generateGapAnalysis(comparison || []);
      const opportunities = identifyOpportunities(comparison || [], industry);
      
      return new Response(
        JSON.stringify({
          success: true,
          comparison: comparison || [],
          insights: insights || [],
          gapAnalysis,
          opportunities,
          userMetrics: userMetrics?.[0]
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (action === 'analyze_competitor') {
      const simulatedAnalysis = simulateCompetitorAnalysis(
        competitorData.competitor,
        industry
      );
      
      await supabase
        .from('competitor_benchmarks')
        .insert({
          user_id: userId,
          competitor_id: competitorData.competitorId,
          benchmark_date: new Date().toISOString().split('T')[0],
          platform: competitorData.platform || 'all',
          avg_posts_per_week: simulatedAnalysis.postsPerWeek,
          avg_engagement_rate: simulatedAnalysis.engagementRate,
          avg_post_length: simulatedAnalysis.avgLength,
          content_type_breakdown: simulatedAnalysis.contentTypes,
          top_hashtags: simulatedAnalysis.topHashtags,
          strengths: simulatedAnalysis.strengths,
          weaknesses: simulatedAnalysis.weaknesses
        });
      
      return new Response(
        JSON.stringify({ success: true, analysis: simulatedAnalysis }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (action === 'competitive_report') {
      const { data: competitors } = await supabase
        .from('competitors')
        .select('*, competitor_benchmarks(*)')
        .eq('user_id', userId)
        .eq('is_active', true);
      
      const { data: userComparison } = await supabase
        .rpc('compare_to_industry', {
          p_user_id: userId,
          p_industry: industry,
          p_platform: 'all'
        });
      
      const report = generateCompetitiveReport(
        competitors || [],
        userComparison || [],
        industry
      );
      
      return new Response(
        JSON.stringify({ success: true, report }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    throw new Error('Invalid action');
    
  } catch (error) {
    console.error('Competitor analysis error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function generateGapAnalysis(comparison: Array<{ metric: string; user_value: number; industry_avg: number; status: string }>) {
  const gaps: Array<{
    metric: string;
    yourValue: number;
    industryAvg: number;
    gap: number;
    percentGap: number;
    severity: string;
    recommendation: string;
  }> = [];
  
  comparison.forEach(metric => {
    if (metric.status === 'below') {
      const gap = metric.industry_avg - metric.user_value;
      const percentGap = Math.round((gap / metric.industry_avg) * 100);
      
      gaps.push({
        metric: metric.metric.replace('_', ' '),
        yourValue: metric.user_value,
        industryAvg: metric.industry_avg,
        gap: gap,
        percentGap: percentGap,
        severity: percentGap > 30 ? 'high' : percentGap > 15 ? 'medium' : 'low',
        recommendation: getGapRecommendation(metric.metric, percentGap)
      });
    }
  });
  
  return gaps.sort((a, b) => b.percentGap - a.percentGap);
}

function getGapRecommendation(metric: string, percentGap: number): string {
  const recommendations: Record<string, string> = {
    engagement_rate: percentGap > 30 
      ? 'Critical: Revamp content strategy. Focus on video and interactive content.'
      : 'Improve: Add more questions and CTAs to posts.',
    posts_per_week: percentGap > 30
      ? 'Critical: Double your posting frequency immediately.'
      : 'Improve: Add 2-3 more posts per week.'
  };
  
  return recommendations[metric] || 'Review and optimize this metric.';
}

function identifyOpportunities(comparison: Array<{ metric: string; user_value: number; industry_avg: number; status: string }>, industry: string) {
  const opportunities: Array<{
    type: string;
    title: string;
    description: string;
    actions: string[];
    potentialImpact: string;
  }> = [];
  
  const engagementMetric = comparison.find(m => m.metric === 'engagement_rate');
  
  // Industry-specific base opportunities
  const industryOpportunities: Record<string, Array<{
    type: string;
    title: string;
    description: string;
    actions: string[];
    potentialImpact: string;
  }>> = {
    technology: [
      {
        type: 'content_strategy',
        title: 'Technical Thought Leadership',
        description: 'Technology audiences value in-depth technical content and industry insights',
        actions: [
          'Create technical deep-dive blog posts and threads',
          'Share code snippets and development tips',
          'Host or participate in tech discussions and AMAs',
          'Create tutorial videos and how-to guides'
        ],
        potentialImpact: 'High'
      },
      {
        type: 'engagement_focus',
        title: 'Developer Community Building',
        description: 'Tech communities respond well to authentic developer engagement',
        actions: [
          'Engage with open source projects',
          'Share behind-the-scenes development updates',
          'Participate in tech Twitter/LinkedIn discussions',
          'Create developer-focused content series'
        ],
        potentialImpact: 'High'
      }
    ],
    ecommerce: [
      {
        type: 'conversion_optimization',
        title: 'Product-Focused Content Strategy',
        description: 'E-commerce succeeds with visual product showcases and social proof',
        actions: [
          'Create high-quality product photography and videos',
          'Share user-generated content and reviews',
          'Implement shoppable posts where available',
          'Run limited-time offers with countdown urgency'
        ],
        potentialImpact: 'High'
      },
      {
        type: 'customer_engagement',
        title: 'Customer Story Campaigns',
        description: 'Showcase customer transformations and success stories',
        actions: [
          'Feature customer testimonials weekly',
          'Create before/after content for products',
          'Highlight customer unboxing experiences',
          'Build a brand ambassador program'
        ],
        potentialImpact: 'Medium'
      }
    ],
    saas: [
      {
        type: 'educational_content',
        title: 'Educational Content Marketing',
        description: 'SaaS audiences prefer educational and value-driven content',
        actions: [
          'Create detailed product tutorials and demos',
          'Share industry reports and data insights',
          'Host webinars and live Q&A sessions',
          'Build a knowledge base and share excerpts'
        ],
        potentialImpact: 'High'
      },
      {
        type: 'social_proof',
        title: 'Case Study Showcases',
        description: 'B2B buyers trust case studies and ROI demonstrations',
        actions: [
          'Publish monthly customer success stories',
          'Share specific metrics and ROI examples',
          'Create comparison content vs competitors',
          'Feature integration partner spotlights'
        ],
        potentialImpact: 'High'
      }
    ],
    marketing: [
      {
        type: 'visual_excellence',
        title: 'Visual Content Mastery',
        description: 'Marketing industry expects cutting-edge visual content',
        actions: [
          'Invest in premium graphic design and motion',
          'Create Instagram-worthy branded content',
          'Use trending formats like Reels and TikTok',
          'Develop a consistent visual brand system'
        ],
        potentialImpact: 'High'
      },
      {
        type: 'trend_leadership',
        title: 'Trend Analysis & Insights',
        description: 'Position as a go-to source for marketing trends',
        actions: [
          'Share weekly marketing trend updates',
          'Analyze viral campaigns and their success factors',
          'Create original research and reports',
          'Offer predictions and forward-looking insights'
        ],
        potentialImpact: 'Medium'
      }
    ]
  };
  
  // Add strength-based opportunity if user performs above average
  if (engagementMetric && engagementMetric.status === 'above') {
    opportunities.push({
      type: 'leverage_strength',
      title: 'Strong Engagement - Capitalize on it',
      description: `Your ${engagementMetric.user_value.toFixed(1)}% engagement is ${Math.round((engagementMetric.user_value / engagementMetric.industry_avg - 1) * 100)}% above ${industry} industry average`,
      actions: [
        'Increase posting frequency to maximize reach',
        'Repurpose top-performing content across platforms',
        'Create content series based on what works',
        'Cross-promote on other platforms'
      ],
      potentialImpact: 'High'
    });
  }
  
  // Add industry-specific opportunities
  const industrySpecific = industryOpportunities[industry] || industryOpportunities['technology'];
  opportunities.push(...industrySpecific);
  
  // Add timing optimization specific to industry
  const timingDescriptions: Record<string, string> = {
    technology: 'Tech audiences are most active during weekday mornings and late evenings',
    ecommerce: 'Shoppers browse most during lunch breaks and evening hours',
    saas: 'B2B decision makers engage most on Tuesday-Thursday mornings',
    marketing: 'Marketing professionals are active across various peak social hours'
  };
  
  opportunities.push({
    type: 'timing_optimization',
    title: 'Optimal Posting Times',
    description: timingDescriptions[industry] || 'Optimize your posting schedule for maximum engagement',
    actions: [
      'Analyze your audience activity patterns',
      'Use ML-powered optimal time predictions',
      'Test different posting windows',
      'Enable auto-scheduling for best times'
    ],
    potentialImpact: 'Medium'
  });
  
  return opportunities;
}

function simulateCompetitorAnalysis(competitor: string, industry: string) {
  const baseEngagement: Record<string, number> = {
    technology: 2.8,
    ecommerce: 4.2,
    saas: 3.5,
    marketing: 4.0
  };
  
  const variation = (Math.random() - 0.5) * 1.5;
  
  return {
    postsPerWeek: Math.round(7 + (Math.random() * 6)),
    engagementRate: parseFloat((( baseEngagement[industry] || 3.0) + variation).toFixed(2)),
    avgLength: Math.round(120 + (Math.random() * 100)),
    contentTypes: {
      video: parseFloat((30 + Math.random() * 20).toFixed(1)),
      image: parseFloat((40 + Math.random() * 20).toFixed(1)),
      text: parseFloat((30 + Math.random() * 10).toFixed(1))
    },
    topHashtags: ['#' + industry, '#marketing', '#business', '#growth', '#tips'],
    strengths: [
      'High video content usage',
      'Consistent posting schedule',
      'Strong audience engagement'
    ],
    weaknesses: [
      'Limited hashtag variety',
      'Inconsistent posting times',
      'Low interaction rate'
    ]
  };
}

function generateCompetitiveReport(
  competitors: Array<{ name: string; competitor_benchmarks?: Array<Record<string, unknown>> }>,
  userComparison: Array<{ metric: string; user_value: number; industry_avg: number; status: string; percentile: number }>,
  industry: string
) {
  const competitorCount = competitors.length;
  
  const userMetrics: Record<string, { value: number; industryAvg: number; status: string; percentile: number }> = {};
  userComparison.forEach(metric => {
    userMetrics[metric.metric] = {
      value: metric.user_value,
      industryAvg: metric.industry_avg,
      status: metric.status,
      percentile: metric.percentile
    };
  });
  
  const marketPosition = calculateMarketPosition(userMetrics);
  
  const strategicRecommendations = generateStrategicRecommendations(
    userMetrics,
    industry
  );
  
  return {
    summary: {
      competitorsTracked: competitorCount,
      yourPosition: marketPosition,
      industry: industry,
      generatedDate: new Date().toISOString()
    },
    yourMetrics: userMetrics,
    marketPosition: marketPosition,
    recommendations: strategicRecommendations,
    competitorBreakdown: competitors.slice(0, 5).map(c => ({
      name: c.name,
      latestBenchmark: c.competitor_benchmarks?.[0],
      tracked: c.competitor_benchmarks?.length || 0
    }))
  };
}

function calculateMarketPosition(userMetrics: Record<string, { status: string }>) {
  const engagementStatus = userMetrics.engagement_rate?.status;
  const frequencyStatus = userMetrics.posts_per_week?.status;
  
  if (engagementStatus === 'above' && frequencyStatus === 'above') {
    return {
      tier: 'Leader',
      description: 'You are outperforming industry averages',
      color: 'green'
    };
  } else if (engagementStatus === 'above' || frequencyStatus === 'above') {
    return {
      tier: 'Challenger',
      description: 'Strong performance with room to grow',
      color: 'blue'
    };
  } else {
    return {
      tier: 'Follower',
      description: 'Opportunity to improve and catch up',
      color: 'yellow'
    };
  }
}

function generateStrategicRecommendations(
  userMetrics: Record<string, { status: string }>,
  industry: string
) {
  const recommendations: Array<{
    priority: string;
    category: string;
    action: string;
    steps: string[];
    timeline: string;
    expectedImpact: string;
  }> = [];
  
  if (userMetrics.engagement_rate?.status === 'below') {
    recommendations.push({
      priority: 'High',
      category: 'Engagement',
      action: 'Increase engagement rate to match industry standard',
      steps: [
        'Analyze top-performing competitor content',
        'Implement video content strategy',
        'Add CTAs and questions to all posts',
        'Test different content formats'
      ],
      timeline: '30 days',
      expectedImpact: '+25% engagement'
    });
  }
  
  if (userMetrics.posts_per_week?.status === 'below') {
    recommendations.push({
      priority: 'Medium',
      category: 'Frequency',
      action: 'Increase posting frequency',
      steps: [
        'Use content calendar to plan ahead',
        'Repurpose existing content',
        'Leverage AI to generate posts faster',
        'Set up auto-scheduling'
      ],
      timeline: '14 days',
      expectedImpact: '+40% reach'
    });
  }
  
  recommendations.push({
    priority: 'Medium',
    category: 'Competitive Intelligence',
    action: 'Monitor competitor strategies monthly',
    steps: [
      'Track competitor posting patterns',
      'Analyze their top-performing content',
      'Identify content gaps to exploit',
      'Adapt winning strategies to your brand'
    ],
    timeline: 'Ongoing',
    expectedImpact: 'Sustained competitive advantage'
  });
  
  return recommendations;
}
