import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { serviceClient } from "../_shared/supabase.ts";
import { checkRateLimit, clientKey } from "../_shared/rate-limit.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface ContextPreferences {
  response_style?: 'concise' | 'detailed' | 'balanced';
  tone_preference?: 'formal' | 'casual' | 'balanced';
  include_examples?: boolean;
  technical_level?: 'beginner' | 'intermediate' | 'advanced';
  creativity_level?: 'conservative' | 'balanced' | 'bold';
}

interface BusinessContext {
  businessProfile?: any;
  recentAnalytics?: any[];
  pastStrategies?: any[];
  interactionPatterns?: any;
  performanceTrends?: any;
  behaviorPatterns?: any[];
  learningMetrics?: any;
  contentTrends?: any[];
  contentPerformance?: any[];
}

function buildCognitiveSystemPrompt(
  context: BusinessContext, 
  preferences: ContextPreferences,
  conversationHistory: Array<{role: string; content: string}>,
  businessSettings?: any
): string {
  const { businessProfile: bp, recentAnalytics, pastStrategies, performanceTrends, interactionPatterns, behaviorPatterns, learningMetrics, contentTrends, contentPerformance } = context;
  const { 
    response_style = 'balanced', 
    tone_preference = 'balanced', 
    include_examples = true,
    technical_level = 'intermediate',
    creativity_level = 'balanced'
  } = preferences;

  let prompt = `You are Korex Intelligence — an advanced AI marketing strategist with COGNITIVE ARCHITECTURE V2.0 — featuring meta-learning, predictive modeling, user behavior analysis, and self-improving intelligence.

═══════════════════════════════════════════════════════════════
CLIENT PROFILE - BUSINESS
═══════════════════════════════════════════════════════════════
`;

  if (bp) {
    prompt += `BUSINESS: ${bp.businessName || 'Not specified'}
INDUSTRY: ${bp.industry || 'Not specified'}
BUSINESS TYPE: ${bp.businessType || 'Not specified'}
STAGE: ${bp.stage || 'Not specified'}
`;
    if (bp.summary) prompt += `\nOVERVIEW: ${bp.summary}\n`;
    if (bp.productsServices?.length) {
      prompt += `\nPRODUCTS/SERVICES:\n${bp.productsServices.map((p: any) => `- ${p.name}${p.category ? ` [${p.category}]` : ''}: ${p.description || 'No description'}`).join('\n')}\n`;
    }
    if (bp.targetAudience) {
      const ta = bp.targetAudience;
      prompt += `\nTARGET AUDIENCE:\n- Age: ${ta.ageRange || 'N/A'} | Type: ${ta.customerType || 'N/A'} | Gender: ${ta.genderFocus || 'N/A'} | Income: ${ta.incomeLevel || 'N/A'}\n`;
      if (ta.interests?.length) prompt += `- Interests: ${ta.interests.join(', ')}\n`;
      if (ta.painPoints?.length) prompt += `- Pain Points: ${ta.painPoints.join(', ')}\n`;
    }
    if (bp.brandIdentity) {
      const bi = bp.brandIdentity;
      prompt += `\nBRAND IDENTITY:\n- Voice Scale: ${bi.voiceScale || 5}/10 | ${bi.toneCharacteristics?.join(', ') || 'balanced'}\n`;
      if (bi.valueProposition) prompt += `- Value Prop: ${bi.valueProposition}\n`;
      if (bi.competitiveAdvantages?.length) prompt += `- Competitive Edges: ${bi.competitiveAdvantages.join(', ')}\n`;
    }
    if (bp.competitors?.length) prompt += `\nCOMPETITORS: ${bp.competitors.join(', ')}\n`;
    if (bp.marketingMaturity) {
      prompt += `\nMARKETING MATURITY: Website ${bp.marketingMaturity.websiteQuality}/10 | SEO: ${bp.marketingMaturity.seoLevel} | Social: ${bp.marketingMaturity.socialPresence}\n`;
    }
  } else {
    prompt += `No business profile yet. Suggest analyzing their website for personalized recommendations.\n`;
  }

  // Performance data
  prompt += `\n═══════════════════════════════════════════════════════════════
CURRENT PERFORMANCE DATA
═══════════════════════════════════════════════════════════════\n`;

  if (recentAnalytics?.length) {
    recentAnalytics.forEach((analytics: any, idx: number) => {
      const label = idx === 0 ? 'LATEST' : `PREVIOUS (#${idx + 1})`;
      prompt += `\n${label} ANALYTICS (${analytics.platform?.toUpperCase() || 'Unknown'}): Health ${analytics.healthScore || 'N/A'}/10 | Rating: ${analytics.performanceRating || 'N/A'}\n`;
      if (analytics.metrics) {
        const m = analytics.metrics;
        if (m.followers) prompt += `- Followers: ${m.followers.toLocaleString()}${m.followers_change ? ` (${m.followers_change > 0 ? '+' : ''}${m.followers_change}%)` : ''}\n`;
        if (m.engagement_rate) prompt += `- Engagement Rate: ${m.engagement_rate}%\n`;
        if (m.reach) prompt += `- Reach: ${m.reach.toLocaleString()}\n`;
        if (m.best_content_type) prompt += `- Best Content: ${m.best_content_type}\n`;
      }
      if (analytics.trendAnalysis?.positive_trends?.length) {
        prompt += `Strengths: ${analytics.trendAnalysis.positive_trends.slice(0, 3).map((t: any) => t.metric || t).join(', ')}\n`;
      }
      if (analytics.trendAnalysis?.negative_trends?.length) {
        prompt += `Issues: ${analytics.trendAnalysis.negative_trends.slice(0, 3).map((t: any) => t.metric || t).join(', ')}\n`;
      }
    });
  } else {
    prompt += `No analytics uploaded yet.\n`;
  }

  if (performanceTrends) {
    prompt += `\nTRENDS: ${performanceTrends.trajectory || 'stable'} | Engagement: ${performanceTrends.engagementTrend || 'N/A'} | Momentum: ${performanceTrends.growthMomentum || 'N/A'}\n`;
  }

  if (pastStrategies?.length) {
    prompt += `\nPAST STRATEGIES: ${pastStrategies.length} created | Platforms: ${[...new Set(pastStrategies.map((s: any) => s.platform))].join(', ')}\n`;
  }

  // === NEW: BEHAVIOR INTELLIGENCE LAYER ===
  prompt += `\n═══════════════════════════════════════════════════════════════
LAYER 1: USER BEHAVIOR INTELLIGENCE
═══════════════════════════════════════════════════════════════\n`;

  if (behaviorPatterns?.length) {
    behaviorPatterns.forEach((bp: any) => {
      const bd = bp.behavior_data || {};
      prompt += `\nPLATFORM: ${bp.platform} | Learning Confidence: ${(bp.learning_confidence * 100).toFixed(0)}%\n`;
      if (bd.content_type_preferences) prompt += `Content Preferences: ${JSON.stringify(bd.content_type_preferences)}\n`;
      if (bd.topic_preferences) prompt += `Topic Preferences: ${JSON.stringify(bd.topic_preferences)}\n`;
      if (bd.engagement_patterns) prompt += `Engagement Patterns: ${JSON.stringify(bd.engagement_patterns)}\n`;
      if (bd.completion_rates) prompt += `Completion Rates: ${JSON.stringify(bd.completion_rates)}\n`;
      if (bd.hook_effectiveness) prompt += `Hook Effectiveness: ${JSON.stringify(bd.hook_effectiveness)}\n`;
      if (bd.cta_response_rates) prompt += `CTA Response Rates: ${JSON.stringify(bd.cta_response_rates)}\n`;
      if (bd.time_preferences) prompt += `Optimal Times: ${JSON.stringify(bd.time_preferences)}\n`;
      if (bd.audience_segments) prompt += `Top Segments: ${JSON.stringify(bd.audience_segments)}\n`;
      if (bd.rewatch_patterns) prompt += `Rewatch Patterns: ${JSON.stringify(bd.rewatch_patterns)}\n`;

      prompt += `\nREASONING DIRECTIVES for ${bp.platform}:\n`;
      if (bd.content_type_preferences) {
        const prefs = bd.content_type_preferences;
        const sorted = Object.entries(prefs).sort(([,a]: any, [,b]: any) => b - a);
        if (sorted.length >= 2) {
          const [topType, topScore] = sorted[0];
          const [lowType, lowScore] = sorted[sorted.length - 1];
          prompt += `- ${topType} is ${((topScore as number) / (lowScore as number)).toFixed(1)}x more effective than ${lowType}\n`;
        }
      }
      if (bd.topic_preferences) {
        const topics = bd.topic_preferences;
        const sorted = Object.entries(topics).sort(([,a]: any, [,b]: any) => b - a);
        if (sorted.length >= 2) {
          prompt += `- Best topic: ${sorted[0][0]} (${((sorted[0][1] as number) * 100).toFixed(0)}%), Worst: ${sorted[sorted.length - 1][0]} (${((sorted[sorted.length - 1][1] as number) * 100).toFixed(0)}%)\n`;
        }
      }
      if (bd.hook_effectiveness) {
        const hooks = bd.hook_effectiveness;
        const best = Object.entries(hooks).sort(([,a]: any, [,b]: any) => b - a)[0];
        if (best) prompt += `- Prioritize ${best[0]} hooks (${((best[1] as number) * 100).toFixed(0)}% effectiveness)\n`;
      }
    });
  } else {
    prompt += `No behavior patterns yet. Use industry benchmarks. Recommend uploading analytics for personalized insights.\n`;
  }

  // === META-LEARNING LAYER ===
  prompt += `\n═══════════════════════════════════════════════════════════════
LAYER 2: META-LEARNING & PREDICTION CALIBRATION
═══════════════════════════════════════════════════════════════\n`;

  if (learningMetrics) {
    prompt += `AI Prediction Accuracy: ${(learningMetrics.avg_accuracy * 100).toFixed(1)}% average over ${learningMetrics.total_predictions} predictions\n`;
    if (learningMetrics.bias_direction) {
      prompt += `Systematic Bias: ${learningMetrics.bias_direction} by ${(Math.abs(learningMetrics.avg_variance) * 100).toFixed(1)}%\n`;
      prompt += `CALIBRATION: Adjust predictions ${learningMetrics.bias_direction === 'overestimate' ? 'downward' : 'upward'} by ${(Math.abs(learningMetrics.avg_variance) * 100).toFixed(1)}%\n`;
    }
    if (learningMetrics.by_type) {
      prompt += `Accuracy by Type: ${JSON.stringify(learningMetrics.by_type)}\n`;
    }
    const confidence = learningMetrics.avg_accuracy > 0.85 ? 'high' : learningMetrics.avg_accuracy > 0.7 ? 'medium' : 'low';
    prompt += `Overall Prediction Confidence: ${confidence}\n`;
  } else {
    prompt += `No prediction history yet. Use conservative estimates with wide confidence intervals.\n`;
  }

  // === CONTENT PERFORMANCE LAYER ===
  if (contentPerformance?.length) {
    prompt += `\n═══════════════════════════════════════════════════════════════
LAYER 3: CONTENT PERFORMANCE HISTORY (PREDICTED vs ACTUAL)
═══════════════════════════════════════════════════════════════\n`;
    contentPerformance.slice(0, 10).forEach((cp: any) => {
      const pvp = cp.performance_vs_predicted || {};
      prompt += `- ${cp.platform} (${cp.post_date || 'N/A'}): Predicted ${pvp.predicted?.engagement_rate || 'N/A'}% → Actual ${pvp.actual?.engagement_rate || 'N/A'}% (Accuracy: ${pvp.accuracy_score ? (pvp.accuracy_score * 100).toFixed(0) + '%' : 'N/A'})\n`;
    });
  }

  // === TRENDS LAYER ===
  if (contentTrends?.length) {
    prompt += `\n═══════════════════════════════════════════════════════════════
LAYER 4: ACTIVE CONTENT TRENDS
═══════════════════════════════════════════════════════════════\n`;
    contentTrends.forEach((trend: any) => {
      prompt += `- [${trend.trend_type.toUpperCase()}] ${trend.platform}: ${trend.content_category || 'General'} (Confidence: ${(trend.confidence_score * 100).toFixed(0)}%)\n`;
      if (trend.trend_data) {
        const td = trend.trend_data;
        if (td.hook_patterns?.length) prompt += `  Hooks: ${td.hook_patterns.join(', ')}\n`;
        if (td.format_trends?.length) prompt += `  Formats: ${td.format_trends.join(', ')}\n`;
        if (td.engagement_multipliers) prompt += `  Multipliers: ${JSON.stringify(td.engagement_multipliers)}\n`;
      }
    });
  }

  // === USER BUSINESS SETTINGS (HIGHEST PRIORITY) ===
  prompt += `\n═══════════════════════════════════════════════════════════════
USER BUSINESS SETTINGS (HIGHEST PRIORITY CONTEXT)
═══════════════════════════════════════════════════════════════\n`;

  if (businessSettings) {
    const bs = businessSettings;
    const ta = bs.target_audience || {};
    const cp = bs.content_preferences || {};
    const enabledPrefs = Object.entries(cp).filter(([,v]) => v).map(([k]) => k.replace('_', ' '));
    
    prompt += `Business Name: ${bs.business_name || 'Not set'}
Industry: ${bs.industry || 'Not set'}
Business Type: ${bs.business_type || 'Not set'}
Target Audience:
  - Age Range: ${ta.age_range || 'Not set'}
  - Demographics: ${ta.demographics || 'Not set'}
  - Psychographics: ${ta.psychographics || 'Not set'}
  - Pain Points: ${ta.pain_points || 'Not set'}
Brand Voice: ${bs.brand_voice || 'Not set'}
Products/Services: ${Array.isArray(bs.products_services) && bs.products_services.length ? bs.products_services.join(', ') : 'Not set'}
Geographic Focus: ${bs.geographic_focus || 'Not set'}
Price Range: ${bs.price_range || 'Not set'}
Marketing Goals: ${Array.isArray(bs.marketing_goals) && bs.marketing_goals.length ? bs.marketing_goals.join(', ') : 'Not set'}
Preferred Platforms: ${Array.isArray(bs.preferred_platforms) && bs.preferred_platforms.length ? bs.preferred_platforms.join(', ') : 'Not set'}
Posting Frequency: ${bs.posting_frequency || 'Not set'}
Content Preferences: ${enabledPrefs.length ? enabledPrefs.join(', ') : 'Not set'}
Competitors: ${Array.isArray(bs.competitors) && bs.competitors.length ? bs.competitors.join(', ') : 'Not set'}
Unique Value Proposition: ${bs.unique_value_proposition || 'Not set'}
Additional Context: ${bs.additional_context || 'None'}
`;
  } else {
    prompt += `No business settings configured yet. User should complete settings at /settings for more personalized strategies.\n`;
  }

  // Conversation context with extended history
  if (conversationHistory.length > 0) {
    const recentMessages = conversationHistory.slice(-20);
    const topics = extractTopics(recentMessages);
    const phase = detectConversationPhase(recentMessages);
    prompt += `\n═══════════════════════════════════════════════════════════════
CONVERSATION HISTORY (Last ${recentMessages.length} messages)
═══════════════════════════════════════════════════════════════
Phase: ${phase} | Topics: ${topics.join(', ') || 'General'} | Messages: ${conversationHistory.length}
${recentMessages.map(m => `[${m.role.toUpperCase()}]: ${m.content.slice(0, 200)}${m.content.length > 200 ? '...' : ''}`).join('\n')}\n`;
  }

  if (interactionPatterns) {
    prompt += `\nUSER PATTERNS: ${interactionPatterns.frequentTopics?.join(', ') || 'N/A'} | Skill: ${interactionPatterns.skillLevel || 'N/A'}\n`;
  }

  // Preferences
  prompt += `\n═══════════════════════════════════════════════════════════════
COGNITIVE ARCHITECTURE DIRECTIVES
═══════════════════════════════════════════════════════════════

PREDICTIVE MODELING:
- Calculate viral_score = (hook_strength × 0.25) + (shareability × 0.25) + (trend_alignment × 0.25) + (emotional_resonance × 0.25)
- Provide confidence intervals: predicted_value ± X% based on learning confidence
- Use multi-factor prediction: base_rate × content_type_mult × topic_mult × time_mult × hook_mult × trend_mult
- If learning confidence < 0.5, use wider intervals and state uncertainty

STRATEGIC REASONING:
- Causal chain analysis: Don't just correlate, establish causation chains
- Multi-step reasoning: Connect tactical advice to strategic goals
- Risk-reward matrices: (Expected_Impact × Probability) ÷ (Effort + Risk)
- Opportunity cost analysis for content decisions
- Temporal reasoning: Different recommendations for different times/seasons

CREATIVE INTELLIGENCE:
- Hook Psychology: curiosity_gap, pattern_interrupt, bold_statement, social_proof, scarcity, story_hook
- Select hooks based on hook_effectiveness data for this user's audience
- Viral mechanics: identity expression, social currency, practical value, emotional resonance
- Content gap identification: What competitors aren't doing

ADAPTIVE LEARNING:
- Weight recent data more: new_score = (0.7 × latest) + (0.3 × previous)
- Detect content fatigue: If 5+ similar posts in 30 days with declining completion
- Personalization depth: More data = more specific recommendations
- Anomaly detection: Flag sudden metric deviations

PLATFORM ALGORITHM INTELLIGENCE:
- Instagram: Reels 50% reach boost, saves signal quality, first 60 min engagement critical
- TikTok: Completion rate is king, first 3 seconds, trending audio, batch testing
- LinkedIn: Native content, dwell time, comments > likes, personal 8x company reach
- YouTube: Watch time, CTR thumbnails, first 30 seconds, consistency
- Facebook: Groups 10x reach, video completion, shares > likes
- Twitter/X: Recency, threads > singles, quote tweets boost

RESPONSE REQUIREMENTS:
1. Evidence-based: Cite specific data from behavior_patterns, content_performance, or trends
2. Predictive: Include forecasts with confidence intervals when relevant
3. Personalized: Reference user's specific patterns, never generic advice
4. Actionable: Concrete steps implementable today
5. Confidence-calibrated: State certainty level based on learning_confidence
6. Self-aware: Acknowledge what you don't know
7. Strategic: Connect tactics to larger goals
8. Creative: Offer novel ideas using psychological triggers

Style: ${response_style} | Tone: ${tone_preference} | Technical: ${technical_level} | Creativity: ${creativity_level}
${include_examples ? 'Include relevant examples' : 'Focus on principles'}

CRITICAL BEHAVIOR WHEN GENERATING STRATEGIES:
1. Before generating any strategy, FIRST review all available business context (settings + analytics + website data)
2. Present a confirmation message summarizing your understanding of their business:
   - Business name, industry, target audience, brand voice, marketing goals
   - Current performance metrics if analytics are available
3. Ask for explicit confirmation: "Is this correct? If you need to update any business information, you can edit your settings using the settings icon in the top right corner. Please confirm and I'll generate your comprehensive strategy."
4. If business settings are incomplete (missing business name, target audience, or industry), prompt: "I notice some key business details are missing. For the most personalized strategy, please complete your business settings using the ⚙️ icon. Would you like to proceed with what I have, or update your settings first?"

IMPORTANT: When the user uploads analytics files (screenshots, CSVs, PDFs, spreadsheets), do NOT send a separate business context confirmation. Jump directly into comprehensive analysis. Include a brief "Business Context" footer at the end of your analysis noting what profile you used, but do NOT ask for confirmation before analyzing. The analytics results should be the primary focus.

CONTEXT PRIORITY:
1. User Business Settings (highest priority - user-verified data)
2. Conversation History (20 messages for continuity)
3. Recent Analytics (uploaded performance data)
4. Website Analysis (scraped data, fallback)

MEMORY CONTINUITY:
- Use full 20-message history to maintain context across the conversation
- Remember previous recommendations and build upon them
- Avoid repeating advice already given
- Reference previous strategies when making new suggestions

Every response should feel uniquely personalized, data-driven, and strategically valuable. Reference their business by name, cite their metrics, and provide specific predictions with confidence levels.`;

  return prompt;
}

