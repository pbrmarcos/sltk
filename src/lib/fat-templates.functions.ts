import { createServerFn } from "@tanstack/react-start";
import { assertCanAccessModule } from "@/lib/admin-guard";
import { friendlyDbError } from "@/lib/db-errors";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Templates versionados de FAT (paridade com SAT).
 * Tabelas:
 *  - fat_template (versionado, único ativo)
 *  - fat_template_secao
 *  - fat_template_item
 *
 * A tabela legada `fat_checklist_template` continua existindo para os
 * relatórios já criados; aqui tratamos apenas dos templates novos.
 */

export const FAT_ITEM_TIPOS = [
  "ok_nok_na",
  "sim_nao_comentario",
  "texto",
  "numero",
  "data",
  "checkbox_multi",
  "parametro_operacional",
  "cabecalho",
] as const;
export type FATItemTipo = (typeof FAT_ITEM_TIPOS)[number];

export type FATTemplateLite = {
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

export type FATTemplateItem = {
  id: string;
  secao_id: string;
  ordem: number;
  label: string;
  tipo: FATItemTipo;
  obrigatorio: boolean;
  permite_anexo: boolean;
  permite_comentario: boolean;
  requer_foto_nok: boolean;
  ajuda: string | null;
  opcoes: string[];
};

export type FATTemplateSecao = {
  id: string;
  template_id: string;
  ordem: number;
  titulo: string;
  descricao: string | null;
  itens: FATTemplateItem[];
};

export type FATTemplateDetalhe = {
  id: string;
  nome: string;
  versao: number;
  ativo: boolean;
  descricao: string | null;
  secoes: FATTemplateSecao[];
};

const TBL = "fat_template" as never;
const TBL_SEC = "fat_template_secao" as never;
const TBL_ITEM = "fat_template_item" as never;

/* ============ LISTAR ============ */

export const listFATTemplates = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: tpls, error } = await context.supabase
      .from(TBL)
      .select("id, nome, versao, ativo, descricao, created_at, updated_at, deleted_at")
      .order("versao", { ascending: false });
    if (error) throw friendlyDbError(error);

    const ids = ((tpls ?? []) as Array<{ id: string }>).map((t) => t.id);
    const secCounts = new Map<string, number>();
    const itemCounts = new Map<string, number>();

    if (ids.length > 0) {
      const { data: secs } = await context.supabase
        .from(TBL_SEC)
        .select("id, template_id")
        .in("template_id", ids);
      const secIdToTpl = new Map<string, string>();
      for (const s of (secs ?? []) as Array<{ id: string; template_id: string }>) {
        secIdToTpl.set(s.id, s.template_id);
        secCounts.set(s.template_id, (secCounts.get(s.template_id) ?? 0) + 1);
      }
      const secIds = Array.from(secIdToTpl.keys());
      if (secIds.length > 0) {
        const { data: items } = await context.supabase
          .from(TBL_ITEM)
          .select("secao_id")
          .in("secao_id", secIds);
        for (const it of (items ?? []) as Array<{ secao_id: string }>) {
          const tplId = secIdToTpl.get(it.secao_id);
          if (tplId) itemCounts.set(tplId, (itemCounts.get(tplId) ?? 0) + 1);
        }
      }
    }

    return ((tpls ?? []) as Array<Record<string, unknown>>).map((t) => ({
      ...(t as object),
      secoes_count: secCounts.get(t.id as string) ?? 0,
      itens_count: itemCounts.get(t.id as string) ?? 0,
    })) as unknown as FATTemplateLite[];
  });

/* ============ DETALHE ============ */

const getInput = z.object({ id: z.string().uuid().optional(), ativo: z.boolean().optional() });

