import { describe, expect, it } from "vitest";
import { exigeMotivo, patchParaStatusEmbarque, validarMotivo } from "./logistica-status";

describe("exigeMotivo", () => {
  it("exige motivo para status críticos", () => {
    expect(exigeMotivo("embarcado")).toBe(true);
    expect(exigeMotivo("entregue")).toBe(true);
    expect(exigeMotivo("cancelado")).toBe(true);
  });

  it("não exige motivo para status não críticos", () => {
    expect(exigeMotivo("programado")).toBe(false);
  });
});

describe("validarMotivo", () => {
  it("aceita sem notas quando o status não exige motivo", () => {
    expect(validarMotivo("programado", null)).toBeNull();
    expect(validarMotivo("programado", undefined)).toBeNull();
  });

  it("rejeita notas ausentes/curtas quando o status exige motivo", () => {
    expect(validarMotivo("cancelado", null)).toMatch(/obrigatório/i);
    expect(validarMotivo("cancelado", undefined)).toMatch(/obrigatório/i);
    expect(validarMotivo("cancelado", "ok")).toMatch(/mínimo 5 caracteres/);
  });

  it("aceita no limite de 5 caracteres (após trim)", () => {
    expect(validarMotivo("embarcado", "12345")).toBeNull();
    expect(validarMotivo("embarcado", "  12345  ")).toBeNull();
  });

  it("rejeita 4 caracteres após trim", () => {
    expect(validarMotivo("embarcado", "  1234  ")).toMatch(/mínimo 5 caracteres/);
  });
});

describe("patchParaStatusEmbarque", () => {
  const now = "2026-01-01T00:00:00.000Z";

  it("marca data_saida ao embarcar", () => {
    expect(patchParaStatusEmbarque("embarcado", now)).toEqual({
      status: "embarcado",
      data_saida: now,
    });
  });

  it("marca data_entrega ao entregar", () => {
    expect(patchParaStatusEmbarque("entregue", now)).toEqual({
      status: "entregue",
      data_entrega: now,
    });
  });

  it("não marca nenhuma data extra para outros status", () => {
    expect(patchParaStatusEmbarque("programado", now)).toEqual({ status: "programado" });
    expect(patchParaStatusEmbarque("cancelado", now)).toEqual({ status: "cancelado" });
  });
});
