// Regras puras de transição de status de embarque — extraídas de
// logistica.functions.ts (setStatus) pra poderem ser testadas sem banco.
import type { LogisticaStatus } from "./logistica.functions";

/** Transições que exigem motivo obrigatório (mínimo 5 caracteres). */
const CRITICAL_STATUS: LogisticaStatus[] = ["embarcado", "entregue", "cancelado"];

export function exigeMotivo(status: LogisticaStatus): boolean {
  return CRITICAL_STATUS.includes(status);
}

/** Retorna a mensagem de erro se o motivo for inválido para o status, ou null se ok. */
export function validarMotivo(
  status: LogisticaStatus,
  notas: string | null | undefined,
): string | null {
  if (!exigeMotivo(status)) return null;
  const trimmed = (notas ?? "").trim();
  if (trimmed.length < 5) {
    return `Motivo obrigatório para marcar como "${status}" (mínimo 5 caracteres).`;
  }
  return null;
}

/** Campos extras a gravar no embarque conforme o novo status. */
export function patchParaStatusEmbarque(
  status: LogisticaStatus,
  nowISO: string,
): Record<string, unknown> {
  const patch: Record<string, unknown> = { status };
  if (status === "embarcado") patch.data_saida = nowISO;
  if (status === "entregue") patch.data_entrega = nowISO;
  return patch;
}
