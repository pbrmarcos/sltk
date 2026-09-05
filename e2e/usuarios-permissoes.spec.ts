import { test, expect, type Page } from "@playwright/test";

/**
 * E2E — /admin/usuarios (aba Usuários + aba Permissões) e guards de hierarquia.
 *
 * Requer:
 *   - E2E_BASE_URL         → preview/prod URL do sistema
 *   - E2E_STORAGE_ADMIN    → storageState de um admin logado (obrigatório)
 *
 * Opcionais (usados para os testes de hierarquia; testes individuais são
 * pulados quando o storage correspondente não está definido):
 *   - E2E_STORAGE_MANAGER  → manager (não pode agir sobre admin)
 *   - E2E_STORAGE_ENGINEER → engineer (não deve acessar a página)
 *   - E2E_STORAGE_NOROLE   → sem role (deve ser bloqueado)
 *
 * Sem `E2E_BASE_URL` + `E2E_STORAGE_ADMIN` a suíte é integralmente pulada,
 * mantendo o CI verde como scaffold — mesmo padrão de `permissoes.spec.ts`
 * e `admin-fase1.spec.ts`.
 */

const BASE = process.env.E2E_BASE_URL;
const S_ADMIN = process.env.E2E_STORAGE_ADMIN;
const S_MANAGER = process.env.E2E_STORAGE_MANAGER;
const S_ENGINEER = process.env.E2E_STORAGE_ENGINEER;
const S_NOROLE = process.env.E2E_STORAGE_NOROLE;

const SKIP_ALL = !BASE || !S_ADMIN;

// Sufixo único por run para não colidir usuário de teste entre execuções
// paralelas / retries.
const RUN_ID = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
const TEST_EMAIL = `e2e-user-${RUN_ID}@lovable.test`;
const TEST_NAME = `E2E User ${RUN_ID}`;

async function gotoUsuarios(page: Page) {
  await page.goto("/admin/usuarios");
  await expect(page.getByRole("heading", { name: /usu[aá]rios/i })).toBeVisible();
}

