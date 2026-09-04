import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Anexos de ETPs no Google Drive.
 * Estrutura de pastas: {ROOT}/{cliente.codigo} - {cliente.razao_social}/{AAAAMM}/etps/{ETP-codigo-v{n}}/
 */

const MIME_LIMITS: Record<string, number> = {
  "application/pdf": 25 * 1024 * 1024,
  "image/jpeg": 25 * 1024 * 1024,
  "image/jpg": 25 * 1024 * 1024,
  "image/png": 25 * 1024 * 1024,
  "application/zip": 50 * 1024 * 1024,
  "application/x-zip-compressed": 50 * 1024 * 1024,
  "application/msword": 25 * 1024 * 1024,
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": 25 * 1024 * 1024,
  "application/vnd.ms-excel": 25 * 1024 * 1024,
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": 25 * 1024 * 1024,
  "application/vnd.ms-powerpoint": 25 * 1024 * 1024,
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": 25 * 1024 * 1024,
  "text/plain": 5 * 1024 * 1024,
  "text/csv": 10 * 1024 * 1024,
};

const GW = "https://connector-gateway.lovable.dev/google_drive";

function driveHeaders() {
  return {
    Authorization: `Bearer ${process.env.LOVABLE_API_KEY ?? ""}`,
    "X-Connection-Api-Key": process.env.GOOGLE_DRIVE_API_KEY ?? "",
  };
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
      headers: {
        ...driveHeaders(),
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body,
    },
  );
  if (!r.ok) throw new Error(`Drive upload ${r.status}: ${await r.text()}`);
  return (await r.json()) as { id: string; webViewLink: string };
}

async function driveTrash(fileId: string): Promise<void> {
  const r = await fetch(`${GW}/drive/v3/files/${fileId}`, {
    method: "PATCH",
    headers: { ...driveHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ trashed: true }),
  });
  if (!r.ok && r.status !== 404) {
    throw new Error(`Drive trash ${r.status}: ${await r.text()}`);
  }
}

/* ===================== Server functions ===================== */

const uploadInput = z.object({
  etp_id: z.string().uuid(),
  filename: z.string().min(1).max(255),
  mime_type: z.string().min(1).max(160),
  size_bytes: z.number().int().positive(),
  data_base64: z.string().min(1),
  chosen_name: z
    .string()
    .min(3, "Nome muito curto")
    .max(120, "Nome muito longo")
    .regex(/^[a-zA-Z0-9._\- ]+$/, "Use apenas letras, números, espaços, ponto, hífen e underline."),
  descricao: z
    .string()
    .min(5, "Descrição muito curta")
    .max(500, "Descrição muito longa"),
});

