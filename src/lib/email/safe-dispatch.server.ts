/**
 * Helper server-only para disparar e-mails a partir dos handlers de negócio
 * sem quebrar a operação em caso de falha. Sempre engole exceções e loga.
 *
 * Uso:
 *   await safeDispatch({
 *     eventKey: "chamado.resolvido",
 *     triggeredBy: uid,
 *     entityTable: "chamados",
 *     entityId: chamadoId,
 *     vars: { codigo, cliente_nome, usuario, link, data },
 *   });
 */
import type { DispatchInput } from "./dispatch.server";

export async function safeDispatch(input: Omit<DispatchInput, "triggeredByKind"> & {
  triggeredByKind?: DispatchInput["triggeredByKind"];
}): Promise<void> {
  try {
    const { getCriticalClient } = await import("@/lib/supabase-client.server");
    const supabaseAdmin = await getCriticalClient();
    const { dispatchEmail } = await import("./dispatch.server");
    await dispatchEmail(supabaseAdmin, {
      triggeredByKind: input.triggeredByKind ?? "user",
      ...input,
    });
  } catch (e) {
    console.error(`[email/safeDispatch] ${input.eventKey} failed`, e);
  }
}

/** Formata data ISO / Date para exibição pt-BR (usado dentro das vars). */
export function fmtDate(d?: Date | string | null): string {
  if (!d) return new Date().toLocaleString("pt-BR");
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleString("pt-BR");
}

/** Constrói URL absoluta para um path do app. */
export function appUrl(path: string): string {
  const base = "https://solutek-hub.lovable.app";
  if (!path) return base;
  return path.startsWith("http") ? path : `${base}${path.startsWith("/") ? path : `/${path}`}`;
}
