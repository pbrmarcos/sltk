import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Server fns para Templates de Processo (admin/manager/engineer).
 *
 * Estrutura:
 *  - processo_templates (nome, tipo, ativo)
 *  - processo_template_checklist_itens (secao, ordem, requer_arquivo, tipos)
 *  - processo_template_tarefas (ordem, titulo, dias_apos_inicio, role)
 *  - processo_template_eventos (ordem, titulo, tipo, dias_apos_inicio)
 *
 * `aplicarTemplate(processoId, templateId)` copia tarefas e eventos para o
 * processo destino. Checklist do template é informativo no editor; a
 * aplicação ao processo será evoluída quando o `processo_checklist_template`
 * suportar escopo por-processo.
 */

const tipoSchema = z.enum(["projeto", "atendimento", "instalacao"]);
const roleSchema = z.enum([
  "admin",
  "manager",
  "engineer",
  "production",
  "purchasing",
  "assembly",
  "field",
  "sales",
]);
const eventoTipoSchema = z.enum(["marco", "reuniao", "entrega", "outro"]);

export type ProcessoTipo = z.infer<typeof tipoSchema>;
export type TemplateRole = z.infer<typeof roleSchema>;

export type TemplateLite = {
  id: string;
  nome: string;
  descricao: string | null;
  tipo: ProcessoTipo;
  ativo: boolean;
  rfq_tipo_id: string | null;
  itens_count: number;
  tarefas_count: number;
  eventos_count: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_by_nome: string | null;
  updated_by_nome: string | null;
};

export type TemplateItem = {
  id: string;
  secao: string;
  ordem: number;
  titulo: string;
  descricao: string | null;
  obrigatorio: boolean;
  requer_arquivo: boolean;
  tipos_arquivo_aceitos: string[];
};
export type TemplateTarefa = {
  id: string;
  ordem: number;
  titulo: string;
  descricao: string | null;
  dias_apos_inicio: number;
  responsavel_role: TemplateRole | null;
};
export type TemplateEvento = {
  id: string;
  ordem: number;
  titulo: string;
  tipo: "marco" | "reuniao" | "entrega" | "outro";
  dias_apos_inicio: number;
};

export type TemplateDetalhe = {
  template: {
    id: string;
    nome: string;
    descricao: string | null;
    tipo: ProcessoTipo;
    ativo: boolean;
    rfq_tipo_id: string | null;
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
    created_by: string | null;
    updated_by: string | null;
    created_by_nome: string | null;
    updated_by_nome: string | null;
  };
  itens: TemplateItem[];
  tarefas: TemplateTarefa[];
  eventos: TemplateEvento[];
};

async function assertCanManage(supabase: any, userId: string) {
  const roles = await Promise.all(
    (["admin", "manager", "engineer"] as const).map(async (r) => {
      const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: r });
      return data === true;
    }),
  );
  if (!roles.some(Boolean)) {
    throw new Error("Sem permissão para gerenciar templates.");
  }
}

/** Resolve a list of user IDs -> { id: displayName } map via profiles. */
async function resolveUserNames(supabase: any, ids: (string | null | undefined)[]) {
  const unique = Array.from(new Set(ids.filter((x): x is string => !!x)));
  if (unique.length === 0) return {} as Record<string, string>;
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .in("id", unique);
  const map: Record<string, string> = {};
  for (const r of data ?? []) {
    map[r.id] = r.full_name || r.email || "—";
  }
  return map;
}

