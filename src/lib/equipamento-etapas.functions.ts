import { createServerFn } from "@tanstack/react-start";
import { assertCanAccessModule } from "@/lib/admin-guard";
import { friendlyDbError } from "@/lib/db-errors";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { ETAPA_FASES, ETAPA_STATUS } from "@/lib/engenharia.shared";

export const listEquipamentoEtapas = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ equipamento_id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("equipamento_etapas")
      .select(
        "id, equipamento_id, cliente_id, ordem, nome, fase, data_inicio_prev, data_fim_prev, data_inicio_real, data_fim_real, hh_mecanica_estimada, hh_eletrica_estimada, hh_mecanica_real, hh_eletrica_real, progresso, status, predecessora_id, responsavel_id, observacoes, created_at, updated_at",
      )
      .eq("equipamento_id", data.equipamento_id)
      .is("deleted_at", null)
      .order("ordem", { ascending: true });
    if (error) throw friendlyDbError(error);
    return rows ?? [];
  });

const etapaInput = z.object({
  id: z.string().uuid().optional(),
  ordem: z.number().int().min(0),
  nome: z.string().min(1).max(200),
  fase: z.enum(ETAPA_FASES),
  data_inicio_prev: z.string().nullable().optional(),
  data_fim_prev: z.string().nullable().optional(),
  data_inicio_real: z.string().nullable().optional(),
  data_fim_real: z.string().nullable().optional(),
  hh_mecanica_estimada: z.number().min(0).default(0),
  hh_eletrica_estimada: z.number().min(0).default(0),
  hh_mecanica_real: z.number().min(0).default(0),
  hh_eletrica_real: z.number().min(0).default(0),
  progresso: z.number().int().min(0).max(100).default(0),
  status: z.enum(ETAPA_STATUS).default("pendente"),
  responsavel_id: z.string().uuid().nullable().optional(),
  observacoes: z.string().max(2000).nullable().optional(),
});

export const upsertEtapas = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        equipamento_id: z.string().uuid(),
        etapas: z.array(etapaInput),
        remove_ids: z.array(z.string().uuid()).optional().default([]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertCanAccessModule(context.supabase, context.userId, "engenharia");
    const { data: eqp, error: eqpErr } = await context.supabase
      .from("cliente_equipamentos")
      .select("id, cliente_id, modelo")
      .eq("id", data.equipamento_id)
      .single();
    if (eqpErr || !eqp) throw new Error("Equipamento não encontrado.");

    // Remover etapas marcadas
    if (data.remove_ids.length) {
      const { error } = await context.supabase
        .from("equipamento_etapas")
        .update({ deleted_at: new Date().toISOString() })
        .in("id", data.remove_ids);
      if (error) throw friendlyDbError(error);
    }

    // Estado anterior das etapas existentes — usado só pra decidir quais
    // e-mails disparar (atribuição/conclusão), não afeta a gravação.
    const idsExistentes = data.etapas.filter((e) => e.id).map((e) => e.id as string);
    const anteriorPorId: Record<string, { responsavel_id: string | null; status: string }> = {};
    if (idsExistentes.length) {
      const { data: existentes } = await context.supabase
        .from("equipamento_etapas")
        .select("id, responsavel_id, status")
        .in("id", idsExistentes);
      for (const r of existentes ?? []) {
        anteriorPorId[(r as any).id] = {
          responsavel_id: (r as any).responsavel_id,
          status: (r as any).status,
        };
      }
    }

    // Upsert (insert ou update)
    for (const e of data.etapas) {
      const payload = {
        equipamento_id: data.equipamento_id,
        cliente_id: eqp.cliente_id,
        ordem: e.ordem,
        nome: e.nome,
        fase: e.fase,
        data_inicio_prev: e.data_inicio_prev || null,
        data_fim_prev: e.data_fim_prev || null,
        data_inicio_real: e.data_inicio_real || null,
        data_fim_real: e.data_fim_real || null,
        hh_mecanica_estimada: e.hh_mecanica_estimada,
        hh_eletrica_estimada: e.hh_eletrica_estimada,
        hh_mecanica_real: e.hh_mecanica_real,
        hh_eletrica_real: e.hh_eletrica_real,
        progresso: e.progresso,
        status: e.status,
        responsavel_id: e.responsavel_id ?? null,
        observacoes: e.observacoes ?? null,
        updated_by: context.userId,
      };
      const anterior = e.id ? anteriorPorId[e.id] : undefined;
      let etapaId = e.id;
      if (e.id) {
        const { error } = await context.supabase
          .from("equipamento_etapas")
          .update(payload)
          .eq("id", e.id);
        if (error) throw friendlyDbError(error);
      } else {
        const { data: nova, error } = await context.supabase
          .from("equipamento_etapas")
          .insert({ ...payload, created_by: context.userId })
          .select("id")
          .single();
        if (error) throw friendlyDbError(error);
        etapaId = (nova as { id: string } | null)?.id;
      }

      const atribuiuAgora = !!e.responsavel_id && e.responsavel_id !== anterior?.responsavel_id;
      const concluiuAgora = e.status === "concluida" && anterior?.status !== "concluida";
      if (etapaId && (atribuiuAgora || concluiuAgora)) {
        try {
          const { safeDispatch, appUrl } = await import("@/lib/email/safe-dispatch.server");
          const vars = {
            etapa_nome: e.nome,
            projeto: (eqp as any).modelo ?? "",
            prazo: e.data_fim_prev ?? "",
            link: appUrl(`/engenharia/etapas?equipamento_id=${data.equipamento_id}`),
          };
          if (atribuiuAgora) {
            await safeDispatch({
              eventKey: "etapa.atribuida",
              triggeredBy: context.userId,
              entityTable: "equipamento_etapas",
              entityId: etapaId,
              vars,
            });
          }
          if (concluiuAgora) {
            await safeDispatch({
              eventKey: "etapa.concluida",
              triggeredBy: context.userId,
              entityTable: "equipamento_etapas",
              entityId: etapaId,
              vars,
            });
          }
        } catch (err) {
          console.error("[etapas/upsertEtapas] email dispatch failed", err);
        }
      }
    }
    return { ok: true };
  });
