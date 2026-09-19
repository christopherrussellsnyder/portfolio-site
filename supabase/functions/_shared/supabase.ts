// Shared Supabase client factories for edge functions.
// Reuse these instead of instantiating createClient in each function file so
// we get consistent config and fewer bundle bytes per function.
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

let _service: SupabaseClient | null = null;
let _anon: SupabaseClient | null = null;

/** Service-role client. Bypasses RLS — never expose results directly to untrusted callers. */
export function serviceClient(): SupabaseClient {
  if (!_service) {
    _service = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return _service;
}

/** Anon client bound to the caller's JWT. Use for RLS-enforced reads/writes on behalf of the user. */
export function userClient(authHeader: string | null): SupabaseClient {
  return createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader ?? "" } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Cached anon client with no auth header. Cheapest option for public reads. */
export function anonClient(): SupabaseClient {
  if (!_anon) {
    _anon = createClient(SUPABASE_URL, ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return _anon;
}
