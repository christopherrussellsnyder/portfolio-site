export type IntentType = 
  | 'strategy_request'
  | 'analysis_request'
  | 'problem_solving'
  | 'data_upload'
  | 'comparison_request'
  | 'learning_request'
  | 'content_creation'
  | 'optimization_request'
  | 'general_conversation';

interface IntentResult {
  intent: IntentType;
  confidence: number;
  suggestedAction?: string;
  requiredContext?: string[];
}

export function detectUserIntent(message: string): IntentResult {
  const lowerMessage = message.toLowerCase().trim();

  // Strategy generation intents
  if (lowerMessage.match(/create|generate|make|build/i) && 
      lowerMessage.match(/strategy|plan|calendar|schedule/i)) {
    return {
      intent: 'strategy_request',
      confidence: 0.9,
      suggestedAction: 'create_strategy',
      requiredContext: ['business_profile', 'analytics'],
    };
  }

  // Analysis request intents
  if (lowerMessage.match(/analyze|review|check|look at|what do you think|assess|evaluate/i)) {
    return {
      intent: 'analysis_request',
      confidence: 0.85,
      requiredContext: ['analytics'],
    };
  }

  // Problem solving intents
  if (lowerMessage.match(/how (can|do|should) i|what should i.*to|help me|fix|improve|increase|boost|grow/i)) {
    return {
      intent: 'problem_solving',
      confidence: 0.85,
    };
  }

  // Data upload intents
  if (lowerMessage.match(/here('s| is) my|uploaded|screenshot|analytics|data|metrics/i)) {
    return {
      intent: 'data_upload',
      confidence: 0.8,
    };
  }

  // Comparison intents
  if (lowerMessage.match(/vs|versus|compare|better|which|difference between/i)) {
    return {
      intent: 'comparison_request',
      confidence: 0.85,
    };
  }

  // Learning intents
  if (lowerMessage.match(/what is|explain|why|how does|teach me|tell me about|what are/i)) {
    return {
      intent: 'learning_request',
      confidence: 0.8,
    };
  }

  // Content creation intents
  if (lowerMessage.match(/write|create|suggest|give me|post|caption|hook|hashtag/i) &&
      lowerMessage.match(/content|post|caption|idea|copy/i)) {
    return {
      intent: 'content_creation',
      confidence: 0.85,
      requiredContext: ['business_profile'],
    };
  }

  // Optimization intents
  if (lowerMessage.match(/optimize|best time|when should|improve|better/i)) {
    return {
      intent: 'optimization_request',
      confidence: 0.8,
      requiredContext: ['analytics'],
    };
  }

  return {
    intent: 'general_conversation',
    confidence: 0.5,
  };
}

export function getIntentSuggestion(intent: IntentResult, hasAnalytics: boolean, hasProfile: boolean): string | null {
  if (!intent.requiredContext) return null;

  const missingContext: string[] = [];

  if (intent.requiredContext.includes('analytics') && !hasAnalytics) {
    missingContext.push('analytics');
  }

  if (intent.requiredContext.includes('business_profile') && !hasProfile) {
    missingContext.push('business profile');
  }

  if (missingContext.length === 0) return null;

  if (missingContext.includes('analytics') && missingContext.includes('business profile')) {
    return "I can help better with your website analyzed and analytics uploaded. Would you like to start with one of those?";
  }

  if (missingContext.includes('analytics')) {
    return "Uploading your analytics would help me give more personalized advice. Would you like to do that first?";
  }

  if (missingContext.includes('business profile')) {
    return "Analyzing your website would help me understand your business better. Should I do that first?";
  }

  return null;
}

export function extractTopicsFromMessage(message: string): string[] {
  const topics: string[] = [];
  const lowerMessage = message.toLowerCase();

  const topicPatterns: [RegExp, string][] = [
    [/instagram|ig|insta/i, 'Instagram'],
    [/tiktok|tik tok/i, 'TikTok'],
    [/linkedin/i, 'LinkedIn'],
    [/facebook|fb/i, 'Facebook'],
    [/twitter|x\.com/i, 'Twitter/X'],
    [/youtube|yt/i, 'YouTube'],
    [/engagement|likes?|comments?/i, 'engagement'],
    [/reach|impressions/i, 'reach'],
    [/followers?|following|growth/i, 'growth'],
    [/content|posts?|caption/i, 'content'],
    [/hashtag/i, 'hashtags'],
    [/strateg/i, 'strategy'],
    [/analytics|metrics|data/i, 'analytics'],
    [/carousel/i, 'carousels'],
    [/reel|video/i, 'video'],
    [/stor(y|ies)/i, 'stories'],
    [/algorithm/i, 'algorithm'],
    [/competitor/i, 'competitors'],
    [/audience|target/i, 'audience'],
    [/brand|voice|tone/i, 'branding'],
  ];

  for (const [pattern, topic] of topicPatterns) {
    if (pattern.test(lowerMessage)) {
      topics.push(topic);
    }
  }

  return [...new Set(topics)];
}
