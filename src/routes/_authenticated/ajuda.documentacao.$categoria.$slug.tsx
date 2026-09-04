import { useEffect } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { DocsShell } from "@/components/ajuda/DocsShell";
import { ArticleRenderer } from "@/components/ajuda/ArticleRenderer";
import { ArticleFooter } from "@/components/ajuda/ArticleFooter";
import { RecommendedArticles } from "@/components/ajuda/RecommendedArticles";
import { getCategory } from "@/content/docs/types";
import { getArticle, getArticlesByCategory } from "@/content/docs/loader";
import { pushRecentDoc } from "@/lib/recent-docs";

export const Route = createFileRoute("/_authenticated/ajuda/documentacao/$categoria/$slug")({
  loader: ({ params }) => {
    const cat = getCategory(params.categoria);
    const article = cat ? getArticle(cat.id, params.slug) : undefined;
    if (!cat || !article) throw notFound();
    const related = getArticlesByCategory(cat.id).filter((a) => a.slug !== article.slug).slice(0, 5);
    return { cat, article, related };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: loaderData ? `${loaderData.article.title} — Ajuda` : "Artigo" },
      { name: "description", content: loaderData?.article.description ?? "" },
      { name: "robots", content: "noindex" },
    ],
  }),
  notFoundComponent: () => (
    <PageContainer>
      <PageHeader
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Central de ajuda", href: "/ajuda" },
          { label: "Documentação", href: "/ajuda/documentacao" },
        ]}
        title="Artigo não encontrado"
      />
      <p className="text-sm text-[var(--text-muted)]">
        <Link to="/ajuda/documentacao" className="text-[var(--info)] underline">
          Voltar para categorias
        </Link>
      </p>
    </PageContainer>
  ),
  component: ArtigoPage,
});

function ArtigoPage() {
  const { cat, article, related } = Route.useLoaderData();
  useEffect(() => {
    pushRecentDoc({ category: cat.id, slug: article.slug, title: article.title });
  }, [cat.id, article.slug, article.title]);
  return (
    <PageContainer>
      <PageHeader
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Central de ajuda", href: "/ajuda" },
          { label: "Documentação", href: "/ajuda/documentacao" },
          { label: cat.label, href: `/ajuda/documentacao/${cat.id}` },
          { label: article.title },
        ]}
        title={article.title}
        subtitle={article.description}
      />
      <DocsShell>
        <article className="rounded-[var(--radius-lg)] border border-[var(--bg-border)] bg-[var(--bg-surface)] p-6 shadow-[var(--shadow-sm)]">
          <div className="mb-4 flex flex-wrap gap-1.5">
            <span className="rounded bg-[var(--bg-elevated)] px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
              {article.tipo}
            </span>
            <span className="rounded bg-[var(--bg-elevated)] px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
              {article.nivel}
            </span>
            {(article.tags ?? []).map((t: string) => (
              <span
                key={t}
                className="rounded bg-[var(--bg-elevated)] px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-[var(--text-muted)]"
              >
                #{t}
              </span>
            ))}
          </div>
          <ArticleRenderer category={cat.id}>{article.body}</ArticleRenderer>
          <ArticleFooter slug={article.slug} atualizadoEm={article.atualizado_em} appVersion={article.app_version} />
        </article>

        {related.length > 0 && (
          <div className="mt-6">
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-[var(--text-muted)]">
              Artigos relacionados
            </h2>
            <ul className="space-y-1 rounded-[var(--radius-lg)] border border-[var(--bg-border)] bg-[var(--bg-surface)] p-3">
              {related.map((a: typeof related[number]) => (
                <li key={a.slug} className="text-sm">
                  <Link
                    to="/ajuda/documentacao/$categoria/$slug"
                    params={{ categoria: cat.id, slug: a.slug }}
                    className="text-[var(--text-primary)] hover:underline"
                  >
                    {a.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        <RecommendedArticles exclude={{ category: cat.id, slug: article.slug }} />
      </DocsShell>
    </PageContainer>
  );
}
