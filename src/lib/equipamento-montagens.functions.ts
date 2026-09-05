import { createServerFn } from "@tanstack/react-start";
import { assertCanAccessModule } from "@/lib/admin-guard";
import { friendlyDbError } from "@/lib/db-errors";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { MONTAGEM_STATUS } from "@/lib/engenharia.shared";

const listAllInput = z.object({
  q: z.string().optional(),
  status: z
    .enum(["todos", ...MONTAGEM_STATUS])
    .optional()
    .default("todos"),
  page: z.number().int().min(1).optional().default(1),
  per_page: z.number().int().min(1).max(100).optional().default(50),
});

export const listAllMontagens = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => listAllInput.parse(input))
  .handler(async ({ data, context }) => {
    const from = (data.page - 1) * data.per_page;
    const to = from + data.per_page - 1;
    let q = context.supabase
      .from("equipamento_montagens")
      .select(
        "id, equipamento_id, cliente_id, status, progresso, inicio_previsto, fim_previsto, inicio_real, fim_real, responsavel_id, updated_at, cliente_equipamentos!inner(codigo,modelo), clientes!inner(codigo,razao_social)",
        { count: "exact" },
      )
      .is("deleted_at", null);
    if (data.status && data.status !== "todos") q = q.eq("status", data.status);
    if (data.q && data.q.trim()) {
      const term = `%${data.q.trim()}%`;
      q = q.or(
        `cliente_equipamentos.modelo.ilike.${term},cliente_equipamentos.codigo.ilike.${term},clientes.razao_social.ilike.${term}`,
      );
    }
    const {
      data: rows,
      count,
      error,
    } = await q.order("updated_at", { ascending: false }).range(from, to);
    if (error) throw friendlyDbError(error);
    return { rows: rows ?? [], total: count ?? 0 };
  });

const createInput = z.object({
  equipamento_id: z.string().uuid(),
  inicio_previsto: z.string().nullable().optional(),
  fim_previsto: z.string().nullable().optional(),
  responsavel_id: z.string().uuid().nullable().optional(),
  observacoes: z.string().max(2000).nullable().optional(),
});

export const createMontagem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => createInput.parse(input))
  .handler(async ({ data, context }) => {
    await assertCanAccessModule(context.supabase, context.userId, "engenharia");
    const { data: eqp, error: eqpErr } = await context.supabase
      .from("cliente_equipamentos")
      .select("id, cliente_id, codigo, modelo")
      .eq("id", data.equipamento_id)
      .single();
    if (eqpErr || !eqp) throw new Error("Equipamento não encontrado.");
    const { data: row, error } = await context.supabase
      .from("equipamento_montagens")
      .insert({
        equipamento_id: data.equipamento_id,
        cliente_id: eqp.cliente_id,
        inicio_previsto: data.inicio_previsto ?? null,
        fim_previsto: data.fim_previsto ?? null,
        responsavel_id: data.responsavel_id ?? null,
        observacoes: data.observacoes ?? null,
        created_by: context.userId,
      })
      .select("id")
      .single();
    if (error) throw friendlyDbError(error);

    if (data.responsavel_id) {
      try {
        const { safeDispatch, appUrl } = await import("@/lib/email/safe-dispatch.server");
        await safeDispatch({
          eventKey: "montagem.card_atribuido",
          triggeredBy: context.userId,
          entityTable: "equipamento_montagens",
          entityId: row.id,
          vars: {
            card: `${(eqp as any).modelo ?? "Equipamento"} (${(eqp as any).codigo ?? ""})`,
            link: appUrl(`/producao/montagem`),
          },
        });
      } catch (e) {
        console.error("[montagens/createMontagem] email dispatch failed", e);
      }
    }

    return row;
  });

const updateInput = z.object({
  id: z.string().uuid(),
  status: z.enum(MONTAGEM_STATUS).optional(),
  progresso: z.number().int().min(0).max(100).optional(),
  inicio_previsto: z.string().nullable().optional(),
  fim_previsto: z.string().nullable().optional(),
  inicio_real: z.string().nullable().optional(),
  fim_real: z.string().nullable().optional(),
  responsavel_id: z.string().uuid().nullable().optional(),
  observacoes: z.string().max(2000).nullable().optional(),
});

export const updateMontagem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => updateInput.parse(input))
  .handler(async ({ data, context }) => {
    await assertCanAccessModule(context.supabase, context.userId, "engenharia");
    const { id, ...rest } = data;
    const { data: antes } = await context.supabase
      .from("equipamento_montagens")
      .select("status, responsavel_id, equipamento_id, cliente_equipamentos(codigo, modelo)")
      .eq("id", id)
      .maybeSingle();
    const { error } = await context.supabase
      .from("equipamento_montagens")
      .update({ ...rest, updated_by: context.userId })
      .eq("id", id);
    if (error) throw friendlyDbError(error);

    const atribuiuAgora = !!data.responsavel_id && data.responsavel_id !== (antes as any)?.responsavel_id;
    const bloqueouAgora = data.status === "bloqueada" && (antes as any)?.status !== "bloqueada";
    if (atribuiuAgora || bloqueouAgora) {
      try {
        const { safeDispatch, appUrl } = await import("@/lib/email/safe-dispatch.server");
        const eqp = (antes as any)?.cliente_equipamentos;
        const card = `${eqp?.modelo ?? "Equipamento"} (${eqp?.codigo ?? ""})`;
        if (atribuiuAgora) {
          await safeDispatch({
            eventKey: "montagem.card_atribuido",
            triggeredBy: context.userId,
            entityTable: "equipamento_montagens",
            entityId: id,
            vars: { card, link: appUrl(`/producao/montagem`) },
          });
        }
        if (bloqueouAgora) {
          await safeDispatch({
            eventKey: "montagem.card_bloqueado",
            triggeredBy: context.userId,
            entityTable: "equipamento_montagens",
            entityId: id,
            vars: { card, motivo: data.observacoes ?? "", link: appUrl(`/producao/montagem`) },
          });
        }
      } catch (e) {
        console.error("[montagens/updateMontagem] email dispatch failed", e);
      }
    }

    return { ok: true };
  });

export const removerMontagem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertCanAccessModule(context.supabase, context.userId, "engenharia");
    const { error } = await context.supabase
      .from("equipamento_montagens")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw friendlyDbError(error);
    return { ok: true };
  });
