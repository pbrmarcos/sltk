/**
 * Cálculos puros do Almoxarifado.
 *
 * A fonte de verdade é o banco (movimentos imutáveis + triggers), mas estas
 * funções replicam exatamente as mesmas regras para uso na interface
 * (pré-visualização de custo, conversão de unidade, saldo disponível) e para
 * os testes unitários de saldo e custo médio.
 */

export type MovimentoTipo =
  | "entrada_oc"
  | "entrada_avulsa"
  | "saida_projeto"
  | "devolucao"
  | "transferencia"
  | "ajuste";

export interface MovimentoCalc {
  /** Quantidade sinalizada: positiva entra, negativa sai. */
  quantidade: number;
  /** Custo unitário do movimento (só relevante em entradas). */
  custoUnitario?: number | null;
  tipo?: MovimentoTipo;
}

/** Arredondamento monetário consistente com o banco (numeric(18,6)). */
export function arredondarCusto(valor: number): number {
  return Math.round(valor * 1e6) / 1e6;
}

/**
 * Custo médio ponderado após um movimento.
 *
 * - Entrada com custo: média ponderada entre o saldo atual e a entrada.
 * - Entrada sem custo informado: mantém a média vigente.
 * - Saída/devolução/ajuste negativo: não altera a média.
 * - Saldo anterior <= 0 numa entrada: a média passa a ser o custo da entrada.
 */
export function custoMedioApos(
  saldoAnterior: number,
  custoMedioAnterior: number,
  mov: MovimentoCalc,
): number {
  const qtd = mov.quantidade;
  if (qtd <= 0) return arredondarCusto(custoMedioAnterior);
  const custo = mov.custoUnitario ?? null;
  if (custo === null || custo === undefined) return arredondarCusto(custoMedioAnterior);
  if (saldoAnterior <= 0) return arredondarCusto(custo);
  const valorTotal = saldoAnterior * custoMedioAnterior + qtd * custo;
  return arredondarCusto(valorTotal / (saldoAnterior + qtd));
}

export interface ResumoMovimentos {
  saldo: number;
  custoMedio: number;
  valorImobilizado: number;
}

/** Aplica a sequência de movimentos na ordem (`seq` crescente). */
export function resumirMovimentos(movs: MovimentoCalc[]): ResumoMovimentos {
  let saldo = 0;
  let custoMedio = 0;
  for (const m of movs) {
    custoMedio = custoMedioApos(saldo, custoMedio, m);
    saldo += m.quantidade;
  }
  return {
    saldo,
    custoMedio,
    valorImobilizado: arredondarCusto(Math.max(saldo, 0) * custoMedio),
  };
}

export interface ReservaCalc {
  projetoId: string;
  quantidade: number;
  quantidadeRetirada?: number;
  status: "ativa" | "atendida" | "cancelada" | "liberada_auto";
  expiraEm?: string | Date | null;
}

/** Reserva conta como bloqueio apenas se ativa e não vencida (liberação por leitura). */
export function reservaBloqueia(r: ReservaCalc, agora: Date = new Date()): boolean {
  if (r.status !== "ativa") return false;
  if (r.expiraEm) {
    const exp = r.expiraEm instanceof Date ? r.expiraEm : new Date(r.expiraEm);
    if (exp.getTime() <= agora.getTime()) return false;
  }
  return r.quantidade - (r.quantidadeRetirada ?? 0) > 0;
}

export function totalReservado(reservas: ReservaCalc[], agora: Date = new Date()): number {
  return reservas
    .filter((r) => reservaBloqueia(r, agora))
    .reduce((acc, r) => acc + (r.quantidade - (r.quantidadeRetirada ?? 0)), 0);
}

/**
 * Quanto um projeto pode retirar: total menos as reservas ativas de OUTROS
 * projetos. A reserva própria não bloqueia — ela é consumida na retirada.
 */
export function disponivelParaProjeto(
  saldoTotal: number,
  reservas: ReservaCalc[],
  projetoId: string | null,
  agora: Date = new Date(),
): number {
  const bloqueadoPorTerceiros = reservas
    .filter((r) => reservaBloqueia(r, agora) && r.projetoId !== projetoId)
    .reduce((acc, r) => acc + (r.quantidade - (r.quantidadeRetirada ?? 0)), 0);
  return saldoTotal - bloqueadoPorTerceiros;
}

/** Saldo livre (nenhum projeto): total menos todas as reservas vigentes. */
export function saldoLivre(
  saldoTotal: number,
  reservas: ReservaCalc[],
  agora: Date = new Date(),
): number {
  return saldoTotal - totalReservado(reservas, agora);
}

/** Normaliza unidade de texto livre para comparação (sem acento, sem caixa, sem separadores). */
export function normalizarUnidade(u: string | null | undefined): string {
  return (u ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

export function unidadesEquivalentes(a?: string | null, b?: string | null): boolean {
  return normalizarUnidade(a) === normalizarUnidade(b) && normalizarUnidade(a) !== "";
}

/**
 * Converte da unidade de estoque para a unidade da linha de insumo.
 * `fator` = quantas unidades de estoque cabem em 1 unidade do insumo.
 */
export function converterParaUnidadeInsumo(
  qtdEstoque: number,
  fator: number | null | undefined,
): number {
  const f = fator && fator > 0 ? fator : 1;
  return qtdEstoque / f;
}

/** Converte da unidade de compra/insumo para a unidade de estoque. */
export function converterParaUnidadeEstoque(qtd: number, fator: number | null | undefined): number {
  const f = fator && fator > 0 ? fator : 1;
  return qtd * f;
}

/** Quanto ainda falta receber de uma linha de OC (nunca negativo). */
export function faltaReceber(pedido: number, recebido: number): number {
  return Math.max(pedido - recebido, 0);
}

export type StatusRecebimento = "pendente" | "recebida_parcial" | "recebida";

/** Status derivado da OC a partir do total pedido e recebido (estorno reverte). */
export function statusRecebimentoOc(
  itens: { pedido: number; recebido: number }[],
): StatusRecebimento {
  const recebidoTotal = itens.reduce((a, i) => a + i.recebido, 0);
  if (recebidoTotal <= 0) return "pendente";
  const completo = itens.every((i) => i.recebido >= i.pedido);
  return completo ? "recebida" : "recebida_parcial";
}
