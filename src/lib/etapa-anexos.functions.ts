import { createServerFn } from "@tanstack/react-start";
import { friendlyDbError } from "@/lib/db-errors";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertEngineerOrHigher } from "@/lib/admin-guard";

type AnySb = any;
const MAX_BYTES = 25 * 1024 * 1024;
const ALLOWED_MIMES = ["application/pdf", "image/png", "image/jpeg"] as const;

export const listEtapaAnexos = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ etapa_id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as AnySb;
    const { data: rows, error } = await sb
      .from("equipamento_etapa_anexos")
      .select(
        "id, nome_arquivo, mime, tamanho_bytes, storage_path, descricao, created_by, created_at",
      )
      .eq("etapa_id", data.etapa_id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    if (error) throw friendlyDbError(error);
    return rows ?? [];
  });

export const uploadEtapaAnexo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        etapa_id: z.string().uuid(),
        nome_arquivo: z.string().min(1).max(300),
        mime: z.enum(ALLOWED_MIMES),
        tamanho_bytes: z.number().int().min(1).max(MAX_BYTES),
        conteudo_base64: z.string().min(1),
        descricao: z.string().max(500).optional(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase as AnySb;
    await assertEngineerOrHigher(sb, context.userId);

    const { data: et, error: etErr } = await sb
      .from("equipamento_disciplina_etapas")
      .select("id, equipamento_id, cliente_equipamentos:equipamento_id (id, cliente_id)")
      .eq("id", data.etapa_id)
      .single();
    if (etErr || !et) throw new Error("Etapa não encontrada.");
    const equipamento_id = et.equipamento_id as string;
    const cliente_id = (et as any).cliente_equipamentos?.cliente_id ?? null;

    const bin = Uint8Array.from(atob(data.conteudo_base64), (c) => c.charCodeAt(0));
    if (bin.byteLength !== data.tamanho_bytes) {
      throw new Error("Tamanho do arquivo não confere.");
    }
    const safe = data.nome_arquivo.replace(/[^\w.\-]+/g, "_").slice(-120);
    const path = `${equipamento_id}/${data.etapa_id}/${Date.now()}_${safe}`;

    const { error: upErr } = await sb.storage
      .from("etapa-anexos")
      .upload(path, bin, { contentType: data.mime, upsert: false });
    if (upErr) throw new Error(`Falha ao enviar: ${upErr.message}`);

    const { data: row, error } = await sb
      .from("equipamento_etapa_anexos")
      .insert({
        etapa_id: data.etapa_id,
        equipamento_id,
        cliente_id,
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
    return { id: row.id as string };
  });

export const getEtapaAnexoUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ anexo_id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as AnySb;
    const { data: row, error } = await sb
      .from("equipamento_etapa_anexos")
      .select("storage_path")
      .eq("id", data.anexo_id)
      .single();
    if (error || !row) throw new Error("Anexo não encontrado.");
    const { data: signed, error: se } = await sb.storage
      .from("etapa-anexos")
      .createSignedUrl(row.storage_path, 600);
    if (se) throw friendlyDbError(se);
    return { url: signed.signedUrl as string };
  });

export const deleteEtapaAnexo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ anexo_id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as AnySb;
    await assertEngineerOrHigher(sb, context.userId);
    const { data: row } = await sb
      .from("equipamento_etapa_anexos")
      .select("storage_path")
      .eq("id", data.anexo_id)
      .single();
    if (row?.storage_path) {
      await sb.storage.from("etapa-anexos").remove([row.storage_path]);
    }
    const { error } = await sb
      .from("equipamento_etapa_anexos")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", data.anexo_id);
    if (error) throw friendlyDbError(error);
    return { ok: true };
  });