/** Capitalize first letter (preserves the rest). */
function capitalize(s: string | null | undefined): string {
  if (!s) return s ?? "";
  const t = s.trimStart();
  if (!t) return s;
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/** Snapshot full template state into processo_template_versoes. */
async function snapshotTemplate(
  supabase: any,
  templateId: string,
  userId: string,
  motivo: string | null,
) {
  const [{ data: t }, { data: itens }, { data: tarefas }, { data: eventos }] =
    await Promise.all([
      supabase.from("processo_templates").select("*").eq("id", templateId).maybeSingle(),
      supabase.from("processo_template_checklist_itens").select("*").eq("template_id", templateId),
      supabase.from("processo_template_tarefas").select("*").eq("template_id", templateId),
      supabase.from("processo_template_eventos").select("*").eq("template_id", templateId),
    ]);
  if (!t) return;
  const { data: maxRow } = await supabase
    .from("processo_template_versoes")
    .select("versao")
    .eq("template_id", templateId)
    .order("versao", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextVersao = (maxRow?.versao ?? 0) + 1;
  const { data: prof } = await supabase
    .from("profiles")
    .select("full_name,email")
    .eq("id", userId)
    .maybeSingle();
  const nome = prof?.full_name || prof?.email || "Sistema";
  await supabase.from("processo_template_versoes").insert({
    template_id: templateId,
    versao: nextVersao,
    motivo,
    snapshot: { template: t, itens: itens ?? [], tarefas: tarefas ?? [], eventos: eventos ?? [] },
    created_by: userId,
    created_by_nome: nome,
  } as never);
}

/** Bump updated_by / updated_at on the parent template. */
async function touchTemplate(supabase: any, templateId: string, userId: string) {
  await supabase
    .from("processo_templates")
    .update({ updated_by: userId, updated_at: new Date().toISOString() } as never)
    .eq("id", templateId);
}

/* ===================== list ===================== */

export const listTemplates = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        tipo: tipoSchema.optional(),
        q: z.string().optional(),
        incluir_arquivados: z.boolean().optional(),
      })
      .parse(input ?? {}),
  )
  .handler(async ({ data, context }): Promise<TemplateLite[]> => {
    let q = context.supabase
      .from("processo_templates")
      .select("*")
      .order("nome", { ascending: true });
    if (!data.incluir_arquivados) q = q.is("deleted_at", null);
    if (data.tipo) q = q.eq("tipo", data.tipo);
    if (data.q && data.q.trim()) q = q.ilike("nome", `%${data.q.trim()}%`);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);

    const ids = (rows ?? []).map((r) => r.id);
    if (ids.length === 0) return [];
    const [itens, tarefas, eventos, names] = await Promise.all([
      context.supabase
        .from("processo_template_checklist_itens")
        .select("template_id")
        .in("template_id", ids),
      context.supabase
        .from("processo_template_tarefas")
        .select("template_id")
        .in("template_id", ids),
      context.supabase
        .from("processo_template_eventos")
        .select("template_id")
        .in("template_id", ids),
      resolveUserNames(
        context.supabase,
        (rows ?? []).flatMap((r) => [r.created_by, r.updated_by]),
      ),
    ]);
    const count = (arr: { template_id: string }[] | null, id: string) =>
      (arr ?? []).filter((x) => x.template_id === id).length;
    return (rows ?? []).map((r) => ({
      id: r.id,
      nome: r.nome,
      descricao: r.descricao,
      tipo: r.tipo as ProcessoTipo,
      ativo: r.ativo,
      rfq_tipo_id: ((r as unknown as { rfq_tipo_id: string | null }).rfq_tipo_id) ?? null,
      itens_count: count(itens.data as never, r.id),
      tarefas_count: count(tarefas.data as never, r.id),
      eventos_count: count(eventos.data as never, r.id),
      created_at: r.created_at,
      updated_at: r.updated_at,
      deleted_at: r.deleted_at ?? null,
      created_by: r.created_by ?? null,
      updated_by: r.updated_by ?? null,
      created_by_nome: r.created_by ? (names as Record<string, string>)[r.created_by] ?? null : null,
      updated_by_nome: r.updated_by ? (names as Record<string, string>)[r.updated_by] ?? null : null,
    }));
  });

/* ===================== get ===================== */

