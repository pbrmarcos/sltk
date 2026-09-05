/* eslint-disable @typescript-eslint/no-explicit-any */
// Server-only helpers for Google Drive uploads. Prefere conta de serviço
// direta e cai para o Lovable Connector Gateway via drive-auth.server.ts.
// Usado por docs.functions.ts handlers — never imported from client.
import { driveAuth } from "./drive-auth.server";

async function gw(path: string, init: RequestInit = {}): Promise<any> {
  const { baseUrl, headers } = await driveAuth();
  const r = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: { ...headers, ...(init.headers || {}) },
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

  const { baseUrl, headers } = await driveAuth();
  const url = `/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink`;
  const r = await fetch(`${baseUrl}${url}`, {
    method: "POST",
    headers: {
      ...headers,
      "Content-Type": `multipart/related; boundary=${boundary}`,
    },
    body,
  });
  if (!r.ok) {
    const t = await r.text().catch(() => "");
    throw new Error(`Drive upload ${r.status}: ${t.slice(0, 300)}`);
  }
  const j = (await r.json()) as { id: string; webViewLink?: string };
  return { id: j.id, webViewLink: j.webViewLink || `https://drive.google.com/file/d/${j.id}/view` };
}

export async function getFolderUrl(folderId: string): Promise<string> {
  return `https://drive.google.com/drive/folders/${folderId}`;
}
