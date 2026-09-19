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
    const { 
      userId, 
      platform, 
      niche, 
      objective, 
      businessProfileId, 
      duration = 30,
      requestId,
      questionnaireData 
    } = await req.json();
    
    const supabase = serviceClient();
    
    console.log('Generating comprehensive strategy for:', { userId, platform, niche, objective, requestId });

    // Fetch questionnaire data if requestId provided
    let campaignRequest: any = null;
    if (requestId) {
      const { data } = await supabase
        .from('campaign_strategy_requests')
        .select('*')
        .eq('id', requestId)
        .single();
      campaignRequest = data;
    }

    // Merge questionnaire data from request body or database
    const questionnaire = questionnaireData || campaignRequest || {};

    // Fetch comprehensive business information
    let businessInfo: any = null;
    if (userId) {
      const { data: bizInfo } = await supabase
        .from('business_information')
        .select('*')
        .eq('user_id', userId)
        .single();
      
      if (bizInfo) {
        businessInfo = bizInfo;
      }
    }

    // Fallback to legacy business_profiles if no business_information
    let businessProfile: any = null;
    if (businessProfileId) {
      const { data } = await supabase
        .from('business_profiles')
        .select('*')
        .eq('id', businessProfileId)
        .single();
      businessProfile = data;
    } else if (userId && !businessInfo) {
      const { data } = await supabase
        .from('business_profiles')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      businessProfile = data;
    }

    // Determine final platform and objective from questionnaire or params
    const finalPlatform = questionnaire.primaryPlatform || platform || 'instagram';
    const finalObjective = questionnaire.primaryGoal || objective || 'engagement';
    const finalDuration = questionnaire.durationDays || duration || 30;
    const finalNiche = niche || businessInfo?.industry || businessProfile?.industry || 'ecommerce';

    // Fetch ML posting times
    const { data: mlTimes } = await supabase
      .from('ml_posting_time_predictions')
      .select('*')
      .eq('user_id', userId)
      .eq('platform', finalPlatform)
      .order('predicted_engagement_rate', { ascending: false })
      .limit(5);

    // Fetch user's historical performance
    const { data: historicalPerformance } = await supabase
      .from('scheduled_posts')
      .select('content, impressions, engagements, published_at')
      .eq('user_id', userId)
      .eq('status', 'published')
      .not('impressions', 'is', null)
      .order('published_at', { ascending: false })
      .limit(50);

    // Fetch niche strategy
    const { data: nicheStrategy } = await supabase
      .from('niche_strategies')
      .select('*')
      .eq('platform', finalPlatform)
      .eq('niche', finalNiche)
      .single();

    // Generate strategy using AI
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      console.log('No API key, generating fallback strategy');
      const fallbackStrategy = generateFallbackStrategy(finalPlatform, finalNiche, businessInfo || businessProfile, finalDuration, questionnaire);
      return new Response(
        JSON.stringify({ success: true, strategy: fallbackStrategy }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const strategyContext = buildComprehensiveContext(
      finalPlatform,
      finalNiche,
      finalObjective,
      finalDuration,
      businessInfo,
      businessProfile,
      questionnaire,
      historicalPerformance || [],
      nicheStrategy,
      mlTimes || []
    );

    console.log('Calling AI with comprehensive context, length:', strategyContext.length);

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are an expert social media strategist with 15+ years experience. Generate a comprehensive ${finalDuration}-day content strategy with exactly ${finalDuration} unique posts. 

Each post must be highly tailored to:
- The specific business, industry, and brand voice provided
- The campaign objectives and target metrics
- The platform's best practices and algorithm preferences
- Any seasonal or thematic requirements specified

Create compelling hooks, body copy, and CTAs that align with the narrative arc:
- Days 1-${Math.floor(finalDuration * 0.23)} (Week 1): AWARENESS - Introduce brand, build recognition
- Days ${Math.floor(finalDuration * 0.23) + 1}-${Math.floor(finalDuration * 0.5)} (Week 2): ENGAGEMENT - Spark interaction, build community  
- Days ${Math.floor(finalDuration * 0.5) + 1}-${Math.floor(finalDuration * 0.77)} (Week 3): CONSIDERATION - Showcase value, social proof
- Days ${Math.floor(finalDuration * 0.77) + 1}-${finalDuration} (Week 4+): CONVERSION - Clear CTAs, drive action

Be specific, creative, and actionable. Use the business context to personalize every piece of content.`
          },
          {
            role: 'user',
            content: strategyContext
          }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'generate_campaign_strategy',
              description: `Generate a comprehensive ${finalDuration}-day content strategy`,
              parameters: {
                type: 'object',
                properties: {
                  overview: {
                    type: 'object',
                    properties: {
                      campaign_name: { type: 'string' },
                      duration: { type: 'string' },
                      primary_objective: { type: 'string' },
                      estimated_reach: { type: 'number' },
                      total_posts: { type: 'number' },
                      confidence_level: { type: 'string' },
                      investment_recommendation: { type: 'string' },
                      key_success_factors: { type: 'array', items: { type: 'string' } }
                    }
                  },
                  weekly_themes: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        week: { type: 'number' },
                        name: { type: 'string' },
                        objective: { type: 'string' },
                        content_types: { type: 'array', items: { type: 'string' } },
                        expected_outcome: { type: 'string' },
                        key_messages: { type: 'array', items: { type: 'string' } }
                      }
                    }
                  },
                  content_calendar: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        day_number: { type: 'number' },
                        content_hook: { type: 'string' },
                        content_body: { type: 'string' },
                        content_cta: { type: 'string' },
                        content_type: { type: 'string' },
                        content_theme: { type: 'string' },
                        post_time_recommended: { type: 'string' },
                        expected_engagement_score: { type: 'number' },
                        hashtags: { type: 'array', items: { type: 'string' } },
                        reasoning: { type: 'string' },
                        visual_suggestions: { type: 'string' },
                        target_audience_segment: { type: 'string' }
                      }
                    }
                  },
                  predicted_metrics: {
                    type: 'object',
                    properties: {
                      impressions: { type: 'number' },
                      engagement_rate: { type: 'number' },
                      conversions: { type: 'number' },
                      roi_percentage: { type: 'number' },
                      follower_growth: { type: 'number' },
                      confidence: { type: 'number' }
                    }
                  },
                  key_actions: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        action: { type: 'string' },
                        priority: { type: 'string' },
                        expected_impact: { type: 'string' },
                        timing: { type: 'string' }
                      }
                    }
                  },
                  optimization_tips: {
                    type: 'array',
                    items: { type: 'string' }
                  }
                },
                required: ['overview', 'weekly_themes', 'content_calendar', 'predicted_metrics', 'key_actions']
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'generate_campaign_strategy' } }
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI response not ok:', aiResponse.status, errorText);
      const fallbackStrategy = generateFallbackStrategy(finalPlatform, finalNiche, businessInfo || businessProfile, finalDuration, questionnaire);
      return new Response(
        JSON.stringify({ success: true, strategy: fallbackStrategy }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    
    if (toolCall?.function?.arguments) {
      const strategy = JSON.parse(toolCall.function.arguments);
      
      // Add metadata to strategy
      strategy.platform = finalPlatform;
      strategy.niche = finalNiche;
      strategy.objective = finalObjective;
      strategy.duration = finalDuration;
      strategy.generated_at = new Date().toISOString();
      strategy.questionnaire_used = !!questionnaire.primaryGoal;
      
      // Ensure we have the correct number of posts
      if (strategy.content_calendar?.length < finalDuration) {
        const existingDays = new Set(strategy.content_calendar.map((p: any) => p.day_number));
        for (let day = 1; day <= finalDuration; day++) {
          if (!existingDays.has(day)) {
            strategy.content_calendar.push(generateDayContent(day, finalPlatform, finalNiche, businessInfo?.business_name || 'your brand', questionnaire));
          }
        }
        strategy.content_calendar.sort((a: any, b: any) => a.day_number - b.day_number);
      }
      
      // Save strategy to database
      let strategyId = null;
      if (userId) {
        const { data: savedStrategy } = await supabase.from('campaign_ai_strategies').insert({
          user_id: userId,
          platform: finalPlatform,
          niche: strategy.niche,
          objective: finalObjective,
          strategy_data: strategy,
          predicted_metrics: strategy.predicted_metrics,
          weekly_themes: strategy.weekly_themes,
          total_posts: finalDuration,
          generation_status: 'completed'
        }).select().single();
        
        strategyId = savedStrategy?.id;
        strategy.id = strategyId;
      }
      
      // Update request if exists
      if (requestId) {
        await supabase
          .from('campaign_strategy_requests')
          .update({ 
            status: 'completed',
            generated_strategy_id: strategyId 
          })
          .eq('id', requestId);
      }
      
      return new Response(
        JSON.stringify({ success: true, strategy }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const fallbackStrategy = generateFallbackStrategy(finalPlatform, finalNiche, businessInfo || businessProfile, finalDuration, questionnaire);
    return new Response(
      JSON.stringify({ success: true, strategy: fallbackStrategy }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Strategy generation error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function buildComprehensiveContext(
  platform: string,
  niche: string,
  objective: string,
  duration: number,
  businessInfo: any,
  businessProfile: any,
  questionnaire: any,
  historicalPerformance: any[],
  nicheStrategy: any,
  mlTimes: any[]
): string {
  let context = `Generate a ${duration}-day content strategy with the following comprehensive context:\n\n`;
  
  // === CAMPAIGN REQUIREMENTS ===
  context += `═══════════════════════════════════════\n`;
  context += `CAMPAIGN REQUIREMENTS\n`;
  context += `═══════════════════════════════════════\n`;
  context += `Platform: ${platform.toUpperCase()}\n`;
  context += `Primary Objective: ${objective}\n`;
  context += `Duration: ${duration} days\n`;
  
  if (questionnaire.secondaryGoals?.length > 0) {
    context += `Secondary Objectives: ${questionnaire.secondaryGoals.join(', ')}\n`;
  }
  if (questionnaire.additionalPlatforms?.length > 0) {
    context += `Also consider cross-posting to: ${questionnaire.additionalPlatforms.join(', ')}\n`;
  }
  if (questionnaire.startDate) {
    context += `Campaign Start Date: ${questionnaire.startDate}\n`;
  }
  context += '\n';

  // === CAMPAIGN TARGETS ===
  if (questionnaire.targetImpressions || questionnaire.targetEngagementRate || questionnaire.targetConversions || questionnaire.targetFollowers) {
    context += `═══════════════════════════════════════\n`;
    context += `TARGET METRICS\n`;
    context += `═══════════════════════════════════════\n`;
    if (questionnaire.targetImpressions) context += `Target Impressions: ${questionnaire.targetImpressions.toLocaleString()}\n`;
    if (questionnaire.targetEngagementRate) context += `Target Engagement Rate: ${questionnaire.targetEngagementRate}%\n`;
    if (questionnaire.targetConversions) context += `Target Conversions: ${questionnaire.targetConversions}\n`;
    if (questionnaire.targetFollowers) context += `Target New Followers: ${questionnaire.targetFollowers}\n`;
    context += '\n';
  }

  // === BUDGET & URGENCY ===
  if (questionnaire.budgetRange || questionnaire.urgencyLevel) {
    context += `═══════════════════════════════════════\n`;
    context += `BUDGET & PRIORITY\n`;
    context += `═══════════════════════════════════════\n`;
    if (questionnaire.budgetRange) context += `Budget Range: ${questionnaire.budgetRange}\n`;
    if (questionnaire.urgencyLevel) context += `Urgency Level: ${questionnaire.urgencyLevel}\n`;
    context += '\n';
  }

  // === CAMPAIGN SPECIFICS ===
  if (questionnaire.campaignThemes?.length > 0 || questionnaire.seasonalType || questionnaire.specialRequirements || questionnaire.campaignDifferentiation) {
    context += `═══════════════════════════════════════\n`;
    context += `CAMPAIGN SPECIFICS\n`;
    context += `═══════════════════════════════════════\n`;
    if (questionnaire.campaignThemes?.length > 0) {
      context += `Campaign Themes: ${questionnaire.campaignThemes.join(', ')}\n`;
    }
    if (questionnaire.seasonalType) {
      context += `Seasonal Context: ${questionnaire.seasonalType}`;
      if (questionnaire.seasonalDetails) context += ` - ${questionnaire.seasonalDetails}`;
      context += '\n';
    }
    if (questionnaire.specialRequirements) {
      context += `Special Requirements: ${questionnaire.specialRequirements}\n`;
    }
    if (questionnaire.campaignDifferentiation) {
      context += `What Makes This Unique: ${questionnaire.campaignDifferentiation}\n`;
    }
    context += '\n';
  }

  // === BUSINESS INFORMATION (from Settings) ===
  context += `═══════════════════════════════════════\n`;
  context += `BUSINESS CONTEXT\n`;
  context += `═══════════════════════════════════════\n`;
  
  if (businessInfo) {
    // Company Details
    context += `Business Name: ${businessInfo.business_name || 'Not specified'}\n`;
    context += `Industry: ${businessInfo.industry || niche}\n`;
    if (businessInfo.business_type) context += `Business Type: ${businessInfo.business_type}\n`;
    if (businessInfo.business_stage) context += `Business Stage: ${businessInfo.business_stage}\n`;
    if (businessInfo.company_size) context += `Company Size: ${businessInfo.company_size}\n`;
    if (businessInfo.years_in_business) context += `Years in Business: ${businessInfo.years_in_business}\n`;
    if (businessInfo.location) context += `Location: ${businessInfo.location}\n`;
    if (businessInfo.website) context += `Website: ${businessInfo.website}\n`;
    
    // Products & Services
    if (businessInfo.primary_products_services) {
      context += `\nProducts/Services: ${businessInfo.primary_products_services}\n`;
    }
    if (businessInfo.unique_value_proposition) {
      context += `Unique Value Proposition: ${businessInfo.unique_value_proposition}\n`;
    }
    if (businessInfo.competitive_advantage) {
      context += `Competitive Advantage: ${businessInfo.competitive_advantage}\n`;
    }
    if (businessInfo.top_competitors?.length > 0) {
      context += `Top Competitors: ${businessInfo.top_competitors.join(', ')}\n`;
    }
    context += '\n';

    // Target Audience
    context += `═══════════════════════════════════════\n`;
    context += `TARGET AUDIENCE\n`;
    context += `═══════════════════════════════════════\n`;
    if (businessInfo.target_age_min || businessInfo.target_age_max) {
      context += `Age Range: ${businessInfo.target_age_min || 18}-${businessInfo.target_age_max || 65}\n`;
    }
    if (businessInfo.gender_distribution) {
      const genders = businessInfo.gender_distribution;
      context += `Gender: Male ${genders.male || 0}%, Female ${genders.female || 0}%, Other ${genders.other || 0}%\n`;
    }
    if (businessInfo.income_level) context += `Income Level: ${businessInfo.income_level}\n`;
    if (businessInfo.education_levels?.length > 0) {
      context += `Education: ${businessInfo.education_levels.join(', ')}\n`;
    }
    if (businessInfo.geographic_focus?.length > 0) {
      context += `Geographic Focus: ${businessInfo.geographic_focus.join(', ')}\n`;
    }
    if (businessInfo.customer_pain_points) {
      context += `Customer Pain Points: ${businessInfo.customer_pain_points}\n`;
    }
    if (businessInfo.buying_behavior) context += `Buying Behavior: ${businessInfo.buying_behavior}\n`;
    if (businessInfo.customer_lifetime_value) {
      context += `Customer Lifetime Value: $${businessInfo.customer_lifetime_value}\n`;
    }
    context += '\n';

    // Brand Identity
    context += `═══════════════════════════════════════\n`;
    context += `BRAND IDENTITY\n`;
    context += `═══════════════════════════════════════\n`;
    if (businessInfo.brand_voice_traits?.length > 0) {
      context += `Brand Voice: ${businessInfo.brand_voice_traits.join(', ')}\n`;
    }
    if (businessInfo.brand_values?.length > 0) {
      context += `Brand Values: ${businessInfo.brand_values.join(', ')}\n`;
    }
    if (businessInfo.tone_formal_casual) {
      const formalCasual = businessInfo.tone_formal_casual <= 2 ? 'Formal' : businessInfo.tone_formal_casual >= 4 ? 'Casual' : 'Balanced';
      context += `Tone: ${formalCasual}\n`;
    }
    if (businessInfo.tone_serious_playful) {
      const seriousPlayful = businessInfo.tone_serious_playful <= 2 ? 'Serious' : businessInfo.tone_serious_playful >= 4 ? 'Playful' : 'Balanced';
      context += `Mood: ${seriousPlayful}\n`;
    }
    if (businessInfo.content_themes?.length > 0) {
      context += `Content Themes: ${businessInfo.content_themes.join(', ')}\n`;
    }
    if (businessInfo.content_restrictions) {
      context += `Content Restrictions (AVOID): ${businessInfo.content_restrictions}\n`;
    }
    context += '\n';

    // Marketing Assets
    if (businessInfo.available_content_types?.length > 0 || businessInfo.photography_style || businessInfo.video_production_capability) {
      context += `═══════════════════════════════════════\n`;
      context += `AVAILABLE ASSETS\n`;
      context += `═══════════════════════════════════════\n`;
      if (businessInfo.available_content_types?.length > 0) {
        context += `Content Types Available: ${businessInfo.available_content_types.join(', ')}\n`;
      }
      if (businessInfo.professional_photos_count) {
        context += `Professional Photos: ${businessInfo.professional_photos_count}\n`;
      }
      if (businessInfo.videos_available_count) {
        context += `Videos Available: ${businessInfo.videos_available_count}\n`;
      }
      if (businessInfo.testimonials_count) {
        context += `Customer Testimonials: ${businessInfo.testimonials_count}\n`;
      }
      if (businessInfo.photography_style) {
        context += `Photography Style: ${businessInfo.photography_style}\n`;
      }
      if (businessInfo.video_production_capability) {
        context += `Video Capability: ${businessInfo.video_production_capability}\n`;
      }
      if (businessInfo.content_creation_frequency) {
        context += `Content Creation Frequency: ${businessInfo.content_creation_frequency}\n`;
      }
      context += '\n';
    }

    // Current Performance
    if (businessInfo.monthly_website_visitors || businessInfo.total_social_followers || businessInfo.avg_post_engagement_rate) {
      context += `═══════════════════════════════════════\n`;
      context += `CURRENT PERFORMANCE BASELINES\n`;
      context += `═══════════════════════════════════════\n`;
      if (businessInfo.monthly_website_visitors) {
        context += `Monthly Website Visitors: ${businessInfo.monthly_website_visitors.toLocaleString()}\n`;
      }
      if (businessInfo.total_social_followers) {
        context += `Total Social Followers: ${businessInfo.total_social_followers.toLocaleString()}\n`;
      }
      if (businessInfo.email_subscriber_count) {
        context += `Email Subscribers: ${businessInfo.email_subscriber_count.toLocaleString()}\n`;
      }
      if (businessInfo.avg_post_engagement_rate) {
        context += `Current Engagement Rate: ${businessInfo.avg_post_engagement_rate}%\n`;
      }
      if (businessInfo.current_conversion_rate) {
        context += `Current Conversion Rate: ${businessInfo.current_conversion_rate}%\n`;
      }
      if (businessInfo.customer_acquisition_cost) {
        context += `Customer Acquisition Cost: $${businessInfo.customer_acquisition_cost}\n`;
      }
      if (businessInfo.best_performing_content_types?.length > 0) {
        context += `Best Performing Content: ${businessInfo.best_performing_content_types.join(', ')}\n`;
      }
      context += '\n';
    }
  } else if (businessProfile) {
    // Fallback to legacy business_profiles
    context += `Business Name: ${businessProfile.business_name || 'Not specified'}\n`;
    context += `Industry: ${businessProfile.industry || niche}\n`;
    if (businessProfile.niche) context += `Niche: ${businessProfile.niche}\n`;
    if (businessProfile.products_services) context += `Products/Services: ${businessProfile.products_services}\n`;
    if (businessProfile.unique_selling_points?.length > 0) {
      context += `Unique Selling Points: ${businessProfile.unique_selling_points.join(', ')}\n`;
    }
    if (businessProfile.target_age_min || businessProfile.target_age_max) {
      context += `Target Age: ${businessProfile.target_age_min || 18}-${businessProfile.target_age_max || 65}\n`;
    }
    if (businessProfile.target_genders?.length > 0) {
      context += `Target Genders: ${businessProfile.target_genders.join(', ')}\n`;
    }
    if (businessProfile.target_interests?.length > 0) {
      context += `Target Interests: ${businessProfile.target_interests.join(', ')}\n`;
    }
    if (businessProfile.target_locations?.length > 0) {
      context += `Target Locations: ${businessProfile.target_locations.join(', ')}\n`;
    }
    if (businessProfile.business_goals?.length > 0) {
      context += `Business Goals: ${businessProfile.business_goals.join(', ')}\n`;
    }
    context += '\n';
  } else {
    context += `No business profile available - generate generic content for ${niche} industry.\n\n`;
  }
  
  // === HISTORICAL PERFORMANCE ===
  if (historicalPerformance.length > 0) {
    const avgEngagement = historicalPerformance.reduce((sum, p) => {
      const rate = p.impressions > 0 ? (p.engagements / p.impressions) * 100 : 0;
      return sum + rate;
    }, 0) / historicalPerformance.length;
    
    context += `═══════════════════════════════════════\n`;
    context += `HISTORICAL PERFORMANCE DATA\n`;
    context += `═══════════════════════════════════════\n`;
    context += `Average Engagement Rate: ${avgEngagement.toFixed(2)}%\n`;
    context += `Posts Analyzed: ${historicalPerformance.length}\n\n`;
  }
  
  // === INDUSTRY BEST PRACTICES ===
  if (nicheStrategy) {
    context += `═══════════════════════════════════════\n`;
    context += `INDUSTRY BEST PRACTICES (${niche})\n`;
    context += `═══════════════════════════════════════\n`;
    if (nicheStrategy.recommended_content_types?.length > 0) {
      context += `Recommended Content Types: ${nicheStrategy.recommended_content_types.join(', ')}\n`;
    }
    if (nicheStrategy.best_practices?.length > 0) {
      context += `Best Practices:\n`;
      nicheStrategy.best_practices.forEach((bp: string, i: number) => {
        context += `  ${i + 1}. ${bp}\n`;
      });
    }
    context += '\n';
  }
  
  // === ML POSTING TIMES ===
  if (mlTimes.length > 0) {
    context += `═══════════════════════════════════════\n`;
    context += `OPTIMAL POSTING TIMES (ML-PREDICTED)\n`;
    context += `═══════════════════════════════════════\n`;
    mlTimes.slice(0, 5).forEach(t => {
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      context += `- ${days[t.day_of_week]} at ${t.hour}:00 → ${t.predicted_engagement_rate?.toFixed(1)}% expected engagement\n`;
    });
    context += '\n';
  }
  
  // === NARRATIVE ARC ===
  context += `═══════════════════════════════════════\n`;
  context += `NARRATIVE ARC REQUIREMENTS\n`;
  context += `═══════════════════════════════════════\n`;
  context += `Days 1-${Math.floor(duration * 0.23)} (Week 1): AWARENESS\n`;
  context += `  → Introduce brand, share story, build recognition\n`;
  context += `  → Focus on: Who you are, what makes you unique\n\n`;
  context += `Days ${Math.floor(duration * 0.23) + 1}-${Math.floor(duration * 0.5)} (Week 2): ENGAGEMENT\n`;
  context += `  → Spark interaction, build community, increase dialogue\n`;
  context += `  → Focus on: Questions, polls, user-generated content\n\n`;
  context += `Days ${Math.floor(duration * 0.5) + 1}-${Math.floor(duration * 0.77)} (Week 3): CONSIDERATION\n`;
  context += `  → Showcase value, social proof, build trust\n`;
  context += `  → Focus on: Testimonials, case studies, demonstrations\n\n`;
  context += `Days ${Math.floor(duration * 0.77) + 1}-${duration} (Week 4+): CONVERSION\n`;
  context += `  → Clear CTAs, drive action, create urgency\n`;
  context += `  → Focus on: Offers, limited-time deals, direct asks\n\n`;
  
  context += `═══════════════════════════════════════\n`;
  context += `DELIVERABLES\n`;
  context += `═══════════════════════════════════════\n`;
  context += `Generate exactly ${duration} unique, compelling posts for ${platform} that:\n`;
  context += `1. Align with the ${objective} objective\n`;
  context += `2. Reflect the brand voice and values\n`;
  context += `3. Target the specified audience demographics\n`;
  context += `4. Follow the narrative arc progression\n`;
  context += `5. Include specific hooks, body copy, and CTAs for each post\n`;
  context += `6. Recommend optimal posting times\n`;
  context += `7. Include relevant hashtags\n`;
  context += `8. Provide visual/media suggestions\n`;
  
  return context;
}

function generateFallbackStrategy(
  platform: string,
  niche: string,
  businessData: any,
  duration: number,
  questionnaire: any
) {
  const businessName = businessData?.business_name || 'your brand';
  const industry = niche || businessData?.industry || 'ecommerce';
  const objective = questionnaire?.primaryGoal || 'engagement';
  
  const weeklyThemes = [
    { week: 1, name: 'Awareness & Introduction', objective: 'Build brand recognition', content_types: ['introduction', 'behind-the-scenes', 'value proposition'], expected_outcome: 'Increased brand awareness', key_messages: ['Who we are', 'What makes us unique', 'Our story'] },
    { week: 2, name: 'Engagement & Community', objective: 'Spark conversations', content_types: ['questions', 'polls', 'user-generated'], expected_outcome: 'Higher engagement rates', key_messages: ['Join the conversation', 'Your voice matters', 'Community spotlight'] },
    { week: 3, name: 'Consideration & Trust', objective: 'Build credibility', content_types: ['testimonials', 'case-studies', 'tutorials'], expected_outcome: 'Increased trust and consideration', key_messages: ['Real results', 'Expert insights', 'How it works'] },
    { week: 4, name: 'Conversion & Action', objective: 'Drive conversions', content_types: ['offers', 'cta-focused', 'urgency'], expected_outcome: 'Higher conversion rates', key_messages: ['Limited time', 'Take action now', 'Your next step'] }
  ];
  
  const contentCalendar = [];
  for (let day = 1; day <= duration; day++) {
    contentCalendar.push(generateDayContent(day, platform, industry, businessName, questionnaire));
  }
  
  // Adjust metrics based on targets if provided
  const baseImpressions = questionnaire?.targetImpressions || 50000 * (duration / 30);
  const baseEngagement = questionnaire?.targetEngagementRate || 3.5;
  const baseConversions = questionnaire?.targetConversions || Math.floor(250 * (duration / 30));
  
  return {
    platform,
    niche: industry,
    objective,
    duration,
    generated_at: new Date().toISOString(),
    questionnaire_used: !!questionnaire?.primaryGoal,
    overview: {
      campaign_name: `${businessName} ${objective.charAt(0).toUpperCase() + objective.slice(1)} Campaign`,
      duration: `${duration} days`,
      primary_objective: objective,
      estimated_reach: baseImpressions,
      total_posts: duration,
      confidence_level: 'Medium',
      investment_recommendation: 'Moderate - Focus on organic growth with selective boosting of top performers',
      key_success_factors: [
        'Consistent posting at optimal times',
        'Engaging with audience comments quickly',
        'Testing and iterating on content formats',
        'Tracking metrics and adjusting strategy'
      ]
    },
    weekly_themes: weeklyThemes,
    content_calendar: contentCalendar,
    predicted_metrics: {
      impressions: baseImpressions,
      engagement_rate: baseEngagement,
      conversions: baseConversions,
      roi_percentage: 120,
      follower_growth: questionnaire?.targetFollowers || Math.floor(500 * (duration / 30)),
      confidence: 70
    },
    key_actions: [
      { action: 'Post consistently at optimal times', priority: 'high', expected_impact: '+25% reach', timing: 'Daily' },
      { action: 'Respond to all comments within 1 hour', priority: 'high', expected_impact: '+30% engagement', timing: 'Ongoing' },
      { action: 'Use trending audio/hashtags', priority: 'medium', expected_impact: '+40% discovery', timing: 'Weekly' },
      { action: 'Boost top 3 performing posts', priority: 'medium', expected_impact: '+50% reach', timing: 'End of Week 2' },
      { action: 'A/B test CTAs on conversion posts', priority: 'medium', expected_impact: '+15% conversions', timing: 'Week 4' }
    ],
    optimization_tips: [
      'Analyze your best-performing content and create more of what works',
      'Use Stories for behind-the-scenes and time-sensitive content',
      'Collaborate with micro-influencers in your niche',
      'Repurpose top content across different formats'
    ]
  };
}

function generateDayContent(day: number, platform: string, industry: string, businessName: string, questionnaire: any): any {
  const week = Math.ceil(day / 7);
  
  const themes = ['awareness', 'engagement', 'consideration', 'conversion'];
  const theme = themes[Math.min(week - 1, 3)];
  
  const contentTypes = getContentTypesForPlatform(platform);
  const contentType = contentTypes[day % contentTypes.length];
  
  const dayOfWeek = (day - 1) % 7;
  const times = ['9:00 AM', '12:00 PM', '3:00 PM', '6:00 PM', '8:00 PM'];
  const postTime = times[dayOfWeek % times.length];
  
  const content = generateContentForTheme(theme, industry, day, platform, businessName, questionnaire);
  
  return {
    day_number: day,
    content_hook: content.hook,
    content_body: content.body,
    content_cta: content.cta,
    content_type: contentType,
    content_theme: theme,
    post_time_recommended: postTime,
    expected_engagement_score: Math.floor(Math.random() * 20) + 60 + (week * 5),
    hashtags: generateHashtags(industry, platform),
    reasoning: content.reasoning,
    visual_suggestions: content.visual || `High-quality ${contentType} showcasing ${industry} content`,
    target_audience_segment: 'Primary audience',
    platform_specific_tips: getPlatformTips(platform)
  };
}

function getContentTypesForPlatform(platform: string): string[] {
  const platformTypes: Record<string, string[]> = {
    instagram: ['reel', 'carousel', 'image', 'story'],
    facebook: ['video', 'image', 'link', 'carousel'],
    twitter: ['text', 'image', 'thread', 'video'],
    linkedin: ['article', 'image', 'video', 'document'],
    tiktok: ['video', 'duet', 'stitch', 'trend']
  };
  return platformTypes[platform] || ['image', 'video', 'text'];
}

function generateContentForTheme(theme: string, industry: string, day: number, platform: string, businessName: string, questionnaire: any): { hook: string; body: string; cta: string; reasoning: string; visual?: string } {
  // Incorporate campaign themes if available
  const campaignTheme = questionnaire?.campaignThemes?.[day % (questionnaire.campaignThemes.length || 1)] || '';
  const themeContext = campaignTheme ? ` featuring ${campaignTheme}` : '';
  
  const templates: Record<string, any[]> = {
    awareness: [
      { hook: `Welcome to ${businessName}! Here's what makes us different...`, body: `We're passionate about helping ${industry} businesses succeed${themeContext}. Our approach focuses on quality, authenticity, and results that matter. Today we're sharing our story and why we do what we do.`, cta: 'Follow for more insights!', reasoning: 'Early awareness-building establishes brand identity', visual: 'Brand introduction video or team photo' },
      { hook: `3 things you didn't know about ${industry}...`, body: `Industry insight #1: Quality matters more than quantity. #2: Consistency builds trust. #3: Your unique story is your competitive advantage${themeContext}. These principles guide everything we do.`, cta: 'Save this for later!', reasoning: 'Educational content positions brand as thought leader', visual: 'Infographic or carousel with tips' },
      { hook: `Behind the scenes at ${businessName} ✨`, body: `Ever wonder what goes into creating exceptional ${industry} experiences${themeContext}? Here's a peek behind the curtain at our process, our team, and our commitment to excellence.`, cta: 'Want to see more? Comment below!', reasoning: 'Humanizes the brand and builds connection', visual: 'Behind-the-scenes photos or video' }
    ],
    engagement: [
      { hook: `Quick question for our community...`, body: `We want to know: What's your biggest challenge when it comes to ${industry}${themeContext}? Drop your answer in the comments - we read every single one and might feature your question in an upcoming post!`, cta: 'Comment your answer below! 👇', reasoning: 'Questions drive comments and boost algorithm', visual: 'Eye-catching question graphic' },
      { hook: `This or that? Let's settle this...`, body: `A fun debate in the ${industry} world! We're curious where you stand on this${themeContext}. Your vote helps us understand what matters most to our community.`, cta: 'Vote in the poll and share with friends!', reasoning: 'Interactive content increases engagement metrics', visual: 'Poll or comparison graphic' },
      { hook: `Share your experience! We want to hear from YOU`, body: `The best part of what we do is the community we've built${themeContext}. Today we're celebrating YOU by featuring some of your amazing stories and experiences with ${businessName}.`, cta: 'Tag us in your posts for a chance to be featured!', reasoning: 'UGC builds community and provides social proof', visual: 'User-generated content collage' }
    ],
    consideration: [
      { hook: `Real results from real customers...`, body: `Nothing speaks louder than results${themeContext}. Here's what ${industry} professionals are saying about their experience with ${businessName}. These transformations and testimonials show what's possible.`, cta: 'Ready to write your success story? Link in bio!', reasoning: 'Social proof builds trust during consideration phase', visual: 'Customer testimonial video or quote graphic' },
      { hook: `How we helped [Customer] achieve [Result]...`, body: `Case study breakdown: The challenge they faced, the solution we provided, and the results they achieved${themeContext}. This is why we love what we do - making a real difference in the ${industry}.`, cta: 'DM us to discuss your goals!', reasoning: 'Case studies demonstrate value and capability', visual: 'Before/after or results showcase' },
      { hook: `Step-by-step: How to get the most from ${industry}`, body: `Tutorial time! We're breaking down exactly how to maximize your results${themeContext}. These are the same strategies our most successful customers use.`, cta: 'Save this guide and try it today!', reasoning: 'Educational content showcases expertise', visual: 'Tutorial video or step-by-step carousel' }
    ],
    conversion: [
      { hook: `Limited time opportunity 🔥`, body: `We don't do this often, but this week we're offering something special for our community${themeContext}. If you've been thinking about taking the next step with ${businessName}, now is the time.`, cta: 'Tap the link in bio before it expires!', reasoning: 'Urgency drives action in conversion phase', visual: 'Promotional graphic with clear offer' },
      { hook: `Your journey starts here...`, body: `Ready to transform your ${industry} experience${themeContext}? Here's exactly what happens when you join ${businessName}: Step 1, Step 2, Step 3... It's simpler than you think.`, cta: 'Get started today - link in bio!', reasoning: 'Clear next steps reduce friction', visual: 'Process or journey infographic' },
      { hook: `Last call: Don't miss out!`, body: `Final reminder about our special offer${themeContext}. We've helped hundreds achieve their ${industry} goals, and we'd love for you to be next. The doors close soon.`, cta: 'Claim your spot now - link in bio!', reasoning: 'Final push with urgency and FOMO', visual: 'Countdown or last-chance graphic' }
    ]
  };
  
  const themeTemplates = templates[theme] || templates.awareness;
  const template = themeTemplates[day % themeTemplates.length];
  
  return template;
}

