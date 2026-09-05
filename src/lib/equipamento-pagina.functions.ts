/* eslint-disable @typescript-eslint/no-explicit-any */
import { createServerFn } from "@tanstack/react-start";
import { friendlyDbError } from "@/lib/db-errors";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getSupabasePublicConfig } from "@/integrations/supabase/config";
import {
  defaultBlocoConteudo,
  type BlocoTipo,
  type EquipamentoBloco,
  type EquipamentoPagina,
} from "@/lib/equipamento-pagina.shared";

async function ensureAdmin(sb: any, uid: string) {
  const { data } = await sb.rpc("has_role", { _user_id: uid, _role: "admin" });
  if (data !== true) throw new Error("Acesso restrito.");
}

// ==================== PÚBLICO ====================
export const listPaginasPublicadas = createServerFn({ method: "GET" }).handler(async () => {
  const cfg = getSupabasePublicConfig();
  const sb = createClient(cfg.url, cfg.publishableKey, {
    auth: { storage: undefined as any, persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await sb
    .from("equipamento_pagina")
    .select("id, tipo_id, slug, seo_title_pt, seo_description_pt, og_image_url, publicado, rfq_formulario_tipo!inner(nome_pt, familia)")
    .eq("publicado", true)
    .order("slug", { ascending: true });
  if (error) throw friendlyDbError(error);
  return (data ?? []).map((r: any) => ({
    id: r.id as string,
    slug: r.slug as string,
    nome_pt: r.rfq_formulario_tipo?.nome_pt as string,
    familia: r.rfq_formulario_tipo?.familia as string | null,
    seo_title_pt: r.seo_title_pt as string | null,
    seo_description_pt: r.seo_description_pt as string | null,
    og_image_url: r.og_image_url as string | null,
  }));
});

export const getPaginaPorSlug = createServerFn({ method: "GET" })
  .inputValidator((i: unknown) => z.object({ slug: z.string() }).parse(i))
  .handler(async ({ data }) => {
    const cfg = getSupabasePublicConfig();
    const sb = createClient(cfg.url, cfg.publishableKey, {
      auth: { storage: undefined as any, persistSession: false, autoRefreshToken: false },
    });
    const { data: pagina, error } = await sb
      .from("equipamento_pagina")
      .select("*, rfq_formulario_tipo!inner(id, codigo, nome_pt, familia)")
      .eq("slug", data.slug)
      .eq("publicado", true)
      .maybeSingle();
    if (error) throw friendlyDbError(error);
    if (!pagina) return null;
    const { data: blocos, error: err2 } = await sb
      .from("equipamento_pagina_bloco")
      .select("*")
      .eq("pagina_id", pagina.id)
      .eq("visivel", true)
      .order("ordem", { ascending: true });
    if (err2) throw friendlyDbError(err2);
    return {
      pagina: {
        id: pagina.id,
        tipo_id: pagina.tipo_id,
        slug: pagina.slug,
        seo_title_pt: pagina.seo_title_pt,
        seo_title_es: pagina.seo_title_es,
        seo_title_en: pagina.seo_title_en,
        seo_description_pt: pagina.seo_description_pt,
        seo_description_es: pagina.seo_description_es,
        seo_description_en: pagina.seo_description_en,
        og_image_url: pagina.og_image_url,
        publicado: pagina.publicado,
        nome_pt: (pagina as any).rfq_formulario_tipo?.nome_pt as string,
        codigo: (pagina as any).rfq_formulario_tipo?.codigo as string,
      } as EquipamentoPagina & { nome_pt: string; codigo: string },
      blocos: (blocos ?? []) as EquipamentoBloco[],
    };
  });

// ==================== ADMIN ====================
export const adminListPaginas = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as any;
    await ensureAdmin(sb, context.userId);
    const { data, error } = await sb
      .from("equipamento_pagina")
      .select("id, tipo_id, slug, publicado, seo_title_pt, og_image_url, rfq_formulario_tipo!inner(nome_pt, familia, codigo)")
      .order("slug", { ascending: true });
    if (error) throw friendlyDbError(error);
    return (data ?? []).map((r: any) => ({
      id: r.id as string,
      tipo_id: r.tipo_id as string,
      slug: r.slug as string,
      publicado: r.publicado as boolean,
      seo_title_pt: r.seo_title_pt as string | null,
      og_image_url: r.og_image_url as string | null,
      nome_pt: r.rfq_formulario_tipo?.nome_pt as string,
      familia: r.rfq_formulario_tipo?.familia as string | null,
      codigo: r.rfq_formulario_tipo?.codigo as string,
    }));
  });

export const adminGetPagina = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ pagina_id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    await ensureAdmin(sb, context.userId);
    const { data: pagina, error } = await sb
      .from("equipamento_pagina")
      .select("*, rfq_formulario_tipo!inner(nome_pt, codigo, familia)")
      .eq("id", data.pagina_id)
      .maybeSingle();
    if (error) throw friendlyDbError(error);
    if (!pagina) throw new Error("Página não encontrada.");
    const { data: blocos, error: e2 } = await sb
      .from("equipamento_pagina_bloco")
      .select("*")
      .eq("pagina_id", data.pagina_id)
      .order("ordem", { ascending: true });
    if (e2) throw friendlyDbError(e2);
    return {
      pagina: {
        ...pagina,
        nome_pt: (pagina as any).rfq_formulario_tipo?.nome_pt,
        codigo: (pagina as any).rfq_formulario_tipo?.codigo,
      },
      blocos: (blocos ?? []) as EquipamentoBloco[],
    };
  });

