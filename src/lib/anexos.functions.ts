import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { aiChatComplete, aiConfigured } from "@/lib/ai-gateway.server";
import { driveAuth } from "@/lib/docs/drive-auth.server";

/**
 * Server fns para anexos no Google Drive.
 * - Salvos em: {DRIVE_ROOT}/{cliente.codigo} - {cliente.razao_social}/{processo.codigo}/{AAAAMM}/
 * - Limites: ZIP <=50MB, PDF/JPG/PNG <=25MB
 * - Sugestões de nome via Gemini multimodal (direto se GEMINI_API_KEY estiver setada, senão via Lovable AI Gateway)
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

async function ensureProcessoFolder(opts: {
  clienteCodigo: string;
  clienteNome: string;
  processoCodigo: string;
  yyyymm: string;
}): Promise<string> {
  const root = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID || "root";
  const cliente = await ensureFolder(`${opts.clienteCodigo} - ${opts.clienteNome}`.slice(0, 120), root);
  const proc = await ensureFolder(opts.processoCodigo, cliente);
  const mes = await ensureFolder(opts.yyyymm, proc);
  return mes;
}

async function driveUploadMultipart(opts: {
  parentId: string;
  name: string;
  mimeType: string;
  bytes: ArrayBuffer;
}): Promise<{ id: string; webViewLink: string }> {
  // multipart/related body
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
      headers: {
        ...headers,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body,
    },
  );
  if (!r.ok) throw new Error(`Drive upload ${r.status}: ${await r.text()}`);
  return (await r.json()) as { id: string; webViewLink: string };
}

/* ===================== Gemini name suggestions ===================== */

async function sugerirNomes(opts: {
  filename: string;
  mimeType: string;
  contexto: string;
  bytesBase64?: string;
}): Promise<string[]> {
  if (!aiConfigured()) return [];
  const baseName = opts.filename.replace(/\.[^.]+$/, "");

  const userContent: Array<{ type: "text"; text: string } | { type: "image_url"; image_url: { url: string } }> = [
    {
      type: "text",
      text: `Sugira 4 nomes de arquivo profissionais para este documento.
Contexto: ${opts.contexto}
Nome original: ${baseName}
Tipo: ${opts.mimeType}

Regras:
- Use snake_case ou kebab-case, sem acentos nem espaços
- Máximo 60 caracteres (sem a extensão)
- Inclua data ou identificador se relevante
- Seja descritivo do conteúdo
- NÃO inclua a extensão

Responda apenas JSON: {"sugestoes": ["nome1", "nome2", "nome3", "nome4"]}`,
    },
  ];

  if (opts.bytesBase64 && (opts.mimeType.startsWith("image/") || opts.mimeType === "application/pdf")) {
    userContent.push({
      type: "image_url",
      image_url: { url: `data:${opts.mimeType};base64,${opts.bytesBase64}` },
    });
  }

  try {
    const content = await aiChatComplete({
      system: "Você é um assistente que sugere nomes de arquivo claros e padronizados.",
      userContent,
      jsonMode: true,
    });
    const parsed = JSON.parse(content) as { sugestoes?: unknown };
    const arr = Array.isArray(parsed.sugestoes) ? parsed.sugestoes : [];
    return arr
      .filter((x): x is string => typeof x === "string")
      .map((s) => s.replace(/\.[^.]+$/, "").slice(0, 80))
      .slice(0, 4);
  } catch {
    return [];
  }
}

/* ===================== Server functions ===================== */

const uploadInput = z.object({
  processo_id: z.string().uuid(),
  checklist_status_id: z.string().uuid().nullable(),
  filename: z.string().min(1).max(255),
  mime_type: z.string().min(1).max(120),
  size_bytes: z.number().int().positive(),
  data_base64: z.string().min(1), // arquivo inteiro em base64
  chosen_name: z.string().min(1).max(120), // nome escolhido (sem extensão)
});

