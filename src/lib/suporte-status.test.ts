import { describe, expect, it } from "vitest";
import { eventoDeEmail, patchParaStatusChamado } from "./suporte-status";

describe("patchParaStatusChamado", () => {
  const now = "2026-01-01T00:00:00.000Z";

  it("marca resolvido_em ao resolver", () => {
    expect(patchParaStatusChamado("resolvido", now)).toEqual({
      status: "resolvido",
      resolvido_em: now,
    });
  });

  it("marca reaberto_em e limpa resolvido_em ao reabrir", () => {
    expect(patchParaStatusChamado("reaberto", now)).toEqual({
      status: "reaberto",
      reaberto_em: now,
      resolvido_em: null,
    });
  });

  it("não adiciona campos extras para outros status", () => {
    expect(patchParaStatusChamado("aberto", now)).toEqual({ status: "aberto" });
    expect(patchParaStatusChamado("em_analise", now)).toEqual({ status: "em_analise" });
    expect(patchParaStatusChamado("aguardando_cliente", now)).toEqual({
      status: "aguardando_cliente",
    });
    expect(patchParaStatusChamado("arquivado", now)).toEqual({ status: "arquivado" });
  });
});

describe("eventoDeEmail", () => {
  it("dispara e-mail ao resolver e ao reabrir", () => {
    expect(eventoDeEmail("resolvido")).toBe("chamado.resolvido");
    expect(eventoDeEmail("reaberto")).toBe("chamado.reaberto");
  });

  it("não dispara e-mail para outras transições", () => {
    expect(eventoDeEmail("aberto")).toBeNull();
    expect(eventoDeEmail("em_analise")).toBeNull();
    expect(eventoDeEmail("aguardando_cliente")).toBeNull();
    expect(eventoDeEmail("arquivado")).toBeNull();
  });
});
