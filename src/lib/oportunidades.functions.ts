import { createServerFn } from "@tanstack/react-start";
import { friendlyDbError } from "@/lib/db-errors";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const PIPELINE_STAGES = [
  "novo",
  "qualificado",
  "proposta",
  "negociacao",
  "ganho",
  "perdido",
] as const;
export type PipelineStage = (typeof PIPELINE_STAGES)[number];

const RESTORE_PIPELINE_STAGES = ["novo", "qualificado", "proposta", "negociacao", "ganho"] as const;

export const LIFECYCLE_STAGES = ["suspect", "prospect", "cliente"] as const;
export type LifecycleStage = (typeof LIFECYCLE_STAGES)[number];

export const STAGE_LABEL: Record<PipelineStage, string> = {
  novo: "Novo",
  qualificado: "Qualificado",
  proposta: "Proposta",
  negociacao: "Negociação",
  ganho: "Ganho",
  perdido: "Perdido",
};

export const LIFECYCLE_LABEL: Record<LifecycleStage, string> = {
  suspect: "Suspect",
  prospect: "Prospect",
  cliente: "Cliente",
};

export const LIFECYCLE_OF_STAGE: Record<PipelineStage, LifecycleStage> = {
  novo: "suspect",
  qualificado: "prospect",
  proposta: "prospect",
  negociacao: "prospect",
  ganho: "cliente",
  perdido: "prospect",
};

export type OportunidadeLite = {
  id: string;
  codigo: string;
  titulo: string;
  cliente_id: string | null;
  cliente_nome: string | null;
  nome_lead: string | null;
  empresa_lead: string | null;
  responsavel_id: string;
  responsavel_nome: string;
  valor_estimado: number | null;
  valor_estimado_usd: number | null;
  probabilidade: number;
  expected_close_date: string | null;
  email: string | null;
  telefone: string | null;
  observacoes: string | null;
  lifecycle_stage: LifecycleStage;
  pipeline_stage: PipelineStage;
  stage_entered_at: string;
  lost_at: string | null;
  lost_by: string | null;
  lost_by_nome: string | null;
  lost_reason: string | null;
  restored_at: string | null;
  restored_by: string | null;
  restored_by_nome: string | null;
  lost_count: number;
  processo_id: string | null;
  created_at: string;
};

const stageSchema = z.enum(PIPELINE_STAGES);

export const listPipeline = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { responsavel?: string; q?: string }) => data ?? {})
  .handler(async ({ data, context }): Promise<OportunidadeLite[]> => {
    let q = context.supabase
      .from("oportunidades")
      .select("*")
      .is("deleted_at", null)
      .order("stage_entered_at", { ascending: false })
      .limit(500);
    if (data.responsavel) q = q.eq("responsavel_id", data.responsavel);
    if (data.q) q = q.or(`titulo.ilike.%${data.q}%,empresa_lead.ilike.%${data.q}%,nome_lead.ilike.%${data.q}%`);
    const { data: rows, error } = await q;
    if (error) throw friendlyDbError(error);
    if (!rows || rows.length === 0) return [];

    const clienteIds = Array.from(new Set(rows.map((r) => r.cliente_id).filter((v): v is string => !!v)));
    const profileIds = Array.from(new Set(rows.flatMap((r) => {
      const row = r as typeof r & { lost_by?: string | null; restored_by?: string | null };
      return [row.responsavel_id, row.lost_by, row.restored_by].filter((v): v is string => !!v);
    })));

    const [{ data: clientes }, { data: profiles }] = await Promise.all([
      clienteIds.length > 0
        ? context.supabase.from("clientes").select("id,razao_social,nome_fantasia").in("id", clienteIds)
        : Promise.resolve({ data: [] as Array<{ id: string; razao_social: string | null; nome_fantasia: string | null }> }),
      profileIds.length > 0
        ? context.supabase.from("profiles").select("id,full_name,email").in("id", profileIds)
        : Promise.resolve({ data: [] as Array<{ id: string; full_name: string | null; email: string | null }> }),
    ]);

    const cliMap = new Map((clientes ?? []).map((c) => [c.id, c.nome_fantasia || c.razao_social || ""]));
    const proMap = new Map((profiles ?? []).map((p) => [p.id, p.full_name || p.email || ""]));

    return rows.map((r) => {
      const row = r as typeof r & {
        lost_at?: string | null;
        lost_by?: string | null;
        lost_reason?: string | null;
        restored_at?: string | null;
        restored_by?: string | null;
        lost_count?: number | null;
      };
      return {
      id: r.id,
      codigo: r.codigo ?? "",
      titulo: r.titulo,
      cliente_id: r.cliente_id,
      cliente_nome: r.cliente_id ? cliMap.get(r.cliente_id) ?? null : null,
      nome_lead: r.nome_lead,
      empresa_lead: r.empresa_lead,
      responsavel_id: r.responsavel_id,
      responsavel_nome: proMap.get(r.responsavel_id) ?? "",
      valor_estimado: r.valor_estimado === null ? null : Number(r.valor_estimado),
      valor_estimado_usd: (row as { valor_estimado_usd?: number | null }).valor_estimado_usd === null || (row as { valor_estimado_usd?: number | null }).valor_estimado_usd === undefined ? null : Number((row as { valor_estimado_usd: number }).valor_estimado_usd),
      probabilidade: r.probabilidade,
      expected_close_date: r.expected_close_date,
      lifecycle_stage: r.lifecycle_stage as LifecycleStage,
      pipeline_stage: r.pipeline_stage as PipelineStage,
      stage_entered_at: r.stage_entered_at,
      lost_at: row.lost_at ?? null,
      lost_by: row.lost_by ?? null,
      lost_by_nome: row.lost_by ? proMap.get(row.lost_by) ?? null : null,
      lost_reason: row.lost_reason ?? null,
      restored_at: row.restored_at ?? null,
      restored_by: row.restored_by ?? null,
      restored_by_nome: row.restored_by ? proMap.get(row.restored_by) ?? null : null,
      lost_count: row.lost_count ?? 0,
      processo_id: r.processo_id,
      created_at: r.created_at,
      email: r.email ?? null,
      telefone: r.telefone ?? null,
      observacoes: r.observacoes ?? null,
      };
    });
  });

