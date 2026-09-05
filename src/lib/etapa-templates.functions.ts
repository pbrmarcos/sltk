/* eslint-disable @typescript-eslint/no-explicit-any */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertEngineerOrHigher } from "@/lib/admin-guard";
import { logAuditServer } from "@/lib/audit.server";

type AnySb = any;

export const DISCIPLINAS = ["planejamento", "engenharia", "producao", "qualidade", "pos_venda"] as const;
export type Disciplina = (typeof DISCIPLINAS)[number];
export const PRIORIDADES = ["baixa", "media", "alta", "urgente"] as const;
export type Prioridade = (typeof PRIORIDADES)[number];
export const DISCIPLINAS_PROJETO = ["mecanico", "eletrico", "automacao", "montagem", "outro"] as const;
export type DisciplinaProjeto = (typeof DISCIPLINAS_PROJETO)[number];

async function requireManagerRole(sb: AnySb, uid: string) {
  await assertEngineerOrHigher(sb, uid).catch(() => {
    throw new Error("Permissão negada (requer admin, manager ou engineer).");
  });
}

async function actorInfo(sb: AnySb, uid: string) {
  const { data } = await sb.from("profiles").select("full_name, email").eq("id", uid).maybeSingle();
  return { actor_user_id: uid, actor_nome: data?.full_name ?? data?.email ?? "Usuário" };
}

/**
 * Antes gravava em colunas (actor_user_id/record_type/before_data/after_data)
 * que não existem no schema real de audit_log — toda chamada falhava e era
 * engolida pelo catch vazio, então nenhuma auditoria de templates jamais foi
 * persistida. Corrigido para o formato real via logAuditServer.
 */
async function writeAudit(sb: AnySb, uid: string, action: string, recordType: string, recordId: string, before: any, after: any) {
  await logAuditServer(sb, uid, {
    table_name: recordType,
    record_id: recordId,
    action: action === "delete" ? "DELETE" : action === "create" ? "INSERT" : "UPDATE",
    field_changed: action,
    old_value: before ?? null,
    new_value: after ?? null,
  });
}

async function snapshotTemplate(sb: AnySb, templateId: string) {
  const [{ data: itens }, { data: bom }] = await Promise.all([
    sb.from("etapa_template_item").select("*").eq("template_id", templateId).is("deleted_at", null),
    sb.from("etapa_template_bom_item").select("*").eq("template_id", templateId).is("deleted_at", null),
  ]);
  return { itens: itens ?? [], bom: bom ?? [] };
}

// ============ LIST ============
export const listEtapaTemplates = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ q: z.string().optional(), publicado: z.enum(["todos", "sim", "nao"]).optional() }).parse(i ?? {}))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as AnySb;
    let q = sb
      .from("etapa_template")
      .select("id, tipo_id, slug, nome, familia, descricao, publicado, versao_atual, updated_at")
      .is("deleted_at", null)
      .order("nome", { ascending: true });
    if (data.q) q = q.or(`nome.ilike.%${data.q}%,slug.ilike.%${data.q}%,familia.ilike.%${data.q}%`);
    if (data.publicado === "sim") q = q.eq("publicado", true);
    if (data.publicado === "nao") q = q.eq("publicado", false);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);

    const ids = (rows ?? []).map((r: any) => r.id);
    let counts: Record<string, number> = {};
    if (ids.length) {
      const { data: cs } = await sb.from("etapa_template_item").select("template_id").in("template_id", ids).is("deleted_at", null);
      for (const c of cs ?? []) counts[c.template_id] = (counts[c.template_id] ?? 0) + 1;
    }
    return (rows ?? []).map((r: any) => ({ ...r, total_etapas: counts[r.id] ?? 0 }));
  });

// ============ GET ============
export const getEtapaTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as AnySb;
    const { data: tpl, error } = await sb.from("etapa_template").select("*").eq("id", data.id).is("deleted_at", null).maybeSingle();
    if (error) throw new Error(error.message);
    if (!tpl) throw new Error("Template não encontrado.");

    const [{ data: itens }, { data: bom }, { data: versoes }] = await Promise.all([
      sb.from("etapa_template_item").select("*").eq("template_id", data.id).is("deleted_at", null).order("disciplina").order("ordem"),
      sb.from("etapa_template_bom_item").select("*").eq("template_id", data.id).is("deleted_at", null).order("ordem"),
      sb.from("etapa_template_versao").select("id, versao, comentario, actor_nome, created_at").eq("template_id", data.id).order("versao", { ascending: false }),
    ]);
    return { template: tpl, itens: itens ?? [], bom: bom ?? [], versoes: versoes ?? [] };
  });

