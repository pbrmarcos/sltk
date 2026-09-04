/* eslint-disable @typescript-eslint/no-explicit-any */
import { createServerFn } from "@tanstack/react-start";
import { getSupabasePublicConfig } from "@/integrations/supabase/config";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { FormularioSchema, Idioma } from "@/lib/rfq.shared";

function randomToken(len = 6): string {
  const alphabet = "abcdefghjkmnpqrstuvwxyz23456789";
  let s = "";
  for (let i = 0; i < len; i++) s += alphabet[Math.floor(Math.random() * alphabet.length)];
  return s;
}

function slugify(input: string, max = 24): string {
  const base = (input || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base.slice(0, max) || "rfq";
}

/**
 * Constrói slug legível a partir do código do cliente + código do tipo RFQ.
 * Ex.: acme-desensaque_bigbag-a3k9m2
 */
function buildReadableSlug(clienteCodigo: string | null, tipoCodigo: string | null): string {
  const c = slugify(clienteCodigo ?? "", 16);
  const t = slugify(tipoCodigo ?? "form", 22);
  return `${c ? c + "-" : ""}${t}-${randomToken(6)}`;
}


async function hasAny(sb: any, uid: string, roles: string[]): Promise<boolean> {
  for (const r of roles) {
    const { data } = await sb.rpc("has_role", { _user_id: uid, _role: r });
    if (data === true) return true;
  }
  return false;
}

// ------------------------------------------------------------------
// Catálogo
// ------------------------------------------------------------------
export const listRfqTipos = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await (context.supabase as any)
      .from("rfq_formulario_tipo")
      .select("id, codigo, nome_pt, nome_es, nome_en, familia, descricao")
      .eq("ativo", true)
      .order("nome_pt", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as Array<{
      id: string;
      codigo: string;
      nome_pt: string;
      nome_es: string | null;
      nome_en: string | null;
      familia: string | null;
      descricao: string | null;
    }>;
  });

// Retorna o schema completo (para preview no dialog de emissão)
export const getRfqTipoSchema = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await (context.supabase as any)
      .from("rfq_formulario_tipo")
      .select("id, codigo, nome_pt, nome_es, nome_en, campos_schema")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Tipo não encontrado.");
    return row as {
      id: string;
      codigo: string;
      nome_pt: string;
      nome_es: string | null;
      nome_en: string | null;
      campos_schema: FormularioSchema;
    };
  });

// ------------------------------------------------------------------
// Admin: CRUD de tipos de RFQ (editor visual)
// ------------------------------------------------------------------
export const adminListRfqTipos = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as any;
    if (!(await hasAny(sb, context.userId, ["admin"]))) {
      throw new Error("Acesso restrito.");
    }
    const { data, error } = await sb
      .from("rfq_formulario_tipo")
      .select("id, codigo, nome_pt, nome_es, nome_en, familia, descricao, campos_schema, ativo, updated_at")
      .order("nome_pt", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as Array<{
      id: string;
      codigo: string;
      nome_pt: string;
      nome_es: string | null;
      nome_en: string | null;
      familia: string | null;
      descricao: string | null;
      campos_schema: FormularioSchema;
      ativo: boolean;
      updated_at: string;
    }>;
  });

const campoSchemaZ = z.object({
  id: z.string().min(1).max(64),
  tipo: z.enum(["text", "long_text", "numero", "boolean", "select", "multi_select", "anexo_multiplo"]),
  label: z.object({ pt: z.string().min(1), es: z.string().optional(), en: z.string().optional() }),
  opcoes: z.array(z.string()).optional(),
  obrigatorio: z.boolean().optional(),
  ajuda: z
    .object({ pt: z.string().optional(), es: z.string().optional(), en: z.string().optional() })
    .optional(),
});
const secaoSchemaZ = z.object({
  id: z.string().min(1).max(64),
  titulo: z.object({ pt: z.string().min(1), es: z.string().optional(), en: z.string().optional() }),
  campos: z.array(campoSchemaZ),
});
const formularioSchemaZ = z.object({ secoes: z.array(secaoSchemaZ) });

export const adminUpsertRfqTipo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        id: z.string().uuid().nullish(),
        codigo: z
          .string()
          .min(2)
          .max(64)
          .regex(/^[a-z0-9_]+$/, "Use apenas minúsculas, números e _"),
        nome_pt: z.string().min(1).max(200),
        nome_es: z.string().max(200).nullish(),
        nome_en: z.string().max(200).nullish(),
        familia: z.string().max(64).nullish(),
        descricao: z.string().max(1000).nullish(),
        ativo: z.boolean().default(true),
        campos_schema: formularioSchemaZ,
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    if (!(await hasAny(sb, context.userId, ["admin"]))) {
      throw new Error("Acesso restrito.");
    }
    const payload = {
      codigo: data.codigo,
      nome_pt: data.nome_pt,
      nome_es: data.nome_es ?? null,
      nome_en: data.nome_en ?? null,
      familia: data.familia ?? null,
      descricao: data.descricao ?? null,
      ativo: data.ativo,
      campos_schema: data.campos_schema,
      updated_at: new Date().toISOString(),
    };
    if (data.id) {
      const { error } = await sb
        .from("rfq_formulario_tipo")
        .update(payload)
        .eq("id", data.id);
      if (error) throw new Error(error.message);
      return { ok: true as const, id: data.id };
    }
    const { data: inserted, error } = await sb
      .from("rfq_formulario_tipo")
      .insert(payload)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { ok: true as const, id: inserted.id as string };
  });

