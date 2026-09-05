import { describe, expect, it } from "vitest";
import { exigeValidacaoWizard, patchParaStatusOc } from "./ordens-compra.shared";

describe("exigeValidacaoWizard", () => {
  it("exige validação ao sair de rascunho para qualquer status, exceto cancelada", () => {
    expect(exigeValidacaoWizard("rascunho", "aguardando_aprovacao")).toBe(true);
    expect(exigeValidacaoWizard("rascunho", "aprovada")).toBe(true);
  });

  it("não exige validação ao cancelar direto do rascunho", () => {
    expect(exigeValidacaoWizard("rascunho", "cancelada")).toBe(false);
  });

  it("não exige validação ao permanecer em rascunho", () => {
    expect(exigeValidacaoWizard("rascunho", "rascunho")).toBe(false);
  });

  it("não exige validação para transições que não partem de rascunho", () => {
    expect(exigeValidacaoWizard("aguardando_aprovacao", "aprovada")).toBe(false);
    expect(exigeValidacaoWizard("aprovada", "enviada")).toBe(false);
  });
});

describe("patchParaStatusOc", () => {
  const now = "2026-01-01T00:00:00.000Z";
  const uid = "user-123";

  it("marca aprovado_em e aprovado_por ao aprovar", () => {
    expect(patchParaStatusOc("aprovada", uid, now)).toEqual({
      status: "aprovada",
      aprovado_em: now,
      aprovado_por: uid,
    });
  });

  it("marca enviado_em ao enviar", () => {
    expect(patchParaStatusOc("enviada", uid, now)).toEqual({
      status: "enviada",
      enviado_em: now,
    });
  });

  it("não adiciona campos extras para outros status", () => {
    expect(patchParaStatusOc("rascunho", uid, now)).toEqual({ status: "rascunho" });
    expect(patchParaStatusOc("cancelada", uid, now)).toEqual({ status: "cancelada" });
    expect(patchParaStatusOc("recebida", uid, now)).toEqual({ status: "recebida" });
  });
});
