export const ETP_STATUS = ["rascunho", "em_revisao", "aprovado", "rejeitado", "obsoleto"] as const;
export type EtpStatus = (typeof ETP_STATUS)[number];
export const ETP_STATUS_LABEL: Record<EtpStatus, string> = {
  rascunho: "Rascunho",
  em_revisao: "Em revisão",
  aprovado: "Aprovado",
  rejeitado: "Rejeitado",
  obsoleto: "Obsoleto",
};
export const ETP_STATUS_COLOR: Record<EtpStatus, string> = {
  rascunho:
    "border-[var(--badge-neutral-border)] bg-[var(--badge-neutral-bg)] text-[var(--badge-neutral-fg)]",
  em_revisao: "border-amber-200 bg-amber-50 text-amber-700",
  aprovado: "border-emerald-200 bg-emerald-50 text-emerald-700",
  rejeitado: "border-rose-200 bg-rose-50 text-rose-700",
  obsoleto:
    "border-[var(--badge-neutral-border)] bg-[var(--badge-neutral-bg)] text-[var(--text-muted)]",
};

/** Transições permitidas no workflow do ETP. */
export const ETP_TRANSICOES: Record<EtpStatus, EtpStatus[]> = {
  rascunho: ["em_revisao"],
  em_revisao: ["rascunho", "aprovado", "rejeitado"],
  aprovado: ["em_revisao"],
  rejeitado: ["em_revisao"],
  obsoleto: [],
};

export const ETP_HISTORICO_TIPO = [
  "alteracao",
  "nota",
  "aprovacao",
  "status",
  "anexo",
  "reabertura",
] as const;
export type EtpHistoricoTipo = (typeof ETP_HISTORICO_TIPO)[number];
export const ETP_HISTORICO_TIPO_LABEL: Record<EtpHistoricoTipo, string> = {
  alteracao: "Alteração de campo",
  nota: "Nota da equipe",
  aprovacao: "Aprovação",
  status: "Mudança de status",
  anexo: "Anexo",
  reabertura: "Reabertura de ETP aprovado",
};
export const ETP_CAMPO_LABEL: Record<string, string> = {
  escopo: "Escopo",
  premissas: "Premissas",
  requisitos_funcionais: "Requisitos funcionais",
  requisitos_tecnicos: "Requisitos técnicos",
  criterios_aceite: "Critérios de aceite",
  riscos: "Riscos",
  observacoes: "Observações",
  status: "Status",
  anexo_adicionado: "Anexo adicionado",
  anexo_removido: "Anexo removido",
};

export const ETAPA_FASES = [
  "engenharia",
  "compras",
  "fabricacao",
  "montagem",
  "qualidade",
  "expedicao",
] as const;
export type EtapaFase = (typeof ETAPA_FASES)[number];
export const ETAPA_FASE_LABEL: Record<EtapaFase, string> = {
  engenharia: "Engenharia",
  compras: "Compras",
  fabricacao: "Fabricação",
  montagem: "Montagem",
  qualidade: "Qualidade",
  expedicao: "Expedição",
};
export const ETAPA_FASE_COLOR: Record<EtapaFase, string> = {
  engenharia: "bg-sky-500",
  compras: "bg-amber-500",
  fabricacao: "bg-blue-500",
  montagem: "bg-violet-500",
  qualidade: "bg-emerald-500",
  expedicao: "bg-indigo-500",
};

export const ETAPA_STATUS = [
  "pendente",
  "em_andamento",
  "concluida",
  "atrasada",
  "bloqueada",
] as const;
export type EtapaStatus = (typeof ETAPA_STATUS)[number];
export const ETAPA_STATUS_LABEL: Record<EtapaStatus, string> = {
  pendente: "Pendente",
  em_andamento: "Em andamento",
  concluida: "Concluída",
  atrasada: "Atrasada",
  bloqueada: "Bloqueada",
};
export const ETAPA_STATUS_COLOR: Record<EtapaStatus, string> = {
  pendente:
    "border-[var(--badge-neutral-border)] bg-[var(--badge-neutral-bg)] text-[var(--badge-neutral-fg)]",
  em_andamento: "border-blue-200 bg-blue-50 text-blue-700",
  concluida: "border-emerald-200 bg-emerald-50 text-emerald-700",
  atrasada: "border-rose-200 bg-rose-50 text-rose-700",
  bloqueada: "border-amber-200 bg-amber-50 text-amber-700",
};

