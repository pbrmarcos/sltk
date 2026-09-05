import { logAuditFn } from "./audit.functions";

export type AuditAction = "INSERT" | "UPDATE" | "DELETE" | "ACCESS";

export interface AuditEntry {
  table_name: string;
  record_id: string;
  action: AuditAction;
  field_changed?: string | null;
  old_value?: unknown;
  new_value?: unknown;
}

/**
 * Registra uma ou mais entradas no audit_log.
 * Nunca lança — falhas no audit não devem derrubar a operação principal.
 * Use fire-and-forget (`void logAudit(...)`) quando o caller não precisa esperar.
 */
export async function logAudit(entry: AuditEntry | AuditEntry[]): Promise<{ ok: boolean }> {
  const entries = Array.isArray(entry) ? entry : [entry];
  if (entries.length === 0) return { ok: true };
  try {
    return await logAuditFn({ data: { entries } });
  } catch (err) {
    console.error("[audit] logAudit failed", err);
    return { ok: false };
  }
}

/**
 * Gera uma entrada de auditoria por campo alterado (shallow diff).
 * Ignora campos cujo valor não mudou. Útil para UPDATE.
 */
export function diffEntries(
  table_name: string,
  record_id: string,
  before: Record<string, unknown>,
  after: Record<string, unknown>,
): AuditEntry[] {
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  const out: AuditEntry[] = [];
  for (const key of keys) {
    const oldV = before[key];
    const newV = after[key];
    if (Object.is(oldV, newV)) continue;
    if (
      oldV != null &&
      newV != null &&
      typeof oldV === "object" &&
      typeof newV === "object" &&
      JSON.stringify(oldV) === JSON.stringify(newV)
    ) {
      continue;
    }
    out.push({
      table_name,
      record_id,
      action: "UPDATE",
      field_changed: key,
      old_value: oldV ?? null,
      new_value: newV ?? null,
    });
  }
  return out;
}
