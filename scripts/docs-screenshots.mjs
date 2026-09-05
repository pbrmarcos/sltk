#!/usr/bin/env bun
/**
 * Captura automatizada de screenshots reais das telas do sistema.
 *
 * Ordem de autenticação (primeiro modo disponível vence):
 *   1. Storage state em cache (`/tmp/docs-shots/.auth.json`) — reaproveita
 *      login prévio. Reutilizado até `--fresh-auth` ou expirar.
 *   2. Sessão Supabase injetada pelo sandbox (LOVABLE_BROWSER_SUPABASE_*).
 *   3. Login via formulário /login usando `DOCS_SHOTS_EMAIL` + `DOCS_SHOTS_PASSWORD`
 *      (defina como secrets em Workspace Settings ou via `add_secret` — o script
 *      lê apenas via env vars). Após login bem-sucedido, salva storage state
 *      para os próximos runs.
 *
 * Uso:
 *   bun scripts/docs-screenshots.mjs                     # todas as rotas
 *   bun scripts/docs-screenshots.mjs comercial           # só uma categoria
 *   bun scripts/docs-screenshots.mjs --fresh-auth        # ignora cache e refaz login
 *
 * Imagens: `/tmp/docs-shots/<categoria>/<slug>-<n>.png`.
 * Promover para o CDN e injetar nos artigos:
 *   bun scripts/docs-promote-shots.mjs
 */

import { chromium } from "playwright";
import { mkdir, writeFile, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";

const BASE = "http://localhost:8080";
const OUT = "/tmp/docs-shots";
const AUTH_STATE = join(OUT, ".auth.json");
const AUTH_TTL_MS = 1000 * 60 * 60 * 8; // 8h

const TARGETS = [
  { category: "comercial", slug: "pipeline-de-oportunidades", paths: ["/comercial/pipeline"] },
  {
    category: "comercial",
    slug: "novo-orcamento",
    paths: ["/comercial/orcamento", "/comercial/orcamento/novo"],
  },
  { category: "comercial", slug: "mineracao-de-leads", paths: ["/comercial/mineracao"] },
  { category: "comercial", slug: "entrevistas", paths: ["/comercial/entrevistas"] },
  {
    category: "comercial",
    slug: "checklist-publico-e-formularios",
    paths: ["/comercial/checklists"],
  },
  {
    category: "clientes-fornecedores",
    slug: "cadastrar-fornecedor",
    paths: ["/fornecedores", "/fornecedores/novo"],
  },
  {
    category: "clientes-fornecedores",
    slug: "cadastrar-cliente",
    paths: ["/clientes", "/clientes/novo"],
  },
  { category: "clientes-fornecedores", slug: "importar-clientes-em-lote", paths: ["/importar"] },
  { category: "compras", slug: "criar-solicitacao", paths: ["/compras/solicitacao"] },
  { category: "compras", slug: "cotacao-multiplos-fornecedores", paths: ["/compras/cotacoes"] },
  {
    category: "compras",
    slug: "emitir-e-aprovar-oc",
    paths: ["/compras/ordens", "/compras/ordens/nova"],
  },
  { category: "engenharia", slug: "etapas-e-kanban", paths: ["/engenharia/etapas"] },
  { category: "engenharia", slug: "criar-etp", paths: ["/engenharia/etp"] },
  { category: "producao", slug: "kanban-montagem", paths: ["/producao/montagem"] },
  {
    category: "qualidade",
    slug: "agendar-e-preparar-fat",
    paths: ["/qualidade/fat", "/qualidade/fat/novo"],
  },
  { category: "logistica", slug: "visao-geral", paths: ["/logistica/embarques"] },
  { category: "logistica", slug: "criar-embarque", paths: ["/logistica/embarques/novo"] },
  { category: "pos-vendas", slug: "atender-chamado", paths: ["/pos-vendas/chamados"] },
  { category: "pos-vendas", slug: "sat-em-campo", paths: ["/pos-vendas/sat"] },
  { category: "documentos", slug: "visao-geral", paths: ["/central-documentos"] },
  { category: "documentos", slug: "templates-e-versionamento", paths: ["/template-documentos"] },
  { category: "know-how", slug: "visao-geral", paths: ["/know-how"] },
  {
    category: "know-how",
    slug: "publicar-conteudo",
    paths: ["/know-how/novo", "/know-how/revisar"],
  },
  { category: "admin", slug: "gerenciar-usuarios", paths: ["/admin/usuarios"] },
  { category: "admin", slug: "tipos-de-checklist", paths: ["/admin/checklist-tipos"] },
  { category: "admin", slug: "sla-chamados", paths: ["/admin/sla-chamados"] },
  { category: "admin", slug: "emails-automaticos", paths: ["/admin/emails"] },
  { category: "admin", slug: "formularios-recebidos", paths: ["/admin/formularios-recebidos"] },
  { category: "admin", slug: "configuracoes", paths: ["/admin/configuracoes"] },
  { category: "admin", slug: "auditoria", paths: ["/admin/auditoria"] },
  { category: "admin", slug: "formularios-entrevista", paths: ["/admin/entrevistas"] },
  {
    category: "admin",
    slug: "paginas-e-etapas-equipamentos",
    paths: ["/admin/etapas-equipamentos", "/admin/paginas-equipamentos"],
  },
  { category: "conta", slug: "editar-perfil-e-avatar", paths: ["/conta"] },
  { category: "site-publico", slug: "visao-geral", paths: ["/", "/equipamentos", "/contato"] },
];

const args = process.argv.slice(2);
const freshAuth = args.includes("--fresh-auth");
const onlyCat = args.find((a) => !a.startsWith("--"));
const targets = onlyCat ? TARGETS.filter((t) => t.category === onlyCat) : TARGETS;

await mkdir(OUT, { recursive: true });

async function isCachedAuthFresh() {
  if (freshAuth || !existsSync(AUTH_STATE)) return false;
  const s = await stat(AUTH_STATE);
  return Date.now() - s.mtimeMs < AUTH_TTL_MS;
}

async function loginWithCredentials(page, context) {
  const email = process.env.DOCS_SHOTS_EMAIL;
  const password = process.env.DOCS_SHOTS_PASSWORD;
  if (!email || !password) return false;

  console.error("→ tentando login por credenciais (DOCS_SHOTS_EMAIL/PASSWORD)");
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500); // aguarda hidratação do React
  // seletores tolerantes: labels em pt-BR, tipos padronizados
  const emailInput = page.locator('input[type="email"], input[name="email"]').first();
  const passInput = page.locator('input[type="password"], input[name="password"]').first();
  await emailInput.fill(email);
  await passInput.fill(password);
  await page.waitForTimeout(300);
  const submit = page.locator('button[type="submit"], button:has-text("Entrar")').first();
  await Promise.all([
    page
      .waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 20000 })
      .catch(() => null),
    submit.click(),
  ]);
  const ok = !page.url().includes("/login");
  if (ok) {
    await context.storageState({ path: AUTH_STATE });
    console.error(`  ✓ login OK — sessão salva em ${AUTH_STATE}`);
  } else {
    console.error("  ✗ login falhou (verifique credenciais)");
  }
  return ok;
}

