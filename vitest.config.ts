import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'supabase/functions/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // Deno remote-URL imports Vitest/Node can't resolve. Only aliased for
      // shared modules whose pure logic is worth unit testing even though
      // their unrelated top-level import can't run under Node -- see the
      // stub file for why calling the real function here is not supported.
      'https://esm.sh/@supabase/supabase-js@2.57.4': path.resolve(
        __dirname,
        './supabase/functions/_shared/__mocks__/supabase-js-stub.ts',
      ),
      // Deno's "npm:pkg@version" specifier form. The package itself is a
      // regular npm dependency (see package.json), so this just strips the
      // Deno-specific prefix/version pin back to the bare specifier Node
      // already knows how to resolve.
      'npm:zod@3.23.8': 'zod',
    },
  },
});
