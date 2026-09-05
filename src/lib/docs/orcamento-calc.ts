// Cálculo de totais de orçamento — antes reimplementado de forma independente
// em 4 lugares (OrcamentoWizard.tsx, pdf-document.tsx x3), com risco real de
// uma mudança de regra (ex.: o que conta como "opcional") ficar inconsistente
// entre a tela e o PDF gerado.
import type { EquipamentoOrcamento } from "./types";

/** Itens que entram no valor principal do orçamento (exclui opcionais). */
export function itensPrincipais(equipamentos: EquipamentoOrcamento[]): EquipamentoOrcamento[] {
  return equipamentos.filter((e) => !e.opcional);
}

/** Itens opcionais/alternativos, cotados à parte do valor principal. */
export function itensOpcionais(equipamentos: EquipamentoOrcamento[]): EquipamentoOrcamento[] {
  return equipamentos.filter((e) => e.opcional);
}

function somaValores(itens: EquipamentoOrcamento[]): number {
  return itens.reduce((acc, e) => acc + e.quantidade * e.valor_unitario, 0);
}

/** Subtotal dos itens principais (o que vira o total do orçamento). */
export function calcularSubtotal(equipamentos: EquipamentoOrcamento[]): number {
  return somaValores(itensPrincipais(equipamentos));
}

/** Total à parte dos itens opcionais (não soma no valor principal). */
export function calcularTotalOpcionais(equipamentos: EquipamentoOrcamento[]): number {
  return somaValores(itensOpcionais(equipamentos));
}

/** Valor de linha de um único item (quantidade × valor unitário). */
export function calcularValorItem(
  item: Pick<EquipamentoOrcamento, "quantidade" | "valor_unitario">,
): number {
  return item.quantidade * item.valor_unitario;
}
