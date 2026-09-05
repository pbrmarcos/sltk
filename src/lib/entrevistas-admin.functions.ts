/* eslint-disable @typescript-eslint/no-explicit-any */
import { createServerFn } from "@tanstack/react-start";
import { friendlyDbError } from "@/lib/db-errors";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { aiChatComplete, aiConfigured } from "@/lib/ai-gateway.server";

const FORMATOS = ["text", "textarea", "single_choice", "multi_choice", "number", "country"] as const;

async function getRole(sb: any, uid: string): Promise<"admin" | "manager" | null> {
  const { data: a } = await sb.rpc("has_role", { _user_id: uid, _role: "admin" });
  if (a) return "admin";
  const { data: m } = await sb.rpc("has_role", { _user_id: uid, _role: "manager" });
  if (m) return "manager";
  return null;
}

async function requireAdminOrManager(sb: any, uid: string) {
  const r = await getRole(sb, uid);
  if (!r) throw new Error("Acesso restrito a administradores e managers.");
  return r;
}

async function audit(sb: any, uid: string, row: {
  entity_type: "segmento" | "pergunta" | "opcao";
  entity_id: string;
  segmento_id?: string | null;
  action: "create" | "update" | "delete" | "reorder" | "translate" | "toggle";
  before?: any;
  after?: any;
  meta?: any;
}) {
  try {
    const { data: prof } = await sb.from("profiles").select("email").eq("id", uid).maybeSingle();
    await sb.from("entrevista_catalog_audit").insert({
      ...row,
      actor_id: uid,
      actor_email: prof?.email ?? null,
    });
  } catch (e) { console.error("[entrevista_catalog_audit]", e); }
}

// -------------------- Segmentos --------------------

export type SegmentoAdminRow = {
  id: string;
  slug: string;
  nome_pt: string;
  nome_es: string | null;
  nome_en: string | null;
  ordem: number;
  ativo: boolean;
  total_perguntas: number;
  total_entrevistas: number;
};

export const listSegmentosAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as any;
    await requireAdminOrManager(sb, context.userId);
    const { data: segs, error } = await sb
      .from("entrevista_segmentos")
      .select("id, slug, nome_pt, nome_es, nome_en, ordem, ativo")
      .order("nome_pt", { ascending: true });
    if (error) throw friendlyDbError(error);
    const ids = (segs ?? []).map((s: any) => s.id);
    if (ids.length === 0) return [] as SegmentoAdminRow[];
    const [pergs, entrs] = await Promise.all([
      sb.from("entrevista_perguntas").select("segmento_id").in("segmento_id", ids),
      sb.from("entrevistas").select("segmento_id").in("segmento_id", ids).is("deleted_at", null),
    ]);
    const cnt = (arr: any[]) => {
      const m = new Map<string, number>();
      for (const r of arr ?? []) m.set(r.segmento_id, (m.get(r.segmento_id) ?? 0) + 1);
      return m;
    };
    const pMap = cnt(pergs.data ?? []);
    const eMap = cnt(entrs.data ?? []);
    return (segs ?? []).map((s: any) => ({
      ...s,
      total_perguntas: pMap.get(s.id) ?? 0,
      total_entrevistas: eMap.get(s.id) ?? 0,
    })) as SegmentoAdminRow[];
  });

const segUpsertSchema = z.object({
  id: z.string().uuid().optional(),
  slug: z.string().min(2).max(80).regex(/^[a-z0-9-]+$/, "Use apenas letras minúsculas, números e hífen."),
  nome_pt: z.string().min(2).max(200),
  nome_es: z.string().max(200).optional().nullable(),
  nome_en: z.string().max(200).optional().nullable(),
});