const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined,
});
const useCache = await isCachedAuthFresh();
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  ...(useCache ? { storageState: AUTH_STATE } : {}),
});

const page = await context.newPage();

let authed = useCache;
if (useCache) console.error(`✓ sessão reaproveitada de ${AUTH_STATE}`);

if (!authed) {
  const status = process.env.LOVABLE_BROWSER_AUTH_STATUS;
  const storageKey = process.env.LOVABLE_BROWSER_SUPABASE_STORAGE_KEY;
  const session = process.env.LOVABLE_BROWSER_SUPABASE_SESSION_JSON;
  const cookiesRaw = process.env.LOVABLE_BROWSER_SUPABASE_COOKIES_JSON;

  if (status === "injected" && (cookiesRaw || (storageKey && session))) {
    if (cookiesRaw) {
      const cookies = JSON.parse(cookiesRaw).map((c) => ({ ...c, url: BASE }));
      await context.addCookies(cookies);
    }
    await page.goto(BASE, { waitUntil: "domcontentloaded" });
    if (storageKey && session) {
      await page.evaluate(([k, v]) => window.localStorage.setItem(k, v), [storageKey, session]);
    }
    await context.storageState({ path: AUTH_STATE });
    authed = true;
    console.error("✓ sessão injetada pelo sandbox — cache salvo");
  } else {
    authed = await loginWithCredentials(page, context);
  }
}

if (!authed) {
  console.error(
    "\nNenhum método de autenticação disponível:\n" +
      " - LOVABLE_BROWSER_AUTH_STATUS não está `injected`\n" +
      " - Não achei DOCS_SHOTS_EMAIL / DOCS_SHOTS_PASSWORD no ambiente\n\n" +
      "Configure DOCS_SHOTS_EMAIL e DOCS_SHOTS_PASSWORD como secrets do projeto\n" +
      "(add_secret) ou abra o preview autenticado antes de rodar novamente.",
  );
  await browser.close();
  process.exit(1);
}

for (const t of targets) {
  const dir = join(OUT, t.category);
  await mkdir(dir, { recursive: true });
  let i = 1;
  const captions = {};
  for (const p of t.paths) {
    const url = BASE + p;
    console.error(`→ ${t.category}/${t.slug} :: ${url}`);
    try {
      await page.goto(url, { waitUntil: "networkidle", timeout: 20000 });
      await page.waitForTimeout(700);
      // sessão expirou / kicked para /login → tenta reautenticar uma vez
      if (page.url().includes("/login")) {
        console.error("  · sessão expirou; refazendo login…");
        const ok = await loginWithCredentials(page, context);
        if (!ok) throw new Error("reauth falhou");
        await page.goto(url, { waitUntil: "networkidle", timeout: 20000 });
      }
      const filename = `${t.slug}-${i}.png`;
      const out = join(dir, filename);
      await page.screenshot({ path: out });
      // Legenda = H1 real da tela; fallback para último item do breadcrumb;
      // último recurso é o title() (que costuma ser o título global do app).
      const caption = await page
        .evaluate(() => {
          const h1 = document.querySelector("h1");
          if (h1?.textContent?.trim()) return h1.textContent.trim();
          const crumbs = document.querySelectorAll(
            "nav[aria-label='breadcrumb'] a, nav[aria-label='breadcrumb'] span",
          );
          if (crumbs.length) return crumbs[crumbs.length - 1]?.textContent?.trim() ?? "";
          return "";
        })
        .catch(() => "");
      const title = (await page.title()).replace(/ — Solutek Hub$/, "").trim();
      captions[filename] = caption || title || `Tela ${i}`;
      console.error(`  ✓ ${out}`);
    } catch (err) {
      console.error(`  ✗ ${url} — ${err.message}`);
    }
    i++;
  }
  // grava manifesto de legendas para o promote-shots
  await writeFile(join(dir, `${t.slug}.captions.json`), JSON.stringify(captions, null, 2), "utf8");
}

await browser.close();
console.error(`\nDone. Próximo passo: bun scripts/docs-promote-shots.mjs`);
