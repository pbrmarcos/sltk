import { test, expect, type Page } from "@playwright/test";

/**
 * Regressão: a árvore autenticada NÃO pode remontar ao voltar para a aba.
 * Requer E2E_BASE_URL + E2E_STORAGE_STATE (sessão logada); sem isso, pula.
 */
const configured = !!process.env.E2E_BASE_URL && !!process.env.E2E_STORAGE_STATE;

test.describe("persistência de estado de formulário", () => {
  test.skip(!configured, "defina E2E_BASE_URL e E2E_STORAGE_STATE");

  /** Contador de montagens: cada remount da árvore React zera o marcador no DOM. */
  async function installMountCounter(page: Page) {
    await page.evaluate(() => {
      const w = window as unknown as { __mountCount?: number };
      w.__mountCount = (w.__mountCount ?? 0) + 1;
      const el = document.createElement("div");
      el.id = "e2e-mount-marker";
      el.style.display = "none";
      document.querySelector("main")?.appendChild(el);
    });
  }

  async function markerAlive(page: Page) {
    return page.evaluate(() => !!document.getElementById("e2e-mount-marker"));
  }

  test("troca de aba não desmonta a árvore nem limpa os campos", async ({ page, context }) => {
    await page.goto("/comercial/oportunidades");
    await page.waitForLoadState("networkidle");
    await installMountCounter(page);

    const novo = page.getByRole("button", { name: /nov[ao]/i }).first();
    await novo.click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    const campo = dialog.getByRole("textbox").first();
    await campo.fill("Teste E2E persistência");

    // 1) visibilitychange hidden -> visible
    await page.evaluate(() => {
      Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true });
      document.dispatchEvent(new Event("visibilitychange"));
      Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true });
      document.dispatchEvent(new Event("visibilitychange"));
      window.dispatchEvent(new Event("focus"));
    });
    await page.waitForTimeout(1000);
    await expect(dialog).toBeVisible();
    await expect(campo).toHaveValue("Teste E2E persistência");
    expect(await markerAlive(page)).toBe(true);

    // 2) segunda aba e volta
    const other = await context.newPage();
    await other.goto("about:blank");
    await page.bringToFront();
    await page.waitForTimeout(1000);
    await expect(campo).toHaveValue("Teste E2E persistência");
    expect(await markerAlive(page)).toBe(true);
    await other.close();

    // 3) refresh de token simulado
    await page.evaluate(() => window.dispatchEvent(new Event("online")));
    await page.waitForTimeout(1000);
    expect(await markerAlive(page)).toBe(true);
    await expect(campo).toHaveValue("Teste E2E persistência");
  });

  test('"Verificando permissões" aparece no máximo no primeiro carregamento', async ({ page }) => {
    const hits: number[] = [];
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");
    await installMountCounter(page);

    for (let i = 0; i < 3; i++) {
      await page.evaluate(() => {
        document.dispatchEvent(new Event("visibilitychange"));
        window.dispatchEvent(new Event("focus"));
      });
      await page.waitForTimeout(500);
      hits.push(await page.getByText(/Verificando permiss/i).count());
    }
    expect(hits.every((c) => c === 0)).toBe(true);
    expect(await markerAlive(page)).toBe(true);
  });
});
