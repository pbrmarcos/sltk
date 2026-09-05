import { Link } from "@tanstack/react-router";
import { AlertTriangle, ArrowRight, CheckCircle2 } from "lucide-react";

type Stage = {
  id: string;
  label: string;
  categories: string[];
  routePrefixes: string[];
  articles: number;
  articlesByTipo: Record<string, number>;
  routes: number;
  routesMapped: number;
  routesMissing: Array<string | { route: string }>;
  routeMapEntries: number;
  errors: number;
  warnings: number;
  coverage: number;
  anchorArticles: Array<{ category: string; slug: string; title: string }>;
};

export function AuditByStage({ byStage, supportStage }: { byStage: Stage[]; supportStage: Stage }) {
  return (
    <div className="space-y-6">
      <section>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
          Fluxo Solutek (ponta a ponta)
        </h3>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {byStage.map((s) => (
            <StageCard key={s.id} stage={s} />
          ))}
        </div>
      </section>
      <section>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
          Suporte transversal
        </h3>
        <StageCard stage={supportStage} wide />
      </section>
    </div>
  );
}

function StageCard({ stage: s, wide = false }: { stage: Stage; wide?: boolean }) {
  const goodCoverage = s.coverage >= 80;
  const barColor =
    s.coverage >= 90
      ? "bg-[var(--success)]"
      : s.coverage >= 60
        ? "bg-[var(--warning)]"
        : "bg-[var(--danger)]";

  return (
    <div
      className={`rounded-[var(--radius-lg)] border bg-[var(--bg-surface)] p-4 ${
        goodCoverage ? "border-[var(--bg-border)]" : "border-[var(--warning)]/50"
      }`}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <h4 className="text-sm font-semibold text-[var(--text-primary)]">{s.label}</h4>
        <span className="flex items-center gap-1 text-xs">
          {goodCoverage ? (
            <CheckCircle2 className="h-3.5 w-3.5 text-[var(--success)]" />
          ) : (
            <AlertTriangle className="h-3.5 w-3.5 text-[var(--warning)]" />
          )}
          <strong className="text-[var(--text-primary)]">{s.coverage}%</strong>
        </span>
      </div>

      <div className="mb-2 h-1.5 w-full overflow-hidden rounded-full bg-[var(--bg-elevated)]">
        <div className={`h-full ${barColor}`} style={{ width: `${s.coverage}%` }} />
      </div>

      <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
        <dt className="text-[var(--text-muted)]">Rotas mapeadas</dt>
        <dd className="text-right text-[var(--text-primary)]">
          {s.routesMapped} / {s.routes}
        </dd>
        <dt className="text-[var(--text-muted)]">Artigos</dt>
        <dd className="text-right text-[var(--text-primary)]">
          {s.articles}
          <span className="ml-1 text-[var(--text-muted)]">
            (g{s.articlesByTipo.guia ?? 0} · c{s.articlesByTipo.conceito ?? 0} · r
            {s.articlesByTipo.referencia ?? 0} · t{s.articlesByTipo.troubleshooting ?? 0})
          </span>
        </dd>
        <dt className="text-[var(--text-muted)]">Erros / Avisos</dt>
        <dd className="text-right text-[var(--text-primary)]">
          <span className={s.errors > 0 ? "text-[var(--danger)]" : ""}>{s.errors}</span>
          {" / "}
          <span className={s.warnings > 0 ? "text-[var(--warning)]" : ""}>{s.warnings}</span>
        </dd>
      </dl>

      {s.routesMissing.length > 0 && (
        <div className="mt-3 rounded border border-[var(--warning)]/40 bg-[var(--warning)]/5 p-2">
          <div className="mb-1 text-[10px] uppercase tracking-wide text-[var(--warning)]">
            Rotas sem doc ({s.routesMissing.length})
          </div>
          <ul className="space-y-0.5 text-[11px]">
            {s.routesMissing.slice(0, wide ? 20 : 5).map((r) => {
              const route = typeof r === "string" ? r : r.route;
              return (
                <li key={route}>
                  <code className="text-[var(--text-primary)]">{route}</code>
                </li>
              );
            })}
            {s.routesMissing.length > (wide ? 20 : 5) && (
              <li className="text-[var(--text-muted)]">
                … +{s.routesMissing.length - (wide ? 20 : 5)}
              </li>
            )}
          </ul>
        </div>
      )}

      {s.anchorArticles.length > 0 && (
        <div className="mt-3 space-y-1">
          <div className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
            Âncoras
          </div>
          {s.anchorArticles.map((a) => (
            <Link
              key={`${a.category}/${a.slug}`}
              to="/ajuda/documentacao/$categoria/$slug"
              params={{ categoria: a.category, slug: a.slug }}
              className="flex items-center gap-1 text-[11px] text-[var(--info)] hover:underline"
            >
              <ArrowRight className="h-3 w-3" />
              <span className="truncate">{a.title}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
