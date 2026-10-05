import { getRequest } from "@tanstack/react-start/server";

/**
 * IP do cliente atrás do Traefik (Coolify). O Traefik define `x-real-ip` e
 * acrescenta o IP real ao FINAL do `x-forwarded-for` — o primeiro item é
 * controlado pelo cliente e não serve para rate limit.
 */
export function clientIpFromHeaders(h: Headers | null | undefined): string | null {
  if (!h) return null;
  const real = h.get("x-real-ip")?.trim();
  if (real) return real;
  const xff = h.get("x-forwarded-for");
  if (xff) {
    const hops = xff
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (hops.length) return hops[hops.length - 1]!;
  }
  return h.get("cf-connecting-ip")?.trim() || null;
}

export function readRequestMeta(): { ip: string | null; user_agent: string | null } {
  try {
    const h = getRequest()?.headers;
    return { ip: clientIpFromHeaders(h), user_agent: h?.get("user-agent") ?? null };
  } catch {
    return { ip: null, user_agent: null };
  }
}

export function clientIp(): string | null {
  return readRequestMeta().ip;
}
