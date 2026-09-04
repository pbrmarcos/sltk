import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { CAPABILITIES, capabilityUnavailableMessage } from "./system-keys";

const SOURCE_ROOT = join(process.cwd(), "src");

// Nomes de variáveis de ambiente não podem aparecer em texto exibido ao usuário.
const ENV_NAME = /\b[A-Z][A-Z0-9]{2,}(?:_[A-Z0-9]+)*_(?:KEY|TOKEN|SECRET|ID|URL)\b/;
const STRING_LITERAL = /(["'`])((?:\\.|(?!\1)[^\\])*)\1/g;

// Arquivos que legitimamente citam nomes de variáveis (catálogo, diagnóstico, infra).
const ALLOWED = new Set([
  "src/lib/system-keys.ts",
  "src/lib/system-diagnostics.server.ts",
  "src/lib/system-diagnostics.functions.ts",
  "src/lib/env-check.ts",
  "src/lib/supabase-client.server.ts",
  "src/lib/supabase-client.test.ts",
  "src/lib/messages-leak.test.ts",
  "src/lib/service-role-health.server.ts",
  "src/lib/supabase-optional-admin.server.ts",
  "src/lib/admin-backend-info.functions.ts",
  "src/integrations/supabase/client.server.ts",
  "src/integrations/supabase/config.ts",
]);

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.tsx?$/.test(entry.name) ? [path] : [];
  });
}

/** Frases que citam variável em contexto técnico legítimo (leitura de env, código de erro). */
function isTechnicalContext(line: string): boolean {
  return (
    /process\.env/.test(line) ||
    /import\.meta\.env/.test(line) ||
    /^\s*(\/\/|\*|\/\*)/.test(line) ||
    /code:\s*["']/.test(line) ||
    /from\s+["']/.test(line)
  );
}

describe("mensagens exibidas ao usuário", () => {
  it("nunca citam nomes de variáveis de ambiente", () => {
    const violacoes: string[] = [];

    for (const absolute of sourceFiles(SOURCE_ROOT)) {
      const relative = absolute.slice(process.cwd().length + 1);
      if (ALLOWED.has(relative)) continue;
      const lines = readFileSync(absolute, "utf8").split("\n");

      lines.forEach((line, index) => {
        if (isTechnicalContext(line)) return;
        for (const [, , conteudo] of line.matchAll(STRING_LITERAL)) {
          if (conteudo && ENV_NAME.test(conteudo) && /\s/.test(conteudo)) {
            violacoes.push(`${relative}:${index + 1} → ${conteudo.slice(0, 90)}`);
          }
        }
      });
    }

    expect(violacoes).toEqual([]);
  });

  it("o catálogo de capacidades gera mensagem amigável e sem termo técnico", () => {
    for (const cap of CAPABILITIES) {
      const msg = capabilityUnavailableMessage(cap.id);
      expect(msg).toContain(cap.label);
      expect(ENV_NAME.test(msg)).toBe(false);
    }
    expect(capabilityUnavailableMessage("inexistente")).toMatch(/não está configurada/);
  });

  it("cada capacidade declara ao menos uma variável e um impacto", () => {
    for (const cap of CAPABILITIES) {
      expect(cap.envs.length).toBeGreaterThan(0);
      expect(cap.impacto.length).toBeGreaterThan(10);
    }
  });
});
