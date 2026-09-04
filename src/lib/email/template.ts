/**
 * Renderização de templates.
 *
 * Sintaxe suportada:
 *   {{var}}                  → valor da variável (HTML-escapado, exceto sufixo _html).
 *   {{var|texto padrão}}     → fallback quando a variável está vazia/ausente.
 *   {{#if var}}...{{/if}}    → bloco removido inteiro quando var está vazia.
 *
 * Se um template quiser embutir HTML bruto, use uma variável com sufixo `_html`.
 */
const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");

type Vars = Record<string, string | number | null | undefined>;

function isEmpty(v: unknown): boolean {
  return v === null || v === undefined || String(v).trim() === "";
}

export function renderTemplate(tpl: string, vars: Vars): string {
  // 1. Blocos condicionais {{#if var}}…{{/if}} — removidos quando var vazia.
  let out = tpl.replace(
    /\{\{\s*#if\s+([a-zA-Z0-9_]+)\s*\}\}([\s\S]*?)\{\{\s*\/if\s*\}\}/g,
    (_, k: string, inner: string) => (isEmpty(vars[k]) ? "" : inner),
  );

  // 2. Substituição {{var}} e {{var|fallback}}.
  out = out.replace(
    /\{\{\s*([a-zA-Z0-9_]+)(?:\s*\|\s*([^}]*?))?\s*\}\}/g,
    (_, k: string, fallback: string | undefined) => {
      const v = vars[k];
      const empty = isEmpty(v);
      const raw = empty ? (fallback ?? "") : String(v);
      return k.endsWith("_html") ? raw : escapeHtml(raw);
    },
  );

  return out;
}

/**
 * Extrai chaves de variáveis usadas no template (ignorando fallback e blocos #if).
 */
export function collectTemplateVars(tpl: string): string[] {
  const set = new Set<string>();
  const re = /\{\{\s*(?:#if\s+)?([a-zA-Z0-9_]+)(?:\s*\|[^}]*)?\s*\}\}/g;
  let m;
  while ((m = re.exec(tpl)) !== null) set.add(m[1]);
  return Array.from(set);
}
