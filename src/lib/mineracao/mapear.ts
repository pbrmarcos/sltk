/**
 * Mapeamento das colunas devolvidas pelo provedor de comércio exterior.
 *
 * A resposta traz `columns` com `positionInRow` — que é a posição real do valor
 * dentro de `rows[].values` e nem sempre coincide com o índice do array de
 * colunas. Ler pelo índice do array fazia campos saírem vazios (contraparte)
 * ou trocados. Números também chegam como texto formatado ("1.234,56"),
 * que `Number()` converte para NaN — daí o "US$ 0" em todas as linhas.
 */

export type PentaColuna = {
  name: string;
  title?: string;
  type?: string;
  positionInRow?: number;
};

/** Resolve o nome real de uma coluna na base, aceitando sinônimos do provedor. */
export function pickColumn(
  disponiveis: string[],
  candidatos: string[],
  preferido?: string,
): string | null {
  if (preferido && disponiveis.includes(preferido)) return preferido;
  for (const c of candidatos) {
    const achado = disponiveis.find((d) => d.toLowerCase() === c.toLowerCase());
    if (achado) return achado;
  }
  for (const c of candidatos) {
    const achado = disponiveis.find((d) => d.toLowerCase().includes(c.toLowerCase()));
    if (achado) return achado;
  }
  return null;
}

export const COL_EMPRESA = [
  "operadorLocal",
  "importador",
  "importadorNombre",
  "comprador",
  "empresaLocal",
  "razonSocial",
  "empresa",
];
export const COL_CONTRA = [
  "operadorExtranjero",
  "operadorExterior",
  "exportador",
  "exportadorNombre",
  "proveedor",
  "provedor",
  "fornecedor",
  "vendedor",
  "shipper",
  "supplier",
  "contraparte",
];
export const COL_VALOR = [
  "valorFOB",
  "valorFob",
  "fob",
  "valorCIF",
  "valorCif",
  "valorUSD",
  "valorDolar",
  "valor",
  "montoFOB",
  "monto",
  "importe",
  "amount",
];
export const COL_PERIODO = ["periodo", "fecha", "data", "date", "mes"];
export const COL_RUBRO = ["rubro", "ncm", "posicion", "tariffCode", "sac", "hs"];

/**
 * Índice da coluna dentro de `values`. Usa `positionInRow` quando o provedor
 * informa (é a fonte de verdade) e cai para o índice do array caso contrário.
 */
export function indexOfColumn(cols: PentaColuna[], name: string | null): number {
  if (!name) return -1;
  const i = cols.findIndex((c) => c.name === name);
  if (i < 0) return -1;
  const pos = cols[i]?.positionInRow;
  return typeof pos === "number" && pos >= 0 ? pos : i;
}

/**
 * Converte para número aceitando os formatos que o provedor usa:
 * 1234.56 · "1.234,56" · "1,234.56" · "US$ 1 234,56".
 */
export function parseNumero(valor: unknown): number {
  if (typeof valor === "number") return Number.isFinite(valor) ? valor : 0;
  if (valor == null) return 0;
  let s = String(valor).trim();
  if (!s) return 0;
  s = s.replace(/[^\d,.\-]/g, "");
  if (!s || s === "-") return 0;
  const ultimaVirgula = s.lastIndexOf(",");
  const ultimoPonto = s.lastIndexOf(".");
  if (ultimaVirgula >= 0 && ultimoPonto >= 0) {
    // O separador decimal é o que aparece por último.
    if (ultimaVirgula > ultimoPonto) s = s.replace(/\./g, "").replace(",", ".");
    else s = s.replace(/,/g, "");
  } else if (ultimaVirgula >= 0) {
    const decimais = s.length - ultimaVirgula - 1;
    s = decimais > 0 && decimais <= 2 ? s.replace(",", ".") : s.replace(/,/g, "");
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

/** Texto limpo de uma célula (nunca "null"/"undefined"). */
export function parseTexto(valor: unknown): string {
  if (valor == null) return "";
  const s = String(valor).trim();
  return s === "null" || s === "undefined" ? "" : s;
}
