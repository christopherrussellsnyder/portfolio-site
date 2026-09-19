import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { serviceClient } from "../_shared/supabase.ts";
import { checkRateLimit, clientKey } from "../_shared/rate-limit.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const JSON_SCHEMA = `{
  "metadata": {
    "platform": "",
    "platform_confidence": "High/Medium/Low",
    "platform_type": "social/advertising",
    "interface_type": "Native mobile app/Desktop web/Third-party analytics tool/Ad Manager/Data Export",
    "screen_type": "Profile analytics/Post insights/Ad performance/Campaign dashboard/Audience demographics/Content performance/Export data",
    "time_period": { "start_date": "", "end_date": "", "duration": "", "granularity": "Hourly/Daily/Weekly/Monthly" },
    "comparison_period": null,
    "analysis_timestamp": "",
    "data_completeness": "Complete/Substantial/Partial/Limited",
    "data_completeness_explanation": "",
    "data_completeness_score": 0.5
  },
  "extracted_metrics": {
    "account_metrics": { "followers": null, "followers_change": null, "followers_change_percent": null, "following": null, "posts_count": null, "posts_count_change": null },
    "engagement_metrics": { "total_likes": null, "total_likes_change": null, "total_comments": null, "total_comments_change": null, "total_shares": null, "total_shares_change": null, "total_saves": null, "total_saves_change": null, "engagement_rate": null, "engagement_rate_change": null, "avg_engagement_per_post": null },
    "reach_metrics": { "reach": null, "reach_change": null, "reach_change_percent": null, "impressions": null, "impressions_change": null, "impressions_change_percent": null, "frequency": null, "viral_reach": null, "organic_reach": null, "paid_reach": null },
    "traffic_metrics": { "profile_visits": null, "profile_visits_change": null, "link_clicks": null, "link_clicks_change": null, "website_clicks": null, "email_clicks": null, "direction_clicks": null, "conversions": null, "conversion_rate": null },
    "audience_metrics": { "top_locations": [], "age_distribution": [], "gender_distribution": null, "active_times": [], "new_vs_returning": null, "audience_growth_rate": null },
    "content_performance": { "top_posts": [], "best_content_type": null, "best_content_engagement_rate": null, "avg_post_reach": null, "avg_post_engagement": null, "worst_content_type": null },
    "video_metrics": { "total_views": null, "avg_watch_time": null, "completion_rate": null, "reel_plays": null, "reel_engagement_rate": null, "story_views": null, "story_interactions": null, "story_completion_rate": null },
    "ad_metrics": { "spend": null, "spend_change": null, "cpm": null, "cpc": null, "ctr": null, "roas": null, "cost_per_conversion": null, "ad_frequency": null, "campaign_name": null, "ad_set_name": null, "ad_name": null, "clicks": null, "unique_clicks": null, "conversions": null, "conversion_rate": null, "conversion_value": null, "quality_score": null, "relevance_score": null, "cost_per_lead": null, "cost_per_acquisition": null, "budget": null, "budget_remaining": null, "budget_utilization_percent": null },
    "additional_metrics": []
  },
  "ad_platform_specific": null,
  "trend_analysis": {
    "positive_trends": [{ "metric": "", "current_value": null, "previous_value": null, "absolute_change": null, "percentage_change": null, "trend_direction": "up", "trend_velocity": "", "trend_quality": "Positive", "significance": "" }],
    "negative_trends": [],
    "stable_metrics": [],
    "volatile_metrics": [],
    "overall_health_score": 7,
    "growth_momentum": "Accelerating/Steady/Slowing/Declining"
  },
  "benchmark_comparison": {
    "engagement_rate_analysis": { "user_rate": null, "industry_benchmark": null, "performance_vs_benchmark": "", "percentile_rank": "", "verdict": "" },
    "reach_rate_analysis": { "user_reach_rate": null, "typical_range": "" },
    "posting_frequency_analysis": { "detected_frequency": "", "recommended_frequency": "", "assessment": "" },
    "overall_performance_rating": "",
    "percentile_estimate": ""
  },
  "pattern_recognition": {
    "content_patterns": [],
    "audience_patterns": [],
    "timing_patterns": [],
    "anomalies_detected": [],
    "correlations_found": []
  },
  "insights": [{"category": "Strength|Warning|Opportunity|Info", "importance": "High|Medium|Low", "insight": "description", "supporting_data": "metric or data point"}],
  "recommendations": [{"priority": "P0|P1|P2|P3", "recommendation": "what to do", "expected_impact": "expected result", "effort_required": "Low|Medium|High"}],
  "opportunities": [{"opportunity": "description", "potential_impact": "High|Medium|Low"}],
  "risks": [{"severity": "High|Medium|Low", "risk": "description", "mitigation": "how to address"}],
  "follow_up_questions": [],
  "summary": { "one_sentence_summary": "", "top_3_strengths": [], "top_3_areas_for_improvement": [], "immediate_action_required": false, "immediate_action_reason": "" },
  "behavioral_intelligence": {
    "content_type_preferences": {},
    "topic_preferences": {},
    "engagement_type_distribution": {},
    "completion_rates": {},
    "rewatch_patterns": {},
    "time_preferences": {},
    "audience_segments": {},
    "hook_effectiveness": {},
    "cta_response_rates": {},
    "data_quality_score": 0.0,
    "posts_analyzed_count": 0
  }
}`;

const PLATFORM_DETECTION_GUIDE = `
PLATFORM DETECTION GUIDE:
Identify the specific platform and whether it's SOCIAL or ADVERTISING:

