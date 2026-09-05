/* eslint-disable @typescript-eslint/no-explicit-any */
import { createServerFn } from "@tanstack/react-start";
import { friendlyDbError } from "@/lib/db-errors";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const CODIGO_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"; // sem 0/O/1/I
function genCodigo(len = 6): string {
  let s = "";
  for (let i = 0; i < len; i++)
    s += CODIGO_ALPHABET[Math.floor(Math.random() * CODIGO_ALPHABET.length)];
  return s;
}

async function isAdminOrManager(sb: any, uid: string): Promise<boolean> {
  const { data: a } = await sb.rpc("has_role", { _user_id: uid, _role: "admin" });
  if (a) return true;
  const { data: m } = await sb.rpc("has_role", { _user_id: uid, _role: "manager" });
  return !!m;
}

// ---------- Catálogo ----------

export const listSegmentos = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await (context.supabase as any)
      .from("entrevista_segmentos")
      .select("id, slug, nome_pt, nome_es, nome_en, ordem, ativo")
      .eq("ativo", true)
      .order("nome_pt", { ascending: true });
    if (error) throw friendlyDbError(error);
    return data as Array<{
      id: string;
      slug: string;
      nome_pt: string;
      nome_es: string | null;
      nome_en: string | null;
      ordem: number;
      ativo: boolean;
    }>;
  });

// ---------- Entrevistas ----------

export type EntrevistaRow = {
  id: string;
  codigo: string;
  segmento_id: string;
  segmento_nome: string;
  criado_por: string;
  criador_nome: string | null;
  criador_email: string | null;
  lead_nome: string | null;
  lead_email: string | null;
  lead_empresa: string | null;
  idioma_default: "pt" | "es" | "en";
  status: "pendente" | "respondida" | "expirada";
  respondida_em: string | null;
  created_at: string;
  deleted_at: string | null;
  deleted_by: string | null;
  deleted_reason: string | null;
  purge_at: string | null;
};

export const listEntrevistas = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({ escopo: z.enum(["ativas", "lixeira"]).default("ativas") })
      .partial()
      .parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const escopo = data?.escopo ?? "ativas";
    let q = sb
      .from("entrevistas")
      .select(
        "id, codigo, segmento_id, criado_por, lead_nome, lead_email, lead_empresa, idioma_default, status, respondida_em, created_at, deleted_at, deleted_by, deleted_reason, purge_at",
      )
      .order("created_at", { ascending: false })
      .limit(500);
    if (escopo === "lixeira") q = q.not("deleted_at", "is", null);
    else q = q.is("deleted_at", null);
    const { data: rows0, error } = await q;
    if (error) throw friendlyDbError(error);
    const rows = (rows0 ?? []) as any[];
    if (rows.length === 0) return [] as EntrevistaRow[];
    const segIds = Array.from(new Set(rows.map((r) => r.segmento_id)));
    const userIds = Array.from(new Set(rows.map((r) => r.criado_por)));
    const [{ data: segs }, { data: profs }] = await Promise.all([
      sb.from("entrevista_segmentos").select("id, nome_pt").in("id", segIds),
      sb.from("profiles").select("id, full_name, email").in("id", userIds),
    ]);
    const segMap = new Map<string, string>((segs ?? []).map((s: any) => [s.id, s.nome_pt]));
    const profMap = new Map<string, { full_name: string | null; email: string | null }>(
      (profs ?? []).map((p: any) => [p.id, { full_name: p.full_name, email: p.email }]),
    );
    return rows.map((r) => ({
      ...r,
      segmento_nome: segMap.get(r.segmento_id) ?? "—",
      criador_nome: profMap.get(r.criado_por)?.full_name ?? null,
      criador_email: profMap.get(r.criado_por)?.email ?? null,
    })) as EntrevistaRow[];
  });