export const getTemplate = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }): Promise<TemplateDetalhe> => {
    const { data: t, error } = await context.supabase
      .from("processo_templates")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!t) throw new Error("Template não encontrado.");
    const [{ data: itens }, { data: tarefas }, { data: eventos }, names] = await Promise.all([
      context.supabase
        .from("processo_template_checklist_itens")
        .select("*")
        .eq("template_id", data.id)
        .order("secao", { ascending: true })
        .order("ordem", { ascending: true }),
      context.supabase
        .from("processo_template_tarefas")
        .select("*")
        .eq("template_id", data.id)
        .order("ordem", { ascending: true }),
      context.supabase
        .from("processo_template_eventos")
        .select("*")
        .eq("template_id", data.id)
        .order("ordem", { ascending: true }),
      resolveUserNames(context.supabase, [t.created_by, t.updated_by]),
    ]);
    return {
      template: {
        id: t.id,
        nome: t.nome,
        descricao: t.descricao,
        tipo: t.tipo as ProcessoTipo,
        ativo: t.ativo,
        rfq_tipo_id: ((t as unknown as { rfq_tipo_id: string | null }).rfq_tipo_id) ?? null,
        created_at: t.created_at,
        updated_at: t.updated_at,
        deleted_at: t.deleted_at ?? null,
        created_by: t.created_by ?? null,
        updated_by: t.updated_by ?? null,
        created_by_nome: t.created_by ? (names as Record<string, string>)[t.created_by] ?? null : null,
        updated_by_nome: t.updated_by ? (names as Record<string, string>)[t.updated_by] ?? null : null,
      },
      itens: (itens ?? []).map((i) => ({
        id: i.id,
        secao: i.secao,
        ordem: i.ordem,
        titulo: i.titulo,
        descricao: i.descricao,
        obrigatorio: i.obrigatorio,
        requer_arquivo: i.requer_arquivo,
        tipos_arquivo_aceitos: i.tipos_arquivo_aceitos ?? [],
      })),
      tarefas: (tarefas ?? []).map((x) => ({
        id: x.id,
        ordem: x.ordem,
        titulo: x.titulo,
        descricao: x.descricao,
        dias_apos_inicio: x.dias_apos_inicio,
        responsavel_role: x.responsavel_role as TemplateRole | null,
      })),
      eventos: (eventos ?? []).map((e) => ({
        id: e.id,
        ordem: e.ordem,
        titulo: e.titulo,
        tipo: e.tipo as TemplateEvento["tipo"],
        dias_apos_inicio: e.dias_apos_inicio,
      })),
    };
  });

/* ===================== create / update / delete template ===================== */

const upsertTemplateInput = z.object({
  id: z.string().uuid().optional(),
  nome: z.string().trim().min(1).max(120),
  descricao: z.string().nullable().optional(),
  tipo: tipoSchema,
  ativo: z.boolean().default(true),
  rfq_tipo_id: z.string().uuid().nullable().optional(),
});

export const upsertTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => upsertTemplateInput.parse(input))
  .handler(async ({ data, context }) => {
    await assertCanManage(context.supabase, context.userId);
    const nome = capitalize(data.nome);
    const descricao = data.descricao ? capitalize(data.descricao) : data.descricao ?? null;
    if (data.id) {
      await snapshotTemplate(context.supabase, data.id, context.userId, "Antes de editar dados gerais");
      const patch: Record<string, unknown> = {
        nome,
        descricao,
        tipo: data.tipo,
        ativo: data.ativo,
        updated_by: context.userId,
        updated_at: new Date().toISOString(),
      };
      if (data.rfq_tipo_id !== undefined) patch.rfq_tipo_id = data.rfq_tipo_id;
      const { error } = await context.supabase
        .from("processo_templates")
        .update(patch as never)
        .eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const insertRow: Record<string, unknown> = {
      nome,
      descricao,
      tipo: data.tipo,
      ativo: data.ativo,
      created_by: context.userId,
      updated_by: context.userId,
    };
    if (data.rfq_tipo_id !== undefined) insertRow.rfq_tipo_id = data.rfq_tipo_id;
    const { data: ins, error } = await context.supabase
      .from("processo_templates")
      .insert(insertRow as never)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: ins.id };
  });

export const deleteTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertCanManage(context.supabase, context.userId);
    await snapshotTemplate(context.supabase, data.id, context.userId, "Antes de arquivar");
    const { error } = await context.supabase
      .from("processo_templates")
      .update({ deleted_at: new Date().toISOString(), updated_by: context.userId } as never)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ===================== restore / duplicate ===================== */

