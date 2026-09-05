import { createServerFn } from "@tanstack/react-start";
import { assertCanAccessModule } from "@/lib/admin-guard";
import { friendlyDbError } from "@/lib/db-errors";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  INSUMO_CRITICIDADE,
  INSUMO_DISCIPLINAS,
  INSUMO_STATUS,
} from "@/lib/projeto-insumos.shared";

// Tipos do Supabase ainda não foram regenerados para projeto_insumos;
// usamos um cast estrutural para a SDK não bloquear a chamada.
type SB = {
  from: (t: string) => any; // eslint-disable-line @typescript-eslint/no-explicit-any
  rpc?: (
    name: string,
    args: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: { message: string } | null }>;
};

const SELECT_COLS =
  "id, projeto_id, equipamento_id, equipamento_disciplina, cliente_id, disciplina, descricao, especificacao_tecnica, codigo_interno, fabricante_sugerido, part_number, categoria_slug, unidade, quantidade, quantidade_reserva, qtd_estoque, criticidade, lead_time_desejado_dias, necessidade_em, status, observacoes, sub_conjunto, custo_estimado_unit, custo_real_unit, fornecedor_sugerido_id, solicitado_por, aprovado_por, aprovado_em, created_at, updated_at";

const SELECT_WITH_JOINS =
  SELECT_COLS +
  ", equipamento_projetos!inner(disciplina, revisao, status, equipamento_id, cliente_equipamentos(codigo, modelo))" +
  ", cliente_equipamentos!projeto_insumos_equipamento_id_fkey(id, codigo, modelo)" +
  ", clientes(codigo, razao_social), fornecedor_categorias_catalog(nome_pt)" +
  ", fornecedor_sugerido:fornecedores!fornecedor_sugerido_id(id, codigo, nome, nome_fantasia)";

export type InsumoRow = {
  id: string;
  projeto_id: string;
  equipamento_id: string | null;
  equipamento_disciplina: string | null;
  cliente_id: string | null;
  disciplina: string;
  descricao: string;
  especificacao_tecnica: string | null;
  codigo_interno: string | null;
  fabricante_sugerido: string | null;
  part_number: string | null;
  categoria_slug: string | null;
  unidade: string;
  quantidade: number;
  quantidade_reserva: number;
  qtd_estoque: number;
  criticidade: string;
  lead_time_desejado_dias: number | null;
  necessidade_em: string | null;
  status: string;
  observacoes: string | null;
  sub_conjunto: string | null;
  custo_estimado_unit: number | null;
  custo_real_unit: number | null;
  fornecedor_sugerido_id: string | null;
  solicitado_por: string | null;
  aprovado_por: string | null;
  aprovado_em: string | null;
  created_at: string;
  updated_at: string;
  equipamento_projetos?: {
    disciplina: string;
    revisao: string;
    status: string;
    equipamento_id: string;
    cliente_equipamentos?: { codigo: string; modelo: string } | null;
  } | null;
  cliente_equipamentos?: { id: string; codigo: string | null; modelo: string } | null;
  clientes?: { codigo: string; razao_social: string } | null;
  fornecedor_categorias_catalog?: { nome_pt: string } | null;
  fornecedor_sugerido?: {
    id: string;
    codigo: string | null;
    nome: string;
    nome_fantasia: string | null;
  } | null;
};

/* ============ LIST ============ */
const listInput = z.object({
  projeto_id: z.string().uuid().optional(),
  cliente_id: z.string().uuid().optional(),
  oportunidade_id: z.string().uuid().optional(),
  equipamento_id: z.string().uuid().optional(),
  origem: z.enum(["todos", "eqp", "projeto"]).optional().default("todos"),
  disciplina: z.string().optional(),
  status: z
    .enum(["todos", ...INSUMO_STATUS])
    .optional()
    .default("todos"),
  criticidade: z
    .enum(["todos", ...INSUMO_CRITICIDADE])
    .optional()
    .default("todos"),
  q: z.string().optional(),
  page: z.number().int().min(1).optional().default(1),
  per_page: z.number().int().min(1).max(200).optional().default(50),
});

export const listInsumos = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => listInput.parse(input))
  .handler(async ({ data, context }): Promise<{ rows: InsumoRow[]; total: number }> => {
    const sb = context.supabase as unknown as SB;
    let q = sb
      .from("projeto_insumos")
      .select(SELECT_WITH_JOINS, { count: "exact" })
      .is("deleted_at", null);
    if (data.projeto_id) q = q.eq("projeto_id", data.projeto_id);
    if (data.cliente_id) q = q.eq("cliente_id", data.cliente_id);
    if (data.oportunidade_id) q = q.eq("oportunidade_id", data.oportunidade_id);
    if (data.equipamento_id) q = q.eq("equipamento_id", data.equipamento_id);
    if (data.origem === "eqp") q = q.not("equipamento_disciplina", "is", null);
    else if (data.origem === "projeto") q = q.is("equipamento_disciplina", null);
    if (data.disciplina) q = q.eq("disciplina", data.disciplina);
    if (data.status && data.status !== "todos") q = q.eq("status", data.status);
    if (data.criticidade && data.criticidade !== "todos") q = q.eq("criticidade", data.criticidade);

    if (data.q && data.q.trim()) {
      const term = `%${data.q.trim()}%`;
      q = q.or(
        `descricao.ilike.${term},codigo_interno.ilike.${term},fabricante_sugerido.ilike.${term},part_number.ilike.${term}`,
      );
    }
    const from = (data.page - 1) * data.per_page;
    const to = from + data.per_page - 1;
    const {
      data: rows,
      count,
      error,
    } = await q
      .order("criticidade", { ascending: false })
      .order("necessidade_em", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false })
      .range(from, to);
    if (error) throw friendlyDbError(error);
    return { rows: (rows as InsumoRow[]) ?? [], total: count ?? 0 };
  });

