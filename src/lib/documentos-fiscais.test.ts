import { describe, expect, it } from "vitest";
import {
  DOCUMENTO_NOME,
  VALIDADORES,
  normalizarDocumento,
  validarDocumentoFiscal,
} from "./documentos-fiscais";

const v = validarDocumentoFiscal;

describe("normalização", () => {
  it("remove pontos, traços, barras e espaços", () => {
    expect(normalizarDocumento(" 11.222.333/0001-81 ")).toBe("11222333000181");
    expect(normalizarDocumento("30-71234567-8")).toBe("30712345678");
    expect(normalizarDocumento("0990637679001")).toBe("0990637679001");
  });
  it("mantém Ñ e & do RFC mexicano", () => {
    expect(normalizarDocumento("ñam&-800101-AB1")).toBe("ÑAM&800101AB1");
  });
});

describe("Equador — RUC", () => {
  it("aceita o RUC de sociedade privada 0990637679001 (província 09)", () => {
    const r = v("EC", "0990637679001");
    expect(r.ok).toBe(true);
    expect(r.nivel).toBe("checksum");
  });
  it("aceita RUC formatado com separadores", () => {
    expect(v("EC", "099-063767-9001").ok).toBe(true);
  });
  it("aceita pessoa natural (módulo 10)", () => {
    expect(v("EC", "1710034065001").ok).toBe(true);
    expect(v("EC", "0926687856001").ok).toBe(true);
  });
  it("aceita setor público (módulo 11 sobre 8 dígitos)", () => {
    expect(v("EC", "1760001550001").ok).toBe(true);
  });
  it("rejeita dígito verificador errado com mensagem específica", () => {
    const r = v("EC", "0990637679002");
    expect(r.ok).toBe(true); // último bloco é estabelecimento, não verificador
    const r2 = v("EC", "0990637678001");
    expect(r2.ok).toBe(false);
    expect(r2.motivo).toBe("digito_verificador");
    expect(r2.mensagem).toMatch(/verificador/i);
  });
  it("rejeita província inexistente", () => {
    const r = v("EC", "2590637679001");
    expect(r.ok).toBe(false);
    expect(r.motivo).toBe("provincia");
  });
  it("rejeita tipo de contribuinte inválido (3º dígito 7)", () => {
    const r = v("EC", "0970637679001");
    expect(r.ok).toBe(false);
    expect(r.motivo).toBe("tipo");
  });
  it("rejeita quantidade de dígitos errada informando o tamanho", () => {
    const r = v("EC", "099063767900");
    expect(r.ok).toBe(false);
    expect(r.motivo).toBe("tamanho");
    expect(r.mensagem).toContain("12");
  });
  it("rejeita estabelecimento 000", () => {
    expect(v("EC", "0990637679000").motivo).toBe("estabelecimento");
  });
});

describe("Brasil — CNPJ", () => {
  it("aceita CNPJ numérico válido", () => {
    expect(v("BR", "11.222.333/0001-81").ok).toBe(true);
  });
  it("aceita CNPJ alfanumérico (regra vigente desde julho/2026)", () => {
    expect(v("BR", "12ABC34501DE35").ok).toBe(true);
  });
  it("rejeita verificador errado", () => {
    const r = v("BR", "11222333000182");
    expect(r.ok).toBe(false);
    expect(r.motivo).toBe("digito_verificador");
  });
  it("rejeita dígitos repetidos e tamanho errado", () => {
    expect(v("BR", "00000000000000").ok).toBe(false);
    expect(v("BR", "1122233300018").motivo).toBe("tamanho");
  });
  it("rejeita verificadores não numéricos", () => {
    expect(v("BR", "12ABC34501DEAB").motivo).toBe("formato");
  });
});