const criarSchema = z.object({
  segmento_id: z.string().uuid(),
  lead_nome: z.string().max(200).optional().nullable(),
  lead_email: z.string().email().max(200).optional().nullable(),
  lead_empresa: z.string().max(200).optional().nullable(),
  idioma_default: z.enum(["pt", "es", "en"]).default("pt"),
});

function appBaseUrl(): string {
  return process.env.PUBLIC_APP_URL || "https://sltkamericas.com";
}

export const criarEntrevista = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => criarSchema.parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    // Retry para gerar código único
    let codigo = "";
    for (let i = 0; i < 5; i++) {
      const c = genCodigo(6);
      const { data: dup } = await sb.from("entrevistas").select("id").eq("codigo", c).maybeSingle();
      if (!dup) {
        codigo = c;
        break;
      }
    }
    if (!codigo) throw new Error("Não foi possível gerar um código único, tente novamente.");
    const { data: row, error } = await sb
      .from("entrevistas")
      .insert({
        codigo,
        segmento_id: data.segmento_id,
        criado_por: context.userId,
        lead_nome: data.lead_nome ?? null,
        lead_email: data.lead_email ?? null,
        lead_empresa: data.lead_empresa ?? null,
        idioma_default: data.idioma_default,
      })
      .select("id, codigo")
      .single();
    if (error) throw friendlyDbError(error);

    // e-mail para o criador
    try {
      const { safeDispatch } = await import("@/lib/email/safe-dispatch.server");
      const { data: seg } = await sb
        .from("entrevista_segmentos")
        .select("nome_pt")
        .eq("id", data.segmento_id)
        .maybeSingle();
      const { data: prof } = await sb
        .from("profiles")
        .select("full_name, email")
        .eq("id", context.userId)
        .maybeSingle();
      await safeDispatch({
        eventKey: "entrevista.criada",
        triggeredBy: context.userId,
        entityTable: "entrevistas",
        entityId: row.id,
        vars: {
          codigo,
          segmento: seg?.nome_pt ?? "—",
          link_publico: `${appBaseUrl()}/entrevista/${codigo}`,
          criador_nome: prof?.full_name ?? prof?.email ?? "Time SLTK",
          link: `${appBaseUrl()}/comercial/entrevistas/${row.id}`,
        },
        extraTo: prof?.email ? [prof.email] : [],
      });
    } catch (e) {
      console.error("[entrevista.criada]", e);
    }

    return { id: row.id as string, codigo };
  });

export const getEntrevista = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const { data: e, error } = await sb
      .from("entrevistas")
      .select(
        "id, codigo, segmento_id, criado_por, lead_nome, lead_email, lead_empresa, idioma_default, status, respondida_em, expires_at, created_at, updated_at",
      )
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw friendlyDbError(error);
    if (!e) throw new Error("Entrevista não encontrada.");
    const [{ data: seg }, { data: prof }] = await Promise.all([
      sb
        .from("entrevista_segmentos")
        .select("id, slug, nome_pt")
        .eq("id", e.segmento_id)
        .maybeSingle(),
      sb.from("profiles").select("id, full_name, email").eq("id", e.criado_por).maybeSingle(),
    ]);

    // Respostas se já respondida
    let respostas: Array<{
      pergunta_id: string;
      numero: number;
      enunciado: string;
      valor_text: string | null;
      valor_options: any;
      descricao_extra: string | null;
      opcoes: Array<{ label: string }>;
    }> = [];
    if (e.status === "respondida") {
      const { data: resps } = await sb
        .from("entrevista_respostas")
        .select("pergunta_id, valor_text, valor_options, descricao_extra")
        .eq("entrevista_id", e.id);
      const pIds = (resps ?? []).map((r: any) => r.pergunta_id);
      if (pIds.length > 0) {
        const { data: perg } = await sb
          .from("entrevista_perguntas")
          .select("id, numero, enunciado_pt")
          .in("id", pIds);
        const pMap = new Map<string, { numero: number; enunciado_pt: string }>(
          (perg ?? []).map((p: any) => [p.id, { numero: p.numero, enunciado_pt: p.enunciado_pt }]),
        );
        respostas = (resps ?? [])
          .map((r: any) => ({
            pergunta_id: r.pergunta_id,
            numero: pMap.get(r.pergunta_id)?.numero ?? 0,
            enunciado: pMap.get(r.pergunta_id)?.enunciado_pt ?? "",
            valor_text: r.valor_text,
            valor_options: r.valor_options,
            descricao_extra: r.descricao_extra,
            opcoes: [],
          }))
          .sort((a: { numero: number }, b: { numero: number }) => a.numero - b.numero);
      }
    }

    return {
      ...e,
      segmento: seg,
      criador: prof,
      link_publico: `${appBaseUrl()}/entrevista/${e.codigo}`,
      respostas,
    };
  });