/* ============ UPSERT ============ */
const upsertInput = z.object({
  id: z.string().uuid().optional(),
  projeto_id: z.string().uuid(),
  disciplina: z.enum(INSUMO_DISCIPLINAS),
  descricao: z.string().min(2).max(500),
  especificacao_tecnica: z.string().max(4000).nullable().optional(),
  codigo_interno: z.string().max(80).nullable().optional(),
  fabricante_sugerido: z.string().max(200).nullable().optional(),
  part_number: z.string().max(120).nullable().optional(),
  categoria_slug: z.string().max(120).nullable().optional(),
  unidade: z.string().min(1).max(10),
  quantidade: z.number().positive(),
  quantidade_reserva: z.number().min(0).optional().default(0),
  criticidade: z.enum(INSUMO_CRITICIDADE).optional().default("media"),
  lead_time_desejado_dias: z.number().int().min(0).nullable().optional(),
  necessidade_em: z.string().nullable().optional(),
  observacoes: z.string().max(4000).nullable().optional(),
  sub_conjunto: z.string().max(200).nullable().optional(),
  custo_estimado_unit: z.number().min(0).nullable().optional(),
  fornecedor_sugerido_id: z.string().uuid().nullable().optional(),
});

export const upsertInsumo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => upsertInput.parse(input))
  .handler(async ({ data, context }) => {
    await assertCanAccessModule(context.supabase, context.userId, "compras");
    const sb = context.supabase as unknown as SB;
    // Carrega projeto para preencher equipamento_id/cliente_id
    const { data: proj, error: pe } = await sb
      .from("equipamento_projetos")
      .select("id, equipamento_id, cliente_id")
      .eq("id", data.projeto_id)
      .single();
    if (pe || !proj) throw new Error("Projeto não encontrado.");

    if (data.id) {
      const { id, ...rest } = data;
      const { error } = await sb
        .from("projeto_insumos")
        .update({ ...rest, updated_by: context.userId })
        .eq("id", id);
      if (error) throw friendlyDbError(error);
      return { id, updated: true as const };
    }

    const { data: row, error } = await sb
      .from("projeto_insumos")
      .insert({
        ...data,
        equipamento_id: (proj as { equipamento_id: string }).equipamento_id,
        cliente_id: (proj as { cliente_id: string }).cliente_id,
        solicitado_por: context.userId,
        created_by: context.userId,
      })
      .select("id")
      .single();
    if (error) throw friendlyDbError(error);
    return { id: (row as { id: string }).id, created: true as const };
  });

/* ============ STATUS ============ */
const setStatusInput = z.object({
  id: z.string().uuid(),
  status: z.enum(INSUMO_STATUS),
});

export const setInsumoStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => setStatusInput.parse(input))
  .handler(async ({ data, context }) => {
    await assertCanAccessModule(context.supabase, context.userId, "compras");
    const sb = context.supabase as unknown as SB;
    const patch: Record<string, unknown> = {
      status: data.status,
      updated_by: context.userId,
    };
    if (data.status === "aprovado") {
      patch.aprovado_por = context.userId;
      patch.aprovado_em = new Date().toISOString();
    }
    const { error } = await sb.from("projeto_insumos").update(patch).eq("id", data.id);
    if (error) throw friendlyDbError(error);
    return { ok: true as const };
  });

/* ============ DELETE (soft) — registra evento de auditoria ============ */
const removerInput = z.object({
  id: z.string().uuid(),
  motivo: z.string().max(500).optional().nullable(),
});

export const removerInsumo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => removerInput.parse(input))
  .handler(async ({ data, context }) => {
    await assertCanAccessModule(context.supabase, context.userId, "compras");
    const sb = context.supabase as unknown as SB;
    const now = new Date().toISOString();

    const { data: cur } = await sb
      .from("projeto_insumos")
      .select("id, descricao, projeto_id")
      .eq("id", data.id)
      .maybeSingle();

    const { error } = await sb
      .from("projeto_insumos")
      .update({ deleted_at: now, updated_by: context.userId })
      .eq("id", data.id);
    if (error) throw friendlyDbError(error);

    const { data: prof } = await sb
      .from("profiles")
      .select("full_name, email")
      .eq("id", context.userId)
      .maybeSingle();
    const actor_nome =
      (prof as { full_name?: string; email?: string } | null)?.full_name ??
      (prof as { email?: string } | null)?.email ??
      "Sistema";

    // Remove eventos "editado" auto-gerados pelo trigger nos últimos 10s
    // (evita ruído: o UPDATE de deleted_at gera diff que polui a auditoria)
    await sb
      .from("insumo_atividades")
      .delete()
      .eq("insumo_id", data.id)
      .eq("tipo", "editado")
      .gte("criado_em", new Date(Date.now() - 10_000).toISOString());

    await sb.from("insumo_atividades").insert({
      insumo_id: data.id,
      tipo: "insumo_removido",
      descricao: data.motivo?.trim()
        ? `Removeu o insumo — motivo: ${data.motivo.trim()}`
        : "Removeu o insumo (sem motivo informado)",
      meta: {
        motivo: data.motivo?.trim() || null,
        descricao_snapshot: (cur as { descricao?: string } | null)?.descricao ?? null,
        deleted_at: [null, now],
      },
      actor_id: context.userId,
      actor_nome,
    });

    // Purga oportunista de itens > 30 dias (best-effort)
    void purgarAntigos(sb).catch(() => {});

    return { ok: true as const };
  });

