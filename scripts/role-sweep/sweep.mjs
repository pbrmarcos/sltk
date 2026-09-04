#!/usr/bin/env node
/**
 * Role Sweep — visits every route allowed for each role, validates the sidebar
 * against roles.json, records divergences and screenshots them.
 *
 * Usage:
 *   bun scripts/role-sweep/sweep.mjs
 *
 * Env:
 *   ROLE_SWEEP_PASSWORD  password for all sweep accounts (default: !Senha123)
 *   ROLE_SWEEP_BASE      base URL (default: http://localhost:8080)
 *   ROLE_SWEEP_ROLES     comma-list to restrict which roles to run
 */
import { chromium } from "playwright";
import { mkdir, writeFile, rm, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { renderReport } from "./report.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = __dirname;
const SHOTS = path.join(ROOT, "screenshots");
const REPORTS = path.join(ROOT, "reports");
const BASE = process.env.ROLE_SWEEP_BASE ?? "http://localhost:8080";
const PASS = process.env.ROLE_SWEEP_PASSWORD ?? "!Senha123";
const NOISE = /(gpteng\.co|\/@vite|\/@fs|\/@react-refresh|hot-update|__hmr|\/favicon|source-map)/;

const config = JSON.parse(await readFile(path.join(ROOT, "roles.json"), "utf8"));
const only = (process.env.ROLE_SWEEP_ROLES ?? "").split(",").filter(Boolean);

await rm(SHOTS, { recursive: true, force: true });
await mkdir(SHOTS, { recursive: true });
await mkdir(REPORTS, { recursive: true });

/** @param {import('playwright').Page} page */
async function signIn(page, email) {
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1200); // let react-hook-form hydrate
  await page.fill("input#email", email);
  await page.fill("input#password", PASS);
  await page.click('button[type="submit"]');
  await page.waitForURL(/^http:\/\/localhost:8080\/(?!login).*/, { timeout: 20000 });
}

/** @param {import('playwright').Page} page */
async function readSidebar(page) {
  try {
    await page.waitForTimeout(2500); // sidebar depends on async module permissions
    const items = await page.$$eval(
      "aside a, nav a, [data-sidebar] a, aside [class*='uppercase'], nav [class*='uppercase']",
      (els) => els.map((el) => (el.textContent || "").trim()).filter(Boolean),
    );
    return Array.from(new Set(items));
  } catch {
    return [];
  }
}


async function shot(page, role, slug, tag) {
  const dir = path.join(SHOTS, role);
  if (!existsSync(dir)) await mkdir(dir, { recursive: true });
  const file = path.join(dir, `${slug}_${tag}.png`);
  try {
    await page.screenshot({ path: file });
    return path.relative(ROOT, file);
  } catch {
    return null;
  }
}