export const enviarEntrevistaPorEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), email: z.string().email() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const { data: e } = await sb
      .from("entrevistas")
      .select("id, codigo, segmento_id, lead_nome, criado_por")
      .eq("id", data.id)
      .maybeSingle();
    if (!e) throw new Error("Entrevista não encontrada.");
    const [{ data: seg }, { data: prof }] = await Promise.all([
      sb.from("entrevista_segmentos").select("nome_pt").eq("id", e.segmento_id).maybeSingle(),
      sb.from("profiles").select("full_name, email").eq("id", e.criado_por).maybeSingle(),
    ]);
    const { safeDispatch } = await import("@/lib/email/safe-dispatch.server");
    await safeDispatch({
      eventKey: "entrevista.enviada",
      triggeredBy: context.userId,
      entityTable: "entrevistas",
      entityId: e.id,
      vars: {
        codigo: e.codigo,
        segmento: seg?.nome_pt ?? "—",
        link_publico: `${appBaseUrl()}/entrevista/${e.codigo}`,
        criador_nome: prof?.full_name ?? "Time SLTK",
        lead_nome: e.lead_nome ?? "",
        link: `${appBaseUrl()}/entrevista/${e.codigo}`,
      },
      extraTo: [data.email],
      extraCc: prof?.email ? [prof.email] : [],
    });
    return { ok: true };
  });

export const expirarEntrevista = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const { data: e, error } = await sb
      .from("entrevistas")
      .update({ status: "expirada", updated_at: new Date().toISOString() })
      .eq("id", data.id)
      .select("id, codigo, segmento_id, criado_por")
      .maybeSingle();
    if (error) throw friendlyDbError(error);
    if (!e) throw new Error("Sem permissão ou entrevista inexistente.");
    try {
      const { safeDispatch } = await import("@/lib/email/safe-dispatch.server");
      const [{ data: seg }, { data: prof }] = await Promise.all([
        sb.from("entrevista_segmentos").select("nome_pt").eq("id", e.segmento_id).maybeSingle(),
        sb.from("profiles").select("email").eq("id", e.criado_por).maybeSingle(),
      ]);
      await safeDispatch({
        eventKey: "entrevista.expirada",
        triggeredBy: context.userId,
        entityTable: "entrevistas",
        entityId: e.id,
        vars: { codigo: e.codigo, segmento: seg?.nome_pt ?? "—" },
        extraTo: prof?.email ? [prof.email] : [],
      });
    } catch {
      /* noop */
    }
    return { ok: true };
  });

// ---------- Lixeira / auditoria ----------

async function logAudit(
  sb: any,
  row: {
    entrevista_id: string;
    action: "trash" | "restore" | "purge";
    actor_id: string;
    actor_email?: string | null;
    reason?: string | null;
    meta?: any;
  },
) {
  try {
    await sb.from("entrevista_audit").insert({
      entrevista_id: row.entrevista_id,
      action: row.action,
      actor_id: row.actor_id,
      actor_email: row.actor_email ?? null,
      reason: row.reason ?? null,
      meta: row.meta ?? null,
    });
  } catch (e) {
    console.error("[entrevista_audit]", e);
  }
}

