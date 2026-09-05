import { createServerFn } from "@tanstack/react-start";
import { friendlyDbError } from "@/lib/db-errors";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { driveAuth } from "@/lib/docs/drive-auth.server";

/**
 * Anexos de oportunidades no SLTK Drive.
 *
 * Estrutura de pastas (padrão do sistema):
 *  - Com cliente vinculado:
 *      {DRIVE_ROOT}/{cliente.codigo} - {cliente.razao_social}/Comercial/{opp.codigo} - {opp.titulo}/{AAAAMM}/
 *  - Sem cliente (lead/suspect):
 *      {DRIVE_ROOT}/_Comercial/{ano}/{opp.codigo} - {empresa_lead|titulo}/{AAAAMM}/
 *
 * Limites idênticos aos anexos de processos:
 *  - ZIP <= 50MB
 *  - PDF / JPG / PNG <= 25MB
 */

const MIME_LIMITS: Record<string, number> = {
  "application/zip": 50 * 1024 * 1024,
  "application/x-zip-compressed": 50 * 1024 * 1024,
  "application/pdf": 25 * 1024 * 1024,
  "image/jpeg": 25 * 1024 * 1024,
  "image/jpg": 25 * 1024 * 1024,
  "image/png": 25 * 1024 * 1024,
};

async function driveFindFolder(name: string, parentId: string): Promise<string | null> {
  const { baseUrl, headers } = await driveAuth();
  const q = `mimeType='application/vnd.google-apps.folder' and name='${name.replace(/'/g, "\\'")}' and '${parentId}' in parents and trashed=false`;
  const url = `${baseUrl}/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name)&pageSize=1`;
  const r = await fetch(url, { headers });
  if (!r.ok) throw new Error(`Drive list ${r.status}: ${await r.text()}`);
  const j = (await r.json()) as { files?: Array<{ id: string }> };
  return j.files?.[0]?.id ?? null;
}

async function driveCreateFolder(name: string, parentId: string): Promise<string> {
  const { baseUrl, headers } = await driveAuth();
  const r = await fetch(`${baseUrl}/drive/v3/files?fields=id`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({
      name,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentId],
    }),
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

function sanitizeFolderName(s: string): string {
  return s.replace(/[\\/:*?"<>|]/g, "-").trim().slice(0, 120) || "sem-nome";
}

async function ensureOportunidadeFolder(opts: {
  clienteCodigo: string | null;
  clienteNome: string | null;
  oppCodigo: string;
  oppTitulo: string;
  empresaLead: string | null;
  yyyymm: string;
  ano: string;
}): Promise<string> {
  const root = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID || "root";
  const oppName = sanitizeFolderName(`${opts.oppCodigo} - ${opts.oppTitulo || opts.empresaLead || "Sem título"}`);

  let opp: string;
  if (opts.clienteCodigo && opts.clienteNome) {
    const cliente = await ensureFolder(
      sanitizeFolderName(`${opts.clienteCodigo} - ${opts.clienteNome}`),
      root,
    );
    const comercial = await ensureFolder("Comercial", cliente);
    opp = await ensureFolder(oppName, comercial);
  } else {
    const comercialRoot = await ensureFolder("_Comercial", root);
    const anoFolder = await ensureFolder(opts.ano, comercialRoot);
    opp = await ensureFolder(oppName, anoFolder);
  }
  return ensureFolder(opts.yyyymm, opp);
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

  const { baseUrl, headers } = await driveAuth();
  const r = await fetch(
    `${baseUrl}/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink`,
    {
      method: "POST",
      headers: { ...headers, "Content-Type": `multipart/related; boundary=${boundary}` },
      body,
    },
  );
  if (!r.ok) throw new Error(`Drive upload ${r.status}: ${await r.text()}`);
  return (await r.json()) as { id: string; webViewLink: string };
}

/* ===================== Server functions ===================== */

const uploadInput = z.object({
  oportunidade_id: z.string().uuid(),
  filename: z.string().min(1).max(255),
  mime_type: z.string().min(1).max(120),
  size_bytes: z.number().int().positive(),
  data_base64: z.string().min(1),
  chosen_name: z.string().min(1).max(120),
});

export const uploadOportunidadeAnexo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => uploadInput.parse(input))
  .handler(async ({ data, context }) => {
    const limit = MIME_LIMITS[data.mime_type];
    if (!limit) {
      throw new Error(`Tipo de arquivo não permitido (${data.mime_type}). Aceitos: PDF, JPG, PNG, ZIP.`);
    }
    if (data.size_bytes > limit) {
      const mb = (limit / 1024 / 1024).toFixed(0);
      throw new Error(`Arquivo excede o limite (${mb}MB para ${data.mime_type}).`);
    }

    const { data: opp, error: oErr } = await context.supabase
      .from("oportunidades")
      .select("id, codigo, titulo, empresa_lead, cliente_id, clientes(codigo, razao_social)")
      .eq("id", data.oportunidade_id)
      .maybeSingle();
    if (oErr) throw friendlyDbError(oErr);
    if (!opp) throw new Error("Oportunidade não encontrada ou sem acesso.");

    const cliente = (opp as unknown as {
      clientes: { codigo: string; razao_social: string } | null;
    }).clientes;

    const now = new Date();
    const yyyymm = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
    const ano = String(now.getFullYear());

    const parentId = await ensureOportunidadeFolder({
      clienteCodigo: cliente?.codigo ?? null,
      clienteNome: cliente?.razao_social ?? null,
      oppCodigo: (opp as { codigo: string }).codigo,
      oppTitulo: (opp as { titulo: string }).titulo,
      empresaLead: (opp as { empresa_lead: string | null }).empresa_lead,
      yyyymm,
      ano,
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

    const { data: anexo, error: aErr } = await context.supabase
      .from("oportunidade_anexos" as never)
      .insert({
        oportunidade_id: data.oportunidade_id,
        drive_file_id: up.id,
        drive_view_url: up.webViewLink,
        drive_folder_id: parentId,
        nome_final: finalName,
        nome_original: data.filename,
        mime_type: data.mime_type,
        tamanho_bytes: data.size_bytes,
        user_id: context.userId,
        user_nome: userNome,
      } as never)
      .select("id, drive_view_url, nome_final")
      .single();
    if (aErr) throw friendlyDbError(aErr);

    return {
      id: (anexo as { id: string }).id,
      url: up.webViewLink,
      name: finalName,
    };
  });

export const listOportunidadeAnexos = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ oportunidade_id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("oportunidade_anexos" as never)
      .select("id, nome_final, drive_view_url, mime_type, tamanho_bytes, user_nome, created_at")
      .eq("oportunidade_id", data.oportunidade_id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    if (error) throw friendlyDbError(error);
    return (rows ?? []) as Array<{
      id: string;
      nome_final: string;
      drive_view_url: string | null;
      mime_type: string;
      tamanho_bytes: number;
      user_nome: string | null;
      created_at: string;
    }>;
  });

export const removerOportunidadeAnexo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("oportunidade_anexos" as never)
      .update({ deleted_at: new Date().toISOString(), deleted_by: context.userId } as never)
      .eq("id", data.id);
    if (error) throw friendlyDbError(error);
    return { ok: true };
  });