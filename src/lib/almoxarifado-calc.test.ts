import { describe, it, expect } from "vitest";
import {
  custoMedioApos,
  resumirMovimentos,
  totalReservado,
  disponivelParaProjeto,
  saldoLivre,
  reservaBloqueia,
  normalizarUnidade,
  unidadesEquivalentes,
  converterParaUnidadeInsumo,
  converterParaUnidadeEstoque,
  faltaReceber,
  statusRecebimentoOc,
} from "./almoxarifado-calc";

describe("custo médio ponderado", () => {
  it("primeira entrada define a média", () => {
    expect(custoMedioApos(0, 0, { quantidade: 10, custoUnitario: 5 })).toBe(5);
  });

  it("segunda entrada pondera pelas quantidades", () => {
    // 10 @ 5 + 10 @ 15 => 10
    expect(custoMedioApos(10, 5, { quantidade: 10, custoUnitario: 15 })).toBe(10);
  });

  it("saída não altera a média", () => {
    expect(custoMedioApos(20, 10, { quantidade: -5 })).toBe(10);
  });

  it("entrada sem custo informado mantém a média vigente", () => {
    expect(custoMedioApos(20, 10, { quantidade: 5, custoUnitario: null })).toBe(10);
  });

  it("entrada com saldo zerado reinicia a média pelo custo da entrada", () => {
    expect(custoMedioApos(0, 10, { quantidade: 4, custoUnitario: 25 })).toBe(25);
  });

  it("sequência completa: entrada, entrada, saída, devolução", () => {
    const r = resumirMovimentos([
      { quantidade: 100, custoUnitario: 2, tipo: "entrada_oc" },
      { quantidade: 100, custoUnitario: 4, tipo: "entrada_oc" },
      { quantidade: -50, tipo: "saida_projeto" },
      { quantidade: 50, custoUnitario: 3, tipo: "devolucao" },
    ]);
    expect(r.saldo).toBe(200);
    // devolução volta pelo custo de saída (3 = média vigente) => média continua 3
    expect(r.custoMedio).toBe(3);
    expect(r.valorImobilizado).toBe(600);
  });

  it("estorno de entrada (quantidade negativa) reduz saldo sem mexer na média", () => {
    const r = resumirMovimentos([
      { quantidade: 10, custoUnitario: 8, tipo: "entrada_oc" },
      { quantidade: -10, tipo: "entrada_oc" },
    ]);
    expect(r.saldo).toBe(0);
    expect(r.custoMedio).toBe(8);
  });
});

describe("saldo, reservas e disponível", () => {
  const futuro = new Date(Date.now() + 86_400_000).toISOString();
  const passado = new Date(Date.now() - 86_400_000).toISOString();

  it("reserva ativa e vigente bloqueia", () => {
    expect(reservaBloqueia({ projetoId: "p1", quantidade: 5, status: "ativa", expiraEm: futuro })).toBe(true);
  });

  it("reserva vencida deixa de bloquear por leitura, sem job", () => {
    expect(reservaBloqueia({ projetoId: "p1", quantidade: 5, status: "ativa", expiraEm: passado })).toBe(false);
  });

  it("reserva cancelada ou atendida não bloqueia", () => {
    expect(reservaBloqueia({ projetoId: "p1", quantidade: 5, status: "cancelada" })).toBe(false);
    expect(reservaBloqueia({ projetoId: "p1", quantidade: 5, status: "atendida" })).toBe(false);
  });

  it("reserva já totalmente retirada não bloqueia mais", () => {
    expect(
      reservaBloqueia({ projetoId: "p1", quantidade: 5, quantidadeRetirada: 5, status: "ativa" }),
    ).toBe(false);
  });

  it("total reservado soma apenas o que ainda bloqueia", () => {
    const reservas = [
      { projetoId: "p1", quantidade: 10, status: "ativa" as const },
      { projetoId: "p2", quantidade: 5, quantidadeRetirada: 2, status: "ativa" as const },
      { projetoId: "p3", quantidade: 7, status: "cancelada" as const },
      { projetoId: "p4", quantidade: 4, status: "ativa" as const, expiraEm: passado },
    ];
    expect(totalReservado(reservas)).toBe(13);
    expect(saldoLivre(30, reservas)).toBe(17);
  });

  it("projeto com reserva própria enxerga a própria reserva como disponível", () => {
    const reservas = [
      { projetoId: "p1", quantidade: 10, status: "ativa" as const },
      { projetoId: "p2", quantidade: 5, status: "ativa" as const },
    ];
    expect(disponivelParaProjeto(30, reservas, "p1")).toBe(25);
    expect(disponivelParaProjeto(30, reservas, "p2")).toBe(20);
    expect(disponivelParaProjeto(30, reservas, null)).toBe(15);
  });

  it("retirada nunca consome empenho de terceiros", () => {
    const reservas = [{ projetoId: "outro", quantidade: 8, status: "ativa" as const }];
    expect(disponivelParaProjeto(10, reservas, "meu")).toBe(2);
  });
});

describe("unidades e conversão", () => {
  it("normaliza texto livre", () => {
    expect(normalizarUnidade("Pç")).toBe("pc");
    expect(normalizarUnidade(" UN. ")).toBe("un");
  });

  it("compara unidades sem acento e sem caixa", () => {
    expect(unidadesEquivalentes("PC", "pç")).toBe(true);
    expect(unidadesEquivalentes("UN", "M")).toBe(false);
    expect(unidadesEquivalentes("", "")).toBe(false);
  });

  it("converte caixa com 50 peças nos dois sentidos", () => {
    expect(converterParaUnidadeInsumo(500, 50)).toBe(10); // 500 peças = 10 caixas
    expect(converterParaUnidadeEstoque(10, 50)).toBe(500);
  });

  it("fator ausente ou inválido equivale a 1", () => {
    expect(converterParaUnidadeInsumo(7, null)).toBe(7);
    expect(converterParaUnidadeEstoque(7, 0)).toBe(7);
  });
});

describe("recebimento de OC", () => {
  it("falta receber nunca é negativo", () => {
    expect(faltaReceber(10, 4)).toBe(6);
    expect(faltaReceber(10, 12)).toBe(0);
  });

  it("status derivado do recebido", () => {
    expect(statusRecebimentoOc([{ pedido: 10, recebido: 0 }])).toBe("pendente");
    expect(statusRecebimentoOc([{ pedido: 10, recebido: 4 }])).toBe("recebida_parcial");
    expect(
      statusRecebimentoOc([
        { pedido: 10, recebido: 10 },
        { pedido: 5, recebido: 5 },
      ]),
    ).toBe("recebida");
  });

  it("estorno volta de recebida para parcial", () => {
    const antes = statusRecebimentoOc([{ pedido: 10, recebido: 10 }]);
    const depois = statusRecebimentoOc([{ pedido: 10, recebido: 6 }]);
    expect(antes).toBe("recebida");
    expect(depois).toBe("recebida_parcial");
  });
});
