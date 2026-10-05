import { beforeEach, describe, expect, it } from "vitest";
import { rateLimit, RateLimitError, __resetRateLimit } from "./rate-limit.server";
import { clientIpFromHeaders } from "./request-meta.server";
import { toMoedaISO } from "./moedas";

describe("rateLimit", () => {
  beforeEach(() => __resetRateLimit());

  it("permite até o máximo e bloqueia o excedente", () => {
    const t = 1_000_000;
    for (let i = 0; i < 3; i++) rateLimit("k", 3, 60_000, undefined, t + i);
    expect(() => rateLimit("k", 3, 60_000, undefined, t + 10)).toThrow(RateLimitError);
  });

  it("libera depois que a janela passa", () => {
    const t = 2_000_000;
    for (let i = 0; i < 3; i++) rateLimit("k", 3, 60_000, undefined, t);
    expect(() => rateLimit("k", 3, 60_000, undefined, t + 60_001)).not.toThrow();
  });

  it("isola chaves diferentes", () => {
    const t = 3_000_000;
    for (let i = 0; i < 2; i++) rateLimit("a", 2, 60_000, undefined, t);
    expect(() => rateLimit("b", 2, 60_000, undefined, t)).not.toThrow();
  });

  it("informa retryAfter coerente", () => {
    const t = 4_000_000;
    rateLimit("r", 1, 30_000, undefined, t);
    try {
      rateLimit("r", 1, 30_000, undefined, t + 10_000);
      throw new Error("deveria ter bloqueado");
    } catch (e) {
      expect(e).toBeInstanceOf(RateLimitError);
      expect((e as RateLimitError).retryAfterSec).toBe(20);
    }
  });
});

describe("clientIpFromHeaders", () => {
  it("prefere x-real-ip", () => {
    const h = new Headers({ "x-real-ip": "9.9.9.9", "x-forwarded-for": "1.1.1.1, 9.9.9.9" });
    expect(clientIpFromHeaders(h)).toBe("9.9.9.9");
  });

  it("usa o ÚLTIMO hop do x-forwarded-for (o primeiro é falsificável)", () => {
    const h = new Headers({ "x-forwarded-for": "6.6.6.6, 8.8.8.8" });
    expect(clientIpFromHeaders(h)).toBe("8.8.8.8");
  });

  it("devolve null sem headers", () => {
    expect(clientIpFromHeaders(new Headers())).toBeNull();
  });
});

describe("toMoedaISO com fallback USD", () => {
  it("mantém moedas suportadas", () => {
    expect(toMoedaISO("BRL", "USD")).toBe("BRL");
    expect(toMoedaISO("pyg", "USD")).toBe("PYG");
  });

  it("converte moeda local não suportada para USD", () => {
    for (const m of ["ARS", "CLP", "MXN", "PEN", "COP"]) {
      expect(toMoedaISO(m, "USD")).toBe("USD");
    }
  });
});