let lastPurgeAt = 0;
async function purgarAntigos(sb: SB) {
  const now = Date.now();
  if (now - lastPurgeAt < 60 * 60 * 1000) return;
  lastPurgeAt = now;
  const cutoff = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data: expired } = await sb
    .from("projeto_insumos")
    .select("id")
    .not("deleted_at", "is", null)
    .lt("deleted_at", cutoff)
    .limit(200);
  const ids = ((expired as Array<{ id: string }> | null) ?? []).map((r) => r.id);
  if (ids.length === 0) return;
  await sb.from("insumo_atividades").delete().in("insumo_id", ids);
  await sb.from("projeto_insumos").delete().in("id", ids);
}

/* ============ RESTAURAR (reversão via auditoria) ============ */
export const restaurarInsumo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid(), justificativa: z.string().min(3).max(500) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as SB;
    const { error } = await sb
      .from("projeto_insumos")
      .update({ deleted_at: null, updated_by: context.userId })
      .eq("id", data.id);
    if (error) throw friendlyDbError(error);
    const { data: prof } = await sb
      .from("profiles")
      .select("full_name, email")
      .eq("id", context.userId)
      .maybeSingle();
    const actor_nome =
      (prof as { full_name?: string; email?: string } | null)?.full_name ??
      (prof as { email?: string } | null)?.email ??
      "Sistema";
    await sb.from("insumo_atividades").insert({
      insumo_id: data.id,
      tipo: "insumo_restaurado",
      descricao: `Insumo restaurado. Motivo: ${data.justificativa}`,
      meta: { justificativa: data.justificativa },
      actor_id: context.userId,
      actor_nome,
    });
    return { ok: true as const };
  });

/* ============ AGREGADO POR CATEGORIA ============ */
export const necessidadesPorCategoria = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as unknown as SB;
    const { data, error } = await sb
      .from("projeto_insumos")
      .select("categoria_slug, status, criticidade, fornecedor_categorias_catalog(nome_pt)")
      .is("deleted_at", null)
      .in("status", ["aprovado", "em_cotacao", "cotado"]);
    if (error) throw friendlyDbError(error);
    const agg = new Map<
      string,
      { categoria_slug: string | null; label: string; total: number; criticos: number }
    >();
    for (const r of (data ?? []) as Array<{
      categoria_slug: string | null;
      criticidade: string;
      fornecedor_categorias_catalog: { nome_pt: string } | null;
    }>) {
      const key = r.categoria_slug ?? "sem_categoria";
      const cur = agg.get(key) ?? {
        categoria_slug: r.categoria_slug,
        label: r.fornecedor_categorias_catalog?.nome_pt ?? "Sem categoria",
        total: 0,
        criticos: 0,
      };
      cur.total += 1;
      if (r.criticidade === "critica" || r.criticidade === "alta") cur.criticos += 1;
      agg.set(key, cur);
    }
    return Array.from(agg.values()).sort((a, b) => b.total - a.total);
  });

/* ============ LISTA AUXILIAR: PROJETOS ATIVOS ============ */
export const listProjetosAtivos = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as unknown as SB;
    const { data, error } = await sb
      .from("equipamento_projetos")
      .select(
        "id, disciplina, revisao, status, cliente_equipamentos(codigo, modelo), clientes(codigo, razao_social)",
      )
      .is("deleted_at", null)
      .neq("status", "obsoleto")
      .order("updated_at", { ascending: false })
      .limit(200);
    if (error) throw friendlyDbError(error);
    return (data ?? []) as Array<{
      id: string;
      disciplina: string;
      revisao: string;
      status: string;
      cliente_equipamentos: { codigo: string; modelo: string } | null;
      clientes: { codigo: string; razao_social: string } | null;
    }>;
  });

/* ============ CATEGORIAS (reutiliza catalog de fornecedores) ============ */
export const listCategorias = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as unknown as SB;
    const { data, error } = await sb
      .from("fornecedor_categorias_catalog")
      .select("slug, nome_pt")
      .order("nome_pt", { ascending: true });
    if (error) throw friendlyDbError(error);
    return (data ?? []) as Array<{ slug: string; nome_pt: string }>;
  });

/* ============ RFQs POR INSUMO (para tela Cotações/RFQ) ============ */
export const listInsumosRfq = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        q: z.string().max(120).optional().default(""),
        status: z
          .enum(["todos", "em_cotacao", "pronto_aprovacao", "cotado", "em_compra"])
          .optional()
          .default("todos"),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as SB;
    const statuses =
      data.status === "todos"
        ? ["em_cotacao", "pronto_aprovacao", "cotado", "em_compra"]
        : [data.status];

    let q = sb
      .from("projeto_insumos")
      .select(
        "id, codigo_interno, descricao, part_number, fabricante_sugerido, disciplina, unidade, quantidade, criticidade, status, necessidade_em, updated_at, clientes(codigo, razao_social), equipamento_projetos(revisao, cliente_equipamentos(codigo))",
      )
      .is("deleted_at", null)
      .in("status", statuses)
      .order("updated_at", { ascending: false })
      .limit(200);

    if (data.q && data.q.trim()) {
      const t = `%${data.q.trim()}%`;
      q = q.or(
        `descricao.ilike.${t},codigo_interno.ilike.${t},part_number.ilike.${t},fabricante_sugerido.ilike.${t}`,
      );
    }

    const { data: rows, error } = await q;
    if (error) throw friendlyDbError(error);

    const list = (rows ?? []) as Array<{
      id: string;
      codigo_interno: string | null;
      descricao: string;
      part_number: string | null;
      fabricante_sugerido: string | null;
      disciplina: string;
      unidade: string;
      quantidade: number;
      criticidade: string;
      status: string;
      necessidade_em: string | null;
      updated_at: string;
      clientes?: { codigo: string; razao_social: string } | null;
      equipamento_projetos?: {
        revisao: string;
        cliente_equipamentos?: { codigo: string } | null;
      } | null;
    }>;

    const ids = list.map((r) => r.id);
    const docs: Record<string, number> = {};
    const envios: Record<string, { total: number; respondidos: number }> = {};
    const ocs: Record<string, string> = {};

    if (ids.length) {
      const { data: dg } = await sb
        .from("insumo_documentos_gerados")
        .select("insumo_id")
        .in("insumo_id", ids);
      for (const r of (dg ?? []) as Array<{ insumo_id: string }>) {
        docs[r.insumo_id] = (docs[r.insumo_id] ?? 0) + 1;
      }
      const { data: env } = await sb
        .from("insumo_rfq_envios")
        .select("insumo_id, data_resposta, status")
        .in("insumo_id", ids);
      for (const r of (env ?? []) as Array<{
        insumo_id: string;
        data_resposta: string | null;
        status: string;
      }>) {
        const e = (envios[r.insumo_id] ??= { total: 0, respondidos: 0 });
        e.total += 1;
        if (r.data_resposta || r.status === "respondido") e.respondidos += 1;
      }
      const { data: oi } = await sb
        .from("ordem_compra_itens")
        .select("insumo_id, ordem_compra_id")
        .in("insumo_id", ids);
      for (const r of (oi ?? []) as Array<{ insumo_id: string; ordem_compra_id: string }>) {
        ocs[r.insumo_id] = r.ordem_compra_id;
      }
    }

    return list.map((r) => ({
      ...r,
      docs_gerados: docs[r.id] ?? 0,
      convites: envios[r.id]?.total ?? 0,
      respondidos: envios[r.id]?.respondidos ?? 0,
      ordem_compra_id: ocs[r.id] ?? null,
    }));
  });

