import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { driveAuth } from "@/lib/docs/drive-auth.server";

/**
 * Server fns para Relatórios SAT (preenchimento, anexos no Drive).
 */

/* ============ DRIVE HELPERS (mesma estratégia de anexos.functions.ts) ============ */

const MIME_LIMITS: Record<string, number> = {
  "application/zip": 50 * 1024 * 1024,
  "application/x-zip-compressed": 50 * 1024 * 1024,
  "application/pdf": 25 * 1024 * 1024,
  "image/jpeg": 25 * 1024 * 1024,
  "image/jpg": 25 * 1024 * 1024,
  "image/png": 25 * 1024 * 1024,
  "image/webp": 25 * 1024 * 1024,
  "image/heic": 25 * 1024 * 1024,
};

function sanitizeFolderName(name: string) {
  return name.replace(/[\\/:*?"<>|]/g, "-").slice(0, 120).trim() || "sem-nome";
}

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
  return ((await r.json()) as { id: string }).id;
}

async function ensureFolder(name: string, parentId: string): Promise<string> {
  const safe = sanitizeFolderName(name);
  return (await driveFindFolder(safe, parentId)) ?? (await driveCreateFolder(safe, parentId));
}

async function ensureSATFolder(opts: {
  clienteCodigo: string | null;
  clienteNome: string | null;
  processoCodigo: string | null;
  relatorioCodigo: string;
  yyyymm: string;
}): Promise<string> {
  const root = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID || "root";
  let base: string;
  if (opts.clienteCodigo && opts.clienteNome) {
    const cliente = await ensureFolder(
      `${opts.clienteCodigo} - ${opts.clienteNome}`,
      root,
    );
    if (opts.processoCodigo) {
      const proc = await ensureFolder(opts.processoCodigo, cliente);
      base = await ensureFolder("SAT", proc);
    } else {
      const pv = await ensureFolder("Pos-venda", cliente);
      base = await ensureFolder("SAT", pv);
    }
  } else {
    const sat = await ensureFolder("_SAT", root);
    const ano = await ensureFolder(opts.yyyymm.slice(0, 4), sat);
    base = ano;
  }
  const relat = await ensureFolder(opts.relatorioCodigo, base);
  const mes = await ensureFolder(opts.yyyymm, relat);
  return mes;
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

/* ============ TYPES ============ */

export type SATRelatorioLite = {
  id: string;
  codigo: string;
  status: string;
  cliente_id: string | null;
  cliente_nome: string | null;
  processo_id: string | null;
  processo_codigo: string | null;
  periodo_de: string | null;
  periodo_ate: string | null;
  pdf_drive_view_url: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type SATAnexo = {
  id: string;
  relatorio_id: string;
  item_id: string | null;
  secao_id: string | null;
  tipo_anexo: string;
  drive_file_id: string;
  drive_view_url: string;
  nome_original: string;
  nome_final: string;
  mime_type: string;
  tamanho_bytes: number;
  descricao: string | null;
  user_id: string | null;
  user_nome: string | null;
  created_at: string;
};

/* ============ LISTAR ============ */

const listInput = z.object({
  q: z.string().optional(),
  status: z.string().optional(),
  cliente_id: z.string().uuid().optional(),
  page: z.number().int().min(1).default(1),
  per_page: z.number().int().min(1).max(50).default(20),
});

export const listSATRelatorios = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => listInput.parse(input))
  .handler(async ({ data, context }) => {
    const from = (data.page - 1) * data.per_page;
    const to = from + data.per_page - 1;
    let q = context.supabase
      .from("sat_relatorio")
      .select(
        "id, codigo, status, cliente_id, processo_id, periodo_de, periodo_ate, pdf_drive_view_url, created_by, created_at, updated_at, clientes(razao_social, codigo), processos(codigo)",
        { count: "exact" },
      )
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .range(from, to);

    if (data.status) q = q.eq("status", data.status as "rascunho" | "preenchendo" | "assinado" | "arquivado");
    if (data.cliente_id) q = q.eq("cliente_id", data.cliente_id);
    if (data.q) q = q.ilike("codigo", `%${data.q}%`);

    const { data: rows, error, count } = await q;
    if (error) throw new Error(error.message);
    return {
      items: (rows ?? []).map((r) => {
        const cli = (r as { clientes?: { razao_social?: string } }).clientes;
        const proc = (r as { processos?: { codigo?: string } }).processos;
        return {
          id: r.id as string,
          codigo: r.codigo as string,
          status: r.status as string,
          cliente_id: (r as { cliente_id: string | null }).cliente_id,
          cliente_nome: cli?.razao_social ?? null,
          processo_id: (r as { processo_id: string | null }).processo_id,
          processo_codigo: proc?.codigo ?? null,
          periodo_de: (r as { periodo_de: string | null }).periodo_de,
          periodo_ate: (r as { periodo_ate: string | null }).periodo_ate,
          pdf_drive_view_url: (r as { pdf_drive_view_url: string | null }).pdf_drive_view_url,
          created_by: (r as { created_by: string | null }).created_by,
          created_at: r.created_at as string,
          updated_at: r.updated_at as string,
        } as SATRelatorioLite;
      }),
      total: count ?? 0,
      page: data.page,
      per_page: data.per_page,
    };
  });

/* ============ CRIAR ============ */

const createInput = z.object({
  cliente_id: z.string().uuid().nullable().optional(),
  processo_id: z.string().uuid().nullable().optional(),
  equipamento_ids: z.array(z.string().uuid()).default([]),
  template_id: z.string().uuid().optional(),
  periodo_de: z.string().nullable().optional(),
  periodo_ate: z.string().nullable().optional(),
  local_endereco: z.string().max(400).nullable().optional(),
});

export const createSATRelatorio = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => createInput.parse(input))
  .handler(async ({ data, context }) => {
    let tplId = data.template_id;
    let tplVersao: number | null = null;
    if (!tplId) {
      const { data: tpl } = await context.supabase
        .from("sat_template")
        .select("id, versao")
        .eq("ativo", true)
        .maybeSingle();
      if (!tpl) throw new Error("Nenhum template SAT ativo encontrado.");
      tplId = tpl.id as string;
      tplVersao = tpl.versao as number;
    } else {
      const { data: tpl } = await context.supabase
        .from("sat_template")
        .select("versao")
        .eq("id", tplId)
        .maybeSingle();
      tplVersao = (tpl?.versao as number | undefined) ?? 1;
    }

    const { data: row, error } = await context.supabase
      .from("sat_relatorio")
      .insert({
        cliente_id: data.cliente_id ?? null,
        processo_id: data.processo_id ?? null,
        equipamento_ids: data.equipamento_ids,
        template_id: tplId,
        template_versao: tplVersao,
        periodo_de: data.periodo_de ?? null,
        periodo_ate: data.periodo_ate ?? null,
        local_endereco: data.local_endereco ?? null,
        status: "rascunho",
        created_by: context.userId,
        updated_by: context.userId,
        tecnico_ids: [context.userId],
      } as never)
      .select("id, codigo")
      .single();
    if (error) throw new Error(error.message);
    return row as { id: string; codigo: string };
  });

/* ============ DETALHE ============ */

const getInput = z.object({ id: z.string().uuid() });

export const getSATRelatorio = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => getInput.parse(input))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("sat_relatorio")
      .select(
        "*, clientes(id, codigo, razao_social), processos(id, codigo, titulo)",
      )
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Relatório não encontrado ou sem acesso.");
    return row;
  });

