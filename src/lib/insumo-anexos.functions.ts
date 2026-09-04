import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { driveAuth } from "@/lib/docs/drive-auth.server";

/**
 * Anexos por insumo (arquivos técnicos, orçamentos recebidos) + trilha de atividades.
 * Upload direto para Google Drive na MESMA estrutura da RFQ do item:
 *   {ROOT}/Compras/Solicitacoes/{cliente.codigo}/{projeto.codigo}/{SC-YYYY-XXXXXX}/
 */

const MIME_LIMITS: Record<string, number> = {
  "application/pdf": 25 * 1024 * 1024,
  "image/jpeg": 25 * 1024 * 1024,
  "image/jpg": 25 * 1024 * 1024,
  "image/png": 25 * 1024 * 1024,
  "image/webp": 25 * 1024 * 1024,
  "application/zip": 50 * 1024 * 1024,
  "application/x-zip-compressed": 50 * 1024 * 1024,
  "application/msword": 25 * 1024 * 1024,
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": 25 * 1024 * 1024,
  "application/vnd.ms-excel": 25 * 1024 * 1024,
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": 25 * 1024 * 1024,
};

async function ensureInsumoFolder(opts: {
  cliente_codigo: string; projeto_codigo: string; tag: string;
}): Promise<{ id: string; url: string }> {
  const { ensurePath, getFolderUrl } = await import("@/lib/docs/drive.server");
  const id = await ensurePath([
    "Compras",
    "Solicitacoes",
    opts.cliente_codigo.slice(0, 120),
    opts.projeto_codigo.slice(0, 120),
    opts.tag.slice(0, 120),
  ]);
  return { id, url: await getFolderUrl(id) };
}