export const updateStage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string; stage: PipelineStage; lost_reason?: string }) =>
    z.object({
      id: z.string().uuid(),
      stage: stageSchema,
      lost_reason: z.string().trim().min(10, "Motivo da perda deve ter pelo menos 10 caracteres").max(500).optional(),
    }).parse(data),
  )
  .handler(async ({ data, context }) => {
    if (data.stage === "perdido" && !data.lost_reason) {
      throw new Error("Motivo da perda é obrigatório");
    }
    const patch: { pipeline_stage: PipelineStage; lost_reason?: string | null } = {
      pipeline_stage: data.stage,
    };
    if (data.stage === "perdido") patch.lost_reason = data.lost_reason ?? null;
    if (data.stage !== "perdido") patch.lost_reason = null;
    const { error } = await context.supabase
      .from("oportunidades")
      .update(patch)
      .eq("id", data.id);
    if (error) throw friendlyDbError(error);
    return { ok: true };
  });

export const restoreOportunidade = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string; stage?: Exclude<PipelineStage, "perdido"> }) =>
    z.object({
      id: z.string().uuid(),
      stage: z.enum(RESTORE_PIPELINE_STAGES).optional(),
    }).parse(data),
  )
  .handler(async ({ data, context }) => {
    let targetStage: Exclude<PipelineStage, "perdido"> = data.stage ?? "qualificado";
    if (!data.stage) {
      const { data: history } = await context.supabase
        .from("oportunidade_stage_history")
        .select("from_pipeline")
        .eq("oportunidade_id", data.id)
        .eq("to_pipeline", "perdido")
        .order("changed_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      const previous = history?.from_pipeline as PipelineStage | undefined;
      if (previous && previous !== "perdido") targetStage = previous as Exclude<PipelineStage, "perdido">;
    }

    const { error } = await context.supabase
      .from("oportunidades")
      .update({ pipeline_stage: targetStage, lost_reason: null })
      .eq("id", data.id)
      .eq("pipeline_stage", "perdido");
    if (error) throw friendlyDbError(error);
    return { ok: true, stage: targetStage };
  });

/** Oportunidade parecida encontrada na verificação anti-duplicidade. */
export type OportunidadeDuplicada = {
  id: string;
  codigo: string;
  titulo: string;
  valor_estimado: number | null;
  pipeline_stage: string;
  created_at: string;
};

export const createOportunidade = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: {
    titulo: string;
    empresa_lead?: string;
    nome_lead?: string;
    email?: string;
    telefone?: string;
    valor_estimado?: number;
    valor_estimado_usd?: number;
    probabilidade?: number;
    cliente_id?: string;
    /** Chave única por tentativa de criação — evita duplo submit / retry. */
    idempotency_key?: string;
    /** Usuário confirmou que quer criar mesmo havendo oportunidade parecida. */
    confirmar_duplicata?: boolean;
  }) =>
    z.object({
      titulo: z.string().min(2).max(200),
      empresa_lead: z.string().max(200).optional(),
      nome_lead: z.string().max(200).optional(),
      email: z.string().max(200).optional().or(z.literal("")),
      telefone: z.string().max(50).optional(),
      valor_estimado: z.number().min(0).max(99999999).optional(),
      valor_estimado_usd: z.number().min(0).max(99999999).optional(),
      probabilidade: z.number().int().min(0).max(100).optional(),
      cliente_id: z.string().uuid().optional(),
      idempotency_key: z.string().min(8).max(64).optional(),
      confirmar_duplicata: z.boolean().optional(),
    }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;

    // ---- 1. Idempotência: mesma requisição não cria duas oportunidades ----
    if (data.idempotency_key) {
      const { data: existente } = await sb
        .from("oportunidades")
        .select("id, codigo")
        .eq("idempotency_key", data.idempotency_key)
        .maybeSingle();
      if (existente) return { ...(existente as { id: string; codigo: string }), reused: true as const, needsConfirm: false as const, duplicatas: [] as OportunidadeDuplicada[] };
    }

    // ---- 2. Verificação de possível duplicata (últimas 24h) ----
    if (!data.confirmar_duplicata) {
      const desde = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      let q = sb
        .from("oportunidades")
        .select("id, codigo, titulo, valor_estimado, pipeline_stage, created_at")
        .is("deleted_at", null)
        .not("pipeline_stage", "in", "(ganho,perdido)")
        .gte("created_at", desde)
        .limit(5);
      if (data.cliente_id) q = q.eq("cliente_id", data.cliente_id);
      else if (data.empresa_lead) q = q.ilike("empresa_lead", data.empresa_lead.trim());
      else q = q.eq("id", "00000000-0000-0000-0000-000000000000"); // sem cliente/empresa: nada a comparar

      const { data: candidatas } = await q;
      const tituloNorm = data.titulo.trim().toLowerCase();
      const duplicatas = ((candidatas ?? []) as OportunidadeDuplicada[]).filter(
        (o) =>
          o.titulo.trim().toLowerCase() === tituloNorm ||
          (data.valor_estimado != null &&
            o.valor_estimado != null &&
            Number(o.valor_estimado) === Number(data.valor_estimado)),
      );
      if (duplicatas.length > 0) {
        // Não cria: devolve as candidatas para o usuário confirmar na tela.
        return {
          id: null,
          codigo: null,
          reused: false as const,
          needsConfirm: true as const,
          duplicatas,
        };
      }

    }

    // ---- 3. Inserção ----
    const { data: row, error } = await sb
      .from("oportunidades")
      .insert({
        titulo: data.titulo,
        empresa_lead: data.empresa_lead || null,
        nome_lead: data.nome_lead || null,
        email: data.email || null,
        telefone: data.telefone || null,
        valor_estimado: data.valor_estimado ?? null,
        valor_estimado_usd: data.valor_estimado_usd ?? null,
        probabilidade: data.probabilidade ?? 10,
        cliente_id: data.cliente_id ?? null,
        responsavel_id: context.userId,
        idempotency_key: data.idempotency_key ?? null,
      })
      .select("id, codigo")
      .single();

    if (error) {
      // Corrida: outra requisição com a mesma chave chegou primeiro → devolve a existente.
      if (error.code === "23505" && data.idempotency_key) {
        const { data: existente } = await sb
          .from("oportunidades")
          .select("id, codigo")
          .eq("idempotency_key", data.idempotency_key)
          .maybeSingle();
        if (existente) return { ...(existente as { id: string; codigo: string }), reused: true as const, needsConfirm: false as const, duplicatas: [] as OportunidadeDuplicada[] };
      }
      throw friendlyDbError(error);
    }
    return { ...(row as { id: string; codigo: string }), reused: false as const, needsConfirm: false as const, duplicatas: [] as OportunidadeDuplicada[] };
  });


