import { test, expect } from "@playwright/test";

/**
 * Admin — layout, guard de papel e redirect padrão de /admin.
 *
 * Reescrito para a estrutura atual (menu de categorias + módulos filtrados
 * por papel via `firstAccessibleAdminRoute`, ver src/components/admin/
 * SettingsNav.tsx e src/routes/_authenticated/admin.tsx). O spec anterior
 * testava uma versão de /admin anterior a essa reorganização (headings
 * "painel administrativo" e links "Permissões"/"Flags" que não existem
 * mais) — as strings abaixo foram conferidas direto no código-fonte atual,
 * não adivinhadas, mas ainda não foram rodadas de ponta a ponta contra uma
 * instância real (sem browser interativo neste ambiente) — vale uma
 * conferência manual antes de confiar 100% nelas.
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

test.describe("Admin — layout e guard", () => {
  test.skip(!BASE, "Defina E2E_BASE_URL e storage states por role.");

  test("usuário sem role permitida em /admin → Acesso restrito", async ({ browser }) => {
    test.skip(!S_NOROLE, "Defina E2E_STORAGE_NOROLE.");
    const ctx = await browser.newContext({ storageState: S_NOROLE });
    const page = await ctx.newPage();
    await page.goto("/admin");
    await expect(page.getByRole("heading", { name: "Acesso restrito" })).toBeVisible();
    await expect(
      page.getByText(/reservado a administradores, gestores e engenharia/i),
    ).toBeVisible();
    await ctx.close();
  });

  test("engineer em /admin → redireciona para /admin/usuarios (aba Redefinir senha)", async ({
    browser,
  }) => {
    test.skip(!S_ENGINEER, "Defina E2E_STORAGE_ENGINEER.");
    const ctx = await browser.newContext({ storageState: S_ENGINEER });
    const page = await ctx.newPage();
    await page.goto("/admin");
    await page.waitForURL("**/admin/usuarios**");
    // Engineer não é admin: não vê as abas "Usuários"/"Permissões", só o reset de senha.
    await expect(page.getByRole("tab", { name: "Usuários" })).toHaveCount(0);
    await expect(page.getByRole("tab", { name: "Permissões" })).toHaveCount(0);
    await ctx.close();
  });

  test("manager em /admin → redireciona para /admin/usuarios (aba Redefinir senha)", async ({
    browser,
  }) => {
    test.skip(!S_MANAGER, "Defina E2E_STORAGE_MANAGER.");
    const ctx = await browser.newContext({ storageState: S_MANAGER });
    const page = await ctx.newPage();
    await page.goto("/admin");
    await page.waitForURL("**/admin/usuarios**");
    await expect(page.getByRole("tab", { name: "Usuários" })).toHaveCount(0);
    await expect(page.getByRole("tab", { name: "Permissões" })).toHaveCount(0);
    await ctx.close();
  });

  test("admin em /admin → redireciona para /admin/configuracoes (Painel)", async ({ browser }) => {
    test.skip(!S_ADMIN, "Defina E2E_STORAGE_ADMIN.");
    const ctx = await browser.newContext({ storageState: S_ADMIN });
    const page = await ctx.newPage();
    await page.goto("/admin");
    await page.waitForURL("**/admin/configuracoes**");
    await expect(page.getByRole("heading", { name: "Painel" })).toBeVisible();
    // KPI real de AdministracaoTab.tsx — confirma que o painel carregou de verdade.
    await expect(page.getByText("Chamados fora do SLA")).toBeVisible();
    await ctx.close();
  });

  test("admin.login não é gravado 2x na mesma sessão", async ({ browser }) => {
    test.skip(!S_ADMIN, "Defina E2E_STORAGE_ADMIN.");
    const ctx = await browser.newContext({ storageState: S_ADMIN });
    const page = await ctx.newPage();
    await page.goto("/admin");
    await page.reload();
    const flag = await page.evaluate(() => window.sessionStorage.getItem("sltk_admin_logged"));
    expect(flag).toBe("1");
    await ctx.close();
  });

  test("guard legado: sem role permitida em /admin/usuarios → Acesso restrito", async ({
    browser,
  }) => {
    test.skip(!S_NOROLE, "Defina E2E_STORAGE_NOROLE.");
    const ctx = await browser.newContext({ storageState: S_NOROLE });
    const page = await ctx.newPage();
    await page.goto("/admin/usuarios");
    await expect(page.getByRole("heading", { name: "Acesso restrito" })).toBeVisible();
    await ctx.close();
  });
});