async function driveUploadMultipart(opts: {
  parentId: string; name: string; mimeType: string; bytes: ArrayBuffer;
}): Promise<{ id: string; webViewLink: string }> {
  const boundary = `lvbl_${crypto.randomUUID()}`;
  const meta = JSON.stringify({ name: opts.name, parents: [opts.parentId], mimeType: opts.mimeType });
  const enc = new TextEncoder();
  const head = enc.encode(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${meta}\r\n--${boundary}\r\nContent-Type: ${opts.mimeType}\r\n\r\n`);
  const tail = enc.encode(`\r\n--${boundary}--`);
  const body = new Uint8Array(head.byteLength + opts.bytes.byteLength + tail.byteLength);
  body.set(head, 0);
  body.set(new Uint8Array(opts.bytes), head.byteLength);
  body.set(tail, head.byteLength + opts.bytes.byteLength);
  const { baseUrl, headers } = await driveAuth();
  const r = await fetch(`${baseUrl}/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink`, {
    method: "POST",
    headers: { ...headers, "Content-Type": `multipart/related; boundary=${boundary}` },
    body,
  });
  if (!r.ok) throw new Error(`Drive upload ${r.status}: ${await r.text()}`);
  return await r.json() as { id: string; webViewLink: string };
}

async function actorNome(sb: any, userId: string): Promise<string> {
  const { data } = await sb.from("profiles").select("full_name, email").eq("id", userId).maybeSingle();
  return data?.full_name ?? data?.email ?? "Sistema";
}

async function logAtividade(sb: any, insumoId: string, actorId: string, actor: string, tipo: string, descricao: string, meta?: Record<string, unknown>) {
  await sb.from("insumo_atividades").insert({
    insumo_id: insumoId, tipo, descricao, meta: meta ?? null, actor_id: actorId, actor_nome: actor,
  } as never);
}

/* ============ Upload ============ */

const uploadInput = z.object({
  insumo_id: z.string().uuid(),
  kind: z.enum(["orcamento", "tecnico", "outro"]).default("outro"),
  fornecedor_id: z.string().uuid().nullable().optional(),
  filename: z.string().min(1).max(255),
  mime_type: z.string().min(1).max(160),
  size_bytes: z.number().int().positive(),
  data_base64: z.string().min(1),
  // Metadados de orçamento (opcionais)
  valor: z.number().nullable().optional(),
  moeda: z.string().max(8).nullable().optional(),
  condicao_pagamento: z.string().max(200).nullable().optional(),
  lead_time_dias: z.number().int().nullable().optional(),
  incoterm: z.string().max(20).nullable().optional(),
  validade_ate: z.string().nullable().optional(),
  observacoes: z.string().max(2000).nullable().optional(),
});

export const uploadInsumoAnexo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => uploadInput.parse(i))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const limit = MIME_LIMITS[data.mime_type];
    if (!limit) throw new Error(`Tipo não permitido (${data.mime_type}).`);
    if (data.size_bytes > limit) throw new Error(`Arquivo excede o limite (${(limit/1048576)|0}MB).`);

    // Contexto (cliente/projeto/insumo) para pastas
    const { data: ins, error: iErr } = await sb
      .from("projeto_insumos")
      .select("id, descricao, codigo_interno, created_at, equipamento_projetos:projeto_id(revisao, cliente_equipamentos:equipamento_id(codigo, clientes:cliente_id(codigo, razao_social)))")
      .eq("id", data.insumo_id)
      .maybeSingle();
    if (iErr || !ins) throw new Error("Insumo não encontrado.");
    const eq = (ins as any).equipamento_projetos?.cliente_equipamentos;
    const cli = eq?.clientes;
    const cliente_codigo = cli?.codigo ?? "SEM-CLIENTE";
    const projeto_codigo = eq?.codigo ?? "SEM-PROJETO";
    const { itemTag } = await import("@/lib/docs/item-tag");
    const tag = itemTag((ins as any).id, (ins as any).created_at);

    let driveFolderId: string | null = null;
    let driveFolderUrl: string | null = null;
    let driveFileId: string | null = null;
    let driveViewUrl: string | null = null;

    const { driveConfigured } = await import("@/lib/docs/drive-auth.server");
    const canDrive = driveConfigured();
    if (canDrive) {
      try {
        const folder = await ensureInsumoFolder({ cliente_codigo, projeto_codigo, tag });
        driveFolderId = folder.id;
        driveFolderUrl = folder.url;
        const bytes = Uint8Array.from(atob(data.data_base64), (c) => c.charCodeAt(0)).buffer;
        const ext = data.filename.includes(".") ? "." + data.filename.split(".").pop() : "";
        const prefix = data.kind === "orcamento" ? "orcamento" : data.kind === "tecnico" ? "tecnico" : "anexo";
        // Versão por tipo/anexo: incrementa dentro da pasta do item (mesma pasta versionada da RFQ)
        const { count: nPrev } = await sb
          .from("insumo_anexos")
          .select("id", { count: "exact", head: true })
          .eq("insumo_id", data.insumo_id)
          .eq("kind", data.kind)
          .is("deleted_at", null);
        const versao = (nPrev ?? 0) + 1;
        const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
        const safe = data.filename.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 60);
        // Padrão único de nomenclatura (alinhado ao PDF de RFQ):
        //   {prefix}_{TAG}_v{N}_{stamp}_{original}.ext
        const finalName = `${prefix}_${tag}_v${versao}_${stamp}_${safe}${ext}`;
        const up = await driveUploadMultipart({ parentId: folder.id, name: finalName, mimeType: data.mime_type, bytes });
        driveFileId = up.id;
        driveViewUrl = up.webViewLink;
      } catch (e) {
        // Se o Drive falhar, seguimos salvando metadata sem file storage (fallback).
        console.warn("[insumo_anexo] Drive falhou:", (e as Error).message);
      }
    }

    const nome = await actorNome(sb, context.userId);

    const { data: row, error: aErr } = await sb
      .from("insumo_anexos")
      .insert({
        insumo_id: data.insumo_id,
        kind: data.kind,
        fornecedor_id: data.fornecedor_id ?? null,
        drive_file_id: driveFileId,
        drive_view_url: driveViewUrl,
        drive_folder_id: driveFolderId,
        drive_folder_url: driveFolderUrl,
        file_name: data.filename,
        original_name: data.filename,
        mime_type: data.mime_type,
        size_bytes: data.size_bytes,
        valor: data.valor ?? null,
        moeda: data.moeda ?? "BRL",
        condicao_pagamento: data.condicao_pagamento ?? null,
        lead_time_dias: data.lead_time_dias ?? null,
        incoterm: data.incoterm ?? null,
        validade_ate: data.validade_ate ?? null,
        observacoes: data.observacoes ?? null,
        uploaded_by: context.userId,
        uploaded_by_nome: nome,
      } as never)
      .select("id")
      .single();
    if (aErr) throw new Error(aErr.message);

    await logAtividade(
      sb,
      data.insumo_id,
      context.userId,
      nome,
      data.kind === "orcamento" ? "orcamento_recebido" : "anexo_adicionado",
      data.kind === "orcamento"
        ? `Orçamento recebido: ${data.filename}${data.valor ? ` (${data.moeda ?? "BRL"} ${data.valor})` : ""}`
        : `Anexo: ${data.filename}`,
      { anexo_id: (row as any).id, kind: data.kind, valor: data.valor, moeda: data.moeda, fornecedor_id: data.fornecedor_id },
    );

    return { id: (row as any).id, drive_view_url: driveViewUrl, drive_folder_url: driveFolderUrl };
  });

/* ============ Listar ============ */

export const listInsumoAnexos = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ insumo_id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const { data: rows, error } = await sb
      .from("insumo_anexos")
      .select("id, kind, file_name, mime_type, size_bytes, drive_file_id, drive_view_url, drive_folder_url, valor, moeda, condicao_pagamento, lead_time_dias, incoterm, validade_ate, observacoes, fornecedor_id, uploaded_by_nome, criado_em, fornecedores:fornecedor_id(nome, nome_fantasia, codigo)")
      .eq("insumo_id", data.insumo_id)
      .is("deleted_at", null)
      .order("criado_em", { ascending: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

/* ============ Pasta do Drive do insumo (fallback quando não há anexos ainda) ============ */

export const getInsumoDriveFolderUrl = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ insumo_id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    // 1) anexos
    const { data: a } = await sb
      .from("insumo_anexos")
      .select("drive_folder_url")
      .eq("insumo_id", data.insumo_id)
      .not("drive_folder_url", "is", null)
      .limit(1)
      .maybeSingle();
    if ((a as any)?.drive_folder_url) return { url: (a as any).drive_folder_url as string };
    // 2) documentos RFQ gerados
    const { data: d } = await sb
      .from("insumo_documentos_gerados")
      .select("drive_folder_url")
      .eq("insumo_id", data.insumo_id)
      .not("drive_folder_url", "is", null)
      .limit(1)
      .maybeSingle();
    if ((d as any)?.drive_folder_url) return { url: (d as any).drive_folder_url as string };
    return { url: null as string | null };
  });

/* ============ Remover ============ */

export const removeInsumoAnexo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const { data: cur, error: gErr } = await sb
      .from("insumo_anexos")
      .select("insumo_id, file_name, kind")
      .eq("id", data.id)
      .maybeSingle();
    if (gErr || !cur) throw new Error("Anexo não encontrado.");
    const { error } = await sb
      .from("insumo_anexos")
      .update({ deleted_at: new Date().toISOString() } as never)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    const nome = await actorNome(sb, context.userId);
    await logAtividade(sb, (cur as any).insumo_id, context.userId, nome, "anexo_removido", `Removeu ${(cur as any).file_name}`, { anexo_id: data.id, kind: (cur as any).kind });
    return { ok: true };
  });

/* ============ Atividades ============ */

export const listInsumoAtividades = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ insumo_id: z.string().uuid(), limit: z.number().int().min(1).max(500).optional().default(200) }).parse(i))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const { data: rows, error } = await sb
      .from("insumo_atividades")
      .select("id, tipo, descricao, meta, actor_nome, criado_em")
      .eq("insumo_id", data.insumo_id)
      .order("criado_em", { ascending: false })
      .limit(data.limit);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

/* ============ Comentário manual ============ */

export const addInsumoComentario = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ insumo_id: z.string().uuid(), texto: z.string().min(1).max(2000) }).parse(i))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const nome = await actorNome(sb, context.userId);
    await logAtividade(sb, data.insumo_id, context.userId, nome, "comentario", data.texto);
    return { ok: true };
  });

/* ============ Auditoria (timeline global) ============ */

const REVERTABLE_FIELDS = new Set([
  "descricao", "quantidade", "unidade", "fabricante_sugerido", "part_number",
  "codigo_interno", "criticidade", "lead_time_desejado_dias", "necessidade_em",
  "observacoes", "especificacao_tecnica",
]);

export const listAtividadesSolicitacoes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({
      limit: z.number().int().min(1).max(500).optional().default(200),
      tipo: z.enum(["todos", "editado", "status_alterado", "anexo_adicionado", "anexo_removido", "orcamento_recebido", "comentario", "criado", "insumo_removido", "insumo_restaurado"]).optional().default("todos"),
      actor_q: z.string().max(120).optional().default(""),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    let query = sb
      .from("insumo_atividades")
      .select("id, insumo_id, tipo, descricao, meta, actor_id, actor_nome, criado_em, projeto_insumos:insumo_id(id, descricao, codigo_interno, projeto_id, equipamento_projetos:projeto_id(revisao, cliente_equipamentos:equipamento_id(codigo, clientes:cliente_id(codigo, razao_social))))")
      .order("criado_em", { ascending: false })
      .limit(data.limit);
    if (data.tipo && data.tipo !== "todos") query = query.eq("tipo", data.tipo);
    if (data.actor_q) query = query.ilike("actor_nome", `%${data.actor_q}%`);
    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    return (rows ?? []).map((r: any) => ({
      ...r,
      revertable:
        (r.tipo === "editado" && r.meta && typeof r.meta === "object" &&
          Object.keys(r.meta).some((k) => REVERTABLE_FIELDS.has(k))) ||
        r.tipo === "anexo_removido" ||
        r.tipo === "status_alterado" ||
        r.tipo === "insumo_removido",
    }));
  });

export const reverterAtividade = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({
      atividade_id: z.string().uuid(),
      justificativa: z.string().min(3).max(500),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const { data: at, error: gErr } = await sb
      .from("insumo_atividades")
      .select("id, insumo_id, tipo, meta, descricao")
      .eq("id", data.atividade_id)
      .maybeSingle();
    if (gErr || !at) throw new Error("Atividade não encontrada.");

    const nome = await actorNome(sb, context.userId);

    if (at.tipo === "editado" && at.meta && typeof at.meta === "object") {
      const patch: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(at.meta as Record<string, unknown>)) {
        if (!REVERTABLE_FIELDS.has(k)) continue;
        if (Array.isArray(v)) patch[k] = (v as unknown[])[0];
      }
      if (Object.keys(patch).length === 0) throw new Error("Nenhum campo revertível.");
      const { error } = await sb.from("projeto_insumos").update({ ...patch, updated_by: context.userId }).eq("id", at.insumo_id);
      if (error) throw new Error(error.message);
      await logAtividade(sb, at.insumo_id, context.userId, nome, "editado",
        `Reversão de alteração anterior. Motivo: ${data.justificativa}`,
        { reverted_from: at.id, patch });
      return { ok: true, kind: "editado" };
    }

    if (at.tipo === "anexo_removido") {
      const anexoId = (at.meta as any)?.anexo_id;
      if (!anexoId) throw new Error("Anexo não localizado no evento.");
      const { error } = await sb.from("insumo_anexos").update({ deleted_at: null } as never).eq("id", anexoId);
      if (error) throw new Error(error.message);
      await logAtividade(sb, at.insumo_id, context.userId, nome, "anexo_adicionado",
        `Anexo restaurado. Motivo: ${data.justificativa}`, { reverted_from: at.id, anexo_id: anexoId });
      return { ok: true, kind: "anexo_restaurado" };
    }

    if (at.tipo === "status_alterado" && at.meta && typeof at.meta === "object") {
      const meta = at.meta as { status?: unknown; de?: unknown; para?: unknown };
      // Trigger novo grava {de, para}; legado grava {status:[old,new]}.
      const prev =
        (typeof meta.de === "string" ? meta.de : null) ??
        (Array.isArray(meta.status) ? (meta.status as unknown[])[0] : null);
      if (!prev || typeof prev !== "string") throw new Error("Status anterior indisponível.");
      const { error } = await sb.from("projeto_insumos").update({ status: prev, updated_by: context.userId }).eq("id", at.insumo_id);
      if (error) throw new Error(error.message);
      await logAtividade(sb, at.insumo_id, context.userId, nome, "status_alterado",
        `Reversão de status. Motivo: ${data.justificativa}`, { reverted_from: at.id, de: (meta.para as string) ?? null, para: prev });
      return { ok: true, kind: "status" };
    }

    if (at.tipo === "insumo_removido") {
      const { error } = await sb
        .from("projeto_insumos")
        .update({ deleted_at: null, updated_by: context.userId })
        .eq("id", at.insumo_id);
      if (error) throw new Error(error.message);
      await logAtividade(sb, at.insumo_id, context.userId, nome, "insumo_restaurado",
        `Insumo restaurado. Motivo: ${data.justificativa}`,
        { reverted_from: at.id, justificativa: data.justificativa });
      return { ok: true, kind: "insumo_restaurado" };
    }

    throw new Error("Este tipo de atividade não pode ser revertido.");
  });