export const restoreTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertCanManage(context.supabase, context.userId);
    const { error } = await context.supabase
      .from("processo_templates")
      .update({ deleted_at: null, updated_by: context.userId, updated_at: new Date().toISOString() } as never)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    await snapshotTemplate(context.supabase, data.id, context.userId, "Restaurado do arquivo");
    return { ok: true };
  });

export const duplicateTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertCanManage(context.supabase, context.userId);
    const { data: t, error } = await context.supabase
      .from("processo_templates")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!t) throw new Error("Template não encontrado.");
    const { data: ins, error: insErr } = await context.supabase
      .from("processo_templates")
      .insert({
        nome: `${t.nome} (cópia)`,
        descricao: t.descricao,
        tipo: t.tipo,
        ativo: true,
        created_by: context.userId,
        updated_by: context.userId,
      } as never)
      .select("id")
      .single();
    if (insErr) throw new Error(insErr.message);
    const newId = ins.id as string;

    const [{ data: itens }, { data: tarefas }, { data: eventos }] = await Promise.all([
      context.supabase.from("processo_template_checklist_itens").select("*").eq("template_id", data.id),
      context.supabase.from("processo_template_tarefas").select("*").eq("template_id", data.id),
      context.supabase.from("processo_template_eventos").select("*").eq("template_id", data.id),
    ]);
    if (itens && itens.length) {
      await context.supabase.from("processo_template_checklist_itens").insert(
        itens.map((i: any) => ({
          template_id: newId,
          secao: i.secao,
          ordem: i.ordem,
          titulo: i.titulo,
          descricao: i.descricao,
          obrigatorio: i.obrigatorio,
          requer_arquivo: i.requer_arquivo,
          tipos_arquivo_aceitos: i.tipos_arquivo_aceitos ?? [],
        })) as never,
      );
    }
    if (tarefas && tarefas.length) {
      await context.supabase.from("processo_template_tarefas").insert(
        tarefas.map((x: any) => ({
          template_id: newId,
          ordem: x.ordem,
          titulo: x.titulo,
          descricao: x.descricao,
          dias_apos_inicio: x.dias_apos_inicio,
          responsavel_role: x.responsavel_role,
        })) as never,
      );
    }
    if (eventos && eventos.length) {
      await context.supabase.from("processo_template_eventos").insert(
        eventos.map((e: any) => ({
          template_id: newId,
          ordem: e.ordem,
          titulo: e.titulo,
          tipo: e.tipo,
          dias_apos_inicio: e.dias_apos_inicio,
        })) as never,
      );
    }
    await snapshotTemplate(context.supabase, newId, context.userId, `Duplicado de "${t.nome}"`);
    return { id: newId };
  });

/* ===================== versões ===================== */

export type TemplateVersaoLite = {
  id: string;
  versao: number;
  motivo: string | null;
  created_at: string;
  created_by: string | null;
  created_by_nome: string | null;
};

export const listTemplateVersoes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ template_id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }): Promise<TemplateVersaoLite[]> => {
    await assertCanManage(context.supabase, context.userId);
    const { data: rows, error } = await context.supabase
      .from("processo_template_versoes")
      .select("id, versao, motivo, created_at, created_by, created_by_nome")
      .eq("template_id", data.template_id)
      .order("versao", { ascending: false });
    if (error) throw new Error(error.message);
    return (rows ?? []) as TemplateVersaoLite[];
  });

export const salvarVersaoTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ template_id: z.string().uuid(), motivo: z.string().trim().min(1).max(200) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertCanManage(context.supabase, context.userId);
    await snapshotTemplate(context.supabase, data.template_id, context.userId, data.motivo);
    return { ok: true };
  });

