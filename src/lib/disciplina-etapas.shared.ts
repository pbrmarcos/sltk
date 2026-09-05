import type {
  Disciplina,
  EtapaStatus,
  Prioridade,
} from "@/lib/equipamento-disciplina-etapas.functions";

export const DISCIPLINA_LABEL: Record<Disciplina, string> = {
  planejamento: "Planejamento",
  engenharia: "Engenharia",
  producao: "Automação",
  qualidade: "Qualidade",
  pos_venda: "Pós-venda",
};

export const ETAPA_STATUS_ORDEM: EtapaStatus[] = [
  "em_progresso",
  "nao_iniciado",
  "bloqueado",
  "concluido",
];
export const ETAPA_STATUS_LABEL: Record<EtapaStatus, string> = {
  em_progresso: "Em progresso",
  nao_iniciado: "Não iniciado",
  bloqueado: "Bloqueado",
  concluido: "Concluído",
};
export const ETAPA_STATUS_COLOR: Record<EtapaStatus, string> = {
  em_progresso: "border-blue-200 bg-blue-50 text-blue-700",
  nao_iniciado:
    "border-[var(--badge-neutral-border)] bg-[var(--badge-neutral-bg)] text-[var(--badge-neutral-fg)]",
  bloqueado: "border-rose-200 bg-rose-50 text-rose-700",
  concluido: "border-emerald-200 bg-emerald-50 text-emerald-700",
};
export const ETAPA_STATUS_DOT: Record<EtapaStatus, string> = {
  em_progresso: "bg-blue-500",
  nao_iniciado: "bg-[var(--neutral)]",
  bloqueado: "bg-rose-500",
  concluido: "bg-emerald-500",
};

export const PRIORIDADE_LABEL: Record<Prioridade, string> = {
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
  urgente: "Urgente",
};
export const PRIORIDADE_COLOR: Record<Prioridade, string> = {
  baixa:
    "border-[var(--badge-neutral-border)] bg-[var(--badge-neutral-bg)] text-[var(--badge-neutral-fg)]",
  media: "border-blue-200 bg-blue-50 text-blue-700",
  alta: "border-amber-200 bg-amber-50 text-amber-700",
  urgente: "border-rose-200 bg-rose-50 text-rose-700",
};

export function isDueDatePast(d: string | null | undefined): boolean {
  if (!d) return false;
  const dt = new Date(d + "T23:59:59");
  return dt.getTime() < Date.now();
}
