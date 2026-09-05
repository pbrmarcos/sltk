import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type { AuditEntry } from "./audit";

type AdminClient = SupabaseClient<Database>;
type AuditInsert = Database["public"]["Tables"]["audit_log"]["Insert"];

/**
 * Versão server-only do logAudit, para uso dentro de outras server functions
 * que já têm o supabaseAdmin instanciado — evita o overhead de uma RPC interna.
 * Nunca lança.
 */
export async function logAuditServer(
  supabaseAdmin: AdminClient,
  userId: string | null,
  entry: AuditEntry | AuditEntry[],
): Promise<{ ok: boolean }> {
  const entries = Array.isArray(entry) ? entry : [entry];
  if (entries.length === 0) return { ok: true };
  try {
    const rows: AuditInsert[] = entries.map((e) => ({
      user_id: userId,
      table_name: e.table_name,
      record_id: e.record_id,
      action: e.action,
      field_changed: e.field_changed ?? null,
      old_value: (e.old_value ?? null) as AuditInsert["old_value"],
      new_value: (e.new_value ?? null) as AuditInsert["new_value"],
    }));
    const { error } = await supabaseAdmin.from("audit_log").insert(rows);
    if (error) {
      console.error("[audit] server insert failed", error);
      return { ok: false };
    }
    return { ok: true };
  } catch (err) {
    console.error("[audit] server unexpected failure", err);
    return { ok: false };
  }
}
