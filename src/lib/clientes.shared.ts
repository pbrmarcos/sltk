import { z } from "zod";

/**
 * Status do cliente — fonte de verdade única (coluna `clientes.status`).
 * Mutuamente exclusivo: nunca exibir dois na mesma linha/tela.
 */
export const CLIENTE_STATUS = ["ativo", "suspect", "prospect", "inativo"] as const;
export type ClienteStatus = (typeof CLIENTE_STATUS)[number];

export const CLIENTE_STATUS_COLOR: Record<ClienteStatus, string> = {
  ativo: "bg-emerald-50 text-emerald-700 border-emerald-200",
  suspect:
    "bg-[var(--badge-neutral-bg)] text-[var(--badge-neutral-fg)] border-[var(--badge-neutral-border)]",
  prospect: "bg-amber-50 text-amber-700 border-amber-200",
  inativo: "bg-stone-100 text-stone-600 border-stone-200",
};

/** Rótulo traduzido (pt-BR / es) via i18next. */
export function clienteStatusLabelKey(status: ClienteStatus) {
  return `cliente.status.${status}` as const;
}

/**
 * Coluna legada `lifecycle_stage` — espelho do status, mantida por
 * compatibilidade de relatórios. Nunca exibir junto do status.
 */
export const CLIENTE_LIFECYCLE = ["suspect", "prospect", "cliente", "inativo"] as const;
export type ClienteLifecycle = (typeof CLIENTE_LIFECYCLE)[number];

/** Converte o valor legado de lifecycle para o status canônico. */
export function statusFromLifecycle(lc: ClienteLifecycle | null | undefined): ClienteStatus {
  if (lc === "cliente") return "ativo";
  if (lc === "inativo") return "inativo";
  if (lc === "suspect") return "suspect";
  return "prospect";
}

export const CLIENTE_LIFECYCLE_LABEL: Record<ClienteLifecycle, string> = {
  suspect: "Suspect",
  prospect: "Prospect",
  cliente: "Cliente Ativo",
  inativo: "Inativo",
};

export const CLIENTE_LIFECYCLE_COLOR: Record<ClienteLifecycle, string> = {
  suspect: "bg-[var(--badge-neutral-bg)] text-[var(--badge-neutral-fg)]",
  prospect: "bg-blue-100 text-blue-700",
  cliente: "bg-emerald-100 text-emerald-700",
  inativo: "bg-[var(--badge-neutral-bg)] text-[var(--badge-neutral-fg)]",
};

/** Idiomas suportados */
export const CLIENTE_IDIOMAS = ["pt", "es", "en"] as const;
export type ClienteIdioma = (typeof CLIENTE_IDIOMAS)[number];

/**
 * Normaliza um documento fiscal: maiúsculas e remove tudo que não seja
 * letras, dígitos, Ñ ou & (RFC mexicano contém Ñ e &).
 */
export function normalizeDocumento(raw: string): string {
  return (raw ?? "")
    .toUpperCase()
    .normalize("NFKC")
    .replace(/[^A-Z0-9Ñ&]/g, "");
}

/**
 * Aplica máscara (com placeholders X / A) ao valor já normalizado.
 * - X / # / 9 / 0 aceitam qualquer caractere alfanumérico (placeholder de dígito ou char)
 * - A aceita apenas letras
 * Qualquer outro caractere é literal (ponto, traço, barra...).
 */
export function formatDocumento(raw: string, mascara: string | null | undefined): string {
  const value = normalizeDocumento(raw);
  if (!mascara || mascara === "livre") return value;
  let i = 0;
  let out = "";
  for (const ch of mascara) {
    if (i >= value.length) break;
    if (ch === "X" || ch === "A" || ch === "#" || ch === "9" || ch === "0") {
      out += value[i];
      i++;
    } else {
      out += ch;
    }
  }
  return out + value.slice(i);
}

/** Valida o documento (já normalizado) contra a regex do país */
export function validateDocumento(raw: string, regex: string): boolean {
  try {
    return new RegExp(regex).test(normalizeDocumento(raw));
  } catch {
    return false;
  }
}

/* ============ Rótulos internacionais (uma única coluna no banco) ============ */

/**
 * Rótulo da coluna `razao_social` conforme o país selecionado.
 * O dado continua sempre em `clientes.razao_social`; só o texto muda.
 */
export function razaoSocialLabel(pais?: string | null): string {
  const p = (pais ?? "BR").toUpperCase();
  if (p === "BR") return "Razão social";
  if (p === "US") return "Legal name";
  if (p === "CN") return "Legal name (法定名称)";
  return "Razón social"; // demais países da América Latina (es)
}

/** Rótulo de `nome_fantasia` conforme o país. */
export function nomeFantasiaLabel(pais?: string | null): string {
  const p = (pais ?? "BR").toUpperCase();
  if (p === "BR") return "Nome fantasia";
  if (p === "US" || p === "CN") return "Trade name";
  return "Nombre comercial";
}

/* ============ Schemas Zod compartilhados ============ */

