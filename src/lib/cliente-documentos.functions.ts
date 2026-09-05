import { createServerFn } from "@tanstack/react-start";
import { assertCanAccessModule } from "@/lib/admin-guard";
import { friendlyDbError } from "@/lib/db-errors";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { driveAuth } from "@/lib/docs/drive-auth.server";

/**
 * Documentos cadastrais do cliente no SLTK Drive.
 *
 * Estrutura de pastas (padrão do sistema):
 *   {DRIVE_ROOT}/{cliente.codigo} - {cliente.razao_social}/Cadastro/{AAAAMM}/
 *
 * Limites: PDF/JPG/PNG <= 25MB · ZIP <= 50MB
 */

const MIME_LIMITS: Record<string, number> = {
  "application/zip": 50 * 1024 * 1024,
  "application/x-zip-compressed": 50 * 1024 * 1024,
  "application/pdf": 25 * 1024 * 1024,
  "image/jpeg": 25 * 1024 * 1024,
  "image/jpg": 25 * 1024 * 1024,
  "image/png": 25 * 1024 * 1024,
};

export const CLIENTE_DOC_CATEGORIAS = [
  "contrato_social",
  "cartao_cnpj",
  "comprovante_endereco",
  "certidao",
  "procuracao",
  "outro",
] as const;

export const CLIENTE_DOC_CATEGORIA_LABEL: Record<string, string> = {
  contrato_social: "Contrato social",
  cartao_cnpj: "Cartão CNPJ",
  comprovante_endereco: "Comprovante de endereço",
  certidao: "Certidão",
  procuracao: "Procuração",
  outro: "Outro",
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

const uploadInput = z.object({
  cliente_id: z.string().uuid(),
  filename: z.string().min(1).max(255),
  mime_type: z.string().min(1).max(120),
  size_bytes: z.number().int().positive(),
  data_base64: z.string().min(1),
  chosen_name: z.string().min(1).max(120),
  categoria: z.enum(CLIENTE_DOC_CATEGORIAS).default("outro"),
});

export const uploadClienteDocumento = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => uploadInput.parse(input))
  .handler(async ({ data, context }) => {
    await assertCanAccessModule(context.supabase, context.userId, "clientes");
    const limit = MIME_LIMITS[data.mime_type];
    if (!limit) {
      throw new Error(`Tipo de arquivo não permitido (${data.mime_type}). Aceitos: PDF, JPG, PNG, ZIP.`);
    }
    if (data.size_bytes > limit) {
      const mb = (limit / 1024 / 1024).toFixed(0);
      throw new Error(`Arquivo excede o limite (${mb}MB para ${data.mime_type}).`);
    }

    const { data: cliente, error: cErr } = await context.supabase
      .from("clientes")
      .select("id, codigo, razao_social")
      .eq("id", data.cliente_id)
      .is("deleted_at", null)
      .maybeSingle();
    if (cErr) throw friendlyDbError(cErr);
    if (!cliente) throw new Error("Cliente não encontrado ou sem acesso.");

    const now = new Date();
    const yyyymm = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;

    const root = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID || "root";
    const clienteFolder = await ensureFolder(
      sanitizeFolderName(`${cliente.codigo} - ${cliente.razao_social}`),
      root,
    );
    const cadastro = await ensureFolder("Cadastro", clienteFolder);
    const parentId = await ensureFolder(yyyymm, cadastro);

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

    const { data: doc, error: dErr } = await context.supabase
      .from("cliente_documentos")
      .insert({
        cliente_id: data.cliente_id,
        categoria: data.categoria,
        drive_file_id: up.id,
        drive_view_url: up.webViewLink,
        nome_final: finalName,
        nome_original: data.filename,
        mime: data.mime_type,
        size_bytes: data.size_bytes,
        user_id: context.userId,
        user_nome: userNome,
      } as never)
      .select("id, drive_view_url, nome_final")
      .single();
    if (dErr) throw friendlyDbError(dErr);

    // Registra interação na timeline
    await context.supabase.from("cliente_interacoes").insert({
      cliente_id: data.cliente_id,
      tipo: "documento_anexado",
      descricao: `Documento anexado: ${finalName} (${data.categoria})`,
      user_id: context.userId,
      user_nome: userNome,
    } as never);

    return {
      id: (doc as { id: string }).id,
      url: up.webViewLink,
      name: finalName,
    };
  });

export const removerClienteDocumento = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertCanAccessModule(context.supabase, context.userId, "clientes");
    const { data: doc } = await context.supabase
      .from("cliente_documentos")
      .select("id, cliente_id, nome_final, categoria")
      .eq("id", data.id)
      .maybeSingle();
    const { error } = await context.supabase
      .from("cliente_documentos")
      .update({ deleted_at: new Date().toISOString() } as never)
      .eq("id", data.id);
    if (error) throw friendlyDbError(error);

    if (doc) {
      const { data: profile } = await context.supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", context.userId)
        .maybeSingle();
      const userNome = profile?.full_name ?? profile?.email ?? "Sistema";
      await context.supabase.from("cliente_interacoes").insert({
        cliente_id: doc.cliente_id,
        tipo: "documento_removido",
        descricao: `Documento removido: ${doc.nome_final} (${doc.categoria})`,
        user_id: context.userId,
        user_nome: userNome,
      } as never);
    }
    return { ok: true };
  });