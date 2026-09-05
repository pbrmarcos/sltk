import { createFileRoute, Link } from "@tanstack/react-router";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { DocsShell } from "@/components/ajuda/DocsShell";
import { ARTICLES } from "@/content/docs/loader";
import { getCategory } from "@/content/docs/types";
import { APP_VERSION } from "@/lib/app-version";

export const Route = createFileRoute("/_authenticated/ajuda/atualizacoes")({
  head: () => ({
    meta: [
      { title: "Atualizações da documentação — Solutek Hub" },
      { name: "description", content: "Histórico de revisões por versão do app." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AtualizacoesPage,
});

function formatDate(iso: string) {
  const d = new Date(iso);
  return isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

function AtualizacoesPage() {
  // agrupa por versão (app_version quando presente; fallback "sem versão")
  const groups = new Map<string, typeof ARTICLES>();
  for (const a of [...ARTICLES].sort((x, y) => y.atualizado_em.localeCompare(x.atualizado_em))) {
    const key = a.app_version ?? "—";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(a);
  }
  const versions = [...groups.keys()].sort((a, b) =>
    a === "—" ? 1 : b === "—" ? -1 : b.localeCompare(a, undefined, { numeric: true }),
  );

  return (
    <PageContainer>
      <PageHeader
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Central de ajuda", href: "/ajuda" },
          { label: "Atualizações" },
        ]}
        title="Atualizações da documentação"
        subtitle={`Revisões por versão do app. Versão atual: v${APP_VERSION}.`}
      />
      <DocsShell>
        <div className="space-y-6">
          {versions.map((v) => {
            const items = groups.get(v)!;
            const isCurrent = v === APP_VERSION;
            return (
              <section
                key={v}
                className="rounded-[var(--radius-lg)] border border-[var(--bg-border)] bg-[var(--bg-surface)] p-4 shadow-[var(--shadow-sm)]"
              >
                <header className="mb-3 flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                    {v === "—" ? "Sem versão registrada" : `Versão v${v}`}
                    {isCurrent && (
                      <span className="ml-2 rounded bg-[var(--info-bg,var(--bg-elevated))] px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-[var(--info)]">
                        atual
                      </span>
                    )}
                  </h2>
                  <span className="text-xs text-[var(--text-muted)]">{items.length} artigo(s)</span>
                </header>
                <ul className="divide-y divide-[var(--bg-border)]">
                  {items.map((a) => {
                    const cat = getCategory(a.category);
                    return (
                      <li
                        key={`${a.category}-${a.slug}`}
                        className="flex items-center justify-between gap-3 py-2 text-sm"
                      >
                        <div className="min-w-0">
                          <Link
                            to="/ajuda/documentacao/$categoria/$slug"
                            params={{ categoria: a.category, slug: a.slug }}
                            className="font-medium text-[var(--text-primary)] hover:underline"
                          >
                            {a.title}
                          </Link>
                          <p className="truncate text-xs text-[var(--text-muted)]">
                            {a.description}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2 text-xs text-[var(--text-muted)]">
                          <span className="rounded bg-[var(--bg-elevated)] px-1.5 py-0.5 uppercase tracking-wide">
                            {cat?.label ?? a.category}
                          </span>
                          <span>{formatDate(a.atualizado_em)}</span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
      </DocsShell>
    </PageContainer>
  );
}