/**
 * Lista insumos que já foram APROVADOS (aprovação vigente = "aprovado")
 * e ainda NÃO têm uma OC vinculada. Usado no topo de Ordens de Compra
 * para o comprador emitir a OC em poucos cliques.
 */
export const listInsumosAguardandoOC = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as unknown as SB;

    // Aprovações mais recentes por insumo
    const { data: aprovs, error: eA } = await sb
      .from("insumo_aprovacoes_oc")
      .select(
        "id, insumo_id, decisao, decidido_em, decidido_por, fornecedor_id_sugerido, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(500);
    if (eA) throw friendlyDbError(eA);

    const latest = new Map<string, any>();
    for (const a of (aprovs ?? []) as any[]) {
      if (!latest.has(a.insumo_id)) latest.set(a.insumo_id, a);
    }
    const aprovados = Array.from(latest.values()).filter((a) => a.decisao === "aprovado");
    if (!aprovados.length) return [] as any[];

    const insumoIds = aprovados.map((a) => a.insumo_id);

    // Já existe item de OC vinculado?
    const { data: ocItens } = await sb
      .from("ordem_compra_itens")
      .select("insumo_id, ordem_compra_id")
      .in("insumo_id", insumoIds);
    const jaEmOC = new Set((ocItens ?? []).map((r: any) => r.insumo_id));

    const pendentes = aprovados.filter((a) => !jaEmOC.has(a.insumo_id));
    if (!pendentes.length) return [] as any[];

    const { data: insumos, error: eI } = await sb
      .from("projeto_insumos")
      .select(
        "id, codigo_interno, descricao, part_number, fabricante_sugerido, unidade, quantidade, criticidade, necessidade_em, status, clientes(codigo, razao_social), equipamento_projetos(cliente_equipamentos(codigo))",
      )
      .in(
        "id",
        pendentes.map((p) => p.insumo_id),
      )
      .is("deleted_at", null);
    if (eI) throw friendlyDbError(eI);

    const byId = new Map<string, any>((insumos ?? []).map((r: any) => [r.id, r]));

    // Fornecedor sugerido: enriquecer com nome quando possível
    const fornIds = Array.from(
      new Set(pendentes.map((p) => p.fornecedor_id_sugerido).filter(Boolean)),
    ) as string[];
    const fornMap = new Map<string, string>();
    if (fornIds.length) {
      const { data: f } = await sb
        .from("fornecedores")
        .select("id, nome_fantasia, razao_social")
        .in("id", fornIds);
      for (const r of (f ?? []) as any[]) {
        fornMap.set(r.id, r.nome_fantasia || r.razao_social || "");
      }
    }

    // Orçamento vencedor: pegar valor/moeda mais recente do fornecedor sugerido por insumo.
    const orcMap = new Map<
      string,
      { valor: number | null; moeda: string | null; lead_time_dias: number | null }
    >();
    for (const p of pendentes) {
      if (!p.fornecedor_id_sugerido) continue;
      const { data: orc } = await sb
        .from("insumo_anexos")
        .select("valor, moeda, lead_time_dias")
        .eq("insumo_id", p.insumo_id)
        .eq("kind", "orcamento")
        .eq("fornecedor_id", p.fornecedor_id_sugerido)
        .order("criado_em", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (orc) {
        orcMap.set(p.insumo_id, {
          valor: orc.valor != null ? Number(orc.valor) : null,
          moeda: orc.moeda ?? null,
          lead_time_dias: orc.lead_time_dias ?? null,
        });
      }
    }

    return pendentes
      .map((a) => {
        const ins = byId.get(a.insumo_id);
        if (!ins) return null;
        const orc = orcMap.get(a.insumo_id);
        return {
          insumo_id: a.insumo_id,
          aprovacao_id: a.id,
          decidido_em: a.decidido_em,
          fornecedor_id_sugerido: a.fornecedor_id_sugerido as string | null,
          fornecedor_sugerido_nome: a.fornecedor_id_sugerido
            ? (fornMap.get(a.fornecedor_id_sugerido) ?? null)
            : null,
          valor_previsto: orc?.valor ?? null,
          moeda_prevista: orc?.moeda ?? null,
          lead_time_dias: orc?.lead_time_dias ?? null,
          codigo_interno: ins.codigo_interno,
          descricao: ins.descricao,
          part_number: ins.part_number,
          fabricante_sugerido: ins.fabricante_sugerido,
          quantidade: ins.quantidade,
          unidade: ins.unidade,
          criticidade: ins.criticidade,
          necessidade_em: ins.necessidade_em,
          status: ins.status,
          cliente_codigo: ins.clientes?.codigo ?? null,
          cliente_nome: ins.clientes?.razao_social ?? null,
          equipamento_codigo: ins.equipamento_projetos?.cliente_equipamentos?.codigo ?? null,
        };
      })
      .filter(Boolean);
  });

