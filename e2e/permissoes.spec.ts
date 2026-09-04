import { test, expect } from "@playwright/test";

/**
 * Testes de integração da aba Permissões em /admin/usuarios.
 *
 * Requer:
 *   - E2E_BASE_URL → URL do ambiente (preview ou prod).
 *   - E2E_STORAGE_STATE → JSON de storageState com sessão admin logada.
 *
 * Sem essas variáveis o describe inteiro é pulado, mas a suíte permanece
 * "verde" para uso local / como scaffold de CI.
 */
const skip = !process.env.E2E_BASE_URL || !process.env.E2E_STORAGE_STATE;

test.describe("Permissões — bloqueio de combinações inválidas", () => {
  test.skip(
    skip,
    "Defina E2E_BASE_URL e E2E_STORAGE_STATE (admin logado) para rodar.",
  );

  test.beforeEach(async ({ page }) => {
    await page.goto("/admin/usuarios");
    await page.getByRole("tab", { name: /permiss/i }).click();
    await expect(page.getByRole("table")).toBeVisible();
  });

  test("Habilitar 'Qualidade' sem 'Processos' mostra erro estruturado com hint e sugestão", async ({ page }) => {
    // Encontra a linha do módulo qualidade e o switch da role engineer.
    const row = page.locator("tr", { hasText: /qualidade/i });
    const switchEl = row.locator("button[role='switch']").nth(2); // engineer (3ª col)
    // Garante estado conhecido: ligar dashboard primeiro para isolar a regra.
    const dashboardRow = page.locator("tr", { hasText: /dashboard/i });
    const dashboardSwitch = dashboardRow.locator("button[role='switch']").nth(2);
    if ((await dashboardSwitch.getAttribute("data-state")) !== "checked") {
      await dashboardSwitch.click();
    }
    await switchEl.click();

    const alert = page.getByTestId("permissoes-blocking-errors");
    await expect(alert).toBeVisible();

    const violation = page.getByTestId("permissoes-violation").first();
    await expect(violation).toContainText(/Qualidade.*requer.*Processos/i);
    await expect(violation.getByTestId("permissoes-violation-code")).toHaveText(
      "qualidade-requires-processos",
    );
    await expect(violation.getByTestId("permissoes-violation-fix")).toContainText(
      /Habilitar.*Processos/i,
    );

    // Botão "Salvar alterações" deve estar desabilitado enquanto houver erro.
    await expect(page.getByRole("button", { name: /salvar altera/i })).toBeDisabled();

    // Aplicar correção remove o erro.
    await violation.getByTestId("permissoes-violation-apply-fix").click();
    await expect(alert).toBeHidden();
    await expect(page.getByRole("button", { name: /salvar altera/i })).toBeEnabled();
  });

  test("Habilitar 'Administração' em role != manager bloqueia com código admin-only-manager", async ({ page }) => {
    const row = page.locator("tr", { hasText: /administra/i });
    // sales é a última coluna editável (7ª)
    const salesSwitch = row.locator("button[role='switch']").last();
    await salesSwitch.click();

    const violation = page
      .getByTestId("permissoes-violation")
      .filter({ hasText: "admin-only-manager" });
    await expect(violation).toBeVisible();
    await expect(violation.getByTestId("permissoes-violation-code")).toHaveText(
      "admin-only-manager",
    );
    await expect(violation.getByTestId("permissoes-violation-fix")).toContainText(
      /Desabilitar/i,
    );
  });
});