export const restaurarVersaoTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ versao_id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertCanManage(context.supabase, context.userId);
    const { data: v, error } = await context.supabase
      .from("processo_template_versoes")
      .select("*")
      .eq("id", data.versao_id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!v) throw new Error("Versão não encontrada.");
    const templateId = v.template_id as string;
    const snap = v.snapshot as any;

    // snapshot current state before restoring
    await snapshotTemplate(
      context.supabase,
      templateId,
      context.userId,
      `Antes de restaurar versão #${v.versao}`,
    );

    // restore template fields
    await context.supabase
      .from("processo_templates")
      .update({
        nome: snap.template.nome,
        descricao: snap.template.descricao,
        tipo: snap.template.tipo,
        ativo: snap.template.ativo,
        updated_by: context.userId,
        updated_at: new Date().toISOString(),
        deleted_at: null,
      } as never)
      .eq("id", templateId);

    // wipe children and reinsert
    await Promise.all([
      context.supabase.from("processo_template_checklist_itens").delete().eq("template_id", templateId),
      context.supabase.from("processo_template_tarefas").delete().eq("template_id", templateId),
      context.supabase.from("processo_template_eventos").delete().eq("template_id", templateId),
    ]);
    if (snap.itens?.length) {
      await context.supabase.from("processo_template_checklist_itens").insert(
        snap.itens.map((i: any) => ({
          template_id: templateId,
          secao: i.secao,
          ordem: i.ordem,
          titulo: i.titulo,
          descricao: i.descricao,
          obrigatorio: i.obrigatorio,
          requer_arquivo: i.requer_arquivo,
          tipos_arquivo_aceitos: i.tipos_arquivo_aceitos ?? [],
        })) as never,
      );
    }
    if (snap.tarefas?.length) {
      await context.supabase.from("processo_template_tarefas").insert(
        snap.tarefas.map((x: any) => ({
          template_id: templateId,
          ordem: x.ordem,
          titulo: x.titulo,
          descricao: x.descricao,
          dias_apos_inicio: x.dias_apos_inicio,
          responsavel_role: x.responsavel_role,
        })) as never,
      );
    }
    if (snap.eventos?.length) {
      await context.supabase.from("processo_template_eventos").insert(
        snap.eventos.map((e: any) => ({
          template_id: templateId,
          ordem: e.ordem,
          titulo: e.titulo,
          tipo: e.tipo,
          dias_apos_inicio: e.dias_apos_inicio,
        })) as never,
      );
    }
    return { ok: true };
  });

/* ===================== items / tarefas / eventos upsert+delete ===================== */

const itemInput = z.object({
  id: z.string().uuid().optional(),
  template_id: z.string().uuid(),
  secao: z.string().trim().min(1).max(80),
  ordem: z.number().int().min(0).default(0),
  titulo: z.string().trim().min(1).max(200),
  descricao: z.string().nullable().optional(),
  obrigatorio: z.boolean().default(false),
  requer_arquivo: z.boolean().default(false),
  tipos_arquivo_aceitos: z.array(z.string()).default([]),
});
export const upsertTemplateItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => itemInput.parse(input))
  .handler(async ({ data, context }) => {
    await assertCanManage(context.supabase, context.userId);
    await snapshotTemplate(context.supabase, data.template_id, context.userId, data.id ? "Antes de editar item" : "Antes de adicionar item");
    const payload = {
      template_id: data.template_id,
      secao: capitalize(data.secao),
      ordem: data.ordem,
      titulo: capitalize(data.titulo),
      descricao: data.descricao ? capitalize(data.descricao) : null,
      obrigatorio: data.obrigatorio,
      requer_arquivo: data.requer_arquivo,
      tipos_arquivo_aceitos: data.tipos_arquivo_aceitos,
    };
    if (data.id) {
      const { error } = await context.supabase
        .from("processo_template_checklist_itens")
        .update(payload as never)
        .eq("id", data.id);
      if (error) throw new Error(error.message);
      await touchTemplate(context.supabase, data.template_id, context.userId);
      return { id: data.id };
    }
    const { data: ins, error } = await context.supabase
      .from("processo_template_checklist_itens")
      .insert(payload as never)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    await touchTemplate(context.supabase, data.template_id, context.userId);
    return { id: ins.id };
  });

export const deleteTemplateItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertCanManage(context.supabase, context.userId);
    const { data: row } = await context.supabase
      .from("processo_template_checklist_itens").select("template_id").eq("id", data.id).maybeSingle();
    if (row?.template_id) await snapshotTemplate(context.supabase, row.template_id, context.userId, "Antes de remover item");
    const { error } = await context.supabase
      .from("processo_template_checklist_itens")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    if (row?.template_id) await touchTemplate(context.supabase, row.template_id, context.userId);
    return { ok: true };
  });

