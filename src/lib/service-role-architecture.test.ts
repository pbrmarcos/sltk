import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const SOURCE_ROOT = join(process.cwd(), "src");
const LOW_LEVEL_IMPORT = /@\/integrations\/supabase\/client\.server/;
const ALLOWED = new Set([
  "src/lib/supabase-client.server.ts",
  "src/lib/service-role-health.server.ts",
]);

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.tsx?$/.test(entry.name) ? [path] : [];
  });
}

describe("service role architecture", () => {
  it("permite o client administrativo de baixo nível somente nos helpers centrais", () => {
    const violations = sourceFiles(SOURCE_ROOT)
      .filter((path) => LOW_LEVEL_IMPORT.test(readFileSync(path, "utf8")))
      .map((path) => path.slice(process.cwd().length + 1).replace(/\\/g, "/"))
      .filter((path) => path !== "src/integrations/supabase/client.server.ts")
      .filter((path) => !ALLOWED.has(path));

    expect(violations).toEqual([]);
  });
});
