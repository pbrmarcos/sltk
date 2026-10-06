/**
 * Confere colunas usadas em `.from("tabela").select("...")` contra o schema
 * (src/integrations/supabase/types.ts, regenerado do banco). Pega o tipo de
 * bug que o `as any` esconde do TypeScript: coluna que não existe só estoura
 * em produção ("Could not find column…").
 *
 * Uso: bun scripts/checar-colunas.ts   (sai com código 1 se achar problema)
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dir, "..");
const TYPES = readFileSync(join(ROOT, "src/integrations/supabase/types.ts"), "utf8");

/** tabela/view -> colunas, lidas do bloco Row de cada uma. */
function lerSchema(): Map<string, Set<string>> {
  const out = new Map<string, Set<string>>();
  const re = /\n {6}(\w+): \{\n {8}Row: \{\n([\s\S]*?)\n {8}\};/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(TYPES))) {
    const cols = new Set<string>();
    for (const l of m[2].split("\n")) {
      const c = /^\s{10}(\w+)\??:/.exec(l);
      if (c) cols.add(c[1]);
    }
    out.set(m[1], cols);
  }
  return out;
}

/** Divide no nível 0 (vírgulas fora de parênteses). */
function topLevel(s: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let cur = "";
  for (const ch of s) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === "," && depth === 0) {
      parts.push(cur.trim());
      cur = "";
    } else cur += ch;
  }
  if (cur.trim()) parts.push(cur.trim());
  return parts;
}

type Problema = { arquivo: string; linha: number; tabela: string; coluna: string };

function checarSelect(
  schema: Map<string, Set<string>>,
  tabela: string,
  sel: string,
  onErro: (tabela: string, coluna: string) => void,
) {
  const cols = schema.get(tabela);
  for (const raw of topLevel(sel.replace(/\s+/g, " "))) {
    if (!raw || raw === "*" || raw.startsWith("...")) continue;
    // embed: [alias:]relacao[!hint](subselect)
    const emb = /^(?:(\w+)\s*:\s*)?(\w+)(?:![\w]+)?\s*\(([\s\S]*)\)$/.exec(raw);
    if (emb) {
      const rel = emb[2];
      if (rel === "count") continue;
      if (schema.has(rel)) checarSelect(schema, rel, emb[3], onErro);
      continue; // relação por nome de FK/alias: não dá para checar sem o hint
    }
    // coluna simples: [alias:]coluna[::cast] ou json path col->x
    const col = raw
      .replace(/^\w+\s*:\s*/, "")
      .replace(/::\w+$/, "")
      .replace(/->.*$/, "")
      .trim();
    if (!/^\w+$/.test(col)) continue;
    if (cols && !cols.has(col)) onErro(tabela, col);
  }
}

function arquivos(dir: string): string[] {
  const out: string[] = [];
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) out.push(...arquivos(p));
    else if (/\.(ts|tsx)$/.test(n) && !n.endsWith("types.ts")) out.push(p);
  }
  return out;
}

const schema = lerSchema();
const problemas: Problema[] = [];
// .from("t") seguido (até 400 chars, sem outro .from) de .select("..."|`...`)
const re =
  /\.from\(\s*["'`](\w+)["'`][^)]*\)((?:(?!\.from\()[\s\S]){0,400}?)\.select\(\s*(["'`])([\s\S]*?)\3/g;
for (const f of arquivos(join(ROOT, "src"))) {
  const src = readFileSync(f, "utf8");
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) {
    const [, tabela, , , sel] = m;
    if (!schema.has(tabela) || sel.includes("${")) continue;
    const linha = src.slice(0, m.index).split("\n").length;
    checarSelect(schema, tabela, sel, (t, c) =>
      problemas.push({
        arquivo: f.replace(ROOT + "\\", "").replace(ROOT + "/", ""),
        linha,
        tabela: t,
        coluna: c,
      }),
    );
  }
}

console.log(`Schema: ${schema.size} tabelas/views.`);
if (problemas.length === 0) {
  console.log("Nenhuma coluna inexistente encontrada.");
} else {
  for (const p of problemas) console.log(`${p.arquivo}:${p.linha}  ${p.tabela}.${p.coluna}`);
  console.log(`\n${problemas.length} coluna(s) inexistente(s).`);
  process.exit(1);
}
