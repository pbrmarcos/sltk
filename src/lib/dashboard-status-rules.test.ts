import { describe, expect, it } from "vitest";
import {
  isEtapaAtrasada,
  isEtapaConcluida,
  isEtpAberto,
  isRevisaoPendente,
} from "./dashboard-status-rules";

describe("isEtpAberto", () => {
  it("considera rascunho e em_revisao como abertos", () => {
    expect(isEtpAberto("rascunho")).toBe(true);
    expect(isEtpAberto("em_revisao")).toBe(true);
  });

  it("não considera aprovado/rejeitado como abertos", () => {
    expect(isEtpAberto("aprovado")).toBe(false);
    expect(isEtpAberto("rejeitado")).toBe(false);
  });
});

describe("isEtapaConcluida", () => {
  it("só a forma feminina 'concluida' conta — 'concluido' nunca existiu no enum real", () => {
    expect(isEtapaConcluida("concluida")).toBe(true);
    expect(isEtapaConcluida("concluido")).toBe(false);
  });

  it("pendente e em_andamento não são concluídas", () => {
    expect(isEtapaConcluida("pendente")).toBe(false);
    expect(isEtapaConcluida("em_andamento")).toBe(false);
  });
});

describe("isRevisaoPendente", () => {
  it("pendente e em_andamento contam como pendentes", () => {
    expect(isRevisaoPendente("pendente")).toBe(true);
    expect(isRevisaoPendente("em_andamento")).toBe(true);
  });

  it("estados terminais (aprovada, aprovada_com_ressalvas, reprovada) não contam como pendentes", () => {
    expect(isRevisaoPendente("aprovada")).toBe(false);
    expect(isRevisaoPendente("aprovada_com_ressalvas")).toBe(false);
    expect(isRevisaoPendente("reprovada")).toBe(false);
  });
});

describe("isEtapaAtrasada", () => {
  const now = new Date("2026-06-15T00:00:00.000Z").getTime();

  it("atrasada quando não concluída e vencimento no passado", () => {
    expect(isEtapaAtrasada("em_andamento", "2026-06-01T00:00:00.000Z", now)).toBe(true);
  });

  it("não atrasada quando concluída, mesmo com vencimento no passado", () => {
    expect(isEtapaAtrasada("concluida", "2026-06-01T00:00:00.000Z", now)).toBe(false);
  });

  it("não atrasada quando sem data de vencimento", () => {
    expect(isEtapaAtrasada("em_andamento", null, now)).toBe(false);
    expect(isEtapaAtrasada("em_andamento", undefined, now)).toBe(false);
  });

  it("não atrasada quando vencimento no futuro", () => {
    expect(isEtapaAtrasada("em_andamento", "2026-07-01T00:00:00.000Z", now)).toBe(false);
  });
});