export const uploadEtpAnexo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => uploadInput.parse(input))
  .handler(async ({ data, context }) => {
    // Permissão: somente admin/manager/engineer
    const [{ data: isAdmin }, { data: isManager }, { data: isEngineer }] = await Promise.all([
      context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" }),
      context.supabase.rpc("has_role", { _user_id: context.userId, _role: "manager" }),
      context.supabase.rpc("has_role", { _user_id: context.userId, _role: "engineer" }),
    ]);
    if (!isAdmin && !isManager && !isEngineer) {
      throw new Error("Sem permissão para anexar arquivos a este ETP.");
    }

    const limit = MIME_LIMITS[data.mime_type];
    if (!limit) throw new Error(`Tipo de arquivo não permitido (${data.mime_type}).`);
    if (data.size_bytes > limit) {
      const mb = (limit / 1024 / 1024).toFixed(0);
      throw new Error(`Arquivo excede o limite (${mb}MB).`);
    }

    // ETP + cliente + equipamento
    const { data: etp, error: etpErr } = await context.supabase
      .from("equipamento_etps")
      .select(
        "id, versao, cliente_id, equipamento_id, clientes!inner(codigo, razao_social), cliente_equipamentos!inner(codigo, modelo)",
      )
      .eq("id", data.etp_id)
      .maybeSingle();
    if (etpErr) throw new Error(etpErr.message);
    if (!etp) throw new Error("ETP não encontrado ou sem acesso.");

    const cli = (etp as unknown as { clientes: { codigo: string; razao_social: string } }).clientes;
    const eqp = (etp as unknown as { cliente_equipamentos: { codigo: string; modelo: string } })
      .cliente_equipamentos;
    const versao = (etp as unknown as { versao: number }).versao;

    const now = new Date();
    const yyyymm = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;

    const root = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID || "root";
    const clienteFolder = await ensureFolder(
      `${cli.codigo} - ${cli.razao_social}`.slice(0, 120),
      root,
    );
    const monthFolder = await ensureFolder(yyyymm, clienteFolder);
    const etpsFolder = await ensureFolder("etps", monthFolder);
    const etpLabel = `${eqp.codigo} - ${eqp.modelo} - v${versao}`.slice(0, 120);
    const etpFolder = await ensureFolder(etpLabel, etpsFolder);

    const ext = data.filename.includes(".") ? "." + data.filename.split(".").pop() : "";
    const safe = data.chosen_name.trim().replace(/\s+/g, "_").replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 100);
    const finalName = safe.toLowerCase().endsWith(ext.toLowerCase()) ? safe : `${safe}${ext}`;

    const bytes = Uint8Array.from(atob(data.data_base64), (c) => c.charCodeAt(0)).buffer;
    const up = await driveUploadMultipart({
      parentId: etpFolder,
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

    const { data: row, error: insErr } = await context.supabase
      .from("equipamento_etp_anexos" as never)
      .insert({
        etp_id: data.etp_id,
        drive_file_id: up.id,
        drive_view_url: up.webViewLink,
        drive_folder_id: etpFolder,
        nome_final: finalName,
        nome_original: data.filename,
        descricao: data.descricao,
        mime_type: data.mime_type,
        tamanho_bytes: data.size_bytes,
        user_id: context.userId,
        user_nome: userNome,
      } as never)
      .select("id, nome_final, drive_view_url")
      .single();
    if (insErr) throw new Error(insErr.message);

    return row as { id: string; nome_final: string; drive_view_url: string };
  });

export const listEtpAnexos = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ etp_id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("equipamento_etp_anexos" as never)
      .select(
        "id, nome_final, nome_original, descricao, drive_view_url, drive_file_id, mime_type, tamanho_bytes, user_nome, created_at",
      )
      .eq("etp_id", data.etp_id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (rows ?? []) as Array<{
      id: string;
      nome_final: string;
      nome_original: string;
      descricao: string;
      drive_view_url: string | null;
      drive_file_id: string | null;
      mime_type: string;
      tamanho_bytes: number;
      user_nome: string | null;
      created_at: string;
    }>;
  });

export const removerEtpAnexo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const [{ data: isAdmin }, { data: isManager }, { data: isEngineer }] = await Promise.all([
      context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" }),
      context.supabase.rpc("has_role", { _user_id: context.userId, _role: "manager" }),
      context.supabase.rpc("has_role", { _user_id: context.userId, _role: "engineer" }),
    ]);
    if (!isAdmin && !isManager && !isEngineer) {
      throw new Error("Sem permissão para remover anexos.");
    }

    const { data: row, error: getErr } = await context.supabase
      .from("equipamento_etp_anexos" as never)
      .select("id, drive_file_id")
      .eq("id", data.id)
      .maybeSingle();
    if (getErr) throw new Error(getErr.message);
    if (!row) throw new Error("Anexo não encontrado.");

    const driveId = (row as unknown as { drive_file_id: string }).drive_file_id;
    if (driveId) {
      try {
        await driveTrash(driveId);
      } catch {
        // segue para soft-delete mesmo se falhar no Drive
      }
    }

    const { error } = await context.supabase
      .from("equipamento_etp_anexos" as never)
      .update({ deleted_at: new Date().toISOString(), deleted_by: context.userId } as never)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ============= REINDEXAR ANEXOS ============= */