export const adminUpdatePagina = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        pagina_id: z.string().uuid(),
        slug: z.string().min(2).regex(/^[a-z0-9-]+$/).optional(),
        seo_title_pt: z.string().nullable().optional(),
        seo_title_es: z.string().nullable().optional(),
        seo_title_en: z.string().nullable().optional(),
        seo_description_pt: z.string().nullable().optional(),
        seo_description_es: z.string().nullable().optional(),
        seo_description_en: z.string().nullable().optional(),
        og_image_url: z.string().nullable().optional(),
        publicado: z.boolean().optional(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    await ensureAdmin(sb, context.userId);
    const { pagina_id, ...patch } = data;
    const clean: Record<string, unknown> = { atualizado_em: new Date().toISOString() };
    for (const [k, v] of Object.entries(patch)) if (v !== undefined) clean[k] = v;
    const { error } = await sb.from("equipamento_pagina").update(clean).eq("id", pagina_id);
    if (error) throw friendlyDbError(error);
    return { ok: true };
  });

export const adminAddBloco = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        pagina_id: z.string().uuid(),
        tipo_bloco: z.enum([
          "hero",
          "descricao",
          "especificacoes",
          "beneficios",
          "casos_uso",
          "galeria",
          "faq",
          "video",
          "cta_orcamento",
        ]),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    await ensureAdmin(sb, context.userId);
    // pega nome_pt do tipo pra alimentar defaults
    const { data: p } = await sb
      .from("equipamento_pagina")
      .select("rfq_formulario_tipo!inner(nome_pt)")
      .eq("id", data.pagina_id)
      .maybeSingle();
    const nome = (p as any)?.rfq_formulario_tipo?.nome_pt || "Equipamento";
    const { data: last } = await sb
      .from("equipamento_pagina_bloco")
      .select("ordem")
      .eq("pagina_id", data.pagina_id)
      .order("ordem", { ascending: false })
      .limit(1)
      .maybeSingle();
    const ordem = ((last?.ordem as number) ?? 0) + 10;
    const conteudo = defaultBlocoConteudo(data.tipo_bloco as BlocoTipo, nome);
    const { data: novo, error } = await sb
      .from("equipamento_pagina_bloco")
      .insert({ pagina_id: data.pagina_id, tipo_bloco: data.tipo_bloco, ordem, conteudo_json: conteudo })
      .select("*")
      .single();
    if (error) throw friendlyDbError(error);
    return novo as EquipamentoBloco;
  });

export const adminUpdateBloco = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        bloco_id: z.string().uuid(),
        conteudo_json: z.record(z.string(), z.any()).optional(),
        visivel: z.boolean().optional(),
        ordem: z.number().int().optional(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    await ensureAdmin(sb, context.userId);
    const { bloco_id, ...patch } = data;
    const clean: Record<string, unknown> = { atualizado_em: new Date().toISOString() };
    for (const [k, v] of Object.entries(patch)) if (v !== undefined) clean[k] = v;
    const { error } = await sb.from("equipamento_pagina_bloco").update(clean).eq("id", bloco_id);
    if (error) throw friendlyDbError(error);
    return { ok: true };
  });

export const adminDeleteBloco = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ bloco_id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    await ensureAdmin(sb, context.userId);
    const { error } = await sb.from("equipamento_pagina_bloco").delete().eq("id", data.bloco_id);
    if (error) throw friendlyDbError(error);
    return { ok: true };
  });

export const adminReordenarBlocos = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        ordem: z.array(z.object({ bloco_id: z.string().uuid(), ordem: z.number().int() })),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    await ensureAdmin(sb, context.userId);
    for (const { bloco_id, ordem } of data.ordem) {
      const { error } = await sb.from("equipamento_pagina_bloco").update({ ordem }).eq("id", bloco_id);
      if (error) throw friendlyDbError(error);
    }
    return { ok: true };
  });