const tarefaInput = z.object({
  id: z.string().uuid().optional(),
  template_id: z.string().uuid(),
  ordem: z.number().int().min(0).default(0),
  titulo: z.string().trim().min(1).max(200),
  descricao: z.string().nullable().optional(),
  dias_apos_inicio: z.number().int().min(0).default(0),
  responsavel_role: roleSchema.nullable().optional(),
});
export const upsertTemplateTarefa = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => tarefaInput.parse(input))
  .handler(async ({ data, context }) => {
    await assertCanManage(context.supabase, context.userId);
    await snapshotTemplate(context.supabase, data.template_id, context.userId, data.id ? "Antes de editar tarefa" : "Antes de adicionar tarefa");
    const payload = {
      template_id: data.template_id,
      ordem: data.ordem,
      titulo: capitalize(data.titulo),
      descricao: data.descricao ? capitalize(data.descricao) : null,
      dias_apos_inicio: data.dias_apos_inicio,
      responsavel_role: data.responsavel_role ?? null,
    };
    if (data.id) {
      const { error } = await context.supabase
        .from("processo_template_tarefas")
        .update(payload as never)
        .eq("id", data.id);
      if (error) throw new Error(error.message);
      await touchTemplate(context.supabase, data.template_id, context.userId);
      return { id: data.id };
    }
    const { data: ins, error } = await context.supabase
      .from("processo_template_tarefas")
      .insert(payload as never)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    await touchTemplate(context.supabase, data.template_id, context.userId);
    return { id: ins.id };
  });

export const deleteTemplateTarefa = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertCanManage(context.supabase, context.userId);
    const { data: row } = await context.supabase
      .from("processo_template_tarefas").select("template_id").eq("id", data.id).maybeSingle();
    if (row?.template_id) await snapshotTemplate(context.supabase, row.template_id, context.userId, "Antes de remover tarefa");
    const { error } = await context.supabase
      .from("processo_template_tarefas")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    if (row?.template_id) await touchTemplate(context.supabase, row.template_id, context.userId);
    return { ok: true };
  });

const eventoInput = z.object({
  id: z.string().uuid().optional(),
  template_id: z.string().uuid(),
  ordem: z.number().int().min(0).default(0),
  titulo: z.string().trim().min(1).max(200),
  tipo: eventoTipoSchema.default("marco"),
  dias_apos_inicio: z.number().int().min(0).default(0),
});
export const upsertTemplateEvento = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => eventoInput.parse(input))
  .handler(async ({ data, context }) => {
    await assertCanManage(context.supabase, context.userId);
    await snapshotTemplate(context.supabase, data.template_id, context.userId, data.id ? "Antes de editar evento" : "Antes de adicionar evento");
    const payload = {
      template_id: data.template_id,
      ordem: data.ordem,
      titulo: capitalize(data.titulo),
      tipo: data.tipo,
      dias_apos_inicio: data.dias_apos_inicio,
    };
    if (data.id) {
      const { error } = await context.supabase
        .from("processo_template_eventos")
        .update(payload as never)
        .eq("id", data.id);
      if (error) throw new Error(error.message);
      await touchTemplate(context.supabase, data.template_id, context.userId);
      return { id: data.id };
    }
    const { data: ins, error } = await context.supabase
      .from("processo_template_eventos")
      .insert(payload as never)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    await touchTemplate(context.supabase, data.template_id, context.userId);
    return { id: ins.id };
  });

export const deleteTemplateEvento = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertCanManage(context.supabase, context.userId);
    const { data: row } = await context.supabase
      .from("processo_template_eventos").select("template_id").eq("id", data.id).maybeSingle();
    if (row?.template_id) await snapshotTemplate(context.supabase, row.template_id, context.userId, "Antes de remover evento");
    const { error } = await context.supabase
      .from("processo_template_eventos")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    if (row?.template_id) await touchTemplate(context.supabase, row.template_id, context.userId);
    return { ok: true };
  });

/* ===================== reordenação ===================== */

const reorderInput = z.object({
  template_id: z.string().uuid(),
  ordered_ids: z.array(z.string().uuid()).min(1),
});