// ============ CRIAR ============
export const createEtapaTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({
      slug: z.string().min(2),
      nome: z.string().min(2),
      familia: z.string().optional(),
      descricao: z.string().optional(),
      tipoId: z.string().uuid().optional(),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase as AnySb;
    await requireManagerRole(sb, context.userId!);
    const { data: row, error } = await sb
      .from("etapa_template")
      .insert({
        slug: data.slug,
        nome: data.nome,
        familia: data.familia ?? null,
        descricao: data.descricao ?? null,
        tipo_id: data.tipoId ?? null,
        publicado: false,
        created_by: context.userId,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    await writeAudit(sb, context.userId!, "create", "etapa_template", row.id, null, data);
    return { id: row.id };
  });

// ============ DUPLICAR ============
export const duplicateEtapaTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid(), novoNome: z.string().min(2), novoSlug: z.string().min(2) }).parse(i))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as AnySb;
    await requireManagerRole(sb, context.userId!);
    const { data: orig } = await sb.from("etapa_template").select("*").eq("id", data.id).maybeSingle();
    if (!orig) throw new Error("Template origem não encontrado.");
    const { data: novo, error } = await sb
      .from("etapa_template")
      .insert({
        slug: data.novoSlug,
        nome: data.novoNome,
        familia: orig.familia,
        descricao: orig.descricao ? `${orig.descricao} (cópia)` : "Cópia",
        tipo_id: null,
        publicado: false,
        created_by: context.userId,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    const { data: itens } = await sb.from("etapa_template_item").select("*").eq("template_id", data.id).is("deleted_at", null);
    if (itens?.length) {
      await sb.from("etapa_template_item").insert(
        itens.map((it: any) => ({
          template_id: novo.id,
          disciplina: it.disciplina,
          ordem: it.ordem,
          titulo: it.titulo,
          descricao: it.descricao,
          prioridade: it.prioridade,
        })),
      );
    }
    const { data: bom } = await sb.from("etapa_template_bom_item").select("*").eq("template_id", data.id).is("deleted_at", null);
    if (bom?.length) {
      await sb.from("etapa_template_bom_item").insert(
        bom.map((b: any) => ({
          template_id: novo.id,
          equipamento_disciplina: b.equipamento_disciplina,
          disciplina_projeto: b.disciplina_projeto,
          descricao: b.descricao,
          quantidade: b.quantidade,
          unidade: b.unidade,
          criticidade: b.criticidade,
          ordem: b.ordem,
        })),
      );
    }
    await writeAudit(sb, context.userId!, "duplicate", "etapa_template", novo.id, { origem: data.id }, { slug: data.novoSlug });
    return { id: novo.id };
  });

// ============ UPDATE metadados ============
export const updateEtapaTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({
      id: z.string().uuid(),
      nome: z.string().min(2).optional(),
      slug: z.string().min(2).optional(),
      familia: z.string().nullable().optional(),
      descricao: z.string().nullable().optional(),
      tipoId: z.string().uuid().nullable().optional(),
      publicado: z.boolean().optional(),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase as AnySb;
    await requireManagerRole(sb, context.userId!);
    const { id, tipoId, ...patch } = data;
    const upd: any = { ...patch };
    if (tipoId !== undefined) upd.tipo_id = tipoId;
    const { data: before } = await sb.from("etapa_template").select("*").eq("id", id).maybeSingle();
    const { error } = await sb.from("etapa_template").update(upd).eq("id", id);
    if (error) throw new Error(error.message);
    await writeAudit(sb, context.userId!, "update", "etapa_template", id, before, upd);
    return { ok: true };
  });

// ============ DELETE (soft) ============
export const deleteEtapaTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as AnySb;
    await requireManagerRole(sb, context.userId!);
    const { error } = await sb.from("etapa_template").update({ deleted_at: new Date().toISOString() }).eq("id", data.id);
    if (error) throw new Error(error.message);
    await writeAudit(sb, context.userId!, "delete", "etapa_template", data.id, null, null);
    return { ok: true };
  });

