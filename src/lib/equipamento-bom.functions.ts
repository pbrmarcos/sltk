import { createServerFn } from "@tanstack/react-start";
import { friendlyDbError } from "@/lib/db-errors";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { DISCIPLINAS, type Disciplina } from "@/lib/equipamento-disciplina-etapas.functions";
import { assertAdminOrManager, assertCanAccessModule } from "@/lib/admin-guard";

type AnySb = any;

const listInput = z.object({
  equipamento_id: z.string().uuid(),
  disciplina: z.enum(DISCIPLINAS).optional(),
});

export const listEquipamentoBom = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => listInput.parse(i))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as AnySb;
    let q = sb
      .from("projeto_insumos")
      .select(
        "id, cliente_id, equipamento_id, equipamento_disciplina, disciplina, descricao, quantidade, unidade, criticidade, status, custo_estimado_unit, fornecedor_sugerido_id, observacoes, created_at, updated_at" +
          ", ordem_compra_itens!ordem_compra_itens_insumo_id_fkey(id, ordem_compra_id, ordens_compra(id, numero, status))",
      )
      .eq("equipamento_id", data.equipamento_id)
      .is("deleted_at", null)
      .order("created_at", { ascending: true });
    if (data.disciplina) q = q.eq("equipamento_disciplina", data.disciplina);
    const { data: rows, error } = await q;
    if (error) throw friendlyDbError(error);
    return (rows ?? []).map((r: any) => {
      const ocItens: any[] = Array.isArray(r.ordem_compra_itens) ? r.ordem_compra_itens : [];
      const oc = ocItens
        .map((oi) => oi?.ordens_compra)
        .find(
          (o) =>
            o && (o.status === "concluida" || o.status === "recebido" || o.status === "recebida"),
        );
      return {
        ...r,
        custo_unitario_estimado: r.custo_estimado_unit ?? null,
        custo_total_estimado:
          r.custo_estimado_unit == null
            ? null
            : Number(r.custo_estimado_unit) * Number(r.quantidade ?? 1),
        ordem_compra: oc ? { id: oc.id, numero: oc.numero, status: oc.status } : null,
      };
    });
  });

async function ensureProjetoForBom(
  sb: AnySb,
  equipamentoId: string,
  equipamentoDisciplina: Disciplina,
  userId: string,
) {
  const { data: eq, error: eqError } = await sb
    .from("cliente_equipamentos")
    .select("cliente_id")
    .eq("id", equipamentoId)
    .maybeSingle();
  if (eqError) throw friendlyDbError(eqError);
  if (!eq) throw new Error("Equipamento não encontrado");

  const projetoDisciplina = equipamentoDisciplina === "producao" ? "eletrico" : "mecanico";
  const { data: existing, error: selectError } = await sb
    .from("equipamento_projetos")
    .select("id")
    .eq("equipamento_id", equipamentoId)
    .eq("disciplina", projetoDisciplina)
    .eq("revisao", "R00")
    .maybeSingle();
  if (selectError) throw friendlyDbError(selectError);
  if (existing?.id) return { projeto_id: existing.id, cliente_id: eq.cliente_id };

  const { data: projeto, error: insertError } = await sb
    .from("equipamento_projetos")
    .insert({
      equipamento_id: equipamentoId,
      cliente_id: eq.cliente_id,
      disciplina: projetoDisciplina,
      revisao: "R00",
      status: "em_elaboracao",
      created_by: userId,
    })
    .select("id")
    .single();
  if (insertError) throw friendlyDbError(insertError);
  return { projeto_id: projeto.id, cliente_id: eq.cliente_id };
}

const createItemInput = z.object({
  equipamento_id: z.string().uuid(),
  equipamento_disciplina: z.enum(DISCIPLINAS),
  disciplina: z.enum(["mecanico", "eletrico", "automacao", "montagem", "outro"]).default("outro"),
  descricao: z.string().min(1).max(400),
  quantidade: z.number().min(0).default(1),
  unidade: z.string().max(20).default("un"),
  criticidade: z.enum(["baixa", "media", "alta", "critica"]).default("media"),
  custo_unitario_estimado: z.number().min(0).nullable().optional(),
  observacoes: z.string().max(2000).nullable().optional(),
});
export const createBomItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => createItemInput.parse(i))
  .handler(async ({ data, context }) => {
    await assertCanAccessModule(context.supabase, context.userId, "engenharia");
    const sb = context.supabase as AnySb;
    const origem = await ensureProjetoForBom(
      sb,
      data.equipamento_id,
      data.equipamento_disciplina,
      context.userId,
    );
    const { data: row, error } = await sb
      .from("projeto_insumos")
      .insert({
        projeto_id: origem.projeto_id,
        cliente_id: origem.cliente_id,
        equipamento_id: data.equipamento_id,
        equipamento_disciplina: data.equipamento_disciplina,
        disciplina: data.disciplina,
        descricao: data.descricao,
        quantidade: data.quantidade,
        unidade: data.unidade,
        criticidade: data.criticidade,
        custo_estimado_unit: data.custo_unitario_estimado ?? null,
        observacoes: data.observacoes ?? null,
        status: "rascunho",
        created_by: context.userId,
      })
      .select("id")
      .single();
    if (error) throw friendlyDbError(error);
    return { id: row.id };
  });

