export const STATIC_SUPABASE_URL = "https://zdrjvjwvrxwxztvrxtwp.supabase.co";
export const STATIC_SUPABASE_PUBLISHABLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpkcmp2and2cnh3eHp0dnJ4dHdwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyMzI3MDksImV4cCI6MjA5NjgwODcwOX0.VhyBz09id7RJ4-oYknkxPT5wBRTwNJRHg1eSiZ267FM";

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