/* ============ APROVAR EM LOTE (BOM → Compras) ============ */
const aprovarLoteInput = z.object({
  ids: z.array(z.string().uuid()).min(1).max(200),
});

export const aprovarInsumosEmLote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => aprovarLoteInput.parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as SB;
    const now = new Date().toISOString();
    const { data: rows, error } = await sb
      .from("projeto_insumos")
      .update({
        status: "aprovado",
        aprovado_por: context.userId,
        aprovado_em: now,
        updated_by: context.userId,
      })
      .in("id", data.ids)
      .eq("status", "rascunho")
      .is("deleted_at", null)
      .select("id");
    if (error) throw friendlyDbError(error);
    return { aprovados: ((rows as { id: string }[]) ?? []).length };
  });

/* ================================================================
 * INSUMOS — histórico, estoque, wizard xlsx e liberação p/ produção
 * ================================================================ */

/* -- helpers de log -- */
async function _userNome(sb: SB, uid: string): Promise<string> {
  const { data } = await sb.from("profiles").select("full_name, email").eq("id", uid).maybeSingle();
  const p = data as { full_name?: string; email?: string } | null;
  return p?.full_name ?? p?.email ?? "Usuário";
}
async function _logInsumoHist(
  sb: SB,
  uid: string,
  entry: {
    projeto_id: string;
    tipo:
      | "import_excel"
      | "export_excel"
      | "edicao_manual"
      | "exclusao"
      | "criacao"
      | "envio_aprovacao"
      | "estoque_alterado"
      | "liberado_producao";
    descricao: string;
    diff?: unknown;
    arquivo_nome?: string | null;
  },
): Promise<void> {
  const nome = await _userNome(sb, uid);
  await sb.from("projeto_insumo_historico").insert({
    projeto_id: entry.projeto_id,
    tipo: entry.tipo,
    user_id: uid,
    user_nome: nome,
    descricao: entry.descricao,
    diff: entry.diff ?? {},
    arquivo_nome: entry.arquivo_nome ?? null,
  });
}

/* ============ LISTAR HISTÓRICO ============ */
export const listHistoricoInsumos = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        projeto_id: z.string().uuid(),
        tipo: z.string().nullable().optional(),
        limit: z.number().int().min(1).max(500).default(200),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as SB;
    let q = sb
      .from("projeto_insumo_historico")
      .select("id, tipo, user_id, user_nome, descricao, diff, arquivo_nome, created_at")
      .eq("projeto_id", data.projeto_id)
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (data.tipo) q = q.eq("tipo", data.tipo);
    const { data: rows, error } = await q;
    if (error) throw friendlyDbError(error);
    return rows ?? [];
  });

/* ============ ESTOQUE (almoxarifado) ============ */
export const atualizarEstoqueInsumo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        qtd_estoque: z.number().min(0),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as SB;
    const { data: cur } = await sb
      .from("projeto_insumos")
      .select("id, descricao, projeto_id, qtd_estoque, quantidade")
      .eq("id", data.id)
      .maybeSingle();
    const c = cur as {
      id: string;
      descricao: string;
      projeto_id: string;
      qtd_estoque: number;
      quantidade: number;
    } | null;
    if (!c) throw new Error("Insumo não encontrado");
    const antes = Number(c.qtd_estoque ?? 0);
    const depois = Number(data.qtd_estoque);
    if (antes === depois) return { ok: true, changed: false as const };
    const { error } = await sb
      .from("projeto_insumos")
      .update({ qtd_estoque: depois, updated_by: context.userId })
      .eq("id", data.id);
    if (error) throw friendlyDbError(error);
    await _logInsumoHist(sb, context.userId, {
      projeto_id: c.projeto_id,
      tipo: "estoque_alterado",
      descricao: `Estoque de "${c.descricao}" alterado de ${antes} para ${depois}`,
      diff: { antes, depois, insumo_id: c.id },
    });
    return { ok: true, changed: true as const };
  });

