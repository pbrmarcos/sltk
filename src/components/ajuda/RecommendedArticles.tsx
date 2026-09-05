import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Clock, Sparkles } from "lucide-react";
import { ARTICLES } from "@/content/docs/loader";
import { getCategory } from "@/content/docs/types";
import { getRecentDocs, type RecentDoc } from "@/lib/recent-docs";

type Props = {
  /** Artigo/categoria atual — não aparece nas recomendações. */
  exclude?: { category: string; slug?: string };
  /** Texto do cabeçalho. Padrão: "Artigos recomendados". */
  title?: string;
  max?: number;
};

/**
 * Combina o histórico recente (localStorage) com artigos correlatos
 * (mesma categoria / tags em comum) do último tópico consultado.
 */
export function RecommendedArticles({ exclude, title = "Artigos recomendados", max = 4 }: Props) {
  const [recent, setRecent] = useState<RecentDoc[]>([]);

  useEffect(() => {
    setRecent(getRecentDocs());
  }, []);

  const suggestions = useMemo(() => {
    const excluded = (a: { category: string; slug: string }) =>
      exclude &&
      a.category === exclude.category &&
      (exclude.slug ? a.slug === exclude.slug : false);

    const seen = new Set<string>();
    const items: Array<{
      article: (typeof ARTICLES)[number];
      reason: "recent" | "related";
    }> = [];

    // 1) Histórico recente do próprio usuário
    for (const r of recent) {
      if (items.length >= max) break;
      if (excluded(r)) continue;
      const art = ARTICLES.find((a) => a.category === r.category && a.slug === r.slug);
      if (!art) continue;
      const key = `${art.category}/${art.slug}`;
      if (seen.has(key)) continue;
      seen.add(key);
      items.push({ article: art, reason: "recent" });
    }

    // 2) Correlatos com o último tópico (mesma categoria / tags)
    const lastTopic = recent[0];
    if (lastTopic) {
      const anchor = ARTICLES.find(
        (a) => a.category === lastTopic.category && a.slug === lastTopic.slug,
      );
      const anchorTags = new Set(anchor?.tags ?? []);
      const scored = ARTICLES.map((a) => {
        if (excluded(a)) return null;
        const key = `${a.category}/${a.slug}`;
        if (seen.has(key)) return null;
        let score = 0;
        if (anchor && a.category === anchor.category) score += 2;
        for (const t of a.tags ?? []) if (anchorTags.has(t)) score += 1;
        return score > 0 ? { article: a, score } : null;
      })
        .filter((x): x is { article: (typeof ARTICLES)[number]; score: number } => !!x)
        .sort((a, b) => b.score - a.score);

      for (const s of scored) {
        if (items.length >= max) break;
        const key = `${s.article.category}/${s.article.slug}`;
        seen.add(key);
        items.push({ article: s.article, reason: "related" });
      }
    }

    return items;
  }, [recent, exclude, max]);

  if (suggestions.length === 0) return null;

  return (
    <section className="mt-6 rounded-[var(--radius-lg)] border border-[var(--bg-border)] bg-[var(--bg-surface)] p-4 shadow-[var(--shadow-sm)]">
      <header className="mb-3 flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-[var(--info)]" />
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--text-muted)]">
          {title}
        </h2>
        <span className="ml-auto text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
          Baseado no seu histórico
        </span>
      </header>
      <ul className="grid gap-2 sm:grid-cols-2">
        {suggestions.map(({ article, reason }) => {
          const cat = getCategory(article.category);
          return (
            <li key={`${article.category}/${article.slug}`}>
              <Link
                to="/ajuda/documentacao/$categoria/$slug"
                params={{ categoria: article.category, slug: article.slug }}
                className="group block h-full rounded-md border border-[var(--bg-border)] bg-[var(--bg-base)] p-3 hover:bg-[var(--bg-elevated)]"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-sm font-medium text-[var(--text-primary)] group-hover:text-[var(--info)]">
                    {article.title}
                  </span>
                  <span
                    className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wide ${
                      reason === "recent"
                        ? "bg-[var(--info)]/10 text-[var(--info)]"
                        : "bg-[var(--bg-elevated)] text-[var(--text-muted)]"
                    }`}
                    title={
                      reason === "recent" ? "Visitado recentemente" : "Relacionado ao último tópico"
                    }
                  >
                    {reason === "recent" ? (
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3 w-3" /> visto
                      </span>
                    ) : (
                      "relacionado"
                    )}
                  </span>
                </div>
                <p className="mt-1 line-clamp-2 text-xs text-[var(--text-muted)]">
                  {article.description}
                </p>
                <div className="mt-2 text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
                  {cat?.label ?? article.category}
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
