// Shared completion scoring for the business_information profile that every
// grounded AI feature (strategy, captions, ad scripts, audience targeting)
// falls back on when live external grounding is unavailable. Extracted from
// BusinessInformationSection.tsx so it can also drive the onboarding
// checklist and a lightweight nudge elsewhere in the app, without those
// call sites needing to load the full 45-field settings form.
export interface BusinessInfoForCompletion {
  business_name?: string | null;
  business_type?: string | null;
  industry?: string | null;
  company_size?: string | null;
  website?: string | null;
  location?: string | null;
  business_stage?: string | null;
  years_in_business?: number | null;
  monthly_revenue_range?: string | null;
  primary_products_services?: string | null;
  unique_value_proposition?: string | null;
  top_competitors?: unknown;
  competitive_advantage?: string | null;
  income_level?: string | null;
  education_levels?: unknown;
  geographic_focus?: unknown;
  customer_pain_points?: string | null;
  buying_behavior?: string | null;
  customer_lifetime_value?: number | null;
  brand_voice_traits?: unknown;
  primary_brand_color?: string | null;
  secondary_brand_color?: string | null;
  content_themes?: unknown;
  content_restrictions?: string | null;
  brand_values?: unknown;
  available_content_types?: unknown;
  professional_photos_count?: number | null;
  videos_available_count?: number | null;
  testimonials_count?: number | null;
  photography_style?: string | null;
  video_production_capability?: string | null;
  content_creation_frequency?: string | null;
  monthly_website_visitors?: number | null;
  total_social_followers?: number | null;
  avg_post_engagement_rate?: number | null;
  current_conversion_rate?: number | null;
  customer_acquisition_cost?: number | null;
  email_subscriber_count?: number | null;
  best_performing_content_types?: unknown;
}

export function calculateBusinessInfoCompletion(info: BusinessInfoForCompletion | null | undefined): number {
  if (!info) return 0;
  const arr = (v: unknown) => Array.isArray(v) && v.length > 0;
  const fields = [
    // Company Details (13 fields)
    info.business_name,
    info.business_type,
    info.industry,
    info.company_size,
    info.website,
    info.location,
    info.business_stage,
    info.years_in_business,
    info.monthly_revenue_range,
    info.primary_products_services,
    info.unique_value_proposition,
    arr(info.top_competitors),
    info.competitive_advantage,
    // Target Audience (6 fields)
    info.income_level,
    arr(info.education_levels),
    arr(info.geographic_focus),
    info.customer_pain_points,
    info.buying_behavior,
    info.customer_lifetime_value,
    // Brand Identity (6 fields)
    arr(info.brand_voice_traits),
    info.primary_brand_color,
    info.secondary_brand_color,
    arr(info.content_themes),
    info.content_restrictions,
    arr(info.brand_values),
    // Marketing Assets (7 fields)
    arr(info.available_content_types),
    (info.professional_photos_count ?? 0) > 0,
    (info.videos_available_count ?? 0) > 0,
    (info.testimonials_count ?? 0) > 0,
    info.photography_style,
    info.video_production_capability,
    info.content_creation_frequency,
    // Performance Metrics (7 fields)
    info.monthly_website_visitors,
    info.total_social_followers,
    info.avg_post_engagement_rate,
    info.current_conversion_rate,
    info.customer_acquisition_cost,
    info.email_subscriber_count,
    arr(info.best_performing_content_types),
  ];

  const filledFields = fields.filter(Boolean).length;
  return Math.round((filledFields / fields.length) * 100);
}
