import type { SupabaseClient } from "@supabase/supabase-js";

export type AuditLogInsert = {
  actorId: string;
  collegeId: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  details?: Record<string, unknown> | null;
};

export async function insertAuditLog(
  supabase: SupabaseClient,
  row: AuditLogInsert,
): Promise<{ error: string | null }> {
  const { error } = await supabase.from("AuditLog").insert({
    actorId: row.actorId,
    collegeId: row.collegeId,
    action: row.action,
    entityType: row.entityType,
    entityId: row.entityId ?? null,
    details: row.details ?? null,
  });
  return { error: error?.message ?? null };
}
