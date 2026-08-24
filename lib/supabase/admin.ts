import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseServiceRoleKey, getSupabaseUrl } from "@/lib/server/supabase-env";

/**
 * Service-role client for server-only operations (admin auth, inserts that bypass RLS).
 * Never import in Client Components or expose the key.
 *
 * Requires on the **server** (Vercel env / `.env.local`, not the browser):
 * - `SUPABASE_URL` (or legacy `NEXT_PUBLIC_SUPABASE_URL`)
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
  const url = getSupabaseUrl();
  const key = getSupabaseServiceRoleKey();
  const missing: string[] = [];
  if (!url) missing.push("SUPABASE_URL");
  if (!key) missing.push("SUPABASE_SERVICE_ROLE_KEY");
  if (missing.length) {
    const runningOnVercel = Boolean(process.env.VERCEL);
    const locationHint = runningOnVercel
      ? "in Vercel Project Settings -> Environment Variables (server, not NEXT_PUBLIC_)"
      : "in .env.local (server process only)";
    const actionHint = runningOnVercel
      ? "Redeploy after saving."
      : "Restart the dev server after saving.";
    return {
      error: `Missing ${missing.join(" and ")} ${locationHint} (both are required for instructor and student self-registration APIs). ${actionHint}`,
    };
  }
  // Narrowed: both url and key are non-empty after checks above
  return {
    client: createClient(url!, key!, {
      auth: { persistSession: false, autoRefreshToken: false },
    }),
  };
}