function extractTopics(messages: Array<{role: string; content: string}>): string[] {
  const topics: string[] = [];
  const content = messages.map(m => m.content.toLowerCase()).join(' ');
  
  if (content.includes('strategy') || content.includes('plan')) topics.push('strategy');
  if (content.includes('engagement') || content.includes('likes')) topics.push('engagement');
  if (content.includes('instagram') || content.includes('ig')) topics.push('Instagram');
  if (content.includes('tiktok')) topics.push('TikTok');
  if (content.includes('linkedin')) topics.push('LinkedIn');
  if (content.includes('facebook')) topics.push('Facebook');
  if (content.includes('content') || content.includes('post')) topics.push('content');
  if (content.includes('analytics') || content.includes('metrics')) topics.push('analytics');
  if (content.includes('competitor')) topics.push('competitors');
  if (content.includes('audience') || content.includes('target')) topics.push('audience');
  if (content.includes('growth') || content.includes('follower')) topics.push('growth');
  
  return [...new Set(topics)].slice(0, 7);
}

function detectConversationPhase(messages: Array<{role: string; content: string}>): string {
  const content = messages.map(m => m.content.toLowerCase()).join(' ');
  if (content.includes('optimize') || content.includes('improve') || content.includes('results')) return 'Optimization';
  if (content.includes('implement') || content.includes('execute') || content.includes('how do i')) return 'Implementation';
  if (content.includes('strategy') || content.includes('plan') || content.includes('create')) return 'Strategy';
  if (content.includes('analytics') || content.includes('performance') || content.includes('data')) return 'Analysis';
  return 'Discovery';
}