/** @param {import('playwright').Browser} browser */
async function runUser(browser, { email, role }) {
  const cfg = config.roles[role];
  if (!cfg) return { email, role, skipped: `unknown role ${role}` };
  const slug = email.split("@")[0];
  const result = {
    email, role, allowedTotal: cfg.allowed.length + config.common.length,
    login: false, divergences: [],
  };

  const context = await browser.newContext({ viewport: { width: 1280, height: 1800 } });
  const page = await context.newPage();
  const consoleErrors = [];
  const netErrors = [];
  page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text()); });
  page.on("response", (r) => {
    if (r.status() >= 400 && !NOISE.test(r.url())) netErrors.push({ url: r.url(), status: r.status() });
  });

  try {
    await signIn(page, email);
    result.login = true;
  } catch (e) {
    const s = await shot(page, role, slug, "login_fail");
    result.divergences.push({ path: "/login", category: "login", message: String(e?.message ?? e).slice(0, 240), screenshot: s });
    await context.close();
    return result;
  }

  // Sidebar check
  const sidebar = await readSidebar(page);
  const missing = (cfg.sidebar ?? []).filter((label) => !sidebar.some((s) => s.toLowerCase().includes(label.toLowerCase())));
  if (missing.length) {
    const s = await shot(page, role, slug, "sidebar");
    result.divergences.push({
      path: "/dashboard", category: "sidebar",
      message: `Missing sidebar items: ${missing.join(", ")}`, screenshot: s,
    });
  }

  const allow = [...config.common, ...cfg.allowed];
  for (const route of allow) {
    consoleErrors.length = 0; netErrors.length = 0;
    let status = null, finalUrl = "", body = "";
    try {
      const resp = await page.goto(`${BASE}${route}`, { waitUntil: "domcontentloaded", timeout: 15000 });
      status = resp?.status() ?? null;
      await page.waitForTimeout(700);
      finalUrl = page.url().replace(BASE, "");
      body = (await page.locator("body").innerText().catch(() => "")).slice(0, 2000);
    } catch (e) {
      const s = await shot(page, role, slug, route.replaceAll("/", "_") || "root");
      result.divergences.push({ path: route, category: "exception", message: String(e?.message ?? e).slice(0, 240), screenshot: s });
      continue;
    }

    const flags = [];
    if (status && status >= 500) flags.push({ category: "route-5xx", message: `HTTP ${status}` });
    else if (status && status >= 400) flags.push({ category: "route-4xx", message: `HTTP ${status}` });
    if (/Algo deu errado|Módulo não encontrado/i.test(body)) flags.push({ category: "boundary", message: "Error boundary visible" });
    if (/Acesso restrito|Sem permissão|Acesso negado/i.test(body)) flags.push({ category: "module-blocked", message: "Guard de módulo bloqueou uma rota permitida ao papel" });
    if (finalUrl.startsWith("/login") || (finalUrl === "/dashboard" && route !== "/dashboard")) {
      flags.push({ category: "redirect", message: `Redirected to ${finalUrl}` });
    }
    const bad = netErrors.filter((n) => !(n.status === 401 && n.url.includes("/api/")));
    if (bad.length) flags.push({ category: "route-5xx", message: `Network: ${bad.slice(0, 2).map((n) => `${n.status} ${n.url}`).join(" | ")}` });
    const realConsole = consoleErrors.filter((t) => !/Failed to fetch|AbortError/i.test(t));
    if (realConsole.length) flags.push({ category: "console", message: realConsole[0].slice(0, 240) });

    if (flags.length) {
      const s = await shot(page, role, slug, route.replaceAll("/", "_") || "root");
      for (const f of flags) result.divergences.push({ path: route, ...f, screenshot: s });
    }
  }

  // Denied routes — expect a redirect or gate
  for (const route of cfg.denied ?? []) {
    try {
      await page.goto(`${BASE}${route}`, { waitUntil: "domcontentloaded", timeout: 12000 });
      await page.waitForTimeout(3500);
      const finalUrl = page.url().replace(BASE, "");
      const body = (await page.locator("body").innerText().catch(() => "")).slice(0, 1000);
      const gated = finalUrl !== route || /Sem permissão|Acesso negado|Acesso restrito|Not authorized/i.test(body);
      if (!gated) {
        const s = await shot(page, role, slug, "leak_" + route.replaceAll("/", "_"));
        result.divergences.push({
          path: route, category: "denied-leak",
          message: `Route reachable but should be denied for role ${role}`, screenshot: s,
        });
      }
    } catch { /* denied via error is fine */ }
  }

  await context.close();
  return result;
}

const browser = await chromium.launch({
  headless: true,
  ...(process.env.ROLE_SWEEP_CHROME ? { executablePath: process.env.ROLE_SWEEP_CHROME } : {}),
});
const results = [];
try {
  for (const u of config.users) {
    if (only.length && !only.includes(u.role)) continue;
    process.stdout.write(`>>> ${u.email} (${u.role})\n`);
    const r = await runUser(browser, u);
    results.push(r);
    await writeFile(
      path.join(REPORTS, `${u.role}_${u.email.split("@")[0]}.json`),
      JSON.stringify(r, null, 2),
    );
  }
} finally {
  await browser.close();
}

const pkg = JSON.parse(await readFile(path.join(process.cwd(), "package.json"), "utf8").catch(() => "{}"));
await writeFile(path.join(REPORTS, "report.json"), JSON.stringify({
  generatedAt: new Date().toISOString(),
  appVersion: pkg.version ?? null,
  results,
}, null, 2));

const md = renderReport({ generatedAt: new Date().toISOString(), appVersion: pkg.version ?? null, results });
await writeFile(path.join(REPORTS, "report.md"), md);
console.log("\n" + md);

const divergences = results.reduce((a, r) => a + (r.divergences?.length ?? 0), 0);
process.exit(divergences > 0 ? 1 : 0);
