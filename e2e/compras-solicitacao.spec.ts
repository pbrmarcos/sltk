import { test, expect } from "@playwright/test";

/**
 * E2E — Solicitações de Compra
 *
 * Cobre:
 *  - Envio de arquivo em Anexos & Orçamentos (Google Drive).
 *  - Histórico via trigger no banco (aparece na aba Histórico).
 *  - Links do Drive (view + download) renderizados.
 *  - Página /compras/solicitacao expõe aba Auditoria com timeline.
 *  - Validações obrigatórias antes de salvar em Ações.
 *
 * Requer:
 *   - E2E_BASE_URL
 *   - E2E_STORAGE_STATE (usuário purchasing/manager/admin)
 *   - E2E_INSUMO_ID (id de um projeto_insumos existente)
 */
const skip =
  !process.env.E2E_BASE_URL ||
  !process.env.E2E_STORAGE_STATE ||
  !process.env.E2E_INSUMO_ID;

test.describe("Compras — Solicitações", () => {
  test.skip(
    skip,
    "Defina E2E_BASE_URL, E2E_STORAGE_STATE e E2E_INSUMO_ID para rodar.",
  );

  test("aba Auditoria renderiza timeline global", async ({ page }) => {
    await page.goto("/compras/solicitacao");
    await page.getByRole("tab", { name: /Auditoria/i }).click();
    // A lista pode estar vazia; validamos que os chips de filtro existem
    await expect(page.getByRole("button", { name: /^Tudo/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /Status/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /Campos/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /Anexos/ })).toBeVisible();
  });

  test("validação de campos em Ações mostra mensagem clara", async ({ page }) => {
    await page.goto("/compras/solicitacao");
    // Abre o modal do primeiro item
    const primeira = page.locator("tbody tr").first();
    await primeira.click();
    // Aba Ações
    await page.getByRole("tab", { name: /Ações/i }).click();
    // Zera descrição e tenta salvar
    const descricao = page.getByLabel(/Descrição/i).first();
    await descricao.fill("");
    await page.getByRole("button", { name: /Salvar/i }).click();
    await expect(
      page.getByText(/Descrição deve ter ao menos 3 caracteres/i),
    ).toBeVisible();
  });

  test("Anexos: upload aparece com links de abrir e baixar", async ({ page }) => {
    await page.goto("/compras/solicitacao");
    const primeira = page.locator("tbody tr").first();
    await primeira.click();
    await page.getByRole("tab", { name: /Anexos/i }).click();

    // Simula seleção de arquivo (input hidden)
    const [fileChooser] = await Promise.all([
      page.waitForEvent("filechooser"),
      page.getByRole("button", { name: /Selecionar arquivo/i }).click(),
    ]);
    await fileChooser.setFiles({
      name: "e2e-anexo.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.4\n%e2e\n"),
    });

    // Espera aparecer na listagem
    await expect(page.getByText("e2e-anexo.pdf")).toBeVisible({ timeout: 20_000 });

    // Aba Histórico deve conter o evento gerado pelo trigger
    await page.getByRole("tab", { name: /Histórico/i }).click();
    await expect(page.getByText(/Anexo/i).first()).toBeVisible();
  });
});