async function fetchEnhancedContext(supabase: any, userId: string, conversationId?: string): Promise<{ context: BusinessContext; businessSettings: any; conversationHistory: Array<{role: string; content: string}> }> {
  const context: BusinessContext = {};
  let businessSettings: any = null;
  let conversationHistory: Array<{role: string; content: string}> = [];

  try {
    // Try fast in-memory + DB cache for global content_trends (identical for all users; refreshed every 5 min).
    // This drops one Postgres roundtrip per chat turn at scale without affecting AI freshness.
    const TRENDS_CACHE_KEY = 'global:content_trends:v1';
    const trendsFromCachePromise = (async () => {
      const { data: cached } = await supabase
        .from('cache_entries')
        .select('cached_data, expires_at')
        .eq('cache_key', TRENDS_CACHE_KEY)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();
      return cached?.cached_data ?? null;
    })();

    const fetchPromises: Promise<any>[] = [
      supabase.from('business_context').select('*').eq('user_id', userId).eq('is_active', true).maybeSingle(),
      supabase.from('uploaded_analytics').select('*').eq('user_id', userId).order('uploaded_at', { ascending: false }).limit(3),
      supabase.from('content_strategies').select('id, platform, created_at, predicted_metrics, total_posts').eq('user_id', userId).order('created_at', { ascending: false }).limit(5),
      supabase.from('user_behavior_patterns').select('*').eq('user_id', userId),
      trendsFromCachePromise.then(async (cachedTrends) => {
        if (cachedTrends) return { data: cachedTrends };
        const fresh = await supabase.from('content_trends').select('*').eq('is_active', true).order('last_updated', { ascending: false }).limit(15);
        if (fresh?.data) {
          // 5-minute TTL keeps the AI on the latest trends while cutting reads ~20x
          const expires = new Date(Date.now() + 5 * 60 * 1000).toISOString();
          await supabase.from('cache_entries').upsert({
            cache_key: TRENDS_CACHE_KEY,
            cache_type: 'content_trends',
            cached_data: fresh.data,
            user_id: userId,
            expires_at: expires,
          }, { onConflict: 'cache_key' });
        }
        return fresh;
      }),
      supabase.from('content_performance').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(10),
      supabase.from('ai_learning_metrics').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(50),
      supabase.from('user_business_settings').select('*').eq('user_id', userId).maybeSingle(),
      supabase.from('business_information').select('*').eq('user_id', userId).maybeSingle(),
    ];

    // Also fetch extended conversation history if conversationId provided
    if (conversationId) {
      fetchPromises.push(
        supabase.from('ai_messages').select('role, content, created_at').eq('conversation_id', conversationId).order('created_at', { ascending: false }).limit(20)
      );
    }

    const results = await Promise.all(fetchPromises);

    const [businessRes, analyticsRes, strategiesRes, behaviorRes, trendsRes, performanceRes, learningRes, settingsRes, businessInfoRes, ...rest] = results;

    businessSettings = settingsRes?.data || null;
    const businessInfo = businessInfoRes?.data || null;

    // If user_business_settings is empty but business_information has data, map it
    if (!businessSettings && businessInfo) {
      businessSettings = {
        business_name: businessInfo.business_name,
        industry: businessInfo.industry,
        business_type: businessInfo.business_type,
        target_audience: {
          age_range: businessInfo.target_age_min && businessInfo.target_age_max ? `${businessInfo.target_age_min}-${businessInfo.target_age_max}` : 'Not set',
          demographics: businessInfo.gender_distribution ? `Gender: ${JSON.stringify(businessInfo.gender_distribution)}` : 'Not set',
          psychographics: businessInfo.buying_behavior ? `Buying behavior: ${businessInfo.buying_behavior}` : 'Not set',
          pain_points: businessInfo.customer_pain_points || 'Not set',
        },
        brand_voice: businessInfo.brand_voice_traits?.length ? businessInfo.brand_voice_traits.join(', ') : 'Not set',
        products_services: businessInfo.primary_products_services ? [businessInfo.primary_products_services] : [],
        geographic_focus: businessInfo.geographic_focus?.length ? businessInfo.geographic_focus.join(', ') : 'Not set',
        price_range: businessInfo.monthly_revenue_range || 'Not set',
        marketing_goals: [],
        preferred_platforms: [],
        posting_frequency: businessInfo.content_creation_frequency || 'Not set',
        competitors: businessInfo.top_competitors || [],
        unique_value_proposition: businessInfo.unique_value_proposition || 'Not set',
        additional_context: `Company size: ${businessInfo.company_size || 'N/A'}, Location: ${businessInfo.location || 'N/A'}, Stage: ${businessInfo.business_stage || 'N/A'}, Years: ${businessInfo.years_in_business || 'N/A'}, Website: ${businessInfo.website || 'N/A'}, Competitive advantage: ${businessInfo.competitive_advantage || 'N/A'}, Monthly visitors: ${businessInfo.monthly_website_visitors || 'N/A'}, Social followers: ${businessInfo.total_social_followers || 'N/A'}, Engagement rate: ${businessInfo.avg_post_engagement_rate || 'N/A'}%, Conversion rate: ${businessInfo.current_conversion_rate || 'N/A'}%, CAC: $${businessInfo.customer_acquisition_cost || 'N/A'}, Email subscribers: ${businessInfo.email_subscriber_count || 'N/A'}, Brand colors: ${businessInfo.primary_brand_color || 'N/A'} / ${businessInfo.secondary_brand_color || 'N/A'}, Content themes: ${JSON.stringify(businessInfo.content_themes) || 'N/A'}, Brand values: ${JSON.stringify(businessInfo.brand_values) || 'N/A'}, Best performing content: ${JSON.stringify(businessInfo.best_performing_content_types) || 'N/A'}`,
      };
    } else if (businessSettings && businessInfo) {
      // Merge: fill any gaps in businessSettings with businessInfo data
      if (!businessSettings.business_name) businessSettings.business_name = businessInfo.business_name;
      if (!businessSettings.industry) businessSettings.industry = businessInfo.industry;
      if (!businessSettings.business_type) businessSettings.business_type = businessInfo.business_type;
      if (!businessSettings.unique_value_proposition) businessSettings.unique_value_proposition = businessInfo.unique_value_proposition;
      if ((!businessSettings.competitors || !businessSettings.competitors.length) && businessInfo.top_competitors?.length) {
        businessSettings.competitors = businessInfo.top_competitors;
      }
    }

    if (rest.length > 0 && rest[0]?.data) {
      conversationHistory = (rest[0].data as Array<{role: string; content: string}>).reverse();
    }

    if (businessRes.data?.business_profile) {
      context.businessProfile = businessRes.data.business_profile;
    }

    if (analyticsRes.data?.length) {
      context.recentAnalytics = analyticsRes.data.map((a: any) => ({
        platform: a.platform,
        metrics: a.extracted_data,
        insights: a.ai_insights,
        healthScore: a.overall_health_score,
        performanceRating: a.performance_rating,
        trendAnalysis: a.trend_analysis,
        recommendations: a.recommendations,
      }));

      if (analyticsRes.data.length > 1) {
        context.performanceTrends = calculateTrends(analyticsRes.data);
      }
    }

    if (strategiesRes.data?.length) {
      context.pastStrategies = strategiesRes.data.map((s: any) => ({
        id: s.id, platform: s.platform, created_at: s.created_at,
        predicted_metrics: s.predicted_metrics, posts_count: s.total_posts,
      }));
    }

    if (behaviorRes.data?.length) context.behaviorPatterns = behaviorRes.data;
    if (trendsRes.data?.length) context.contentTrends = trendsRes.data;
    if (performanceRes.data?.length) context.contentPerformance = performanceRes.data;

    if (learningRes.data?.length) {
      const metrics = learningRes.data;
      const avgAccuracy = metrics.reduce((sum: number, m: any) => sum + (m.accuracy_score || 0), 0) / metrics.length;
      const avgVariance = metrics.reduce((sum: number, m: any) => sum + (m.variance || 0), 0) / metrics.length;
      
      const byType: Record<string, number> = {};
      metrics.forEach((m: any) => {
        if (!byType[m.prediction_type]) byType[m.prediction_type] = 0;
        byType[m.prediction_type] += (m.accuracy_score || 0);
      });
      Object.keys(byType).forEach(k => {
        const count = metrics.filter((m: any) => m.prediction_type === k).length;
        byType[k] = byType[k] / count;
      });

      context.learningMetrics = {
        avg_accuracy: avgAccuracy,
        avg_variance: avgVariance,
        total_predictions: metrics.length,
        bias_direction: avgVariance > 0.05 ? 'underestimate' : avgVariance < -0.05 ? 'overestimate' : 'calibrated',
        by_type: byType,
      };
    }
  } catch (error) {
    console.error('Error fetching enhanced context:', error);
  }

  return { context, businessSettings, conversationHistory };
}

