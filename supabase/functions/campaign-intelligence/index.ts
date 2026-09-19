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
    const { userId, action, campaignData, templateId } = await req.json();
    
    const supabase = serviceClient();
    
    console.log('Campaign intelligence action:', action, 'for user:', userId);
    
    if (action === 'get_templates') {
      const { data: templates } = await supabase
        .from('campaign_templates')
        .select('*')
        .order('category', { ascending: true });
      
      return new Response(
        JSON.stringify({ success: true, templates: templates || [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (action === 'generate_strategy') {
      const strategy = await generateCampaignStrategy(userId, campaignData, supabase);
      
      return new Response(
        JSON.stringify({ success: true, strategy }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (action === 'create_campaign') {
      const { data: campaign, error } = await supabase
        .from('campaigns')
        .insert({
          user_id: userId,
          name: campaignData.name,
          description: campaignData.description,
          start_date: campaignData.startDate,
          end_date: campaignData.endDate,
          status: 'active',
          goals: campaignData.goals,
          platform: campaignData.platforms?.[0] || 'all',
          total_budget: campaignData.budget || 0
        })
        .select()
        .single();
      
      if (error) {
        console.error('Campaign creation error:', error);
        throw error;
      }
      
      let contentPlan: any[] = [];
      if (campaignData.autoGenerateContent && campaignData.totalPosts > 0) {
        contentPlan = await generateContentPlan(
          userId,
          campaign.id,
          campaignData,
          supabase
        );
      }
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          campaign, 
          contentPlan,
          message: contentPlan.length > 0 
            ? `Campaign created with ${contentPlan.length} posts scheduled`
            : 'Campaign created successfully'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (action === 'get_performance') {
      const { data: performance } = await supabase
        .rpc('calculate_campaign_performance', {
          p_campaign_id: campaignData.campaignId
        });
      
      const { data: dailyTracking } = await supabase
        .from('campaign_performance_tracking')
        .select('*')
        .eq('campaign_id', campaignData.campaignId)
        .order('tracked_date', { ascending: true });
      
      const { data: campaign } = await supabase
        .from('campaigns')
        .select('*')
        .eq('id', campaignData.campaignId)
        .single();
      
      const analysis = analyzeCampaignPerformance(
        performance?.[0],
        campaign,
        dailyTracking || []
      );
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          performance: performance?.[0],
          dailyTracking: dailyTracking || [],
          analysis
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ========== NEW INTELLIGENCE ACTIONS ==========

    if (action === 'get_platform_insights') {
      const platform = campaignData.platform || 'instagram';
      const niche = campaignData.niche || 'ecommerce';

      // Get niche strategy
      const { data: nicheStrategy } = await supabase
        .from('niche_strategies')
        .select('*')
        .eq('platform', platform)
        .eq('niche', niche)
        .single();

      // Get platform benchmarks
      const { data: benchmarks } = await supabase
        .from('platform_niche_benchmarks')
        .select('*')
        .eq('platform', platform)
        .eq('niche', niche)
        .single();

      // Get user's historical performance on this platform
      const { data: userPerformance } = await supabase
        .from('campaigns')
        .select('*, scheduled_posts(impressions, engagements, status)')
        .eq('user_id', userId)
        .eq('platform', platform)
        .eq('status', 'completed')
        .limit(10);

      const platformInsights = generatePlatformInsights(
        platform,
        nicheStrategy,
        benchmarks,
        userPerformance || []
      );

      return new Response(
        JSON.stringify({ success: true, insights: platformInsights }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'get_niche_recommendations') {
      const niche = campaignData.niche || 'ecommerce';

      // Get all strategies for this niche
      const { data: strategies } = await supabase
        .from('niche_strategies')
        .select('*')
        .eq('niche', niche)
        .order('priority_score', { ascending: false });

      // Get benchmarks for comparison
      const { data: benchmarks } = await supabase
        .from('platform_niche_benchmarks')
        .select('*')
        .eq('niche', niche);

      // Get user's best performing platform
      const { data: userCampaigns } = await supabase
        .from('campaigns')
        .select('platform, spend')
        .eq('user_id', userId)
        .eq('status', 'completed');

      const recommendations = generateNicheRecommendations(
        niche,
        strategies || [],
        benchmarks || [],
        userCampaigns || [],
        campaignData.goals || {}
      );

      return new Response(
        JSON.stringify({ success: true, recommendations }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'get_campaign_learnings') {
      // Get user's campaign learnings
      const { data: learnings } = await supabase
        .from('campaigns_learning')
        .select('*')
        .eq('user_id', userId)
        .order('performance_impact', { ascending: false });

      // Get platform-specific patterns
      const platformPatterns: Record<string, any[]> = {};
      for (const learning of learnings || []) {
        if (!platformPatterns[learning.platform]) {
          platformPatterns[learning.platform] = [];
        }
        platformPatterns[learning.platform].push(learning);
      }

      // Generate insights
      const insights = generateLearningInsights(learnings || [], platformPatterns);

      return new Response(
        JSON.stringify({ success: true, learnings: learnings || [], insights }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'analyze_campaign') {
      const campaignId = campaignData.campaignId;

      // Get campaign with posts
      const { data: campaign } = await supabase
        .from('campaigns')
        .select('*, scheduled_posts(*)')
        .eq('id', campaignId)
        .single();

      if (!campaign) throw new Error('Campaign not found');

      const posts = campaign.scheduled_posts || [];
      const publishedPosts = posts.filter((p: any) => p.status === 'published');

      // Analyze what worked
      const analysis = analyzeWhatWorked(publishedPosts, campaign);

      // Generate learnings and save them
      const learningsToSave = generateCampaignLearnings(
        userId,
        campaignId,
        campaign.platform,
        campaign.niche,
        analysis
      );

      // Save learnings
      if (learningsToSave.length > 0) {
        await supabase.from('campaigns_learning').insert(learningsToSave);
      }

      // Update campaign with post-campaign learnings
      await supabase
        .from('campaigns')
        .update({
          post_campaign_learnings: analysis,
          actual_vs_predicted: calculateActualVsPredicted(campaign, publishedPosts)
        })
        .eq('id', campaignId);

      return new Response(
        JSON.stringify({ 
          success: true, 
          analysis, 
          learningsSaved: learningsToSave.length 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'predict_performance') {
      const platform = campaignData.platform || 'instagram';
      const niche = campaignData.niche || 'ecommerce';

      // Get benchmarks
      const { data: benchmarks } = await supabase
        .from('platform_niche_benchmarks')
        .select('*')
        .eq('platform', platform)
        .eq('niche', niche)
        .single();

      // Get user's historical performance
      const { data: userLearnings } = await supabase
        .from('campaigns_learning')
        .select('*')
        .eq('user_id', userId)
        .eq('platform', platform);

      // Get similar past campaigns
      const { data: pastCampaigns } = await supabase
        .from('campaigns')
        .select('*, scheduled_posts(impressions, engagements)')
        .eq('user_id', userId)
        .eq('platform', platform)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(5);

      const prediction = predictCampaignPerformance(
        campaignData,
        benchmarks,
        userLearnings || [],
        pastCampaigns || []
      );

      return new Response(
        JSON.stringify({ success: true, prediction }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'get_optimization_suggestions') {
      const campaignId = campaignData.campaignId;

      // Get campaign with current performance
      const { data: campaign } = await supabase
        .from('campaigns')
        .select('*, scheduled_posts(*)')
        .eq('id', campaignId)
        .single();

      if (!campaign) throw new Error('Campaign not found');

      // Get user's learnings
      const { data: learnings } = await supabase
        .from('campaigns_learning')
        .select('*')
        .eq('user_id', userId)
        .eq('platform', campaign.platform)
        .order('performance_impact', { ascending: false })
        .limit(10);

      // Get platform best practices
      const { data: nicheStrategy } = await supabase
        .from('niche_strategies')
        .select('*')
        .eq('platform', campaign.platform)
        .eq('niche', campaign.niche || 'ecommerce')
        .single();

      const suggestions = generateOptimizationSuggestions(
        campaign,
        learnings || [],
        nicheStrategy
      );

      return new Response(
        JSON.stringify({ success: true, suggestions }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'generate_ai_strategy') {
      const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
      
      if (!LOVABLE_API_KEY) {
        // Return fallback strategy
        const fallbackStrategy = generateFallbackAIStrategy(campaignData);
        return new Response(
          JSON.stringify({ success: true, strategy: fallbackStrategy }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get user context
      const { data: userLearnings } = await supabase
        .from('campaigns_learning')
        .select('*')
        .eq('user_id', userId)
        .order('performance_impact', { ascending: false })
        .limit(20);

      const { data: nicheStrategy } = await supabase
        .from('niche_strategies')
        .select('*')
        .eq('platform', campaignData.platform || 'instagram')
        .eq('niche', campaignData.niche || 'ecommerce')
        .single();

      const context = buildAIStrategyContext(campaignData, userLearnings || [], nicheStrategy);

      const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-3-flash-preview',
          messages: [
            {
              role: 'system',
              content: `You are an expert social media campaign strategist. Generate comprehensive, actionable campaign strategies based on the user's business niche, target platform, and historical performance data.`
            },
            {
              role: 'user',
              content: context
            }
          ],
          tools: [
            {
              type: 'function',
              function: {
                name: 'generate_campaign_strategy',
                description: 'Generate a comprehensive campaign strategy',
                parameters: {
                  type: 'object',
                  properties: {
                    overview: {
                      type: 'object',
                      properties: {
                        objective: { type: 'string' },
                        duration: { type: 'string' },
                        estimatedReach: { type: 'number' },
                        confidenceLevel: { type: 'string' }
                      }
                    },
                    weeklyThemes: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          week: { type: 'number' },
                          theme: { type: 'string' },
                          posts: { type: 'number' },
                          contentTypes: { type: 'array', items: { type: 'string' } }
                        }
                      }
                    },
                    contentMix: {
                      type: 'object',
                      properties: {
                        video: { type: 'number' },
                        image: { type: 'number' },
                        carousel: { type: 'number' },
                        text: { type: 'number' }
                      }
                    },
                    platformTactics: {
                      type: 'array',
                      items: { type: 'string' }
                    },
                    expectedBenchmarks: {
                      type: 'object',
                      properties: {
                        engagementRate: { type: 'number' },
                        impressions: { type: 'number' },
                        reach: { type: 'number' }
                      }
                    },
                    keyActions: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          action: { type: 'string' },
                          priority: { type: 'string' },
                          expectedImpact: { type: 'string' }
                        }
                      }
                    }
                  },
                  required: ['overview', 'weeklyThemes', 'contentMix', 'platformTactics', 'keyActions']
                }
              }
            }
          ],
          tool_choice: { type: 'function', function: { name: 'generate_campaign_strategy' } }
        }),
      });

      if (!aiResponse.ok) {
        const fallbackStrategy = generateFallbackAIStrategy(campaignData);
        return new Response(
          JSON.stringify({ success: true, strategy: fallbackStrategy }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const aiData = await aiResponse.json();
      const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
      
      if (toolCall?.function?.arguments) {
        const strategy = JSON.parse(toolCall.function.arguments);
        return new Response(
          JSON.stringify({ success: true, strategy }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const fallbackStrategy = generateFallbackAIStrategy(campaignData);
      return new Response(
        JSON.stringify({ success: true, strategy: fallbackStrategy }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'compare_platforms') {
      // Get performance across all platforms
      const { data: campaigns } = await supabase
        .from('campaigns')
        .select('platform, spend, status, scheduled_posts(impressions, engagements)')
        .eq('user_id', userId)
        .eq('status', 'completed');

      const { data: benchmarks } = await supabase
        .from('platform_niche_benchmarks')
        .select('*')
        .eq('niche', campaignData.niche || 'ecommerce');

      const comparison = comparePlatformPerformance(campaigns || [], benchmarks || []);

      return new Response(
        JSON.stringify({ success: true, comparison }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    throw new Error('Invalid action');
    
  } catch (error) {
    console.error('Campaign intelligence error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

interface CampaignData {
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
  platforms?: string[];
  goals?: Record<string, number>;
  budget?: number;
  objective?: string;
  postsPerDay?: number;
  contentTypes?: string[];
  hashtags?: string;
  targetImpressions?: number;
  targetReach?: number;
  targetEngagement?: number;
  targetClicks?: number;
  templateId?: string;
}

async function generateCampaignStrategy(userId: string, campaignData: CampaignData, supabase: any) {
  // Get user's performance patterns
  const { data: strategyData } = await supabase
    .rpc('get_campaign_strategy_data', {
      p_user_id: userId,
      p_platform: campaignData.platforms?.[0] || 'all'
    });
  
  // Get user's top performing content patterns
  const { data: contentPatterns } = await supabase
    .from('content_performance_patterns')
    .select('*')
    .eq('user_id', userId)
    .order('avg_engagement_rate', { ascending: false })
    .limit(10);
  
  // Get user's best performing hashtags
  const { data: topHashtags } = await supabase
    .rpc('get_top_performing_elements', {
      p_user_id: userId,
      p_element_type: 'hashtags',
      p_limit: 10
    });
  
  // Get optimal time slots
  const { data: optimalSlots } = await supabase
    .rpc('get_optimal_time_slots', {
      p_user_id: userId,
      p_platform: campaignData.platforms?.[0] || 'all',
      p_limit: 5
    });
  
  const userData = strategyData?.[0] || {
    best_content_type: 'image',
    best_content_length: 'medium',
    best_posting_time: 'afternoon',
    avg_engagement_rate: 2.5,
    total_posts_analyzed: 0
  };
  
  // Calculate campaign duration
  const startDate = new Date(campaignData.startDate);
  const endDate = new Date(campaignData.endDate);
  const duration = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  
  // Use user-specified posts per day or calculate based on campaign type
  const postsPerDay = campaignData.postsPerDay || getPostsPerDayByObjective(campaignData.objective || 'awareness');
  const totalPosts = Math.ceil(duration * postsPerDay);
  
  // Generate content themes based on objective AND content types selected
  const themes = getContentThemesEnhanced(
    campaignData.objective || 'awareness',
    campaignData.contentTypes || ['images', 'text'],
    campaignData.name
  );
  
  // Build optimal days from user's actual performance data
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const bestDays: string[] = optimalSlots?.length > 0
    ? [...new Set(optimalSlots.slice(0, 5).map((s: any) => dayNames[s.day_of_week]))] as string[]
    : ['Tuesday', 'Wednesday', 'Thursday'];
  
  // Determine best posting times from user data
  const bestTimeSlots = optimalSlots?.slice(0, 3).map((s: any) => {
    const hour = s.hour_of_day;
    if (hour >= 6 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 17) return 'afternoon';
    if (hour >= 17 && hour < 21) return 'evening';
    return 'night';
  }) || ['afternoon'];
  const primaryTimeSlot = bestTimeSlots[0] || userData.best_posting_time;
  
  // Calculate budget-based recommendations
  const hasBudget = (campaignData.budget || 0) > 0;
  const budgetPerPost = hasBudget ? (campaignData.budget || 0) / totalPosts : 0;
  
  // Build personalized key tactics based on ALL user data
  const keyTactics = generatePersonalizedTactics(
    userData,
    contentPatterns || [],
    topHashtags || [],
    campaignData,
    primaryTimeSlot,
    bestDays
  );
  
  // Calculate expected results based on user's historical data and goals
  const expectedMultiplier = userData.avg_engagement_rate / 2.5;
  const targetImpressions = campaignData.targetImpressions || campaignData.goals?.impressions || 10000;
  const targetEngagement = campaignData.targetEngagement || campaignData.goals?.engagement_rate || 3.5;
  
  // Build strategy
  const strategy = {
    overview: {
      campaignType: campaignData.objective || 'awareness',
      campaignName: campaignData.name,
      duration: duration,
      totalPosts: totalPosts,
      postsPerWeek: Math.ceil(postsPerDay * 7),
      platforms: campaignData.platforms || ['all'],
      budget: campaignData.budget || 0,
      budgetPerPost: Math.round(budgetPerPost * 100) / 100
    },
    
    contentStrategy: {
      recommendedType: userData.best_content_type,
      recommendedLength: userData.best_content_length,
      selectedContentTypes: campaignData.contentTypes || ['images', 'text'],
      themes: themes,
      postingFrequency: `${postsPerDay.toFixed(1)} posts per day`,
      suggestedHashtags: topHashtags?.slice(0, 5).map((h: any) => h.element) || [],
      userHashtags: campaignData.hashtags?.split(/[,\s]+/).filter(Boolean) || []
    },
    
    timingStrategy: {
      bestTimeOfDay: primaryTimeSlot,
      optimalDays: bestDays.slice(0, 4),
      avoidWeekends: userData.avg_engagement_rate < 3,
      specificHours: optimalSlots?.slice(0, 3).map((s: any) => `${s.hour_of_day}:00`) || [],
      confidence: optimalSlots?.length >= 5 ? 'high' : optimalSlots?.length >= 2 ? 'medium' : 'low'
    },
    
    weeklyBreakdown: generateWeeklyBreakdownEnhanced(
      themes, 
      duration, 
      postsPerDay,
      campaignData.objective || 'awareness',
      campaignData.platforms || []
    ),
    
    expectedResults: {
      estimatedImpressions: Math.round(totalPosts * 1000 * expectedMultiplier),
      estimatedEngagement: Math.round(totalPosts * 50 * expectedMultiplier),
      projectedEngagementRate: userData.avg_engagement_rate,
      targetImpressions: targetImpressions,
      targetEngagementRate: targetEngagement,
      confidence: userData.total_posts_analyzed >= 20 ? 'high' : userData.total_posts_analyzed >= 10 ? 'medium' : 'low',
      basedOnPosts: userData.total_posts_analyzed
    },
    
    keyTactics: keyTactics,
    
    milestones: generateMilestones(duration, {
      impressions: targetImpressions,
      engagement_rate: targetEngagement,
      conversions: campaignData.targetClicks || campaignData.goals?.conversions || 50
    }),
    
    platformSpecific: generatePlatformRecommendations(campaignData.platforms || [], contentPatterns || [])
  };
  
  return strategy;
}

function getPostsPerDayByObjective(objective: string): number {
  const frequencyMap: Record<string, number> = {
    awareness: 1.5,
    engagement: 2.5,
    conversions: 2,
    traffic: 2,
    leads: 1.5,
    sales: 2.5,
    event: 2
  };
  return frequencyMap[objective] || 1.5;
}

function generatePersonalizedTactics(
  userData: any,
  contentPatterns: any[],
  topHashtags: any[],
  campaignData: CampaignData,
  primaryTimeSlot: string,
  bestDays: string[]
): string[] {
  const tactics: string[] = [];
  
  // Content type recommendation
  const bestContentPattern = contentPatterns.find(p => p.pattern_type === 'content_type');
  if (bestContentPattern) {
    tactics.push(`Focus on ${bestContentPattern.pattern_value} content - your engagement rate is ${bestContentPattern.avg_engagement_rate?.toFixed(1)}%`);
  } else {
    tactics.push(`Focus on ${userData.best_content_type} content (your best performer)`);
  }
  
  // Length recommendation
  const bestLengthPattern = contentPatterns.find(p => p.pattern_type === 'content_length');
  if (bestLengthPattern) {
    tactics.push(`Keep posts ${bestLengthPattern.pattern_value} length for optimal engagement`);
  } else {
    tactics.push(`Keep posts ${userData.best_content_length} length`);
  }
  
  // Timing recommendation with specific data
  if (bestDays.length > 0) {
    tactics.push(`Post on ${bestDays.slice(0, 3).join(', ')} during ${primaryTimeSlot} for maximum reach`);
  } else {
    tactics.push(`Post during ${primaryTimeSlot} for maximum engagement`);
  }
  
  // Question pattern recommendation
  const questionPattern = contentPatterns.find(p => p.pattern_type === 'has_question' && p.pattern_value === 'yes');
  if (questionPattern && questionPattern.avg_engagement_rate > userData.avg_engagement_rate) {
    tactics.push(`Include questions - they get ${((questionPattern.avg_engagement_rate / userData.avg_engagement_rate - 1) * 100).toFixed(0)}% more engagement`);
  } else {
    tactics.push('Include questions in 50% of posts to drive interaction');
  }
  
  // Hashtag recommendation
  if (topHashtags.length > 0) {
    tactics.push(`Use proven hashtags: ${topHashtags.slice(0, 3).map((h: any) => h.element).join(', ')}`);
  } else if (campaignData.hashtags) {
    tactics.push(`Use campaign hashtags: ${campaignData.hashtags}`);
  }
  
  // Objective-specific tactics
  const objectiveTactics = getObjectiveTactics(campaignData.objective || 'awareness');
  tactics.push(...objectiveTactics.slice(0, 2));
  
  // Budget recommendation
  if ((campaignData.budget || 0) > 0) {
    tactics.push(`Allocate budget to boost top-performing posts for amplified reach`);
  }
  
  return tactics.slice(0, 7);
}

function getObjectiveTactics(objective: string): string[] {
  const tacticMap: Record<string, string[]> = {
    awareness: ['Share behind-the-scenes content to humanize your brand', 'Collaborate with complementary accounts for cross-promotion'],
    engagement: ['Run interactive polls and quizzes', 'Respond to comments within 1 hour to boost algorithm visibility'],
    conversions: ['Include clear CTAs in every post', 'Use social proof and testimonials in carousel posts'],
    traffic: ['Create curiosity gaps in captions that drive clicks', 'Use link stickers and bio links strategically'],
    leads: ['Offer exclusive free resources', 'Showcase case studies and success stories'],
    sales: ['Create urgency with limited-time offers', 'Feature customer reviews and unboxing content'],
    event: ['Build countdown content leading to event', 'Feature speaker highlights and agenda teasers']
  };
  return tacticMap[objective] || tacticMap.awareness;
}

function generatePlatformRecommendations(platforms: string[], contentPatterns: any[]): Record<string, any> {
  const recommendations: Record<string, any> = {};
  
  platforms.forEach(platform => {
    const platformPatterns = contentPatterns.filter(p => p.platform === platform);
    const bestPattern = platformPatterns.sort((a, b) => (b.avg_engagement_rate || 0) - (a.avg_engagement_rate || 0))[0];
    
    recommendations[platform] = {
      bestContentType: bestPattern?.pattern_value || 'image',
      recommendedFrequency: getPlatformFrequency(platform),
      tips: getPlatformTips(platform)
    };
  });
  
  return recommendations;
}

function getPlatformFrequency(platform: string): string {
  const freqMap: Record<string, string> = {
    instagram: '1-2 posts/day, 5-7 stories',
    facebook: '1-2 posts/day',
    twitter: '3-5 tweets/day',
    linkedin: '1 post/day',
    tiktok: '1-3 videos/day'
  };
  return freqMap[platform] || '1-2 posts/day';
}

function getPlatformTips(platform: string): string[] {
  const tipsMap: Record<string, string[]> = {
    instagram: ['Use Reels for maximum reach', 'Carousels get highest saves', 'Engage with Stories polls'],
    facebook: ['Video content gets priority', 'Share to relevant groups', 'Live videos boost engagement'],
    twitter: ['Thread format for long content', 'Engage in trending conversations', 'Quote tweet with insights'],
    linkedin: ['Native video preferred', 'Personal stories perform well', 'Tag relevant connections'],
    tiktok: ['Hook viewers in first 2 seconds', 'Use trending sounds', 'Duet with related content']
  };
  return tipsMap[platform] || ['Optimize for platform algorithm', 'Engage with your community'];
}

function getContentThemes(objective: string): string[] {
  const themeMap: Record<string, string[]> = {
    awareness: ['brand_story', 'behind_the_scenes', 'team_introductions', 'values', 'customer_stories'],
    engagement: ['questions', 'polls', 'user_generated', 'challenges', 'discussions'],
    conversions: ['product_highlights', 'testimonials', 'offers', 'urgency', 'social_proof'],
    traffic: ['tips_and_tricks', 'tutorials', 'resources', 'blog_promotion', 'link_content'],
    leads: ['value_proposition', 'case_studies', 'free_resources', 'webinars', 'demos'],
    sales: ['product_launch', 'promotions', 'bundles', 'limited_offers', 'customer_success'],
    event: ['event_announcement', 'speaker_intros', 'agenda_highlights', 'registration_reminders', 'recap']
  };
  
  return themeMap[objective] || themeMap.awareness;
}

function getContentThemesEnhanced(objective: string, contentTypes: string[], campaignName: string): string[] {
  const baseThemes = getContentThemes(objective);
  const enhancedThemes: string[] = [];
  
  // Add content type specific themes
  if (contentTypes.includes('videos')) {
    enhancedThemes.push('video_tutorials', 'behind_the_scenes_videos');
  }
  if (contentTypes.includes('carousels')) {
    enhancedThemes.push('step_by_step_guides', 'before_after');
  }
  if (contentTypes.includes('images')) {
    enhancedThemes.push('visual_quotes', 'product_showcase');
  }
  
  // Mix base themes with enhanced ones
  const allThemes = [...baseThemes, ...enhancedThemes];
  return [...new Set(allThemes)].slice(0, 8);
}

function generateWeeklyBreakdown(themes: string[], durationDays: number, postsPerDay: number) {
  const weeks = Math.ceil(durationDays / 7);
  const breakdown = [];
  
  for (let week = 1; week <= Math.min(weeks, 6); week++) {
    const themeIndex = (week - 1) % themes.length;
    const theme = themes[themeIndex] || 'general_content';
    
    breakdown.push({
      week: week,
      focus: theme.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
      postsPlanned: Math.ceil(postsPerDay * 7),
      objectives: getThemeObjectives(theme)
    });
  }
  
  return breakdown;
}

function generateWeeklyBreakdownEnhanced(
  themes: string[], 
  durationDays: number, 
  postsPerDay: number,
  objective: string,
  platforms: string[]
) {
  const weeks = Math.ceil(durationDays / 7);
  const breakdown = [];
  
  const phaseNames = getPhaseNamesByObjective(objective);
  
  for (let week = 1; week <= Math.min(weeks, 6); week++) {
    const themeIndex = (week - 1) % themes.length;
    const theme = themes[themeIndex] || 'general_content';
    const phaseName = phaseNames[Math.min(week - 1, phaseNames.length - 1)];
    
    const weekObjectives = getEnhancedObjectives(theme, objective, week, weeks);
    
    breakdown.push({
      week: week,
      phase: phaseName,
      focus: theme.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
      postsPlanned: Math.ceil(postsPerDay * 7),
      objectives: weekObjectives,
      platforms: platforms,
      milestoneCheck: week === Math.ceil(weeks / 2) || week === weeks
    });
  }
  
  return breakdown;
}

function getPhaseNamesByObjective(objective: string): string[] {
  const phases: Record<string, string[]> = {
    awareness: ['Launch & Introduce', 'Build Recognition', 'Expand Reach', 'Establish Presence', 'Maintain Visibility', 'Optimize & Grow'],
    engagement: ['Warm Up', 'Activate Community', 'Deepen Interaction', 'Foster Loyalty', 'Celebrate Success', 'Sustain Momentum'],
    conversions: ['Attract Attention', 'Build Interest', 'Create Desire', 'Drive Action', 'Convert & Close', 'Maximize ROI'],
    traffic: ['Hook & Intrigue', 'Drive Curiosity', 'Amplify Clicks', 'Optimize Flow', 'Scale Traffic', 'Sustain Growth'],
    leads: ['Attract Prospects', 'Nurture Interest', 'Qualify Leads', 'Convert Opportunities', 'Close & Follow Up', 'Optimize Pipeline'],
    sales: ['Tease & Preview', 'Showcase Value', 'Build Urgency', 'Push to Purchase', 'Close Sales', 'Upsell & Retain'],
    event: ['Announce & Excite', 'Build Anticipation', 'Drive Registrations', 'Final Push', 'Event Day', 'Post-Event Recap']
  };
  return phases[objective] || phases.awareness;
}

function getEnhancedObjectives(theme: string, objective: string, week: number, totalWeeks: number): string[] {
  const baseObjectives = getThemeObjectives(theme);
  
  // Add week-specific objectives
  if (week === 1) {
    return [...baseObjectives, 'Set the tone for the campaign'];
  } else if (week === Math.ceil(totalWeeks / 2)) {
    return [...baseObjectives, 'Mid-campaign review and optimization'];
  } else if (week === totalWeeks) {
    return [...baseObjectives, 'Strong finish with clear CTA'];
  }
  
  return baseObjectives;
}

function getThemeObjectives(theme: string): string[] {
  const objectives: Record<string, string[]> = {
    teaser_announcement: ['Build anticipation', 'Generate curiosity', 'Create buzz'],
    feature_highlights: ['Showcase key benefits', 'Demonstrate value', 'Address pain points'],
    customer_testimonials: ['Build trust', 'Show social proof', 'Share success stories'],
    launch_day: ['Drive immediate action', 'Maximize visibility', 'Celebrate launch'],
    follow_up: ['Thank audience', 'Share results', 'Maintain momentum'],
    brand_story: ['Share origin', 'Communicate values', 'Build connection'],
    behind_the_scenes: ['Show authenticity', 'Humanize brand', 'Create relatability'],
    team_introductions: ['Build trust', 'Show expertise', 'Create personal connection'],
    values: ['Communicate mission', 'Show purpose', 'Align with audience'],
    customer_stories: ['Showcase success', 'Build credibility', 'Inspire action'],
    questions: ['Spark discussion', 'Gather feedback', 'Increase replies'],
    polls: ['Drive participation', 'Understand audience', 'Boost engagement'],
    user_generated: ['Leverage community', 'Build loyalty', 'Amplify reach'],
    product_highlights: ['Showcase features', 'Drive interest', 'Educate audience'],
    offers: ['Create urgency', 'Drive sales', 'Reward followers']
  };
  
  return objectives[theme] || ['Engage audience', 'Build awareness', 'Drive interaction'];
}

interface Milestone {
  day: number;
  label: string;
  targets: {
    impressions: number;
    engagement: number;
    conversions: number;
  };
}

function generateMilestones(duration: number, goals: Record<string, number>): Milestone[] {
  const milestones: Milestone[] = [];
  const checkpoints = [0.25, 0.5, 0.75, 1.0];
  
  checkpoints.forEach(checkpoint => {
    const day = Math.ceil(duration * checkpoint);
    const label = checkpoint === 1 ? 'End' : `${checkpoint * 100}%`;
    
    milestones.push({
      day: day,
      label: label,
      targets: {
        impressions: Math.round((goals.impressions || 10000) * checkpoint),
        engagement: Math.round((goals.engagement_rate || 3.5) * checkpoint),
        conversions: Math.round((goals.conversions || 50) * checkpoint)
      }
    });
  });
  
  return milestones;
}

async function generateContentPlan(userId: string, campaignId: string, campaignData: any, supabase: any) {
  const startDate = new Date(campaignData.startDate);
  const endDate = new Date(campaignData.endDate);
  const duration = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  
  const postsToCreate = Math.min(campaignData.totalPosts || 20, 30);
  const contentPlan: any[] = [];
  
  let lastScheduledTime = startDate.toISOString();
  
  for (let i = 0; i < postsToCreate; i++) {
    // Find next optimal slot
    const { data: slot } = await supabase
      .rpc('find_next_optimal_slot', {
        p_user_id: userId,
        p_platform: campaignData.platforms?.[0] || 'all',
        p_after_time: lastScheduledTime,
        p_days_ahead: duration
      });
    
    const scheduledTime = slot?.[0]?.suggested_time || 
      new Date(new Date(lastScheduledTime).getTime() + 24 * 60 * 60 * 1000).toISOString();
    
    // Create the post
    const { data: post, error } = await supabase
      .from('scheduled_posts')
      .insert({
        user_id: userId,
        campaign_id: campaignId,
        title: `Campaign Post ${i + 1}`,
        content: `[Draft] Campaign content for ${campaignData.name} - Post ${i + 1}`,
        platforms: campaignData.platforms || ['all'],
        post_type: 'text',
        scheduled_time: scheduledTime,
        status: 'draft'
      })
      .select()
      .single();
    
    if (!error && post) {
      contentPlan.push(post);
      lastScheduledTime = scheduledTime;
    }
  }
  
  return contentPlan;
}

function analyzeCampaignPerformance(performance: any, campaign: any, dailyTracking: any[]) {
  if (!performance || !campaign) {
    return { status: 'insufficient_data', insights: [] };
  }
  
  const goals = campaign.goals || {};
  const progress = {
    impressions: goals.impressions ? (performance.total_impressions / goals.impressions * 100) : 0,
    engagementRate: goals.engagement_rate ? (performance.avg_engagement_rate / goals.engagement_rate * 100) : 0,
    posts: campaign.total_posts ? (performance.total_posts / campaign.total_posts * 100) : 0
  };
  
  const trend = calculateTrend(dailyTracking);
  
  const insights: Array<{ type: string; message: string; action: string }> = [];
  
  if (progress.impressions > 100) {
    insights.push({
      type: 'success',
      message: `Exceeding impression goal by ${Math.round(progress.impressions - 100)}%`,
      action: 'Consider increasing your goals for better planning'
    });
  } else if (progress.impressions < 50 && progress.impressions > 0) {
    insights.push({
      type: 'warning',
      message: `Behind on impressions target (${Math.round(progress.impressions)}%)`,
      action: 'Increase posting frequency or boost high-performing posts'
    });
  }
  
  if (trend === 'improving') {
    insights.push({
      type: 'success',
      message: 'Campaign performance is improving over time',
      action: 'Continue current strategy'
    });
  } else if (trend === 'declining') {
    insights.push({
      type: 'warning',
      message: 'Campaign performance is declining',
      action: 'Review recent posts and adjust content strategy'
    });
  }
  
  return {
    status: 'active',
    progress: progress,
    trend: trend,
    insights: insights,
    onTrack: progress.impressions >= 80 || progress.engagementRate >= 80
  };
}

function calculateTrend(dailyTracking: any[]): string {
  if (dailyTracking.length < 3) return 'stable';
  
  const recent = dailyTracking.slice(-3);
  const earlier = dailyTracking.slice(-6, -3);
  
  if (earlier.length === 0) return 'stable';
  
  const recentAvg = recent.reduce((sum, d) => sum + parseFloat(d.engagement_rate || '0'), 0) / recent.length;
  const earlierAvg = earlier.reduce((sum, d) => sum + parseFloat(d.engagement_rate || '0'), 0) / earlier.length;
  
  if (recentAvg > earlierAvg * 1.1) return 'improving';
  if (recentAvg < earlierAvg * 0.9) return 'declining';
  return 'stable';
}

// ========== NEW HELPER FUNCTIONS ==========

function generatePlatformInsights(
  platform: string,
  nicheStrategy: any,
  benchmarks: any,
  userPerformance: any[]
) {
  const userMetrics = calculateUserMetrics(userPerformance);
  
  return {
    platform,
    bestPractices: nicheStrategy?.best_practices || getPlatformTips(platform),
    recommendedContentTypes: nicheStrategy?.recommended_content_types || ['image', 'video'],
    optimalContentMix: nicheStrategy?.optimal_content_mix || { video: 40, image: 40, text: 20 },
    messagingThemes: nicheStrategy?.messaging_themes || ['value proposition', 'social proof'],
    benchmarks: {
      avgEngagementRate: benchmarks?.avg_engagement_rate || 2.5,
      avgCTR: benchmarks?.avg_ctr || 1.0,
      avgCPM: benchmarks?.avg_cpm || 10.0,
      topContentTypes: benchmarks?.top_content_types || ['video'],
      optimalTimes: benchmarks?.optimal_posting_times || [9, 12, 17],
      optimalDays: benchmarks?.optimal_posting_days || [2, 3, 4]
    },
    userPerformance: userMetrics,
    vsIndustry: {
      engagementRate: userMetrics.avgEngagementRate - (benchmarks?.avg_engagement_rate || 2.5),
      isAboveAverage: userMetrics.avgEngagementRate > (benchmarks?.avg_engagement_rate || 2.5)
    },
    recommendations: generatePlatformRecommendationsList(platform, userMetrics, benchmarks)
  };
}

function calculateUserMetrics(campaigns: any[]) {
  if (!campaigns || campaigns.length === 0) {
    return { avgEngagementRate: 0, totalImpressions: 0, totalEngagement: 0, campaignCount: 0 };
  }

  let totalImpressions = 0;
  let totalEngagement = 0;

  for (const campaign of campaigns) {
    for (const post of campaign.scheduled_posts || []) {
      totalImpressions += post.impressions || 0;
      totalEngagement += post.engagements || 0;
    }
  }

  return {
    avgEngagementRate: totalImpressions > 0 ? (totalEngagement / totalImpressions) * 100 : 0,
    totalImpressions,
    totalEngagement,
    campaignCount: campaigns.length
  };
}

function generatePlatformRecommendationsList(platform: string, userMetrics: any, benchmarks: any): string[] {
  const recommendations: string[] = [];
  
  if (userMetrics.avgEngagementRate < (benchmarks?.avg_engagement_rate || 2.5)) {
    recommendations.push('Focus on improving content quality to boost engagement');
  }
  
  const tips = getPlatformTips(platform);
  recommendations.push(...tips.slice(0, 2));
  
  return recommendations;
}

function generateNicheRecommendations(
  niche: string,
  strategies: any[],
  benchmarks: any[],
  userCampaigns: any[],
  goals: any
) {
  // Sort platforms by priority
  const platformPriority = strategies.sort((a, b) => b.priority_score - a.priority_score);
  
  // Calculate user's platform distribution
  const platformSpend: Record<string, number> = {};
  for (const campaign of userCampaigns) {
    platformSpend[campaign.platform] = (platformSpend[campaign.platform] || 0) + (campaign.spend || 0);
  }

  const recommendations = {
    niche,
    topPlatforms: platformPriority.slice(0, 3).map(s => ({
      platform: s.platform,
      priorityScore: s.priority_score,
      contentTypes: s.recommended_content_types,
      frequency: s.recommended_posting_frequency,
      bestPractices: s.best_practices?.slice(0, 3) || []
    })),
    platformComparison: benchmarks.map(b => ({
      platform: b.platform,
      avgEngagement: b.avg_engagement_rate,
      avgCTR: b.avg_ctr,
      recommended: platformPriority.find(p => p.platform === b.platform) ? true : false
    })),
    budgetAllocation: generateBudgetAllocation(platformPriority, goals),
    contentThemes: platformPriority[0]?.messaging_themes || [],
    nicheSpecificTips: generateNicheSpecificTips(niche)
  };

  return recommendations;
}

function generateBudgetAllocation(strategies: any[], goals: any): Record<string, number> {
  if (strategies.length === 0) return {};
  
  const allocation: Record<string, number> = {};
  const totalScore = strategies.slice(0, 3).reduce((sum, s) => sum + s.priority_score, 0);
  
  strategies.slice(0, 3).forEach(s => {
    allocation[s.platform] = Math.round((s.priority_score / totalScore) * 100);
  });
  
  return allocation;
}

function generateNicheSpecificTips(niche: string): string[] {
  const tips: Record<string, string[]> = {
    ecommerce: ['Use shoppable posts on Instagram', 'Leverage UGC for social proof', 'Create urgency with limited offers'],
    saas: ['Focus on educational content', 'Share customer success stories', 'Demonstrate product value through tutorials'],
    consulting: ['Position yourself as thought leader', 'Share case studies and results', 'Engage in industry discussions'],
    fitness: ['Post transformation content', 'Use before/after visuals', 'Create workout challenges'],
    local_business: ['Engage with local community', 'Highlight local partnerships', 'Share behind-the-scenes content']
  };
  
  return tips[niche] || tips.ecommerce;
}

function generateLearningInsights(learnings: any[], platformPatterns: Record<string, any[]>) {
  const insights: any[] = [];
  
  // Top performing patterns
  const topPatterns = learnings.filter(l => l.performance_impact > 0).slice(0, 5);
  if (topPatterns.length > 0) {
    insights.push({
      type: 'success',
      title: 'Top Performing Patterns',
      patterns: topPatterns.map(p => ({
        type: p.learning_type,
        value: p.pattern_value,
        impact: `+${p.performance_impact.toFixed(1)}%`
      }))
    });
  }
  
  // Underperforming patterns
  const underPerformers = learnings.filter(l => l.performance_impact < -10);
  if (underPerformers.length > 0) {
    insights.push({
      type: 'warning',
      title: 'Patterns to Avoid',
      patterns: underPerformers.map(p => ({
        type: p.learning_type,
        value: p.pattern_value,
        impact: `${p.performance_impact.toFixed(1)}%`
      }))
    });
  }
  
  // Platform-specific insights
  for (const [platform, patterns] of Object.entries(platformPatterns)) {
    if (patterns.length >= 3) {
      const bestPattern = patterns.sort((a, b) => b.performance_impact - a.performance_impact)[0];
      insights.push({
        type: 'info',
        title: `Best on ${platform}`,
        message: `${bestPattern.learning_type}: ${bestPattern.pattern_value} (+${bestPattern.performance_impact.toFixed(1)}%)`
      });
    }
  }
  
  return insights;
}

function analyzeWhatWorked(posts: any[], campaign: any) {
  if (posts.length === 0) {
    return { success: false, message: 'No published posts to analyze' };
  }

  // Sort by engagement
  const sortedPosts = [...posts].sort((a, b) => (b.engagements || 0) - (a.engagements || 0));
  const topPosts = sortedPosts.slice(0, Math.ceil(posts.length * 0.3));
  const bottomPosts = sortedPosts.slice(-Math.ceil(posts.length * 0.3));

  // Analyze patterns
  const topPatterns = extractPatterns(topPosts);
  const bottomPatterns = extractPatterns(bottomPosts);

  return {
    success: true,
    totalPosts: posts.length,
    avgEngagement: posts.reduce((sum, p) => sum + (p.engagements || 0), 0) / posts.length,
    topPerformers: topPosts.slice(0, 3).map(p => ({
      content: p.content?.substring(0, 100),
      engagements: p.engagements,
      impressions: p.impressions
    })),
    bottomPerformers: bottomPosts.slice(0, 3).map(p => ({
      content: p.content?.substring(0, 100),
      engagements: p.engagements,
      impressions: p.impressions
    })),
    patterns: {
      working: topPatterns,
      notWorking: bottomPatterns
    },
    recommendations: generatePostCampaignRecommendations(topPatterns, bottomPatterns)
  };
}

function extractPatterns(posts: any[]) {
  const patterns: Record<string, any> = {
    avgLength: 0,
    hasMedia: 0,
    hasQuestion: 0,
    postingHours: [] as number[]
  };
  
  for (const post of posts) {
    patterns.avgLength += (post.content?.length || 0);
    if (post.media_urls?.length > 0) patterns.hasMedia++;
    if (post.content?.includes('?')) patterns.hasQuestion++;
    if (post.scheduled_time) {
      patterns.postingHours.push(new Date(post.scheduled_time).getHours());
    }
  }
  
  patterns.avgLength = patterns.avgLength / (posts.length || 1);
  patterns.hasMedia = (patterns.hasMedia / (posts.length || 1)) * 100;
  patterns.hasQuestion = (patterns.hasQuestion / (posts.length || 1)) * 100;
  
  return patterns;
}

function generatePostCampaignRecommendations(topPatterns: any, bottomPatterns: any): string[] {
  const recommendations: string[] = [];
  
  if (topPatterns.hasQuestion > 50) {
    recommendations.push('Questions drive engagement - continue asking your audience');
  }
  if (topPatterns.hasMedia > 70) {
    recommendations.push('Media-rich posts perform better - prioritize visual content');
  }
  if (topPatterns.avgLength > bottomPatterns.avgLength) {
    recommendations.push('Longer, more detailed posts resonated with your audience');
  } else {
    recommendations.push('Shorter, punchier content performed better');
  }
  
  return recommendations;
}

function generateCampaignLearnings(
  userId: string,
  campaignId: string,
  platform: string,
  niche: string,
  analysis: any
) {
  const learnings: any[] = [];
  
  if (analysis.patterns?.working) {
    if (analysis.patterns.working.hasMedia > 60) {
      learnings.push({
        user_id: userId,
        campaign_id: campaignId,
        platform: platform || 'all',
        niche: niche,
        learning_type: 'content_type',
        pattern_value: 'media_rich',
        performance_impact: 15,
        confidence_level: 'medium',
        sample_size: analysis.totalPosts || 1
      });
    }
    
    if (analysis.patterns.working.hasQuestion > 40) {
      learnings.push({
        user_id: userId,
        campaign_id: campaignId,
        platform: platform || 'all',
        niche: niche,
        learning_type: 'content_type',
        pattern_value: 'questions',
        performance_impact: 12,
        confidence_level: 'medium',
        sample_size: analysis.totalPosts || 1
      });
    }
  }
  
  return learnings;
}

function calculateActualVsPredicted(campaign: any, posts: any[]) {
  const predicted = campaign.predicted_performance || {};
  const actual = {
    impressions: posts.reduce((sum, p) => sum + (p.impressions || 0), 0),
    engagement: posts.reduce((sum, p) => sum + (p.engagements || 0), 0)
  };
  
  return {
    predicted,
    actual,
    accuracy: predicted.impressions 
      ? Math.min(100, (actual.impressions / predicted.impressions) * 100)
      : null
  };
}

function predictCampaignPerformance(
  campaignData: any,
  benchmarks: any,
  userLearnings: any[],
  pastCampaigns: any[]
) {
  // Base prediction from benchmarks
  let baseEngagement = benchmarks?.avg_engagement_rate || 2.5;
  let baseImpressions = 10000;
  let confidence = 0.5;
  
  // Adjust based on user's historical performance
  if (pastCampaigns.length > 0) {
    let totalImpressions = 0;
    let totalEngagement = 0;
    
    for (const campaign of pastCampaigns) {
      for (const post of campaign.scheduled_posts || []) {
        totalImpressions += post.impressions || 0;
        totalEngagement += post.engagements || 0;
      }
    }
    
    if (totalImpressions > 0) {
      baseEngagement = (totalEngagement / totalImpressions) * 100;
      baseImpressions = totalImpressions / pastCampaigns.length;
      confidence = Math.min(0.9, 0.5 + (pastCampaigns.length * 0.1));
    }
  }
  
  // Apply learnings
  let learningBoost = 0;
  for (const learning of userLearnings.slice(0, 5)) {
    learningBoost += learning.performance_impact * 0.1;
  }
  
  const adjustedEngagement = baseEngagement * (1 + learningBoost / 100);
  
  return {
    estimatedImpressions: Math.round(baseImpressions * 1.2),
    estimatedEngagement: Math.round(adjustedEngagement * 100) / 100,
    estimatedReach: Math.round(baseImpressions * 0.7),
    confidence,
    confidenceLevel: confidence >= 0.7 ? 'high' : confidence >= 0.5 ? 'medium' : 'low',
    factors: [
      `Based on ${pastCampaigns.length} past campaigns`,
      `Industry benchmark: ${benchmarks?.avg_engagement_rate || 2.5}%`,
      userLearnings.length > 0 ? `Applied ${userLearnings.length} learnings` : 'Limited historical data'
    ]
  };
}

function generateOptimizationSuggestions(campaign: any, learnings: any[], nicheStrategy: any) {
  const suggestions: any[] = [];
  const posts = campaign.scheduled_posts || [];
  const publishedPosts = posts.filter((p: any) => p.status === 'published');
  
  // Content type suggestions
  if (nicheStrategy?.recommended_content_types) {
    suggestions.push({
      type: 'content',
      priority: 'high',
      title: 'Optimize Content Types',
      description: `Focus on ${nicheStrategy.recommended_content_types.slice(0, 2).join(' and ')} for best results`,
      expectedImpact: '+15-25% engagement'
    });
  }
  
  // Timing suggestions
  if (learnings.some(l => l.learning_type === 'timing' && l.performance_impact > 10)) {
    const bestTiming = learnings.find(l => l.learning_type === 'timing');
    suggestions.push({
      type: 'timing',
      priority: 'high',
      title: 'Optimize Posting Times',
      description: `Your best performing time: ${bestTiming?.pattern_value || 'afternoon'}`,
      expectedImpact: '+10-15% reach'
    });
  }
  
  // Underperforming post suggestions
  if (publishedPosts.length > 5) {
    const avgEngagement = publishedPosts.reduce((sum: number, p: any) => sum + (p.engagements || 0), 0) / publishedPosts.length;
    const underperforming = publishedPosts.filter((p: any) => (p.engagements || 0) < avgEngagement * 0.5);
    
    if (underperforming.length > 0) {
      suggestions.push({
        type: 'content',
        priority: 'medium',
        title: 'Improve Underperforming Posts',
        description: `${underperforming.length} posts are below average. Consider updating or removing.`,
        expectedImpact: 'Improved overall campaign performance'
      });
    }
  }
  
  // Best practices from niche strategy
  if (nicheStrategy?.best_practices) {
    suggestions.push({
      type: 'strategy',
      priority: 'medium',
      title: 'Apply Best Practices',
      description: nicheStrategy.best_practices[0],
      expectedImpact: 'Industry-proven tactics'
    });
  }
  
  return suggestions;
}

function generateFallbackAIStrategy(campaignData: any) {
  const platform = campaignData.platform || 'instagram';
  const duration = campaignData.duration || 30;
  const weeks = Math.ceil(duration / 7);
  
  return {
    overview: {
      objective: campaignData.objective || 'engagement',
      duration: `${duration} days`,
      estimatedReach: 10000 + (duration * 500),
      confidenceLevel: 'medium'
    },
    weeklyThemes: Array.from({ length: Math.min(weeks, 4) }, (_, i) => ({
      week: i + 1,
      theme: ['Launch', 'Educate', 'Engage', 'Convert'][i] || 'Maintain',
      posts: Math.ceil(14 / weeks),
      contentTypes: ['video', 'carousel', 'image'].slice(0, 2)
    })),
    contentMix: {
      video: 40,
      image: 35,
      carousel: 20,
      text: 5
    },
    platformTactics: getPlatformTips(platform),
    expectedBenchmarks: {
      engagementRate: 3.5,
      impressions: 15000,
      reach: 10000
    },
    keyActions: [
      { action: 'Post consistently at optimal times', priority: 'high', expectedImpact: '+20% reach' },
      { action: 'Use platform-specific content formats', priority: 'high', expectedImpact: '+15% engagement' },
      { action: 'Engage with comments within 1 hour', priority: 'medium', expectedImpact: '+10% algorithm boost' }
    ]
  };
}

function buildAIStrategyContext(campaignData: any, learnings: any[], nicheStrategy: any) {
  let context = `Generate a campaign strategy for:\n`;
  context += `- Platform: ${campaignData.platform || 'instagram'}\n`;
  context += `- Niche: ${campaignData.niche || 'ecommerce'}\n`;
  context += `- Objective: ${campaignData.objective || 'engagement'}\n`;
  context += `- Duration: ${campaignData.duration || 30} days\n`;
  context += `- Budget: $${campaignData.budget || 0}\n\n`;
  
  if (learnings.length > 0) {
    context += `Top performing patterns from past campaigns:\n`;
    for (const learning of learnings.slice(0, 5)) {
      context += `- ${learning.learning_type}: ${learning.pattern_value} (+${learning.performance_impact}%)\n`;
    }
    context += '\n';
  }
  
  if (nicheStrategy) {
    context += `Industry best practices:\n`;
    for (const practice of (nicheStrategy.best_practices || []).slice(0, 3)) {
      context += `- ${practice}\n`;
    }
  }
  
  return context;
}

function comparePlatformPerformance(campaigns: any[], benchmarks: any[]) {
  const platformStats: Record<string, any> = {};
  
  for (const campaign of campaigns) {
    const platform = campaign.platform || 'other';
    if (!platformStats[platform]) {
      platformStats[platform] = {
        campaigns: 0,
        totalImpressions: 0,
        totalEngagement: 0,
        totalSpend: 0
      };
    }
    
    platformStats[platform].campaigns++;
    platformStats[platform].totalSpend += campaign.spend || 0;
    
    for (const post of campaign.scheduled_posts || []) {
      platformStats[platform].totalImpressions += post.impressions || 0;
      platformStats[platform].totalEngagement += post.engagements || 0;
    }
  }
  
  const comparison = Object.entries(platformStats).map(([platform, stats]) => {
    const benchmark = benchmarks.find(b => b.platform === platform);
    const engagementRate = stats.totalImpressions > 0 
      ? (stats.totalEngagement / stats.totalImpressions) * 100 
      : 0;
    
    return {
      platform,
      campaigns: stats.campaigns,
      totalImpressions: stats.totalImpressions,
      totalEngagement: stats.totalEngagement,
      engagementRate: Math.round(engagementRate * 100) / 100,
      roi: stats.totalSpend > 0 ? Math.round((stats.totalEngagement / stats.totalSpend) * 100) / 100 : 0,
      vsBenchmark: benchmark 
        ? Math.round((engagementRate - benchmark.avg_engagement_rate) * 100) / 100 
        : null
    };
  });
  
  // Sort by ROI
  comparison.sort((a, b) => b.roi - a.roi);
  
  return {
    platforms: comparison,
    recommended: comparison[0]?.platform || 'instagram',
    budgetAllocation: comparison.reduce((acc, p) => {
      acc[p.platform] = Math.round((p.roi / comparison.reduce((sum, c) => sum + c.roi, 0.01)) * 100);
      return acc;
    }, {} as Record<string, number>)
  };
}