export const upsertSegmento = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => segUpsertSchema.parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const role = await requireAdminOrManager(sb, context.userId);
    if (!data.id && role !== "admin") throw new Error("Apenas admin pode criar segmentos.");

    if (data.id) {
      const { data: before } = await sb.from("entrevista_segmentos").select("*").eq("id", data.id).maybeSingle();
      const { data: after, error } = await sb.from("entrevista_segmentos").update({
        slug: data.slug, nome_pt: data.nome_pt, nome_es: data.nome_es ?? null, nome_en: data.nome_en ?? null,
      }).eq("id", data.id).select("*").maybeSingle();
      if (error) throw friendlyDbError(error);
      await audit(sb, context.userId, { entity_type: "segmento", entity_id: data.id, segmento_id: data.id, action: "update", before, after });
      return after;
    }
    // Insert
    const { data: maxRow } = await sb.from("entrevista_segmentos").select("ordem").order("ordem", { ascending: false }).limit(1).maybeSingle();
    const ordem = ((maxRow?.ordem as number | undefined) ?? 0) + 1;
    const { data: created, error } = await sb.from("entrevista_segmentos").insert({
      slug: data.slug, nome_pt: data.nome_pt, nome_es: data.nome_es ?? null, nome_en: data.nome_en ?? null, ordem, ativo: true,
    }).select("*").single();
    if (error) throw friendlyDbError(error);
    await audit(sb, context.userId, { entity_type: "segmento", entity_id: created.id, segmento_id: created.id, action: "create", after: created });
    return created;
  });

export const toggleSegmento = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), ativo: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const role = await requireAdminOrManager(sb, context.userId);
    if (role !== "admin") throw new Error("Apenas admin pode ativar/desativar segmentos.");
    const { error } = await sb.from("entrevista_segmentos").update({ ativo: data.ativo }).eq("id", data.id);
    if (error) throw friendlyDbError(error);
    await audit(sb, context.userId, { entity_type: "segmento", entity_id: data.id, segmento_id: data.id, action: "toggle", meta: { ativo: data.ativo } });
    return { ok: true };
  });

// -------------------- Perguntas & opções --------------------

export type OpcaoAdminRow = {
  id: string;
  pergunta_id: string;
  ordem: number;
  label_pt: string;
  label_es: string | null;
  label_en: string | null;
  tem_descricao: boolean;
};

export type PerguntaAdminRow = {
  id: string;
  segmento_id: string;
  numero: number;
  ordem: number;
  formato: (typeof FORMATOS)[number];
  enunciado_pt: string;
  enunciado_es: string | null;
  enunciado_en: string | null;
  obrigatoria: boolean;
  respostas_count: number;
  opcoes: OpcaoAdminRow[];
};

export const getSegmentoAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ segmento_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    await requireAdminOrManager(sb, context.userId);

    const { data: seg, error: sErr } = await sb
      .from("entrevista_segmentos")
      .select("id, slug, nome_pt, nome_es, nome_en, ordem, ativo")
      .eq("id", data.segmento_id).maybeSingle();
    if (sErr) throw friendlyDbError(sErr);
    if (!seg) throw new Error("Segmento não encontrado.");

    const { data: perguntas, error: pErr } = await sb
      .from("entrevista_perguntas")
      .select("id, segmento_id, numero, ordem, formato, enunciado_pt, enunciado_es, enunciado_en, obrigatoria")
      .eq("segmento_id", data.segmento_id)
      .order("ordem", { ascending: true });
    if (pErr) throw friendlyDbError(pErr);

    const pIds = (perguntas ?? []).map((p: any) => p.id);
    let opcoes: OpcaoAdminRow[] = [];
    let respostasCnt = new Map<string, number>();
    if (pIds.length > 0) {
      const [opRes, rpRes] = await Promise.all([
        sb.from("entrevista_opcoes").select("id, pergunta_id, ordem, label_pt, label_es, label_en, tem_descricao").in("pergunta_id", pIds).order("ordem", { ascending: true }),
        sb.from("entrevista_respostas").select("pergunta_id").in("pergunta_id", pIds),
      ]);
      opcoes = (opRes.data ?? []) as OpcaoAdminRow[];
      for (const r of (rpRes.data ?? []) as any[]) {
        respostasCnt.set(r.pergunta_id, (respostasCnt.get(r.pergunta_id) ?? 0) + 1);
      }
    }
    const opByPerg = new Map<string, OpcaoAdminRow[]>();
    for (const o of opcoes) {
      const arr = opByPerg.get(o.pergunta_id) ?? [];
      arr.push(o); opByPerg.set(o.pergunta_id, arr);
    }
    const rows: PerguntaAdminRow[] = (perguntas ?? []).map((p: any) => ({
      ...p,
      respostas_count: respostasCnt.get(p.id) ?? 0,
      opcoes: opByPerg.get(p.id) ?? [],
    }));
    return { segmento: seg, perguntas: rows };
  });

