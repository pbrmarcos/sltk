import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAdmin, assertAdminOrManager } from "@/lib/admin-guard";
import type { CapabilityStatus, DiagnosticoResumo } from "./system-diagnostics.server";

export type { CapabilityStatus, DiagnosticoResumo };

export const runDiagnostico = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { ids?: string[] } | undefined) => input ?? {})
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);

    const { runSystemDiagnostics } = await import("./system-diagnostics.server");
    return runSystemDiagnostics(data.ids);
  });

/**
 * Variante restrita para telas abertas a admin e manager (ex.: /admin/emails).
 * Só aceita capacidades de baixa sensibilidade — nunca supabase_service_role
 * nem outras que exponham detalhe de infraestrutura crítica.
 */
const LOW_SENSITIVITY_IDS = new Set(["resend", "groq", "google_drive", "firecrawl"]);

export const runDiagnosticoLimitado = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { ids: string[] }) => input)
  .handler(async ({ data, context }) => {
    await assertAdminOrManager(context.supabase, context.userId);

    const ids = data.ids.filter((id) => LOW_SENSITIVITY_IDS.has(id));
    if (!ids.length) throw new Error("Nenhuma capacidade válida solicitada.");

    const { runSystemDiagnostics } = await import("./system-diagnostics.server");
    return runSystemDiagnostics(ids);
  });
