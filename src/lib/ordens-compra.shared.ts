export const OC_STATUS = [
  "rascunho",
  "aguardando_aprovacao",
  "aprovada",
  "enviada",
  "recebida_parcial",
  "recebida",
  "cancelada",
] as const;
export type OcStatus = (typeof OC_STATUS)[number];

export const OC_STATUS_LABEL: Record<OcStatus, string> = {
  rascunho: "Rascunho",
  aguardando_aprovacao: "Aguardando aprovação",
  aprovada: "Aprovada",
  enviada: "Enviada",
  recebida_parcial: "Recebida parcial",
  recebida: "Recebida",
  cancelada: "Cancelada",
};

export const OC_STATUS_COLOR: Record<OcStatus, string> = {
  rascunho: "border-zinc-200 bg-zinc-50 text-zinc-700",
  aguardando_aprovacao: "border-amber-200 bg-amber-50 text-amber-800",
  aprovada: "border-blue-200 bg-blue-50 text-blue-700",
  enviada: "border-indigo-200 bg-indigo-50 text-indigo-700",
  recebida_parcial: "border-purple-200 bg-purple-50 text-purple-700",
  recebida: "border-emerald-200 bg-emerald-50 text-emerald-700",
  cancelada: "border-rose-200 bg-rose-50 text-rose-700",
};

export const OC_TIPO_LABEL: Record<string, string> = {
  normal: "Normal",
  terceiros: "Terceiros (pass-through)",
};

/**
 * Campos obrigatórios para emitir uma OC válida (passar de rascunho para
 * aguardando_aprovacao). Usado pelo wizard de dados faltantes.
 */
export type OcWizardField = {
  key: string;
  label: string;
  group: "comprador" | "fornecedor" | "comercial" | "itens";
};

/**
 * Sair de "rascunho" (exceto pra "cancelada") exige que o wizard de dados
 * obrigatórios (OC_REQUIRED_FIELDS) esteja completo.
 */
export function exigeValidacaoWizard(statusAtual: OcStatus, statusNovo: OcStatus): boolean {
  return statusAtual === "rascunho" && statusNovo !== "rascunho" && statusNovo !== "cancelada";
}

/** Campos extras a gravar na OC conforme o novo status. */
export function patchParaStatusOc(
  status: OcStatus,
  uid: string,
  nowISO: string,
): Record<string, unknown> {
  const patch: Record<string, unknown> = { status };
  if (status === "aprovada") {
    patch.aprovado_em = nowISO;
    patch.aprovado_por = uid;
  }
  if (status === "enviada") patch.enviado_em = nowISO;
  return patch;
}

export const OC_REQUIRED_FIELDS: OcWizardField[] = [
  { key: "comprador_razao_social", label: "Razão social do comprador", group: "comprador" },
  { key: "comprador_cnpj", label: "CNPJ do comprador", group: "comprador" },
  { key: "comprador_endereco", label: "Endereço do comprador", group: "comprador" },
  { key: "comprador_cidade", label: "Cidade do comprador", group: "comprador" },
  { key: "comprador_uf", label: "UF do comprador", group: "comprador" },
  { key: "fornecedor_razao_social", label: "Razão social do fornecedor", group: "fornecedor" },
  { key: "fornecedor_cnpj", label: "CNPJ/Tax ID do fornecedor", group: "fornecedor" },
  { key: "fornecedor_endereco", label: "Endereço do fornecedor", group: "fornecedor" },
  { key: "fornecedor_email", label: "E-mail do fornecedor", group: "fornecedor" },
  { key: "condicao_pagamento", label: "Condição de pagamento", group: "comercial" },
  { key: "entrega_prevista", label: "Data de entrega prevista", group: "comercial" },
];
