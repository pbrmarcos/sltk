// Verificação de saúde da chave de service role (SUPABASE_SERVICE_ROLE_KEY).
//
// Objetivos:
//  1. Confirmar, no startup do servidor, se a chave existe e é válida de fato
//     (não apenas presente na env) — fazendo uma consulta leve ao PostgREST.
//  2. Permitir que ações críticas sejam bloqueadas com uma mensagem clara
//     em vez de estourarem um erro técnico no meio do fluxo do usuário.
//
// O resultado é memoizado com TTL para não custar uma requisição por chamada.

export type ServiceRoleStatus =
  | { ok: true; checkedAt: number }
  | {
      ok: false;
      reason: "missing" | "malformed" | "invalid" | "unreachable";
      message: string;
      checkedAt: number;
    };

const OK_TTL_MS = 10 * 60 * 1000; // 10 min
const FAIL_TTL_MS = 30 * 1000; // 30 s — permite recuperação rápida após rebind

let cached: ServiceRoleStatus | undefined;
let inflight: Promise<ServiceRoleStatus> | undefined;

function readEnv() {
  const url =
    process.env.SUPABASE_URL ||
    process.env.DEST_SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    "";
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.DEST_SUPABASE_SERVICE_ROLE_KEY || "";
  return { url, key };
}

function looksLikeServiceRoleKey(key: string): boolean {
  if (key.startsWith("sb_secret_")) return true;
  // JWT clássico: 3 partes separadas por ponto
  return key.split(".").length === 3 && key.length > 60;
}

function isFresh(status: ServiceRoleStatus): boolean {
  const ttl = status.ok ? OK_TTL_MS : FAIL_TTL_MS;
  return Date.now() - status.checkedAt < ttl;
}

async function probe(): Promise<ServiceRoleStatus> {
  const checkedAt = Date.now();
  const { url, key } = readEnv();

  if (!url || !key) {
    return {
      ok: false,
      reason: "missing",
      message: "Ações administrativas estão temporariamente indisponíveis neste ambiente.",
      checkedAt,
    };
  }

  if (!looksLikeServiceRoleKey(key)) {
    return {
      ok: false,
      reason: "malformed",
      message: "A credencial administrativa deste ambiente precisa ser atualizada.",
      checkedAt,
    };
  }

  try {
    const headers: Record<string, string> = { apikey: key };
    if (!key.startsWith("sb_")) headers["Authorization"] = `Bearer ${key}`;

    // O endpoint Auth Admin só responde com uma credencial realmente
    // privilegiada. Um probe do PostgREST pode aceitar uma chave pública e
    // produzir um falso positivo, portanto não é suficiente aqui.
    const res = await fetch(`${url.replace(/\/$/, "")}/auth/v1/admin/users?page=1&per_page=1`, {
      method: "GET",
      headers,
      signal: AbortSignal.timeout(5000),
    });

    if (res.status === 401 || res.status === 403) {
      return {
        ok: false,
        reason: "invalid",
        message: "A credencial administrativa deste ambiente foi rejeitada.",
        checkedAt,
      };
    }

    if (!res.ok && res.status >= 500) {
      return {
        ok: false,
        reason: "unreachable",
        message: "Não foi possível validar o acesso administrativo agora.",
        checkedAt,
      };
    }

    if (!res.ok) {
      return {
        ok: false,
        reason: "invalid",
        message: "A credencial administrativa deste ambiente não possui o acesso esperado.",
        checkedAt,
      };
    }

    return { ok: true, checkedAt };
  } catch (error) {
    return {
      ok: false,
      reason: "unreachable",
      message: "Não foi possível validar o acesso administrativo agora.",
      checkedAt,
    };
  }
}

/** Status da service role, com cache por TTL. Nunca lança. */
export async function getServiceRoleStatus(force = false): Promise<ServiceRoleStatus> {
  if (!force && cached && isFresh(cached)) return cached;
  if (!force && inflight) return inflight;

  inflight = probe().then((status) => {
    cached = status;
    inflight = undefined;
    return status;
  });
  return inflight;
}

/** Limpa o cache do status (usado em testes e após rebind de secrets). */
export function resetServiceRoleCache(): void {
  cached = undefined;
  inflight = undefined;
}

let startupLogged = false;

/**
 * Executa a verificação uma única vez por processo e registra o resultado no log
 * do servidor. Seguro para chamar em todo request (idempotente e não bloqueante).
 */
export function runServiceRoleStartupCheck(): void {
  if (startupLogged) return;
  startupLogged = true;

  void getServiceRoleStatus(true).then((status) => {
    if (status.ok) {
      console.info("[startup] acesso administrativo validado — ações críticas liberadas.");
    } else {
      console.error(`[startup] service role indisponível (${status.reason}): ${status.message}`);
    }
  });
}

export class ServiceRoleUnavailableError extends Error {
  readonly reason: string;
  constructor(status: Extract<ServiceRoleStatus, { ok: false }>) {
    super(status.message);
    this.name = "ServiceRoleUnavailableError";
    this.reason = status.reason;
  }
}

/**
 * Usa em AÇÕES CRÍTICAS que não podem rodar sem service role
 * (Auth Admin, criação/exclusão de usuários, tokens públicos, sync externo).
 * Bloqueia com mensagem clara em vez de estourar erro técnico.
 */
export async function requireServiceRoleClient() {
  const status = await getServiceRoleStatus();
  if (!status.ok) throw new ServiceRoleUnavailableError(status);
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}
