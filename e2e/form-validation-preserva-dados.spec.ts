import { test, expect } from "@playwright/test";

/**
 * E2E — erro de validação NÃO pode limpar os campos já preenchidos.
 *
 * Cenário: cadastro de cliente (/clientes/novo) com documento fiscal inválido.
 * Após o submit falhar, todos os demais campos digitados devem continuar
 * preenchidos e apenas as mensagens de erro devem aparecer.
 *
 * Requer E2E_BASE_URL e E2E_STORAGE_STATE (sessão logada).
 */
const skip = !process.env.E2E_BASE_URL || !process.env.E2E_STORAGE_STATE;

test.describe("Validação — dados digitados permanecem após erro", () => {
  test.skip(skip, "Defina E2E_BASE_URL e E2E_STORAGE_STATE para rodar.");

  test("submit com documento inválido preserva os demais campos", async ({ page }) => {
    const stamp = Date.now();
    const razao = `E2E Cliente ${stamp}`;
    const fantasia = `Fantasia ${stamp}`;
    const obs = `Observação de teste ${stamp}`;

    await page.goto("/clientes/novo");

    const razaoInput = page.locator('[name="razao_social"]');
    await razaoInput.waitFor();
    await razaoInput.fill(razao);
    await page.locator('[name="nome_fantasia"]').fill(fantasia);
    await page.locator('[name="observacoes"]').fill(obs);

    // Documento propositalmente inválido (CNPJ incompleto).
    const doc = page.locator('[name="documento_fiscal_numero"]');
    await doc.fill("123");
    await doc.blur();

    await page.getByRole("button", { name: /^Save$/ }).click();

    // Erro visível…
    await expect(page.getByText(/inválid|obrigat/i).first()).toBeVisible();

    // …e nenhum dado perdido.
    await expect(page.locator('[name="razao_social"]')).toHaveValue(razao);
    await expect(page.locator('[name="nome_fantasia"]')).toHaveValue(fantasia);
    await expect(page.locator('[name="observacoes"]')).toHaveValue(obs);
    await expect(page.locator('[name="documento_fiscal_numero"]')).not.toHaveValue("");

    // Continuamos na tela de cadastro (o modal/rota não foi remontado).
    await expect(page).toHaveURL(/\/clientes\/novo/);
  });

  test("consulta de documento que falha não apaga campos digitados", async ({ page }) => {
    const razao = `Digitado manualmente ${Date.now()}`;
    await page.goto("/clientes/novo");

    await page.locator('[name="razao_social"]').waitFor();
    await page.locator('[name="razao_social"]').fill(razao);
    await page.locator('[name="documento_fiscal_numero"]').fill("00000000000000");
    await page.waitForTimeout(2000); // debounce da auto-consulta + resposta

    await expect(page.locator('[name="razao_social"]')).toHaveValue(razao);
  });
});
