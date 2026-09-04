import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright config para os testes E2E.
 *
 * Defina `E2E_BASE_URL` apontando para a preview/produção logada (ex.:
 * `https://id-preview--xxx.lovable.app`) e cookies de sessão do Supabase em
 * `E2E_STORAGE_STATE` (caminho para um JSON exportado via `bunx playwright
 * codegen`). Em CI sem essas variáveis os testes são pulados.
 */
const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:5173";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL,
    trace: "retain-on-failure",
    storageState: process.env.E2E_STORAGE_STATE,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});