export const PROJETO_DISCIPLINAS = ["mecanico", "eletrico"] as const;
export type ProjetoDisciplina = (typeof PROJETO_DISCIPLINAS)[number];
export const PROJETO_DISCIPLINA_LABEL: Record<ProjetoDisciplina, string> = {
  mecanico: "Mecânico",
  eletrico: "Elétrico",
};

export const PROJETO_STATUS = [
  "em_elaboracao",
  "em_aprovacao",
  "liberado_producao",
  "obsoleto",
] as const;
export type ProjetoStatus = (typeof PROJETO_STATUS)[number];
export const PROJETO_STATUS_LABEL: Record<ProjetoStatus, string> = {
  em_elaboracao: "Em elaboração",
  em_aprovacao: "Em aprovação",
  liberado_producao: "Liberado p/ produção",
  obsoleto: "Obsoleto",
};
export const PROJETO_STATUS_COLOR: Record<ProjetoStatus, string> = {
  em_elaboracao:
    "border-[var(--badge-neutral-border)] bg-[var(--badge-neutral-bg)] text-[var(--badge-neutral-fg)]",
  em_aprovacao: "border-amber-200 bg-amber-50 text-amber-700",
  liberado_producao: "border-emerald-200 bg-emerald-50 text-emerald-700",
  obsoleto:
    "border-[var(--badge-neutral-border)] bg-[var(--badge-neutral-bg)] text-[var(--text-muted)]",
};

/* ============ PRODUÇÃO & QUALIDADE ============ */

export const MONTAGEM_STATUS = ["nao_iniciada", "em_andamento", "concluida", "bloqueada"] as const;
export type MontagemStatus = (typeof MONTAGEM_STATUS)[number];
export const MONTAGEM_STATUS_LABEL: Record<MontagemStatus, string> = {
  nao_iniciada: "Não iniciada",
  em_andamento: "Em andamento",
  concluida: "Concluída",
  bloqueada: "Bloqueada",
};
export const MONTAGEM_STATUS_COLOR: Record<MontagemStatus, string> = {
  nao_iniciada:
    "border-[var(--badge-neutral-border)] bg-[var(--badge-neutral-bg)] text-[var(--badge-neutral-fg)]",
  em_andamento: "border-blue-200 bg-blue-50 text-blue-700",
  concluida: "border-emerald-200 bg-emerald-50 text-emerald-700",
  bloqueada: "border-rose-200 bg-rose-50 text-rose-700",
};

export const REVISAO_DISCIPLINAS = ["mecanica", "eletrica"] as const;
export type RevisaoDisciplina = (typeof REVISAO_DISCIPLINAS)[number];
export const REVISAO_DISCIPLINA_LABEL: Record<RevisaoDisciplina, string> = {
  mecanica: "Mecânica",
  eletrica: "Elétrica",
};

export const REVISAO_STATUS = [
  "pendente",
  "em_andamento",
  "aprovada",
  "aprovada_com_ressalvas",
  "reprovada",
] as const;
export type RevisaoStatus = (typeof REVISAO_STATUS)[number];
export const REVISAO_STATUS_LABEL: Record<RevisaoStatus, string> = {
  pendente: "Pendente",
  em_andamento: "Em andamento",
  aprovada: "Aprovada",
  aprovada_com_ressalvas: "Aprovada c/ ressalvas",
  reprovada: "Reprovada",
};
export const REVISAO_STATUS_COLOR: Record<RevisaoStatus, string> = {
  pendente:
    "border-[var(--badge-neutral-border)] bg-[var(--badge-neutral-bg)] text-[var(--badge-neutral-fg)]",
  em_andamento: "border-blue-200 bg-blue-50 text-blue-700",
  aprovada: "border-emerald-200 bg-emerald-50 text-emerald-700",
  aprovada_com_ressalvas: "border-amber-200 bg-amber-50 text-amber-700",
  reprovada: "border-rose-200 bg-rose-50 text-rose-700",
};