export const getFATTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => getInput.parse(input))
  .handler(async ({ data, context }): Promise<FATTemplateDetalhe | null> => {
    let q = context.supabase.from(TBL).select("id, nome, versao, ativo, descricao");
    if (data.id) q = q.eq("id", data.id);
    else if (data.ativo) q = q.eq("ativo", true);
    else throw new Error("Informe id ou ativo");
    const { data: tpl, error } = await q.maybeSingle();
    if (error) throw friendlyDbError(error);
    if (!tpl) return null;

    const tplRow = tpl as unknown as {
      id: string;
      nome: string;
      versao: number;
      ativo: boolean;
      descricao: string | null;
    };

    const { data: secs, error: sErr } = await context.supabase
      .from(TBL_SEC)
      .select("id, template_id, ordem, titulo, descricao")
      .eq("template_id", tplRow.id)
      .order("ordem");
    if (sErr) throw friendlyDbError(sErr);

    const secIds = ((secs ?? []) as Array<{ id: string }>).map((s) => s.id);
    const { data: items } = secIds.length
      ? await context.supabase
          .from(TBL_ITEM)
          .select(
            "id, secao_id, ordem, label, tipo, obrigatorio, permite_anexo, permite_comentario, requer_foto_nok, ajuda, opcoes",
          )
          .in("secao_id", secIds)
          .order("ordem")
      : { data: [] as never[] };

    const itemsBySec = new Map<string, FATTemplateItem[]>();
    for (const it of (items ?? []) as Array<Record<string, unknown>>) {
      const arr = itemsBySec.get(it.secao_id as string) ?? [];
      arr.push({
        ...(it as unknown as FATTemplateItem),
        opcoes: Array.isArray(it.opcoes) ? (it.opcoes as string[]) : [],
      });
      itemsBySec.set(it.secao_id as string, arr);
    }

    return {
      ...tplRow,
      secoes: ((secs ?? []) as Array<Record<string, unknown>>).map((s) => ({
        ...(s as unknown as Omit<FATTemplateSecao, "itens">),
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

export const novaVersaoFATTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => novaVersaoInput.parse(input))
  .handler(async ({ data, context }) => {
    await assertCanAccessModule(context.supabase, context.userId, "qualidade");
    const { data: maxRow } = await context.supabase
      .from(TBL)
      .select("versao")
      .order("versao", { ascending: false })
      .limit(1)
      .maybeSingle();
    const nextV = ((maxRow as { versao?: number } | null)?.versao ?? 0) + 1;

    const { data: novo, error } = await context.supabase
      .from(TBL)
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
        .from(TBL_SEC)
        .select("id, ordem, titulo, descricao")
        .eq("template_id", data.base_id)
        .order("ordem");
      for (const s of (secs ?? []) as Array<{
        id: string;
        ordem: number;
        titulo: string;
        descricao: string | null;
      }>) {
        const { data: novaSec } = await context.supabase
          .from(TBL_SEC)
          .insert({
            template_id: novoId,
            ordem: s.ordem,
            titulo: s.titulo,
            descricao: s.descricao,
          } as never)
          .select("id")
          .single();
        const novaSecId = (novaSec as unknown as { id: string }).id;
        const { data: items } = await context.supabase
          .from(TBL_ITEM)
          .select(
            "ordem, label, tipo, obrigatorio, permite_anexo, permite_comentario, requer_foto_nok, ajuda, opcoes",
          )
          .eq("secao_id", s.id)
          .order("ordem");
        if (items && items.length > 0) {
          await context.supabase
            .from(TBL_ITEM)
            .insert(
              (items as Array<object>).map((it) => ({ ...it, secao_id: novaSecId })) as never,
            );
        }
      }
    }
    return { id: novoId };
  });

const setAtivoInput = z.object({ id: z.string().uuid() });

export const setFATTemplateAtivo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => setAtivoInput.parse(input))
  .handler(async ({ data, context }) => {
    await assertCanAccessModule(context.supabase, context.userId, "qualidade");
    const { error } = await context.supabase
      .from(TBL)
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

export const updateFATTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => updTplInput.parse(input))
  .handler(async ({ data, context }) => {
    await assertCanAccessModule(context.supabase, context.userId, "qualidade");
    const patch: Record<string, unknown> = { updated_by: context.userId };
    if (data.nome !== undefined) patch.nome = data.nome;
    if (data.descricao !== undefined) patch.descricao = data.descricao;
    const { error } = await context.supabase
      .from(TBL)
      .update(patch as never)
      .eq("id", data.id);
    if (error) throw friendlyDbError(error);
    return { ok: true };
  });

const archiveInput = z.object({ id: z.string().uuid() });

export const archiveFATTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => archiveInput.parse(input))
  .handler(async ({ data, context }) => {
    await assertCanAccessModule(context.supabase, context.userId, "qualidade");
    const { error } = await context.supabase
      .from(TBL)
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

export const upsertFATSecao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => secaoUpsert.parse(input))
  .handler(async ({ data, context }) => {
    await assertCanAccessModule(context.supabase, context.userId, "qualidade");
    if (data.id) {
      const { error } = await context.supabase
        .from(TBL_SEC)
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
      .from(TBL_SEC)
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
export const deleteFATSecao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => deleteSecaoInput.parse(input))
  .handler(async ({ data, context }) => {
    await assertCanAccessModule(context.supabase, context.userId, "qualidade");
    const { error } = await context.supabase.from(TBL_SEC).delete().eq("id", data.id);
    if (error) throw friendlyDbError(error);
    return { ok: true };
  });

const itemUpsert = z.object({
  id: z.string().uuid().optional(),
  secao_id: z.string().uuid(),
  ordem: z.number().int().min(0),
  label: z.string().min(1).max(300),
  tipo: z.enum(FAT_ITEM_TIPOS),
  obrigatorio: z.boolean().default(false),
  permite_anexo: z.boolean().default(true),
  permite_comentario: z.boolean().default(true),
  requer_foto_nok: z.boolean().default(false),
  ajuda: z.string().max(400).nullable().optional(),
  opcoes: z.array(z.string()).max(50).default([]),
});

export const upsertFATItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => itemUpsert.parse(input))
  .handler(async ({ data, context }) => {
    await assertCanAccessModule(context.supabase, context.userId, "qualidade");
    const payload = {
      secao_id: data.secao_id,
      ordem: data.ordem,
      label: data.label,
      tipo: data.tipo,
      obrigatorio: data.obrigatorio,
      permite_anexo: data.permite_anexo,
      permite_comentario: data.permite_comentario,
      requer_foto_nok: data.requer_foto_nok,
      ajuda: data.ajuda ?? null,
      opcoes: data.opcoes,
    };
    if (data.id) {
      const { error } = await context.supabase
        .from(TBL_ITEM)
        .update(payload as never)
        .eq("id", data.id);
      if (error) throw friendlyDbError(error);
      return { id: data.id };
    }
    const { data: row, error } = await context.supabase
      .from(TBL_ITEM)
      .insert(payload as never)
      .select("id")
      .single();
    if (error) throw friendlyDbError(error);
    return { id: (row as { id: string }).id };
  });

const deleteItemInput = z.object({ id: z.string().uuid() });
export const deleteFATItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => deleteItemInput.parse(input))
  .handler(async ({ data, context }) => {
    await assertCanAccessModule(context.supabase, context.userId, "qualidade");
    const { error } = await context.supabase.from(TBL_ITEM).delete().eq("id", data.id);
    if (error) throw friendlyDbError(error);
    return { ok: true };
  });