export const adminToggleRfqTipoAtivo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ id: z.string().uuid(), ativo: z.boolean() }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    if (!(await hasAny(sb, context.userId, ["admin"]))) {
      throw new Error("Acesso restrito.");
    }
    const { error } = await sb
      .from("rfq_formulario_tipo")
      .update({ ativo: data.ativo, updated_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

// ------------------------------------------------------------------
// Emitir link (sales/manager/admin)
// ------------------------------------------------------------------
export const emitirRfqLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        cliente_id: z.string().uuid(),
        tipo_id: z.string().uuid(),
        idioma: z.enum(["pt", "es", "en"]),
        titulo: z.string().max(200).nullish(),
        expira_em_dias: z.number().int().min(1).max(365).default(30),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    // RLS já garante permissão de INSERT (pode_ver_cliente).
    const expira = new Date(Date.now() + data.expira_em_dias * 86400000).toISOString();

    // Busca códigos legíveis para compor o slug (cliente + tipo).
    const [{ data: cli }, { data: tipo }] = await Promise.all([
      sb.from("clientes").select("codigo").eq("id", data.cliente_id).maybeSingle(),
      sb.from("rfq_formulario_tipo").select("codigo").eq("id", data.tipo_id).maybeSingle(),
    ]);
    const codigoCliente = (cli?.codigo as string | null) ?? null;
    const codigoTipo = (tipo?.codigo as string | null) ?? null;

    let slug = buildReadableSlug(codigoCliente, codigoTipo);
    for (let i = 0; i < 5; i++) {
      const { data: hit } = await sb
        .from("rfq_formulario_link")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();
      if (!hit) break;
      slug = buildReadableSlug(codigoCliente, codigoTipo);
    }

    const { data: inserted, error } = await sb
      .from("rfq_formulario_link")
      .insert({
        cliente_id: data.cliente_id,
        tipo_id: data.tipo_id,
        sales_id: context.userId,
        idioma: data.idioma,
        slug,
        titulo: data.titulo ?? null,
        expira_em: expira,
      })
      .select("id, slug")
      .single();
    if (error) throw new Error(error.message);
    return inserted as { id: string; slug: string };
  });

// ------------------------------------------------------------------
// Listar links do cliente
// ------------------------------------------------------------------
export const listRfqLinksCliente = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ cliente_id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const { data: rows, error } = await sb
      .from("rfq_formulario_link")
      .select(
        "id, slug, idioma, status, titulo, criado_em, expira_em, preenchido_em, submissao_id, tipo_id, sales_id, rfq_formulario_tipo:tipo_id(nome_pt, codigo)",
      )
      .eq("cliente_id", data.cliente_id)
      .order("criado_em", { ascending: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

// Arquivar link
export const arquivarRfqLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ link_id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const { error } = await sb
      .from("rfq_formulario_link")
      .update({ status: "arquivado" })
      .eq("id", data.link_id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

// ------------------------------------------------------------------
// Inbox de submissões (manager)
// ------------------------------------------------------------------
export const listRfqSubmissoes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        cliente_id: z.string().uuid().optional(),
        apenas_nao_lidas: z.boolean().optional().default(false),
        limit: z.number().int().min(1).max(500).default(100),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    let q = sb
      .from("rfq_submissao")
      .select(
        "id, link_id, cliente_id, tipo_id, idioma, preenchido_por_nome, preenchido_por_email, criado_em, lida_em, oportunidade_id, clientes:cliente_id(codigo, razao_social), rfq_formulario_tipo:tipo_id(nome_pt, codigo)",
      )
      .order("criado_em", { ascending: false })
      .limit(data.limit);
    if (data.cliente_id) q = q.eq("cliente_id", data.cliente_id);
    if (data.apenas_nao_lidas) q = q.is("lida_em", null);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

// Detalhe da submissão (respostas + schema)
export const getRfqSubmissao = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const { data: sub, error } = await sb
      .from("rfq_submissao")
      .select(
        "id, link_id, cliente_id, tipo_id, idioma, respostas, preenchido_por_nome, preenchido_por_email, preenchido_por_telefone, criado_em, lida_em, oportunidade_id, observacoes_internas, clientes:cliente_id(codigo, razao_social), rfq_formulario_tipo:tipo_id(nome_pt, nome_es, nome_en, codigo, campos_schema)",
      )
      .eq("id", data.id)
      .single();
    if (error) throw new Error(error.message);
    const { data: anexos } = await sb
      .from("rfq_submissao_anexo")
      .select("id, campo_id, nome, mime, drive_view_url, criado_em")
      .eq("submissao_id", data.id)
      .order("criado_em", { ascending: true });
    // marca como lida
    if (!sub.lida_em) {
      await sb
        .from("rfq_submissao")
        .update({ lida_em: new Date().toISOString(), lida_por: context.userId })
        .eq("id", data.id);
    }
    return { submissao: sub, anexos: anexos ?? [] };
  });

// ------------------------------------------------------------------
// Liberação cliente → sales (manager/admin)
// ------------------------------------------------------------------
export const listSalesUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as any;
    if (!(await hasAny(sb, context.userId, ["admin", "manager"]))) {
      throw new Error("Acesso restrito.");
    }
    const { getCriticalClient } = await import("@/lib/supabase-client.server");
    const supabaseAdmin = await getCriticalClient();
    const { data: roles, error: e1 } = await supabaseAdmin
      .from("user_roles")
      .select("user_id")
      .eq("role", "sales");
    if (e1) throw new Error(e1.message);
    const ids = Array.from(new Set((roles ?? []).map((r: any) => r.user_id as string)));
    if (ids.length === 0) return [];
    const { data: profs, error: e2 } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, email")
      .in("id", ids);
    if (e2) throw new Error(e2.message);
    return (profs ?? []).map((p: any) => ({
      id: p.id as string,
      nome: (p.full_name || p.email || "—") as string,
      email: (p.email || "") as string,
    }));
  });

