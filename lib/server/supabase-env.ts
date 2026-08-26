import "server-only";

/**
 * Server-only Supabase settings. Never use `NEXT_PUBLIC_` names in Client
 * Components — Next inlines those into the browser bundle.
 *
 * Preferred (Vercel / Express / Next server):
 *   SUPABASE_URL
 *   SUPABASE_ANON_KEY          (RLS, never service_role)
 *   SUPABASE_SERVICE_ROLE_KEY  (bypasses RLS — server only)
 *
 * `NEXT_PUBLIC_SUPABASE_*` is read only as a fallback so existing deployments
 * keep working; those values still never ship to the browser because this
 * module is `server-only`.
 */
export function getSupabaseUrl(): string | undefined {
  const v = process.env.SUPABASE_URL?.trim() || process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  return v || undefined;
}

export function getSupabaseAnonKey(): string | undefined {
  const v = process.env.SUPABASE_ANON_KEY?.trim() || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  return v || undefined;
}

export function getSupabaseServiceRoleKey(): string | undefined {
  return process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || undefined;
}
