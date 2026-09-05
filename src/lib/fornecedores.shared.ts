import { z } from "zod";

export const FORNECEDOR_RANKINGS = ["A", "B", "C"] as const;
export const FORNECEDOR_STATUS = ["ativo", "em_avaliacao", "inativo", "bloqueado"] as const;

export type FornecedorRanking = (typeof FORNECEDOR_RANKINGS)[number];
export type FornecedorStatus = (typeof FORNECEDOR_STATUS)[number];

export const FORNECEDOR_STATUS_LABEL: Record<FornecedorStatus, string> = {
  ativo: "Ativo",
  em_avaliacao: "Em avaliação",
  inativo: "Inativo",
  bloqueado: "Bloqueado",
};

export const FORNECEDOR_STATUS_COLOR: Record<FornecedorStatus, string> = {
  ativo: "bg-emerald-50 text-emerald-700 border-emerald-200",
  em_avaliacao: "bg-amber-50 text-amber-700 border-amber-200",
  inativo: "bg-stone-100 text-stone-600 border-stone-200",
  bloqueado: "bg-rose-50 text-rose-700 border-rose-200",
};

export const FORNECEDOR_RANKING_COLOR: Record<FornecedorRanking, string> = {
  A: "bg-emerald-600 text-white",
  B: "bg-amber-500 text-white",
  C: "bg-stone-400 text-white",
};

export const INCOTERMS = [
  "EXW",
  "FCA",
  "FOB",
  "CFR",
  "CIF",
  "CPT",
  "CIP",
  "DAP",
  "DPU",
  "DDP",
] as const;

export const MOEDAS = ["USD", "CNY", "EUR", "BRL", "GBP", "JPY"] as const;

export const TAX_ID_TIPOS = ["CNPJ", "EIN", "USCC", "VAT", "RUC", "RUT", "RFC", "OTHER"] as const;

export const CERTIFICACOES_SUGERIDAS = [
  "ISO 9001",
  "ISO 14001",
  "ISO 45001",
  "ISO 22000",
  "CE",
  "UL",
  "RoHS",
  "REACH",
  "FDA",
  "FCC",
  "GMP",
  "HACCP",
  "BRC",
  "SGS",
  "TUV",
  "ATEX",
  "IECEx",
  "CSA",
] as const;

const emptyToNull = (v: unknown) => (v === "" || v === undefined ? null : v);

