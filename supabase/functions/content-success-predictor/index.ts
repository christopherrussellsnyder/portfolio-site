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
    const { userId, action, content, platform } = await req.json();
    
    const supabase = serviceClient();
    
    console.log('Content predictor action:', action);
    
    if (action === 'predict_virality') {
      const contentHash = await hashContent(content);
      
      // Check for cached prediction
      const { data: existing } = await supabase
        .from('virality_predictions')
        .select('*')
        .eq('user_id', userId)
        .eq('content_hash', contentHash)
        .single();
      
      if (existing && (Date.now() - new Date(existing.created_at).getTime()) < 3600000) {
        return new Response(
          JSON.stringify({ success: true, prediction: existing }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Get user's historical performance
      const { data: userHistory } = await supabase
        .from('scheduled_posts')
        .select('content, engagements, impressions, platforms')
        .eq('user_id', userId)
        .eq('status', 'published')
        .not('impressions', 'is', null)
        .order('published_at', { ascending: false })
        .limit(50);
      
      // Get trending topics
      const { data: trendingTopics } = await supabase
        .from('trending_topics')
        .select('*')
        .order('trend_score', { ascending: false })
        .limit(20);
      
      const analysis = await analyzeContentVirality(
        content,
        platform,
        userHistory || [],
        trendingTopics || []
      );
      
      // Store prediction
      const { data: prediction, error } = await supabase
        .from('virality_predictions')
        .upsert({
          user_id: userId,
          content_text: content,
          content_hash: contentHash,
          virality_score: analysis.viralityScore,
          virality_category: analysis.category,
          predicted_impressions: analysis.predictedImpressions,
          predicted_engagement_rate: analysis.predictedEngagementRate,
          predicted_shares: analysis.predictedShares,
          success_factors: analysis.successFactors,
          trending_elements: analysis.trendingElements,
          improvement_suggestions: analysis.improvements
        }, {
          onConflict: 'user_id,content_hash'
        })
        .select()
        .single();
      
      if (error) throw error;
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          prediction,
          analysis: {
            viralityScore: analysis.viralityScore,
            category: analysis.category,
            breakdown: analysis.scoreBreakdown
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (action === 'suggest_improvements') {
      const { data: trendingTopics } = await supabase
        .from('trending_topics')
        .select('*')
        .order('trend_score', { ascending: false })
        .limit(10);
      
      const suggestions = generateImprovementSuggestions(
        content,
        platform,
        trendingTopics || []
      );
      
      return new Response(
        JSON.stringify({ success: true, suggestions }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (action === 'get_trending_topics') {
      const { data: topics } = await supabase
        .from('trending_topics')
        .select('*')
        .order('trend_score', { ascending: false })
        .limit(20);
      
      return new Response(
        JSON.stringify({ success: true, topics: topics || [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (action === 'analyze_sentiment') {
      const sentiment = analyzeSentiment(content);
      
      return new Response(
        JSON.stringify({ success: true, sentiment }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    throw new Error('Invalid action');
    
  } catch (error: unknown) {
    console.error('Content predictor error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function analyzeContentVirality(
  content: string, 
  platform: string, 
  userHistory: any[], 
  trendingTopics: any[]
) {
  let viralityScore = 50;
  const scoreBreakdown: { factor: string; points: number }[] = [];
  const successFactors: Record<string, any> = {};
  const trendingElements: string[] = [];
  
  const contentFeatures = extractContentFeatures(content);
  
  // Emotional trigger bonus
  if (contentFeatures.hasEmotionalTrigger) {
    viralityScore += 15;
    scoreBreakdown.push({ factor: 'Emotional trigger', points: 15 });
    successFactors.emotional_appeal = 'high';
  }
  
  // Question bonus
  if (contentFeatures.hasQuestion) {
    viralityScore += 12;
    scoreBreakdown.push({ factor: 'Engaging question', points: 12 });
    successFactors.engagement_driver = 'question';
  }
  
  // Numbers/data bonus
  if (contentFeatures.hasNumbers) {
    viralityScore += 10;
    scoreBreakdown.push({ factor: 'Data/statistics', points: 10 });
    successFactors.credibility = 'data_backed';
  }
  
  // Urgency bonus
  if (contentFeatures.hasUrgency) {
    viralityScore += 8;
    scoreBreakdown.push({ factor: 'Urgency element', points: 8 });
    successFactors.urgency = true;
  }
  
  // Trending topic matching
  const trendingMatches = trendingTopics.filter(topic =>
    content.toLowerCase().includes(topic.topic.toLowerCase()) ||
    topic.related_keywords?.some((kw: string) => content.toLowerCase().includes(kw.toLowerCase()))
  );
  
  if (trendingMatches.length > 0) {
    const trendBoost = Math.min(trendingMatches.length * 8, 20);
    viralityScore += trendBoost;
    scoreBreakdown.push({ factor: 'Trending topics', points: trendBoost });
    trendingElements.push(...trendingMatches.map(t => t.topic));
    successFactors.trending = true;
  }
  
  // Optimal length bonus
  if (contentFeatures.optimalLength) {
    viralityScore += 7;
    scoreBreakdown.push({ factor: 'Optimal length', points: 7 });
  }
  
  // Hashtag usage bonus
  if (contentFeatures.hasHashtags && contentFeatures.hashtagCount >= 2 && contentFeatures.hashtagCount <= 5) {
    viralityScore += 6;
    scoreBreakdown.push({ factor: 'Good hashtag usage', points: 6 });
  }
  
  // Readability bonus
  if (contentFeatures.readabilityScore >= 60 && contentFeatures.readabilityScore <= 80) {
    viralityScore += 5;
    scoreBreakdown.push({ factor: 'Easy to read', points: 5 });
    successFactors.readability = 'optimal';
  }
  
  // Power words bonus
  if (contentFeatures.hasPowerWords) {
    viralityScore += 8;
    scoreBreakdown.push({ factor: 'Power words', points: 8 });
  }
  
  // Calculate user's average engagement rate
  const userAvgEngagement = userHistory.length > 0
    ? userHistory.reduce((sum, post) => {
        const engagement = post.engagements || 0;
        const impressions = post.impressions || 1;
        return sum + (engagement / impressions * 100);
      }, 0) / userHistory.length
    : 3.0;
  
  // Clamp score
  viralityScore = Math.min(100, Math.max(0, viralityScore));
  
  // Determine category
  const category = 
    viralityScore >= 80 ? 'viral' :
    viralityScore >= 65 ? 'high_potential' :
    viralityScore >= 50 ? 'moderate' :
    'needs_work';
  
  // Calculate predictions
  const multiplier = viralityScore / 50;
  const baseImpressions = platform === 'instagram' ? 2000 : platform === 'linkedin' ? 1500 : 1000;
  
  const improvements = generateImprovementSuggestions(content, platform, trendingTopics);
  
  return {
    viralityScore: Math.round(viralityScore),
    category,
    predictedImpressions: Math.round(baseImpressions * multiplier),
    predictedEngagementRate: parseFloat((userAvgEngagement * multiplier).toFixed(2)),
    predictedShares: Math.round(baseImpressions * multiplier * 0.02),
    successFactors,
    trendingElements,
    scoreBreakdown,
    improvements
  };
}

function extractContentFeatures(content: string) {
  const emotionalWords = [
    'amazing', 'incredible', 'shocking', 'unbelievable', 'urgent', 'exclusive',
    'revolutionary', 'game-changing', 'breakthrough', 'stunning', 'mind-blowing'
  ];
  
  const powerWords = [
    'proven', 'guaranteed', 'free', 'new', 'discover', 'secret', 'ultimate',
    'essential', 'transform', 'boost', 'skyrocket', 'massive'
  ];
  
  const urgencyWords = ['today', 'now', 'limited', 'hurry', 'ending', 'last chance', "don't miss"];
  
  const words = content.toLowerCase().split(/\s+/);
  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const syllables = content.split(/[aeiouy]+/gi).length - 1 || 1;
  
  // Flesch Reading Ease formula
  const readability = 206.835 - 1.015 * (words.length / Math.max(sentences.length, 1)) - 84.6 * (syllables / Math.max(words.length, 1));
  
  return {
    hasEmotionalTrigger: emotionalWords.some(word => content.toLowerCase().includes(word)),
    hasPowerWords: powerWords.some(word => content.toLowerCase().includes(word)),
    hasUrgency: urgencyWords.some(word => content.toLowerCase().includes(word)),
    hasQuestion: content.includes('?'),
    hasNumbers: /\d+/.test(content),
    hasHashtags: content.includes('#'),
    hashtagCount: (content.match(/#\w+/g) || []).length,
    optimalLength: content.length >= 80 && content.length <= 200,
    readabilityScore: Math.max(0, Math.min(100, readability)),
    emojiCount: (content.match(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}]/gu) || []).length
  };
}

function generateImprovementSuggestions(content: string, platform: string, trendingTopics: any[]) {
  const suggestions: any[] = [];
  const features = extractContentFeatures(content);
  
  if (!features.hasQuestion) {
    suggestions.push({
      type: 'engagement',
      priority: 'high',
      title: 'Add an engaging question',
      description: 'Questions increase engagement by 23%',
      example: 'Try ending with: "What\'s your experience with this?"',
      expectedImpact: '+23%'
    });
  }
  
  if (!features.hasEmotionalTrigger && !features.hasPowerWords) {
    suggestions.push({
      type: 'emotional_appeal',
      priority: 'high',
      title: 'Add emotional appeal',
      description: 'Use power words to increase virality',
      example: 'Words like "amazing", "incredible", "game-changing"',
      expectedImpact: '+15%'
    });
  }
  
  if (!features.hasNumbers) {
    suggestions.push({
      type: 'credibility',
      priority: 'medium',
      title: 'Include data or statistics',
      description: 'Numbers increase credibility and engagement',
      example: 'Add specific metrics: "Increased by 45%"',
      expectedImpact: '+10%'
    });
  }
  
  if (content.length < 80) {
    suggestions.push({
      type: 'length',
      priority: 'medium',
      title: 'Expand your content',
      description: 'Content is too short for optimal engagement',
      example: 'Aim for 80-200 characters',
      expectedImpact: '+7%'
    });
  }
  
  if (content.length > 250) {
    suggestions.push({
      type: 'length',
      priority: 'low',
      title: 'Shorten your content',
      description: 'Shorter posts often perform better',
      example: 'Reduce to 150-200 characters',
      expectedImpact: '+5%'
    });
  }
  
  // Find unused trending topics
  const unusedTrending = trendingTopics.filter(topic =>
    !content.toLowerCase().includes(topic.topic.toLowerCase())
  ).slice(0, 3);
  
  if (unusedTrending.length > 0) {
    suggestions.push({
      type: 'trending',
      priority: 'high',
      title: 'Incorporate trending topics',
      description: `Consider adding: ${unusedTrending.map(t => t.topic).join(', ')}`,
      example: 'Topics trending right now with high engagement',
      expectedImpact: '+20%'
    });
  }
  
  if (features.hashtagCount === 0) {
    suggestions.push({
      type: 'discovery',
      priority: 'medium',
      title: 'Add relevant hashtags',
      description: 'Hashtags increase discoverability',
      example: 'Use 2-3 relevant hashtags for your platform',
      expectedImpact: '+8%'
    });
  }
  
  if (features.hashtagCount > 5) {
    suggestions.push({
      type: 'hashtags',
      priority: 'low',
      title: 'Reduce hashtag count',
      description: 'Too many hashtags can reduce credibility',
      example: 'Limit to 3-5 high-quality hashtags',
      expectedImpact: '+4%'
    });
  }
  
  return suggestions.sort((a, b) => {
    const priority: Record<string, number> = { high: 0, medium: 1, low: 2 };
    return priority[a.priority] - priority[b.priority];
  });
}

function analyzeSentiment(content: string) {
  const positiveWords = [
    'good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'love',
    'best', 'awesome', 'happy', 'excited', 'brilliant', 'perfect', 'success'
  ];
  
  const negativeWords = [
    'bad', 'terrible', 'awful', 'worst', 'hate', 'horrible', 'disappointing',
    'poor', 'fail', 'problem', 'issue', 'difficult', 'struggle', 'unfortunately'
  ];
  
  const words = content.toLowerCase().split(/\s+/);
  
  let positiveCount = 0;
  let negativeCount = 0;
  
  words.forEach(word => {
    if (positiveWords.includes(word)) positiveCount++;
    if (negativeWords.includes(word)) negativeCount++;
  });
  
  const total = positiveCount + negativeCount;
  
  if (total === 0) {
    return { score: 0, label: 'neutral', confidence: 0.5 };
  }
  
  const score = (positiveCount - negativeCount) / total;
  
  let label = 'neutral';
  if (score > 0.3) label = 'positive';
  else if (score < -0.3) label = 'negative';
  
  return {
    score: parseFloat(score.toFixed(2)),
    label,
    confidence: Math.min(1, total / words.length * 5),
    positiveWords: positiveCount,
    negativeWords: negativeCount
  };
}

async function hashContent(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}