function calculateTrends(analyticsData: any[]): any {
  if (analyticsData.length < 2) return null;
  const latest = analyticsData[0].extracted_data || {};
  const previous = analyticsData[1].extracted_data || {};
  let engagementChange = 0;
  if (latest.engagement_rate && previous.engagement_rate) {
    engagementChange = ((latest.engagement_rate - previous.engagement_rate) / previous.engagement_rate) * 100;
  }
  let trajectory = 'stable';
  if (engagementChange > 10) trajectory = 'improving';
  else if (engagementChange < -10) trajectory = 'declining';
  return {
    trajectory,
    engagementTrend: engagementChange > 0 ? `+${engagementChange.toFixed(1)}%` : `${engagementChange.toFixed(1)}%`,
    growthMomentum: trajectory === 'improving' ? 'Accelerating' : trajectory === 'declining' ? 'Slowing' : 'Steady',
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { messages, userId, conversationId, businessContext: providedContext, context_preferences = {} } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: 'messages array is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Bound payload + apply generous per-user/IP rate limit to deter abuse
    // without affecting real usage. Response shape unchanged.
    if (messages.length > 200) {
      return new Response(JSON.stringify({ error: 'messages array too large' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const rlKey = userId ? `ai-chat:user:${userId}` : clientKey(req, 'ai-chat');
    const rl = await checkRateLimit(rlKey, { limit: 60, windowMs: 60_000 });
    if (!rl.ok) {
      return new Response(JSON.stringify({ error: 'Too many requests. Please slow down.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    console.log('Cognitive AI Chat V2:', { messagesCount: messages.length, hasUserId: !!userId });

    let fullContext: BusinessContext = providedContext || {};
    let businessSettings: any = null;
    let dbConversationHistory: Array<{role: string; content: string}> = [];

    if (userId) {
      const supabase = serviceClient();
      const { context: dbContext, businessSettings: dbSettings, conversationHistory } = await fetchEnhancedContext(supabase, userId, conversationId);
      fullContext = {
        ...dbContext,
        businessProfile: providedContext?.businessProfile || dbContext.businessProfile,
        recentAnalytics: providedContext?.recentAnalytics?.length ? providedContext.recentAnalytics : dbContext.recentAnalytics,
      };
      businessSettings = dbSettings;
      dbConversationHistory = conversationHistory;
    }

    const systemPrompt = buildCognitiveSystemPrompt(fullContext, context_preferences as ContextPreferences, dbConversationHistory.length > 0 ? dbConversationHistory : messages, businessSettings);
    console.log('Cognitive prompt length:', systemPrompt.length);

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [{ role: 'system', content: systemPrompt }, ...messages],
        stream: true,
        temperature: 0.7,
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) return new Response(JSON.stringify({ error: 'AI Gateway rate limit reached. Please retry in a moment.' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      if (response.status === 402) return new Response(JSON.stringify({ error: 'Workspace AI credits are depleted. Add credits in Lovable → Settings → Plans & credits, then retry.', code: 'AI_CREDITS_DEPLETED' }), { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      return new Response(JSON.stringify({ error: 'AI service error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(response.body, { headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' } });

  } catch (error) {
    console.error('Cognitive AI Chat error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