export const fornecedorInputSchema = z.object({
  nome: z.string().min(2, "Nome obrigatório").max(200),
  nome_fantasia: z.string().max(200).optional().nullable(),
  pais: z.string().min(2).max(3).default("CN"),
  cidade: z.string().max(120).optional().nullable(),
  endereco: z.string().max(500).optional().nullable(),
  site: z.string().max(300).optional().nullable(),
  email_corporativo: z.string().email("E-mail inválido").optional().nullable().or(z.literal("")),
  telefone_ddi: z.string().max(6).optional().nullable(),
  telefone_numero: z.string().max(40).optional().nullable(),
  idioma: z.string().max(8).optional().nullable(),
  ranking: z.enum(FORNECEDOR_RANKINGS).default("B"),
  status: z.enum(FORNECEDOR_STATUS).default("em_avaliacao"),
  observacoes: z.string().max(4000).optional().nullable(),
  tags: z.array(z.string().max(60)).default([]),
  palavras_chave: z.array(z.string().max(80)).default([]),
  categorias: z.array(z.string().max(80)).default([]),

  // ===== Identidade legal =====
  tax_id: z.string().max(60).optional().nullable(),
  tax_id_tipo: z.string().max(20).optional().nullable(),
  incorporation_year: z.preprocess(
    emptyToNull,
    z.number().int().min(1800).max(2100).optional().nullable(),
  ),
  legal_name_local: z.string().max(200).optional().nullable(),

  // ===== Comercial =====
  moeda_padrao: z.string().max(8).optional().nullable(),
  incoterm_padrao: z.string().max(8).optional().nullable(),
  porto_origem: z.string().max(120).optional().nullable(),
  lead_time_dias: z.preprocess(
    emptyToNull,
    z.number().int().min(0).max(1000).optional().nullable(),
  ),
  moq: z.preprocess(emptyToNull, z.number().int().min(0).max(10_000_000).optional().nullable()),
  payment_terms: z.string().max(120).optional().nullable(),
  condicao_pagamento_dias: z.preprocess(
    emptyToNull,
    z.number().int().min(0).max(720).optional().nullable(),
  ),

  // ===== Capacidade & qualidade =====
  funcionarios_faixa: z.string().max(60).optional().nullable(),
  fabrica_area_m2: z.preprocess(
    emptyToNull,
    z.number().int().min(0).max(10_000_000).optional().nullable(),
  ),
  capacidade_mensal: z.string().max(120).optional().nullable(),
  certificacoes: z.array(z.string().max(60)).default([]),
  auditado_em: z.string().max(20).optional().nullable(),
  auditor: z.string().max(120).optional().nullable(),
  score_qualidade: z.preprocess(emptyToNull, z.number().min(0).max(100).optional().nullable()),
  score_entrega: z.preprocess(emptyToNull, z.number().min(0).max(100).optional().nullable()),
  score_preco: z.preprocess(emptyToNull, z.number().min(0).max(100).optional().nullable()),

  // ===== Contato corporativo extra =====
  whatsapp_corp: z.string().max(40).optional().nullable(),
  wechat_corp: z.string().max(80).optional().nullable(),
  linkedin_url: z.string().max(300).optional().nullable(),
  alibaba_url: z.string().max(300).optional().nullable(),
  made_in_china_url: z.string().max(300).optional().nullable(),

  // ===== Logística =====
  endereco_cep: z.string().max(20).optional().nullable(),
  endereco_estado_provincia: z.string().max(120).optional().nullable(),
  fuso_horario: z.string().max(40).optional().nullable(),

  // ===== Operacional =====
  responsavel_interno_user_id: z.string().uuid().optional().nullable().or(z.literal("")),
  proxima_revisao_em: z.string().max(20).optional().nullable(),
  motivo_bloqueio: z.string().max(500).optional().nullable(),

  // ===== Dados legais BR / cadastrais genéricos =====
  inscricao_estadual: z.string().max(40).optional().nullable(),
  inscricao_municipal: z.string().max(40).optional().nullable(),
  regime_tributario: z.string().max(40).optional().nullable(),
  situacao_cadastral: z.string().max(40).optional().nullable(),
  data_abertura: z.string().max(20).optional().nullable(),
  capital_social: z.preprocess(emptyToNull, z.number().min(0).max(1e15).optional().nullable()),
  natureza_juridica: z.string().max(200).optional().nullable(),
  cnae_principal: z.string().max(200).optional().nullable(),
  cnaes_secundarios: z.array(z.string().max(200)).default([]),
});

// Helpers de país
export function isCN(pais: string | null | undefined): boolean {
  return (pais ?? "").toUpperCase() === "CN";
}
export function isBR(pais: string | null | undefined): boolean {
  return (pais ?? "").toUpperCase() === "BR";
}

export const REGIMES_TRIBUTARIOS_BR = [
  { value: "mei", label: "MEI" },
  { value: "simples", label: "Simples Nacional" },
  { value: "lucro_presumido", label: "Lucro Presumido" },
  { value: "lucro_real", label: "Lucro Real" },
] as const;

export type FornecedorInput = z.infer<typeof fornecedorInputSchema>;

export const contatoInputSchema = z.object({
  nome: z.string().min(2, "Nome obrigatório").max(160),
  cargo: z.string().max(120).optional().nullable(),
  email: z.string().email("E-mail inválido").optional().nullable().or(z.literal("")),
  telefone_ddi: z.string().max(6).optional().nullable(),
  telefone_numero: z.string().max(40).optional().nullable(),
  whatsapp: z.string().max(40).optional().nullable(),
  wechat: z.string().max(80).optional().nullable(),
  principal: z.boolean().default(false),
});

export type ContatoFornecedorInput = z.infer<typeof contatoInputSchema>;
