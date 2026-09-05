// Regras puras de transição de status de chamado — extraídas de
// suporte.functions.ts (alterarStatusChamado) pra poderem ser testadas sem banco.
export const CHAMADO_STATUS = [
  "aberto",
  "em_analise",
  "aguardando_cliente",
  "resolvido",
  "reaberto",
  "arquivado",
] as const;
export type ChamadoStatus = (typeof CHAMADO_STATUS)[number];

/** Campos extras a gravar no chamado conforme o novo status. */
export function patchParaStatusChamado(
  status: ChamadoStatus,
  nowISO: string,
): Record<string, unknown> {
  const patch: Record<string, unknown> = { status };
  if (status === "resolvido") {
    patch.resolvido_em = nowISO;
  }
  if (status === "reaberto") {
    patch.reaberto_em = nowISO;
    patch.resolvido_em = null;
  }
  return patch;
}

/** Transições que disparam e-mail automático pro solicitante/cliente. */
export function eventoDeEmail(
  status: ChamadoStatus,
): "chamado.resolvido" | "chamado.reaberto" | null {
  if (status === "resolvido") return "chamado.resolvido";
  if (status === "reaberto") return "chamado.reaberto";
  return null;
}
