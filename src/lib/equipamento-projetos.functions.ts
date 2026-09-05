import { createServerFn } from "@tanstack/react-start";
import { friendlyDbError } from "@/lib/db-errors";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { PROJETO_DISCIPLINAS, PROJETO_STATUS } from "@/lib/engenharia.shared";

/* ============= LIST por equipamento (todas disciplinas) ============= */

export const listProjetosByEquipamento = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ equipamento_id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("equipamento_projetos")
      .select(
        "id, equipamento_id, cliente_id, disciplina, revisao, status, responsavel_id, liberado_por, liberado_em, hh_consumida, observacoes, oportunidade_id, processo_id, created_at, updated_at, oportunidades(codigo, titulo), processos(codigo, titulo)" as unknown as string,
      )
      .eq("equipamento_id", data.equipamento_id)
      .is("deleted_at", null)
      .order("disciplina")
      .order("created_at", { ascending: false });
    if (error) throw friendlyDbError(error);
    return rows ?? [];
  });


/* ============= LIST GLOBAL (mecanico ou eletrico) ============= */

const listAllInput = z.object({
  disciplina: z.enum(PROJETO_DISCIPLINAS),
  q: z.string().optional(),
  status: z.enum(["todos", ...PROJETO_STATUS]).optional().default("todos"),
  page: z.number().int().min(1).optional().default(1),
  per_page: z.number().int().min(1).max(100).optional().default(50),
});

export const listAllProjetos = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => listAllInput.parse(input))
  .handler(async ({ data, context }) => {
    const from = (data.page - 1) * data.per_page;
    const to = from + data.per_page - 1;
    let q = context.supabase
      .from("equipamento_projetos")
      .select(
        "id, equipamento_id, cliente_id, disciplina, revisao, status, responsavel_id, liberado_em, hh_consumida, updated_at, cliente_equipamentos!inner(codigo,modelo), clientes!inner(codigo,razao_social)",
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
    const { data: rows, count, error } = await q
      .order("updated_at", { ascending: false })
      .range(from, to);
    if (error) throw friendlyDbError(error);
    return { rows: rows ?? [], total: count ?? 0 };
  });

/* ============= CREATE revisão ============= */

const createInput = z.object({
  equipamento_id: z.string().uuid(),
  disciplina: z.enum(PROJETO_DISCIPLINAS),
  revisao: z.string().min(1).max(20),
  responsavel_id: z.string().uuid().nullable().optional(),
  observacoes: z.string().max(2000).nullable().optional(),
  oportunidade_id: z.string().uuid().nullable().optional(),
  processo_id: z.string().uuid().nullable().optional(),
});

export const createProjeto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => createInput.parse(input))
  .handler(async ({ data, context }) => {
    const { data: eqp, error: eqpErr } = await context.supabase
      .from("cliente_equipamentos")
      .select("id, cliente_id")
      .eq("id", data.equipamento_id)
      .single();
    if (eqpErr || !eqp) throw new Error("Equipamento não encontrado.");

    const { data: row, error } = await context.supabase
      .from("equipamento_projetos")
      .insert({
        equipamento_id: data.equipamento_id,
        cliente_id: eqp.cliente_id,
        disciplina: data.disciplina,
        revisao: data.revisao,
        status: "em_elaboracao",
        responsavel_id: data.responsavel_id ?? null,
        observacoes: data.observacoes ?? null,
        oportunidade_id: data.oportunidade_id ?? null,
        processo_id: data.processo_id ?? null,
        created_by: context.userId,
      } as never)
      .select("id")
      .single();
    if (error) throw friendlyDbError(error);
    return row;
  });

/* ============= LINK to oportunidade/processo (admin/manager) ============= */
const linkInput = z.object({
  id: z.string().uuid(),
  oportunidade_id: z.string().uuid().nullable().optional(),
  processo_id: z.string().uuid().nullable().optional(),
});

export const linkProjetoOrigem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => linkInput.parse(input))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    const { data: isManager } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "manager",
    });
    if (!isAdmin && !isManager) {
      throw new Error("Somente admin/gestor podem vincular a origem do projeto.");
    }
    const patch: Record<string, unknown> = { updated_by: context.userId };
    if (data.oportunidade_id !== undefined) patch.oportunidade_id = data.oportunidade_id;
    if (data.processo_id !== undefined) patch.processo_id = data.processo_id;
    const { error } = await context.supabase
      .from("equipamento_projetos")
      .update(patch as never)
      .eq("id", data.id);
    if (error) throw friendlyDbError(error);
    return { ok: true as const };
  });


/* ============= UPDATE ============= */

const updateInput = z.object({
  id: z.string().uuid(),
  revisao: z.string().min(1).max(20).optional(),
  status: z.enum(PROJETO_STATUS).optional(),
  responsavel_id: z.string().uuid().nullable().optional(),
  hh_consumida: z.number().min(0).optional(),
  observacoes: z.string().max(2000).nullable().optional(),
});

export const updateProjeto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => updateInput.parse(input))
  .handler(async ({ data, context }) => {
    const { id, status, ...rest } = data;

    // Liberar para produção exige manager/admin
    if (status === "liberado_producao") {
      const { data: isAdmin } = await context.supabase.rpc("has_role", {
        _user_id: context.userId,
        _role: "admin",
      });
      const { data: isManager } = await context.supabase.rpc("has_role", {
        _user_id: context.userId,
        _role: "manager",
      });
      if (!isAdmin && !isManager) {
        throw new Error("Somente administradores ou gestores podem liberar um projeto para produção.");
      }
    }

    const { error } = await context.supabase
      .from("equipamento_projetos")
      .update({
        ...rest,
        ...(status ? { status } : {}),
        updated_by: context.userId,
      })
      .eq("id", id);
    if (error) throw friendlyDbError(error);
    return { ok: true };
  });

export const removerProjeto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("equipamento_projetos")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw friendlyDbError(error);
    return { ok: true };
  });