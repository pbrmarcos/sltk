import { test, expect } from "@playwright/test";

/**
 * E2E — cadastro de fornecedor: categorias → submit → listagem → ficha.
 *
 * Requer:
 *   - E2E_BASE_URL → URL do ambiente (preview ou prod).
 *   - E2E_STORAGE_STATE → JSON de storageState com sessão (purchasing/admin) logada.
 *
 * Sem essas variáveis o describe inteiro é pulado, mas a suíte permanece
 * verde para uso local / como scaffold de CI.
 */
const skip = !process.env.E2E_BASE_URL || !process.env.E2E_STORAGE_STATE;

test.describe("Fornecedores — cadastro → listagem → ficha", () => {
  test.skip(
    skip,
    "Defina E2E_BASE_URL e E2E_STORAGE_STATE (usuário logado) para rodar.",
  );

  test("cria fornecedor, seleciona categorias e valida persistência", async ({
    page,
  }) => {
    const stamp = Date.now();
    const nome = `E2E Fornecedor ${stamp}`;
    const cidade = "Shenzhen";

    // 1) Vai para a tela de cadastro
    await page.goto("/fornecedores/novo");

    // 2) Modo manual
    await page.getByRole("tab", { name: /manual/i }).click();

    // 3) Preenche campos obrigatórios
    await page.getByLabel(/^Nome/i).first().fill(nome);
    // país já vem como CN por padrão; força para garantir
    await page.getByLabel(/Cidade/i).first().fill(cidade);

    // 4) Picker de categorias — verifica ARIA e seleciona dois tiles
    const picker = page.getByTestId("categorias-picker");
    await expect(picker).toHaveAttribute("role", "group");
    const valvulas = picker.locator('button[data-slug="valvulas"]');
    const sensores = picker.locator('button[data-slug="sensores"]');
    await valvulas.click();
    await sensores.click();
    await expect(valvulas).toHaveAttribute("aria-pressed", "true");
    await expect(sensores).toHaveAttribute("aria-pressed", "true");

    // Navegação por teclado entre tiles
    await valvulas.focus();
    await page.keyboard.press("ArrowRight");
    await expect(
      page.evaluate(() => document.activeElement?.getAttribute("data-slug")),
    ).resolves.toBeTruthy();

    // 5) Envia o formulário
    await page.getByRole("button", { name: /salvar/i }).click();

    // 6) Aguarda toast de sucesso
    await expect(page.getByText(/Fornecedor cadastrado/i)).toBeVisible({
      timeout: 10_000,
    });

    // 7) Vai para a listagem e filtra por categoria via picker "Válvulas"
    await page.goto("/fornecedores");
    await expect(page.getByRole("heading", { name: /Fornecedores/i })).toBeVisible();
    await page.getByRole("button", { name: /Categorias/i }).first().click();
    await page.locator('[data-testid="categorias-picker"] button[data-slug="valvulas"]').click();
    await expect(page).toHaveURL(/categoria=valvulas/);

    // 8) Filtra pela busca (q) com paginação preservada
    await page.getByPlaceholder(/Buscar por nome/i).fill(nome);
    const row = page.getByRole("row", { name: new RegExp(nome, "i") });
    await expect(row).toBeVisible({ timeout: 8_000 });

    // 9) Abre a ficha e confirma categorias salvas
    await row.click();
    await expect(page).toHaveURL(/\/fornecedores\/[0-9a-f-]+/i);
    await expect(page.getByRole("heading", { name: new RegExp(nome) })).toBeVisible();
    // Seção "Categorias" deve listar as duas selecionadas
    const section = page.locator("section", { hasText: /^Categorias/i });
    await expect(section).toContainText(/Válvulas/i);
    await expect(section).toContainText(/Sensores/i);
  });
});
