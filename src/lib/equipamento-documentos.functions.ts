import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { EQUIPAMENTO_DOC_CATEGORIAS } from "@/lib/equipamentos.shared";

/**
 * Documentos do equipamento no SLTK Drive.
 *
 * Estrutura de pastas:
 *   {DRIVE_ROOT}/{cliente.codigo} - {cliente.razao_social}/Equipamentos/{equipamento.codigo}/{AAAAMM}/
 */

const MIME_LIMITS: Record<string, number> = {
  "application/zip": 50 * 1024 * 1024,
  "application/x-zip-compressed": 50 * 1024 * 1024,
  "application/pdf": 25 * 1024 * 1024,
  "image/jpeg": 25 * 1024 * 1024,
  "image/jpg": 25 * 1024 * 1024,
  "image/png": 25 * 1024 * 1024,
};

const GW = "https://connector-gateway.lovable.dev/google_drive";

function driveHeaders() {
  return {
    Authorization: `Bearer ${process.env.LOVABLE_API_KEY ?? ""}`,
    "X-Connection-Api-Key": process.env.GOOGLE_DRIVE_API_KEY ?? "",
  };
}

function sanitizeFolderName(s: string): string {
  return s.replace(/[\\/:*?"<>|]/g, "-").trim().slice(0, 120) || "sem-nome";
}

async function driveFindFolder(name: string, parentId: string): Promise<string | null> {
  const q = `mimeType='application/vnd.google-apps.folder' and name='${name.replace(/'/g, "\\'")}' and '${parentId}' in parents and trashed=false`;
  const url = `${GW}/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name)&pageSize=1`;
  const r = await fetch(url, { headers: driveHeaders() });
  if (!r.ok) throw new Error(`Drive list ${r.status}: ${await r.text()}`);
  const j = (await r.json()) as { files?: Array<{ id: string }> };
  return j.files?.[0]?.id ?? null;
}

async function driveCreateFolder(name: string, parentId: string): Promise<string> {
  const r = await fetch(`${GW}/drive/v3/files?fields=id`, {
    method: "POST",
    headers: { ...driveHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ name, mimeType: "application/vnd.google-apps.folder", parents: [parentId] }),
  });
  if (!r.ok) throw new Error(`Drive create folder ${r.status}: ${await r.text()}`);
  const j = (await r.json()) as { id: string };
  return j.id;
}

async function ensureFolder(name: string, parentId: string): Promise<string> {
  const existing = await driveFindFolder(name, parentId);
  if (existing) return existing;
  return driveCreateFolder(name, parentId);
}

async function ensureEquipamentoFolder(opts: {
  clienteCodigo: string;
  clienteNome: string;
  equipamentoCodigo: string;
  yyyymm: string;
}): Promise<string> {
  const root = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID || "root";
  const cliente = await ensureFolder(
    sanitizeFolderName(`${opts.clienteCodigo} - ${opts.clienteNome}`),
    root,
  );
  const eqpRoot = await ensureFolder("Equipamentos", cliente);
  const eqp = await ensureFolder(sanitizeFolderName(opts.equipamentoCodigo), eqpRoot);
  return ensureFolder(opts.yyyymm, eqp);
}

async function driveUploadMultipart(opts: {
  parentId: string;
  name: string;
  mimeType: string;
  bytes: ArrayBuffer;
}): Promise<{ id: string; webViewLink: string }> {
  const boundary = `lvbl_${crypto.randomUUID()}`;
  const meta = JSON.stringify({ name: opts.name, parents: [opts.parentId], mimeType: opts.mimeType });
  const enc = new TextEncoder();
  const head = enc.encode(
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${meta}\r\n--${boundary}\r\nContent-Type: ${opts.mimeType}\r\n\r\n`,
  );
  const tail = enc.encode(`\r\n--${boundary}--`);
  const body = new Uint8Array(head.byteLength + opts.bytes.byteLength + tail.byteLength);
  body.set(head, 0);
  body.set(new Uint8Array(opts.bytes), head.byteLength);
  body.set(tail, head.byteLength + opts.bytes.byteLength);

  const r = await fetch(
    `${GW}/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink`,
    {
      method: "POST",
      headers: { ...driveHeaders(), "Content-Type": `multipart/related; boundary=${boundary}` },
      body,
    },
  );
  if (!r.ok) throw new Error(`Drive upload ${r.status}: ${await r.text()}`);
  return (await r.json()) as { id: string; webViewLink: string };
}

/* ===================== Server functions ===================== */

export const listEquipamentoDocumentos = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ equipamento_id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("cliente_equipamento_documentos" as never)
      .select(
        "id, categoria, nome_final, nome_original, mime_type, tamanho_bytes, drive_view_url, versao, observacoes, user_nome, created_at",
      )
      .eq("equipamento_id", data.equipamento_id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (rows ?? []) as Array<{
      id: string;
      categoria: string;
      nome_final: string;
      nome_original: string;
      mime_type: string;
      tamanho_bytes: number;
      drive_view_url: string | null;
      versao: string | null;
      observacoes: string | null;
      user_nome: string | null;
      created_at: string;
    }>;
  });

const uploadInput = z.object({
  equipamento_id: z.string().uuid(),
  categoria: z.enum(EQUIPAMENTO_DOC_CATEGORIAS),
  filename: z.string().min(1).max(255),
  mime_type: z.string().min(1).max(120),
  size_bytes: z.number().int().positive(),
  data_base64: z.string().min(1),
  chosen_name: z.string().min(1).max(120),
  versao: z.string().max(40).optional().nullable(),
  observacoes: z.string().max(2000).optional().nullable(),
});

export const uploadEquipamentoDocumento = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => uploadInput.parse(i))
  .handler(async ({ data, context }) => {
    const limit = MIME_LIMITS[data.mime_type];
    if (!limit) {
      throw new Error(`Tipo de arquivo não permitido (${data.mime_type}). Aceitos: PDF, JPG, PNG, ZIP.`);
    }
    if (data.size_bytes > limit) {
      const mb = (limit / 1024 / 1024).toFixed(0);
      throw new Error(`Arquivo excede o limite (${mb}MB para ${data.mime_type}).`);
    }

    const { data: eqp, error: eErr } = await context.supabase
      .from("cliente_equipamentos")
      .select("id, codigo, cliente_id, processo_id, clientes(codigo, razao_social)")
      .eq("id", data.equipamento_id)
      .maybeSingle();
    if (eErr) throw new Error(eErr.message);
    if (!eqp) throw new Error("Equipamento não encontrado ou sem acesso.");

    const cliente = (eqp as unknown as {
      clientes: { codigo: string; razao_social: string } | null;
    }).clientes;
    if (!cliente) throw new Error("Cliente do equipamento não encontrado.");

    const now = new Date();
    const yyyymm = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;

    const parentId = await ensureEquipamentoFolder({
      clienteCodigo: cliente.codigo,
      clienteNome: cliente.razao_social,
      equipamentoCodigo: (eqp as { codigo: string }).codigo,
      yyyymm,
    });

    const ext = data.filename.includes(".") ? "." + data.filename.split(".").pop() : "";
    const safe = data.chosen_name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 100);
    const finalName = safe.endsWith(ext) ? safe : `${safe}${ext}`;

    const bytes = Uint8Array.from(atob(data.data_base64), (c) => c.charCodeAt(0)).buffer;
    const up = await driveUploadMultipart({
      parentId,
      name: finalName,
      mimeType: data.mime_type,
      bytes,
    });

    const { data: profile } = await context.supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", context.userId)
      .maybeSingle();
    const userNome = profile?.full_name ?? profile?.email ?? "Sistema";

    const { data: row, error: iErr } = await context.supabase
      .from("cliente_equipamento_documentos" as never)
      .insert({
        equipamento_id: data.equipamento_id,
        cliente_id: (eqp as { cliente_id: string }).cliente_id,
        processo_id: (eqp as { processo_id: string | null }).processo_id,
        categoria: data.categoria,
        drive_file_id: up.id,
        drive_view_url: up.webViewLink,
        drive_folder_id: parentId,
        nome_final: finalName,
        nome_original: data.filename,
        mime_type: data.mime_type,
        tamanho_bytes: data.size_bytes,
        versao: data.versao ?? null,
        observacoes: data.observacoes ?? null,
        user_id: context.userId,
        user_nome: userNome,
      } as never)
      .select("id")
      .single();
    if (iErr) throw new Error(iErr.message);
    return { id: (row as { id: string }).id, url: up.webViewLink, name: finalName };
  });

export const removerEquipamentoDocumento = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("cliente_equipamento_documentos" as never)
      .update({ deleted_at: new Date().toISOString(), deleted_by: context.userId } as never)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });