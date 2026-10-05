// Configuração dos critérios de prospecção (perfil ideal, nichos proibidos,
// regras duras) usados pelo motor de qualificação de leads.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { friendlyDbError } from "@/lib/db-errors";
import { logAuditServer } from "@/lib/audit.server";

export type ProspeccaoConfigRow = {
  perfil_ideal: string;
  nichos_proibidos: string[];
  regras_duras: { sem_contato?: boolean; doc_inativo?: boolean; mei?: boolean };
  max_leads_auto: number;
  updated_at: string | null;
};

export const getProspeccaoConfig = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ProspeccaoConfigRow> => {
    const { data, error } = await (
      context.supabase as unknown as {
        from: (t: string) => {
          select: (c: string) => {
            eq: (
              c: string,
              v: number,
            ) => {
              maybeSingle: () => Promise<{ data: unknown; error: { message: string } | null }>;
            };
          };
        };
      }
    )
      .from("prospeccao_config")
      .select("perfil_ideal, nichos_proibidos, regras_duras, max_leads_auto, updated_at")
      .eq("id", 1)
      .maybeSingle();
    if (error) throw friendlyDbError(error as never);
    if (!data) throw new Error("Configuração de prospecção não encontrada.");
    return data as ProspeccaoConfigRow;
  });

const saveSchema = z.object({
  perfil_ideal: z.string().trim().min(10).max(4000),
  nichos_proibidos: z.array(z.string().trim().min(2).max(120)).max(40),
  regras_duras: z.object({
    sem_contato: z.boolean(),
    doc_inativo: z.boolean(),
    mei: z.boolean(),
  }),
  max_leads_auto: z.number().int().min(0).max(500),
});

export const saveProspeccaoConfig = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof saveSchema>) => saveSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { assertAdminOrManager } = await import("@/lib/admin-guard");
    await assertAdminOrManager(context.supabase, context.userId);

    const { getCriticalClient } = await import("@/lib/supabase-client.server");
    const admin = await getCriticalClient();
    const { error } = await (
      admin as unknown as {
        from: (t: string) => {
          update: (p: object) => {
            eq: (c: string, v: number) => Promise<{ error: { message: string } | null }>;
          };
        };
      }
    )
      .from("prospeccao_config")
      .update({ ...data, updated_at: new Date().toISOString(), updated_by: context.userId })
      .eq("id", 1);
    if (error) throw new Error(error.message);

    await logAuditServer(admin, context.userId, {
      table_name: "prospeccao_config",
      record_id: "1",
      action: "UPDATE",
      field_changed: "criterios",
      new_value: { max_leads_auto: data.max_leads_auto, nichos: data.nichos_proibidos.length },
    });
    return { ok: true as const };
  });
