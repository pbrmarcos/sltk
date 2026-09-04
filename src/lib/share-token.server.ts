import { createHash, createHmac, randomUUID, timingSafeEqual } from "node:crypto";

/**
 * Tokens compactos assinados por HMAC-SHA256 para liberar preenchimento
 * de relatórios FAT/SAT em campo (tablet/celular) sem exigir login.
 *
 * O HMAC garante integridade; a persistência em public.relatorio_share_links
 * com o token_hash permite revogação e auditoria.
 */

export type ShareTipo = "fat" | "sat";
export type ShareScope = "checklist" | "assinatura" | "identificacao" | "medicoes";

export type ShareTokenPayload = {
  jti: string;       // identificador único do token (referenciado pela tabela)
  tipo: ShareTipo;
  rid: string;       // relatorio id (uuid)
  iat: number;
  exp: number;
  iss: string;       // user id do emissor
  scope: ShareScope[];
};

function b64urlEncode(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function b64urlDecode(s: string): Buffer {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  return Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/") + pad, "base64");
}

function getSecret(): string {
  const s = process.env.RELATORIO_SHARE_SECRET;
  if (!s) throw new Error("Compartilhamento externo de relatórios indisponível — a integração não está configurada.");
  return s;
}

export function newJti(): string {
  return randomUUID();
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function signShareToken(payload: ShareTokenPayload): string {
  const head = b64urlEncode(Buffer.from(JSON.stringify(payload), "utf8"));
  const mac = createHmac("sha256", getSecret()).update(head).digest();
  return `${head}.${b64urlEncode(mac)}`;
}

/** Decodifica e valida APENAS a assinatura — não checa expiração nem revogação. */
export function peekShareTokenPayload(token: string): ShareTokenPayload {
  const parts = token.split(".");
  if (parts.length !== 2) {
    const err: any = new Error("[invalid] Link inválido.");
    err.code = "invalid";
    throw err;
  }
  const [head, sig] = parts;
  const expected = createHmac("sha256", getSecret()).update(head).digest();
  let provided: Buffer;
  try {
    provided = b64urlDecode(sig);
  } catch {
    const err: any = new Error("[invalid] Assinatura do link inválida.");
    err.code = "invalid";
    throw err;
  }
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
    const err: any = new Error("[invalid] Assinatura do link inválida.");
    err.code = "invalid";
    throw err;
  }
  let payload: ShareTokenPayload;
  try {
    payload = JSON.parse(b64urlDecode(head).toString("utf8")) as ShareTokenPayload;
  } catch {
    const err: any = new Error("[invalid] Conteúdo do link inválido.");
    err.code = "invalid";
    throw err;
  }
  if (payload.tipo !== "fat" && payload.tipo !== "sat") {
    const err: any = new Error("[invalid] Tipo de relatório inválido no token.");
    err.code = "invalid";
    throw err;
  }
  return payload;
}

/** Valida assinatura + expiração do token (não checa revogação no DB). */
export function verifyShareTokenSignature(token: string): ShareTokenPayload {
  const payload = peekShareTokenPayload(token);
  if (typeof payload.exp !== "number" || payload.exp * 1000 < Date.now()) {
    const err: any = new Error("[expired] Link expirado. Solicite um novo.");
    err.code = "expired";
    throw err;
  }
  return payload;
}

