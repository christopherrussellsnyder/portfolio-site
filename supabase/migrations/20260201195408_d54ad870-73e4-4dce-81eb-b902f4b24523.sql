-- Add enhanced columns to business_context table for comprehensive analysis
ALTER TABLE business_context ADD COLUMN IF NOT EXISTS audience_intelligence jsonb;
ALTER TABLE business_context ADD COLUMN IF NOT EXISTS brand_architecture jsonb;
ALTER TABLE business_context ADD COLUMN IF NOT EXISTS visual_identity jsonb;
ALTER TABLE business_context ADD COLUMN IF NOT EXISTS content_strategy_analysis jsonb;
ALTER TABLE business_context ADD COLUMN IF NOT EXISTS conversion_architecture jsonb;
ALTER TABLE business_context ADD COLUMN IF NOT EXISTS competitive_positioning jsonb;
ALTER TABLE business_context ADD COLUMN IF NOT EXISTS technical_maturity jsonb;
ALTER TABLE business_context ADD COLUMN IF NOT EXISTS gaps_opportunities jsonb;
ALTER TABLE business_context ADD COLUMN IF NOT EXISTS marketing_recommendations jsonb;
ALTER TABLE business_context ADD COLUMN IF NOT EXISTS executive_summary jsonb;
ALTER TABLE business_context ADD COLUMN IF NOT EXISTS pages_analyzed_count integer;
ALTER TABLE business_context ADD COLUMN IF NOT EXISTS analysis_depth text DEFAULT 'standard';
ALTER TABLE business_context ADD COLUMN IF NOT EXISTS overall_assessment_score integer;
ALTER TABLE business_context ADD COLUMN IF NOT EXISTS marketing_sophistication_level integer;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_business_context_assessment ON business_context(overall_assessment_score DESC);
CREATE INDEX IF NOT EXISTS idx_business_context_sophistication ON business_context(marketing_sophistication_level);
CREATE INDEX IF NOT EXISTS idx_business_context_user_active ON business_context(user_id, is_active);