import { createServerFn } from "@tanstack/react-start";
import { friendlyDbError } from "@/lib/db-errors";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertCanAccessModule } from "@/lib/admin-guard";
import { logAuditServer } from "@/lib/audit.server";

/**
 * Sub-etapas de montagem (pré-montagem/mecânica/elétrica/testes/embalagem),
 * cada uma com checklist e evidências fotográficas — "Concluir montagem" só
 * é permitido quando todas as 5 estão concluídas (ver updateMontagem em
 * equipamento-montagens.functions.ts). Nenhuma escrita é aceita numa etapa
 * já concluída: reabrir quebraria a rastreabilidade que esse fluxo existe
 * pra garantir.
 */

type AnySb = any;
const MAX_BYTES = 25 * 1024 * 1024;
const ALLOWED_MIMES = ["application/pdf", "image/png", "image/jpeg"] as const;

export const MONTAGEM_ETAPA_TIPOS = [
  "pre_montagem",
  "mecanica",
  "eletrica",
  "testes",
  "embalagem",
] as const;
export type MontagemEtapaTipo = (typeof MONTAGEM_ETAPA_TIPOS)[number];
export const MONTAGEM_ETAPA_TIPO_LABEL: Record<MontagemEtapaTipo, string> = {
  pre_montagem: "Pré-montagem",
  mecanica: "Montagem mecânica",
  eletrica: "Montagem elétrica",
  testes: "Testes internos",
  embalagem: "Embalagem",
};

export const MONTAGEM_ETAPA_STATUS = ["pendente", "em_andamento", "concluida"] as const;
export type MontagemEtapaStatus = (typeof MONTAGEM_ETAPA_STATUS)[number];

async function assertEtapaAberta(sb: AnySb, etapaId: string) {
  const { data, error } = await sb
    .from("equipamento_montagem_etapas")
    .select("id, status")
    .eq("id", etapaId)
    .maybeSingle();
  if (error) throw friendlyDbError(error);
  if (!data) throw new Error("Sub-etapa não encontrada.");
  if (data.status === "concluida") {
    throw new Error("Sub-etapa já concluída — reabertura não é permitida.");
  }
  return data as { id: string; status: MontagemEtapaStatus };
}

async function bumpEtapaEmAndamento(sb: AnySb, etapaId: string) {
  await sb
    .from("equipamento_montagem_etapas")
    .update({ status: "em_andamento" })
    .eq("id", etapaId)
    .eq("status", "pendente");
}

export const listMontagemEtapas = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ montagem_id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as AnySb;
    const [{ data: etapas, error }, { data: templates, error: tplErr }] = await Promise.all([
      sb
        .from("equipamento_montagem_etapas")
        .select(
          "id, tipo, ordem, responsavel_id, prazo, status, concluida_em, concluida_por, profiles:responsavel_id(full_name, email)",
        )
        .eq("montagem_id", data.montagem_id)
        .order("ordem"),
      sb
        .from("montagem_etapa_checklist_template")
        .select("id, tipo, ordem, titulo")
        .eq("ativo", true)
        .order("tipo")
        .order("ordem"),
    ]);
    if (error) throw friendlyDbError(error);
    if (tplErr) throw friendlyDbError(tplErr);

    const etapaIds = (etapas ?? []).map((e: any) => e.id);
    const [{ data: respostas }, { data: evidencias }] = await Promise.all([
      etapaIds.length
        ? sb
            .from("montagem_etapa_checklist_resposta")
            .select("id, etapa_id, template_id, ok, observacao")
            .in("etapa_id", etapaIds)
        : Promise.resolve({ data: [] }),
      etapaIds.length
        ? sb
            .from("montagem_etapa_evidencias")
            .select("id, etapa_id, nome_arquivo, mime, tamanho_bytes, descricao, created_at")
            .in("etapa_id", etapaIds)
            .is("deleted_at", null)
            .order("created_at", { ascending: false })
        : Promise.resolve({ data: [] }),
    ]);

    return {
      etapas: etapas ?? [],
      templates: templates ?? [],
      respostas: respostas ?? [],
      evidencias: evidencias ?? [],
    };
  });

const atribuicaoInput = z.object({
  id: z.string().uuid(),
  responsavel_id: z.string().uuid().nullable().optional(),
  prazo: z.string().nullable().optional(),
});
export const updateMontagemEtapaAtribuicao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => atribuicaoInput.parse(i))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as AnySb;
    await assertCanAccessModule(sb, context.userId, "producao");
    await assertEtapaAberta(sb, data.id);
    const { id, ...rest } = data;
    const { error } = await sb.from("equipamento_montagem_etapas").update(rest).eq("id", id);
    if (error) throw friendlyDbError(error);
    await bumpEtapaEmAndamento(sb, id);
    return { ok: true };
  });

const checklistInput = z.object({
  etapa_id: z.string().uuid(),
  template_id: z.string().uuid(),
  ok: z.boolean(),
  observacao: z.string().max(500).nullable().optional(),
});
export const setChecklistItemMontagem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => checklistInput.parse(i))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as AnySb;
    await assertCanAccessModule(sb, context.userId, "producao");
    await assertEtapaAberta(sb, data.etapa_id);
    const { error } = await sb.from("montagem_etapa_checklist_resposta").upsert(
      {
        etapa_id: data.etapa_id,
        template_id: data.template_id,
        ok: data.ok,
        observacao: data.observacao ?? null,
        updated_by: context.userId,
      },
      { onConflict: "etapa_id,template_id" },
    );
    if (error) throw friendlyDbError(error);
    await bumpEtapaEmAndamento(sb, data.etapa_id);
    return { ok: true };
  });

