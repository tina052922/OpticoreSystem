import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role client for server-only operations (admin auth, inserts that bypass RLS).
 * Never import in Client Components or expose the key.
 *
 * Requires in **`web/.env.local`** (restart `npm run dev` after editing):
 * - `NEXT_PUBLIC_SUPABASE_URL`
 * - `SUPABASE_SERVICE_ROLE_KEY` (service_role JWT, not anon)
 */
export function createSupabaseAdminClient(): SupabaseClient | null {
  const r = getSupabaseAdminConfig();
  if ("error" in r) return null;
  return r.client;
}

/** Which env vars are missing (for API error messages). */
export function getSupabaseAdminConfigError(): string | null {
  const r = getSupabaseAdminConfig();
  return "error" in r ? r.error : null;
}

type AdminOk = { client: SupabaseClient };
type AdminErr = { error: string };

function getSupabaseAdminConfig(): AdminOk | AdminErr {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const missing: string[] = [];
  if (!url) missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!key) missing.push("SUPABASE_SERVICE_ROLE_KEY");
  if (missing.length) {
    return {
      error: `Missing ${missing.join(" and ")} in web/.env.local (both are required for instructor and student self-registration APIs). Restart the dev server after saving.`,
    };
  }
  // Narrowed: both url and key are non-empty after checks above
  return {
    client: createClient(url!, key!, {
      auth: { persistSession: false, autoRefreshToken: false },
    }),
  };
}
