import { describe, it, expect } from "vitest";
import {
  itensPrincipais,
  itensOpcionais,
  calcularSubtotal,
  calcularTotalOpcionais,
  calcularValorItem,
} from "./orcamento-calc";
import type { EquipamentoOrcamento } from "./types";

function eq(partial: Partial<EquipamentoOrcamento> = {}): EquipamentoOrcamento {
  return {
    nome_pt: "Equipamento",
    nome_es: "Equipo",
    nome_en: "Equipment",
    descricao_pt: "",
    descricao_es: "",
    descricao_en: "",
    quantidade: 1,
    valor_unitario: 0,
    opcional: false,
    ...partial,
  };
}

describe("cálculo de valores do orçamento", () => {
  it("subtotal soma quantidade × valor unitário dos itens não opcionais", () => {
    const equipamentos = [
      eq({ quantidade: 2, valor_unitario: 1000 }),
      eq({ quantidade: 1, valor_unitario: 5000 }),
    ];
    expect(calcularSubtotal(equipamentos)).toBe(7000);
  });

  it("itens opcionais não entram no subtotal principal", () => {
    const equipamentos = [
      eq({ quantidade: 1, valor_unitario: 10000, opcional: false }),
      eq({ quantidade: 3, valor_unitario: 500, opcional: true }),
    ];
    expect(calcularSubtotal(equipamentos)).toBe(10000);
    expect(calcularTotalOpcionais(equipamentos)).toBe(1500);
  });

  it("lista vazia dá subtotal zero, sem lançar erro", () => {
    expect(calcularSubtotal([])).toBe(0);
    expect(calcularTotalOpcionais([])).toBe(0);
  });

  it("orçamento só com opcionais tem subtotal principal zero", () => {
    const equipamentos = [eq({ quantidade: 2, valor_unitario: 999, opcional: true })];
    expect(calcularSubtotal(equipamentos)).toBe(0);
    expect(calcularTotalOpcionais(equipamentos)).toBe(1998);
  });

  it("itensPrincipais/itensOpcionais particionam sem perder nem duplicar itens", () => {
    const equipamentos = [
      eq({ id: "a", opcional: false }),
      eq({ id: "b", opcional: true }),
      eq({ id: "c", opcional: false }),
    ];
    expect(itensPrincipais(equipamentos).map((e) => e.id)).toEqual(["a", "c"]);
    expect(itensOpcionais(equipamentos).map((e) => e.id)).toEqual(["b"]);
  });

  it("calcularValorItem multiplica quantidade pelo valor unitário de um item isolado", () => {
    expect(calcularValorItem({ quantidade: 4, valor_unitario: 250.5 })).toBe(1002);
  });

  it("quantidade fracionária é respeitada (ex.: metro linear, litro)", () => {
    expect(calcularSubtotal([eq({ quantidade: 2.5, valor_unitario: 100 })])).toBe(250);
  });
});