async function reorderTable(
  supabase: any,
  table: "processo_template_checklist_itens" | "processo_template_tarefas" | "processo_template_eventos",
  templateId: string,
  orderedIds: string[],
  userId: string,
) {
  await assertCanManage(supabase, userId);
  for (let i = 0; i < orderedIds.length; i++) {
    const { error } = await supabase
      .from(table)
      .update({ ordem: i })
      .eq("id", orderedIds[i])
      .eq("template_id", templateId);
    if (error) throw new Error(error.message);
  }
  await touchTemplate(supabase, templateId, userId);
  return { ok: true };
}

export const reorderTemplateItens = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => reorderInput.parse(i))
  .handler(({ data, context }) =>
    reorderTable(context.supabase, "processo_template_checklist_itens", data.template_id, data.ordered_ids, context.userId),
  );

export const reorderTemplateTarefas = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => reorderInput.parse(i))
  .handler(({ data, context }) =>
    reorderTable(context.supabase, "processo_template_tarefas", data.template_id, data.ordered_ids, context.userId),
  );

export const reorderTemplateEventos = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => reorderInput.parse(i))
  .handler(({ data, context }) =>
    reorderTable(context.supabase, "processo_template_eventos", data.template_id, data.ordered_ids, context.userId),
  );

/* ===================== aplicar template a um processo ===================== */

export const aplicarTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({ processo_id: z.string().uuid(), template_id: z.string().uuid() })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    // Carrega processo
    const { data: p, error: pErr } = await context.supabase
      .from("processos")
      .select("id, tipo, pilar_id, codigo")
      .eq("id", data.processo_id)
      .maybeSingle();
    if (pErr) throw new Error(pErr.message);
    if (!p) throw new Error("Processo não encontrado.");

    const { data: t, error: tErr } = await context.supabase
      .from("processo_templates")
      .select("id, nome, tipo")
      .eq("id", data.template_id)
      .is("deleted_at", null)
      .maybeSingle();
    if (tErr) throw new Error(tErr.message);
    if (!t) throw new Error("Template não encontrado.");
    if (t.tipo !== p.tipo) {
      throw new Error("Tipo do template não corresponde ao tipo do processo.");
    }

    const [{ data: tarefas }, { data: eventos }] = await Promise.all([
      context.supabase
        .from("processo_template_tarefas")
        .select("*")
        .eq("template_id", data.template_id)
        .order("ordem", { ascending: true }),
      context.supabase
        .from("processo_template_eventos")
        .select("*")
        .eq("template_id", data.template_id)
        .order("ordem", { ascending: true }),
    ]);

    const hoje = new Date();
    function addDias(d: number) {
      const dt = new Date(hoje);
      dt.setDate(dt.getDate() + d);
      return dt.toISOString().slice(0, 10);
    }

    let tarefasCriadas = 0;
    if (tarefas && tarefas.length > 0) {
      const rows = tarefas.map((t) => ({
        processo_id: data.processo_id,
        titulo: t.titulo,
        prazo: addDias(t.dias_apos_inicio),
        pilar_id: p.pilar_id,
        status: "aberta" as const,
      }));
      const { error } = await context.supabase
        .from("processo_tarefas")
        .insert(rows as never);
      if (error) throw new Error(error.message);
      tarefasCriadas = rows.length;
    }

    let eventosCriados = 0;
    if (eventos && eventos.length > 0) {
      const rows = eventos.map((e) => ({
        processo_id: data.processo_id,
        kind: "note" as const,
        text: `[${e.tipo}] ${e.titulo} (D+${e.dias_apos_inicio})`,
      }));
      const { error } = await context.supabase
        .from("processo_eventos")
        .insert(rows as never);
      if (error) throw new Error(error.message);
      eventosCriados = rows.length;
    }

    await context.supabase.from("processo_eventos").insert({
      processo_id: data.processo_id,
      kind: "note",
      text: `Template "${t.nome}" aplicado: ${tarefasCriadas} tarefas, ${eventosCriados} eventos.`,
    } as never);

    return { ok: true, tarefasCriadas, eventosCriados };
  });