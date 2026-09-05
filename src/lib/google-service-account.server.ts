/**
 * Autenticação via Google Service Account (JWT Bearer / Domain-Wide
 * Delegation), sem depender do connector gateway da Lovable. Compartilhado
 * por Calendar (`email/provider.server.ts`) e Drive (`docs/drive-auth.server.ts`).
 */

interface ServiceAccountCreds {
  email: string;
  key: string;
}

function readServiceAccountCreds(): ServiceAccountCreds | null {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const keyRaw = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  if (!email || !keyRaw) return null;
  return { email, key: keyRaw.replace(/\\n/g, "\n") };
}

export function serviceAccountConfigured(): boolean {
  return readServiceAccountCreds() != null;
}

const tokenCache = new Map<string, { token: string; expiresAt: number }>();

function b64url(buf: Buffer | string): string {
  return (typeof buf === "string" ? Buffer.from(buf) : buf)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * Troca a chave privada da conta de serviço por um access token OAuth2
 * (fluxo JWT Bearer). `subject` ativa Domain-Wide Delegation (impersona
 * esse usuário do workspace); sem ele, atua como a própria conta de serviço.
 * Retorna `null` quando as credenciais não estão configuradas — quem chama
 * decide se cai para um fallback ou lança erro.
 */
export async function getGoogleAccessToken(
  scope: string,
  subject?: string,
): Promise<string | null> {
  const creds = readServiceAccountCreds();
  if (!creds) return null;

  const cacheKey = `${scope}::${subject ?? creds.email}`;
  const cached = tokenCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now() + 30_000) return cached.token;

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claim: Record<string, unknown> = {
    iss: creds.email,
    scope,
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };
  if (subject) claim.sub = subject;

  const enc = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(claim))}`;
  const { createSign } = await import("node:crypto");
  const sig = createSign("RSA-SHA256").update(enc).sign(creds.key);
  const jwt = `${enc}.${b64url(sig)}`;

  const tokRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  if (!tokRes.ok) throw new Error(`token_exchange_failed: ${await tokRes.text()}`);
  const j = (await tokRes.json()) as { access_token?: string; expires_in?: number };
  if (!j.access_token) throw new Error("no_access_token");

  tokenCache.set(cacheKey, {
    token: j.access_token,
    expiresAt: Date.now() + (j.expires_in ?? 3600) * 1000,
  });
  return j.access_token;
}