export const listClienteLiberacoes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ cliente_id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const { data: rows, error } = await sb
      .from("cliente_sales_liberacao")
      .select("id, sales_id, liberado_por, liberado_em, revogado_em, revogado_por, observacoes")
      .eq("cliente_id", data.cliente_id)
      .order("liberado_em", { ascending: false });
    if (error) throw new Error(error.message);
    if ((rows ?? []).length === 0) return [];
    const { getCriticalClient } = await import("@/lib/supabase-client.server");
    const supabaseAdmin = await getCriticalClient();
    const ids = Array.from(new Set((rows ?? []).map((r: any) => r.sales_id as string))) as string[];
    const { data: profs } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, email")
      .in("id", ids);
    const byId = new Map((profs ?? []).map((p: any) => [p.id, p]));
    return (rows ?? []).map((r: any) => ({
      ...r,
      sales_nome: byId.get(r.sales_id)?.full_name || byId.get(r.sales_id)?.email || "—",
      sales_email: byId.get(r.sales_id)?.email || "",
    }));
  });

export const liberarClienteParaSales = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        cliente_id: z.string().uuid(),
        sales_id: z.string().uuid(),
        observacoes: z.string().max(500).nullish(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    if (!(await hasAny(sb, context.userId, ["admin", "manager"]))) {
      throw new Error("Acesso restrito.");
    }
    // reativa se já existir
    const { data: existente } = await sb
      .from("cliente_sales_liberacao")
      .select("id")
      .eq("cliente_id", data.cliente_id)
      .eq("sales_id", data.sales_id)
      .maybeSingle();
    if (existente) {
      const { error } = await sb
        .from("cliente_sales_liberacao")
        .update({
          revogado_em: null,
          revogado_por: null,
          liberado_por: context.userId,
          liberado_em: new Date().toISOString(),
          observacoes: data.observacoes ?? null,
        })
        .eq("id", existente.id);
      if (error) throw new Error(error.message);
      return { ok: true as const, id: existente.id };
    }
    const { data: inserted, error } = await sb
      .from("cliente_sales_liberacao")
      .insert({
        cliente_id: data.cliente_id,
        sales_id: data.sales_id,
        liberado_por: context.userId,
        observacoes: data.observacoes ?? null,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { ok: true as const, id: inserted.id };
  });

export const revogarLiberacaoSales = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    if (!(await hasAny(sb, context.userId, ["admin", "manager"]))) {
      throw new Error("Acesso restrito.");
    }
    const { error } = await sb
      .from("cliente_sales_liberacao")
      .update({ revogado_em: new Date().toISOString(), revogado_por: context.userId })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

// ------------------------------------------------------------------
// Público: buscar link + schema pelo slug
// ------------------------------------------------------------------
// Este endpoint é chamado do lado do servidor via server route público — abaixo
// exposto também como server function para conveniência do renderer autenticado.
export const getRfqPublicoPorSlug = createServerFn({ method: "GET" })
  .inputValidator((i: unknown) => z.object({ slug: z.string().min(3).max(64) }).parse(i))
  .handler(async ({ data }) => {
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(
      getSupabasePublicConfig().url,
      getSupabasePublicConfig().publishableKey,
      { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
    );
    const { data: link, error } = await (supabase as any)
      .from("rfq_formulario_link")
      .select(
        "id, cliente_id, tipo_id, idioma, slug, status, titulo, expira_em, rfq_formulario_tipo:tipo_id(nome_pt, nome_es, nome_en, campos_schema)",
      )
      .eq("slug", data.slug)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!link) return { ok: false as const, motivo: "nao_encontrado" as const };
    if (link.status !== "aberto") return { ok: false as const, motivo: "fechado" as const };
    if (link.expira_em && new Date(link.expira_em).getTime() < Date.now()) {
      return { ok: false as const, motivo: "expirado" as const };
    }
    return {
      ok: true as const,
      link: {
        id: link.id as string,
        cliente_id: link.cliente_id as string,
        tipo_id: link.tipo_id as string,
        idioma: link.idioma as Idioma,
        slug: link.slug as string,
        titulo: (link.titulo || null) as string | null,
        expira_em: (link.expira_em || null) as string | null,
      },
      tipo: {
        nome_pt: link.rfq_formulario_tipo?.nome_pt as string,
        nome_es: (link.rfq_formulario_tipo?.nome_es || null) as string | null,
        nome_en: (link.rfq_formulario_tipo?.nome_en || null) as string | null,
        campos_schema: link.rfq_formulario_tipo?.campos_schema as FormularioSchema,
      },
    };
  });

// ------------------------------------------------------------------
// 3.2 — Vínculo submissão↔oportunidade e sugestão de template por máquina.
// ------------------------------------------------------------------

/**
 * Sugere o template de projeto padrão para uma oportunidade, com base em:
 * 1) rfq_submissao_id vinculada explicitamente à oportunidade; senão
 * 2) submissão RFQ mais recente do mesmo cliente.
 * Retorna null se não houver submissão ou template configurado.
 */
export const sugerirTemplateParaOportunidade = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ oportunidade_id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const { data: opp } = await sb
      .from("oportunidades")
      .select("id, cliente_id, rfq_submissao_id")
      .eq("id", data.oportunidade_id)
      .maybeSingle();
    if (!opp) return null;

    let submissao: any = null;
    if (opp.rfq_submissao_id) {
      const { data: s } = await sb
        .from("rfq_submissao")
        .select("id, tipo_id, criado_em, rfq_formulario_tipo(nome_pt)")
        .eq("id", opp.rfq_submissao_id)
        .maybeSingle();
      submissao = s;
    }
    if (!submissao && opp.cliente_id) {
      const { data: s } = await sb
        .from("rfq_submissao")
        .select("id, tipo_id, criado_em, rfq_formulario_tipo(nome_pt)")
        .eq("cliente_id", opp.cliente_id)
        .order("criado_em", { ascending: false })
        .limit(1)
        .maybeSingle();
      submissao = s;
    }
    if (!submissao) return null;

    const { data: tpl } = await sb
      .from("processo_templates")
      .select("id, nome, tipo, rfq_tipo_id")
      .eq("rfq_tipo_id", submissao.tipo_id)
      .eq("tipo", "projeto")
      .eq("ativo", true)
      .is("deleted_at", null)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    return {
      submissao_id: submissao.id as string,
      submissao_em: submissao.criado_em as string,
      rfq_tipo_id: submissao.tipo_id as string,
      rfq_tipo_nome: (submissao.rfq_formulario_tipo?.nome_pt ?? null) as string | null,
      template_id: (tpl?.id ?? null) as string | null,
      template_nome: (tpl?.nome ?? null) as string | null,
    };
  });

/**
 * Vincula uma submissão RFQ a uma oportunidade (idempotente).
 */
export const vincularSubmissaoOportunidade = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        oportunidade_id: z.string().uuid(),
        submissao_id: z.string().uuid().nullable(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const { error } = await sb
      .from("oportunidades")
      .update({
        rfq_submissao_id: data.submissao_id,
        updated_at: new Date().toISOString(),
        updated_by: context.userId,
      })
      .eq("id", data.oportunidade_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/**
 * Lista oportunidades ativas do cliente para uso em selects.
 */
export const listOportunidadesDoCliente = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ cliente_id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const { data: rows, error } = await sb
      .from("oportunidades")
      .select("id, codigo, titulo, pipeline_stage, rfq_submissao_id, created_at")
      .eq("cliente_id", data.cliente_id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return (rows ?? []) as Array<{
      id: string;
      codigo: string | null;
      titulo: string;
      pipeline_stage: string;
      rfq_submissao_id: string | null;
      created_at: string;
    }>;
  });
