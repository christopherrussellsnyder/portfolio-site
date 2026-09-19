DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname, qual
    FROM pg_policies
    WHERE schemaname = 'public' AND cmd = 'UPDATE' AND with_check IS NULL AND qual IS NOT NULL
  LOOP
    EXECUTE format(
      'ALTER POLICY %I ON %I.%I WITH CHECK (%s)',
      r.policyname, r.schemaname, r.tablename, r.qual
    );
  END LOOP;
END $$;