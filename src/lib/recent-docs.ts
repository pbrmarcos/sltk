/**
 * Rastreia os últimos artigos da Central de ajuda visitados pelo usuário
 * (armazenado em localStorage) para alimentar o bloco "Artigos recomendados".
 */

export type RecentDoc = {
  category: string;
  slug: string;
  title: string;
  visitedAt: number;
};

const KEY = "solutek.help.recent-docs";
const MAX = 12;

function safeParse(raw: string | null): RecentDoc[] {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr)
      ? arr.filter(
          (x): x is RecentDoc =>
            !!x && typeof x === "object" && typeof x.category === "string" && typeof x.slug === "string",
        )
      : [];
  } catch {
    return [];
  }
}

export function getRecentDocs(): RecentDoc[] {
  if (typeof window === "undefined") return [];
  return safeParse(window.localStorage.getItem(KEY));
}

export function pushRecentDoc(entry: Omit<RecentDoc, "visitedAt">) {
  if (typeof window === "undefined") return;
  const current = getRecentDocs().filter(
    (x) => !(x.category === entry.category && x.slug === entry.slug),
  );
  const next: RecentDoc[] = [{ ...entry, visitedAt: Date.now() }, ...current].slice(0, MAX);
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* quota / privado — ignora */
  }
}

export function clearRecentDocs() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KEY);
}
