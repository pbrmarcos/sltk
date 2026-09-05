import { createServerFn } from "@tanstack/react-start";
import { assertCanAccessModule } from "@/lib/admin-guard";
import { friendlyDbError } from "@/lib/db-errors";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Server fns para gerenciar Templates do formulário SAT.
 * - sat_template (versionado, único ativo)
 * - sat_template_secao
 * - sat_template_item
 */

export const SAT_ITEM_TIPOS = [
  "sim_nao_comentario",
  "texto",
  "numero",
  "data",
  "checkbox_multi",
  "parametro_operacional",
  "cabecalho",
] as const;
export type SATItemTipo = (typeof SAT_ITEM_TIPOS)[number];

export type SATTemplateLite = {
  id: string;
  nome: string;
  versao: number;
  ativo: boolean;
  descricao: string | null;
  secoes_count: number;
  itens_count: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type SATTemplateItem = {
  id: string;
  secao_id: string;
  ordem: number;
  label: string;
  tipo: SATItemTipo;
  obrigatorio: boolean;
  permite_anexo: boolean;
  ajuda: string | null;
  opcoes: string[];
};

export type SATTemplateSecao = {
  id: string;
  template_id: string;
  ordem: number;
  titulo: string;
  descricao: string | null;
  itens: SATTemplateItem[];
};

export type SATTemplateDetalhe = {
  id: string;
  nome: string;
  versao: number;
  ativo: boolean;
  descricao: string | null;
  secoes: SATTemplateSecao[];
};

/* ============ LISTAR ============ */

export const listSATTemplates = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: tpls, error } = await context.supabase
      .from("sat_template")
      .select("id, nome, versao, ativo, descricao, created_at, updated_at, deleted_at")
      .order("versao", { ascending: false });
    if (error) throw friendlyDbError(error);

    const ids = (tpls ?? []).map((t) => t.id);
    let secCounts = new Map<string, number>();
    let itemCounts = new Map<string, number>();

    if (ids.length > 0) {
      const { data: secs } = await context.supabase
        .from("sat_template_secao")
        .select("id, template_id")
        .in("template_id", ids);
      const secIdToTpl = new Map<string, string>();
      for (const s of secs ?? []) {
        secIdToTpl.set(s.id as string, s.template_id as string);
        secCounts.set(
          s.template_id as string,
          (secCounts.get(s.template_id as string) ?? 0) + 1,
        );
      }
      const secIds = (secs ?? []).map((s) => s.id as string);
      if (secIds.length > 0) {
        const { data: items } = await context.supabase
          .from("sat_template_item")
          .select("secao_id")
          .in("secao_id", secIds);
        for (const it of items ?? []) {
          const tplId = secIdToTpl.get(it.secao_id as string);
          if (tplId) itemCounts.set(tplId, (itemCounts.get(tplId) ?? 0) + 1);
        }
      }
    }

    return (tpls ?? []).map((t) => ({
      ...t,
      secoes_count: secCounts.get(t.id as string) ?? 0,
      itens_count: itemCounts.get(t.id as string) ?? 0,
    })) as SATTemplateLite[];
  });

/* ============ DETALHE ============ */

const getInput = z.object({ id: z.string().uuid().optional(), ativo: z.boolean().optional() });

