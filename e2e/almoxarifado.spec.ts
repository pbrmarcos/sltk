import { test, expect } from "@playwright/test";

/**
 * E2E — Almoxarifado (Compras)
 *
 * Cobre o ciclo recebimento → reserva → baixa:
 *  - Painel de estoque carrega com KPIs e busca.
 *  - Painel de OCs mostra progresso do recebido e o que falta receber.
 *  - Ficha do item expõe saldo, reservado, disponível, custo médio e movimentos.
 *  - Retirada sem projeto é bloqueada; ajuste negativo exige justificativa.
 *
 * Requer:
 *   - E2E_BASE_URL
 *   - E2E_STORAGE_STATE (usuário purchasing/manager/admin)
 *   - E2E_ALMOX_ITEM (código ALM-##### de um item existente) — opcional
 */
const skip = !process.env.E2E_BASE_URL || !process.env.E2E_STORAGE_STATE;
const itemCodigo = process.env.E2E_ALMOX_ITEM;

test.describe("Compras — Almoxarifado", () => {
  test.skip(skip, "Defina E2E_BASE_URL e E2E_STORAGE_STATE para rodar.");

  test("painel de estoque carrega com indicadores e busca", async ({ page }) => {
    await page.goto("/compras/almoxarifado");
    await expect(page.getByRole("heading", { name: /Almoxarifado/i })).toBeVisible();
    await expect(page.getByText(/Itens ativos/i)).toBeVisible();
    await expect(page.getByText(/Abaixo do mínimo/i)).toBeVisible();
    const busca = page.getByPlaceholder(/Buscar/i).first();
    await busca.fill("ALM-");
    await expect(busca).toHaveValue("ALM-");
  });

  test("painel de ordens mostra recebido e pendente", async ({ page }) => {
    await page.goto("/compras/almoxarifado/ordens");
    await expect(page.getByText(/Ordens de compra/i).first()).toBeVisible();
    await expect(page.getByText(/falta receber|Pendente/i).first()).toBeVisible();
  });

  test("ficha do item mostra saldo, custo médio e movimentos", async ({ page }) => {
    test.skip(!itemCodigo, "Defina E2E_ALMOX_ITEM para rodar este teste.");
    await page.goto(`/compras/almoxarifado/${itemCodigo}`);
    await expect(page.getByText(/Custo médio/i).first()).toBeVisible();
    await expect(page.getByText(/Disponível/i).first()).toBeVisible();
    await page.getByRole("tab", { name: /Movimentos/i }).click();
    await expect(page.getByText(/Tipo|Quantidade/i).first()).toBeVisible();
  });

  test("retirada exige projeto e ajuste negativo exige justificativa", async ({ page }) => {
    test.skip(!itemCodigo, "Defina E2E_ALMOX_ITEM para rodar este teste.");
    await page.goto(`/compras/almoxarifado/${itemCodigo}`);

    await page.getByRole("button", { name: /Retirada/i }).click();
    await page.getByRole("button", { name: /Confirmar|Salvar|Lançar/i }).click();
    await expect(page.getByText(/projeto/i).first()).toBeVisible();
    await page.keyboard.press("Escape");

    await page.getByRole("button", { name: /Ajuste/i }).click();
    await expect(page.getByText(/justificativa/i).first()).toBeVisible();
  });
});
