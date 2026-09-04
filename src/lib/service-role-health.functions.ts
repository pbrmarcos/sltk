import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Status da chave de service role — apenas para usuários autenticados (diagnóstico). */
export const getServiceRoleHealth = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { getServiceRoleStatus } = await import("./service-role-health.server");
    const status = await getServiceRoleStatus();
    return status.ok
      ? { ok: true as const, reason: null, message: "Service role válida." }
      : { ok: false as const, reason: status.reason, message: status.message };
  });