// ============ ITEMS CRUD ============
export const upsertEtapaTemplateItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({
      id: z.string().uuid().optional(),
      templateId: z.string().uuid(),
      disciplina: z.enum(DISCIPLINAS),
      ordem: z.number().int().default(0),
      titulo: z.string().min(1),
      descricao: z.string().nullable().optional(),
      prioridade: z.enum(PRIORIDADES).default("media"),
      parentId: z.string().uuid().nullable().optional(),
      duracaoH: z.number().nullable().optional(),
      responsavelRole: z.string().nullable().optional(),
      dependeDe: z.string().uuid().nullable().optional(),
      entregavel: z.string().nullable().optional(),
      requerAnexo: z.boolean().optional(),
      checklist: z.array(z.object({ texto: z.string() })).optional(),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase as AnySb;
    await requireManagerRole(sb, context.userId!);
    const row: any = {
      template_id: data.templateId,
      disciplina: data.disciplina,
      ordem: data.ordem,
      titulo: data.titulo,
      descricao: data.descricao ?? null,
      prioridade: data.prioridade,
      parent_id: data.parentId ?? null,
      duracao_h: data.duracaoH ?? null,
      responsavel_role: data.responsavelRole ?? null,
      depende_de: data.dependeDe ?? null,
      entregavel: data.entregavel ?? null,
      requer_anexo: data.requerAnexo ?? false,
      checklist: data.checklist ?? [],
    };
    if (data.id) {
      const { error } = await sb.from("etapa_template_item").update(row).eq("id", data.id);
      if (error) throw new Error(error.message);
      await writeAudit(sb, context.userId!, "update", "etapa_template_item", data.id, null, row);
      return { id: data.id };
    }
    const { data: ins, error } = await sb.from("etapa_template_item").insert(row).select("id").single();
    if (error) throw new Error(error.message);
    await writeAudit(sb, context.userId!, "create", "etapa_template_item", ins.id, null, row);
    return { id: ins.id };
  });

export const deleteEtapaTemplateItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as AnySb;
    await requireManagerRole(sb, context.userId!);
    const { error } = await sb.from("etapa_template_item").update({ deleted_at: new Date().toISOString() }).eq("id", data.id);
    if (error) throw new Error(error.message);
    await writeAudit(sb, context.userId!, "delete", "etapa_template_item", data.id, null, null);
    return { ok: true };
  });

export const reorderEtapaTemplateItens = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({
      templateId: z.string().uuid(),
      disciplina: z.enum(DISCIPLINAS),
      idsInOrder: z.array(z.string().uuid()),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase as AnySb;
    await requireManagerRole(sb, context.userId!);
    for (let i = 0; i < data.idsInOrder.length; i++) {
      await sb.from("etapa_template_item").update({ ordem: i + 1 }).eq("id", data.idsInOrder[i]);
    }
    return { ok: true };
  });

