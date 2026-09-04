/**
 * Encode/decode logo customization options (altura e gap) inside the
 * `logo_url` string via the URL hash fragment — assim evitamos uma migration
 * de schema enquanto persistimos os ajustes no mesmo campo existente.
 *
 * Formato: "<url-ou-vazio>#opts=h:32,g:8"
 */
export type LogoOpts = { altura: number; gap: number };

export const DEFAULT_LOGO_OPTS: LogoOpts = { altura: 28, gap: 8 };

const RE = /#opts=h:(\d{1,3}),g:(\d{1,3})$/;

export function parseLogoUrl(raw: string | null | undefined): { url: string; opts: LogoOpts } {
  if (!raw) return { url: "", opts: { ...DEFAULT_LOGO_OPTS } };
  const m = raw.match(RE);
  if (!m) return { url: raw, opts: { ...DEFAULT_LOGO_OPTS } };
  const url = raw.replace(RE, "");
  const altura = clamp(parseInt(m[1], 10), 16, 64);
  const gap = clamp(parseInt(m[2], 10), 0, 32);
  return { url, opts: { altura, gap } };
}

export function buildLogoUrl(url: string, opts: LogoOpts): string {
  const u = (url ?? "").replace(RE, "");
  return `${u}#opts=h:${clamp(opts.altura, 16, 64)},g:${clamp(opts.gap, 0, 32)}`;
}

function clamp(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, Math.round(n)));
}
