import { describe, expect, it } from "vitest";
import {
  descreverAcao,
  descreverDispositivo,
  ehAcaoRegistravel,
  moduloDoArquivo,
} from "./acesso-log.shared";

describe("logs de acesso", () => {
  it("ignora leituras e registra gravações", () => {
    expect(ehAcaoRegistravel("listFornecedores")).toBe(false);
    expect(ehAcaoRegistravel("getCliente")).toBe(false);
    expect(ehAcaoRegistravel("createOportunidade")).toBe(true);
    expect(ehAcaoRegistravel("deleteCliente")).toBe(true);
    expect(ehAcaoRegistravel("upsertFornecedor")).toBe(true);
  });

  it("descreve a ação em português", () => {
    expect(descreverAcao("createOportunidade")).toBe("Criou · oportunidade");
    expect(descreverAcao("deleteCliente")).toBe("Removeu · cliente");
    expect(descreverAcao("archiveFornecedor")).toBe("Arquivou · fornecedor");
    expect(descreverAcao("scanSuspectFoto")).toBe("Leu por foto · suspect foto");
  });

  it("extrai o módulo do arquivo", () => {
    expect(moduloDoArquivo("src/lib/oportunidades.functions.ts")).toBe("oportunidades");
    expect(moduloDoArquivo("src\\lib\\projeto-insumos.functions.ts")).toBe("projeto insumos");
  });

  it("resume o dispositivo", () => {
    expect(
      descreverDispositivo(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36",
      ),
    ).toBe("Chrome · Windows");
    expect(
      descreverDispositivo(
        "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/604.1",
      ),
    ).toBe("Safari · iPad");
  });
});