// ============ BOM CRUD ============
export const upsertEtapaTemplateBomItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({
      id: z.string().uuid().optional(),
      templateId: z.string().uuid(),
      equipamentoDisciplina: z.string().default("engenharia"),
      disciplinaProjeto: z.enum(DISCIPLINAS_PROJETO).default("mecanico"),
      descricao: z.string().min(1),
      quantidade: z.number().default(1),
      unidade: z.string().default("un"),
      criticidade: z.enum(PRIORIDADES).default("media"),
      ordem: z.number().int().default(0),
      partNumber: z.string().nullable().optional(),
      fabricante: z.string().nullable().optional(),
      link: z.string().nullable().optional(),
      observacoes: z.string().nullable().optional(),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase as AnySb;
    await requireManagerRole(sb, context.userId!);
    const row: any = {
      template_id: data.templateId,
      equipamento_disciplina: data.equipamentoDisciplina,
      disciplina_projeto: data.disciplinaProjeto,
      descricao: data.descricao,
      quantidade: data.quantidade,
      unidade: data.unidade,
      criticidade: data.criticidade,
      ordem: data.ordem,
      part_number: data.partNumber ?? null,
      fabricante: data.fabricante ?? null,
      link: data.link ?? null,
      observacoes: data.observacoes ?? null,
    };
    if (data.id) {
      const { error } = await sb.from("etapa_template_bom_item").update(row).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const { data: ins, error } = await sb.from("etapa_template_bom_item").insert(row).select("id").single();
    if (error) throw new Error(error.message);
    return { id: ins.id };
  });

// ============ BULK APPLY (Excel round-trip) ============
export const applyEtapaTemplateBulk = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({
      templateId: z.string().uuid(),
      itens: z.array(
        z.object({
          id: z.string().uuid().optional(),
          disciplina: z.enum(DISCIPLINAS),
          ordem: z.number().int().default(999),
          titulo: z.string().min(1),
          descricao: z.string().nullable().optional(),
          prioridade: z.enum(PRIORIDADES).default("media"),
          duracaoH: z.number().nullable().optional(),
          responsavelRole: z.string().nullable().optional(),
          entregavel: z.string().nullable().optional(),
          requerAnexo: z.boolean().optional(),
          checklist: z.array(z.object({ texto: z.string() })).optional(),
        }),
      ),
      bom: z.array(
        z.object({
          id: z.string().uuid().optional(),
          equipamentoDisciplina: z.string().default("engenharia"),
          disciplinaProjeto: z.enum(DISCIPLINAS_PROJETO).default("mecanico"),
          descricao: z.string().min(1),
          quantidade: z.number().default(1),
          unidade: z.string().default("un"),
          criticidade: z.enum(PRIORIDADES).default("media"),
          ordem: z.number().int().default(999),
          partNumber: z.string().nullable().optional(),
          fabricante: z.string().nullable().optional(),
          link: z.string().nullable().optional(),
          observacoes: z.string().nullable().optional(),
        }),
      ),
      removeItemIds: z.array(z.string().uuid()).optional(),
      removeBomIds: z.array(z.string().uuid()).optional(),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase as AnySb;
    await requireManagerRole(sb, context.userId!);
    const now = new Date().toISOString();
    const summary = { itensInseridos: 0, itensAtualizados: 0, bomInseridos: 0, bomAtualizados: 0, removidos: 0 };

    for (const r of data.removeItemIds ?? []) {
      await sb.from("etapa_template_item").update({ deleted_at: now }).eq("id", r).eq("template_id", data.templateId);
      summary.removidos++;
    }
    for (const r of data.removeBomIds ?? []) {
      await sb.from("etapa_template_bom_item").update({ deleted_at: now }).eq("id", r).eq("template_id", data.templateId);
      summary.removidos++;
    }

    for (const it of data.itens) {
      const row: any = {
        template_id: data.templateId,
        disciplina: it.disciplina,
        ordem: it.ordem,
        titulo: it.titulo,
        descricao: it.descricao ?? null,
        prioridade: it.prioridade,
        duracao_h: it.duracaoH ?? null,
        responsavel_role: it.responsavelRole ?? null,
        entregavel: it.entregavel ?? null,
        requer_anexo: it.requerAnexo ?? false,
        checklist: it.checklist ?? [],
      };
      if (it.id) {
        await sb.from("etapa_template_item").update(row).eq("id", it.id);
        summary.itensAtualizados++;
      } else {
        await sb.from("etapa_template_item").insert(row);
        summary.itensInseridos++;
      }
    }

    for (const b of data.bom) {
      const row: any = {
        template_id: data.templateId,
        equipamento_disciplina: b.equipamentoDisciplina,
        disciplina_projeto: b.disciplinaProjeto,
        descricao: b.descricao,
        quantidade: b.quantidade,
        unidade: b.unidade,
        criticidade: b.criticidade,
        ordem: b.ordem,
        part_number: b.partNumber ?? null,
        fabricante: b.fabricante ?? null,
        link: b.link ?? null,
        observacoes: b.observacoes ?? null,
      };
      if (b.id) {
        await sb.from("etapa_template_bom_item").update(row).eq("id", b.id);
        summary.bomAtualizados++;
      } else {
        await sb.from("etapa_template_bom_item").insert(row);
        summary.bomInseridos++;
      }
    }

    // Snapshot para histórico
    const snap = await snapshotTemplate(sb, data.templateId);
    const info = await actorInfo(sb, context.userId!);
    const { data: tpl } = await sb.from("etapa_template").select("versao_atual").eq("id", data.templateId).maybeSingle();
    const proximaVersao = (tpl?.versao_atual ?? 1) + 1;
    await sb.from("etapa_template_versao").insert({
      template_id: data.templateId,
      versao: proximaVersao,
      snapshot: snap,
      comentario: `Import Excel (${summary.itensInseridos + summary.itensAtualizados} etapas, ${summary.bomInseridos + summary.bomAtualizados} BOM)`,
      ...info,
    });
    await sb.from("etapa_template").update({ versao_atual: proximaVersao }).eq("id", data.templateId);
    await writeAudit(sb, context.userId!, "bulk_import", "etapa_template", data.templateId, null, summary);
    return { ...summary, versao: proximaVersao };
  });

export const deleteEtapaTemplateBomItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as AnySb;
    await requireManagerRole(sb, context.userId!);
    const { error } = await sb.from("etapa_template_bom_item").update({ deleted_at: new Date().toISOString() }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============ VERSIONAMENTO ============
export const publishEtapaTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid(), comentario: z.string().optional() }).parse(i))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as AnySb;
    await requireManagerRole(sb, context.userId!);
    const { data: tpl } = await sb.from("etapa_template").select("versao_atual").eq("id", data.id).maybeSingle();
    if (!tpl) throw new Error("Template não encontrado.");
    const proximaVersao = (tpl.versao_atual ?? 1) + 1;
    const snap = await snapshotTemplate(sb, data.id);
    const info = await actorInfo(sb, context.userId!);
    await sb.from("etapa_template_versao").insert({
      template_id: data.id,
      versao: proximaVersao,
      snapshot: snap,
      comentario: data.comentario ?? "Publicação",
      ...info,
    });
    await sb.from("etapa_template").update({ publicado: true, versao_atual: proximaVersao }).eq("id", data.id);
    await writeAudit(sb, context.userId!, "publish", "etapa_template", data.id, null, { versao: proximaVersao });
    return { versao: proximaVersao };
  });