const evidenciaInput = z.object({
  etapa_id: z.string().uuid(),
  nome_arquivo: z.string().min(1).max(300),
  mime: z.enum(ALLOWED_MIMES),
  tamanho_bytes: z.number().int().min(1).max(MAX_BYTES),
  conteudo_base64: z.string().min(1),
  descricao: z.string().max(500).optional(),
});
export const registerMontagemEvidencia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => evidenciaInput.parse(i))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as AnySb;
    await assertCanAccessModule(sb, context.userId, "producao");
    await assertEtapaAberta(sb, data.etapa_id);
    const { data: full, error: fullErr } = await sb
      .from("equipamento_montagem_etapas")
      .select("equipamento_id, cliente_id")
      .eq("id", data.etapa_id)
      .single();
    if (fullErr || !full) throw new Error("Sub-etapa não encontrada.");

    const bin = Uint8Array.from(atob(data.conteudo_base64), (c) => c.charCodeAt(0));
    if (bin.byteLength !== data.tamanho_bytes) {
      throw new Error("Tamanho do arquivo não confere.");
    }
    const safe = data.nome_arquivo.replace(/[^\w.-]+/g, "_").slice(-120);
    const path = `${full.equipamento_id}/${data.etapa_id}/${Date.now()}_${safe}`;

    const { error: upErr } = await sb.storage
      .from("montagem-evidencias")
      .upload(path, bin, { contentType: data.mime, upsert: false });
    if (upErr) throw new Error(`Falha ao enviar: ${upErr.message}`);

    const { data: row, error } = await sb
      .from("montagem_etapa_evidencias")
      .insert({
        etapa_id: data.etapa_id,
        equipamento_id: full.equipamento_id,
        cliente_id: full.cliente_id,
        nome_arquivo: data.nome_arquivo,
        mime: data.mime,
        tamanho_bytes: data.tamanho_bytes,
        storage_path: path,
        descricao: data.descricao ?? null,
        created_by: context.userId,
      })
      .select("id")
      .single();
    if (error) throw friendlyDbError(error);
    await bumpEtapaEmAndamento(sb, data.etapa_id);
    return { id: row.id as string };
  });

export const removeMontagemEvidencia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as AnySb;
    const { data: row } = await sb
      .from("montagem_etapa_evidencias")
      .select("storage_path")
      .eq("id", data.id)
      .maybeSingle();
    if (row?.storage_path) {
      await sb.storage.from("montagem-evidencias").remove([row.storage_path]);
    }
    const { error } = await sb
      .from("montagem_etapa_evidencias")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw friendlyDbError(error);
    return { ok: true };
  });

export const getMontagemEvidenciaSignedUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as AnySb;
    const { data: row, error } = await sb
      .from("montagem_etapa_evidencias")
      .select("storage_path")
      .eq("id", data.id)
      .single();
    if (error || !row) throw new Error("Evidência não encontrada.");
    const { data: signed, error: se } = await sb.storage
      .from("montagem-evidencias")
      .createSignedUrl(row.storage_path, 600);
    if (se) throw friendlyDbError(se);
    return { url: signed.signedUrl as string };
  });

export const concluirMontagemEtapa = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ etapa_id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as AnySb;
    await assertCanAccessModule(sb, context.userId, "producao");
    const etapa = await assertEtapaAberta(sb, data.etapa_id);
    const { data: etapaFull, error: eErr } = await sb
      .from("equipamento_montagem_etapas")
      .select("tipo")
      .eq("id", data.etapa_id)
      .single();
    if (eErr || !etapaFull) throw new Error("Sub-etapa não encontrada.");

    const [{ data: templates }, { data: respostas }, { count: evidCount }] = await Promise.all([
      sb
        .from("montagem_etapa_checklist_template")
        .select("id")
        .eq("tipo", etapaFull.tipo)
        .eq("ativo", true),
      sb
        .from("montagem_etapa_checklist_resposta")
        .select("template_id, ok")
        .eq("etapa_id", data.etapa_id),
      sb
        .from("montagem_etapa_evidencias")
        .select("id", { count: "exact", head: true })
        .eq("etapa_id", data.etapa_id)
        .is("deleted_at", null),
    ]);

    const okSet = new Set(
      (respostas ?? []).filter((r: any) => r.ok).map((r: any) => r.template_id),
    );
    const faltando = (templates ?? []).filter((t: any) => !okSet.has(t.id)).length;

    if (faltando > 0 || !evidCount) {
      const partes: string[] = [];
      if (faltando > 0) partes.push(`${faltando} item(ns) do checklist`);
      if (!evidCount) partes.push("nenhuma evidência anexada");
      throw new Error(`Faltam: ${partes.join(" e ")}.`);
    }

    const { error } = await sb
      .from("equipamento_montagem_etapas")
      .update({
        status: "concluida",
        concluida_em: new Date().toISOString(),
        concluida_por: context.userId,
      })
      .eq("id", data.etapa_id);
    if (error) throw friendlyDbError(error);

    await logAuditServer(sb, context.userId, {
      table_name: "equipamento_montagem_etapas",
      record_id: data.etapa_id,
      action: "UPDATE",
      field_changed: "status",
      old_value: etapa.status,
      new_value: "concluida",
    });

    return { ok: true };
  });
