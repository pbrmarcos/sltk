import { createFileRoute, Link, useRouterState } from "@tanstack/react-router";
import { AlertTriangle, ArrowRight } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { DocsShell } from "@/components/ajuda/DocsShell";
import { DocSearch } from "@/components/ajuda/DocSearch";
import { RecommendedArticles } from "@/components/ajuda/RecommendedArticles";
import { CATEGORIES } from "@/content/docs/types";
import { ARTICLES } from "@/content/docs/loader";

export const Route = createFileRoute("/_authenticated/ajuda/$")({
  head: () => ({
    meta: [
      { title: "Página não encontrada — Ajuda" },
      { name: "description", content: "Artigo ou seção não encontrado na Central de ajuda." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: HelpNotFound,
});

/** Sugere artigos com base em palavras do path que o usuário tentou abrir. */
function suggestFromPath(pathname: string) {
  const tokens = pathname
    .toLowerCase()
    .replace(/^\/ajuda\/?/, "")
    .split(/[/\-_]+/)
    .filter((t) => t.length >= 3);
  if (tokens.length === 0) return ARTICLES.slice(0, 6);
  const scored = ARTICLES.map((a) => {
    const hay = `${a.title} ${a.description ?? ""} ${a.category} ${a.slug}`.toLowerCase();
    const score = tokens.reduce((s, t) => (hay.includes(t) ? s + 1 : s), 0);
    return { a, score };
  })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
    .map((x) => x.a);
  return scored.length > 0 ? scored : ARTICLES.slice(0, 6);
}

function HelpNotFound() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const suggestions = suggestFromPath(pathname);
  return (
    <PageContainer>
      <PageHeader
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Central de ajuda", href: "/ajuda" },
          { label: "Não encontrado" },
        ]}
        title="Página da ajuda não encontrada"
        subtitle={`Nenhum artigo corresponde a ${pathname}.`}
      />
      <DocsShell>
        <div className="mb-6 flex items-start gap-3 rounded-[var(--radius-lg)] border border-[var(--warning)]/40 bg-[var(--warning)]/10 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[var(--warning)]" />
          <div className="min-w-0 text-sm text-[var(--text-primary)]">
            <p className="font-medium">Esse endereço da ajuda não existe (ou foi renomeado).</p>
            <p className="mt-1 text-[var(--text-muted)]">
              Use a busca abaixo, escolha uma categoria ou veja os artigos sugeridos pelo termo que
              você procurou.
            </p>
          </div>
        </div>

        <div className="mb-6">
          <DocSearch mode="compact" placeholder="Buscar em toda a documentação…" maxResults={10} />
        </div>

        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-[var(--text-muted)]">
          Artigos sugeridos
        </h2>
        <ul className="mb-6 divide-y divide-[var(--bg-border)] rounded-[var(--radius-lg)] border border-[var(--bg-border)] bg-[var(--bg-surface)]">
          {suggestions.map((a) => (
            <li key={`${a.category}/${a.slug}`}>
              <Link
                to="/ajuda/documentacao/$categoria/$slug"
                params={{ categoria: a.category, slug: a.slug }}
                className="group flex items-start gap-3 p-3 hover:bg-[var(--bg-elevated)]"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-[var(--text-primary)]">{a.title}</div>
                  <div className="text-xs text-[var(--text-muted)]">
                    {CATEGORIES.find((c) => c.id === a.category)?.label ?? a.category}
                  </div>
                </div>
                <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-[var(--text-muted)] transition-transform group-hover:translate-x-0.5" />
              </Link>
            </li>
          ))}
        </ul>

        <RecommendedArticles title="Baseado no que você consultou" />

        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-[var(--text-muted)]">
          Ou navegue por categoria
        </h2>
        <div className="grid gap-2 sm:grid-cols-2">
          {CATEGORIES.map((c) => (
            <Link
              key={c.id}
              to="/ajuda/documentacao/$categoria"
              params={{ categoria: c.id }}
              className="rounded-[var(--radius-lg)] border border-[var(--bg-border)] bg-[var(--bg-surface)] p-3 hover:bg-[var(--bg-elevated)]"
            >
              <div className="text-sm font-medium text-[var(--text-primary)]">{c.label}</div>
              <div className="text-xs text-[var(--text-muted)]">{c.description}</div>
            </Link>
          ))}
        </div>
      </DocsShell>
    </PageContainer>
  );
}