ADVERTISING PLATFORMS (platform_type: "advertising"):
- Facebook Ads / Meta Ads: campaign budget optimization, ad sets, frequency capping, Ads Manager interface, spend/cost metrics
- Google Ads: quality score, keyword data, search impression share, ad rank, CPC bidding
- TikTok Ads: TikTok Ads Manager, spark ads, shopping ads
- LinkedIn Ads: sponsored content, lead gen forms, matched audiences
- Twitter/X Ads: promoted tweets, app installs campaigns
- Snapchat Ads: snap ads, story ads, collection ads
- Pinterest Ads: shopping ads, idea pins, conversion insights
- Microsoft Ads: Bing search data, partner network
- Amazon Ads: sponsored products, ACOS, TACOS
- YouTube Ads: TrueView, bumper ads, discovery ads
- Reddit Ads: promoted posts, community targeting

SOCIAL PLATFORMS (platform_type: "social"):
- Instagram, Facebook, TikTok, LinkedIn, Twitter/X, YouTube, Pinterest, Snapchat

Key indicators for ADVERTISING:
- Presence of: spend, cost, CPC, CPM, ROAS, budget, campaign names, ad sets, conversions cost
- Campaign/ad set/ad level hierarchy
- Budget utilization metrics

Key indicators for SOCIAL:
- Engagement rate, saves, shares, profile visits, follower growth
- Content performance, posting analytics
- Organic reach metrics

METRIC NORMALIZATION - handle naming variations:
- cost = spend = amount spent = budget spent
- impressions = views = times shown = delivered
- click = link click = clicks to website = outbound click
- conversion = purchase = conv = result = action
- CTR = click-through rate = click rate
- CPC = cost per click = avg CPC
- CPM = cost per 1000 impressions = cost per mille
`;

const IMAGE_ANALYSIS_PROMPT = `You are an expert data analyst for both social media AND advertising platforms.

TASK: Analyze this analytics data with comprehensive depth.

${PLATFORM_DETECTION_GUIDE}

═══════════════════════════════════════════════════════════════
COMPREHENSIVE ANALYSIS FRAMEWORK
═══════════════════════════════════════════════════════════════

1. Platform & Type Identification (social vs advertising)
2. Time Period Extraction
3. Comprehensive Metrics Extraction (ALL visible numbers)
   - For AD platforms: extract campaign name, ad set, spend, CPC, CPM, CTR, ROAS, conversions, quality score, budget, etc.
   - For SOCIAL platforms: extract engagement, reach, followers, content performance, etc.