/* ============ ENVIAR SELEÇÃO P/ APROVAÇÃO (lote) ============ */
export const enviarInsumosParaAprovacao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        ids: z.array(z.string().uuid()).min(1).max(200),
        nota: z.string().max(2000).nullable().optional(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as SB;
    const uid = context.userId;

    const { data: rows } = await sb
      .from("projeto_insumos")
      .select("id, descricao, projeto_id, status, qtd_estoque, quantidade, fornecedor_sugerido_id")
      .in("id", data.ids)
      .is("deleted_at", null);
    const insumos =
      (rows as Array<{
        id: string;
        descricao: string;
        projeto_id: string;
        status: string;
        qtd_estoque: number;
        quantidade: number;
        fornecedor_sugerido_id: string | null;
      }>) ?? [];

    if (insumos.length === 0) throw new Error("Nenhum insumo encontrado para a seleção.");
    const projeto_id = insumos[0].projeto_id;

    // Aprovações vigentes
    const { data: aprovs } = await (sb as any)
      .from("insumo_aprovacoes_oc")
      .select("id, insumo_id, decidido_em, decisao")
      .in("insumo_id", data.ids);
    const pendentesSet = new Set(
      ((aprovs ?? []) as any[]).filter((a) => a.decidido_em == null).map((a) => a.insumo_id),
    );
    const aprovadasSet = new Set(
      ((aprovs ?? []) as any[]).filter((a) => a.decisao === "aprovado").map((a) => a.insumo_id),
    );

    const enviados: string[] = [];
    const ignorados: Array<{ id: string; descricao: string; motivo: string }> = [];

    for (const ins of insumos) {
      const aComprar = Math.max(0, Number(ins.quantidade) - Number(ins.qtd_estoque ?? 0));
      if (aComprar === 0) {
        ignorados.push({ id: ins.id, descricao: ins.descricao, motivo: "Estoque suficiente" });
        continue;
      }
      if (pendentesSet.has(ins.id)) {
        ignorados.push({ id: ins.id, descricao: ins.descricao, motivo: "Aprovação pendente" });
        continue;
      }
      if (aprovadasSet.has(ins.id)) {
        ignorados.push({ id: ins.id, descricao: ins.descricao, motivo: "Já aprovado" });
        continue;
      }
      const { error } = await (sb as any).from("insumo_aprovacoes_oc").insert({
        insumo_id: ins.id,
        solicitado_por: uid,
        solicitacao_nota: data.nota ?? null,
        fornecedor_id_sugerido: ins.fornecedor_sugerido_id ?? null,
      });
      if (error) {
        ignorados.push({ id: ins.id, descricao: ins.descricao, motivo: error.message });
        continue;
      }
      await sb
        .from("projeto_insumos")
        .update({ status: "pronto_aprovacao", updated_by: uid })
        .eq("id", ins.id)
        .in("status", ["rascunho", "em_cotacao", "cotado", "aprovado"]);
      enviados.push(ins.id);
    }

    if (enviados.length > 0) {
      await _logInsumoHist(sb, uid, {
        projeto_id,
        tipo: "envio_aprovacao",
        descricao: `Enviou ${enviados.length} ${enviados.length === 1 ? "insumo" : "insumos"} para aprovação`,
        diff: { enviados, ignorados },
      });
    }

    return { enviados: enviados.length, ignorados };
  });

/* ============ RESUMO PRÉ-LIBERAÇÃO P/ PRODUÇÃO ============ */
export const resumoLiberacaoProducao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ equipamento_id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as SB;

    const { data: eq } = await sb
      .from("cliente_equipamentos")
      .select("id, codigo, modelo, clientes(codigo, razao_social)")
      .eq("id", data.equipamento_id)
      .maybeSingle();

    const { data: projs } = await sb
      .from("equipamento_projetos")
      .select("id, disciplina, status, progresso, fase")
      .eq("equipamento_id", data.equipamento_id)
      .is("deleted_at", null);
    const projetos =
      (projs as Array<{
        id: string;
        disciplina: string;
        status: string;
        progresso: number;
        fase: string;
      }>) ?? [];

    // Etapas por disciplina
    const { data: etapas } = await sb
      .from("equipamento_disciplina_etapas")
      .select("disciplina, status")
      .eq("equipamento_id", data.equipamento_id)
      .is("deleted_at", null);
    const etapasByDisc: Record<string, Record<string, number>> = {};
    for (const e of (etapas as Array<{ disciplina: string; status: string }>) ?? []) {
      etapasByDisc[e.disciplina] ??= {
        concluido: 0,
        em_progresso: 0,
        bloqueado: 0,
        nao_iniciado: 0,
      };
      etapasByDisc[e.disciplina][e.status] = (etapasByDisc[e.disciplina][e.status] ?? 0) + 1;
    }

    // Insumos + aprovações
    const { data: ins } = await sb
      .from("projeto_insumos")
      .select("id, status, quantidade, qtd_estoque, custo_estimado_unit")
      .eq("equipamento_id", data.equipamento_id)
      .is("deleted_at", null);
    const insumos =
      (ins as Array<{
        id: string;
        status: string;
        quantidade: number;
        qtd_estoque: number;
        custo_estimado_unit: number | null;
      }>) ?? [];

    const insumosStatus: Record<string, number> = {};
    let totalEstimado = 0;
    let totalEstoque = 0;
    let totalAComprar = 0;
    let rascunhoCount = 0;
    for (const i of insumos) {
      insumosStatus[i.status] = (insumosStatus[i.status] ?? 0) + 1;
      const qtd = Number(i.quantidade);
      const est = Number(i.qtd_estoque ?? 0);
      const aComprar = Math.max(0, qtd - est);
      const custoUnit = i.custo_estimado_unit != null ? Number(i.custo_estimado_unit) : 0;
      totalEstimado += qtd * custoUnit;
      totalEstoque += Math.min(est, qtd) * custoUnit;
      totalAComprar += aComprar * custoUnit;
      if (i.status === "rascunho") rascunhoCount++;
    }

    const insumoIds = insumos.map((i) => i.id);
    let aprovacoesPend = 0;
    if (insumoIds.length > 0) {
      const { data: aprovs } = await (sb as any)
        .from("insumo_aprovacoes_oc")
        .select("id, decidido_em")
        .in("insumo_id", insumoIds)
        .is("decidido_em", null);
      aprovacoesPend = ((aprovs ?? []) as unknown[]).length;
    }

    return {
      equipamento: eq,
      projetos,
      etapasByDisc,
      insumosStatus,
      insumosTotais: {
        total: insumos.length,
        rascunhoCount,
        totalEstimado,
        totalEstoque,
        totalAComprar,
      },
      aprovacoesPend,
      jaLiberado: projetos.length > 0 && projetos.every((p) => p.status === "liberado_producao"),
    };
  });