export const revertEtapaTemplateVersao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ templateId: z.string().uuid(), versao: z.number().int() }).parse(i))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as AnySb;
    await requireManagerRole(sb, context.userId!);
    const { data: ver } = await sb
      .from("etapa_template_versao")
      .select("snapshot")
      .eq("template_id", data.templateId)
      .eq("versao", data.versao)
      .maybeSingle();
    if (!ver) throw new Error("Versão não encontrada.");

    // Snapshot atual antes de sobrescrever (audit)
    const antes = await snapshotTemplate(sb, data.templateId);
    await writeAudit(sb, context.userId!, "revert", "etapa_template", data.templateId, antes, { revertidoPara: data.versao });

    // Soft-delete tudo, recriar do snapshot
    await sb.from("etapa_template_item").update({ deleted_at: new Date().toISOString() }).eq("template_id", data.templateId).is("deleted_at", null);
    await sb.from("etapa_template_bom_item").update({ deleted_at: new Date().toISOString() }).eq("template_id", data.templateId).is("deleted_at", null);

    const snap = ver.snapshot as { itens?: any[]; bom?: any[] };
    if (snap.itens?.length) {
      await sb.from("etapa_template_item").insert(
        snap.itens.map((it: any) => ({
          template_id: data.templateId,
          disciplina: it.disciplina,
          ordem: it.ordem,
          titulo: it.titulo,
          descricao: it.descricao,
          prioridade: it.prioridade,
          parent_id: null,
        })),
      );
    }
    if (snap.bom?.length) {
      await sb.from("etapa_template_bom_item").insert(
        snap.bom.map((b: any) => ({
          template_id: data.templateId,
          equipamento_disciplina: b.equipamento_disciplina,
          disciplina_projeto: b.disciplina_projeto,
          descricao: b.descricao,
          quantidade: b.quantidade,
          unidade: b.unidade,
          criticidade: b.criticidade,
          ordem: b.ordem,
        })),
      );
    }

    // Bumpa versão como nova (não sobrescreve)
    const { data: tpl } = await sb.from("etapa_template").select("versao_atual").eq("id", data.templateId).maybeSingle();
    const novaVersao = (tpl?.versao_atual ?? 1) + 1;
    const info = await actorInfo(sb, context.userId!);
    await sb.from("etapa_template_versao").insert({
      template_id: data.templateId,
      versao: novaVersao,
      snapshot: snap,
      comentario: `Revertido para v${data.versao}`,
      ...info,
    });
    await sb.from("etapa_template").update({ versao_atual: novaVersao }).eq("id", data.templateId);
    return { versao: novaVersao };
  });

// ============ RFQ Tipos p/ selects ============
export const listRfqTiposForTemplate = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as AnySb;
    const { data } = await sb
      .from("rfq_formulario_tipo")
      .select("id, slug, codigo, nome_pt, familia")
      .eq("ativo", true)
      .order("nome_pt");
    return data ?? [];
  });
