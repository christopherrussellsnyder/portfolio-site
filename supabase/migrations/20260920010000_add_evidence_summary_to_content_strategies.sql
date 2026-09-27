-- Persists the evidence ledger's summary (confidence, source composition,
-- contradictions, top-ranked signals) alongside each generated strategy so
-- it survives page reloads instead of only existing in the generation
-- response and server logs. Nullable/additive -- existing rows are
-- unaffected.
ALTER TABLE public.content_strategies
  ADD COLUMN IF NOT EXISTS evidence_summary jsonb;
