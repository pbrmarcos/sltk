/**
 * CSV com aspas (inclusive campos com quebra de linha dentro de aspas),
 * separador "," ou ";" detectado pela primeira linha (Excel BR usa ";").
 */
export function parseCSV(text: string): { headers: string[]; rows: string[][] } {
  const t = text.replace(/^\uFEFF/, "");
  const primeira = t.split(/\r?\n/, 1)[0] ?? "";
  const sep = (primeira.match(/;/g)?.length ?? 0) > (primeira.match(/,/g)?.length ?? 0) ? ";" : ",";
  const linhas: string[][] = [];
  let campo = "";
  let linha: string[] = [];
  let inQ = false;
  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    if (inQ) {
      if (ch === '"' && t[i + 1] === '"') {
        campo += '"';
        i++;
      } else if (ch === '"') inQ = false;
      else campo += ch;
      continue;
    }
    if (ch === '"') inQ = true;
    else if (ch === sep) {
      linha.push(campo.trim());
      campo = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && t[i + 1] === "\n") i++;
      linha.push(campo.trim());
      if (linha.some((c) => c.length > 0)) linhas.push(linha);
      linha = [];
      campo = "";
    } else campo += ch;
  }
  linha.push(campo.trim());
  if (linha.some((c) => c.length > 0)) linhas.push(linha);
  if (linhas.length === 0) return { headers: [], rows: [] };
  return { headers: linhas[0], rows: linhas.slice(1) };
}

/** L\u00EA como UTF-8; se aparecer o caractere de substitui\u00E7\u00E3o, rel\u00EA como Windows-1252 (Excel). */
export async function lerTextoCsv(f: File): Promise<string> {
  const buf = await f.arrayBuffer();
  const utf8 = new TextDecoder("utf-8").decode(buf);
  if (!utf8.includes("\uFFFD")) return utf8;
  return new TextDecoder("windows-1252").decode(buf);
}