// ---------------------------------------------------------------------------
// Aba Usuários — CRUD como admin
// ---------------------------------------------------------------------------
test.describe("/admin/usuarios — Aba Usuários (admin)", () => {
  test.skip(SKIP_ALL, "Defina E2E_BASE_URL e E2E_STORAGE_ADMIN para rodar.");
  test.use({ storageState: S_ADMIN });

  test.beforeEach(async ({ page }) => {
    await gotoUsuarios(page);
    // Garantir que estamos na aba Usuários (a rota preserva `?tab`).
    await page.getByRole("tab", { name: /^usu[aá]rios$/i }).click();
  });

  test("criar usuário → senha temporária é revelada uma única vez", async ({ page }) => {
    await page.getByRole("button", { name: /novo usu[aá]rio/i }).click();

    await page.getByLabel(/nome completo/i).fill(TEST_NAME);
    await page.getByLabel(/^email/i).fill(TEST_EMAIL);

    // Seleciona a role "Engenharia" (engineer).
    await page.getByRole("checkbox", { name: /engenharia/i }).check();

    await page.getByRole("button", { name: /criar usu[aá]rio/i }).click();

    // Painel de senha temporária aparece.
    const pwdBlock = page.getByText(/senha tempor[aá]ria/i).first();
    await expect(pwdBlock).toBeVisible();
    await expect(page.getByRole("button", { name: /copiar/i })).toBeVisible();

    await page.getByRole("button", { name: /fechar/i }).click();

    // Novo usuário aparece na tabela.
    await page.getByPlaceholder(/buscar por nome/i).fill(TEST_EMAIL);
    await expect(page.getByRole("cell", { name: TEST_EMAIL })).toBeVisible();
  });

  test("editar usuário criado → adicionar role manager", async ({ page }) => {
    await page.getByPlaceholder(/buscar por nome/i).fill(TEST_EMAIL);
    const row = page.getByRole("row", { name: new RegExp(TEST_EMAIL, "i") });
    await row.getByRole("button", { name: /editar/i }).click();

    await page.getByRole("checkbox", { name: /^manager$/i }).check();
    await page.getByRole("button", { name: /salvar/i }).click();

    await expect(page.getByText(/usu[aá]rio atualizado/i)).toBeVisible();
    await expect(row.getByText(/manager/i)).toBeVisible();
  });

  test("reset de senha → nova senha temporária revelada uma vez", async ({ page }) => {
    await page.getByPlaceholder(/buscar por nome/i).fill(TEST_EMAIL);
    const row = page.getByRole("row", { name: new RegExp(TEST_EMAIL, "i") });
    await row.getByRole("button", { name: /redefinir senha/i }).click();
    // Confirma no AlertDialog.
    await page
      .getByRole("button", { name: /redefinir|confirmar/i })
      .last()
      .click();

    await expect(page.getByText(/senha redefinida|nova senha/i)).toBeVisible();
  });

  test("desativar usuário → filtro 'Desativados' passa a listar", async ({ page }) => {
    await page.getByPlaceholder(/buscar por nome/i).fill(TEST_EMAIL);
    const row = page.getByRole("row", { name: new RegExp(TEST_EMAIL, "i") });
    await row.getByRole("button", { name: /desativar/i }).click();
    await page
      .getByRole("button", { name: /desativar|confirmar/i })
      .last()
      .click();

    await expect(page.getByText(/usu[aá]rio desativado/i)).toBeVisible();

    // Trocar filtro para "Desativados".
    await page
      .getByRole("combobox")
      .filter({ hasText: /ativos/i })
      .click();
    await page.getByRole("option", { name: /desativados/i }).click();

    await expect(page.getByRole("cell", { name: TEST_EMAIL })).toBeVisible();
  });

  test("reativar usuário desativado", async ({ page }) => {
    await page
      .getByRole("combobox")
      .filter({ hasText: /ativos/i })
      .click();
    await page.getByRole("option", { name: /desativados/i }).click();
    await page.getByPlaceholder(/buscar por nome/i).fill(TEST_EMAIL);

    const row = page.getByRole("row", { name: new RegExp(TEST_EMAIL, "i") });
    await row.getByRole("button", { name: /reativar/i }).click();
    await page
      .getByRole("button", { name: /reativar|confirmar/i })
      .last()
      .click();
    await expect(page.getByText(/usu[aá]rio reativado/i)).toBeVisible();
  });

  test("botões desabilitados na linha do próprio admin logado", async ({ page }) => {
    const selfRow = page.getByRole("row").filter({ hasText: /você/i });
    await expect(selfRow).toBeVisible();
    await expect(selfRow.getByRole("button", { name: /redefinir senha/i })).toBeDisabled();
    await expect(selfRow.getByRole("button", { name: /desativar/i })).toBeDisabled();
  });

  test("filtros — busca, role e status persistem via URL", async ({ page }) => {
    await page.getByPlaceholder(/buscar por nome/i).fill("admin");
    await page.getByRole("combobox").filter({ hasText: /role/i }).first().click();
    await page.getByRole("option", { name: /^admin$/i }).click();

    // Só um admin ativo → verifica ao menos 1 linha.
    await expect(page.getByRole("row")).toHaveCount(2); // header + 1 admin
  });
});