export const getSATTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => getInput.parse(input))
  .handler(async ({ data, context }): Promise<SATTemplateDetalhe | null> => {
    let q = context.supabase
      .from("sat_template")
      .select("id, nome, versao, ativo, descricao");
    if (data.id) q = q.eq("id", data.id);
    else if (data.ativo) q = q.eq("ativo", true);
    else throw new Error("Informe id ou ativo");
    const { data: tpl, error } = await q.maybeSingle();
    if (error) throw friendlyDbError(error);
    if (!tpl) return null;

    const { data: secs, error: sErr } = await context.supabase
      .from("sat_template_secao")
      .select("id, template_id, ordem, titulo, descricao")
      .eq("template_id", tpl.id as string)
      .order("ordem");
    if (sErr) throw friendlyDbError(sErr);

    const secIds = (secs ?? []).map((s) => s.id as string);
    const { data: items } = secIds.length
      ? await context.supabase
          .from("sat_template_item")
          .select("id, secao_id, ordem, label, tipo, obrigatorio, permite_anexo, ajuda, opcoes")
          .in("secao_id", secIds)
          .order("ordem")
      : { data: [] as never[] };

    const itemsBySec = new Map<string, SATTemplateItem[]>();
    for (const it of items ?? []) {
      const arr = itemsBySec.get(it.secao_id as string) ?? [];
      arr.push({
        ...(it as unknown as SATTemplateItem),
        opcoes: Array.isArray((it as { opcoes: unknown }).opcoes)
          ? ((it as { opcoes: string[] }).opcoes)
          : [],
      });
      itemsBySec.set(it.secao_id as string, arr);
    }

    return {
      ...(tpl as unknown as Omit<SATTemplateDetalhe, "secoes">),
      secoes: (secs ?? []).map((s) => ({
        ...(s as unknown as Omit<SATTemplateSecao, "itens">),
        itens: itemsBySec.get(s.id as string) ?? [],
      })),
    };
  });

/* ============ CRIAR / DUPLICAR / ATIVAR ============ */

const novaVersaoInput = z.object({
  base_id: z.string().uuid().optional(),
  nome: z.string().min(1).max(160),
  descricao: z.string().max(400).nullable().optional(),
});

export const novaVersaoSATTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => novaVersaoInput.parse(input))
  .handler(async ({ data, context }) => {
    await assertCanAccessModule(context.supabase, context.userId, "pos_vendas");
    // próxima versão
    const { data: maxRow } = await context.supabase
      .from("sat_template")
      .select("versao")
      .order("versao", { ascending: false })
      .limit(1)
      .maybeSingle();
    const nextV = ((maxRow?.versao as number | undefined) ?? 0) + 1;

    const { data: novo, error } = await context.supabase
      .from("sat_template")
      .insert({
        nome: data.nome,
        descricao: data.descricao ?? null,
        versao: nextV,
        ativo: false,
        created_by: context.userId,
        updated_by: context.userId,
      } as never)
      .select("id")
      .single();
    if (error) throw friendlyDbError(error);
    const novoId = (novo as { id: string }).id;

    if (data.base_id) {
      const { data: secs } = await context.supabase
        .from("sat_template_secao")
        .select("id, ordem, titulo, descricao")
        .eq("template_id", data.base_id)
        .order("ordem");
      for (const s of secs ?? []) {
        const { data: novaSec } = await context.supabase
          .from("sat_template_secao")
          .insert({
            template_id: novoId,
            ordem: s.ordem,
            titulo: s.titulo,
            descricao: s.descricao,
          } as never)
          .select("id")
          .single();
        const novaSecId = (novaSec as { id: string }).id;
        const { data: items } = await context.supabase
          .from("sat_template_item")
          .select("ordem, label, tipo, obrigatorio, permite_anexo, ajuda, opcoes")
          .eq("secao_id", s.id as string)
          .order("ordem");
        if (items && items.length > 0) {
          await context.supabase.from("sat_template_item").insert(
            items.map((it) => ({ ...(it as object), secao_id: novaSecId })) as never,
          );
        }
      }
    }
    return { id: novoId };
  });

const setAtivoInput = z.object({ id: z.string().uuid() });

export const setSATTemplateAtivo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => setAtivoInput.parse(input))
  .handler(async ({ data, context }) => {
    await assertCanAccessModule(context.supabase, context.userId, "pos_vendas");
    const { error } = await context.supabase
      .from("sat_template")
      .update({ ativo: true, updated_by: context.userId } as never)
      .eq("id", data.id);
    if (error) throw friendlyDbError(error);
    return { ok: true };
  });

const updTplInput = z.object({
  id: z.string().uuid(),
  nome: z.string().min(1).max(160).optional(),
  descricao: z.string().max(400).nullable().optional(),
});

export const updateSATTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => updTplInput.parse(input))
  .handler(async ({ data, context }) => {
    await assertCanAccessModule(context.supabase, context.userId, "pos_vendas");
    const patch: Record<string, unknown> = { updated_by: context.userId };
    if (data.nome !== undefined) patch.nome = data.nome;
    if (data.descricao !== undefined) patch.descricao = data.descricao;
    const { error } = await context.supabase
      .from("sat_template")
      .update(patch as never)
      .eq("id", data.id);
    if (error) throw friendlyDbError(error);
    return { ok: true };
  });

