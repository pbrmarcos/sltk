/**
 * Rate limit em memória com janela deslizante. Suficiente porque produção
 * roda um único processo Node (Coolify); se escalar para várias réplicas,
 * migrar para contagem no banco.
 */

const buckets = new Map<string, number[]>();
let ultimaLimpeza = Date.now();
const LIMPEZA_MS = 5 * 60 * 1000;
const MAX_JANELA_MS = 24 * 60 * 60 * 1000;

export class RateLimitError extends Error {
  readonly retryAfterSec: number;
  constructor(message: string, retryAfterSec: number) {
    super(message);
    this.name = "RateLimitError";
    this.retryAfterSec = retryAfterSec;
  }
}

function limpar(agora: number) {
  if (agora - ultimaLimpeza < LIMPEZA_MS) return;
  ultimaLimpeza = agora;
  for (const [chave, hits] of buckets) {
    const vivos = hits.filter((t) => agora - t < MAX_JANELA_MS);
    if (vivos.length === 0) buckets.delete(chave);
    else buckets.set(chave, vivos);
  }
}

/** Registra uma tentativa; lança RateLimitError se exceder `max` em `janelaMs`. */
export function rateLimit(
  chave: string,
  max: number,
  janelaMs: number,
  mensagem = "Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente novamente.",
  agora = Date.now(),
): void {
  limpar(agora);
  const hits = (buckets.get(chave) ?? []).filter((t) => agora - t < janelaMs);
  if (hits.length >= max) {
    buckets.set(chave, hits);
    const retry = Math.max(1, Math.ceil((hits[0]! + janelaMs - agora) / 1000));
    throw new RateLimitError(mensagem, retry);
  }
  hits.push(agora);
  buckets.set(chave, hits);
}

/** Atalho: limita por IP + escopo. IP desconhecido compartilha um balde comum. */
export function rateLimitPorIp(
  escopo: string,
  ip: string | null,
  max: number,
  janelaMs: number,
  mensagem?: string,
): void {
  rateLimit(`${escopo}:${ip ?? "desconhecido"}`, max, janelaMs, mensagem);
}

/**
 * Para rotas HTTP (`/api/public/*`): devolve uma Response 429 pronta quando o
 * limite estoura, ou null para seguir. Também barra corpos acima de `maxBytes`
 * pelo Content-Length, antes de bufferizar o upload.
 */
export async function limiteRotaPublica(
  request: Request,
  escopo: string,
  max: number,
  janelaMs: number,
  extraHeaders: Record<string, string> = {},
  maxBytes?: number,
): Promise<Response | null> {
  if (maxBytes) {
    const len = Number(request.headers.get("content-length") ?? "0");
    if (len > maxBytes) {
      return Response.json(
        { ok: false, error: "Arquivo ou requisição grande demais." },
        { status: 413, headers: extraHeaders },
      );
    }
  }
  const { clientIpFromHeaders } = await import("@/lib/request-meta.server");
  try {
    rateLimitPorIp(escopo, clientIpFromHeaders(request.headers), max, janelaMs);
    return null;
  } catch (e) {
    if (e instanceof RateLimitError) {
      return Response.json(
        { ok: false, error: e.message },
        { status: 429, headers: { ...extraHeaders, "retry-after": String(e.retryAfterSec) } },
      );
    }
    throw e;
  }
}

/** Só para testes. */
export function __resetRateLimit(): void {
  buckets.clear();
  ultimaLimpeza = Date.now();
}