function generateHashtags(industry: string, platform: string): string[] {
  const industryTags: Record<string, string[]> = {
    ecommerce: ['ecommerce', 'onlineshopping', 'shopsmall', 'smallbusiness', 'entrepreneur'],
    saas: ['saas', 'tech', 'startup', 'software', 'productivity'],
    consulting: ['consulting', 'business', 'strategy', 'growth', 'leadership'],
    fitness: ['fitness', 'health', 'workout', 'motivation', 'wellness'],
    local_business: ['localbusiness', 'shoplocal', 'community', 'supportlocal', 'smallbusiness'],
    technology: ['tech', 'innovation', 'digital', 'software', 'startup'],
    healthcare: ['healthcare', 'health', 'wellness', 'medical', 'healthtech'],
    education: ['education', 'learning', 'edtech', 'teaching', 'knowledge'],
    finance: ['finance', 'fintech', 'investing', 'money', 'wealth'],
    retail: ['retail', 'shopping', 'fashion', 'style', 'newproduct']
  };
  
  const platformTags: Record<string, string[]> = {
    instagram: ['instagood', 'instadaily', 'trending', 'viral', 'reels'],
    tiktok: ['fyp', 'foryou', 'viral', 'trending', 'tiktokmademebuythis'],
    linkedin: ['linkedin', 'networking', 'professional', 'career', 'industry'],
    twitter: ['trending', 'viral', 'community', 'business', 'tips'],
    facebook: ['facebooklive', 'community', 'smallbusiness', 'entrepreneur', 'tips']
  };
  
  return [
    ...(industryTags[industry] || industryTags.ecommerce).slice(0, 3),
    ...(platformTags[platform] || platformTags.instagram).slice(0, 2)
  ];
}

function getPlatformTips(platform: string): string[] {
  const tips: Record<string, string[]> = {
    instagram: ['Use trending audio for Reels', 'Post during peak hours (9am, 12pm, 7pm)', 'Engage with comments in first hour'],
    tiktok: ['Hook viewers in first 2 seconds', 'Use trending sounds', 'Post 1-3 times daily'],
    linkedin: ['Use professional tone', 'Include relevant hashtags', 'Engage with industry peers'],
    twitter: ['Keep it concise', 'Use relevant hashtags', 'Engage in conversations'],
    facebook: ['Use video when possible', 'Encourage shares', 'Post in groups']
  };
  return tips[platform] || tips.instagram;
}
