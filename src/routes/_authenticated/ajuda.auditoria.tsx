import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertCircle, AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { DocsShell } from "@/components/ajuda/DocsShell";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AuditByModule } from "@/components/ajuda/AuditByModule";
import { AuditByStage } from "@/components/ajuda/AuditByStage";
import auditReport from "@/content/docs/audit-report.json";

type Severity = "error" | "warn" | "info";
type Section = {
  id: string;
  title: string;
  severity: Severity;
  items: Array<Record<string, unknown>>;
};

type Report = {
  generatedAt: string;
  appVersion?: string;
  totals: { activeRoutes: number; routeMapEntries: number; articles: number; categories?: number };
  summary?: { errors: number; warnings: number; info: number };
  sections: Section[];
  byModule?: Record<string, Parameters<typeof AuditByModule>[0]["byModule"][string]>;
  byStage?: Parameters<typeof AuditByStage>[0]["byStage"];
  supportStage?: Parameters<typeof AuditByStage>[0]["supportStage"];
};

const report = auditReport as Report;
const summary =
  report.summary ??
  report.sections.reduce(
    (acc, s) => {
      const n = s.items.length;
      if (s.severity === "error") acc.errors += n;
      else if (s.severity === "warn") acc.warnings += n;
      else acc.info += n;
      return acc;
    },
    { errors: 0, warnings: 0, info: 0 },
  );

