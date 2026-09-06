/**
 * Server functions admin pra gravar/remover credenciais de integração no
 * Vault (src/lib/secrets.server.ts) — a parte "escrita" da tela Chaves &
 * Diagnóstico, que até aqui só lia status (src/lib/system-diagnostics.*).
 *
 * Nunca devolvem o valor da credencial pro client, nunca gravam o valor
 * no audit_log (só o nome da variável e quem alterou).
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAdmin } from "@/lib/admin-guard";
import { CAPABILITIES } from "@/lib/system-keys";

/**
 * Nomes que o app precisa pra sequer conectar no Supabase — não fazem
 * sentido "guardados no banco" que eles mesmos permitem alcançar.
 */
const PROIBIDOS = new Set([
  "SUPABASE_URL",
  "SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_PROJECT_ID",
  "SUPABASE_SERVICE_ROLE_KEY",
]);

const NOMES_VALIDOS = new Set(
  CAPABILITIES.flatMap((c) => [...c.envs, ...(c.envsOpcionais ?? [])]).filter(
    (n) => !PROIBIDOS.has(n),
  ),
);

function assertNomeValido(name: string) {
  if (!NOMES_VALIDOS.has(name)) {
    throw new Error(
      PROIBIDOS.has(name)
        ? `"${name}" precisa continuar como variável de ambiente — não pode ser guardada aqui.`
        : `"${name}" não é uma credencial reconhecida pelo sistema.`,
    );
  }
}

export const adminSetSecret = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ name: z.string().min(1).max(200), value: z.string().min(1).max(20000) }).parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    assertNomeValido(data.name);

    const { setSecret } = await import("@/lib/secrets.server");
    await setSecret(data.name, data.value);

    const { logAuditServer } = await import("@/lib/audit.server");
    await logAuditServer(context.supabase as any, context.userId, {
      table_name: "system_secrets",
      record_id: data.name,
      action: "UPDATE",
      field_changed: data.name,
      new_value: "configurado",
    });

    return { ok: true as const };
  });

export const adminDeleteSecret = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ name: z.string().min(1).max(200) }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    assertNomeValido(data.name);

    const { deleteSecret } = await import("@/lib/secrets.server");
    await deleteSecret(data.name);

    const { logAuditServer } = await import("@/lib/audit.server");
    await logAuditServer(context.supabase as any, context.userId, {
      table_name: "system_secrets",
      record_id: data.name,
      action: "DELETE",
      field_changed: data.name,
      new_value: "removido",
    });

    return { ok: true as const };
  });
