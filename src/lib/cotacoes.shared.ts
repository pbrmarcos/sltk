export const COTACAO_STATUS = [
  "rascunho",
  "aberta",
  "respondida",
  "escolhida",
  "encerrada",
  "cancelada",
] as const;
export type CotacaoStatus = (typeof COTACAO_STATUS)[number];

export const COTACAO_STATUS_LABEL: Record<CotacaoStatus, string> = {
  rascunho: "Rascunho",
  aberta: "Aberta",
  respondida: "Respondida",
  escolhida: "Vencedor escolhido",
  encerrada: "Encerrada",
  cancelada: "Cancelada",
};

export const COTACAO_STATUS_COLOR: Record<CotacaoStatus, string> = {
  rascunho:
    "border-[var(--badge-neutral-border)] bg-[var(--badge-neutral-bg)] text-[var(--badge-neutral-fg)]",
  aberta: "border-blue-200 bg-blue-50 text-blue-700",
  respondida: "border-amber-200 bg-amber-50 text-amber-800",
  escolhida: "border-emerald-200 bg-emerald-50 text-emerald-700",
  encerrada: "border-[var(--bg-border)] bg-[var(--bg-elevated)] text-[var(--badge-neutral-fg)]",
  cancelada: "border-rose-200 bg-rose-50 text-rose-700",
};

export const INCOTERMS = ["EXW", "FCA", "FOB", "CIF", "CFR", "CIP", "DAP", "DDP"] as const;
export const MOEDAS = ["BRL", "USD", "EUR", "CNY"] as const;

export const CONVITE_STATUS_LABEL: Record<string, string> = {
  pendente: "Pendente",
  visualizado: "Visualizado",
  respondido: "Respondido",
  recusado: "Recusado",
};