const pergUpsertSchema = z.object({
  id: z.string().uuid().optional(),
  segmento_id: z.string().uuid(),
  formato: z.enum(FORMATOS),
  enunciado_pt: z.string().min(2).max(1000),
  enunciado_es: z.string().max(1000).optional().nullable(),
  enunciado_en: z.string().max(1000).optional().nullable(),
  obrigatoria: z.boolean().default(true),
});

export const upsertPergunta = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => pergUpsertSchema.parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    await requireAdminOrManager(sb, context.userId);
    if (data.id) {
      const { data: before } = await sb.from("entrevista_perguntas").select("*").eq("id", data.id).maybeSingle();
      const { data: after, error } = await sb.from("entrevista_perguntas").update({
        formato: data.formato,
        enunciado_pt: data.enunciado_pt,
        enunciado_es: data.enunciado_es ?? null,
        enunciado_en: data.enunciado_en ?? null,
        obrigatoria: data.obrigatoria,
      }).eq("id", data.id).select("*").maybeSingle();
      if (error) throw friendlyDbError(error);
      await audit(sb, context.userId, { entity_type: "pergunta", entity_id: data.id, segmento_id: data.segmento_id, action: "update", before, after });
      return after;
    }
    const { data: maxRow } = await sb.from("entrevista_perguntas").select("ordem, numero").eq("segmento_id", data.segmento_id).order("ordem", { ascending: false }).limit(1).maybeSingle();
    const ordem = ((maxRow?.ordem as number | undefined) ?? 0) + 1;
    const numero = ((maxRow?.numero as number | undefined) ?? 0) + 1;
    const { data: created, error } = await sb.from("entrevista_perguntas").insert({
      segmento_id: data.segmento_id,
      formato: data.formato,
      enunciado_pt: data.enunciado_pt,
      enunciado_es: data.enunciado_es ?? null,
      enunciado_en: data.enunciado_en ?? null,
      obrigatoria: data.obrigatoria,
      ordem, numero,
    }).select("*").single();
    if (error) throw friendlyDbError(error);
    await audit(sb, context.userId, { entity_type: "pergunta", entity_id: created.id, segmento_id: data.segmento_id, action: "create", after: created });
    return created;
  });

export const excluirPergunta = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const role = await requireAdminOrManager(sb, context.userId);
    const { count } = await sb.from("entrevista_respostas").select("id", { count: "exact", head: true }).eq("pergunta_id", data.id);
    if ((count ?? 0) > 0 && role !== "admin") {
      throw new Error("Esta pergunta já possui respostas. Apenas admin pode excluí-la.");
    }
    const { data: before } = await sb.from("entrevista_perguntas").select("*").eq("id", data.id).maybeSingle();
    // remove opções em cascata (não há FK cascade — apagamos manualmente)
    await sb.from("entrevista_opcoes").delete().eq("pergunta_id", data.id);
    const { error } = await sb.from("entrevista_perguntas").delete().eq("id", data.id);
    if (error) throw friendlyDbError(error);
    if (before) {
      await audit(sb, context.userId, { entity_type: "pergunta", entity_id: data.id, segmento_id: before.segmento_id, action: "delete", before, meta: { respostas: count ?? 0 } });
    }
    return { ok: true };
  });

export const reordenarPerguntas = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    segmento_id: z.string().uuid(),
    ordem: z.array(z.string().uuid()).min(1),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    await requireAdminOrManager(sb, context.userId);
    // Atualiza ordem e numero (mesma sequência) em lote.
    for (let i = 0; i < data.ordem.length; i++) {
      await sb.from("entrevista_perguntas").update({ ordem: i + 1, numero: i + 1 }).eq("id", data.ordem[i]).eq("segmento_id", data.segmento_id);
    }
    await audit(sb, context.userId, { entity_type: "pergunta", entity_id: data.segmento_id, segmento_id: data.segmento_id, action: "reorder", meta: { ordem: data.ordem } });
    return { ok: true };
  });

// -------- Opções --------

const opcaoUpsertSchema = z.object({
  id: z.string().uuid().optional(),
  pergunta_id: z.string().uuid(),
  label_pt: z.string().min(1).max(500),
  label_es: z.string().max(500).optional().nullable(),
  label_en: z.string().max(500).optional().nullable(),
  tem_descricao: z.boolean().default(false),
});

