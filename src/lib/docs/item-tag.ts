/**
 * Gera uma TAG curta e estável por item de compra (insumo).
 * Formato: SC-YYYY-XXXXXX
 *  - "SC"   → Solicitação de Compra
 *  - "YYYY" → ano de criação do insumo (ou ano corrente se ausente)
 *  - "XXXXXX" → 6 primeiros caracteres hex (upper) do UUID
 * Determinístico: o mesmo insumo sempre gera a mesma TAG.
 */
export function itemTag(insumoId: string, criadoEm?: string | Date | null): string {
  const year = (() => {
    if (!criadoEm) return new Date().getFullYear();
    const d = criadoEm instanceof Date ? criadoEm : new Date(criadoEm);
    return Number.isFinite(d.getTime()) ? d.getFullYear() : new Date().getFullYear();
  })();
  const hex = (insumoId || "").replace(/-/g, "").slice(0, 6).toUpperCase() || "000000";
  return `SC-${year}-${hex}`;
}