export const moverEntrevistaParaLixeira = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), motivo: z.string().max(500).optional().nullable() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const now = new Date();
    const purge = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const { data: e, error } = await sb
      .from("entrevistas")
      .update({
        deleted_at: now.toISOString(),
        deleted_by: context.userId,
        deleted_reason: data.motivo ?? null,
        purge_at: purge.toISOString(),
        updated_at: now.toISOString(),
      })
      .eq("id", data.id)
      .is("deleted_at", null)
      .select("id, codigo")
      .maybeSingle();
    if (error) throw friendlyDbError(error);
    if (!e) throw new Error("Sem permissão ou entrevista já está na lixeira.");
    const { data: prof } = await sb
      .from("profiles")
      .select("email")
      .eq("id", context.userId)
      .maybeSingle();
    await logAudit(sb, {
      entrevista_id: e.id,
      action: "trash",
      actor_id: context.userId,
      actor_email: prof?.email ?? null,
      reason: data.motivo ?? null,
      meta: { purge_at: purge.toISOString() },
    });
    return { ok: true, codigo: e.codigo, purge_at: purge.toISOString() };
  });

export const restaurarEntrevista = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const { data: e, error } = await sb
      .from("entrevistas")
      .update({
        deleted_at: null,
        deleted_by: null,
        deleted_reason: null,
        purge_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.id)
      .not("deleted_at", "is", null)
      .select("id, codigo")
      .maybeSingle();
    if (error) throw friendlyDbError(error);
    if (!e) throw new Error("Sem permissão ou entrevista não está na lixeira.");
    const { data: prof } = await sb
      .from("profiles")
      .select("email")
      .eq("id", context.userId)
      .maybeSingle();
    await logAudit(sb, {
      entrevista_id: e.id,
      action: "restore",
      actor_id: context.userId,
      actor_email: prof?.email ?? null,
    });
    return { ok: true, codigo: e.codigo };
  });

export const excluirEntrevistaDefinitivamente = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), motivo: z.string().max(500).optional().nullable() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    if (!(await isAdminOrManager(sb, context.userId))) {
      throw new Error("Apenas administradores ou gestores podem excluir definitivamente.");
    }
    const { data: e0 } = await sb
      .from("entrevistas")
      .select("id, codigo, deleted_at")
      .eq("id", data.id)
      .maybeSingle();
    if (!e0) throw new Error("Entrevista não encontrada.");
    if (!e0.deleted_at) throw new Error("Envie para a lixeira antes de excluir definitivamente.");
    const { data: prof } = await sb
      .from("profiles")
      .select("email")
      .eq("id", context.userId)
      .maybeSingle();
    // Registrar auditoria ANTES de apagar (audit tem FK on delete cascade — usar tabela persistente separada seria melhor,
    // então também gravamos snapshot em meta).
    await logAudit(sb, {
      entrevista_id: e0.id,
      action: "purge",
      actor_id: context.userId,
      actor_email: prof?.email ?? null,
      reason: data.motivo ?? null,
      meta: { codigo: e0.codigo, purged_at: new Date().toISOString() },
    });
    const { error } = await sb.from("entrevistas").delete().eq("id", data.id);
    if (error) throw friendlyDbError(error);
    return { ok: true, codigo: e0.codigo };
  });

export const listEntrevistaAudit = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ entrevista_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const { data: rows, error } = await sb
      .from("entrevista_audit")
      .select("id, action, actor_id, actor_email, reason, meta, created_at")
      .eq("entrevista_id", data.entrevista_id)
      .order("created_at", { ascending: false });
    if (error) throw friendlyDbError(error);
    return (rows ?? []) as Array<{
      id: string;
      action: "trash" | "restore" | "purge" | "create" | "update";
      actor_id: string | null;
      actor_email: string | null;
      reason: string | null;
      meta: any;
      created_at: string;
    }>;
  });
