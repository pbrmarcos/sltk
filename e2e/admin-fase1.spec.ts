import { test, expect } from "@playwright/test";

/**
 * Fase 1 — Fundação do painel `/admin`.
 *
 * Requer storage states separados por role para rodar de verdade:
 *   E2E_BASE_URL, E2E_STORAGE_ADMIN, E2E_STORAGE_MANAGER,
 *   E2E_STORAGE_ENGINEER, E2E_STORAGE_NOROLE.
 *
 * Sem eles a suíte permanece verde como scaffold (mesmo padrão de
 * `permissoes.spec.ts`).
 */
const BASE = process.env.E2E_BASE_URL;
const S_ADMIN = process.env.E2E_STORAGE_ADMIN;
const S_MANAGER = process.env.E2E_STORAGE_MANAGER;
const S_ENGINEER = process.env.E2E_STORAGE_ENGINEER;
const S_NOROLE = process.env.E2E_STORAGE_NOROLE;

test.describe("Admin fase 1 — layout e guard", () => {
  test.skip(!BASE, "Defina E2E_BASE_URL e storage states por role.");

  test("usuário sem role permitida em /admin → 403 (Forbidden)", async ({ browser }) => {
    test.skip(!S_NOROLE, "Defina E2E_STORAGE_NOROLE.");
    const ctx = await browser.newContext({ storageState: S_NOROLE });
    const page = await ctx.newPage();
    await page.goto("/admin");
    await expect(
      page.getByText(/você não tem permissão para acessar esta área/i),
    ).toBeVisible();
    await ctx.close();
  });

  test("engineer em /admin → redirect para /admin/suporte", async ({ browser }) => {
    test.skip(!S_ENGINEER, "Defina E2E_STORAGE_ENGINEER.");
    const ctx = await browser.newContext({ storageState: S_ENGINEER });
    const page = await ctx.newPage();
    await page.goto("/admin");
    await page.waitForURL("**/admin/suporte");
    await ctx.close();
  });

  test("manager em /admin → Overview sem itens 'Permissões' e 'Flags'", async ({ browser }) => {
    test.skip(!S_MANAGER, "Defina E2E_STORAGE_MANAGER.");
    const ctx = await browser.newContext({ storageState: S_MANAGER });
    const page = await ctx.newPage();
    await page.goto("/admin");
    await expect(page.getByRole("heading", { name: /painel administrativo/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /^permissões$/i })).toHaveCount(0);
    await expect(page.getByRole("link", { name: /^flags$/i })).toHaveCount(0);
    await ctx.close();
  });

  test("admin em /admin → Overview com sidebar completa", async ({ browser }) => {
    test.skip(!S_ADMIN, "Defina E2E_STORAGE_ADMIN.");
    const ctx = await browser.newContext({ storageState: S_ADMIN });
    const page = await ctx.newPage();
    await page.goto("/admin");
    await expect(page.getByRole("heading", { name: /painel administrativo/i })).toBeVisible();
    // Itens em breve continuam visíveis mas desabilitados.
    await expect(page.getByText(/^Permissões$/)).toBeVisible();
    await expect(page.getByText(/^Flags$/)).toBeVisible();
    await ctx.close();
  });

  test("admin.login não é gravado 2x na mesma sessão", async ({ browser }) => {
    test.skip(!S_ADMIN, "Defina E2E_STORAGE_ADMIN.");
    const ctx = await browser.newContext({ storageState: S_ADMIN });
    const page = await ctx.newPage();
    await page.goto("/admin");
    await page.reload();
    const flag = await page.evaluate(() =>
      window.sessionStorage.getItem("sltk_admin_logged"),
    );
    expect(flag).toBe("1");
    await ctx.close();
  });

  test("guard legado: sem role permitida em /admin/usuarios → 403", async ({ browser }) => {
    test.skip(!S_NOROLE, "Defina E2E_STORAGE_NOROLE.");
    const ctx = await browser.newContext({ storageState: S_NOROLE });
    const page = await ctx.newPage();
    await page.goto("/admin/usuarios");
    await expect(page.getByText(/acesso restrito/i)).toBeVisible();
    await ctx.close();
  });
});
