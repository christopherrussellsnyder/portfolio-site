import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { serviceClient } from "../_shared/supabase.ts";
import { scoreCaption, selectDiverseCaptions } from "../_shared/algorithms.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, prompt, tone, length, platform, includeHashtags } = await req.json();
    
    const supabase = serviceClient();
    
    console.log('Starting enhanced content generation for user:', userId);
    
    // STEP 1: Analyze user's historical performance
    const { data: topPosts, error: historyError } = await supabase
      .rpc('get_top_performing_posts', {
        p_user_id: userId,
        p_platform: platform || 'all',
        p_limit: 20
      });
    
    if (historyError) {
      console.error('History error:', historyError);
    }
    
    const { data: patterns, error: patternError } = await supabase
      .rpc('analyze_content_patterns', {
        p_user_id: userId,
        p_platform: platform || 'all'
      });
    
    if (patternError) {
      console.error('Pattern error:', patternError);
    }
    
    console.log('Historical analysis:', { topPosts: topPosts?.length, patterns });
    
    // STEP 2: Extract success patterns from top posts
    let successPatterns = {
      hasHistory: false,
      avgEngagementRate: 2.5,
      avgLength: 150,
      keywords: [] as string[],
      hashtags: [] as string[]
    };
    
    if (topPosts && topPosts.length >= 5) {
      successPatterns.hasHistory = true;
      successPatterns.avgEngagementRate = patterns?.avgEngagementRate || 2.5;
      successPatterns.avgLength = patterns?.avgSuccessfulLength || 150;
      
      // Extract common keywords from top posts
      const allContent = topPosts.map((p: { content: string }) => p.content).join(' ');
      const words = allContent.toLowerCase().match(/\b\w{4,}\b/g) || [];
      const wordFreq: Record<string, number> = {};
      words.forEach((word: string) => {
        wordFreq[word] = (wordFreq[word] || 0) + 1;
      });
      
      successPatterns.keywords = Object.entries(wordFreq)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([word]) => word);
      
      // Extract common hashtags
      const hashtags = allContent.match(/#\w+/g) || [];
      const tagFreq: Record<string, number> = {};
      hashtags.forEach((tag: string) => {
        tagFreq[tag] = (tagFreq[tag] || 0) + 1;
      });
      
      successPatterns.hashtags = Object.entries(tagFreq)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([tag]) => tag);
    }
    
    console.log('Success patterns extracted:', successPatterns);
    
    // STEP 3: Build enhanced system prompt
    const systemPrompt = buildEnhancedPrompt(successPatterns, tone, length, platform, includeHashtags);
    
    console.log('System prompt built, generating variations...');
    
    // STEP 4: Generate 3 variations with different strategies
    const strategies = [
      'Direct and value-focused - highlight immediate benefits',
      'Engaging and conversational - create connection with audience',
      'Question-driven - encourage interaction and responses'
    ];
    
    const variations = [];
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    for (const strategy of strategies) {
      let content = '';
      
      if (LOVABLE_API_KEY) {
        try {
          const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${LOVABLE_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'google/gemini-2.5-flash',
              messages: [
                { role: 'system', content: systemPrompt + '\n\nSTRATEGY: ' + strategy },
                { role: 'user', content: prompt }
              ],
            })
          });
          
          if (!response.ok) {
            const errorText = await response.text();
            console.error('AI API error:', response.status, errorText);
            throw new Error(`AI API error: ${response.status}`);
          }
          
          const data = await response.json();
          content = data.choices[0].message.content.trim();
        } catch (aiError) {
          console.error('AI generation error:', aiError);
          content = generateFallbackContent(prompt, strategy, tone, platform);
        }
      } else {
        console.log('No LOVABLE_API_KEY, using fallback generation');
        content = generateFallbackContent(prompt, strategy, tone, platform);
      }
      
      // STEP 5: Score each variation on two independent axes.
      //  (a) calculateEngagementScore — historical-pattern fit, learned from the
      //      user's own measured posts.
      //  (b) scoreCaption — multi-objective craft quality (hook strength, CTA
      //      clarity, readability, specificity, voice match, filler penalty).
      // Neither alone is sufficient: (a) rewards copying what worked before even
      // when the writing is weak, (b) rewards good writing that ignores this
      // audience. The blend is what gets ranked.
      const score = calculateEngagementScore(content, successPatterns, platform);
      const quality = scoreCaption(content, {
        platform,
        // Voice consistency is measured against the user's own historically
        // successful vocabulary, not an abstract "good copy" ideal.
        voiceReference: (successPatterns?.keywords ?? []).join(' '),
      });

      variations.push({
        content: content,
        strategy: strategy.split(' - ')[0],
        predictedScore: Math.round(score.score * 0.5 + quality.total * 0.5),
        patternFitScore: score.score,
        craftScore: quality.total,
        predictedEngagement: score.engagementRate,
        breakdown: score.breakdown,
        craftBreakdown: {
          hook_strength: quality.hookStrength,
          cta_clarity: quality.ctaClarity,
          readability: quality.readability,
          specificity: quality.specificity,
          voice_match: quality.voiceMatch,
        },
        craftNotes: quality.notes,
      });
    }

    // Rank by the blended score, then re-order the runners-up for diversity so
    // the alternatives offer real choices instead of three rewordings of the
    // winner.
    variations.sort((a, b) => b.predictedScore - a.predictedScore);
    if (variations.length > 2) {
      const asCaptions = variations.map((v) => ({ caption: v.content, ref: v }));
      const captionScores = variations.map((v) => ({
        total: v.predictedScore,
        hookStrength: v.craftBreakdown.hook_strength,
        ctaClarity: v.craftBreakdown.cta_clarity,
        readability: v.craftBreakdown.readability,
        voiceMatch: v.craftBreakdown.voice_match,
        specificity: v.craftBreakdown.specificity,
        fillerPenalty: 0,
        notes: v.craftNotes,
      }));
      const { picked } = selectDiverseCaptions(asCaptions, captionScores, variations.length);
      if (picked.length === variations.length) {
        variations.splice(0, variations.length, ...picked.map((p) => p.item.ref));
      }
    }

    console.log(
      `Variations generated and scored: ${variations.length} ` +
      `(blended top ${variations[0]?.predictedScore}, ` +
      `pattern-fit ${variations[0]?.patternFitScore}, craft ${variations[0]?.craftScore})`,
    );

    // STEP 6: Generate optimization suggestions
    const topVariant = variations[0];
    const suggestions = generateOptimizationSuggestions(topVariant.content, platform);
    
    // Log generation for learning
    try {
      await supabase.from('ai_generation_logs').insert({
        user_id: userId,
        prompt: prompt,
        variations_generated: variations.length,
        top_variant: topVariant.content,
        predicted_engagement: parseFloat(topVariant.predictedEngagement),
        success_patterns_used: successPatterns.hasHistory,
        created_at: new Date().toISOString()
      });
    } catch (logError) {
      console.error('Failed to log generation:', logError);
    }
    
    console.log('Generation complete, returning results');
    
    return new Response(
      JSON.stringify({
        success: true,
        recommended: {
          content: topVariant.content,
          strategy: topVariant.strategy,
          predictedEngagement: topVariant.predictedEngagement + '%',
          confidence: successPatterns.hasHistory ? 'high' : 'medium',
          scoreBreakdown: topVariant.breakdown
        },
        alternatives: variations.slice(1),
        suggestions: suggestions,
        insights: {
          basedOnHistory: successPatterns.hasHistory,
          postsAnalyzed: patterns?.totalPostsAnalyzed || 0,
          yourAvgEngagement: successPatterns.avgEngagementRate.toFixed(1) + '%'
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error: unknown) {
    console.error('Enhanced generation error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage, details: String(error) }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function generateFallbackContent(prompt: string, strategy: string, tone: string, platform: string): string {
  const strategyType = strategy.split(' - ')[0].toLowerCase();
  const toneStyles: Record<string, string> = {
    professional: 'Excited to share',
    casual: 'Hey everyone! Check this out',
    friendly: 'You\'re going to love this',
    urgent: '🚨 Don\'t miss this',
    playful: '✨ Something awesome incoming'
  };
  
  const intro = toneStyles[tone] || 'Check this out';
  
  if (strategyType.includes('question')) {
    return `${intro}: ${prompt}\n\nWhat do you think? 💭 #trending`;
  } else if (strategyType.includes('conversational')) {
    return `${intro}! ${prompt}\n\nWould love to hear your thoughts! 💬`;
  } else {
    return `${intro}: ${prompt}\n\n🔥 Don't miss out!`;
  }
}

function buildEnhancedPrompt(
  patterns: { hasHistory: boolean; avgEngagementRate: number; avgLength: number; keywords: string[]; hashtags: string[] },
  tone: string,
  length: string,
  platform: string,
  includeHashtags: boolean
): string {
  let prompt = `You are an expert social media content strategist.

REQUIREMENTS:
- Tone: ${tone}
- Length: ${length} (short=50-100 chars, medium=100-200, long=200-280)
- Platform: ${platform || 'all platforms'}
${includeHashtags ? '- Include 3-5 relevant hashtags' : ''}

`;

  if (patterns.hasHistory) {
    prompt += `USER'S HISTORICAL SUCCESS PATTERNS:
- Average engagement rate: ${patterns.avgEngagementRate.toFixed(1)}%
- Optimal content length: ~${patterns.avgLength} characters
- Successful keywords: ${patterns.keywords.slice(0, 5).join(', ')}
${patterns.hashtags.length ? '- Successful hashtags: ' + patterns.hashtags.join(', ') : ''}

Use these patterns to create content optimized for this user's audience.

`;
  }

  prompt += `ENGAGEMENT OPTIMIZATION:
- Use power words when appropriate
- Include a call-to-action or question to drive interaction
- Keep sentences short and punchy
- Use active voice
- Create urgency when relevant

Return ONLY the post content, optimized for maximum engagement.`;

  return prompt;
}

function calculateEngagementScore(
  content: string,
  patterns: { hasHistory: boolean; avgEngagementRate: number; avgLength: number; keywords: string[]; hashtags: string[] },
  platform: string
): { score: number; engagementRate: string; breakdown: { factor: string; impact: string }[] } {
  let score = 50;
  const breakdown: { factor: string; impact: string }[] = [];
  
  // Factor 1: Length optimization
  const idealLengths: Record<string, number> = { twitter: 100, linkedin: 150, facebook: 80, instagram: 125 };
  const targetLength = idealLengths[platform] || patterns.avgLength || 150;
  const lengthDiff = Math.abs(content.length - targetLength);
  
  if (lengthDiff < 20) {
    score += 10;
    breakdown.push({ factor: 'Optimal length', impact: '+10' });
  } else if (lengthDiff > 100) {
    score -= 5;
    breakdown.push({ factor: 'Length not ideal', impact: '-5' });
  }
  
  // Factor 2: Emoji presence (proven +15% engagement)
  const emojiRegex = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu;
  const emojiCount = (content.match(emojiRegex) || []).length;
  if (emojiCount >= 1 && emojiCount <= 3) {
    score += 8;
    breakdown.push({ factor: 'Good emoji usage', impact: '+8' });
  } else if (emojiCount === 0 && platform === 'instagram') {
    score -= 3;
    breakdown.push({ factor: 'No emojis on Instagram', impact: '-3' });
  }
  
  // Factor 3: Question/CTA presence (+23% engagement)
  if (content.match(/\?/) || content.toLowerCase().includes('what do you think') || 
      content.toLowerCase().includes('comment below') || content.toLowerCase().includes('share your')) {
    score += 12;
    breakdown.push({ factor: 'Includes question/CTA', impact: '+12' });
  }
  
  // Factor 4: Hashtag optimization
  const hashtagCount = (content.match(/#\w+/g) || []).length;
  const optimalHashtags: Record<string, [number, number]> = { 
    twitter: [1, 2], 
    instagram: [5, 11], 
    linkedin: [3, 5], 
    facebook: [1, 3] 
  };
  const optimal = optimalHashtags[platform] || [1, 3];
  
  if (hashtagCount >= optimal[0] && hashtagCount <= optimal[1]) {
    score += 7;
    breakdown.push({ factor: 'Optimal hashtag count', impact: '+7' });
  } else if (hashtagCount > optimal[1] + 3) {
    score -= 4;
    breakdown.push({ factor: 'Too many hashtags', impact: '-4' });
  }
  
  // Factor 5: Pattern matching
  if (patterns.hasHistory && patterns.keywords.length) {
    const matchedKeywords = patterns.keywords.filter(keyword =>
      content.toLowerCase().includes(keyword.toLowerCase())
    );
    
    if (matchedKeywords.length > 0) {
      const boost = Math.min(matchedKeywords.length * 3, 15);
      score += boost;
      breakdown.push({ factor: `${matchedKeywords.length} successful keywords`, impact: `+${boost}` });
    }
  }
  
  // Factor 6: Power words
  const powerWords = ['amazing', 'exclusive', 'proven', 'guaranteed', 'free', 'new', 'discover', 'secret', 'ultimate', 'essential'];
  const powerWordCount = powerWords.filter(word => 
    content.toLowerCase().includes(word)
  ).length;
  
  if (powerWordCount > 0) {
    const boost = powerWordCount * 2;
    score += boost;
    breakdown.push({ factor: `${powerWordCount} power words`, impact: `+${boost}` });
  }
  
  // Factor 7: Urgency/scarcity
  if (content.match(/limited|today only|don't miss|hurry|ending soon|last chance/i)) {
    score += 6;
    breakdown.push({ factor: 'Urgency element', impact: '+6' });
  }
  
  // Factor 8: Numbers (data-driven)
  if (content.match(/\d+%|\d+ (ways|tips|secrets|steps)/i)) {
    score += 5;
    breakdown.push({ factor: 'Includes numbers/stats', impact: '+5' });
  }
  
  score = Math.min(score, 100);
  
  const baseEngagement = patterns.avgEngagementRate || 2.5;
  const multiplier = score / 50;
  const predictedEngagement = (baseEngagement * multiplier).toFixed(1);
  
  return {
    score: score,
    engagementRate: predictedEngagement,
    breakdown: breakdown
  };
}

function generateOptimizationSuggestions(content: string, platform: string): { type: string; suggestion: string; expectedBoost: string; example: string }[] {
  const suggestions: { type: string; suggestion: string; expectedBoost: string; example: string }[] = [];
  
  if (!content.match(/\?/)) {
    suggestions.push({
      type: 'engagement',
      suggestion: 'Add a question to encourage responses',
      expectedBoost: '+23%',
      example: 'Try ending with "What do you think?" or "Have you tried this?"'
    });
  }
  
  const emojiRegex = /[\u{1F600}-\u{1F64F}]/gu;
  const emojiCount = (content.match(emojiRegex) || []).length;
  if (emojiCount === 0) {
    suggestions.push({
      type: 'visual',
      suggestion: 'Add 1-2 relevant emojis for visual appeal',
      expectedBoost: '+15%',
      example: '✨ 🚀 💡 🎯 ⭐'
    });
  }
  
  const hashtagCount = (content.match(/#\w+/g) || []).length;
  if (platform === 'instagram' && hashtagCount < 5) {
    suggestions.push({
      type: 'reach',
      suggestion: `Add ${5 - hashtagCount} more relevant hashtags`,
      expectedBoost: '+30% reach',
      example: 'Instagram posts with 5-11 hashtags get highest engagement'
    });
  }
  
  if (!content.match(/\d+/)) {
    suggestions.push({
      type: 'credibility',
      suggestion: 'Include a statistic or number',
      expectedBoost: '+17%',
      example: 'Posts with numbers get 17% more engagement'
    });
  }
  
  return suggestions;
}
