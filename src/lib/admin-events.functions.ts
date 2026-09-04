/**
 * Server functions mínimas para registrar eventos do painel admin no
 * `audit_log` append-only. Reusam `supabaseAdmin` (service_role) via
 * `requireSupabaseAuth` para garantir que só usuários autenticados
 * escrevem — o próprio evento carrega o `user_id` do ator.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const denyInput = z.object({
  path: z.string().max(255),
  reason: z.string().max(120).optional().default("role_not_allowed"),
});

export const logAdminAccessDenied = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => denyInput.parse(input))
  .handler(async ({ data, context }) => {
    try {
      const { getCriticalClient } = await import("@/lib/supabase-client.server");
    const supabaseAdmin = await getCriticalClient();
      await supabaseAdmin.from("audit_log").insert({
        user_id: context.userId,
        table_name: "admin_events",
        record_id: context.userId,
        action: "INSERT",
        field_changed: "admin.access_denied",
        old_value: null as never,
        new_value: { path: data.path, reason: data.reason } as never,
      });
      return { ok: true as const };
    } catch (err) {
      console.error("[admin-events] access_denied insert failed", err);
      return { ok: false as const };
    }
  });

export const logAdminLogin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    try {
      const { getCriticalClient } = await import("@/lib/supabase-client.server");
    const supabaseAdmin = await getCriticalClient();
      await supabaseAdmin.from("audit_log").insert({
        user_id: context.userId,
        table_name: "admin_events",
        record_id: context.userId,
        action: "INSERT",
        field_changed: "admin.login",
        old_value: null as never,
        new_value: null as never,
      });
      return { ok: true as const };
    } catch (err) {
      console.error("[admin-events] login insert failed", err);
      return { ok: false as const };
    }
  });
