import { createServerFn } from "@tanstack/react-start";
import { assertCanAccessModule } from "@/lib/admin-guard";
import { friendlyDbError } from "@/lib/db-errors";
import { logAuditServer } from "@/lib/audit.server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  REVISAO_DISCIPLINAS,
  REVISAO_STATUS,
  REVISAO_STATUS_LABEL,
  type RevisaoStatus,
} from "@/lib/engenharia.shared";

const DECIDIDOS: readonly RevisaoStatus[] = ["aprovada", "aprovada_com_ressalvas", "reprovada"];

const listAllInput = z.object({
  disciplina: z.enum(REVISAO_DISCIPLINAS),
  q: z.string().optional(),
  status: z
    .enum(["todos", ...REVISAO_STATUS])
    .optional()
    .default("todos"),
  page: z.number().int().min(1).optional().default(1),
  per_page: z.number().int().min(1).max(100).optional().default(50),
});

export const listAllRevisoes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => listAllInput.parse(input))
  .handler(async ({ data, context }) => {
    const from = (data.page - 1) * data.per_page;
    const to = from + data.per_page - 1;
    let q = context.supabase
      .from("equipamento_revisoes")
      .select(
        "id, equipamento_id, cliente_id, disciplina, numero, status, projeto_id, inspetor_id, data_inspecao, itens_verificados, itens_totais, nao_conformidades, updated_at, cliente_equipamentos!inner(codigo,modelo), clientes!inner(codigo,razao_social)",
        { count: "exact" },
      )
      .eq("disciplina", data.disciplina)
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
  disciplina: z.enum(REVISAO_DISCIPLINAS),
  numero: z.number().int().min(1).optional().default(1),
  projeto_id: z.string().uuid().nullable().optional(),
  inspetor_id: z.string().uuid().nullable().optional(),
  observacoes: z.string().max(2000).nullable().optional(),
});

export const createRevisao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => createInput.parse(input))
  .handler(async ({ data, context }) => {
    await assertCanAccessModule(context.supabase, context.userId, "qualidade");
    const { data: eqp, error: eqpErr } = await context.supabase
      .from("cliente_equipamentos")
      .select("id, cliente_id")
      .eq("id", data.equipamento_id)
      .single();
    if (eqpErr || !eqp) throw new Error("Equipamento não encontrado.");
    const { data: row, error } = await context.supabase
      .from("equipamento_revisoes")
      .insert({
        equipamento_id: data.equipamento_id,
        cliente_id: eqp.cliente_id,
        disciplina: data.disciplina,
        numero: data.numero ?? 1,
        projeto_id: data.projeto_id ?? null,
        inspetor_id: data.inspetor_id ?? null,
        observacoes: data.observacoes ?? null,
        created_by: context.userId,
      })
      .select("id")
      .single();
    if (error) throw friendlyDbError(error);
    return row;
  });

const updateInput = z.object({
  id: z.string().uuid(),
  status: z.enum(REVISAO_STATUS).optional(),
  data_inspecao: z.string().nullable().optional(),
  inspetor_id: z.string().uuid().nullable().optional(),
  itens_verificados: z.number().int().min(0).optional(),
  itens_totais: z.number().int().min(0).optional(),
  nao_conformidades: z.number().int().min(0).optional(),
  observacoes: z.string().max(2000).nullable().optional(),
});

export const updateRevisao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => updateInput.parse(input))
  .handler(async ({ data, context }) => {
    await assertCanAccessModule(context.supabase, context.userId, "qualidade");
    const { id, ...rest } = data;

    const { data: before } = await context.supabase
      .from("equipamento_revisoes")
      .select("status, disciplina, equipamento_id")
      .eq("id", id)
      .maybeSingle();

    const { error } = await context.supabase
      .from("equipamento_revisoes")
      .update({ ...rest, updated_by: context.userId })
      .eq("id", id);
    if (error) throw friendlyDbError(error);

    const novoStatus = rest.status;
    const decidida =
      !!novoStatus && DECIDIDOS.includes(novoStatus) && before?.status !== novoStatus;
    if (decidida) {
      await logAuditServer(context.supabase as any, context.userId, {
        table_name: "equipamento_revisoes",
        record_id: id,
        action: "UPDATE",
        field_changed: "status",
        old_value: before?.status ?? null,
        new_value: novoStatus,
      });

      try {
        const { safeDispatch, appUrl } = await import("@/lib/email/safe-dispatch.server");
        const { data: eq } = before?.equipamento_id
          ? await context.supabase
              .from("cliente_equipamentos")
              .select("codigo, modelo")
              .eq("id", before.equipamento_id)
              .maybeSingle()
          : { data: null };
        const rota =
          before?.disciplina === "eletrica"
            ? "/qualidade/revisao-eletrica"
            : "/qualidade/revisao-mecanica";
        await safeDispatch({
          eventKey: "revisao.decidida",
          triggeredBy: context.userId,
          entityTable: "equipamento_revisoes",
          entityId: id,
          vars: {
            codigo: (eq as { codigo?: string } | null)?.codigo ?? "",
            modelo: (eq as { modelo?: string } | null)?.modelo ?? "",
            decisao: REVISAO_STATUS_LABEL[novoStatus as RevisaoStatus] ?? String(novoStatus),
            link: appUrl(rota),
          },
        });
      } catch (e) {
        console.error("[revisoes/updateRevisao] email dispatch failed", e);
      }
    }

    return { ok: true };
  });

export const removerRevisao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertCanAccessModule(context.supabase, context.userId, "qualidade");
    const { error } = await context.supabase
      .from("equipamento_revisoes")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw friendlyDbError(error);
    return { ok: true };
  });
