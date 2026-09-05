/**
 * Converte um código ISO-3166-1 alpha-2 (ex.: "BR") em emoji de bandeira ("🇧🇷").
 * Funciona via Regional Indicator Symbols — suportado em todos os SOs modernos.
 * Retorna string vazia se o código for inválido.
 */
export function flagEmoji(iso2: string | null | undefined): string {
  if (!iso2 || iso2.length !== 2) return "";
  const code = iso2.toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) return "";
  const A = 0x41;
  const RI = 0x1f1e6;
  return String.fromCodePoint(RI + (code.charCodeAt(0) - A), RI + (code.charCodeAt(1) - A));
}
