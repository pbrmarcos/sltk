import { describe, expect, it } from "vitest";
import { BLOCO_SCHEMAS, defaultBlocoConteudo, type BlocoTipo } from "./equipamento-pagina.shared";

const TIPOS: BlocoTipo[] = [
  "hero",
  "descricao",
  "especificacoes",
  "beneficios",
  "casos_uso",
  "galeria",
  "faq",
  "video",
  "cta_orcamento",
];

describe("BLOCO_SCHEMAS aceita os defaults de cada tipo", () => {
  for (const tipo of TIPOS) {
    it(`${tipo}: defaultBlocoConteudo passa no schema`, () => {
      const conteudo = defaultBlocoConteudo(tipo);
      const result = BLOCO_SCHEMAS[tipo].safeParse(conteudo);
      expect(result.success).toBe(true);
    });
  }
});

describe("BLOCO_SCHEMAS rejeita conteúdo com campo obrigatório faltando ou tipo errado", () => {
  it("hero: sem titulo_pt falha", () => {
    const conteudo = { ...defaultBlocoConteudo("hero") };
    delete (conteudo as Record<string, unknown>).titulo_pt;
    expect(BLOCO_SCHEMAS.hero.safeParse(conteudo).success).toBe(false);
  });

  it("descricao: bullets_pt como string (não array) falha", () => {
    const conteudo = { ...defaultBlocoConteudo("descricao"), bullets_pt: "não é uma lista" };
    expect(BLOCO_SCHEMAS.descricao.safeParse(conteudo).success).toBe(false);
  });

  it("especificacoes: item sem valor_pt falha", () => {
    const conteudo = {
      ...defaultBlocoConteudo("especificacoes"),
      itens: [{ label_pt: "Cadência" }],
    };
    expect(BLOCO_SCHEMAS.especificacoes.safeParse(conteudo).success).toBe(false);
  });

  it("beneficios: icone fora da lista permitida falha", () => {
    const conteudo = {
      ...defaultBlocoConteudo("beneficios"),
      itens: [{ icone: "IconeInventado", titulo_pt: "X", texto_pt: "Y" }],
    };
    expect(BLOCO_SCHEMAS.beneficios.safeParse(conteudo).success).toBe(false);
  });

  it("casos_uso: item sem texto_pt falha", () => {
    const conteudo = {
      ...defaultBlocoConteudo("casos_uso"),
      itens: [{ titulo_pt: "Farmacêutico" }],
    };
    expect(BLOCO_SCHEMAS.casos_uso.safeParse(conteudo).success).toBe(false);
  });

  it("galeria: imagem sem url falha", () => {
    const conteudo = { ...defaultBlocoConteudo("galeria"), imagens: [{ alt_pt: "sem url" }] };
    expect(BLOCO_SCHEMAS.galeria.safeParse(conteudo).success).toBe(false);
  });

  it("faq: item sem resposta_pt falha", () => {
    const conteudo = {
      ...defaultBlocoConteudo("faq"),
      itens: [{ pergunta_pt: "Pergunta?" }],
    };
    expect(BLOCO_SCHEMAS.faq.safeParse(conteudo).success).toBe(false);
  });

  it("video: url ausente ainda passa (campo opcional, bloco só não renderiza)", () => {
    const conteudo = { ...defaultBlocoConteudo("video") };
    expect(BLOCO_SCHEMAS.video.safeParse(conteudo).success).toBe(true);
  });

  it("cta_orcamento: sem titulo_pt falha", () => {
    const conteudo = { ...defaultBlocoConteudo("cta_orcamento") };
    delete (conteudo as Record<string, unknown>).titulo_pt;
    expect(BLOCO_SCHEMAS.cta_orcamento.safeParse(conteudo).success).toBe(false);
  });
});
