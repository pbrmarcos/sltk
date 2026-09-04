// Catálogo único de moedas (ISO 4217) usado em orçamentos, clientes e PDFs.
// O banco SEMPRE guarda o código ISO — nunca o rótulo traduzido.

export type MoedaISO = "USD" | "EUR" | "BRL" | "PYG";

export type MoedaInfo = {
  codigo: MoedaISO;
  nome: string;
  simbolo: string;
  /** Casas decimais oficiais (PYG não usa centavos). */
  decimais: number;
};

export const MOEDAS: MoedaInfo[] = [
  { codigo: "USD", nome: "Dólar americano", simbolo: "$", decimais: 2 },
  { codigo: "EUR", nome: "Euro", simbolo: "€", decimais: 2 },
  { codigo: "BRL", nome: "Real brasileiro", simbolo: "R$", decimais: 2 },
  { codigo: "PYG", nome: "Guarani paraguaio", simbolo: "₲", decimais: 0 },
];

export const MOEDA_PADRAO: MoedaISO = "BRL";

const BY_CODE = new Map(MOEDAS.map((m) => [m.codigo, m]));

export function isMoedaISO(v: unknown): v is MoedaISO {
  return typeof v === "string" && BY_CODE.has(v.toUpperCase() as MoedaISO);
}

/** Normaliza qualquer entrada para um código ISO suportado. */
export function toMoedaISO(v: unknown, fallback: MoedaISO = MOEDA_PADRAO): MoedaISO {
  if (typeof v !== "string") return fallback;
  const up = v.trim().toUpperCase();
  return BY_CODE.has(up as MoedaISO) ? (up as MoedaISO) : fallback;
}

export function moedaInfo(codigo: MoedaISO): MoedaInfo {
  return BY_CODE.get(codigo) ?? BY_CODE.get(MOEDA_PADRAO)!;
}

/** Rótulo do Select: "USD — Dólar americano ($)". */
export function moedaLabel(codigo: MoedaISO): string {
  const m = moedaInfo(codigo);
  return `${m.codigo} — ${m.nome} (${m.simbolo})`;
}

/**
 * Formatação monetária oficial via Intl, respeitando as casas decimais
 * da moeda (PYG sem centavos).
 */
export function formatMoeda(value: number, moeda: MoedaISO | string, locale = "pt-BR"): string {
  const iso = toMoedaISO(moeda);
  const info = moedaInfo(iso);
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: iso,
    minimumFractionDigits: info.decimais,
    maximumFractionDigits: info.decimais,
  }).format(Number.isFinite(value) ? value : 0);
}
