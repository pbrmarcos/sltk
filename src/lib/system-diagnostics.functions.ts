import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { CapabilityStatus, DiagnosticoResumo } from "./system-diagnostics.server";

export type { CapabilityStatus, DiagnosticoResumo };

export const runDiagnostico = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { ids?: string[] } | undefined) => input ?? {})
  .handler(async ({ data, context }) => {
    const { data: roles, error } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    if (!(roles ?? []).some((r) => r.role === "admin")) throw new Error("Acesso restrito.");

    const { runSystemDiagnostics } = await import("./system-diagnostics.server");
    return runSystemDiagnostics(data.ids);
  });
