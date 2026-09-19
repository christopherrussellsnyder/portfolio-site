import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { serviceClient } from "../_shared/supabase.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { userId, content, platform, mediaUrls, scheduledTime } = await req.json();
    
    const supabase = serviceClient();
    
    console.log('Predicting engagement for user:', userId);
    
    // Get user baseline metrics
    const { data: baseline } = await supabase.rpc('get_user_baseline_metrics', {
      p_user_id: userId,
      p_platform: platform || 'all'
    });
    
    const userBaseline = baseline?.[0] || {
      avg_engagement_rate: 2.5,
      avg_impressions: 1000,
      total_posts: 0
    };
    
    // Get content patterns
    const { data: patterns } = await supabase.rpc('analyze_content_patterns', {
      p_user_id: userId,
      p_platform: platform || 'all'
    });
    
    // Get audience activity data
    const { data: activityData } = await supabase.rpc('calculate_audience_activity', {
      p_user_id: userId,
      p_platform: platform || 'all'
    });
    
    // Calculate prediction
    const prediction = calculateEngagementPrediction({
      content,
      platform: platform || 'twitter',
      mediaUrls: mediaUrls || [],
      scheduledTime,
      userBaseline,
      patterns,
      activityData
    });
    
    // Store prediction for accuracy tracking
    await supabase.from('engagement_predictions').insert({
      user_id: userId,
      content: content,
      platform: platform || 'twitter',
      predicted_score: prediction.score,
      predicted_engagement_rate: prediction.engagementRate,
      predicted_impressions: prediction.impressions,
      score_factors: prediction.factors
    });
    
    return new Response(
      JSON.stringify({
        success: true,
        prediction: {
          overallScore: prediction.score,
          grade: getScoreGrade(prediction.score),
          predictedEngagementRate: prediction.engagementRate,
          predictedImpressions: prediction.impressions,
          predictedLikes: prediction.likes,
          predictedShares: prediction.shares,
          predictedComments: prediction.comments,
          confidence: userBaseline.total_posts >= 20 ? 'high' : userBaseline.total_posts >= 10 ? 'medium' : 'low',
          factors: prediction.factors,
          recommendations: generateRecommendations(prediction.factors, content, platform || 'twitter')
        },
        baseline: {
          yourAvgEngagement: (userBaseline.avg_engagement_rate || 2.5).toFixed(1) + '%',
          basedOnPosts: userBaseline.total_posts || 0
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Prediction error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

interface PredictionParams {
  content: string;
  platform: string;
  mediaUrls: string[];
  scheduledTime?: string;
  userBaseline: { avg_engagement_rate: number; avg_impressions: number; total_posts: number };
  patterns: any;
  activityData: any[];
}

function calculateEngagementPrediction(params: PredictionParams) {
  const { content, platform, mediaUrls, scheduledTime, userBaseline, patterns, activityData } = params;
  
  let score = 50;
  const factors: { factor: string; impact: number; description: string }[] = [];
  
  const baseEngagement = userBaseline.avg_engagement_rate || 2.5;
  const baseImpressions = userBaseline.avg_impressions || 1000;
  
  // Platform-specific optimal lengths
  const platformLengths: Record<string, { min: number; optimal: number; max: number }> = {
    twitter: { min: 71, optimal: 100, max: 280 },
    linkedin: { min: 100, optimal: 150, max: 3000 },
    instagram: { min: 100, optimal: 125, max: 2200 },
    facebook: { min: 40, optimal: 80, max: 63206 }
  };
  
  const limits = platformLengths[platform] || platformLengths.twitter;
  const contentLength = content.length;
  
  // Content length scoring
  if (contentLength >= limits.min && contentLength <= limits.max) {
    const deviation = Math.abs(contentLength - limits.optimal);
    if (deviation < 30) {
      score += 12;
      factors.push({ factor: 'Optimal length', impact: 12, description: `${contentLength} characters is ideal for ${platform}` });
    } else if (deviation < 60) {
      score += 6;
      factors.push({ factor: 'Good length', impact: 6, description: 'Content length is acceptable' });
    }
  } else if (contentLength < limits.min) {
    score -= 8;
    factors.push({ factor: 'Too short', impact: -8, description: `Add ${limits.min - contentLength} more characters` });
  } else {
    score -= 10;
    factors.push({ factor: 'Too long', impact: -10, description: `Reduce by ${contentLength - limits.max} characters` });
  }
  
  // Emoji analysis
  const emojiRegex = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu;
  const emojiCount = (content.match(emojiRegex) || []).length;
  
  if (emojiCount >= 1 && emojiCount <= 3) {
    score += 10;
    factors.push({ factor: 'Good emoji usage', impact: 10, description: `${emojiCount} emoji(s) boost engagement by 15%` });
  } else if (emojiCount === 0 && platform === 'instagram') {
    score -= 5;
    factors.push({ factor: 'No emojis', impact: -5, description: 'Instagram posts benefit from emojis' });
  } else if (emojiCount > 5) {
    score -= 4;
    factors.push({ factor: 'Too many emojis', impact: -4, description: 'Excessive emojis can reduce credibility' });
  }
  
  // Engagement drivers
  const hasQuestion = /\?/.test(content);
  const hasCTA = /comment|share|click|learn more|read more|sign up|join|download|what do you think|tell us|let us know/i.test(content);
  
  if (hasQuestion) {
    score += 15;
    factors.push({ factor: 'Includes question', impact: 15, description: 'Questions increase engagement by 23%' });
  } else if (hasCTA) {
    score += 10;
    factors.push({ factor: 'Has call-to-action', impact: 10, description: 'CTAs encourage interaction' });
  } else {
    score -= 8;
    factors.push({ factor: 'No engagement driver', impact: -8, description: 'Add a question or CTA' });
  }
  
  // Hashtag analysis
  const hashtagCount = (content.match(/#\w+/g) || []).length;
  const optimalHashtags: Record<string, { min: number; max: number }> = {
    twitter: { min: 1, max: 2 },
    instagram: { min: 5, max: 11 },
    linkedin: { min: 3, max: 5 },
    facebook: { min: 1, max: 3 }
  };
  
  const optimal = optimalHashtags[platform] || { min: 1, max: 3 };
  
  if (hashtagCount >= optimal.min && hashtagCount <= optimal.max) {
    score += 8;
    factors.push({ factor: 'Optimal hashtags', impact: 8, description: `${hashtagCount} hashtags is perfect for ${platform}` });
  } else if (hashtagCount > optimal.max) {
    const penalty = Math.min((hashtagCount - optimal.max) * 2, 10);
    score -= penalty;
    factors.push({ factor: 'Too many hashtags', impact: -penalty, description: `Remove ${hashtagCount - optimal.max} hashtags` });
  } else if (hashtagCount < optimal.min && hashtagCount === 0) {
    score -= 5;
    factors.push({ factor: 'No hashtags', impact: -5, description: `Add ${optimal.min} hashtag(s)` });
  }
  
  // Media analysis
  const hasMedia = mediaUrls && mediaUrls.length > 0;
  const hasVideo = mediaUrls?.some(url => /\.(mp4|mov|avi|webm)$/i.test(url));
  const hasImage = mediaUrls?.some(url => /\.(jpg|jpeg|png|gif|webp)$/i.test(url));
  
  if (hasVideo) {
    score += 18;
    factors.push({ factor: 'Video content', impact: 18, description: 'Videos get 48% more engagement than text' });
  } else if (hasImage) {
    score += 12;
    factors.push({ factor: 'Image content', impact: 12, description: 'Images boost engagement by 35%' });
  } else if (!hasMedia) {
    score -= 6;
    factors.push({ factor: 'No media', impact: -6, description: 'Add an image or video for better performance' });
  }
  
  // Power words
  const powerWords = [
    'amazing', 'exclusive', 'proven', 'guaranteed', 'free', 'new', 'discover',
    'secret', 'ultimate', 'essential', 'breakthrough', 'revolutionary', 'game-changing'
  ];
  
  const powerWordCount = powerWords.filter(word => 
    content.toLowerCase().includes(word)
  ).length;
  
  if (powerWordCount > 0) {
    const boost = Math.min(powerWordCount * 3, 12);
    score += boost;
    factors.push({ factor: `${powerWordCount} power word(s)`, impact: boost, description: 'Power words increase persuasion' });
  }
  
  // Urgency
  const urgencyWords = /limited|today only|don't miss|hurry|ending soon|last chance|now|immediately|urgent/i;
  if (urgencyWords.test(content)) {
    score += 7;
    factors.push({ factor: 'Urgency element', impact: 7, description: 'Urgency drives immediate action' });
  }
  
  // Numbers and statistics
  const hasNumbers = /\d+%|\d+ (ways|tips|secrets|steps|reasons|things)/i.test(content);
  if (hasNumbers) {
    score += 6;
    factors.push({ factor: 'Data/numbers', impact: 6, description: 'Statistics increase credibility by 17%' });
  }
  
  // Timing analysis
  if (scheduledTime && activityData && activityData.length > 0) {
    const scheduleDate = new Date(scheduledTime);
    const dayOfWeek = scheduleDate.getDay();
    const hour = scheduleDate.getHours();
    
    const matchingSlot = activityData.find((slot: any) => 
      slot.day_of_week === dayOfWeek && slot.hour_of_day === hour
    );
    
    if (matchingSlot && matchingSlot.sample_size >= 3) {
      const boost = Math.round((matchingSlot.avg_engagement_rate / baseEngagement - 1) * 10);
      if (boost > 0) {
        score += Math.min(boost, 15);
        factors.push({ 
          factor: 'Optimal timing', 
          impact: Math.min(boost, 15), 
          description: `This time slot averages ${matchingSlot.avg_engagement_rate.toFixed(1)}% engagement` 
        });
      }
    }
  }
  
  // Readability
  const readability = calculateReadability(content);
  if (readability >= 60 && readability <= 80) {
    score += 8;
    factors.push({ factor: 'Easy to read', impact: 8, description: 'Content is accessible to wide audience' });
  } else if (readability < 50) {
    score -= 5;
    factors.push({ factor: 'Hard to read', impact: -5, description: 'Simplify language for better engagement' });
  }
  
  // Clamp score
  score = Math.max(0, Math.min(100, score));
  
  // Calculate predicted metrics
  const multiplier = score / 50;
  const predictedEngagement = baseEngagement * multiplier;
  const predictedImpressions = Math.round(baseImpressions * multiplier);
  
  const engagementBreakdown = {
    likes: Math.round(predictedImpressions * predictedEngagement * 0.006),
    shares: Math.round(predictedImpressions * predictedEngagement * 0.002),
    comments: Math.round(predictedImpressions * predictedEngagement * 0.001)
  };
  
  return {
    score: Math.round(score),
    engagementRate: predictedEngagement.toFixed(2),
    impressions: predictedImpressions,
    likes: engagementBreakdown.likes,
    shares: engagementBreakdown.shares,
    comments: engagementBreakdown.comments,
    factors: factors.sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact))
  };
}

function calculateReadability(text: string): number {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0).length || 1;
  const words = text.split(/\s+/).filter(w => w.length > 0).length || 1;
  const syllables = text.split(/[aeiouy]+/gi).length - 1 || 1;
  
  const score = 206.835 - 1.015 * (words / sentences) - 84.6 * (syllables / words);
  return Math.max(0, Math.min(100, score));
}

function generateRecommendations(factors: any[], content: string, platform: string) {
  const recommendations: any[] = [];
  
  const negativeFactor = factors.find(f => f.impact < 0);
  
  if (negativeFactor) {
    switch (negativeFactor.factor) {
      case 'No engagement driver':
        recommendations.push({
          priority: 'high',
          action: 'Add a question or call-to-action',
          example: 'Try ending with: "What do you think?" or "Share your experience below"',
          expectedImpact: '+23%'
        });
        break;
      case 'Too short':
        recommendations.push({
          priority: 'high',
          action: 'Expand your content',
          example: 'Add more context, details, or value to reach optimal length',
          expectedImpact: '+12%'
        });
        break;
      case 'No media':
        recommendations.push({
          priority: 'high',
          action: 'Add an image or video',
          example: 'Visual content increases engagement by 35-48%',
          expectedImpact: '+35%'
        });
        break;
      case 'Too many hashtags':
        recommendations.push({
          priority: 'medium',
          action: negativeFactor.description,
          expectedImpact: '+8%'
        });
        break;
      case 'No hashtags':
        recommendations.push({
          priority: 'medium',
          action: 'Add relevant hashtags',
          example: `Use ${platform === 'instagram' ? '5-11' : '1-3'} hashtags for better reach`,
          expectedImpact: '+15%'
        });
        break;
    }
  }
  
  if (!content.match(/\d+/)) {
    recommendations.push({
      priority: 'medium',
      action: 'Include a statistic or number',
      example: 'Posts with numbers get 17% more engagement',
      expectedImpact: '+17%'
    });
  }
  
  if (!/limited|today|hurry|now/i.test(content)) {
    recommendations.push({
      priority: 'low',
      action: 'Consider adding urgency',
      example: 'Words like "limited time" or "today only" drive action',
      expectedImpact: '+7%'
    });
  }
  
  return recommendations.slice(0, 3);
}

function getScoreGrade(score: number): string {
  if (score >= 85) return 'A';
  if (score >= 75) return 'B';
  if (score >= 65) return 'C';
  if (score >= 55) return 'D';
  return 'F';
}
