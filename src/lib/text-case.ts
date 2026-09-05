/**
 * Title Case PT-BR para nomes de segmentos / origens de lead.
 * - Primeira palavra sempre capitalizada.
 * - Stopwords ficam minúsculas no meio da frase.
 * - Preserva separadores como "-", "/", "·" e quebras de palavra.
 */
const STOPWORDS = new Set([
  "de",
  "da",
  "do",
  "das",
  "dos",
  "e",
  "com",
  "a",
  "o",
  "os",
  "as",
  "em",
  "para",
  "por",
  "no",
  "na",
  "nos",
  "nas",
  "ao",
  "à",
  "às",
  "aos",
]);

function titleWord(w: string): string {
  if (!w) return w;
  // Mantém acrônimos curtos em maiúsculas (BR, RFC, CNAE)
  if (/^[A-ZÁÉÍÓÚÂÊÔÃÕÇ]{2,5}$/.test(w)) return w;
  return w.charAt(0).toLocaleUpperCase("pt-BR") + w.slice(1).toLocaleLowerCase("pt-BR");
}

export function titleCasePtBR(raw: string): string {
  if (!raw) return "";
  const trimmed = raw.trim().replace(/\s+/g, " ");
  if (!trimmed) return "";
  // Tokeniza por espaços, preservando blocos com hífen/barra
  const words = trimmed.split(" ");
  return words
    .map((w, idx) => {
      const lower = w.toLocaleLowerCase("pt-BR");
      if (idx > 0 && STOPWORDS.has(lower)) return lower;
      // Trata sub-tokens internos como "moinhos-do-sul"
      return w
        .split(/([\-/·])/)
        .map((part, i, arr) => {
          if (/^[\-/·]$/.test(part)) return part;
          const subLower = part.toLocaleLowerCase("pt-BR");
          // primeira sub-palavra do primeiro token sempre capitaliza
          if (idx === 0 && i === 0) return titleWord(part);
          if (STOPWORDS.has(subLower) && i > 0) return subLower;
          return titleWord(part);
        })
        .join("");
    })
    .join(" ");
}
