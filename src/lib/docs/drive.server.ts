/* eslint-disable @typescript-eslint/no-explicit-any */
// Server-only helpers for Google Drive uploads via Lovable Connector Gateway.
// Used by docs.functions.ts handlers — never imported from client.

const GATEWAY = "https://connector-gateway.lovable.dev/google_drive";

function authHeaders() {
  const lov = process.env.LOVABLE_API_KEY;
  const drv = process.env.GOOGLE_DRIVE_API_KEY;
  if (!lov || !drv) {
    const err = new Error(
      "Google Drive indisponível — a integração não está configurada. Os documentos continuam sendo gerados e podem ser baixados normalmente.",
    );
    err.name = "CapabilityUnavailableError";
    throw err;
  }
  return {
    Authorization: `Bearer ${lov}`,
    "X-Connection-Api-Key": drv,
  };
}


async function gw(path: string, init: RequestInit = {}): Promise<any> {
  const r = await fetch(`${GATEWAY}${path}`, {
    ...init,
    headers: { ...authHeaders(), ...(init.headers || {}) },
  });
  if (!r.ok) {
    const body = await r.text().catch(() => "");
    throw new Error(`Drive ${r.status}: ${body.slice(0, 300)}`);
  }
  return r.json();
}

function esc(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

async function findChildFolder(name: string, parentId: string): Promise<string | null> {
  const q = `name='${esc(name)}' and mimeType='application/vnd.google-apps.folder' and trashed=false and '${parentId}' in parents`;
  const url = `/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name)&pageSize=10`;
  const j = await gw(url);
  return j?.files?.[0]?.id ?? null;
}

async function createFolder(name: string, parentId: string): Promise<string> {
  const j = await gw("/drive/v3/files?fields=id,name", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentId],
    }),
  });
  return j.id as string;
}

async function ensureFolder(name: string, parentId: string): Promise<string> {
  return (await findChildFolder(name, parentId)) ?? (await createFolder(name, parentId));
}

/**
 * Garante o caminho `segments` a partir do root da conta ("My Drive" = "root")
 * e retorna o id da pasta-folha.
 */
export async function ensurePath(segments: string[]): Promise<string> {
  let parent = "root";
  for (const seg of segments) {
    if (!seg) continue;
    parent = await ensureFolder(seg, parent);
  }
  return parent;
}

/** Upload multipart simples (arquivo + metadados JSON). */
export async function uploadFile(opts: {
  name: string;
  parentId: string;
  bytes: Uint8Array;
  mimeType?: string;
}): Promise<{ id: string; webViewLink: string }> {
  const meta = {
    name: opts.name,
    parents: [opts.parentId],
    mimeType: opts.mimeType || "application/pdf",
  };
  const boundary = `----lov${Math.random().toString(16).slice(2)}`;
  const enc = new TextEncoder();
  const head = enc.encode(
    `--${boundary}\r\n` +
    `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
    `${JSON.stringify(meta)}\r\n` +
    `--${boundary}\r\n` +
    `Content-Type: ${meta.mimeType}\r\n\r\n`,
  );
  const tail = enc.encode(`\r\n--${boundary}--\r\n`);
  const body = new Uint8Array(head.byteLength + opts.bytes.byteLength + tail.byteLength);
  body.set(head, 0);
  body.set(opts.bytes, head.byteLength);
  body.set(tail, head.byteLength + opts.bytes.byteLength);

  const url = `/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink`;
  const r = await fetch(`${GATEWAY}${url}`, {
    method: "POST",
    headers: {
      ...authHeaders(),
      "Content-Type": `multipart/related; boundary=${boundary}`,
    },
    body,
  });
  if (!r.ok) {
    const t = await r.text().catch(() => "");
    throw new Error(`Drive upload ${r.status}: ${t.slice(0, 300)}`);
  }
  const j = await r.json() as { id: string; webViewLink?: string };
  return { id: j.id, webViewLink: j.webViewLink || `https://drive.google.com/file/d/${j.id}/view` };
}

export async function getFolderUrl(folderId: string): Promise<string> {
  return `https://drive.google.com/drive/folders/${folderId}`;
}
