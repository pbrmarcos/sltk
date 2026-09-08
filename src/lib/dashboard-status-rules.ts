// Regras de status compartilhadas entre o motor de dashboards por role
// (dashboards-role.server.ts) e o contador de pendências da sidebar
// (pendencias.functions.ts) — um único lugar que sabe o que conta como
// "aberto"/"pendente"/"atrasado", lendo os enums reais em vez de strings
// soltas divergentes.
import type { EtpStatus, EtapaStatus, RevisaoStatus } from "@/lib/engenharia.shared";

export const ETP_STATUS_ABERTO: readonly EtpStatus[] = ["rascunho", "em_revisao"];

export const ETAPA_STATUS_CONCLUIDA: readonly EtapaStatus[] = ["concluida"];

// Revisão pendente = ainda não decidida. "aprovada", "aprovada_com_ressalvas"
// e "reprovada" são estados terminais (uma decisão já foi tomada), não fila
// de trabalho em aberto.
export const REVISAO_STATUS_PENDENTE: readonly RevisaoStatus[] = ["pendente", "em_andamento"];

export function isEtpAberto(status: string): boolean {
  return (ETP_STATUS_ABERTO as readonly string[]).includes(status);
}

export function isEtapaConcluida(status: string): boolean {
  return (ETAPA_STATUS_CONCLUIDA as readonly string[]).includes(status);
}

export function isRevisaoPendente(status: string): boolean {
  return (REVISAO_STATUS_PENDENTE as readonly string[]).includes(status);
}

export function isEtapaAtrasada(
  status: string,
  dataVencimento: string | null | undefined,
  nowMs: number,
): boolean {
  return (
    !isEtapaConcluida(status) && !!dataVencimento && new Date(dataVencimento).getTime() < nowMs
  );
}
