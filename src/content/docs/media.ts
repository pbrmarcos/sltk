import { assetUrl } from "@/lib/asset-url";
// Load all docs asset pointers (.asset.json) and expose a filename → URL map per category.

type AssetPointer = { url: string; original_filename: string };

const modules = import.meta.glob("/src/assets/docs/**/*.asset.json", {
  eager: true,
  import: "default",
}) as Record<string, AssetPointer>;

// Map: "comercial/01-pipeline.png" -> url
export const DOC_MEDIA: Record<string, string> = {};
for (const [path, ptr] of Object.entries(modules)) {
  // path: "/src/assets/docs/comercial/01-pipeline.png.asset.json"
  const match = path.match(/\/docs\/([^/]+)\/([^/]+)\.asset\.json$/);
  if (!match) continue;
  const [, category, filename] = match;
  DOC_MEDIA[`${category}/${filename}`] = assetUrl(ptr.url);
  // also register by bare filename as fallback
  DOC_MEDIA[filename] = assetUrl(ptr.url);
}

export function resolveDocImage(category: string, name: string): string | undefined {
  return DOC_MEDIA[`${category}/${name}`] ?? DOC_MEDIA[name];
}