/* ============ SALVAR (autosave) ============ */

const saveInput = z.object({
  id: z.string().uuid(),
  dados: z.record(z.string(), z.unknown()).optional(),
  tecnicos: z.array(z.record(z.string(), z.unknown())).optional(),
  periodo_de: z.string().nullable().optional(),
  periodo_ate: z.string().nullable().optional(),
  local_endereco: z.string().max(400).nullable().optional(),
  motivos_viagem: z.array(z.string()).optional(),
  observacoes: z.string().max(4000).nullable().optional(),
  status: z.enum(["rascunho", "preenchendo", "assinado", "arquivado"]).optional(),
});

export const saveSATRelatorio = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => saveInput.parse(input))
  .handler(async ({ data, context }) => {
    const patch: Record<string, unknown> = { updated_by: context.userId };
    for (const k of [
      "dados",
      "tecnicos",
      "periodo_de",
      "periodo_ate",
      "local_endereco",
      "motivos_viagem",
      "observacoes",
      "status",
    ] as const) {
      const v = (data as Record<string, unknown>)[k];
      if (v !== undefined) patch[k] = v;
    }
    const { error } = await context.supabase
      .from("sat_relatorio")
      .update(patch as never)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ============ ANEXOS ============ */

const uploadInput = z.object({
  relatorio_id: z.string().uuid(),
  item_id: z.string().max(80).nullable().optional(),
  secao_id: z.string().max(80).nullable().optional(),
  filename: z.string().min(1).max(255),
  mime_type: z.string().min(1).max(120),
  size_bytes: z.number().int().positive(),
  data_base64: z.string().min(1),
  descricao: z.string().max(400).nullable().optional(),
});

export const uploadSATAnexo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => uploadInput.parse(input))
  .handler(async ({ data, context }) => {
    const limit = MIME_LIMITS[data.mime_type];
    if (!limit) {
      throw new Error(
        `Tipo não permitido (${data.mime_type}). Aceitos: PDF, JPG, PNG, WEBP, HEIC, ZIP.`,
      );
    }
    if (data.size_bytes > limit) {
      const mb = (limit / 1024 / 1024).toFixed(0);
      throw new Error(`Arquivo excede o limite (${mb}MB).`);
    }

    const { data: rel, error: rErr } = await context.supabase
      .from("sat_relatorio")
      .select("id, codigo, cliente_id, processo_id, drive_folder_id, clientes(codigo, razao_social), processos(codigo)")
      .eq("id", data.relatorio_id)
      .maybeSingle();
    if (rErr) throw new Error(rErr.message);
    if (!rel) throw new Error("Relatório não encontrado ou sem acesso.");

    const cli = (rel as { clientes?: { codigo?: string; razao_social?: string } }).clientes ?? null;
    const proc = (rel as { processos?: { codigo?: string } }).processos ?? null;

    const now = new Date();
    const yyyymm = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;

    const parentId = await ensureSATFolder({
      clienteCodigo: cli?.codigo ?? null,
      clienteNome: cli?.razao_social ?? null,
      processoCodigo: proc?.codigo ?? null,
      relatorioCodigo: rel.codigo as string,
      yyyymm,
    });

    const ext = data.filename.includes(".") ? "." + data.filename.split(".").pop() : "";
    const base = data.filename.replace(/\.[^.]+$/, "");
    const safe = base.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80);
    const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}_${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}${String(now.getSeconds()).padStart(2, "0")}`;
    const finalName = `${safe}_${stamp}${ext}`;

    const bytes = Uint8Array.from(atob(data.data_base64), (c) => c.charCodeAt(0)).buffer;
    const up = await driveUploadMultipart({
      parentId,
      name: finalName,
      mimeType: data.mime_type,
      bytes,
    });

    if (!(rel as { drive_folder_id?: string | null }).drive_folder_id) {
      await context.supabase
        .from("sat_relatorio")
        .update({ drive_folder_id: parentId } as never)
        .eq("id", data.relatorio_id);
    }

    const { data: profile } = await context.supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", context.userId)
      .maybeSingle();
    const userNome = profile?.full_name ?? profile?.email ?? "Sistema";

    const { data: anexo, error: aErr } = await context.supabase
      .from("sat_relatorio_anexo")
      .insert({
        relatorio_id: data.relatorio_id,
        item_id: data.item_id ?? null,
        secao_id: data.secao_id ?? null,
        tipo_anexo: data.item_id ? "item" : "geral",
        drive_file_id: up.id,
        drive_view_url: up.webViewLink,
        drive_folder_id: parentId,
        nome_final: finalName,
        nome_original: data.filename,
        mime_type: data.mime_type,
        tamanho_bytes: data.size_bytes,
        descricao: data.descricao ?? null,
        user_id: context.userId,
        user_nome: userNome,
      } as never)
      .select("id, drive_view_url, nome_final, mime_type")
      .single();
    if (aErr) throw new Error(aErr.message);
    return anexo as { id: string; drive_view_url: string; nome_final: string; mime_type: string };
  });

const listAnexInput = z.object({ relatorio_id: z.string().uuid() });

export const listSATAnexos = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => listAnexInput.parse(input))
  .handler(async ({ data, context }): Promise<SATAnexo[]> => {
    const { data: rows, error } = await context.supabase
      .from("sat_relatorio_anexo")
      .select(
        "id, relatorio_id, item_id, secao_id, tipo_anexo, drive_file_id, drive_view_url, nome_original, nome_final, mime_type, tamanho_bytes, descricao, user_id, user_nome, created_at",
      )
      .eq("relatorio_id", data.relatorio_id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (rows ?? []) as unknown as SATAnexo[];
  });

const delAnexInput = z.object({ id: z.string().uuid() });

export const deleteSATAnexo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => delAnexInput.parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("sat_relatorio_anexo")
      .update({ deleted_at: new Date().toISOString(), deleted_by: context.userId } as never)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });