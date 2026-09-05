#!/usr/bin/env bun
/**
 * Auditoria automática da documentação — varredura completa.
 *
 * Compara:
 *   1. Rotas ativas em `src/routes/_authenticated/*.tsx`
 *   2. Mapa canônico `src/content/docs/route-map.ts` (ROUTE_DOC_MAP)
 *   3. Artigos publicados em `src/content/docs/articles/**\/*.md`
 *
 * Emite:
 *   - Seções globais (rotas órfãs, cross-links quebrados, artigos curtos,
 *     frontmatter incompleto, screenshots quebrados, headings duplicados,
 *     rotas sem PageHeader, papéis inconsistentes, `app_version` defasada).
 *   - `byModule`: agregado por categoria.
 *   - `byStage`:  cobertura por etapa do fluxo Solutek.
 *
 * Uso:
 *   bun run scripts/docs-audit.mjs           # imprime resumo no console
 *   bun run scripts/docs-audit.mjs --write   # também grava /mnt/documents/docs-audit.{md,json}
 */

import { readdir, readFile, writeFile, mkdir, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const ROUTES_DIR = join(ROOT, "src/routes/_authenticated");
const ARTICLES_DIR = join(ROOT, "src/content/docs/articles");
const ROUTE_MAP_FILE = join(ROOT, "src/content/docs/route-map.ts");
const ASSETS_DOCS_DIR = join(ROOT, "src/assets/docs");
const APP_VERSION_FILE = join(ROOT, "src/lib/app-version.ts");
const TYPES_FILE = join(ROOT, "src/content/docs/types.ts");

// -------- helpers --------

function fileToRoute(name) {
  const base = name.replace(/\.tsx?$/, "");
  if (base === "route" || base.startsWith("_") || base === "index") return null;
  const clean = base.replace(/\.index$/, "");
  return "/" + clean.split(".").join("/");
}

function normalizeRouteForCompare(r) {
  return r.replace(/\$[a-zA-Z]+/g, "$*");
}

async function listRoutes() {
  const files = await readdir(ROUTES_DIR).catch(() => []);
  const routes = [];
  for (const f of files) {
    if (!f.endsWith(".tsx")) continue;
    const r = fileToRoute(f);
    if (r) routes.push({ route: r, file: join(ROUTES_DIR, f) });
  }
  return routes.sort((a, b) => a.route.localeCompare(b.route));
}

async function listPublicRoutes() {
  const pub = new Set();
  const files = await readdir(join(ROOT, "src/routes")).catch(() => []);
  for (const f of files) {
    if (!f.endsWith(".tsx")) continue;
    const r = fileToRoute(f);
    if (r) pub.add(r);
  }
  return [...pub];
}

async function listArticles() {
  const cats = await readdir(ARTICLES_DIR).catch(() => []);
  const out = [];
  for (const cat of cats) {
    const files = await readdir(join(ARTICLES_DIR, cat)).catch(() => []);
    for (const f of files) {
      if (!f.endsWith(".md")) continue;
      const full = join(ARTICLES_DIR, cat, f);
      const raw = await readFile(full, "utf8");
      const fm = raw.match(/^---\s*\n([\s\S]*?)\n---/);
      const fmBody = fm ? fm[1] : "";
      const get = (k) => fmBody.match(new RegExp(`^${k}:\\s*(.+)$`, "m"))?.[1]?.trim();
      const parseList = (v) =>
        v
          ? v
              .replace(/^\[|\]$/g, "")
              .split(",")
              .map((s) => s.trim().replace(/^["']|["']$/g, ""))
              .filter(Boolean)
          : [];
      const slug = f.replace(/\.md$/, "");
      const body = raw.replace(/^---[\s\S]*?---\s*/, "");
      out.push({
        category: cat,
        slug,
        title: get("title") ?? f,
        description: get("description"),
        tipo: get("tipo"),
        nivel: get("nivel"),
        atualizadoEm: get("atualizado_em"),
        appVersion: get("app_version")?.replace(/^["']|["']$/g, ""),
        papeis: parseList(get("papeis")),
        tags: parseList(get("tags")),
        chars: body.length,
        path: full,
        body,
      });
    }
  }
  return out;
}

async function readRouteMap() {
  const src = await readFile(ROUTE_MAP_FILE, "utf8").catch(() => "");
  const rows = [];
  const re = /\{\s*route:\s*"([^"]+)"\s*,\s*category:\s*"([^"]+)"\s*,\s*slug:\s*"([^"]+)"/g;
  let m;
  while ((m = re.exec(src))) rows.push({ route: m[1], category: m[2], slug: m[3] });
  return rows;
}

async function readAppVersion() {
  const src = await readFile(APP_VERSION_FILE, "utf8").catch(() => "");
  return src.match(/APP_VERSION\s*=\s*"([^"]+)"/)?.[1] ?? "0.0.0";
}

async function readPapelEnum() {
  const src = await readFile(TYPES_FILE, "utf8").catch(() => "");
  const block = src.match(/DocPapel\s*=\s*([\s\S]*?);/)?.[1] ?? "";
  return Array.from(block.matchAll(/"([^"]+)"/g)).map((m) => m[1]);
}

function parseVersion(v) {
  if (!v) return [0, 0, 0];
  const parts = v.split(".").map((n) => Number.parseInt(n, 10) || 0);
  return [parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0];
}

/** true se b está ≥ 2 minors atrás de a (ignorando patch). */
function isStale(current, articleV) {
  if (!articleV) return true;
  const [cM, cm] = parseVersion(current);
  const [aM, am] = parseVersion(articleV);
  if (aM < cM) return true;
  if (aM === cM && cm - am >= 2) return true;
  return false;
}

// -------- constants --------

const MIN_CHARS = 1200;
const LEGACY_HINTS = ["/admin/pipeline-config", "/engenharia/hh"];

const IGNORE_ROUTES = [
  /^\/ajuda(\/|$)/,
  /^\/changelog$/,
  /^\/design-system$/,
  /^\/dashboard$/,
  /^\/conta$/,
  /\/imprimir$/,
];

/** Prefixos que caracterizam menções a rotas do app dentro dos artigos. */
const ROUTE_PREFIXES = [
  "/admin/",
  "/comercial/",
  "/engenharia/",
  "/compras/",
  "/qualidade/",
  "/pos-vendas/",
  "/producao/",
  "/logistica/",
  "/clientes/",
  "/fornecedores/",
  "/documentos/",
  "/know-how/",
  "/conta",
];

/** Etapas do fluxo Solutek → categorias e prefixos de rota. */
const WORKFLOW_STAGES = [
  {
    id: "comercial",
    label: "1. Comercial",
    categories: ["comercial"],
    routePrefixes: ["/comercial"],
  },
  {
    id: "engenharia",
    label: "2. Engenharia",
    categories: ["engenharia"],
    routePrefixes: ["/engenharia"],
  },
  { id: "compras", label: "3. Compras", categories: ["compras"], routePrefixes: ["/compras"] },
  { id: "producao", label: "4. Produção", categories: ["producao"], routePrefixes: ["/producao"] },
  {
    id: "qualidade",
    label: "5. Qualidade",
    categories: ["qualidade"],
    routePrefixes: ["/qualidade"],
  },
  {
    id: "logistica",
    label: "6. Logística",
    categories: ["logistica"],
    routePrefixes: ["/logistica"],
  },
  {
    id: "pos-vendas",
    label: "7. Pós-vendas",
    categories: ["pos-vendas"],
    routePrefixes: ["/pos-vendas"],
  },
];

const SUPPORT_STAGE = {
  id: "suporte",
  label: "Suporte transversal",
  categories: [
    "clientes-fornecedores",
    "documentos",
    "know-how",
    "admin",
    "conta",
    "site-publico",
    "importacao",
  ],
  routePrefixes: [
    "/clientes",
    "/fornecedores",
    "/importar",
    "/documentos",
    "/central-documentos",
    "/template-documentos",
    "/know-how",
    "/admin",
    "/conta",
  ],
};

// -------- run --------

const routesRaw = await listRoutes();
const routes = routesRaw.map((r) => r.route);
const routeFileByRoute = new Map(routesRaw.map((r) => [r.route, r.file]));
const routesFiltered = routes.filter((r) => !IGNORE_ROUTES.some((rx) => rx.test(r)));

const articles = await listArticles();
const routeMap = await readRouteMap();
const appVersion = await readAppVersion();
const papelEnum = await readPapelEnum();

const mapKeys = new Set(routeMap.map((r) => normalizeRouteForCompare(r.route)));
const activeKeys = new Set(routes.map(normalizeRouteForCompare));
const articleSet = new Set(articles.map((a) => `${a.category}/${a.slug}`));
const mapArticleSet = new Set(routeMap.map((r) => `${r.category}/${r.slug}`));

// 1) Rotas ativas sem mapeamento
const routesSemDoc = routesFiltered
  .filter((r) => !mapKeys.has(normalizeRouteForCompare(r)))
  .map((route) => ({ route }));

// 2) Entradas do mapa apontando para rota inexistente
const mapOrfaos = routeMap.filter((r) => !activeKeys.has(normalizeRouteForCompare(r.route)));

// 3) Entradas do mapa apontando para artigo inexistente
const mapArtigoFaltando = routeMap.filter(
  (r) => !articles.some((a) => a.category === r.category && a.slug === r.slug),
);

// 4) Artigos referenciando rotas legadas
const artigosLegado = [];
for (const a of articles) {
  for (const legacy of LEGACY_HINTS) {
    if (a.body.includes(legacy)) artigosLegado.push({ article: `${a.category}/${a.slug}`, legacy });
  }
}

// 5) Artigos curtos
const artigosCurtos = articles
  .filter((a) => a.chars < MIN_CHARS)
  .sort((a, b) => a.chars - b.chars)
  .map((a) => ({ article: `${a.category}/${a.slug}`, chars: a.chars, title: a.title }));

// 6) Categorias sem artigos
const catsDir = await readdir(ARTICLES_DIR).catch(() => []);
const catsVazias = catsDir
  .filter((c) => !articles.some((a) => a.category === c))
  .map((category) => ({ category }));

// 7) Artigos sem entrada no ROUTE_DOC_MAP
const artigosSemMapa = articles
  .filter((a) => !mapArticleSet.has(`${a.category}/${a.slug}`))
  .map((a) => ({ article: `${a.category}/${a.slug}`, title: a.title, category: a.category }));

// 8) Cross-links quebrados
const crossLinksQuebrados = [];
const linkRe = /\]\(\/ajuda\/documentacao\/([^)#?]+?)\)/g;
for (const a of articles) {
  let m;
  while ((m = linkRe.exec(a.body))) {
    const target = m[1].replace(/\/$/, "");
    if (target.split("/").length !== 2) continue;
    if (!articleSet.has(target))
      crossLinksQuebrados.push({ from: `${a.category}/${a.slug}`, target });
  }
}

// 9) Menções a rotas inexistentes
const publicRoutes = await listPublicRoutes();
const activeNorm = new Set([...routes, ...publicRoutes].map(normalizeRouteForCompare));
const rotasFantasma = [];
const routeRefRe = /`(\/[a-z0-9/_$-]+)`/gi;
for (const a of articles) {
  let m;
  while ((m = routeRefRe.exec(a.body))) {
    const ref = m[1].replace(/\/$/, "");
    if (!ROUTE_PREFIXES.some((p) => ref.startsWith(p))) continue;
    const norm = normalizeRouteForCompare(ref);
    const hit = [...activeNorm].some(
      (ar) => ar === norm || norm.startsWith(ar + "/") || ar.startsWith(norm + "/"),
    );
    if (!hit) rotasFantasma.push({ from: `${a.category}/${a.slug}`, ref });
  }
}
const rotasFantasmaUniq = [
  ...new Map(rotasFantasma.map((r) => [`${r.from}|${r.ref}`, r])).values(),
];

// 10) Frontmatter incompleto
const REQUIRED_FM = ["title", "description", "tipo", "nivel", "atualizadoEm"];
const frontmatterIncompleto = [];
for (const a of articles) {
  const missing = REQUIRED_FM.filter((k) => !a[k]);
  if (missing.length)
    frontmatterIncompleto.push({
      article: `${a.category}/${a.slug}`,
      missing: missing.map((k) => (k === "atualizadoEm" ? "atualizado_em" : k)).join(", "),
    });
}

// 11) app_version defasada
const versaoDefasada = articles
  .filter((a) => isStale(appVersion, a.appVersion))
  .map((a) => ({
    article: `${a.category}/${a.slug}`,
    appVersion: a.appVersion ?? "(sem)",
    currentVersion: appVersion,
  }));

// 12) Screenshots quebrados
const imgRe = /:::(?:step|figure)\{[^}]*img="([^"]+)"/g;
const mdImgRe = /!\[[^\]]*\]\(([^)]+)\)/g;
const screenshotsQuebrados = [];
for (const a of articles) {
  const seen = new Set();
  const collect = (re) => {
    let m;
    while ((m = re.exec(a.body))) {
      const img = m[1].trim();
      if (seen.has(img)) continue;
      seen.add(img);
      if (img.startsWith("http")) continue;
      // resolve local: src/assets/docs/<cat>/<name>[.asset.json]
      const bare = img.replace(/^\.?\//, "");
      const candidates = [
        join(ASSETS_DOCS_DIR, a.category, bare),
        join(ASSETS_DOCS_DIR, a.category, bare + ".asset.json"),
        join(ROOT, "public", bare),
      ];
      const ok = candidates.some((p) => existsSync(p));
      if (!ok) screenshotsQuebrados.push({ article: `${a.category}/${a.slug}`, img });
    }
  };
  collect(imgRe);
  collect(mdImgRe);
}

// 13) Headings duplicados no mesmo artigo
const headingsDuplicados = [];
for (const a of articles) {
  const heads = [...a.body.matchAll(/^##\s+(.+)$/gm)].map((m) => m[1].trim().toLowerCase());
  const counts = new Map();
  for (const h of heads) counts.set(h, (counts.get(h) ?? 0) + 1);
  for (const [h, n] of counts) {
    if (n > 1)
      headingsDuplicados.push({ article: `${a.category}/${a.slug}`, heading: h, count: n });
  }
}

// 14) Rotas sem <PageHeader />
const rotasSemPageHeader = [];
for (const { route, file } of routesRaw) {
  if (IGNORE_ROUTES.some((rx) => rx.test(route))) continue;
  const src = await readFile(file, "utf8").catch(() => "");
  if (!/<PageHeader\b/.test(src)) rotasSemPageHeader.push({ route });
}

// 15) Papéis inconsistentes
const papeisInconsistentes = [];
for (const a of articles) {
  const invalid = a.papeis.filter((p) => !papelEnum.includes(p));
  if (invalid.length)
    papeisInconsistentes.push({
      article: `${a.category}/${a.slug}`,
      invalidRoles: invalid.join(", "),
    });
}

// -------- sections --------

const sections = [
  {
    id: "rotas-sem-doc",
    title: "Rotas ativas sem doc mapeado",
    severity: "warn",
    items: routesSemDoc,
  },
  {
    id: "map-rota-inexistente",
    title: "Entradas do mapa apontando para rota inexistente",
    severity: "error",
    items: mapOrfaos,
  },
  {
    id: "map-artigo-inexistente",
    title: "Entradas do mapa apontando para artigo inexistente",
    severity: "error",
    items: mapArtigoFaltando,
  },
  {
    id: "artigos-legados",
    title: "Artigos referenciando rotas legadas",
    severity: "warn",
    items: artigosLegado,
  },
  {
    id: "artigos-curtos",
    title: `Artigos curtos (< ${MIN_CHARS} chars)`,
    severity: "info",
    items: artigosCurtos,
  },
  { id: "categorias-vazias", title: "Categorias sem artigos", severity: "info", items: catsVazias },
  {
    id: "artigos-sem-mapa",
    title: "Artigos sem entrada no ROUTE_DOC_MAP",
    severity: "info",
    items: artigosSemMapa,
  },
  {
    id: "cross-links-quebrados",
    title: "Cross-links quebrados entre artigos",
    severity: "error",
    items: crossLinksQuebrados,
  },
  {
    id: "rotas-fantasma",
    title: "Menções a rotas inexistentes no app",
    severity: "warn",
    items: rotasFantasmaUniq,
  },
  {
    id: "frontmatter-incompleto",
    title: "Frontmatter incompleto",
    severity: "error",
    items: frontmatterIncompleto,
  },
  {
    id: "versao-defasada",
    title: "app_version defasada (≥ 2 minors atrás)",
    severity: "warn",
    items: versaoDefasada,
  },
  {
    id: "screenshots-quebrados",
    title: "Screenshots referenciados que não existem",
    severity: "warn",
    items: screenshotsQuebrados,
  },
  {
    id: "headings-duplicados",
    title: "Headings duplicados no mesmo artigo",
    severity: "info",
    items: headingsDuplicados,
  },
  {
    id: "rotas-sem-page-header",
    title: "Rotas sem <PageHeader /> (sem botão de ajuda)",
    severity: "info",
    items: rotasSemPageHeader,
  },
  {
    id: "papeis-inconsistentes",
    title: "Papéis fora do enum DocPapel",
    severity: "info",
    items: papeisInconsistentes,
  },
];

// -------- agregações --------

/** Extrai a categoria/artigo/rota de um item para roteamento por módulo. */
function itemCategory(sectionId, item) {
  if (typeof item.category === "string") return item.category;
  if (typeof item.article === "string") return item.article.split("/")[0];
  if (typeof item.from === "string") return item.from.split("/")[0];
  if (typeof item.route === "string") {
    const first = item.route.split("/").filter(Boolean)[0];
    // mapeia prefixos "clientes"/"fornecedores"/"importar" → categoria clientes-fornecedores
    if (["clientes", "fornecedores", "importar"].includes(first)) return "clientes-fornecedores";
    if (first === "central-documentos" || first === "template-documentos") return "documentos";
    return first;
  }
  return "outros";
}

const allCategories = new Set([
  ...catsDir,
  ...articles.map((a) => a.category),
  ...routeMap.map((r) => r.category),
]);

const byModule = {};
for (const cat of allCategories) {
  byModule[cat] = {
    category: cat,
    articles: articles.filter((a) => a.category === cat).length,
    routes: routeMap.filter((r) => r.category === cat).length,
    errors: 0,
    warnings: 0,
    info: 0,
    findings: [],
  };
}
for (const s of sections) {
  for (const it of s.items) {
    const cat = itemCategory(s.id, it);
    const mod =
      byModule[cat] ??
      (byModule[cat] = {
        category: cat,
        articles: 0,
        routes: 0,
        errors: 0,
        warnings: 0,
        info: 0,
        findings: [],
      });
    if (s.severity === "error") mod.errors += 1;
    else if (s.severity === "warn") mod.warnings += 1;
    else mod.info += 1;
    mod.findings.push({ sectionId: s.id, sectionTitle: s.title, severity: s.severity, item: it });
  }
}

// byStage: cobertura por etapa do workflow
function buildStage(stage) {
  const stageArticles = articles.filter((a) => stage.categories.includes(a.category));
  const stageRoutes = routesFiltered.filter((r) =>
    stage.routePrefixes.some((p) => r === p || r.startsWith(p + "/")),
  );
  const stageRouteMap = routeMap.filter((r) =>
    stage.routePrefixes.some((p) => r.route === p || r.route.startsWith(p + "/")),
  );
  const coveredRoutes = stageRoutes.filter((r) => mapKeys.has(normalizeRouteForCompare(r)));
  const missingRoutes = stageRoutes.filter((r) => !mapKeys.has(normalizeRouteForCompare(r)));
  const byTipo = { guia: 0, conceito: 0, referencia: 0, troubleshooting: 0, indefinido: 0 };
  for (const a of stageArticles) {
    const t = a.tipo && byTipo[a.tipo] !== undefined ? a.tipo : "indefinido";
    byTipo[t] += 1;
  }
  const stageErrors = sections.reduce((n, s) => {
    if (s.severity !== "error") return n;
    return n + s.items.filter((it) => stage.categories.includes(itemCategory(s.id, it))).length;
  }, 0);
  const stageWarnings = sections.reduce((n, s) => {
    if (s.severity !== "warn") return n;
    return n + s.items.filter((it) => stage.categories.includes(itemCategory(s.id, it))).length;
  }, 0);
  const coverage =
    stageRoutes.length === 0 ? 100 : Math.round((coveredRoutes.length / stageRoutes.length) * 100);
  return {
    id: stage.id,
    label: stage.label,
    categories: stage.categories,
    routePrefixes: stage.routePrefixes,
    articles: stageArticles.length,
    articlesByTipo: byTipo,
    routes: stageRoutes.length,
    routesMapped: coveredRoutes.length,
    routesMissing: missingRoutes,
    routeMapEntries: stageRouteMap.length,
    errors: stageErrors,
    warnings: stageWarnings,
    coverage,
    anchorArticles: stageArticles
      .filter((a) => a.tipo === "guia" || a.tipo === "conceito")
      .slice(0, 3)
      .map((a) => ({ category: a.category, slug: a.slug, title: a.title })),
  };
}

const byStage = WORKFLOW_STAGES.map(buildStage);
const supportStage = buildStage(SUPPORT_STAGE);

const summary = {
  errors: sections.filter((s) => s.severity === "error").reduce((n, s) => n + s.items.length, 0),
  warnings: sections.filter((s) => s.severity === "warn").reduce((n, s) => n + s.items.length, 0),
  info: sections.filter((s) => s.severity === "info").reduce((n, s) => n + s.items.length, 0),
};

// -------- output --------

const generatedAt = new Date().toISOString();
const jsonReport = {
  generatedAt,
  appVersion,
  totals: {
    activeRoutes: routes.length,
    routeMapEntries: routeMap.length,
    articles: articles.length,
    categories: [...allCategories].length,
  },
  sections,
  summary,
  byModule,
  byStage,
  supportStage,
};

const inRepoJson = join(ROOT, "src/content/docs/audit-report.json");
await writeFile(inRepoJson, JSON.stringify(jsonReport, null, 2), "utf8");

// Markdown resumido para console/mnt
const lines = [];
lines.push(`# Auditoria da documentação — ${generatedAt.slice(0, 10)}`);
lines.push("");
lines.push(`- app_version: **${appVersion}**`);
lines.push(
  `- Rotas ativas: **${routes.length}** · route-map: **${routeMap.length}** · artigos: **${articles.length}**`,
);
lines.push(
  `- Resumo: **${summary.errors}** erro(s), **${summary.warnings}** aviso(s), **${summary.info}** info`,
);
lines.push("");
for (const s of sections) {
  lines.push(`## ${s.title} (${s.items.length}) — ${s.severity}`);
  if (s.items.length === 0) lines.push("_Nenhum._");
  else s.items.slice(0, 20).forEach((it) => lines.push(`- ${JSON.stringify(it)}`));
  if (s.items.length > 20) lines.push(`- … +${s.items.length - 20}`);
  lines.push("");
}
lines.push(`## Cobertura por etapa`);
for (const st of [...byStage, supportStage]) {
  lines.push(
    `- **${st.label}** — ${st.coverage}% (${st.routesMapped}/${st.routes} rotas, ${st.articles} artigos, err=${st.errors} warn=${st.warnings})`,
  );
}
lines.push("");
lines.push(`## Por módulo`);
for (const cat of Object.keys(byModule).sort()) {
  const m = byModule[cat];
  lines.push(
    `- **${cat}** — art=${m.articles} rot=${m.routes} err=${m.errors} warn=${m.warnings} info=${m.info}`,
  );
}

const report = lines.join("\n");
console.log(report);
console.error(`\nRelatório JSON salvo em ${inRepoJson}`);

if (process.argv.includes("--write")) {
  const outDir = "/mnt/documents";
  if (!existsSync(outDir)) await mkdir(outDir, { recursive: true });
  await writeFile(join(outDir, "docs-audit.md"), report, "utf8");
  await writeFile(join(outDir, "docs-audit.json"), JSON.stringify(jsonReport, null, 2), "utf8");
  console.error(`Também salvo em ${outDir}/docs-audit.{md,json}`);
}
