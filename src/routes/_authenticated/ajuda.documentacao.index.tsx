import { createFileRoute, Link } from "@tanstack/react-router";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { DocsShell } from "@/components/ajuda/DocsShell";
import { DocSearch } from "@/components/ajuda/DocSearch";
import { CATEGORIES } from "@/content/docs/types";
import { ARTICLES } from "@/content/docs/loader";

export const Route = createFileRoute("/_authenticated/ajuda/documentacao/")({
  head: () => ({
    meta: [
      { title: "Documentação — Solutek Hub" },
      { name: "description", content: "Guias e referências por categoria." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DocumentacaoPage,
});

function DocumentacaoPage() {
  return (
    <PageContainer>
      <PageHeader
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Central de ajuda", href: "/ajuda" },
          { label: "Documentação" },
        ]}
        title="Documentação"
        subtitle="Manuais e guias por área do sistema."
      />
      <DocsShell>
        <div className="mb-6">
          <DocSearch mode="filters" maxResults={12} />
        </div>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-[var(--text-muted)]">
          Módulos documentados
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {CATEGORIES.map((c) => {
            const count = ARTICLES.filter((a) => a.category === c.id).length;
            return (
              <Link
                key={c.id}
                to="/ajuda/documentacao/$categoria"
                params={{ categoria: c.id }}
                className="rounded-[var(--radius-lg)] border border-[var(--bg-border)] bg-[var(--bg-surface)] p-4 shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow)]"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-semibold text-[var(--text-primary)]">
                    {c.label}
                  </span>
                  <span className="shrink-0 rounded bg-[var(--bg-elevated)] px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
                    {count} {count === 1 ? "artigo" : "artigos"}
                  </span>
                </div>
                <p className="mt-1 text-sm text-[var(--text-muted)]">{c.description}</p>
              </Link>
            );
          })}
        </div>

        <h2 className="mb-2 mt-8 text-sm font-semibold uppercase tracking-wide text-[var(--text-muted)]">
          Índice completo
        </h2>
        <p className="mb-4 text-xs text-[var(--text-muted)]">
          Navegue por seção do menu — cada bloco corresponde a um módulo do sistema.
        </p>
        <div className="space-y-4">
          {CATEGORIES.map((c) => {
            const arts = ARTICLES.filter((a) => a.category === c.id).sort((a, b) =>
              a.title.localeCompare(b.title, "pt-BR"),
            );
            if (arts.length === 0) return null;
            return (
              <section
                key={c.id}
                className="rounded-[var(--radius-lg)] border border-[var(--bg-border)] bg-[var(--bg-surface)] p-4"
              >
                <header className="mb-2 flex items-baseline justify-between gap-3">
                  <Link
                    to="/ajuda/documentacao/$categoria"
                    params={{ categoria: c.id }}
                    className="text-sm font-semibold text-[var(--text-primary)] hover:underline"
                  >
                    {c.label}
                  </Link>
                  <span className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
                    {arts.length} {arts.length === 1 ? "artigo" : "artigos"}
                  </span>
                </header>
                <ul className="grid gap-x-4 gap-y-1 sm:grid-cols-2">
                  {arts.map((a) => (
                    <li key={a.slug} className="text-sm">
                      <Link
                        to="/ajuda/documentacao/$categoria/$slug"
                        params={{ categoria: c.id, slug: a.slug }}
                        className="text-[var(--text-primary)] hover:text-[var(--info)] hover:underline"
                      >
                        {a.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      </DocsShell>
    </PageContainer>
  );
}