4. Trend Analysis with velocity and significance
5. Performance Benchmarking vs industry standards
6. Pattern Recognition
7. Strategic Insights (5-7, data-backed)
8. Actionable Recommendations (5-7, prioritized P0-P3)
   - For AD platforms: optimize creative, reduce CPA, test audiences, adjust bids
   - For SOCIAL platforms: content strategy, posting times, engagement tactics
9. Opportunity & Risk Identification
10. Follow-Up Questions
11. Behavioral Intelligence Extraction

If this is an ADVERTISING platform, populate ad_platform_specific with:
{
  "campaign_performance": { "campaign_name": "", "objective": "", "status": "", "budget": null, "spend": null },
  "ad_set_metrics": { "targeting": "", "audience_size": null, "placements": "" },
  "creative_metrics": { "ad_format": "", "cta": "", "media_type": "" },
  "cost_efficiency": { "cpc": null, "cpm": null, "cpa": null, "cpl": null, "roas": null },
  "conversion_funnel": { "impressions": null, "clicks": null, "conversions": null, "conversion_rate": null, "conversion_value": null },
  "audience_insights": { "top_demographics": [], "top_placements": [], "device_breakdown": {} }
}

OUTPUT FORMAT - Return ONLY valid JSON (no markdown, no code blocks):
${JSON_SCHEMA}

QUALITY: Extract ALL visible metrics. Use null for unavailable data.`;

const TEXT_DATA_ANALYSIS_PROMPT = `You are an expert data analyst for social media AND advertising platforms.

TASK: Analyze this exported analytics data.

${PLATFORM_DETECTION_GUIDE}

DATA:
{DATA}

Apply the full analysis framework. Detect whether this is social or advertising data.
For spreadsheet/CSV data, pay attention to column headers to identify metrics.
For JSON/XML data, analyze the structure to extract meaningful metrics.

Handle metric naming variations across platforms (spend=cost, clicks=link_clicks, etc.)

Return ONLY valid JSON (no markdown) with this structure:
${JSON_SCHEMA}

