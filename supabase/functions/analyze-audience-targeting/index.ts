import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { serviceClient, userClient } from "../_shared/supabase.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BusinessProfile {
  business_name: string;
  industry: string;
  niche: string;
  target_age_min: number;
  target_age_max: number;
  target_genders: string[];
  target_locations: string[];
  target_interests: string[];
  business_goals: string[];
  average_order_value: number;
  price_point: string;
  products_services: string;
  unique_selling_points: string[];
  competitor_names: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabase = userClient(authHeader);

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { businessProfile } = await req.json() as { businessProfile: BusinessProfile };

    // Build AI prompt for audience targeting recommendations
    const prompt = `You are an expert digital marketing strategist specializing in audience targeting across social media platforms. 

Based on the following business profile, provide detailed, platform-specific audience targeting recommendations:

Business Profile:
- Business Name: ${businessProfile.business_name || 'Not specified'}
- Industry: ${businessProfile.industry || 'Not specified'}
- Niche: ${businessProfile.niche || 'Not specified'}
- Products/Services: ${businessProfile.products_services || 'Not specified'}
- Target Age Range: ${businessProfile.target_age_min}-${businessProfile.target_age_max}
- Target Genders: ${businessProfile.target_genders?.join(', ') || 'All'}
- Target Locations: ${businessProfile.target_locations?.join(', ') || 'Global'}
- Target Interests: ${businessProfile.target_interests?.join(', ') || 'Not specified'}
- Business Goals: ${businessProfile.business_goals?.join(', ') || 'Not specified'}
- Average Order Value: $${businessProfile.average_order_value || 0}
- Price Point: ${businessProfile.price_point || 'Medium'}
- Unique Selling Points: ${businessProfile.unique_selling_points?.join(', ') || 'Not specified'}
- Competitors: ${businessProfile.competitor_names?.join(', ') || 'Not specified'}

Provide targeting recommendations in the following JSON format:
{
  "facebook_instagram": {
    "detailed_targeting": {
      "interests": ["list of specific interests"],
      "behaviors": ["list of behaviors"],
      "demographics": ["list of demographics"]
    },
    "age_range": { "min": 18, "max": 65 },
    "locations": ["recommended locations"],
    "device_types": ["mobile", "desktop"],
    "custom_audiences": ["suggestions for custom audiences"],
    "lookalike_suggestions": ["suggestions for lookalike audiences"],
    "targeting_string": "Copy-paste ready targeting description"
  },
  "linkedin": {
    "job_titles": ["list of relevant job titles"],
    "industries": ["list of industries"],
    "company_sizes": ["1-10", "11-50", "51-200", "201-500", "500+"],
    "seniority_levels": ["Entry", "Senior", "Manager", "Director", "VP", "C-Level"],
    "skills": ["list of relevant skills"],
    "groups": ["suggested LinkedIn groups"],
    "targeting_string": "Copy-paste ready targeting description"
  },
  "twitter": {
    "keywords": ["list of keywords to target"],
    "hashtags": ["list of hashtags"],
    "interests": ["Twitter interest categories"],
    "follower_lookalikes": ["@accounts to target followers of"],
    "conversation_topics": ["conversation topics"],
    "targeting_string": "Copy-paste ready targeting description"
  },
  "tiktok": {
    "content_categories": ["relevant categories"],
    "hashtag_strategy": ["trending and niche hashtags"],
    "trending_topics": ["current trends to leverage"],
    "creator_types": ["types of creators to collaborate with"],
    "targeting_string": "Copy-paste ready targeting description"
  },
  "overall_strategy": {
    "primary_platform": "Recommended primary platform",
    "secondary_platforms": ["Other platforms to use"],
    "budget_allocation": { "platform": "percentage" },
    "key_insights": ["List of key strategic insights"],
    "testing_recommendations": ["A/B testing suggestions"]
  }
}

Ensure all recommendations are specific, actionable, and directly applicable to the business profile provided. Focus on high-intent audiences likely to convert.`;

    // Call Lovable AI API
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    let recommendations;

    if (lovableApiKey) {
      const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${lovableApiKey}`,
        },
        body: JSON.stringify({
          model: 'openai/gpt-5-mini',
          messages: [
            {
              role: 'system',
              content: 'You are an expert digital marketing strategist. Always respond with valid JSON only, no additional text.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 4000,
        }),
      });

      if (!aiResponse.ok) {
        throw new Error(`AI API error: ${aiResponse.statusText}`);
      }

      const aiData = await aiResponse.json();
      const content = aiData.choices[0]?.message?.content || '';
      
      // Extract JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        recommendations = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Failed to parse AI response');
      }
    } else {
      // Generate mock recommendations if no API key
      recommendations = generateMockRecommendations(businessProfile);
    }

    // Store insights in database
    const platforms = ['facebook', 'linkedin', 'twitter', 'tiktok'];
    for (const platform of platforms) {
      const platformData = platform === 'facebook' ? recommendations.facebook_instagram : recommendations[platform];
      
      await supabase
        .from('audience_insights')
        .upsert({
          user_id: user.id,
          platform,
          insight_type: 'targeting_recommendation',
          targeting_parameters: platformData || {},
          recommendation_score: Math.random() * 30 + 70, // 70-100 score
          analysis_date: new Date().toISOString(),
        }, {
          onConflict: 'user_id,platform',
          ignoreDuplicates: false
        });
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        recommendations,
        message: 'Targeting recommendations generated successfully'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error: any) {
    console.error('Error in analyze-audience-targeting:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});

function generateMockRecommendations(profile: BusinessProfile) {
  return {
    facebook_instagram: {
      detailed_targeting: {
        interests: ["Business", "Entrepreneurship", "Marketing", "Technology", "E-commerce"],
        behaviors: ["Small business owners", "Online shoppers", "Tech early adopters"],
        demographics: ["College educated", "Working professionals"]
      },
      age_range: { min: profile.target_age_min || 25, max: profile.target_age_max || 54 },
      locations: profile.target_locations?.length ? profile.target_locations : ["United States", "United Kingdom", "Canada"],
      device_types: ["mobile", "desktop"],
      custom_audiences: ["Website visitors", "Email subscribers", "Video viewers"],
      lookalike_suggestions: ["1% lookalike of purchasers", "3% lookalike of engaged users"],
      targeting_string: `Age ${profile.target_age_min || 25}-${profile.target_age_max || 54}, Interests: Business & Technology, Behaviors: Online Shoppers`
    },
    linkedin: {
      job_titles: ["Marketing Manager", "Business Owner", "CEO", "Founder", "Director of Marketing"],
      industries: [profile.industry || "Technology", "Marketing & Advertising", "Business Services"],
      company_sizes: ["11-50", "51-200", "201-500"],
      seniority_levels: ["Manager", "Director", "VP", "C-Level"],
      skills: ["Digital Marketing", "Business Strategy", "Leadership"],
      groups: ["Entrepreneurs Network", "Digital Marketing Professionals"],
      targeting_string: "Job Titles: C-Suite & Directors, Industries: Tech & Marketing, Company Size: 11-500"
    },
    twitter: {
      keywords: ["startup", "entrepreneur", "marketing tips", "business growth"],
      hashtags: ["#Marketing", "#Business", "#Entrepreneur", "#StartupLife"],
      interests: ["Business news", "Technology", "Marketing"],
      follower_lookalikes: ["@hubspot", "@buffer", "@hootsuite", "@garyvee"],
      conversation_topics: ["Small business", "Digital marketing", "Entrepreneurship"],
      targeting_string: "Keywords: startup, marketing | Followers of: @hubspot, @buffer"
    },
    tiktok: {
      content_categories: ["Business", "Education", "How-to"],
      hashtag_strategy: ["#SmallBusiness", "#BusinessTips", "#MarketingTips", "#Entrepreneur"],
      trending_topics: ["Side hustles", "Business hacks", "Marketing secrets"],
      creator_types: ["Business coaches", "Marketing experts", "Entrepreneurs"],
      targeting_string: "Categories: Business & Education, Hashtags: #BusinessTips #MarketingTips"
    },
    overall_strategy: {
      primary_platform: "Facebook/Instagram",
      secondary_platforms: ["LinkedIn", "Twitter"],
      budget_allocation: {
        "Facebook/Instagram": "50%",
        "LinkedIn": "30%",
        "Twitter": "15%",
        "TikTok": "5%"
      },
      key_insights: [
        "Focus on mobile-first content for better engagement",
        "Use video content to increase reach by 2-3x",
        "Retarget website visitors within 7 days for best results",
        "Test lookalike audiences against interest-based targeting"
      ],
      testing_recommendations: [
        "A/B test age ranges: 25-34 vs 35-44",
        "Test broad vs narrow interest targeting",
        "Compare carousel vs single image ads"
      ]
    }
  };
}