const archiveInput = z.object({ id: z.string().uuid() });

export const archiveSATTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => archiveInput.parse(input))
  .handler(async ({ data, context }) => {
    await assertCanAccessModule(context.supabase, context.userId, "pos_vendas");
    const { error } = await context.supabase
      .from("sat_template")
      .update({
        deleted_at: new Date().toISOString(),
        deleted_by: context.userId,
        ativo: false,
      } as never)
      .eq("id", data.id);
    if (error) throw friendlyDbError(error);
    return { ok: true };
  });

/* ============ SEÇÕES / ITENS ============ */

const secaoUpsert = z.object({
  id: z.string().uuid().optional(),
  template_id: z.string().uuid(),
  ordem: z.number().int().min(0),
  titulo: z.string().min(1).max(200),
  descricao: z.string().max(400).nullable().optional(),
});

export const upsertSATSecao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => secaoUpsert.parse(input))
  .handler(async ({ data, context }) => {
    await assertCanAccessModule(context.supabase, context.userId, "pos_vendas");
    if (data.id) {
      const { error } = await context.supabase
        .from("sat_template_secao")
        .update({
          ordem: data.ordem,
          titulo: data.titulo,
          descricao: data.descricao ?? null,
        } as never)
        .eq("id", data.id);
      if (error) throw friendlyDbError(error);
      return { id: data.id };
    }
    const { data: row, error } = await context.supabase
      .from("sat_template_secao")
      .insert({
        template_id: data.template_id,
        ordem: data.ordem,
        titulo: data.titulo,
        descricao: data.descricao ?? null,
      } as never)
      .select("id")
      .single();
    if (error) throw friendlyDbError(error);
    return { id: (row as { id: string }).id };
  });

const deleteSecaoInput = z.object({ id: z.string().uuid() });
export const deleteSATSecao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => deleteSecaoInput.parse(input))
  .handler(async ({ data, context }) => {
    await assertCanAccessModule(context.supabase, context.userId, "pos_vendas");
    const { error } = await context.supabase
      .from("sat_template_secao")
      .delete()
      .eq("id", data.id);
    if (error) throw friendlyDbError(error);
    return { ok: true };
  });

const itemUpsert = z.object({
  id: z.string().uuid().optional(),
  secao_id: z.string().uuid(),
  ordem: z.number().int().min(0),
  label: z.string().min(1).max(300),
  tipo: z.enum(SAT_ITEM_TIPOS),
  obrigatorio: z.boolean().default(false),
  permite_anexo: z.boolean().default(true),
  ajuda: z.string().max(400).nullable().optional(),
  opcoes: z.array(z.string()).max(50).default([]),
});

export const upsertSATItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => itemUpsert.parse(input))
  .handler(async ({ data, context }) => {
    await assertCanAccessModule(context.supabase, context.userId, "pos_vendas");
    const payload = {
      secao_id: data.secao_id,
      ordem: data.ordem,
      label: data.label,
      tipo: data.tipo,
      obrigatorio: data.obrigatorio,
      permite_anexo: data.permite_anexo,
      ajuda: data.ajuda ?? null,
      opcoes: data.opcoes,
    };
    if (data.id) {
      const { error } = await context.supabase
        .from("sat_template_item")
        .update(payload as never)
        .eq("id", data.id);
      if (error) throw friendlyDbError(error);
      return { id: data.id };
    }
    const { data: row, error } = await context.supabase
      .from("sat_template_item")
      .insert(payload as never)
      .select("id")
      .single();
    if (error) throw friendlyDbError(error);
    return { id: (row as { id: string }).id };
  });

const deleteItemInput = z.object({ id: z.string().uuid() });
export const deleteSATItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => deleteItemInput.parse(input))
  .handler(async ({ data, context }) => {
    await assertCanAccessModule(context.supabase, context.userId, "pos_vendas");
    const { error } = await context.supabase
      .from("sat_template_item")
      .delete()
      .eq("id", data.id);
    if (error) throw friendlyDbError(error);
    return { ok: true };
  });