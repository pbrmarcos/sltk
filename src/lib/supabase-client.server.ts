// Helper ÚNICO para obtenção de clients Supabase no servidor.
//
// Regra do projeto:
//  - Ações NÃO CRÍTICAS  -> `getDataClient(userClient)`  (service role se disponível, senão RLS)
//  - Ações CRÍTICAS      -> `getCriticalClient()`        (exige service role; bloqueia com mensagem clara)
//  - Envoltório de ação  -> `withCriticalServiceRole(...)`/`safeAdminAction(...)`
//
// Nenhuma função de aplicação deve importar `@/integrations/supabase/client.server`
// diretamente: sempre passar por este módulo, para evitar erros técnicos em cascata
// do tipo "Missing Supabase environment variable(s): SUPABASE_SERVICE_ROLE_KEY".

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import {
  getServiceRoleStatus,
  ServiceRoleUnavailableError,
  type ServiceRoleStatus,
} from "./service-role-health.server";

export { ServiceRoleUnavailableError, getServiceRoleStatus };
export type { ServiceRoleStatus };
export type AdminSupabaseClient = SupabaseClient<Database>;

/** Mensagem única, amigável, exibida ao usuário quando a service role falta. */
export const SERVICE_ROLE_FALLBACK_MESSAGE =
  "Esta ação administrativa está temporariamente indisponível. Tente novamente em alguns instantes; os demais recursos continuam funcionando normalmente.";

/** Client de service role, ou `null` quando indisponível. Nunca lança. */
export async function getAdminClient(): Promise<AdminSupabaseClient | null> {
  const status = await getServiceRoleStatus();
  if (!status.ok) {
    console.warn(`[supabase] service role indisponível (${status.reason}): ${status.message}`);
    return null;
  }
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Toca o proxy para materializar o client e capturar erro aqui, não no call site.
    void supabaseAdmin.from;
    return supabaseAdmin;
  } catch (error) {
    console.error("[supabase] falha ao criar o client de service role:", error);
    return null;
  }
}

/**
 * Client para leituras/escritas comuns: usa service role quando disponível,
 * senão degrada para o client RLS do usuário autenticado.
 */
export async function getDataClient<T>(userClient: T): Promise<T> {
  const admin = await getAdminClient();
  return (admin as unknown as T) ?? userClient;
}

/**
 * Client para AÇÕES CRÍTICAS (Auth Admin, tokens públicos, sync externo,
 * escrita sem sessão de usuário). Lança `ServiceRoleUnavailableError`,
 * que deve ser convertido em mensagem amigável pelo call site
 * (ou automaticamente por `withCriticalServiceRole`).
 */
export async function getCriticalClient(): Promise<AdminSupabaseClient> {
  const status = await getServiceRoleStatus();
  if (!status.ok) throw new ServiceRoleUnavailableError(status);
  const admin = await getAdminClient();
  if (!admin) {
    throw new ServiceRoleUnavailableError({
      ok: false,
      reason: "invalid",
      message: SERVICE_ROLE_FALLBACK_MESSAGE,
      checkedAt: Date.now(),
    });
  }
  return admin;
}

export type CriticalResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; reason: string };

/**
 * Validação global no início de uma ação crítica.
 * Executa `run(admin)` apenas se a service role estiver válida; caso contrário
 * devolve `{ ok: false, error }` com mensagem segura — sem erro técnico.
 */
export async function withCriticalServiceRole<T>(
  actionName: string,
  run: (admin: AdminSupabaseClient) => Promise<T>,
): Promise<CriticalResult<T>> {
  const status = await getServiceRoleStatus();
  if (!status.ok) {
    console.error(`[critical:${actionName}] bloqueada — service role ${status.reason}`);
    return { ok: false, error: SERVICE_ROLE_FALLBACK_MESSAGE, reason: status.reason };
  }
  const admin = await getAdminClient();
  if (!admin) {
    return { ok: false, error: SERVICE_ROLE_FALLBACK_MESSAGE, reason: "invalid" };
  }
  return { ok: true, data: await run(admin) };
}

/**
 * Converte qualquer erro de service role em mensagem amigável, mantendo os
 * demais erros intactos. Use no `catch` de server functions críticas.
 */
export function toFriendlyServiceRoleError(error: unknown): Error {
  if (
    error instanceof ServiceRoleUnavailableError ||
    (error instanceof Error && /SUPABASE_SERVICE_ROLE_KEY/i.test(error.message))
  ) {
    return new Error(SERVICE_ROLE_FALLBACK_MESSAGE);
  }
  return error instanceof Error ? error : new Error(String(error));
}
