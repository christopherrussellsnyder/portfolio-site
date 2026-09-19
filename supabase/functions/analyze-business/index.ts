import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { anonClient, serviceClient } from "../_shared/supabase.ts";
import { checkRateLimit, clientKey } from "../_shared/rate-limit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

interface ScrapedPage {
  url: string;
  pageType: string;
  title: string;
  metaDescription: string;
  metaKeywords: string;
  headings: { h1s: string[]; h2s: string[]; h3s: string[] };
  paragraphs: string[];
  textContent: string;
  images: { src: string; alt: string; title: string }[];
  links: { internal: string[]; external: string[] };
  colors: string[];
  fonts: string[];
  ctas: { text: string; href: string; type: string }[];
  socialLinks: { platform: string; url: string }[];
  priceElements: string[];
  testimonials: string[];
  forms: { action: string; fields: string[] }[];
}

interface ScrapedContent {
  baseUrl: string;
  pages: ScrapedPage[];
  scrapedAt: string;
  totalPages: number;
  pagesByType: Record<string, number>;
  analysisDepth: string;
}

function buildComprehensivePrompt(scrapedContent: ScrapedContent): string {
  const pagesSummary = scrapedContent.pages.map(page => {
    const ctaTexts = page.ctas?.map(c => c.text).join(', ') || 'None detected';
    const socialPlatforms = page.socialLinks?.map(s => s.platform).join(', ') || 'None detected';
    
    return `
═══════════════════════════════════════════════════════════════
PAGE: ${page.title || 'Untitled'}
TYPE: ${page.pageType}
URL: ${page.url}
═══════════════════════════════════════════════════════════════

META DESCRIPTION: ${page.metaDescription || 'Not set'}
META KEYWORDS: ${page.metaKeywords || 'Not set'}

HEADINGS:
H1: ${page.headings?.h1s?.slice(0, 5).join(' | ') || 'None'}
H2: ${page.headings?.h2s?.slice(0, 10).join(' | ') || 'None'}
H3: ${page.headings?.h3s?.slice(0, 10).join(' | ') || 'None'}

KEY PARAGRAPHS:
${page.paragraphs?.slice(0, 8).map((p, i) => `${i + 1}. ${p.slice(0, 300)}${p.length > 300 ? '...' : ''}`).join('\n') || 'None extracted'}

FULL CONTENT PREVIEW:
${page.textContent?.slice(0, 3000) || 'No content'}

CTAs DETECTED: ${ctaTexts}
SOCIAL LINKS: ${socialPlatforms}
PRICE ELEMENTS: ${page.priceElements?.slice(0, 10).join(', ') || 'None detected'}
TESTIMONIALS: ${page.testimonials?.length || 0} found
${page.testimonials?.length ? `Sample: "${page.testimonials[0]?.slice(0, 200)}"` : ''}
FORMS: ${page.forms?.length || 0} found with fields: ${page.forms?.flatMap(f => f.fields).slice(0, 10).join(', ') || 'None'}
`;
  }).join('\n\n');

  const allColors = [...new Set(scrapedContent.pages.flatMap(p => p.colors || []))].slice(0, 20);
  const allFonts = [...new Set(scrapedContent.pages.flatMap(p => p.fonts || []))].slice(0, 15);
  const allCtas = [...new Set(scrapedContent.pages.flatMap(p => p.ctas?.map(c => c.text) || []))].slice(0, 20);
  const allSocial = [...new Set(scrapedContent.pages.flatMap(p => p.socialLinks?.map(s => `${s.platform}: ${s.url}`) || []))];
  const allPrices = [...new Set(scrapedContent.pages.flatMap(p => p.priceElements || []))].slice(0, 20);
  const allTestimonials = scrapedContent.pages.flatMap(p => p.testimonials || []).slice(0, 10);

  return `You are a comprehensive business intelligence analyst with expertise in brand strategy, competitive positioning, market analysis, and marketing optimization.

TASK: Analyze this website content to build a complete strategic business profile using a comprehensive 10-phase strategic analysis framework.

═══════════════════════════════════════════════════════════════
WEBSITE DATA PROVIDED
═══════════════════════════════════════════════════════════════

Base URL: ${scrapedContent.baseUrl}
Total Pages Analyzed: ${scrapedContent.totalPages}
Pages by Type: ${JSON.stringify(scrapedContent.pagesByType)}
Analysis Depth: ${scrapedContent.analysisDepth}

AGGREGATED VISUAL ELEMENTS:
- Colors Detected: ${allColors.join(', ') || 'None'}
- Fonts Detected: ${allFonts.join(', ') || 'None'}

AGGREGATED CTAs: ${allCtas.join(', ') || 'None'}
SOCIAL MEDIA PRESENCE: ${allSocial.join(', ') || 'None'}
PRICING VISIBLE: ${allPrices.join(', ') || 'None visible'}
TESTIMONIALS FOUND: ${allTestimonials.length} total

═══════════════════════════════════════════════════════════════
PAGE-BY-PAGE CONTENT
═══════════════════════════════════════════════════════════════

${pagesSummary}

═══════════════════════════════════════════════════════════════
10-PHASE STRATEGIC ANALYSIS FRAMEWORK
═══════════════════════════════════════════════════════════════

PHASE 1: CORE BUSINESS IDENTIFICATION
- Business Identity: name, brand name, tagline, founded year, confidence level
- Industry Classification: Primary (be specific, e.g., "B2B SaaS for HR automation" not just "software"), Secondary, Market Segment (Enterprise/Mid-market/SMB/Consumer)
- Business Model: revenue model, business type (B2B/B2C/D2C), transaction type (Self-service/Sales-led/Hybrid)
- Product/Service Portfolio: each with name, description, category (Core/Premium/Add-on), target user, key features
- Pricing Intelligence: price points, strategy (Premium/Mid-market/Budget/Freemium), model, psychology patterns
- Geographic & Scale: focus, evidence, physical locations, target markets
- Company Stage & Maturity: stage, indicators, estimated size, growth phase

PHASE 2: DEEP AUDIENCE INTELLIGENCE
- Primary Target Audience Demographics: age range (specific like "28-42"), gender focus, income bracket, education level, job titles/seniority if B2B
- Psychographics: values, lifestyle indicators, aspirations, fears, motivations, behavioral traits
- Pain Points: each with specific problem, severity, current solution, frustration level
- Jobs to Be Done: functional job, emotional job, social job
- Secondary Audiences if applicable
- Audience Sophistication: knowledge level, buying sophistication, solution awareness

PHASE 3: BRAND ARCHITECTURE & IDENTITY
- Brand Voice: tone scales (formality, playfulness, complexity, confidence, warmth each 1-10), voice characteristics (5-7 adjectives), voice examples with quotes, consistency, audience alignment
- Messaging Architecture: primary value proposition, supporting messages, unique differentiators with proof, proof elements (data points, testimonials, case studies, awards, press, certifications), messaging clarity
- Brand Personality: if brand were a person description, personality adjectives, brand archetype (primary and secondary with evidence)
- Brand Values: explicit, implicit, mission statement, brand purpose

PHASE 4: VISUAL IDENTITY INTELLIGENCE
- Color Psychology: primary brand color (hex, name, psychology, industry appropriateness), secondary colors, palette assessment
- Design Style: aesthetic, whitespace, visual hierarchy, design trends
- Photography Style: type (Custom/Stock/Mix), style, quality, authenticity
- Typography: headings font (family, category, personality), body font (readability)

PHASE 5: CONTENT STRATEGY ANALYSIS
- Content Marketing Presence: blog (present, frequency, depth), resources (guides/whitepapers/case studies), video, podcast
- Content Quality: writing quality 1-10, depth, originality, value density
- Content Themes: each with prevalence and approach
- SEO Intelligence: meta descriptions, heading structure, URL structure, keywords detected, SEO maturity

PHASE 6: CONVERSION ARCHITECTURE ANALYSIS
- Primary CTA: text, action, prominence, clarity
- Conversion Funnel: steps to convert, friction points, urgency tactics, risk reversal
- Trust Signals: testimonials (count, specificity), case studies, client logos, certifications, security, media mentions
- Trust Score 1-10
- Lead Capture Strategy: lead magnets, form friction

PHASE 7: COMPETITIVE POSITIONING
- Competitors mentioned
- Competitive advantages claimed (advantage, category, proof, strength)
- Market Positioning: statement, category, strategy type, differentiation clarity
- Positioning gaps

PHASE 8: TECHNICAL & MARKETING MATURITY
- Website Quality Scores: design, UX, content quality, technical execution, mobile experience (each 1-10)
- Marketing Sophistication Level 1-5: 1=Product-centric, 2=Feature-focused, 3=Benefit-driven, 4=Identity-based, 5=Experience-focused
- Technology detected: platform, tracking, marketing tools
- Social Media Integration: profiles linked, integration quality

PHASE 9: GAPS, OPPORTUNITIES & RED FLAGS
- Critical Gaps: what's missing, impact, competitive disadvantage
- Quick Win Opportunities (5-7): specific improvement, impact, effort, implementation, expected result, priority
- Strategic Growth Opportunities (3-5): initiative, rationale, potential impact, timeline
- Red Flags: issue, severity, risk, recommendation
- Competitive Vulnerabilities: weakness, exploitation risk, mitigation

PHASE 10: MARKETING STRATEGY RECOMMENDATIONS
- Content Marketing Strategy: recommended focus, content gaps, content opportunities, distribution channels
- Social Media Strategy: recommended platforms with rationale, content approach, priority
- Messaging Optimization: value prop recommendation, messaging hierarchy, tone adjustments
- Conversion Optimization: CTA recommendations, trust building, friction reduction

═══════════════════════════════════════════════════════════════

Return a comprehensive JSON object with this structure:

{
  "metadata": {
    "website_url": "${scrapedContent.baseUrl}",
    "analysis_timestamp": "${new Date().toISOString()}",
    "pages_analyzed": ${scrapedContent.totalPages},
    "analysis_depth": "${scrapedContent.analysisDepth}",
    "data_completeness": "Complete|Substantial|Partial|Limited"
  },
  "business_identity": {
    "business_name": "",
    "brand_name": "",
    "tagline": "",
    "industry": "Be specific",
    "secondary_industries": [],
    "market_segment": "Enterprise|Mid-market|SMB|Consumer",
    "business_model": { "revenue_model": "", "business_type": "", "transaction_type": "" },
    "products_services": [{ "name": "", "description": "", "category": "Core|Premium|Add-on", "target_user": "", "key_features": [] }],
    "pricing_intelligence": { "price_points_visible": [], "pricing_strategy": "", "pricing_model": "", "price_range_estimate": "" },
    "geographic_focus": "",
    "company_stage": "",
    "estimated_size": ""
  },
  "audience_intelligence": {
    "primary_target_audience": {
      "demographics": { "age_range": "", "gender_focus": "", "income_bracket": "", "education_level": "", "job_titles": [], "job_seniority": "", "company_size_target": "" },
      "psychographics": { "values": [], "lifestyle_indicators": [], "aspirations": [], "fears": [], "motivations": [] },
      "pain_points": [{ "pain": "", "severity": "", "current_solution": "" }],
      "jobs_to_be_done": [{ "functional_job": "", "emotional_job": "", "social_job": "" }]
    },
    "audience_sophistication": { "knowledge_level": "", "buying_sophistication": "", "solution_awareness": "" }
  },
  "brand_architecture": {
    "brand_voice": {
      "tone_scales": { "formality": 5, "playfulness": 5, "complexity": 5, "confidence": 5, "warmth": 5 },
      "voice_characteristics": [],
      "voice_examples": [{ "example_text": "", "demonstrates": "" }],
      "consistency": "High|Medium|Low",
      "audience_alignment": "Excellent|Good|Mismatched"
    },
    "messaging_architecture": {
      "primary_value_proposition": "",
      "supporting_messages": [],
      "unique_differentiators": [{ "claim": "", "proof": "", "strength": "Strong|Moderate|Weak" }],
      "proof_elements": { "data_points": [], "testimonials_present": false, "case_studies_present": false, "awards_mentions": [], "press_mentions": [], "certifications": [] },
      "messaging_clarity": { "what_they_do": "", "who_its_for": "", "why_choose_them": "" }
    },
    "brand_personality": { "if_brand_were_person": "", "personality_adjectives": [], "brand_archetype": { "primary": "", "secondary": "", "evidence": "" } },
    "brand_values": { "explicit_values": [], "implicit_values": [], "mission_statement": "", "brand_purpose": "" }
  },
  "visual_identity": {
    "color_psychology": {
      "primary_brand_color": { "hex": "", "name": "", "psychology": "", "industry_appropriateness": "" },
      "secondary_colors": [],
      "color_palette_assessment": { "sophistication": "", "consistency": "", "emotional_impact": "" }
    },
    "design_style": { "design_aesthetic": "", "whitespace_usage": "", "visual_hierarchy": "", "design_trends": [] },
    "photography_style": { "type": "", "style": "", "quality": "", "authenticity": "" },
    "typography": { "headings_font": { "family": "", "category": "", "personality": "" }, "body_font": { "family": "", "readability": "" } }
  },
  "content_strategy_analysis": {
    "content_marketing_presence": { "blog_present": false, "post_frequency_estimate": "", "content_depth": "", "content_types": [] },
    "content_themes": [{ "theme": "", "prevalence": "", "approach": "" }],
    "content_quality_assessment": { "writing_quality": 7, "depth": "", "originality": "", "value_density": "" },
    "seo_intelligence": { "meta_descriptions": "", "heading_structure": "", "url_structure": "", "primary_keywords_detected": [], "seo_maturity": "" }
  },
  "conversion_architecture": {
    "primary_cta": { "text": "", "action": "", "prominence": "", "clarity": "" },
    "secondary_ctas": [],
    "conversion_funnel": { "steps_to_convert": 3, "friction_points": [], "urgency_tactics": [], "risk_reversal": [] },
    "trust_signals": {
      "testimonials": { "present": false, "count": 0, "specificity": "" },
      "case_studies": { "present": false, "count": 0 },
      "client_logos": { "present": false, "recognizable_brands": false },
      "certifications_badges": [],
      "security_trust": { "ssl_visible": true, "privacy_policy": false }
    },
    "trust_score": 7,
    "lead_capture_strategy": { "lead_magnets": [], "form_friction": "" }
  },
  "competitive_positioning": {
    "competitors_mentioned": [],
    "competitive_advantages_claimed": [{ "advantage": "", "category": "", "proof_provided": false, "strength": "" }],
    "market_positioning": { "positioning_statement": "", "market_category": "", "positioning_strategy": "", "differentiation_clarity": "" }
  },
  "technical_maturity": {
    "website_quality_scores": { "design": 7, "user_experience": 7, "content_quality": 7, "technical_execution": 7, "mobile_experience": 7 },
    "overall_website_quality": 7,
    "marketing_sophistication_level": { "level": 3, "definition": "1=Product-centric, 2=Feature-focused, 3=Benefit-driven, 4=Identity-based, 5=Experience-focused", "evidence": "" },
    "technology_detected": { "platform": "", "tracking": { "google_analytics": false, "facebook_pixel": false, "other": [] }, "marketing_tools": { "live_chat": false, "email_marketing_visible": false } },
    "social_media_integration": { "profiles_linked": [], "integration_quality": "" }
  },
  "gaps_opportunities": {
    "critical_gaps": [{ "gap": "", "impact": "", "competitive_disadvantage": false }],
    "quick_wins": [{ "opportunity": "", "impact": "", "effort": "", "implementation": "", "expected_result": "", "priority": "" }],
    "strategic_growth_opportunities": [{ "opportunity": "", "rationale": "", "potential_impact": "", "timeline": "" }],
    "red_flags": [{ "issue": "", "severity": "", "risk": "", "recommendation": "" }],
    "competitive_vulnerabilities": [{ "vulnerability": "", "exploitation_risk": "", "mitigation": "" }]
  },
  "marketing_recommendations": {
    "content_marketing_strategy": { "recommended_focus": "", "content_gaps": [], "content_opportunities": [], "distribution_channels": [] },
    "social_media_strategy": { "recommended_platforms": [{ "platform": "", "rationale": "", "content_approach": "", "priority": "" }] },
    "messaging_optimization": { "value_prop_recommendation": "", "messaging_hierarchy": [], "tone_adjustments": [] },
    "conversion_optimization": { "cta_recommendations": [], "trust_building": [], "friction_reduction": [] }
  },
  "executive_summary": {
    "one_paragraph_overview": "Complete 3-5 sentence business summary",
    "business_model_summary": "One sentence",
    "target_audience_summary": "One sentence",
    "key_differentiator": "Primary unique value",
    "marketing_maturity": "Level with brief explanation",
    "top_3_strengths": [],
    "top_3_improvements_needed": [],
    "overall_assessment_score": 7
  }
}

QUALITY VALIDATION before returning:
✓ Business name and industry clearly identified (be specific)
✓ Target audience specifically defined (not generic)
✓ Value proposition articulated
✓ Brand voice characterized with evidence (actual quotes from site)
✓ All visible pricing captured
✓ Gaps identified are specific and actionable
✓ Opportunities prioritized by impact
✓ Recommendations are strategic and data-backed
✓ Confidence levels noted where uncertain
✓ JSON structure complete and valid
✓ No placeholder text remains

IMPORTANT:
- Return ONLY valid JSON, no markdown code blocks
- Be specific and cite actual content from the pages
- Prioritize insights that impact marketing strategy and social media content creation`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const rl = await checkRateLimit(clientKey(req, "analyze-business"), { limit: 10, windowMs: 60000 });
  if (!rl.ok) {
    return new Response(JSON.stringify({ error: "Too many requests. Please slow down." }), {
      status: 429,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { scrapedContent, userId, workspace_id: bodyWorkspaceId } = await req.json() as { scrapedContent: ScrapedContent; userId: string; workspace_id?: string | null };
    
    if (!scrapedContent || !userId) {
      return new Response(
        JSON.stringify({ error: 'Scraped content and user ID are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Analyzing business for user: ${userId} with ${scrapedContent.totalPages} pages`);
    
    const analysisPrompt = buildComprehensivePrompt(scrapedContent);
    
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { 
            role: "system", 
            content: "You are a comprehensive business intelligence analyst. Return ONLY valid JSON without any markdown formatting or code blocks. Be thorough, specific, and cite actual content from the website pages in your analysis." 
          },
          { role: "user", content: analysisPrompt }
        ],
        temperature: 0.4,
        max_tokens: 32000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'AI Gateway rate limit reached. Please retry in a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Workspace AI credits are depleted. Add credits in Lovable → Settings → Plans & credits, then retry.', code: 'AI_CREDITS_DEPLETED' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw new Error('AI analysis failed');
    }

    const aiResult = await response.json();
    const analysisText = aiResult.choices?.[0]?.message?.content || '';
    
    console.log('AI response received, parsing JSON...');
    
    let comprehensiveAnalysis: any;
    try {
      let jsonStr = analysisText.trim();
      // Strip markdown code fences
      if (jsonStr.startsWith('```json')) {
        jsonStr = jsonStr.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      
      comprehensiveAnalysis = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', parseError);
      console.log('Raw response length:', analysisText.length);
      console.log('Raw response start:', analysisText.slice(0, 300));
      console.log('Raw response end:', analysisText.slice(-300));
      
      // Try to extract JSON object from the response
      const firstBrace = analysisText.indexOf('{');
      const lastBrace = analysisText.lastIndexOf('}');
      
      if (firstBrace !== -1 && lastBrace > firstBrace) {
        try {
          comprehensiveAnalysis = JSON.parse(analysisText.slice(firstBrace, lastBrace + 1));
          console.log('Successfully parsed JSON after extraction');
        } catch (e2) {
          console.error('Second parse attempt failed:', e2);
          // Try to fix truncated JSON by closing open braces/brackets
          let truncatedJson = analysisText.slice(firstBrace, lastBrace + 1);
          // Count unmatched braces and brackets
          let braceCount = 0;
          let bracketCount = 0;
          let inString = false;
          let escaped = false;
          for (const char of truncatedJson) {
            if (escaped) { escaped = false; continue; }
            if (char === '\\') { escaped = true; continue; }
            if (char === '"') { inString = !inString; continue; }
            if (inString) continue;
            if (char === '{') braceCount++;
            else if (char === '}') braceCount--;
            else if (char === '[') bracketCount++;
            else if (char === ']') bracketCount--;
          }
          // Close any open strings, brackets, and braces
          let fixedJson = truncatedJson;
          if (inString) fixedJson += '"';
          for (let i = 0; i < bracketCount; i++) fixedJson += ']';
          for (let i = 0; i < braceCount; i++) fixedJson += '}';
          
          try {
            comprehensiveAnalysis = JSON.parse(fixedJson);
            console.log('Successfully parsed JSON after auto-closing');
          } catch {
            comprehensiveAnalysis = {
              metadata: { website_url: scrapedContent.baseUrl, analysis_timestamp: new Date().toISOString(), pages_analyzed: scrapedContent.totalPages, data_completeness: 'Partial' },
              business_identity: { business_name: scrapedContent.pages[0]?.title?.split('|')[0]?.split('-')[0]?.trim() || 'Unknown', industry: 'Unknown' },
              executive_summary: { one_paragraph_overview: 'Analysis returned incomplete data. Please try again.', overall_assessment_score: 5 },
              parsing_error: true
            };
          }
        }
      } else {
        comprehensiveAnalysis = {
          metadata: { website_url: scrapedContent.baseUrl, data_completeness: 'Limited' },
          business_identity: { business_name: scrapedContent.pages[0]?.title?.split('|')[0]?.trim() || 'Unknown' },
          executive_summary: { one_paragraph_overview: 'Analysis failed to parse. Please try again.', overall_assessment_score: 3 },
          parsing_error: true
        };
      }
    }

    // Extract key data for backward compatibility
    const businessProfile = {
      businessName: comprehensiveAnalysis.business_identity?.business_name || comprehensiveAnalysis.executive_summary?.business_name || 'Unknown',
      industry: comprehensiveAnalysis.business_identity?.industry || 'Unknown',
      businessType: comprehensiveAnalysis.business_identity?.business_model?.business_type || 'Unknown',
      stage: comprehensiveAnalysis.business_identity?.company_stage || 'Unknown',
      productsServices: comprehensiveAnalysis.business_identity?.products_services || [],
      priceRange: comprehensiveAnalysis.business_identity?.pricing_intelligence?.pricing_strategy || 'not-visible',
      geographicFocus: comprehensiveAnalysis.business_identity?.geographic_focus || 'Unknown',
      targetAudience: {
        ...comprehensiveAnalysis.audience_intelligence?.primary_target_audience?.demographics,
        ageRange: comprehensiveAnalysis.audience_intelligence?.primary_target_audience?.demographics?.age_range,
        customerType: comprehensiveAnalysis.audience_intelligence?.primary_target_audience?.demographics?.job_seniority || comprehensiveAnalysis.business_identity?.business_model?.business_type,
        genderFocus: comprehensiveAnalysis.audience_intelligence?.primary_target_audience?.demographics?.gender_focus,
        incomeLevel: comprehensiveAnalysis.audience_intelligence?.primary_target_audience?.demographics?.income_bracket,
        educationLevel: comprehensiveAnalysis.audience_intelligence?.primary_target_audience?.demographics?.education_level,
        interests: comprehensiveAnalysis.audience_intelligence?.primary_target_audience?.psychographics?.values || [],
        painPoints: comprehensiveAnalysis.audience_intelligence?.primary_target_audience?.pain_points?.map((p: any) => p.pain) || [],
      },
      brandIdentity: {
        voiceScale: comprehensiveAnalysis.brand_architecture?.brand_voice?.tone_scales?.formality || 5,
        toneCharacteristics: comprehensiveAnalysis.brand_architecture?.brand_voice?.voice_characteristics || [],
        messagingThemes: comprehensiveAnalysis.brand_architecture?.messaging_architecture?.supporting_messages || [],
        valueProposition: comprehensiveAnalysis.brand_architecture?.messaging_architecture?.primary_value_proposition || '',
        brandValues: comprehensiveAnalysis.brand_architecture?.brand_values?.explicit_values || [],
        competitiveAdvantages: comprehensiveAnalysis.competitive_positioning?.competitive_advantages_claimed?.map((a: any) => a.advantage) || [],
      },
      visualIdentity: {
        primaryColors: comprehensiveAnalysis.visual_identity?.color_psychology?.primary_brand_color?.hex ? [comprehensiveAnalysis.visual_identity.color_psychology.primary_brand_color.hex] : [],
        secondaryColors: comprehensiveAnalysis.visual_identity?.color_psychology?.secondary_colors?.map((c: any) => c.hex) || [],
        visualStyle: comprehensiveAnalysis.visual_identity?.design_style?.design_aesthetic || 'Unknown',
        photographyStyle: comprehensiveAnalysis.visual_identity?.photography_style?.style || 'Unknown',
      },
      contentAnalysis: {
        themes: comprehensiveAnalysis.content_strategy_analysis?.content_themes?.map((t: any) => t.theme) || [],
        contentTypes: comprehensiveAnalysis.content_strategy_analysis?.content_marketing_presence?.content_types || [],
        topKeywords: comprehensiveAnalysis.content_strategy_analysis?.seo_intelligence?.primary_keywords_detected || [],
        qualityAssessment: comprehensiveAnalysis.content_strategy_analysis?.content_quality_assessment?.depth || 'basic',
      },
      marketingMaturity: {
        websiteQuality: comprehensiveAnalysis.technical_maturity?.overall_website_quality || 5,
        seoLevel: comprehensiveAnalysis.content_strategy_analysis?.seo_intelligence?.seo_maturity || 'basic',
        contentMarketing: comprehensiveAnalysis.content_strategy_analysis?.content_marketing_presence?.blog_present ? 'established' : 'basic',
        socialProof: comprehensiveAnalysis.conversion_architecture?.trust_signals ? ['testimonials'] : [],
        ctaClarity: comprehensiveAnalysis.conversion_architecture?.primary_cta?.clarity === 'Crystal clear' ? 'strong' : 'moderate',
        sophisticationLevel: comprehensiveAnalysis.technical_maturity?.marketing_sophistication_level?.level || 3,
        socialPresence: comprehensiveAnalysis.technical_maturity?.social_media_integration?.integration_quality || 'Unknown',
      },
      competitors: comprehensiveAnalysis.competitive_positioning?.competitors_mentioned || [],
      summary: comprehensiveAnalysis.executive_summary?.one_paragraph_overview || '',
    };

    // Save to database
    const supabase = anonClient();
    
    // Resolve workspace_id
    let workspaceId = bodyWorkspaceId ?? null;
    if (!workspaceId) {
      const { data: prof } = await serviceClient()
        .from('user_profiles')
        .select('active_workspace_id')
        .eq('user_id', userId)
        .maybeSingle();
      workspaceId = (prof as any)?.active_workspace_id ?? null;
    }

    await supabase.from('business_context').update({ is_active: false }).eq('user_id', userId);
    
    const { data: savedContext, error: saveError } = await supabase
      .from('business_context')
      .insert({
        user_id: userId,
        workspace_id: workspaceId,
        website_url: scrapedContent.baseUrl,
        scraped_pages: scrapedContent.pages,
        business_profile: businessProfile,
        audience_intelligence: comprehensiveAnalysis.audience_intelligence || null,
        brand_architecture: comprehensiveAnalysis.brand_architecture || null,
        visual_identity: comprehensiveAnalysis.visual_identity || null,
        content_strategy_analysis: comprehensiveAnalysis.content_strategy_analysis || null,
        conversion_architecture: comprehensiveAnalysis.conversion_architecture || null,
        competitive_positioning: comprehensiveAnalysis.competitive_positioning || null,
        technical_maturity: comprehensiveAnalysis.technical_maturity || null,
        gaps_opportunities: comprehensiveAnalysis.gaps_opportunities || null,
        marketing_recommendations: comprehensiveAnalysis.marketing_recommendations || null,
        executive_summary: comprehensiveAnalysis.executive_summary || null,
        pages_analyzed_count: scrapedContent.totalPages,
        analysis_depth: scrapedContent.analysisDepth || 'standard',
        overall_assessment_score: comprehensiveAnalysis.executive_summary?.overall_assessment_score || null,
        marketing_sophistication_level: comprehensiveAnalysis.technical_maturity?.marketing_sophistication_level?.level || null,
        analyzed_at: new Date().toISOString(),
        last_updated: new Date().toISOString(),
        is_active: true,
      })
      .select()
      .single();

    if (saveError) console.error('Failed to save business context:', saveError);

    // === NEW: Seed initial behavior patterns based on business characteristics ===
    try {
      const supabaseAdmin = serviceClient();
      const industry = (businessProfile.industry || '').toLowerCase();
      const businessType = (businessProfile.businessType || '').toLowerCase();
      const priceRange = (businessProfile.priceRange || '').toLowerCase();

      // Industry-based initial predictions
      let initialPreferences: any = {};
      
      if (industry.includes('b2b') || industry.includes('saas') || industry.includes('software')) {
        initialPreferences = {
          content_type_preferences: { carousel: 0.40, article: 0.30, video: 0.20, image: 0.10 },
          topic_preferences: { educational: 0.60, thought_leadership: 0.25, case_studies: 0.15 },
          hook_effectiveness: { bold_statement: 0.70, question: 0.65, social_proof: 0.60 },
        };
      } else if (industry.includes('ecommerce') || industry.includes('retail') || industry.includes('fashion')) {
        initialPreferences = {
          content_type_preferences: { reel: 0.40, carousel: 0.30, image: 0.20, story: 0.10 },
          topic_preferences: { lifestyle: 0.50, promotional: 0.30, ugc: 0.20 },
          hook_effectiveness: { curiosity_gap: 0.75, scarcity: 0.70, social_proof: 0.65 },
        };
      } else if (industry.includes('coach') || industry.includes('consulting') || industry.includes('personal')) {
        initialPreferences = {
          content_type_preferences: { carousel: 0.35, reel: 0.30, image: 0.20, story: 0.15 },
          topic_preferences: { transformation_stories: 0.40, educational: 0.35, authority_building: 0.25 },
          hook_effectiveness: { story_hook: 0.80, curiosity_gap: 0.75, bold_statement: 0.65 },
        };
      } else {
        initialPreferences = {
          content_type_preferences: { carousel: 0.35, reel: 0.30, image: 0.20, video: 0.15 },
          topic_preferences: { educational: 0.45, engagement: 0.30, promotional: 0.25 },
          hook_effectiveness: { curiosity_gap: 0.70, question: 0.65, bold_statement: 0.60 },
        };
      }

      // Adjust for price point
      if (priceRange.includes('premium') || priceRange.includes('high')) {
        initialPreferences.topic_preferences = { ...initialPreferences.topic_preferences, educational: (initialPreferences.topic_preferences.educational || 0.4) + 0.1 };
      }

      // Seed for common platforms
      const platforms = ['instagram', 'tiktok', 'linkedin', 'facebook'];
      for (const platform of platforms) {
        const { data: existing } = await supabaseAdmin.from('user_behavior_patterns')
          .select('id').eq('user_id', userId).eq('platform', platform).maybeSingle();
        
        if (!existing) {
          await supabaseAdmin.from('user_behavior_patterns').insert({
            user_id: userId,
            platform,
            behavior_data: initialPreferences,
            learning_confidence: 0.20,
            last_analyzed: new Date().toISOString(),
          });
        }
      }
      console.log('Seeded initial behavior patterns based on industry:', industry);
    } catch (seedError) {
      console.error('Error seeding behavior patterns:', seedError);
    }

    console.log('Business analysis complete');
    
    return new Response(
      JSON.stringify({ success: true, businessProfile, comprehensiveAnalysis, contextId: savedContext?.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Analysis error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Analysis failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