export const updateOportunidade = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: {
    id: string;
    titulo?: string;
    empresa_lead?: string | null;
    nome_lead?: string | null;
    email?: string | null;
    telefone?: string | null;
    valor_estimado?: number | null;
    valor_estimado_usd?: number | null;
    probabilidade?: number;
    expected_close_date?: string | null;
    observacoes?: string | null;
  }) =>
    z.object({
      id: z.string().uuid(),
      titulo: z.string().min(2).max(200).optional(),
      empresa_lead: z.string().max(200).nullable().optional(),
      nome_lead: z.string().max(200).nullable().optional(),
      email: z.string().max(200).nullable().optional().or(z.literal("")),
      telefone: z.string().max(50).nullable().optional(),
        valor_estimado: z.number().min(0).max(99999999).nullable().optional(),
        valor_estimado_usd: z.number().min(0).max(99999999).nullable().optional(),
      probabilidade: z.number().int().min(0).max(100).optional(),
      expected_close_date: z.string().nullable().optional(),
      observacoes: z.string().max(2000).nullable().optional(),
    }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { id, ...rest } = data;
    const patch: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(rest)) {
      if (v === undefined) continue;
      patch[k] = v === "" ? null : v;
    }
    if (Object.keys(patch).length === 0) return { ok: true };
    const { error } = await context.supabase
      .from("oportunidades")
      .update(patch as never)
      .eq("id", id);
    if (error) throw friendlyDbError(error);
    return { ok: true };
  });

export const convertToProcesso = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string; cliente_id?: string }) =>
    z.object({
      id: z.string().uuid(),
      cliente_id: z.string().uuid().optional(),
    }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { data: opp, error: oppErr } = await context.supabase
      .from("oportunidades")
      .select("*")
      .eq("id", data.id)
      .single();
    if (oppErr || !opp) throw new Error("Oportunidade não encontrada");
    if (opp.processo_id) throw new Error("Já convertida em processo");

    const clienteId = data.cliente_id ?? opp.cliente_id;
    if (!clienteId) throw new Error("Selecione um cliente antes de converter");

    const { data: proc, error: procErr } = await context.supabase
      .from("processos")
      .insert({
        codigo: "",
        titulo: opp.titulo,
        cliente_id: clienteId,
        pilar_id: opp.responsavel_id,
        tipo: "projeto",
        stage: "Lead",
        valor: opp.valor_estimado,
      })
      .select("id, codigo")
      .single();
    if (procErr || !proc) throw new Error(procErr?.message ?? "Falha ao criar processo");

    const { error: updErr } = await context.supabase
      .from("oportunidades")
      .update({
        pipeline_stage: "ganho",
        cliente_id: clienteId,
        processo_id: proc.id,
      })
      .eq("id", data.id);
    if (updErr) throw friendlyDbError(updErr);

    return { processo_id: proc.id, processo_codigo: proc.codigo };
  });

/** Contexto de uma oportunidade para pré-preencher o orçamento. */
export type OportunidadeContexto = {
  id: string;
  codigo: string;
  titulo: string;
  cliente_id: string | null;
  cliente_nome: string | null;
  cliente_codigo: string | null;
  cliente_pais: string | null;
  cliente_documento: string | null;
  cliente_moeda: string | null;
  empresa_lead: string | null;
  nome_lead: string | null;
  email: string | null;
  telefone: string | null;
  valor_estimado: number | null;
  valor_estimado_usd: number | null;
  pipeline_stage: PipelineStage;
};

export const getOportunidade = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }): Promise<OportunidadeContexto> => {
    const { data: opp, error } = await context.supabase
      .from("oportunidades")
      .select(
        "id, codigo, titulo, cliente_id, empresa_lead, nome_lead, email, telefone, valor_estimado, valor_estimado_usd, pipeline_stage",
      )
      .eq("id", data.id)
      .single();
    if (error || !opp) throw new Error("Oportunidade não encontrada");

    let cliente: {
      razao_social: string | null; codigo: string | null; pais: string | null;
      documento_fiscal_numero: string | null; moeda: string | null;
    } | null = null;
    if (opp.cliente_id) {
      const { data: cli } = await context.supabase
        .from("clientes")
        .select("razao_social, codigo, pais, documento_fiscal_numero, moeda")
        .eq("id", opp.cliente_id)
        .maybeSingle();
      cliente = cli ?? null;
    }

    return {
      id: opp.id,
      codigo: opp.codigo ?? "",
      titulo: opp.titulo,
      cliente_id: opp.cliente_id,
      cliente_nome: cliente?.razao_social ?? null,
      cliente_codigo: cliente?.codigo ?? null,
      cliente_pais: cliente?.pais ?? null,
      cliente_documento: cliente?.documento_fiscal_numero ?? null,
      cliente_moeda: cliente?.moeda ?? null,
      empresa_lead: opp.empresa_lead,
      nome_lead: opp.nome_lead,
      email: opp.email,
      telefone: opp.telefone,
      valor_estimado: opp.valor_estimado,
      valor_estimado_usd: opp.valor_estimado_usd,
      pipeline_stage: opp.pipeline_stage as PipelineStage,
    };
  });

/** Vincula um cliente existente/recém-criado à oportunidade (deixa de ser lead). */
export const vincularClienteOportunidade = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string; cliente_id: string }) =>
    z.object({ id: z.string().uuid(), cliente_id: z.string().uuid() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("oportunidades")
      .update({ cliente_id: data.cliente_id })
      .eq("id", data.id);
    if (error) throw friendlyDbError(error);
    return { ok: true };
  });
