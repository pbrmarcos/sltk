// Fallback = projeto de produção (SLTK America PBR). Env vars sempre têm precedência.
export const STATIC_SUPABASE_URL = "https://ehuzvwzonmsqqbpvdyza.supabase.co";
export const STATIC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_e4Lei-_QM1wsUfaS_A1c0A_LJPE-htY";

type SupabasePublicConfig = {
  url: string;
  publishableKey: string;
};

function readRuntimeEnv() {
  return typeof process !== "undefined" ? process.env : {};
}

export function getSupabasePublicConfig(): SupabasePublicConfig {
  const env = readRuntimeEnv();
  return {
    url: env.SUPABASE_URL || env.VITE_SUPABASE_URL || STATIC_SUPABASE_URL,
    publishableKey:
      env.SUPABASE_PUBLISHABLE_KEY ||
      env.VITE_SUPABASE_PUBLISHABLE_KEY ||
      STATIC_SUPABASE_PUBLISHABLE_KEY,
  };
}
