-- Add new columns to uploaded_analytics table for enhanced analysis
ALTER TABLE uploaded_analytics ADD COLUMN IF NOT EXISTS platform_confidence text;
ALTER TABLE uploaded_analytics ADD COLUMN IF NOT EXISTS data_completeness text;
ALTER TABLE uploaded_analytics ADD COLUMN IF NOT EXISTS trend_analysis jsonb;
ALTER TABLE uploaded_analytics ADD COLUMN IF NOT EXISTS benchmark_comparison jsonb;
ALTER TABLE uploaded_analytics ADD COLUMN IF NOT EXISTS pattern_recognition jsonb;
ALTER TABLE uploaded_analytics ADD COLUMN IF NOT EXISTS insights jsonb;
ALTER TABLE uploaded_analytics ADD COLUMN IF NOT EXISTS recommendations jsonb;
ALTER TABLE uploaded_analytics ADD COLUMN IF NOT EXISTS opportunities jsonb;
ALTER TABLE uploaded_analytics ADD COLUMN IF NOT EXISTS risks jsonb;
ALTER TABLE uploaded_analytics ADD COLUMN IF NOT EXISTS follow_up_questions text[];
ALTER TABLE uploaded_analytics ADD COLUMN IF NOT EXISTS summary jsonb;
ALTER TABLE uploaded_analytics ADD COLUMN IF NOT EXISTS overall_health_score integer;
ALTER TABLE uploaded_analytics ADD COLUMN IF NOT EXISTS performance_rating text;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_uploaded_analytics_health_score ON uploaded_analytics(overall_health_score DESC);
CREATE INDEX IF NOT EXISTS idx_uploaded_analytics_platform ON uploaded_analytics(platform);
CREATE INDEX IF NOT EXISTS idx_uploaded_analytics_uploaded_at ON uploaded_analytics(uploaded_at DESC);