/* eslint-disable @typescript-eslint/no-explicit-any */
// Configuração de SLA por (origem, prioridade) para chamados.
// Leitura permitida a admin/manager/engineer; escrita a admin/manager.

import { createServerFn } from "@tanstack/react-start";
import { friendlyDbError } from "@/lib/db-errors";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  assertEngineerOrHigher as assertReader,
  assertAdminOrManager as assertWriter,
} from "@/lib/admin-guard";

const ORIGENS = ["site_publico", "interno", "contato_site"] as const;
const PRIORIDADES = ["baixa", "media", "alta", "critica"] as const;

export const listSlaConfig = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as any;
    await assertReader(sb, context.userId);
    const { data, error } = await sb
      .from("chamado_sla_config")
      .select("origem, prioridade, resposta_horas, resolucao_horas, estagnado_horas, updated_at")
      .order("origem", { ascending: true })
      .order("prioridade", { ascending: true });
    if (error) throw friendlyDbError(error);
    return { rows: data ?? [] };
  });

const upsertSchema = z.object({
  origem: z.enum(ORIGENS),
  prioridade: z.enum(PRIORIDADES),
  resposta_horas: z
    .number()
    .int()
    .min(1)
    .max(24 * 60),
  resolucao_horas: z
    .number()
    .int()
    .min(1)
    .max(24 * 365),
  estagnado_horas: z
    .number()
    .int()
    .min(1)
    .max(24 * 365),
});

export const upsertSlaConfig = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => upsertSchema.parse(i))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    await assertWriter(sb, context.userId);
    const { error } = await sb.from("chamado_sla_config").upsert(
      {
        ...data,
        updated_at: new Date().toISOString(),
        updated_by: context.userId,
      },
      { onConflict: "origem,prioridade" },
    );
    if (error) throw friendlyDbError(error);
    return { ok: true };
  });
