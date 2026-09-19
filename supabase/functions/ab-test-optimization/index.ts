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
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = serviceClient();

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { action, platform, testData } = await req.json();
    console.log('AB Test Optimization action:', action);

    if (action === 'analyze_patterns') {
      // Get last 10 completed tests for this platform
      const { data: pastTests } = await supabase
        .from('ab_tests')
        .select(`
          *,
          ab_test_variants(*),
          ab_test_results(*)
        `)
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .eq('platform', platform || 'twitter')
        .order('created_at', { ascending: false })
        .limit(10);

      // Get learning data
      const { data: learningData } = await supabase
        .from('ab_test_learning')
        .select('*')
        .eq('user_id', user.id)
        .eq('platform', platform || 'twitter');

      // Get platform benchmarks
      const { data: benchmarks } = await supabase
        .from('platform_performance_benchmarks')
        .select('*')
        .eq('user_id', user.id)
        .eq('platform', platform || 'twitter');

      // Analyze patterns from past tests
      const patterns = analyzeHistoricalPatterns(pastTests || [], learningData || []);

      return new Response(
        JSON.stringify({
          success: true,
          patterns,
          benchmarks: benchmarks || [],
          testCount: pastTests?.length || 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'get_recommendations') {
      // Get historical data
      const { data: pastTests } = await supabase
        .from('ab_tests')
        .select(`
          *,
          ab_test_variants(*)
        `)
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(10);

      const { data: learningData } = await supabase
        .from('ab_test_learning')
        .select('*')
        .eq('user_id', user.id);

      // Build context for AI
      const context = buildAIContext(pastTests || [], learningData || [], platform);

      // Call AI for recommendations
      const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
      
      if (LOVABLE_API_KEY) {
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
                content: `You are an A/B testing optimization expert for social media marketing. Analyze the user's historical test data and provide actionable recommendations for their next test. Focus on ${platform || 'general'} platform best practices.`
              },
              {
                role: 'user',
                content: `Based on my historical A/B test data, provide recommendations for my next test:

${context}

Please provide:
1. Recommended test variables (what to test)
2. Optimal content variations based on past winners
3. Platform-specific best practices
4. Predicted success probability
5. Minimum sample size recommendation

Format as JSON with keys: recommendedVariables, contentVariations, bestPractices, successProbability, sampleSize`
              }
            ],
            tools: [
              {
                type: 'function',
                function: {
                  name: 'provide_recommendations',
                  description: 'Provide A/B test optimization recommendations',
                  parameters: {
                    type: 'object',
                    properties: {
                      recommendedVariables: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            variable: { type: 'string' },
                            reason: { type: 'string' },
                            potentialImpact: { type: 'string' }
                          },
                          required: ['variable', 'reason', 'potentialImpact']
                        }
                      },
                      contentVariations: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            name: { type: 'string' },
                            description: { type: 'string' },
                            template: { type: 'string' }
                          },
                          required: ['name', 'description', 'template']
                        }
                      },
                      bestPractices: {
                        type: 'array',
                        items: { type: 'string' }
                      },
                      successProbability: { type: 'number' },
                      sampleSize: { type: 'number' },
                      platformInsights: {
                        type: 'object',
                        properties: {
                          optimalPostingTimes: { type: 'array', items: { type: 'string' } },
                          contentLength: { type: 'string' },
                          mediaRecommendation: { type: 'string' }
                        }
                      }
                    },
                    required: ['recommendedVariables', 'contentVariations', 'bestPractices', 'successProbability', 'sampleSize']
                  }
                }
              }
            ],
            tool_choice: { type: 'function', function: { name: 'provide_recommendations' } }
          }),
        });

        if (!aiResponse.ok) {
          throw new Error('AI request failed');
        }

        const aiData = await aiResponse.json();
        const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
        
        if (toolCall?.function?.arguments) {
          const recommendations = JSON.parse(toolCall.function.arguments);
          return new Response(
            JSON.stringify({ success: true, recommendations }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      // Fallback recommendations
      const fallbackRecommendations = generateFallbackRecommendations(platform, pastTests || []);
      return new Response(
        JSON.stringify({ success: true, recommendations: fallbackRecommendations }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'predict_winner') {
      const { data: learningData } = await supabase
        .from('ab_test_learning')
        .select('*')
        .eq('user_id', user.id)
        .eq('platform', testData?.platform || 'twitter');

      const prediction = predictTestOutcome(testData, learningData || []);

      return new Response(
        JSON.stringify({ success: true, prediction }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'auto_optimize') {
      // Check for underperforming variants
      const { data: runningTests } = await supabase
        .from('ab_tests')
        .select(`
          *,
          ab_test_variants(*),
          ab_test_results(*),
          auto_ab_tests(*)
        `)
        .eq('user_id', user.id)
        .eq('status', 'running')
        .eq('auto_optimize', true);

      const optimizationActions: any[] = [];

      for (const test of runningTests || []) {
        const autoConfig = test.auto_ab_tests?.[0];
        if (!autoConfig?.auto_pause_enabled) continue;

        const minImpressions = autoConfig.min_impressions_before_pause || 100;
        const threshold = autoConfig.performance_threshold || 0.5;

        // Find control variant
        const controlVariant = test.ab_test_variants.find((v: any) => v.is_control);
        if (!controlVariant) continue;

        // Check each variant against control
        for (const variant of test.ab_test_variants) {
          if (variant.is_control) continue;

          const variantResults = test.ab_test_results.filter((r: any) => r.variant_id === variant.id);
          const totalImpressions = variantResults.reduce((sum: number, r: any) => sum + (r.impressions || 0), 0);

          if (totalImpressions >= minImpressions) {
            const variantEngagement = variant.avg_engagement_rate || 0;
            const controlEngagement = controlVariant.avg_engagement_rate || 1;
            const performanceRatio = variantEngagement / controlEngagement;

            if (performanceRatio < threshold) {
              // Underperforming - suggest pausing
              optimizationActions.push({
                type: 'pause_variant',
                testId: test.id,
                variantId: variant.id,
                variantName: variant.variant_name,
                reason: `Performance ${((1 - performanceRatio) * 100).toFixed(0)}% below control after ${totalImpressions} impressions`
              });
            }
          }
        }
      }

      return new Response(
        JSON.stringify({ success: true, optimizationActions }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'update_learning') {
      // Process completed test and update learning data
      const { data: test } = await supabase
        .from('ab_tests')
        .select(`
          *,
          ab_test_variants(*),
          ab_test_results(*)
        `)
        .eq('id', testData.testId)
        .single();

      if (!test) throw new Error('Test not found');

      // Find winner
      const winner = test.ab_test_variants.find((v: any) => v.id === test.winner_variant_id);
      if (!winner) {
        return new Response(
          JSON.stringify({ success: false, message: 'No winner to learn from' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Update learning data
      const patternType = test.variable_being_tested;
      const patternValue = winner.variant_name;

      const { data: existing } = await supabase
        .from('ab_test_learning')
        .select('*')
        .eq('user_id', user.id)
        .eq('platform', test.platform || 'twitter')
        .eq('pattern_type', patternType)
        .eq('pattern_value', patternValue)
        .single();

      if (existing) {
        await supabase
          .from('ab_test_learning')
          .update({
            win_count: existing.win_count + 1,
            total_tests: existing.total_tests + 1,
            last_analyzed: new Date().toISOString()
          })
          .eq('id', existing.id);
      } else {
        await supabase
          .from('ab_test_learning')
          .insert({
            user_id: user.id,
            platform: test.platform || 'twitter',
            pattern_type: patternType,
            pattern_value: patternValue,
            win_count: 1,
            total_tests: 1
          });
      }

      // Update loss counts for non-winners
      for (const variant of test.ab_test_variants) {
        if (variant.id === winner.id) continue;

        const { data: loserExisting } = await supabase
          .from('ab_test_learning')
          .select('*')
          .eq('user_id', user.id)
          .eq('platform', test.platform || 'twitter')
          .eq('pattern_type', patternType)
          .eq('pattern_value', variant.variant_name)
          .single();

        if (loserExisting) {
          await supabase
            .from('ab_test_learning')
            .update({
              loss_count: loserExisting.loss_count + 1,
              total_tests: loserExisting.total_tests + 1,
              last_analyzed: new Date().toISOString()
            })
            .eq('id', loserExisting.id);
        } else {
          await supabase
            .from('ab_test_learning')
            .insert({
              user_id: user.id,
              platform: test.platform || 'twitter',
              pattern_type: patternType,
              pattern_value: variant.variant_name,
              loss_count: 1,
              total_tests: 1
            });
        }
      }

      return new Response(
        JSON.stringify({ success: true, message: 'Learning updated' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'get_insights') {
      // Get comprehensive insights
      const { data: learningData } = await supabase
        .from('ab_test_learning')
        .select('*')
        .eq('user_id', user.id)
        .order('win_count', { ascending: false });

      const { data: benchmarks } = await supabase
        .from('platform_performance_benchmarks')
        .select('*')
        .eq('user_id', user.id);

      const { data: completedTests } = await supabase
        .from('ab_tests')
        .select('*, ab_test_variants(*)')
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .order('created_at', { ascending: false });

      // Calculate insights
      const insights = {
        totalTests: completedTests?.length || 0,
        winRate: calculateWinRate(learningData || []),
        topPatterns: getTopPatterns(learningData || []),
        platformComparison: getPlatformComparison(benchmarks || []),
        contentTypePerformance: getContentTypePerformance(benchmarks || []),
        optimalTimings: getOptimalTimings(learningData || []),
        testTypeSuggestions: getTestTypeSuggestions(learningData || [])
      };

      return new Response(
        JSON.stringify({ success: true, insights }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    throw new Error('Invalid action');

  } catch (error) {
    console.error('AB Test Optimization error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function analyzeHistoricalPatterns(tests: any[], learningData: any[]) {
  const patterns: Record<string, any> = {
    contentLength: { short: 0, medium: 0, long: 0 },
    mediaType: { video: 0, image: 0, text: 0 },
    tone: { professional: 0, casual: 0, energetic: 0 },
    timing: {} as Record<string, number>
  };

  for (const learning of learningData) {
    if (patterns[learning.pattern_type]) {
      patterns[learning.pattern_type][learning.pattern_value] = 
        (patterns[learning.pattern_type][learning.pattern_value] || 0) + learning.win_count;
    }
  }

  return patterns;
}

function buildAIContext(tests: any[], learningData: any[], platform?: string) {
  let context = `Platform: ${platform || 'General'}\n\n`;
  
  context += `Historical A/B Tests (${tests.length} completed):\n`;
  for (const test of tests.slice(0, 5)) {
    const winner = test.ab_test_variants?.find((v: any) => v.id === test.winner_variant_id);
    context += `- ${test.name}: Testing ${test.variable_being_tested}`;
    if (winner) {
      context += ` | Winner: ${winner.variant_name}`;
    }
    context += '\n';
  }

  context += '\nLearning Patterns:\n';
  for (const learning of learningData.slice(0, 10)) {
    const winRate = learning.total_tests > 0 
      ? ((learning.win_count / learning.total_tests) * 100).toFixed(0)
      : 0;
    context += `- ${learning.pattern_type}: ${learning.pattern_value} (${winRate}% win rate, ${learning.total_tests} tests)\n`;
  }

  return context;
}

function generateFallbackRecommendations(platform?: string, pastTests?: any[]) {
  const platformSpecific: Record<string, any> = {
    twitter: {
      optimalPostingTimes: ['9:00 AM', '12:00 PM', '5:00 PM'],
      contentLength: '100-280 characters',
      mediaRecommendation: 'Images increase engagement by 150%'
    },
    instagram: {
      optimalPostingTimes: ['11:00 AM', '2:00 PM', '7:00 PM'],
      contentLength: 'Caption: 125-150 characters',
      mediaRecommendation: 'Carousel posts get 1.4x more reach'
    },
    linkedin: {
      optimalPostingTimes: ['7:00 AM', '12:00 PM', '5:00 PM'],
      contentLength: '1900 characters optimal',
      mediaRecommendation: 'Native documents get 3x more clicks'
    },
    facebook: {
      optimalPostingTimes: ['1:00 PM', '4:00 PM', '8:00 PM'],
      contentLength: '80-100 characters',
      mediaRecommendation: 'Video posts get 59% more engagement'
    },
    tiktok: {
      optimalPostingTimes: ['7:00 AM', '12:00 PM', '10:00 PM'],
      contentLength: 'First 3 seconds critical',
      mediaRecommendation: 'Use trending sounds for 2x reach'
    }
  };

  return {
    recommendedVariables: [
      { variable: 'Content Length', reason: 'High impact on engagement', potentialImpact: '+15-25%' },
      { variable: 'Call-to-Action', reason: 'Drives conversions', potentialImpact: '+10-20%' },
      { variable: 'Media Type', reason: 'Visual content performs better', potentialImpact: '+30-50%' }
    ],
    contentVariations: [
      { name: 'Short & Punchy', description: 'Concise with strong hook', template: '[Hook] + [Value] + [CTA]' },
      { name: 'Story-driven', description: 'Narrative approach', template: '[Problem] + [Solution] + [Result]' },
      { name: 'Question-based', description: 'Engagement through questions', template: '[Question] + [Insight] + [Discussion prompt]' }
    ],
    bestPractices: [
      'Test one variable at a time',
      'Run tests for minimum 7 days',
      'Ensure equal distribution of posts',
      'Document learnings for future tests'
    ],
    successProbability: 0.65,
    sampleSize: 50,
    platformInsights: platformSpecific[platform || 'twitter'] || platformSpecific.twitter
  };
}

function predictTestOutcome(testData: any, learningData: any[]) {
  let confidence = 0.5; // Base confidence
  let predictedWinner = null;
  const factors: string[] = [];

  // Check if we have learning data for this variable
  const relevantLearning = learningData.filter(l => 
    l.pattern_type === testData?.variable
  );

  if (relevantLearning.length > 0) {
    // Find pattern with highest win rate
    let maxWinRate = 0;
    for (const learning of relevantLearning) {
      const winRate = learning.total_tests > 0 
        ? learning.win_count / learning.total_tests 
        : 0;
      if (winRate > maxWinRate) {
        maxWinRate = winRate;
        predictedWinner = learning.pattern_value;
      }
    }
    
    if (maxWinRate > 0.6) {
      confidence = Math.min(0.9, 0.5 + (maxWinRate * 0.4));
      factors.push(`Historical win rate of ${(maxWinRate * 100).toFixed(0)}% for this pattern`);
    }
  }

  // Adjust based on sample size
  if (learningData.length >= 10) {
    confidence = Math.min(0.95, confidence + 0.1);
    factors.push('Strong historical data (10+ tests)');
  } else if (learningData.length >= 5) {
    confidence = Math.min(0.85, confidence + 0.05);
    factors.push('Moderate historical data (5-10 tests)');
  } else {
    factors.push('Limited historical data - prediction may vary');
  }

  return {
    predictedWinner,
    confidence,
    confidenceLevel: confidence >= 0.8 ? 'high' : confidence >= 0.6 ? 'medium' : 'low',
    factors,
    estimatedTimeToSignificance: estimateTimeToSignificance(testData?.sampleSize || 30)
  };
}

function estimateTimeToSignificance(sampleSize: number): string {
  const avgPostsPerDay = 3;
  const daysNeeded = Math.ceil(sampleSize / avgPostsPerDay);
  
  if (daysNeeded <= 3) return '2-3 days';
  if (daysNeeded <= 7) return '1 week';
  if (daysNeeded <= 14) return '2 weeks';
  return `${Math.ceil(daysNeeded / 7)} weeks`;
}

function calculateWinRate(learningData: any[]): number {
  const totalWins = learningData.reduce((sum, l) => sum + l.win_count, 0);
  const totalTests = learningData.reduce((sum, l) => sum + l.total_tests, 0);
  return totalTests > 0 ? (totalWins / totalTests) * 100 : 0;
}

function getTopPatterns(learningData: any[]) {
  return learningData
    .filter(l => l.win_count > 0)
    .sort((a, b) => b.win_count - a.win_count)
    .slice(0, 5)
    .map(l => ({
      type: l.pattern_type,
      value: l.pattern_value,
      wins: l.win_count,
      total: l.total_tests,
      winRate: l.total_tests > 0 ? ((l.win_count / l.total_tests) * 100).toFixed(0) : 0
    }));
}

function getPlatformComparison(benchmarks: any[]) {
  const platforms: Record<string, any> = {};
  for (const b of benchmarks) {
    if (!platforms[b.platform]) {
      platforms[b.platform] = { avgEngagement: 0, count: 0 };
    }
    platforms[b.platform].avgEngagement += b.avg_engagement_rate || 0;
    platforms[b.platform].count += 1;
  }
  
  return Object.entries(platforms).map(([platform, data]) => ({
    platform,
    avgEngagement: data.count > 0 ? (data.avgEngagement / data.count).toFixed(2) : 0
  }));
}

function getContentTypePerformance(benchmarks: any[]) {
  const types: Record<string, any> = {};
  for (const b of benchmarks) {
    if (!types[b.content_type]) {
      types[b.content_type] = { avgEngagement: 0, count: 0 };
    }
    types[b.content_type].avgEngagement += b.avg_engagement_rate || 0;
    types[b.content_type].count += 1;
  }
  
  return Object.entries(types)
    .map(([type, data]) => ({
      type,
      avgEngagement: data.count > 0 ? (data.avgEngagement / data.count).toFixed(2) : '0'
    }))
    .sort((a, b) => parseFloat(String(b.avgEngagement)) - parseFloat(String(a.avgEngagement)));
}

function getOptimalTimings(learningData: any[]) {
  const timings = learningData
    .filter(l => l.best_performing_time || l.best_performing_day)
    .slice(0, 5);
  
  return {
    bestTimes: timings.map(t => t.best_performing_time).filter(Boolean),
    bestDays: timings.map(t => t.best_performing_day).filter(Boolean)
  };
}

function getTestTypeSuggestions(learningData: any[]) {
  // Find under-tested patterns
  const patternCounts: Record<string, number> = {};
  for (const l of learningData) {
    patternCounts[l.pattern_type] = (patternCounts[l.pattern_type] || 0) + l.total_tests;
  }
  
  const allPatterns = ['content', 'media', 'hashtags', 'cta', 'length', 'timing'];
  const underTested = allPatterns.filter(p => (patternCounts[p] || 0) < 3);
  
  return underTested.map(p => ({
    variable: p,
    reason: 'Under-tested area with potential for improvement'
  }));
}