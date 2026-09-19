import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { serviceClient } from "../_shared/supabase.ts";
import { checkRateLimit, clientKey } from "../_shared/rate-limit.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const rl = await checkRateLimit(clientKey(req, "generate-content"), { limit: 20, windowMs: 60000 });
  if (!rl.ok) {
    return new Response(JSON.stringify({ error: "Too many requests. Please slow down." }), {
      status: 429,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { contentType, objective, platform, tone, length, prompt, userId, includeHashtags } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Build system prompt based on parameters
    const systemPrompt = buildSystemPrompt(contentType, objective, platform, tone, length, includeHashtags);

    console.log('Generating content with params:', { contentType, objective, platform, tone, length, userId });

    const startTime = Date.now();

    // Call Lovable AI Gateway
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Generate 3 different variations of ${contentType} content for the following topic/product: ${prompt}` }
        ],
      })
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again in a few moments.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Usage limit reached. Please add credits to your workspace.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    const responseTime = Date.now() - startTime;

    if (!content) {
      throw new Error('No content generated');
    }

    // Parse the variations from the response
    const variations = parseVariations(content, contentType);

    console.log('Generated variations:', variations.length, 'in', responseTime, 'ms');

    // Log usage if userId is provided
    if (userId) {
      try {
        const supabase = serviceClient();

        const promptTokens = data.usage?.prompt_tokens || 0;
        const completionTokens = data.usage?.completion_tokens || 0;
        const totalTokens = data.usage?.total_tokens || promptTokens + completionTokens;

        await supabase.from('ai_usage_logs').insert({
          user_id: userId,
          request_type: 'content_generation',
          model: 'google/gemini-2.5-flash',
          prompt_tokens: promptTokens,
          completion_tokens: completionTokens,
          total_tokens: totalTokens,
          response_time_ms: responseTime,
          status: 'success',
          feature: 'content_ai',
          prompt_length: prompt?.length || 0,
          response_length: content.length
        });

        // Update user quotas
        await supabase.rpc('increment_ai_usage', {
          p_user_id: userId,
          p_requests: 1,
          p_tokens: totalTokens,
          p_cost: 0
        });
      } catch (logError) {
        console.error('Failed to log usage:', logError);
      }
    }

    return new Response(
      JSON.stringify({ 
        variations,
        tokens: data.usage?.total_tokens || 0,
        responseTime 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Generate content error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate content';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function buildSystemPrompt(contentType: string, objective: string, platform: string, tone: string, length: string, includeHashtags?: boolean): string {
  const basePrompts: Record<string, string> = {
    headline: `You are an expert copywriter. Generate compelling ${tone} headlines for ${objective} campaigns on ${platform}.`,
    ad_copy: `You are an expert ad copywriter. Write ${tone} ad copy for ${objective} campaigns on ${platform}.`,
    social_post: `You are a social media expert. Create engaging ${tone} social posts for ${objective} campaigns on ${platform}.`,
    email: `You are an email marketing expert. Write ${tone} email content for ${objective} campaigns.`,
    cta: `You are a conversion expert. Create ${tone} call-to-action phrases for ${objective} campaigns.`
  };

  const lengthGuide: Record<string, string> = {
    short: 'Keep it under 50 words. Be concise and punchy.',
    medium: 'Aim for 50-150 words. Provide enough detail while staying engaging.',
    long: 'Write 150-300 words. Include detailed information and persuasive elements.'
  };

  const objectiveGuide: Record<string, string> = {
    awareness: 'Focus on introducing the brand/product and creating interest.',
    traffic: 'Include strong calls-to-action to drive clicks and visits.',
    conversions: 'Emphasize benefits, urgency, and clear conversion actions.'
  };

  const platformRequirements = getPlatformRequirements(platform);

  return `${basePrompts[contentType] || basePrompts.ad_copy}

Platform-specific requirements for ${platform}:
${platformRequirements}

Objective: ${objectiveGuide[objective] || objectiveGuide.awareness}

Length: ${lengthGuide[length] || lengthGuide.medium}

Tone: ${tone}

CRITICAL INSTRUCTIONS:
- Generate EXACTLY 3 different variations
- Format your response with each variation clearly separated by "---"
- Each variation should be distinctly different in approach/angle
- Generate ONLY the content, no explanations, labels, or meta-text
- Do NOT include "Variation 1:", "Option 1:", etc. before the content
- Use best practices for ${platform}
- Optimize for ${objective}
- Match the ${tone} tone consistently
${contentType === 'headline' ? '- Headlines should be 5-15 words maximum' : ''}
${contentType === 'cta' ? '- CTAs should be 2-5 words maximum' : ''}
${contentType === 'social_post' || includeHashtags ? '- Include 3-5 relevant hashtags at the end of each variation' : ''}
${contentType === 'email' ? '- Include a compelling subject line at the start' : ''}`;
}

function getPlatformRequirements(platform: string): string {
  const requirements: Record<string, string> = {
    facebook: 'Facebook allows longer text but first 3 lines are most important. Use emotional hooks and conversational language.',
    instagram: 'Instagram is visual-first. Keep copy conversational and authentic. Use line breaks for readability. Include relevant hashtags.',
    twitter: 'Twitter/X has 280 character limit. Be concise, punchy, and engaging. Use hashtags sparingly.',
    linkedin: 'LinkedIn is professional. Use industry language, focus on value, credibility, and thought leadership.',
    tiktok: 'TikTok is casual and trendy. Use current slang, be entertaining, authentic, and engaging.',
    google: 'Google Ads require clear, benefit-focused copy with strong CTAs. Headlines max 30 chars, descriptions max 90 chars.',
    email: 'Email should have compelling subject line and scannable body. Focus on one clear CTA. Use personalization.',
    youtube: 'YouTube needs attention-grabbing hooks in the first few seconds. Focus on value proposition and clear CTAs.'
  };

  return requirements[platform.toLowerCase()] || 'Create engaging, platform-appropriate content.';
}

function parseVariations(content: string, contentType: string): Array<{ id: string; content: string; rating: number; is_favorite: boolean }> {
  // Split by common separators
  let parts = content.split(/---+|\n\n\n+/);
  
  // If that doesn't work well, try splitting by numbered patterns
  if (parts.length < 3) {
    parts = content.split(/(?:Variation\s*\d+[:\.]?\s*|Option\s*\d+[:\.]?\s*|\d+[\.)\]]\s+)/i).filter(p => p.trim());
  }
  
  // Clean up and take up to 3 variations
  const variations = parts
    .map(part => part.trim())
    .filter(part => part.length > 10) // Filter out empty or very short strings
    .slice(0, 3)
    .map((part, index) => ({
      id: `gen-${Date.now()}-${index}`,
      content: part.replace(/^["']|["']$/g, '').trim(), // Remove surrounding quotes
      rating: 0,
      is_favorite: false
    }));

  // If we still don't have 3 variations, the model may have given a single response
  if (variations.length === 0) {
    return [{
      id: `gen-${Date.now()}-0`,
      content: content.trim(),
      rating: 0,
      is_favorite: false
    }];
  }

  return variations;
}