export const contatoInputSchema = z.object({
  id: z.string().uuid().optional(),
  nome: z.string().trim().min(1).max(120),
  cargo: z.string().trim().max(120).optional().nullable(),
  email: z
    .string()
    .trim()
    .max(255)
    .email()
    .optional()
    .or(z.literal("").transform(() => undefined)),
  telefone_ddi: z.string().trim().max(6).optional().nullable(),
  telefone_numero: z.string().trim().max(40).optional().nullable(),
  principal: z.boolean().default(false),
});

export type ContatoInput = z.infer<typeof contatoInputSchema>;

export const socioInputSchema = z.object({
  id: z.string().uuid().optional(),
  nome: z.string().trim().min(1).max(180),
  qualificacao: z.string().trim().max(120).optional().nullable(),
  desde: z.string().trim().max(20).optional().nullable(),
});
export type SocioInput = z.infer<typeof socioInputSchema>;

export const REGIMES_TRIBUTARIOS = ["mei", "simples", "lucro_presumido", "lucro_real"] as const;
export const MATRIZ_FILIAL = ["matriz", "filial"] as const;

export const clienteInputSchema = z.object({
  razao_social: z.string().trim().min(1).max(255),
  nome_fantasia: z.string().trim().max(255).optional().nullable(),
  apelido: z.string().trim().max(120).optional().nullable(),
  pais: z.string().length(2),
  documento_fiscal_numero: z.string().min(1).max(40),
  inscricao_estadual: z.string().trim().max(40).optional().nullable(),
  moeda: z.string().length(3),
  idioma: z.enum(CLIENTE_IDIOMAS),
  status: z.enum(CLIENTE_STATUS).default("prospect"),
  segmento_id: z.string().uuid().optional().nullable(),
  lead_origem_id: z.string().uuid().optional().nullable(),
  key_account: z.boolean().default(false),
  observacoes: z.string().trim().max(2000).optional().nullable(),
  site: z.string().trim().max(255).optional().nullable(),
  email_corporativo: z
    .string()
    .trim()
    .max(255)
    .email()
    .optional()
    .nullable()
    .or(z.literal("").transform(() => null)),
  telefone_corporativo_ddi: z.string().trim().max(6).optional().nullable(),
  telefone_corporativo_numero: z.string().trim().max(40).optional().nullable(),
  ramal: z.string().trim().max(20).optional().nullable(),
  matriz_filial: z
    .enum(MATRIZ_FILIAL)
    .optional()
    .nullable()
    .or(z.literal("").transform(() => null)),
  endereco_logradouro: z.string().trim().max(255).optional().nullable(),
  endereco_numero: z.string().trim().max(40).optional().nullable(),
  endereco_complemento: z.string().trim().max(120).optional().nullable(),
  endereco_bairro: z.string().trim().max(120).optional().nullable(),
  endereco_cidade: z.string().trim().max(120).optional().nullable(),
  endereco_estado: z.string().trim().max(120).optional().nullable(),
  endereco_codigo_postal: z.string().trim().max(20).optional().nullable(),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
  // Fiscal BR (opcional)
  regime_tributario: z
    .enum(REGIMES_TRIBUTARIOS)
    .optional()
    .nullable()
    .or(z.literal("").transform(() => null)),
  cnae_principal: z.string().trim().max(255).optional().nullable(),
  cnaes_secundarios: z.array(z.string().trim().max(255)).optional().nullable(),
  natureza_juridica_codigo: z.string().trim().max(20).optional().nullable(),
  natureza_juridica_descricao: z.string().trim().max(255).optional().nullable(),
  situacao_cadastral: z.string().trim().max(60).optional().nullable(),
  data_situacao: z.string().trim().max(20).optional().nullable(),
  motivo_situacao: z.string().trim().max(255).optional().nullable(),
  data_abertura: z.string().trim().max(20).optional().nullable(),
  capital_social: z.number().nonnegative().optional().nullable(),
  porte: z.string().trim().max(60).optional().nullable(),
  // Redes sociais (opcional)
  social_linkedin: z.string().trim().max(255).optional().nullable(),
  social_instagram: z.string().trim().max(255).optional().nullable(),
  social_facebook: z.string().trim().max(255).optional().nullable(),
  social_twitter: z.string().trim().max(255).optional().nullable(),
  social_whatsapp: z.string().trim().max(60).optional().nullable(),
  social_skype: z.string().trim().max(120).optional().nullable(),
  // Sócios e contatos
  socios: z.array(socioInputSchema).max(50).optional().default([]),
  contatos: z.array(contatoInputSchema).min(1).max(20),
});

export type ClienteInput = z.infer<typeof clienteInputSchema>;

/** Erro de domínio que o servidor sinaliza para o formulário */
export type ClienteErrorCode =
  | "documento_invalido"
  | "documento_duplicado"
  | "pais_inexistente"
  | "forbidden";

export class ClienteError extends Error {
  code: ClienteErrorCode;
  field?: string;
  constructor(code: ClienteErrorCode, message: string, field?: string) {
    super(message);
    this.code = code;
    this.field = field;
  }
}
