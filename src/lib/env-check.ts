/**
 * Boot-time guard that used to blank-screen-proof the app when
 * VITE_SUPABASE_URL/VITE_SUPABASE_PUBLISHABLE_KEY were missing. The Supabase
 * client is statically configured now, so there's nothing left to check —
 * kept as a no-op so callers don't need to change.
 */
export type EnvCheckResult = { ok: true } | { ok: false; missing: string[]; message: string };

export function checkClientEnv(): EnvCheckResult {
  return { ok: true };
}