const updateItemInput = z.object({
  id: z.string().uuid(),
  descricao: z.string().min(1).max(400).optional(),
  quantidade: z.number().min(0).optional(),
  unidade: z.string().max(20).optional(),
  criticidade: z.enum(["baixa", "media", "alta", "critica"]).optional(),
  custo_unitario_estimado: z.number().min(0).nullable().optional(),
  observacoes: z.string().max(2000).nullable().optional(),
  disciplina: z.enum(["mecanico", "eletrico", "automacao", "montagem", "outro"]).optional(),
});
export const updateBomItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => updateItemInput.parse(i))
  .handler(async ({ data, context }) => {
    await assertCanAccessModule(context.supabase, context.userId, "engenharia");
    const sb = context.supabase as AnySb;
    const { id, ...rest } = data;
    const patch: Record<string, unknown> = { ...rest };
    if ("custo_unitario_estimado" in patch) {
      patch.custo_estimado_unit = patch.custo_unitario_estimado;
      delete patch.custo_unitario_estimado;
    }
    const { error } = await sb.from("projeto_insumos").update(patch).eq("id", id);
    if (error) throw friendlyDbError(error);
    return { ok: true };
  });

export const deleteBomItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertCanAccessModule(context.supabase, context.userId, "engenharia");
    const sb = context.supabase as AnySb;
    const { error } = await sb
      .from("projeto_insumos")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw friendlyDbError(error);
    return { ok: true };
  });

// Submit todos os rascunhos da disciplina para aprovação
const submitInput = z.object({
  equipamento_id: z.string().uuid(),
  equipamento_disciplina: z.enum(DISCIPLINAS),
});
export const submitBomForApproval = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => submitInput.parse(i))
  .handler(async ({ data, context }) => {
    await assertCanAccessModule(context.supabase, context.userId, "engenharia");
    const sb = context.supabase as AnySb;
    const { data: rows, error } = await sb
      .from("projeto_insumos")
      .update({ status: "pronto_aprovacao" })
      .eq("equipamento_id", data.equipamento_id)
      .eq("equipamento_disciplina", data.equipamento_disciplina)
      .eq("status", "rascunho")
      .select("id");
    if (error) throw friendlyDbError(error);
    return { count: (rows ?? []).length };
  });

const approveInput = z.object({ id: z.string().uuid() });
export const approveBomItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => approveInput.parse(i))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as AnySb;
    // check manager/admin
    await assertAdminOrManager(sb, context.userId).catch(() => {
      throw new Error("Apenas manager/admin pode aprovar insumos.");
    });
    const { error } = await sb
      .from("projeto_insumos")
      .update({ status: "aprovado" })
      .eq("id", data.id);
    if (error) throw friendlyDbError(error);
    return { ok: true };
  });

export const rejectBomItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ id: z.string().uuid(), motivo: z.string().max(500).optional() }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase as AnySb;
    await assertAdminOrManager(sb, context.userId).catch(() => {
      throw new Error("Apenas manager/admin pode rejeitar insumos.");
    });
    const { error } = await sb
      .from("projeto_insumos")
      .update({ status: "rascunho", observacoes: data.motivo ?? null })
      .eq("id", data.id);
    if (error) throw friendlyDbError(error);
    return { ok: true };
  });

// Resumo BOM para card Visão
export const getEquipamentoBomResumo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ equipamento_id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as AnySb;
    const { data: rows, error } = await sb
      .from("projeto_insumos")
      .select("equipamento_disciplina, status, quantidade, custo_estimado_unit")
      .eq("equipamento_id", data.equipamento_id)
      .is("deleted_at", null);
    if (error) throw friendlyDbError(error);
    const buckets: Record<
      string,
      { total: number; aprovados: number; pendentes: number; custo: number }
    > = {};
    let totalItens = 0;
    let custoTotal = 0;
    for (const r of rows ?? []) {
      totalItens += 1;
      const custo = Number(r.custo_estimado_unit ?? 0) * Number(r.quantidade ?? 1);
      custoTotal += isFinite(custo) ? custo : 0;
      const key = r.equipamento_disciplina ?? "outros";
      const b = (buckets[key] ??= { total: 0, aprovados: 0, pendentes: 0, custo: 0 });
      b.total += 1;
      b.custo += isFinite(custo) ? custo : 0;
      if (
        r.status === "aprovado" ||
        r.status === "em_cotacao" ||
        r.status === "cotado" ||
        r.status === "em_compra" ||
        r.status === "recebido"
      ) {
        b.aprovados += 1;
      } else if (r.status === "rascunho" || r.status === "pronto_aprovacao") {
        b.pendentes += 1;
      }
    }
    return { totalItens, custoTotal, buckets };
  });

// Aplica o seed de disciplinas/BOM para um equipamento (idempotente).
// Manager/admin only. Se etapas ainda não existirem, popula base + família.
export const runSeedEquipamento = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ equipamento_id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as AnySb;
    await assertAdminOrManager(sb, context.userId).catch(() => {
      throw new Error("Apenas manager/admin pode rodar o seed.");
    });
    // Primeiro tenta importar do template publicado (fallback interno chama seed_equipamento_disciplinas).
    const { data: eqRow } = await sb
      .from("cliente_equipamentos")
      .select("planejamento_template_slug")
      .eq("id", data.equipamento_id)
      .maybeSingle();
    const { error } = await sb.rpc("import_etapas_do_template", {
      _eq_id: data.equipamento_id,
      _tipo_slug: eqRow?.planejamento_template_slug ?? null,
    });
    if (error) throw friendlyDbError(error);
    return { ok: true };
  });