export const upsertOpcao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => opcaoUpsertSchema.parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    await requireAdminOrManager(sb, context.userId);
    const { data: perg } = await sb.from("entrevista_perguntas").select("segmento_id").eq("id", data.pergunta_id).maybeSingle();
    if (!perg) throw new Error("Pergunta não encontrada.");

    if (data.id) {
      const { data: before } = await sb.from("entrevista_opcoes").select("*").eq("id", data.id).maybeSingle();
      const { data: after, error } = await sb.from("entrevista_opcoes").update({
        label_pt: data.label_pt,
        label_es: data.label_es ?? null,
        label_en: data.label_en ?? null,
        tem_descricao: data.tem_descricao,
      }).eq("id", data.id).select("*").maybeSingle();
      if (error) throw friendlyDbError(error);
      await audit(sb, context.userId, { entity_type: "opcao", entity_id: data.id, segmento_id: perg.segmento_id, action: "update", before, after });
      return after;
    }
    const { data: maxRow } = await sb.from("entrevista_opcoes").select("ordem").eq("pergunta_id", data.pergunta_id).order("ordem", { ascending: false }).limit(1).maybeSingle();
    const ordem = ((maxRow?.ordem as number | undefined) ?? 0) + 1;
    const { data: created, error } = await sb.from("entrevista_opcoes").insert({
      pergunta_id: data.pergunta_id,
      label_pt: data.label_pt,
      label_es: data.label_es ?? null,
      label_en: data.label_en ?? null,
      tem_descricao: data.tem_descricao,
      ordem,
    }).select("*").single();
    if (error) throw friendlyDbError(error);
    await audit(sb, context.userId, { entity_type: "opcao", entity_id: created.id, segmento_id: perg.segmento_id, action: "create", after: created });
    return created;
  });

export const excluirOpcao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    await requireAdminOrManager(sb, context.userId);
    const { data: before } = await sb.from("entrevista_opcoes").select("*, entrevista_perguntas!inner(segmento_id)").eq("id", data.id).maybeSingle();
    const { error } = await sb.from("entrevista_opcoes").delete().eq("id", data.id);
    if (error) throw friendlyDbError(error);
    if (before) await audit(sb, context.userId, { entity_type: "opcao", entity_id: data.id, segmento_id: before.entrevista_perguntas?.segmento_id ?? null, action: "delete", before });
    return { ok: true };
  });

export const reordenarOpcoes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    pergunta_id: z.string().uuid(),
    ordem: z.array(z.string().uuid()).min(1),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    await requireAdminOrManager(sb, context.userId);
    for (let i = 0; i < data.ordem.length; i++) {
      await sb.from("entrevista_opcoes").update({ ordem: i + 1 }).eq("id", data.ordem[i]).eq("pergunta_id", data.pergunta_id);
    }
    const { data: perg } = await sb.from("entrevista_perguntas").select("segmento_id").eq("id", data.pergunta_id).maybeSingle();
    await audit(sb, context.userId, { entity_type: "opcao", entity_id: data.pergunta_id, segmento_id: perg?.segmento_id ?? null, action: "reorder", meta: { ordem: data.ordem } });
    return { ok: true };
  });

// -------- Histórico --------

export const historicoSegmento = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ segmento_id: z.string().uuid(), limit: z.number().int().min(1).max(200).optional() }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    await requireAdminOrManager(sb, context.userId);
    const { data: rows, error } = await sb
      .from("entrevista_catalog_audit")
      .select("id, entity_type, entity_id, action, actor_email, meta, before, after, created_at")
      .eq("segmento_id", data.segmento_id)
      .order("created_at", { ascending: false })
      .limit(data.limit ?? 30);
    if (error) throw friendlyDbError(error);
    return rows ?? [];
  });

// -------- Tradução assistida (Gemini opcional) --------

export const traduzirTexto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    texto: z.string().min(1).max(2000),
    para: z.enum(["es", "en"]),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    await requireAdminOrManager(sb, context.userId);
    if (!aiConfigured()) throw new Error("Recurso de IA indisponível — a integração não está configurada. Verifique em Configurações › Chaves & Diagnóstico.");
    const alvo = data.para === "es" ? "Spanish (neutral Latin American)" : "American English";
    const prompt = `Translate the following Brazilian Portuguese sentence to ${alvo}. Return ONLY the translated text, no quotes, no preface.\n\n${data.texto}`;

    const out = await aiChatComplete({ userContent: prompt, lovableModel: "google/gemini-flash-lite-latest" });
    return { texto: out };
  });
