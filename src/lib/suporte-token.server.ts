// Geração e verificação de credenciais dos chamados públicos.
// - Código curto (exibível): TCK-XXXX-XXXX, chars sem ambiguidade.
// - Token longo (secreto): 32 bytes base64url; só armazenamos o sha256.
// Manter helpers isolados aqui para poder cobrir com testes futuros.

import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

// Sem 0/O/1/I/L para o cliente não errar ao digitar.
const CODIGO_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function pickChars(n: number): string {
  const buf = randomBytes(n * 2);
  let out = "";
  for (let i = 0; i < n; i++) {
    out += CODIGO_ALPHABET[buf[i] % CODIGO_ALPHABET.length];
  }
  return out;
}

/** "TCK-XXXX-XXXX" — colisão é tratada no chamador com retry. */
export function novoCodigoChamado(): string {
  return `TCK-${pickChars(4)}-${pickChars(4)}`;
}

/** Normaliza para maiúsculas e formato canônico ("tckabcd1234" → "TCK-ABCD-1234"). */
export function normalizarCodigo(input: string): string | null {
  if (!input) return null;
  const clean = input.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!clean.startsWith("TCK")) return null;
  const rest = clean.slice(3);
  if (rest.length !== 8) return null;
  return `TCK-${rest.slice(0, 4)}-${rest.slice(4)}`;
}

/** Token cru base64url — só volta ao cliente na abertura e por "resolver código". */
export function novoTokenChamado(): { token: string; hash: string } {
  const raw = randomBytes(32)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  return { token: raw, hash: hashToken(raw) };
}

export function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

/** Comparação constant-time do hash de um token cru contra o hash persistido. */
export function verificarToken(raw: string, storedHash: string): boolean {
  try {
    const a = Buffer.from(hashToken(raw), "hex");
    const b = Buffer.from(storedHash, "hex");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
