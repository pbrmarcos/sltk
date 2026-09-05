export const INSUMO_CRITICIDADE = ["baixa", "media", "alta", "critica"] as const;
export type InsumoCriticidade = (typeof INSUMO_CRITICIDADE)[number];
export const INSUMO_CRITICIDADE_LABEL: Record<InsumoCriticidade, string> = {
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
  critica: "Crítica",
};
export const INSUMO_CRITICIDADE_COLOR: Record<InsumoCriticidade, string> = {
  baixa: "border-[var(--badge-neutral-border)] bg-[var(--badge-neutral-bg)] text-[var(--badge-neutral-fg)]",
  media: "border-blue-200 bg-blue-50 text-blue-700",
  alta: "border-amber-200 bg-amber-50 text-amber-700",
  critica: "border-rose-200 bg-rose-50 text-rose-700",
};

export const INSUMO_STATUS = [
  "rascunho",
  "aprovado",
  "em_cotacao",
  "pronto_aprovacao",
  "cotado",
  "em_compra",
  "recebido",
  "cancelado",
] as const;
export type InsumoStatus = (typeof INSUMO_STATUS)[number];
export const INSUMO_STATUS_LABEL: Record<InsumoStatus, string> = {
  rascunho: "Rascunho",
  aprovado: "Aprovado",
  em_cotacao: "Em cotação",
  pronto_aprovacao: "Pronto p/ aprovação",
  cotado: "Cotado",
  em_compra: "Em compra",
  recebido: "Recebido",
  cancelado: "Cancelado",
};
export const INSUMO_STATUS_COLOR: Record<InsumoStatus, string> = {
  rascunho: "border-[var(--badge-neutral-border)] bg-[var(--badge-neutral-bg)] text-[var(--badge-neutral-fg)]",
  aprovado: "border-emerald-200 bg-emerald-50 text-emerald-700",
  em_cotacao: "border-amber-200 bg-amber-50 text-amber-700",
  pronto_aprovacao: "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700",
  cotado: "border-blue-200 bg-blue-50 text-blue-700",
  em_compra: "border-violet-200 bg-violet-50 text-violet-700",
  recebido: "border-emerald-200 bg-emerald-50 text-emerald-700",
  cancelado: "border-[var(--badge-neutral-border)] bg-[var(--badge-neutral-bg)] text-[var(--text-muted)]",
};

export const INSUMO_DISCIPLINAS = [
  "mecanico",
  "eletrico",
  "automacao",
  "montagem",
  "outro",
] as const;
export type InsumoDisciplina = (typeof INSUMO_DISCIPLINAS)[number];
export const INSUMO_DISCIPLINA_LABEL: Record<InsumoDisciplina, string> = {
  mecanico: "Mecânica",
  eletrico: "Elétrica",
  automacao: "Automação",
  montagem: "Montagem",
  outro: "Outro",
};

export const INSUMO_UNIDADES = ["UN", "PC", "M", "M2", "M3", "KG", "L", "PAR", "CJ", "CX"] as const;