/** Move arquivos no Drive para a pasta correta {cliente}/{AAAAMM}/etps/{eqp - v{n}}. */
async function driveGetParents(fileId: string): Promise<string[]> {
  const r = await fetch(`${GW}/drive/v3/files/${fileId}?fields=parents`, {
    headers: driveHeaders(),
  });
  if (!r.ok) throw new Error(`Drive get ${r.status}: ${await r.text()}`);
  const j = (await r.json()) as { parents?: string[] };
  return j.parents ?? [];
}

async function driveMove(fileId: string, addParent: string, removeParents: string[]) {
  const url = `${GW}/drive/v3/files/${fileId}?addParents=${encodeURIComponent(addParent)}${
    removeParents.length ? `&removeParents=${encodeURIComponent(removeParents.join(","))}` : ""
  }&fields=id,parents`;
  const r = await fetch(url, {
    method: "PATCH",
    headers: { ...driveHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  if (!r.ok) throw new Error(`Drive move ${r.status}: ${await r.text()}`);
}

export const reindexEtpAnexos = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ etp_id: z.string().uuid().optional() }).parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    const { data: isManager } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "manager",
    });
    if (!isAdmin && !isManager) {
      throw new Error("Somente administradores ou gestores podem reindexar anexos.");
    }

    let q = context.supabase
      .from("equipamento_etp_anexos" as never)
      .select(
        "id, etp_id, drive_file_id, drive_folder_id, created_at, equipamento_etps!inner(id, versao, clientes!inner(codigo, razao_social), cliente_equipamentos!inner(codigo, modelo))",
      )
      .is("deleted_at", null);
    if (data.etp_id) q = q.eq("etp_id", data.etp_id);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);

    const root = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID || "root";
    const folderCache = new Map<string, string>();
    const ensureCached = async (name: string, parent: string) => {
      const key = `${parent}::${name}`;
      const hit = folderCache.get(key);
      if (hit) return hit;
      const id = await ensureFolder(name, parent);
      folderCache.set(key, id);
      return id;
    };

    let moved = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const r of (rows ?? []) as Array<{
      id: string;
      drive_file_id: string | null;
      drive_folder_id: string | null;
      created_at: string;
      equipamento_etps: {
        versao: number;
        clientes: { codigo: string; razao_social: string };
        cliente_equipamentos: { codigo: string; modelo: string };
      };
    }>) {
      if (!r.drive_file_id) {
        skipped++;
        continue;
      }
      try {
        const dt = new Date(r.created_at);
        const yyyymm = `${dt.getFullYear()}${String(dt.getMonth() + 1).padStart(2, "0")}`;
        const cli = r.equipamento_etps.clientes;
        const eqp = r.equipamento_etps.cliente_equipamentos;
        const versao = r.equipamento_etps.versao;

        const clienteFolder = await ensureCached(
          `${cli.codigo} - ${cli.razao_social}`.slice(0, 120),
          root,
        );
        const monthFolder = await ensureCached(yyyymm, clienteFolder);
        const etpsFolder = await ensureCached("etps", monthFolder);
        const etpLabel = `${eqp.codigo} - ${eqp.modelo} - v${versao}`.slice(0, 120);
        const targetFolder = await ensureCached(etpLabel, etpsFolder);

        const parents = await driveGetParents(r.drive_file_id);
        if (parents.length === 1 && parents[0] === targetFolder) {
          skipped++;
        } else {
          await driveMove(
            r.drive_file_id,
            targetFolder,
            parents.filter((p) => p !== targetFolder),
          );
          moved++;
        }

        if (r.drive_folder_id !== targetFolder) {
          await (context.supabase as unknown as {
            from: (t: string) => {
              update: (v: Record<string, unknown>) => {
                eq: (c: string, v: string) => Promise<unknown>;
              };
            };
          })
            .from("equipamento_etp_anexos")
            .update({ drive_folder_id: targetFolder })
            .eq("id", r.id);
        }
      } catch (e) {
        errors.push(`${r.id}: ${(e as Error).message}`);
      }
    }

    return { ok: true, moved, skipped, errors };
  });

