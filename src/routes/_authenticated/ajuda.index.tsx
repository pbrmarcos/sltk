import { createFileRoute, Link } from "@tanstack/react-router";
import { BookOpen, HelpCircle, ArrowRight } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { DocSearch } from "@/components/ajuda/DocSearch";
import { CATEGORIES } from "@/content/docs/types";
import { ARTICLES, FAQS } from "@/content/docs/loader";

export const Route = createFileRoute("/_authenticated/ajuda/")({
  head: () => ({
    meta: [
      { title: "Central de ajuda — Solutek Hub" },
      { name: "description", content: "Documentação, FAQ e guias do sistema." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AjudaIndex,
});

function AjudaIndex() {
  return (
    <PageContainer>
      <PageHeader
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "Central de ajuda" }]}
        title="Central de ajuda"
        subtitle="Encontre guias, referências e respostas rápidas."
      />

      <div className="mb-6">
        <DocSearch mode="filters" maxResults={8} />
      </div>

      <div className="mb-8 grid gap-3 sm:grid-cols-2">
        <Link
          to="/ajuda/documentacao"
          className="group flex items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--bg-border)] bg-[var(--bg-surface)] p-4 shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)]"
        >
          <div className="grid h-10 w-10 place-items-center rounded-md bg-[var(--bg-elevated)] text-[var(--info)]">
            <BookOpen className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-[var(--text-primary)]">Documentação</div>
            <p className="text-xs text-[var(--text-muted)]">
              {ARTICLES.length} artigos em {CATEGORIES.length} categorias.
            </p>
          </div>
          <ArrowRight className="h-4 w-4 text-[var(--text-muted)] transition-transform group-hover:translate-x-0.5" />
        </Link>
        <Link
          to="/ajuda/faq"
          className="group flex items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--bg-border)] bg-[var(--bg-surface)] p-4 shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)]"
        >
          <div className="grid h-10 w-10 place-items-center rounded-md bg-[var(--bg-elevated)] text-[var(--info)]">
            <HelpCircle className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-[var(--text-primary)]">FAQ</div>
            <p className="text-xs text-[var(--text-muted)]">
              {FAQS.length} perguntas frequentes.
            </p>
          </div>
          <ArrowRight className="h-4 w-4 text-[var(--text-muted)] transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>

      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-[var(--text-muted)]">
        Categorias
      </h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {CATEGORIES.map((c) => {
          const count = ARTICLES.filter((a) => a.category === c.id).length;
          return (
            <Link
              key={c.id}
              to="/ajuda/documentacao/$categoria"
              params={{ categoria: c.id }}
              className="rounded-[var(--radius-lg)] border border-[var(--bg-border)] bg-[var(--bg-surface)] p-3 shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)]"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-[var(--text-primary)]">{c.label}</span>
                <span className="rounded bg-[var(--bg-elevated)] px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
                  {count}
                </span>
              </div>
              <p className="mt-1 text-xs text-[var(--text-muted)]">{c.description}</p>
            </Link>
          );
        })}
      </div>
    </PageContainer>
  );
}