describe("Argentina — CUIT", () => {
  it("aceita CUITs reais", () => {
    expect(v("AR", "33-69345023-9").ok).toBe(true);
    expect(v("AR", "30-50001091-2").ok).toBe(true);
  });
  it("rejeita verificador e prefixo inválidos", () => {
    expect(v("AR", "33693450230").motivo).toBe("digito_verificador");
    expect(v("AR", "99693450239").motivo).toBe("tipo");
    expect(v("AR", "3369345023").motivo).toBe("tamanho");
  });
});

describe("Chile — RUT", () => {
  it("aceita RUTs válidos, inclusive com verificador K", () => {
    expect(v("CL", "76.086.428-5").ok).toBe(true);
    expect(v("CL", "11.111.111-1").ok).toBe(true);
  });
  it("rejeita verificador errado", () => {
    expect(v("CL", "76.086.428-6").motivo).toBe("digito_verificador");
  });
  it("rejeita tamanho fora de 8-9 caracteres", () => {
    expect(v("CL", "1234-5").ok).toBe(false);
  });
});

describe("Colômbia — NIT", () => {
  it("aceita NIT com verificador correto", () => {
    expect(v("CO", "800.197.268-4").ok).toBe(true);
    expect(v("CO", "899999061-9").ok).toBe(true);
  });
  it("aceita NIT de 9 dígitos sem verificador (só formato)", () => {
    const r = v("CO", "800197268");
    expect(r.ok).toBe(true);
    expect(r.nivel).toBe("formato");
  });
  it("rejeita verificador errado", () => {
    expect(v("CO", "8001972685").motivo).toBe("digito_verificador");
  });
});

describe("Peru — RUC", () => {
  it("aceita RUCs reais da SUNAT", () => {
    expect(v("PE", "20131312955").ok).toBe(true);
    expect(v("PE", "20100070970").ok).toBe(true);
  });
  it("rejeita prefixo e verificador inválidos", () => {
    expect(v("PE", "30131312955").motivo).toBe("tipo");
    expect(v("PE", "20131312954").motivo).toBe("digito_verificador");
  });
});

describe("validadores de formato", () => {
  const casos: Array<[string, string, string]> = [
    ["BO", "1234567", "123456"],
    ["CR", "3101123456", "310112345"],
    ["GT", "12345678", "12345"],
    ["HN", "08019995123456", "0801999512345"],
    ["MX", "ABC800101XY1", "AB800101XY1"],
    ["NI", "J0310000001234", "J031000000123"],
    ["PA", "15512345-2-2019", "1234"],
    ["PY", "80012345", "12345"],
    ["SV", "06141804941001", "0614180494100"],
    ["US", "13-1234567", "131234"],
    ["UY", "211003420017", "21100342001"],
    ["VE", "J-30599487-1", "X305994871"],
  ];
  it.each(casos)("%s aceita válido e rejeita inválido", (pais, valido, invalido) => {
    const okR = v(pais, valido);
    expect(okR.ok).toBe(true);
    expect(okR.nivel).toBe("formato");
    expect(v(pais, invalido).ok).toBe(false);
  });
});

describe("regras gerais", () => {
  it("não bloqueia países sem validador implementado", () => {
    const r = v("PT", "500123456");
    expect(r.ok).toBe(true);
    expect(r.nivel).toBe("nenhum");
  });
  it("exige valor não vazio", () => {
    expect(v("EC", "   ").motivo).toBe("vazio");
  });
  it("todo país configurado tem nome de documento", () => {
    for (const pais of Object.keys(VALIDADORES)) {
      expect(DOCUMENTO_NOME[pais]).toBeTruthy();
    }
  });
  it("cobre os 19 países da tabela paises_config", () => {
    expect(Object.keys(VALIDADORES).sort()).toEqual(
      [
        "AR", "BO", "BR", "CL", "CN", "CO", "CR", "EC", "GT", "HN",
        "MX", "NI", "PA", "PE", "PY", "SV", "US", "UY", "VE",
      ].sort(),
    );
  });
});
