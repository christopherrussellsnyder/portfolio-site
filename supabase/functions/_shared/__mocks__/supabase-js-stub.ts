// Test-only stub for the remote "https://esm.sh/@supabase/supabase-js@2.57.4"
// specifier, which Vitest/Node cannot resolve (bare URL import). Aliased in
// vitest.config.ts so shared Deno modules that import createClient at the
// top level (but don't need a real client for the pure logic under test)
// can still be loaded by the test runner.
export function createClient(..._args: unknown[]) {
  throw new Error('createClient() stub called in a test — this path needs a real mock, not this stub.');
}