Focus on actionable intelligence. Use null for fields not derivable.`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const rl = await checkRateLimit(clientKey(req, "analyze-screenshot"), { limit: 15, windowMs: 60000 });
  if (!rl.ok) {
    return new Response(JSON.stringify({ error: "Too many requests. Please slow down." }), {
      status: 429,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const body = await req.json();
    const { imageBase64, userId, workspace_id: bodyWorkspaceId, screenshotUrl, imageUrl, textData, fileType, fileFormat, fileName, fileSize, contentType } = body;

    if (!userId) {
      return new Response(JSON.stringify({ error: 'userId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const detectedFormat = fileFormat || (textData ? 'text' : 'image');
    console.log('Analyzing file for user:', userId, 'format:', detectedFormat, 'fileName:', fileName);

    let aiResponse: Response;

    if (textData) {
      const prompt = TEXT_DATA_ANALYSIS_PROMPT.replace('{DATA}', textData.slice(0, 30000));
      aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: 'You are an expert marketing analytics data analyst for both social media and advertising platforms. Return ONLY valid JSON.' },
            { role: 'user', content: prompt }
          ],
          max_tokens: 12000,
          temperature: 0.3,
        }),
      });
    } else {
      let base64Data = imageBase64;
      let mimeType = contentType || fileType || 'image/png';

      if (!base64Data && imageUrl) {
        const imageResponse = await fetch(imageUrl);
        if (!imageResponse.ok) throw new Error('Failed to fetch file from storage');
        const imageBuffer = await imageResponse.arrayBuffer();
        base64Data = btoa(new Uint8Array(imageBuffer).reduce((data, byte) => data + String.fromCharCode(byte), ''));
        mimeType = imageResponse.headers.get('content-type') || 'image/png';
      }

      if (!base64Data) {
        return new Response(JSON.stringify({ error: 'File data is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // For PDFs, use application/pdf mime type so Gemini can process it natively
      if (detectedFormat === 'pdf') {
        mimeType = 'application/pdf';
      }

      aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [{
            role: 'user',
            content: [
              { type: 'text', text: IMAGE_ANALYSIS_PROMPT },
              { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64Data}` } }
            ]
          }],
          max_tokens: 12000,
          temperature: 0.3,
        }),
      });
    }

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) return new Response(JSON.stringify({ error: 'AI Gateway rate limit reached. Please retry in a moment.' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      if (aiResponse.status === 402) return new Response(JSON.stringify({ error: 'Workspace AI credits are depleted. Add credits in Lovable → Settings → Plans & credits, then retry.', code: 'AI_CREDITS_DEPLETED' }), { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      const errorText = await aiResponse.text();
      console.error('AI Gateway error:', aiResponse.status, errorText);
      throw new Error(`AI analysis failed for ${detectedFormat} file`);
    }

    const aiResult = await aiResponse.json();
    const analysisText = aiResult.choices?.[0]?.message?.content || '';

    let analysisData: any = {};
    try {
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
      if (jsonMatch) analysisData = JSON.parse(jsonMatch[0]);
      else throw new Error('No JSON found');
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      analysisData = {
        metadata: { platform: 'Unknown', platform_confidence: 'Low', platform_type: 'social', data_completeness: 'Partial' },
        summary: { one_sentence_summary: analysisText.slice(0, 200) },
        insights: [], recommendations: []
      };
    }

    // Determine platform type
    const platformType = analysisData.metadata?.platform_type || 
      (analysisData.extracted_metrics?.ad_metrics?.spend != null ? 'advertising' : 'social');

    // Calculate data completeness score
    const metrics = analysisData.extracted_metrics || {};
    let filledMetrics = 0;
    let totalMetrics = 0;
    for (const category of Object.values(metrics)) {
      if (typeof category === 'object' && category !== null && !Array.isArray(category)) {
        for (const val of Object.values(category as Record<string, any>)) {
          totalMetrics++;
          if (val !== null && val !== undefined) filledMetrics++;
        }
      }
    }
    const completenessScore = totalMetrics > 0 ? Math.round((filledMetrics / totalMetrics) * 100) / 100 : 0.5;
    const dataQuality = completenessScore >= 0.7 ? 'high' : completenessScore >= 0.4 ? 'medium' : 'low';

    // Format insights for display
    const getItemText = (item: any, ...keys: string[]): string => {
      if (typeof item === 'string') return item;
      for (const key of keys) {
        if (item[key] !== undefined && item[key] !== null) return String(item[key]);
      }
      for (const val of Object.values(item)) {
        if (typeof val === 'string' && val.length > 5) return val;
      }
      return JSON.stringify(item);
    };

    const formatInsightsForDisplay = (data: any): string => {
      let formatted = `## 📊 Analytics Analysis\n\n`;
      if (data.metadata) {
        formatted += `### Platform: ${data.metadata.platform || 'Unknown'}`;
        if (data.metadata.platform_confidence) formatted += ` (${data.metadata.platform_confidence} confidence)`;
        if (platformType === 'advertising') formatted += ` — 💰 Advertising`;
        formatted += '\n';
        if (data.metadata.time_period?.start_date || data.metadata.time_period?.end_date) {
          formatted += `**Period:** ${data.metadata.time_period.start_date || 'N/A'} to ${data.metadata.time_period.end_date || 'N/A'}`;
          if (data.metadata.time_period.duration) formatted += ` (${data.metadata.time_period.duration})`;
          formatted += '\n';
        }
        formatted += `**Source:** Analyzed from ${(detectedFormat || 'file').toUpperCase()}\n\n`;
      }
      if (data.trend_analysis) {
        formatted += `### 📈 Health Score: ${data.trend_analysis.overall_health_score || 'N/A'}/10\n`;
        formatted += `**Growth Momentum:** ${data.trend_analysis.growth_momentum || 'N/A'}\n\n`;
      }
      if (data.benchmark_comparison?.overall_performance_rating) {
        formatted += `### 🏆 Performance Rating: ${data.benchmark_comparison.overall_performance_rating}\n`;
        if (data.benchmark_comparison.percentile_estimate) formatted += `**Percentile:** ${data.benchmark_comparison.percentile_estimate}\n`;
        formatted += '\n';
      }

      // Ad-specific metrics summary
      if (platformType === 'advertising' && data.extracted_metrics?.ad_metrics) {
        const ad = data.extracted_metrics.ad_metrics;
        formatted += `### 💰 Ad Performance Summary\n`;
        if (ad.spend != null) formatted += `**Spend:** $${ad.spend}\n`;
        if (ad.roas != null) formatted += `**ROAS:** ${ad.roas}x\n`;
        if (ad.cpc != null) formatted += `**CPC:** $${ad.cpc}\n`;
        if (ad.cpm != null) formatted += `**CPM:** $${ad.cpm}\n`;
        if (ad.ctr != null) formatted += `**CTR:** ${ad.ctr}%\n`;
        if (ad.conversions != null) formatted += `**Conversions:** ${ad.conversions}\n`;
        if (ad.cost_per_conversion != null) formatted += `**Cost/Conversion:** $${ad.cost_per_conversion}\n`;
        formatted += '\n';
      }

      if (data.summary) {
        formatted += `### 📝 Summary\n${data.summary.one_sentence_summary || 'No summary'}\n\n`;
        if (data.summary.top_3_strengths?.length) formatted += `**Strengths:**\n${data.summary.top_3_strengths.map((s: string) => `- ✅ ${s}`).join('\n')}\n\n`;
        if (data.summary.top_3_areas_for_improvement?.length) formatted += `**Improvements:**\n${data.summary.top_3_areas_for_improvement.map((s: string) => `- ⚠️ ${s}`).join('\n')}\n\n`;
        if (data.summary.immediate_action_required) formatted += `🚨 **Action Required:** ${data.summary.immediate_action_reason}\n\n`;
      }

      if (data.insights?.length) {
        formatted += `### 💡 Key Insights\n`;
        data.insights.forEach((insight: any, i: number) => {
          if (typeof insight === 'string') { formatted += `${i + 1}. 💡 ${insight}\n`; return; }
          const category = insight.category || '';
          const icon = category === 'Strength' ? '💪' : category === 'Warning' ? '⚠️' : category === 'Opportunity' ? '🚀' : '💡';
          const importance = insight.importance || insight.priority || 'Info';
          const text = getItemText(insight, 'insight', 'description', 'text', 'finding', 'summary');
          formatted += `${i + 1}. ${icon} **[${importance}]** ${text}\n`;
          const data_point = insight.supporting_data || insight.data || insight.evidence || '';
          if (data_point) formatted += `   _Data: ${data_point}_\n`;
        });
        formatted += '\n';
      }
      if (data.recommendations?.length) {
        formatted += `### ✅ Recommendations\n`;
        data.recommendations.forEach((rec: any, i: number) => {
          if (typeof rec === 'string') { formatted += `${i + 1}. ${rec}\n`; return; }
          const priority = rec.priority || rec.importance || `P${Math.min(i, 3)}`;
          const text = getItemText(rec, 'recommendation', 'description', 'text', 'action', 'suggestion');
          formatted += `${i + 1}. **[${priority}]** ${text}\n`;
          const impact = rec.expected_impact || rec.impact || '';
          if (impact) formatted += `   Impact: ${impact} | Effort: ${rec.effort_required || rec.effort || 'N/A'}\n`;
        });
        formatted += '\n';
      }
      if (data.opportunities?.length) {
        formatted += `### 🚀 Opportunities\n`;
        data.opportunities.forEach((opp: any, i: number) => {
          if (typeof opp === 'string') { formatted += `${i + 1}. ${opp}\n`; return; }
          const text = getItemText(opp, 'opportunity', 'description', 'text', 'title');
          const impact = opp.potential_impact || opp.impact || 'N/A';
          formatted += `${i + 1}. ${text} (Impact: ${impact})\n`;
        });
        formatted += '\n';
      }
      if (data.risks?.length) {
        formatted += `### ⚠️ Risks\n`;
        data.risks.forEach((risk: any, i: number) => {
          if (typeof risk === 'string') { formatted += `${i + 1}. ${risk}\n`; return; }
          const severity = risk.severity || risk.level || risk.priority || 'Medium';
          const text = getItemText(risk, 'risk', 'description', 'text', 'issue', 'threat');
          const mitigation = risk.mitigation || risk.solution || risk.recommendation || 'Monitor closely';
          formatted += `${i + 1}. **[${severity}]** ${text} → ${mitigation}\n`;
        });
        formatted += '\n';
      }

      if (data.behavioral_intelligence) {
        const bi = data.behavioral_intelligence;
        if (bi.data_quality_score > 0) {
          formatted += `### 🧠 Behavioral Intelligence\n`;
          formatted += `_Learning Quality: ${(bi.data_quality_score * 100).toFixed(0)}% | Posts Analyzed: ${bi.posts_analyzed_count || 0}_\n\n`;
          if (bi.content_type_preferences && Object.keys(bi.content_type_preferences).length) {
            const sorted = Object.entries(bi.content_type_preferences).sort(([,a]: any, [,b]: any) => b - a);
            formatted += `**Content Preferences:** ${sorted.map(([k, v]: any) => `${k}: ${(v * 100).toFixed(0)}%`).join(' | ')}\n`;
          }
          if (bi.engagement_type_distribution && Object.keys(bi.engagement_type_distribution).length) {
            formatted += `**Engagement Style:** ${Object.entries(bi.engagement_type_distribution).map(([k, v]: any) => `${k}: ${(v * 100).toFixed(0)}%`).join(' | ')}\n`;
          }
          formatted += '\n';
        }
      }

      if (data.follow_up_questions?.length) {
        formatted += `### ❓ Suggested Next Steps\n`;
        data.follow_up_questions.forEach((q: string, i: number) => { formatted += `${i + 1}. ${q}\n`; });
      }
      return formatted;
    };

    const formattedInsights = formatInsightsForDisplay(analysisData);

    // Save to database
    const supabase = serviceClient();

    // Resolve workspace_id: body override -> user_profiles.active_workspace_id
    let workspaceId = bodyWorkspaceId ?? null;
    if (!workspaceId) {
      const { data: prof } = await supabase
        .from('user_profiles')
        .select('active_workspace_id')
        .eq('user_id', userId)
        .maybeSingle();
      workspaceId = (prof as any)?.active_workspace_id ?? null;
    }

    const { data: analyticsRecord, error: insertError } = await supabase
      .from('uploaded_analytics')
      .insert({
        user_id: userId,
        workspace_id: workspaceId,
        image_url: screenshotUrl || imageUrl || null,
        platform: analysisData.metadata?.platform || null,
        platform_confidence: analysisData.metadata?.platform_confidence || null,
        data_completeness: analysisData.metadata?.data_completeness || null,
        extracted_data: analysisData.extracted_metrics || {},
        time_period_start: analysisData.metadata?.time_period?.start_date || null,
        time_period_end: analysisData.metadata?.time_period?.end_date || null,
        ai_insights: formattedInsights,
        trend_analysis: analysisData.trend_analysis || null,
        benchmark_comparison: analysisData.benchmark_comparison || null,
        pattern_recognition: analysisData.pattern_recognition || null,
        insights: analysisData.insights || null,
        recommendations: analysisData.recommendations || null,
        opportunities: analysisData.opportunities || null,
        risks: analysisData.risks || null,
        follow_up_questions: analysisData.follow_up_questions || null,
        summary: analysisData.summary || null,
        overall_health_score: analysisData.trend_analysis?.overall_health_score || null,
        performance_rating: analysisData.benchmark_comparison?.overall_performance_rating || null,
        // New multi-format fields
        file_type: fileType || contentType || null,
        file_format: detectedFormat,
        original_filename: fileName || null,
        file_size_bytes: fileSize || null,
        processing_status: 'completed',
        platform_type: platformType,
        ad_platform_specific: analysisData.ad_platform_specific || null,
        extracted_data_quality: dataQuality,
        data_completeness_score: completenessScore,
        supports_comparison: true,
      })
      .select()
      .single();

    if (insertError) console.error('Failed to save analytics:', insertError);

    // Update user_behavior_patterns from extracted behavioral intelligence
    const behavioralData = analysisData.behavioral_intelligence;
    if (behavioralData && behavioralData.data_quality_score > 0) {
      const platform = (analysisData.metadata?.platform || 'unknown').toLowerCase();
      
      try {
        const { data: existing } = await supabase
          .from('user_behavior_patterns')
          .select('*')
          .eq('user_id', userId)
          .eq('platform', platform)
          .maybeSingle();

        const newBehaviorData: any = {};
        if (behavioralData.content_type_preferences && Object.keys(behavioralData.content_type_preferences).length) newBehaviorData.content_type_preferences = behavioralData.content_type_preferences;
        if (behavioralData.topic_preferences && Object.keys(behavioralData.topic_preferences).length) newBehaviorData.topic_preferences = behavioralData.topic_preferences;
        if (behavioralData.engagement_type_distribution && Object.keys(behavioralData.engagement_type_distribution).length) newBehaviorData.engagement_patterns = behavioralData.engagement_type_distribution;
        if (behavioralData.completion_rates && Object.keys(behavioralData.completion_rates).length) newBehaviorData.completion_rates = behavioralData.completion_rates;
        if (behavioralData.time_preferences && Object.keys(behavioralData.time_preferences).length) newBehaviorData.time_preferences = behavioralData.time_preferences;
        if (behavioralData.audience_segments && Object.keys(behavioralData.audience_segments).length) newBehaviorData.audience_segments = behavioralData.audience_segments;
        if (behavioralData.hook_effectiveness && Object.keys(behavioralData.hook_effectiveness).length) newBehaviorData.hook_effectiveness = behavioralData.hook_effectiveness;

        if (Object.keys(newBehaviorData).length > 0) {
          if (existing) {
            const mergedData: any = { ...existing.behavior_data };
            for (const [key, newValue] of Object.entries(newBehaviorData)) {
              if (typeof newValue === 'object' && !Array.isArray(newValue) && mergedData[key]) {
                const merged: any = {};
                const allKeys = new Set([...Object.keys(newValue as any), ...Object.keys(mergedData[key])]);
                for (const k of allKeys) {
                  const nv = (newValue as any)[k];
                  const ov = mergedData[key][k];
                  if (typeof nv === 'number' && typeof ov === 'number') merged[k] = nv * 0.7 + ov * 0.3;
                  else merged[k] = nv ?? ov;
                }
                mergedData[key] = merged;
              } else {
                mergedData[key] = newValue;
              }
            }
            const confidenceIncrement = behavioralData.data_quality_score > 0.7 ? 0.15 : 0.05;
            const newConfidence = Math.min(1.0, (existing.learning_confidence || 0) + confidenceIncrement);
            await supabase.from('user_behavior_patterns').update({
              behavior_data: mergedData,
              learning_confidence: newConfidence,
              last_analyzed: new Date().toISOString(),
            }).eq('id', existing.id);
          } else {
            const confidenceIncrement = behavioralData.data_quality_score > 0.7 ? 0.15 : 0.05;
            await supabase.from('user_behavior_patterns').insert({
              user_id: userId,
              platform,
              behavior_data: newBehaviorData,
              learning_confidence: confidenceIncrement,
              last_analyzed: new Date().toISOString(),
            });
          }
        }
      } catch (behaviorError) {
        console.error('Error updating behavior patterns:', behaviorError);
      }
    }

    console.log('Analysis complete, saved:', analyticsRecord?.id, 'format:', detectedFormat, 'platformType:', platformType);

    return new Response(
      JSON.stringify({ success: true, analysis: formattedInsights, analysisData, analyticsId: analyticsRecord?.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('File analysis error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to analyze file' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
