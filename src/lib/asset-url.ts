/**
 * Lovable Assets ficam em /__l5e/assets-v1/... e só são servidos pelo host da
 * Lovable. Quando o site roda em domínio próprio (Coolify / sltkamericas.com),
 * o caminho relativo retorna 404 e as imagens somem. Por isso resolvemos
 * sempre para a origem absoluta do CDN.
 */
const CDN_ORIGIN = "https://solutek-hub.lovable.app";

export function assetUrl(url: string): string {
  if (!url) return url;
  if (url.startsWith("/__l5e/")) return `${CDN_ORIGIN}${url}`;
  return url;
}