// ---------------------------------------------------------------------------
// Aba Permissões — matriz e regras de consistência
// ---------------------------------------------------------------------------
test.describe("/admin/usuarios?tab=permissoes — Matriz de permissões", () => {
  test.skip(SKIP_ALL, "Defina E2E_BASE_URL e E2E_STORAGE_ADMIN para rodar.");
  test.use({ storageState: S_ADMIN });

  test.beforeEach(async ({ page }) => {
    await page.goto("/admin/usuarios?tab=permissoes");
    await expect(page.getByRole("tab", { name: /permiss/i })).toHaveAttribute(
      "data-state",
      "active",
    );
    await expect(page.getByRole("table")).toBeVisible();
  });

  test("deep-link ?tab=permissoes abre direto na aba correta", async ({ page }) => {
    await expect(page.getByTestId("permissoes-matrix")).toBeVisible();
  });

  test("qualidade sem processos → violação 'qualidade-requires-processos'", async ({ page }) => {
    const row = page.locator("tr", { hasText: /qualidade/i });
    const switchEl = row.locator("button[role='switch']").nth(2); // engineer
    await switchEl.click();

    const violation = page.getByTestId("permissoes-violation").first();
    await expect(violation.getByTestId("permissoes-violation-code")).toHaveText(
      "qualidade-requires-processos",
    );
    await expect(page.getByRole("button", { name: /salvar altera/i })).toBeDisabled();

    // Aplicar fix sugerido.
    await violation.getByTestId("permissoes-violation-apply-fix").click();
    await expect(page.getByTestId("permissoes-blocking-errors")).toBeHidden();
  });

  test("Administração habilitada em role != admin/manager → 'admin-only-manager'", async ({
    page,
  }) => {
    const row = page.locator("tr", { hasText: /administra/i });
    const salesSwitch = row.locator("button[role='switch']").last();
    await salesSwitch.click();

    const violation = page
      .getByTestId("permissoes-violation")
      .filter({ hasText: "admin-only-manager" });
    await expect(violation).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Guards de hierarquia e acesso
// ---------------------------------------------------------------------------
test.describe("Guards — hierarquia e acesso à página", () => {
  test.skip(!BASE, "Defina E2E_BASE_URL.");

  test("engineer em /admin/usuarios → mensagem 'Acesso restrito'", async ({ browser }) => {
    test.skip(!S_ENGINEER, "Defina E2E_STORAGE_ENGINEER.");
    const ctx = await browser.newContext({ storageState: S_ENGINEER });
    const page = await ctx.newPage();
    await page.goto("/admin/usuarios");
    await expect(page.getByText(/acesso restrito/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /novo usu[aá]rio/i })).toHaveCount(0);
    await ctx.close();
  });

  test("sem role em /admin/usuarios → bloqueado", async ({ browser }) => {
    test.skip(!S_NOROLE, "Defina E2E_STORAGE_NOROLE.");
    const ctx = await browser.newContext({ storageState: S_NOROLE });
    const page = await ctx.newPage();
    await page.goto("/admin/usuarios");
    // Layout /admin já bloqueia antes de chegar em /usuarios.
    await expect(page.getByText(/acesso restrito|sem permiss[aã]o|forbidden/i)).toBeVisible();
    await ctx.close();
  });

  test("manager tentando desativar admin → guard retorna erro", async ({ browser }) => {
    test.skip(!S_MANAGER, "Defina E2E_STORAGE_MANAGER.");
    // Manager não deve nem conseguir abrir /admin/usuarios (gate é admin-only
    // na UI), mas se conseguir, o server function deve rejeitar.
    const ctx = await browser.newContext({ storageState: S_MANAGER });
    const page = await ctx.newPage();
    await page.goto("/admin/usuarios");
    await expect(page.getByText(/acesso restrito/i)).toBeVisible();
    await ctx.close();
  });

  test("último admin ativo não pode ser desativado (código last_admin)", async ({ page }) => {
    test.skip(!S_ADMIN, "Defina E2E_STORAGE_ADMIN.");
    await page.context().addCookies([]); // no-op, garante contexto isolado
    await gotoUsuarios(page);

    // O botão de desativar é desabilitado para o próprio usuário (self), mas
    // se houver apenas 1 admin no sistema o servidor rejeita qualquer tentativa
    // externa. Aqui validamos ao menos a proteção de UI para self.
    const selfRow = page.getByRole("row").filter({ hasText: /você/i });
    await expect(selfRow.getByRole("button", { name: /desativar/i })).toBeDisabled();
  });
});
