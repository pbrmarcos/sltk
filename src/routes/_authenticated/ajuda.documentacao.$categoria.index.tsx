import { createFileRoute, getRouteApi, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { DocsShell } from "@/components/ajuda/DocsShell";

export const Route = createFileRoute("/_authenticated/ajuda/documentacao/$categoria/")({
  component: CategoriaIndexPage,
});

const categoriaRoute = getRouteApi("/_authenticated/ajuda/documentacao/$categoria");

function CategoriaIndexPage() {
  const { cat, articles, faqs } = categoriaRoute.useLoaderData();
  return (
    <PageContainer>
      <PageHeader
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Central de ajuda", href: "/ajuda" },
          { label: "Documentação", href: "/ajuda/documentacao" },
          { label: cat.label },
        ]}
        title={cat.label}
        subtitle={cat.description}
      />
      <DocsShell>
        {articles.length === 0 ? (
          <p className="rounded-md border border-dashed border-[var(--bg-border)] p-6 text-center text-sm text-[var(--text-muted)]">
            Ainda não há artigos nesta categoria. Em breve.
          </p>
        ) : (
          <ul className="divide-y divide-[var(--bg-border)] rounded-[var(--radius-lg)] border border-[var(--bg-border)] bg-[var(--bg-surface)]">
            {articles.map((a: (typeof articles)[number]) => (
              <li key={a.slug}>
                <Link
                  to="/ajuda/documentacao/$categoria/$slug"
                  params={{ categoria: cat.id, slug: a.slug }}
                  className="group flex items-start gap-3 p-4 hover:bg-[var(--bg-elevated)]"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-[var(--text-primary)]">
                        {a.title}
                      </span>
                      <span className="rounded bg-[var(--bg-elevated)] px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
                        {a.nivel}
                      </span>
                      <span className="rounded bg-[var(--bg-elevated)] px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
                        {a.tipo}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-[var(--text-muted)]">{a.description}</p>
                  </div>
                  <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-[var(--text-muted)] transition-transform group-hover:translate-x-0.5" />
                </Link>
              </li>
            ))}
          </ul>
        )}

        {faqs.length > 0 && (
          <div className="mt-6">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                FAQ desta categoria
              </h2>
              <Link to="/ajuda/faq" className="text-xs text-[var(--info)] underline">
                Ver todas
              </Link>
            </div>
            <ul className="space-y-1 rounded-[var(--radius-lg)] border border-[var(--bg-border)] bg-[var(--bg-surface)] p-3">
              {faqs.slice(0, 5).map((f: (typeof faqs)[number]) => (
                <li key={f.id} className="text-sm text-[var(--text-primary)]">
                  <Link to="/ajuda/faq" hash={f.id} className="hover:underline">
                    {f.question}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </DocsShell>
    </PageContainer>
  );
}