export const uploadAnexoChecklist = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => uploadInput.parse(input))
  .handler(async ({ data, context }) => {
    // 1) valida tipo + tamanho
    const limit = MIME_LIMITS[data.mime_type];
    if (!limit) {
      throw new Error(
        `Tipo de arquivo não permitido (${data.mime_type}). Aceitos: PDF, JPG, PNG, ZIP.`,
      );
    }
    if (data.size_bytes > limit) {
      const mb = (limit / 1024 / 1024).toFixed(0);
      throw new Error(`Arquivo excede o limite (${mb}MB para ${data.mime_type}).`);
    }

    // 2) busca processo + cliente para montar a árvore
    const { data: proc, error: pErr } = await context.supabase
      .from("processos")
      .select("id, codigo, cliente_id, clientes!inner(codigo, razao_social)")
      .eq("id", data.processo_id)
      .maybeSingle();
    if (pErr) throw new Error(pErr.message);
    if (!proc) throw new Error("Processo não encontrado ou sem acesso.");
    const cliente = (proc as unknown as {
      clientes: { codigo: string; razao_social: string };
    }).clientes;

    const now = new Date();
    const yyyymm = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;

    // 3) garante pastas no Drive
    const parentId = await ensureProcessoFolder({
      clienteCodigo: cliente.codigo,
      clienteNome: cliente.razao_social,
      processoCodigo: (proc as unknown as { codigo: string }).codigo,
      yyyymm,
    });

    // 4) monta nome final
    const ext = data.filename.includes(".") ? "." + data.filename.split(".").pop() : "";
    const safe = data.chosen_name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 100);
    const finalName = safe.endsWith(ext) ? safe : `${safe}${ext}`;

    // 5) upload
    const bytes = Uint8Array.from(atob(data.data_base64), (c) => c.charCodeAt(0)).buffer;
    const up = await driveUploadMultipart({
      parentId,
      name: finalName,
      mimeType: data.mime_type,
      bytes,
    });

    // 6) grava metadata
    const { data: profile } = await context.supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", context.userId)
      .maybeSingle();
    const userNome = profile?.full_name ?? profile?.email ?? "Sistema";

    const { data: anexo, error: aErr } = await context.supabase
      .from("processo_anexos")
      .insert({
        processo_id: data.processo_id,
        checklist_status_id: data.checklist_status_id,
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
    if (aErr) throw new Error(aErr.message);

    // 7) log de ação "anexou" no checklist
    if (data.checklist_status_id) {
      await context.supabase.from("processo_checklist_acoes").insert({
        status_id: data.checklist_status_id,
        processo_id: data.processo_id,
        acao: "anexou",
        comentario: finalName,
        anexo_id: (anexo as { id: string }).id,
        user_id: context.userId,
        user_nome: userNome,
      } as never);
    }

    return { id: (anexo as { id: string }).id, url: up.webViewLink, name: finalName };
  });

const sugerirInput = z.object({
  filename: z.string().min(1).max(255),
  mime_type: z.string().min(1).max(120),
  contexto: z.string().max(400).default(""),
  data_base64: z.string().optional(),
});

export const sugerirNomesArquivo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => sugerirInput.parse(input))
  .handler(async ({ data }) => {
    const sug = await sugerirNomes({
      filename: data.filename,
      mimeType: data.mime_type,
      contexto: data.contexto,
      bytesBase64: data.data_base64,
    });
    return { sugestoes: sug };
  });

/* ===================== Lista de anexos ===================== */

const listInput = z.object({ processo_id: z.string().uuid() });

export const listAnexos = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => listInput.parse(input))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("processo_anexos")
      .select("id, nome_final, drive_view_url, mime_type, tamanho_bytes, user_nome, created_at, checklist_status_id")
      .eq("processo_id", data.processo_id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

const removeInput = z.object({ id: z.string().uuid() });

export const removerAnexo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => removeInput.parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("processo_anexos")
      .update({ deleted_at: new Date().toISOString(), deleted_by: context.userId } as never)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });