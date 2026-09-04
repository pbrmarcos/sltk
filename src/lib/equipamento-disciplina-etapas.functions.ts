import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type AnySb = any;

export const DISCIPLINAS = ["planejamento", "engenharia", "producao", "qualidade", "pos_venda"] as const;
export type Disciplina = (typeof DISCIPLINAS)[number];

export const ETAPA_STATUS_LIST = ["nao_iniciado", "em_progresso", "bloqueado", "concluido"] as const;
export type EtapaStatus = (typeof ETAPA_STATUS_LIST)[number];

export const PRIORIDADES = ["baixa", "media", "alta", "urgente"] as const;
export type Prioridade = (typeof PRIORIDADES)[number];

const eqDiscInput = z.object({
  equipamentoId: z.string().uuid(),
  disciplina: z.enum(DISCIPLINAS),
});

async function currentUserName(sb: AnySb, uid: string): Promise<string> {
  const { data } = await sb.from("profiles").select("full_name, email").eq("id", uid).maybeSingle();
  return data?.full_name ?? data?.email ?? "Usuário";
}

// ============ LIST ============
export const listDisciplinaEtapas = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => eqDiscInput.parse(i))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as AnySb;
    const { data: rows, error } = await sb
      .from("equipamento_disciplina_etapas")
      .select(
        "id, equipamento_id, disciplina, parent_id, ordem, titulo, descricao, status, prioridade, progresso, data_vencimento, responsavel_id, responsavel_nome, created_by, updated_at",
      )
      .eq("equipamento_id", data.equipamentoId)
      .eq("disciplina", data.disciplina)
      .is("deleted_at", null)
      .order("ordem", { ascending: true });
    if (error) throw new Error(error.message);

    const ids = (rows ?? []).map((r: any) => r.id);
    let commentCounts: Record<string, number> = {};
    if (ids.length) {
      const { data: cs } = await sb
        .from("equipamento_etapa_comentarios")
        .select("etapa_id")
        .in("etapa_id", ids);
      for (const c of cs ?? []) {
        commentCounts[c.etapa_id] = (commentCounts[c.etapa_id] ?? 0) + 1;
      }
    }
    return (rows ?? []).map((r: any) => ({ ...r, comentarios_count: commentCounts[r.id] ?? 0 }));
  });

// Todas as etapas (todas as disciplinas) de um equipamento — usada na Timeline.
export const listAllEquipamentoEtapas = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ equipamentoId: z.string().uuid() }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase as AnySb;
    const { data: rows, error } = await sb
      .from("equipamento_disciplina_etapas")
      .select(
        "id, disciplina, titulo, status, prioridade, data_vencimento, responsavel_nome, parent_id, ordem, created_at",
      )
      .eq("equipamento_id", data.equipamentoId)
      .is("deleted_at", null)
      .order("data_vencimento", { ascending: true, nullsFirst: false });
    if (error) throw new Error(error.message);
    return (rows ?? []) as Array<{
      id: string;
      disciplina: string;
      titulo: string;
      status: string;
      prioridade: string;
      data_vencimento: string | null;
      responsavel_nome: string | null;
      parent_id: string | null;
      ordem: number;
      created_at: string;
    }>;
  });

// ============ CREATE ============
const createInput = z.object({
  equipamento_id: z.string().uuid(),
  disciplina: z.enum(DISCIPLINAS),
  titulo: z.string().min(1).max(200),
  parent_id: z.string().uuid().nullable().optional(),
  ordem: z.number().int().min(0).optional(),
});
export const createEtapa = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => createInput.parse(i))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as AnySb;
    const uid = context.userId;
    // computa próxima ordem se não fornecida
    let ordem = data.ordem;
    if (ordem == null) {
      const { data: last } = await sb
        .from("equipamento_disciplina_etapas")
        .select("ordem")
        .eq("equipamento_id", data.equipamento_id)
        .eq("disciplina", data.disciplina)
        .is("deleted_at", null)
        .order("ordem", { ascending: false })
        .limit(1)
        .maybeSingle();
      ordem = (last?.ordem ?? 0) + 1;
    }
    const { data: row, error } = await sb
      .from("equipamento_disciplina_etapas")
      .insert({
        equipamento_id: data.equipamento_id,
        disciplina: data.disciplina,
        titulo: data.titulo,
        parent_id: data.parent_id ?? null,
        ordem,
        created_by: uid,
        updated_by: uid,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id as string };
  });

// ============ UPDATE ============
const updateInput = z.object({
  id: z.string().uuid(),
  titulo: z.string().min(1).max(200).optional(),
  descricao: z.string().max(4000).nullable().optional(),
  status: z.enum(ETAPA_STATUS_LIST).optional(),
  prioridade: z.enum(PRIORIDADES).optional(),
  progresso: z.number().int().min(0).max(100).optional(),
  data_vencimento: z.string().nullable().optional(),
  responsavel_id: z.string().uuid().nullable().optional(),
  responsavel_nome: z.string().nullable().optional(),
  ordem: z.number().int().min(0).optional(),
  parent_id: z.string().uuid().nullable().optional(),
});
export const updateEtapa = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => updateInput.parse(i))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as AnySb;
    const { id, ...rest } = data;
    const payload: Record<string, unknown> = { ...rest, updated_by: context.userId };
    const { error } = await sb.from("equipamento_disciplina_etapas").update(payload).eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============ REORDER (bulk) ============
const reorderInput = z.object({
  equipamento_id: z.string().uuid(),
  disciplina: z.enum(DISCIPLINAS),
  items: z.array(
    z.object({ id: z.string().uuid(), ordem: z.number().int().min(0), status: z.enum(ETAPA_STATUS_LIST).optional() }),
  ),
});
export const reorderEtapas = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => reorderInput.parse(i))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as AnySb;
    for (const it of data.items) {
      const payload: Record<string, unknown> = { ordem: it.ordem, updated_by: context.userId };
      if (it.status) payload.status = it.status;
      await sb.from("equipamento_disciplina_etapas").update(payload).eq("id", it.id);
    }
    return { ok: true };
  });

// ============ DELETE ============
export const deleteEtapa = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as AnySb;
    const { error } = await sb
      .from("equipamento_disciplina_etapas")
      .update({ deleted_at: new Date().toISOString(), updated_by: context.userId })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============ COMENTÁRIOS ============
export const listEtapaComentarios = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ etapa_id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as AnySb;
    const { data: rows, error } = await sb
      .from("equipamento_etapa_comentarios")
      .select("id, autor_id, autor_nome, texto, created_at")
      .eq("etapa_id", data.etapa_id)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const addEtapaComentario = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({
      etapa_id: z.string().uuid(),
      texto: z.string().min(1).max(4000),
      mentions: z.array(z.string().uuid()).optional().default([]),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase as AnySb;
    const nome = await currentUserName(sb, context.userId);
    const { data: row, error } = await sb
      .from("equipamento_etapa_comentarios")
      .insert({
        etapa_id: data.etapa_id,
        autor_id: context.userId,
        autor_nome: nome,
        texto: data.texto,
        mentions: data.mentions ?? [],
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    await sb
      .from("equipamento_disciplina_etapas")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", data.etapa_id);
    return { id: row.id as string };
  });

// ============ USUÁRIOS (delegar) ============
export const listUsuariosParaEtapa = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as AnySb;
    const { data, error } = await sb
      .from("profiles")
      .select("id, full_name, email")
      .is("deleted_at", null)
      .order("full_name", { ascending: true })
      .limit(200);
    if (error) throw new Error(error.message);
    return data ?? [];
  });
