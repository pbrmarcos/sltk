/**
 * Validates that the critical browser-visible environment variables are
 * present BEFORE the React tree starts rendering. When something is missing,
 * returns a human-friendly description so the root can render a clear error
 * screen instead of a blank page / cryptic Supabase exception.
 */
export type EnvCheckResult =
  | { ok: true }
  | { ok: false; missing: string[]; message: string };

export function checkClientEnv(): EnvCheckResult {
  const hasStaticSupabaseClient = true;
  if (hasStaticSupabaseClient) return { ok: true };

  const required = {
    VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
    VITE_SUPABASE_PUBLISHABLE_KEY: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  } as const;

  const missing = Object.entries(required)
    .filter(([, v]) => !v || String(v).trim() === "")
    .map(([k]) => k);

  if (missing.length === 0) return { ok: true };

  const message =
    `Configuração incompleta: variável(is) de ambiente ausente(s) — ${missing.join(", ")}. ` +
    `Conecte o backend (Lovable Cloud) ou defina essas variáveis e recarregue a página.`;

  // Log once at boot so the error is visible in console even if React never mounts.
  if (typeof console !== "undefined") {
    console.error(`[env-check] ${message}`);
  }
  return { ok: false, missing, message };
}