/* ============ EXPORT XLSX DOS INSUMOS ============ */
export const exportInsumosXlsx = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ projeto_id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { default: ExcelJS } = await import("exceljs");
    const sb = context.supabase as unknown as SB;

    const { data: proj } = await sb
      .from("equipamento_projetos")
      .select("id, cliente_equipamentos(codigo, modelo)")
      .eq("id", data.projeto_id)
      .maybeSingle();
    const info = proj as { cliente_equipamentos?: { codigo?: string; modelo?: string } } | null;

    const { data: rows } = await sb
      .from("projeto_insumos")
      .select(
        "codigo_interno, sub_conjunto, disciplina, descricao, fabricante_sugerido, part_number, quantidade, unidade, qtd_estoque, criticidade, custo_estimado_unit, necessidade_em, observacoes",
      )
      .eq("projeto_id", data.projeto_id)
      .is("deleted_at", null)
      .order("sub_conjunto", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true });

    const cols = [
      "codigo_interno",
      "sub_conjunto",
      "disciplina",
      "descricao",
      "fabricante_sugerido",
      "part_number",
      "quantidade",
      "unidade",
      "qtd_estoque",
      "criticidade",
      "custo_estimado_unit",
      "necessidade_em",
      "observacoes",
    ];
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Insumos");
    ws.columns = cols.map((k) => ({ header: k, key: k, width: k === "descricao" ? 40 : 18 }));
    ws.getRow(1).font = { bold: true };
    ws.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEEEEEE" } };
    ws.views = [{ state: "frozen", ySplit: 1 }];
    for (const r of (rows as Array<Record<string, unknown>>) ?? []) ws.addRow(r);

    const nMax = Math.max(500, ((rows as unknown[])?.length ?? 0) + 100);
    const addList = (col: string, values: readonly string[]) => {
      const range = `${col}2:${col}${nMax}`;
      (
        ws as unknown as { dataValidations: { add: (r: string, v: unknown) => void } }
      ).dataValidations.add(range, {
        type: "list",
        allowBlank: true,
        formulae: [`"${values.join(",")}"`],
      });
    };
    addList("C", ["mecanico", "eletrico", "automacao", "montagem", "outro"]);
    addList("J", ["baixa", "media", "alta", "critica"]);

    const wsI = wb.addWorksheet("Instruções");
    wsI.getColumn(1).width = 120;
    [
      `Equipamento: ${info?.cliente_equipamentos?.codigo ?? "—"} · ${info?.cliente_equipamentos?.modelo ?? ""}`,
      "",
      "1) O 'codigo_interno' é a chave: mantenha o valor original para atualizar; deixe vazio para criar novo.",
      "2) Para remover um insumo: apague a linha inteira.",
      "3) qtd_estoque = quantidade já disponível no almoxarifado. A quantidade a comprar é calculada automaticamente.",
      "4) Colunas com dropdown: disciplina, criticidade.",
    ].forEach((l) => wsI.addRow([l]));

    const buf = (await wb.xlsx.writeBuffer()) as ArrayBuffer;
    const b64 = Buffer.from(buf).toString("base64");
    const filename = `insumos_${(info?.cliente_equipamentos?.codigo ?? "projeto").replace(/[^a-zA-Z0-9-_]/g, "_")}.xlsx`;

    await _logInsumoHist(sb, context.userId, {
      projeto_id: data.projeto_id,
      tipo: "export_excel",
      descricao: `Baixou template de insumos (${(rows as unknown[])?.length ?? 0} itens)`,
    });

    return { base64: b64, filename };
  });

/* ============ APLICAR XLSX (dry-run + effective) ============ */
const _insumoImportRow = z.object({
  codigo_interno: z.string().nullable().optional(),
  sub_conjunto: z.string().nullable().optional(),
  disciplina: z.string(),
  descricao: z.string().min(1).max(500),
  fabricante_sugerido: z.string().nullable().optional(),
  part_number: z.string().nullable().optional(),
  quantidade: z.number().positive(),
  unidade: z.string().min(1).max(10),
  qtd_estoque: z.number().min(0).nullable().optional(),
  criticidade: z.string().nullable().optional(),
  custo_estimado_unit: z.number().min(0).nullable().optional(),
  necessidade_em: z.string().nullable().optional(),
  observacoes: z.string().nullable().optional(),
});

