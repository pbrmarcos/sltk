import type { Idioma, Moeda } from "./types";
import { formatMoeda } from "@/lib/moedas";

const LOCALE: Record<Idioma, string> = {
  pt: "pt-BR",
  es: "es-ES",
  en: "en-US",
};

export function formatMoney(value: number, moeda: Moeda, idioma: Idioma): string {
  // Intl com o código ISO do registro: casas decimais corretas por moeda
  // (PYG não usa centavos) e símbolo no padrão do idioma do documento.
  return formatMoeda(value, moeda, LOCALE[idioma]);
}

export function formatNumber(value: number, idioma: Idioma, fractionDigits = 0): string {
  return new Intl.NumberFormat(LOCALE[idioma], {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value || 0);
}

export function formatDate(date: Date | string, idioma: Idioma): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat(LOCALE[idioma], {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

export function bumpVersion(current: string, kind: "major" | "minor" | "patch" = "minor"): string {
  const parts = current.split(".").map((p) => parseInt(p, 10) || 0);
  while (parts.length < 3) parts.push(0);
  if (kind === "major") {
    parts[0] += 1;
    parts[1] = 0;
    parts[2] = 0;
  } else if (kind === "minor") {
    parts[1] += 1;
    parts[2] = 0;
  } else {
    parts[2] += 1;
  }
  return parts.join(".");
}
