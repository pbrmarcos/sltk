import { describe, expect, it } from "vitest";
import { lerTextoCsv, parseCSV } from "./csv";

describe("parseCSV", () => {
  it("detecta ponto e vírgula (Excel BR) e mantém aspas escapadas", () => {
    const r = parseCSV('razao_social;cidade\r\n"Indústria ""A""";São Paulo\r\n');
    expect(r.headers).toEqual(["razao_social", "cidade"]);
    expect(r.rows).toEqual([['Indústria "A"', "São Paulo"]]);
  });

  it("aceita quebra de linha dentro de campo entre aspas", () => {
    const r = parseCSV('nome,obs\n"Multi\nlinha Ltda",ok\nB,x\n');
    expect(r.rows).toEqual([
      ["Multi\nlinha Ltda", "ok"],
      ["B", "x"],
    ]);
  });

  it("ignora BOM e linhas vazias", () => {
    const r = parseCSV("﻿a,b\n\n1,2\n");
    expect(r.headers).toEqual(["a", "b"]);
    expect(r.rows).toEqual([["1", "2"]]);
  });
});

describe("lerTextoCsv", () => {
  it("relê como Windows-1252 quando o arquivo não é UTF-8", async () => {
    // "São" em Windows-1252: 0x53 0xE3 0x6F
    const f = new File([new Uint8Array([0x53, 0xe3, 0x6f])], "x.csv");
    expect(await lerTextoCsv(f)).toBe("São");
  });

  it("mantém UTF-8 quando válido", async () => {
    const f = new File([new TextEncoder().encode("Indústria")], "x.csv");
    expect(await lerTextoCsv(f)).toBe("Indústria");
  });
});