export const applyInsumosExcel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        projeto_id: z.string().uuid(),
        rows: z.array(_insumoImportRow).max(500),
        arquivoNome: z.string().max(200).nullable().optional(),
        dryRun: z.boolean().default(false),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as SB;

    const { data: proj } = await sb
      .from("equipamento_projetos")
      .select("id, equipamento_id, cliente_id, status")
      .eq("id", data.projeto_id)
      .maybeSingle();
    const p = proj as {
      id: string;
      equipamento_id: string;
      cliente_id: string;
      status: string;
    } | null;
    if (!p) throw new Error("Projeto não encontrado");

    const { data: existing } = await sb
      .from("projeto_insumos")
      .select(
        "id, codigo_interno, sub_conjunto, disciplina, descricao, fabricante_sugerido, part_number, quantidade, unidade, qtd_estoque, criticidade, custo_estimado_unit, necessidade_em, observacoes",
      )
      .eq("projeto_id", data.projeto_id)
      .is("deleted_at", null);
    const byCode = new Map<string, any>();
    for (const r of (existing as any[]) ?? [])
      if (r.codigo_interno) byCode.set(r.codigo_interno, r);

    const added: any[] = [];
    const updated: any[] = [];
    const seen = new Set<string>();

    const normDisc = (d: string) =>
      ["mecanico", "eletrico", "automacao", "montagem", "outro"].includes(d) ? d : "outro";
    const normCrit = (c: string | null | undefined) => {
      const v = (c ?? "").trim().toLowerCase();
      return ["baixa", "media", "alta", "critica"].includes(v) ? v : "media";
    };

    for (const r of data.rows) {
      const codigo = r.codigo_interno?.trim() || null;
      const payload: Record<string, any> = {
        codigo_interno: codigo,
        sub_conjunto: r.sub_conjunto?.trim() || null,
        disciplina: normDisc(r.disciplina),
        descricao: r.descricao,
        fabricante_sugerido: r.fabricante_sugerido ?? null,
        part_number: r.part_number ?? null,
        quantidade: Number(r.quantidade),
        unidade: r.unidade,
        qtd_estoque: Number(r.qtd_estoque ?? 0),
        criticidade: normCrit(r.criticidade),
        custo_estimado_unit: r.custo_estimado_unit == null ? null : Number(r.custo_estimado_unit),
        necessidade_em: r.necessidade_em || null,
        observacoes: r.observacoes ?? null,
      };
      if (codigo && byCode.has(codigo)) {
        if (seen.has(codigo)) throw new Error(`Código interno duplicado na planilha: ${codigo}`);
        seen.add(codigo);
        const cur = byCode.get(codigo);
        const changed: string[] = [];
        for (const k of Object.keys(payload)) {
          const a = (cur as any)[k];
          const b = (payload as any)[k];
          const aStr = a == null ? "" : String(a);
          const bStr = b == null ? "" : String(b);
          if (aStr !== bStr) changed.push(k);
        }
        if (changed.length > 0) updated.push({ id: cur.id, codigo, changed, payload });
      } else {
        added.push({ codigo, payload });
      }
    }

    const removed = ((existing as any[]) ?? []).filter(
      (r: any) =>
        r.codigo_interno &&
        !data.rows.some((row) => row.codigo_interno?.trim() === r.codigo_interno),
    );

    const diff = {
      added: added.map((a) => ({ titulo: a.payload.descricao, codigo: a.codigo })),
      updated: updated.map((u) => ({
        codigo: u.codigo,
        changed: u.changed,
        titulo: u.payload.descricao,
      })),
      removed: removed.map((r: any) => ({ titulo: r.descricao, codigo: r.codigo_interno })),
    };

    if (data.dryRun) return { ok: true, diff };

    for (const u of updated) {
      const { error } = await sb
        .from("projeto_insumos")
        .update({ ...u.payload, updated_by: context.userId })
        .eq("id", u.id);
      if (error) throw friendlyDbError(error);
    }
    for (const a of added) {
      const { error } = await sb.from("projeto_insumos").insert({
        ...a.payload,
        projeto_id: data.projeto_id,
        equipamento_id: p.equipamento_id,
        cliente_id: p.cliente_id,
        status: "rascunho",
        solicitado_por: context.userId,
        created_by: context.userId,
      });
      if (error) throw friendlyDbError(error);
    }
    for (const r of removed) {
      const { error } = await sb
        .from("projeto_insumos")
        .update({ deleted_at: new Date().toISOString(), updated_by: context.userId })
        .eq("id", (r as any).id);
      if (error) throw friendlyDbError(error);
    }

    await _logInsumoHist(sb, context.userId, {
      projeto_id: data.projeto_id,
      tipo: "import_excel",
      descricao: `Importou Excel de insumos: ${added.length} novos, ${updated.length} atualizados, ${removed.length} removidos`,
      diff,
      arquivo_nome: data.arquivoNome ?? null,
    });

    return { ok: true, diff };
  });

/* ============ LIBERAR EQUIPAMENTO P/ PRODUÇÃO (admin/manager) ============ */
export const liberarEquipamentoProducao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        equipamento_id: z.string().uuid(),
        observacoes: z.string().max(2000).nullable().optional(),
        inicio_previsto: z.string().nullable().optional(),
        fim_previsto: z.string().nullable().optional(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as SB;
    const uid = context.userId;

    const { data: isAdmin } = await sb.rpc!("has_role", { _user_id: uid, _role: "admin" });
    const { data: isManager } = await sb.rpc!("has_role", { _user_id: uid, _role: "manager" });
    if (!isAdmin && !isManager)
      throw new Error("Somente admin/gestor podem liberar para produção.");

    const { data: projetos } = await sb
      .from("equipamento_projetos")
      .select("id, status, projeto_id:id")
      .eq("equipamento_id", data.equipamento_id)
      .is("deleted_at", null);

    const now = new Date().toISOString();
    const liberadosIds: string[] = [];
    for (const p of (projetos as Array<{ id: string; status: string }>) ?? []) {
      if (p.status !== "liberado_producao") {
        await sb
          .from("equipamento_projetos")
          .update({
            status: "liberado_producao",
            fase: "liberacao",
            progresso: 100,
            observacoes: data.observacoes ?? undefined,
            liberado_em: now,
            liberado_por: uid,
            updated_by: uid,
          })
          .eq("id", p.id);
        liberadosIds.push(p.id);
        await _logInsumoHist(sb, uid, {
          projeto_id: p.id,
          tipo: "liberado_producao",
          descricao: `Equipamento liberado para produção${data.observacoes ? ` — ${data.observacoes}` : ""}`,
          diff: {
            inicio_previsto: data.inicio_previsto ?? null,
            fim_previsto: data.fim_previsto ?? null,
          },
        });
      }
    }

    if ((data.inicio_previsto || data.fim_previsto) && liberadosIds.length > 0) {
      const { data: firstProj } = await sb
        .from("equipamento_projetos")
        .select("montagem_id")
        .eq("equipamento_id", data.equipamento_id)
        .not("montagem_id", "is", null)
        .limit(1)
        .maybeSingle();
      const fp = firstProj as { montagem_id: string } | null;
      if (fp?.montagem_id) {
        await sb
          .from("equipamento_montagens")
          .update({
            inicio_previsto: data.inicio_previsto ?? undefined,
            fim_previsto: data.fim_previsto ?? undefined,
            updated_by: uid,
          })
          .eq("id", fp.montagem_id);
      }
    }

    return { ok: true, liberados: liberadosIds.length };
  });