export const Route = createFileRoute("/_authenticated/ajuda/auditoria")({
  head: () => ({
    meta: [
      { title: "Auditoria da documentação — Ajuda" },
      {
        name: "description",
        content: "Rotas órfãs, cross-links quebrados e outros achados da auditoria.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuditoriaPage,
});

const SEVERITY_UI: Record<
  Severity,
  { label: string; icon: typeof AlertCircle; className: string; badge: string }
> = {
  error: {
    label: "Erro",
    icon: AlertCircle,
    className: "text-[var(--danger)]",
    badge: "bg-[var(--danger)]/10 text-[var(--danger)]",
  },
  warn: {
    label: "Atenção",
    icon: AlertTriangle,
    className: "text-[var(--warning)]",
    badge: "bg-[var(--warning)]/10 text-[var(--warning)]",
  },
  info: {
    label: "Info",
    icon: Info,
    className: "text-[var(--info)]",
    badge: "bg-[var(--info)]/10 text-[var(--info)]",
  },
};

function formatItem(item: Record<string, unknown>): { primary: string; secondary?: string } {
  if (
    typeof item.route === "string" &&
    typeof item.category === "string" &&
    typeof item.slug === "string"
  ) {
    return { primary: item.route, secondary: `${item.category}/${item.slug}` };
  }
  if (typeof item.route === "string") return { primary: item.route };
  if (typeof item.from === "string" && typeof item.target === "string") {
    return { primary: `${item.from} → ${item.target}` };
  }
  if (typeof item.from === "string" && typeof item.ref === "string") {
    return { primary: `${item.from} → ${item.ref}` };
  }
  if (typeof item.article === "string") {
    const extra: string[] = [];
    if (typeof item.title === "string") extra.push(item.title);
    if (typeof item.chars === "number") extra.push(`${item.chars} chars`);
    if (typeof item.legacy === "string") extra.push(`legacy: ${item.legacy}`);
    return { primary: item.article, secondary: extra.join(" · ") || undefined };
  }
  if (typeof item.category === "string") return { primary: item.category };
  return { primary: JSON.stringify(item) };
}

function AuditoriaPage() {
  const generated = new Date(report.generatedAt);
  const totalIssues = summary.errors + summary.warnings + summary.info;

  return (
    <PageContainer>
      <PageHeader
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Central de ajuda", href: "/ajuda" },
          { label: "Auditoria" },
        ]}
        title="Auditoria da documentação"
        subtitle={`Última execução: ${generated.toLocaleString("pt-BR")}. Gere um novo snapshot com \`bun run docs:audit --write\`.`}
      />
      <DocsShell>
        <div className="mb-4 grid gap-3 sm:grid-cols-3">
          <StatCard label="Rotas ativas" value={report.totals.activeRoutes} />
          <StatCard label="Entradas no route-map" value={report.totals.routeMapEntries} />
          <StatCard label="Artigos publicados" value={report.totals.articles} />
        </div>

        <div className="mb-6 grid gap-2 sm:grid-cols-3">
          <SummaryPill severity="error" count={summary.errors} />
          <SummaryPill severity="warn" count={summary.warnings} />
          <SummaryPill severity="info" count={summary.info} />
        </div>

        {totalIssues === 0 && (
          <div className="mb-6 flex items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--success)]/40 bg-[var(--success)]/10 p-4 text-sm text-[var(--text-primary)]">
            <CheckCircle2 className="h-5 w-5 text-[var(--success)]" />
            <span>
              Nenhum achado nesta execução. A documentação está 100% consistente com as rotas
              ativas.
            </span>
          </div>
        )}

        <Tabs defaultValue="overview" className="w-full">
          <TabsList>
            <TabsTrigger value="overview">Visão geral</TabsTrigger>
            <TabsTrigger value="modules">Por módulo</TabsTrigger>
            <TabsTrigger value="stages">Por etapa</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-4">
            <div className="space-y-4">
              {report.sections.map((section) => (
                <SectionCard key={section.id} section={section} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="modules" className="mt-4">
            {report.byModule ? <AuditByModule byModule={report.byModule} /> : <EmptyLegacy />}
          </TabsContent>

          <TabsContent value="stages" className="mt-4">
            {report.byStage && report.supportStage ? (
              <AuditByStage byStage={report.byStage} supportStage={report.supportStage} />
            ) : (
              <EmptyLegacy />
            )}
          </TabsContent>
        </Tabs>

        <p className="mt-6 text-xs text-[var(--text-muted)]">
          Fonte: <code>src/content/docs/audit-report.json</code> — regenerado pelo script{" "}
          <code>scripts/docs-audit.mjs</code>. Para acompanhar histórico, versione o arquivo no
          repositório ou baixe a versão MD em{" "}
          <Link to="/ajuda" className="text-[var(--info)] underline">
            /mnt/documents/docs-audit.md
          </Link>
          .
        </p>
      </DocsShell>
    </PageContainer>
  );
}

function EmptyLegacy() {
  return (
    <div className="rounded-[var(--radius-lg)] border border-dashed border-[var(--bg-border)] bg-[var(--bg-surface)] p-6 text-center text-sm text-[var(--text-muted)]">
      Este agregado ainda não está disponível no snapshot atual. Rode{" "}
      <code>bun run docs:audit</code> para regenerar o relatório.
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--bg-border)] bg-[var(--bg-surface)] p-3">
      <div className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-[var(--text-primary)]">{value}</div>
    </div>
  );
}

function SummaryPill({ severity, count }: { severity: Severity; count: number }) {
  const ui = SEVERITY_UI[severity];
  const Icon = ui.icon;
  return (
    <div
      className={`flex items-center gap-2 rounded-[var(--radius-lg)] border border-[var(--bg-border)] bg-[var(--bg-surface)] p-3 ${
        count === 0 ? "opacity-70" : ""
      }`}
    >
      <Icon className={`h-5 w-5 ${ui.className}`} />
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
          {ui.label}
        </div>
        <div className="text-lg font-semibold text-[var(--text-primary)]">{count}</div>
      </div>
    </div>
  );
}

function SectionCard({ section }: { section: Section }) {
  const ui = SEVERITY_UI[section.severity];
  const Icon = ui.icon;
  return (
    <section className="rounded-[var(--radius-lg)] border border-[var(--bg-border)] bg-[var(--bg-surface)]">
      <header className="flex items-center justify-between gap-3 border-b border-[var(--bg-border)] px-4 py-3">
        <div className="flex items-center gap-2">
          <Icon className={`h-4 w-4 ${ui.className}`} />
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">{section.title}</h3>
          <span className={`rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wide ${ui.badge}`}>
            {ui.label}
          </span>
        </div>
        <span className="text-xs text-[var(--text-muted)]">{section.items.length} achado(s)</span>
      </header>
      {section.items.length === 0 ? (
        <div className="px-4 py-3 text-sm text-[var(--text-muted)]">
          <CheckCircle2 className="mr-1 inline h-4 w-4 text-[var(--success)]" /> Nenhum problema
          nesta categoria.
        </div>
      ) : (
        <ul className="divide-y divide-[var(--bg-border)]">
          {section.items.map((item, i) => {
            const { primary, secondary } = formatItem(item);
            return (
              <li key={`${section.id}-${i}`} className="px-4 py-2 text-sm">
                <code className="text-[var(--text-primary)]">{primary}</code>
                {secondary && (
                  <span className="ml-2 text-xs text-[var(--text-muted)]">— {secondary}</span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
