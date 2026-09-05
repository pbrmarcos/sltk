// DEPRECATED: mantido apenas por compatibilidade de imports existentes.
// O padrão único do projeto é `@/lib/supabase-client.server`.

export {
  getAdminClient as getOptionalAdminClient,
  getDataClient as getDbClient,
  getCriticalClient as requireServiceRoleClient,
  withCriticalServiceRole,
  toFriendlyServiceRoleError,
  SERVICE_ROLE_FALLBACK_MESSAGE,
  ServiceRoleUnavailableError,
} from "./supabase-client.server";

export function hasServiceRoleKey(): boolean {
  return Boolean(
    (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL) &&
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}
