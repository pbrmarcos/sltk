import { useState } from "react";
import { ChevronDown, ChevronRight, AlertCircle, AlertTriangle, Info } from "lucide-react";
import { CATEGORIES, getCategory } from "@/content/docs/types";

type Severity = "error" | "warn" | "info";
type Finding = {
  sectionId: string;
  sectionTitle: string;
  severity: Severity;
  item: Record<string, unknown>;
};
type ModuleAgg = {
  category: string;
  articles: number;
  routes: number;
  errors: number;
  warnings: number;
  info: number;
  findings: Finding[];
};

function labelFor(cat: string) {
  return getCategory(cat as never)?.label ?? cat;
}

function itemPrimary(item: Record<string, unknown>): string {
  if (typeof item.route === "string") return item.route;
  if (typeof item.article === "string") return item.article;
  if (typeof item.from === "string" && typeof item.target === "string")
    return `${item.from} → ${item.target}`;
  if (typeof item.from === "string" && typeof item.ref === "string")
    return `${item.from} → ${item.ref}`;
  if (typeof item.category === "string") return item.category;
  return JSON.stringify(item);
}

const KNOWN = new Set(CATEGORIES.map((c) => c.id as string));

export function AuditByModule({ byModule }: { byModule: Record<string, ModuleAgg> }) {
  const entries = Object.values(byModule).sort((a, b) => {
    const sev = (m: ModuleAgg) => m.errors * 100 + m.warnings * 10 + m.info;
    return sev(b) - sev(a) || a.category.localeCompare(b.category);
  });

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {entries.map((m) => (
        <ModuleCard key={m.category} module={m} />
      ))}
    </div>
  );
}

function ModuleCard({ module: m }: { module: ModuleAgg }) {
  const [open, setOpen] = useState(false);
  const total = m.errors + m.warnings + m.info;
  const known = KNOWN.has(m.category);
  const dangerAccent =
    m.errors > 0
      ? "border-[var(--danger)]/60"
      : m.warnings > 0
        ? "border-[var(--warning)]/50"
        : "border-[var(--bg-border)]";

  return (
    <section className={`rounded-[var(--radius-lg)] border ${dangerAccent} bg-[var(--bg-surface)]`}>
      <header className="flex items-center justify-between gap-3 border-b border-[var(--bg-border)] px-4 py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-sm font-semibold text-[var(--text-primary)]">
              {labelFor(m.category)}
            </h3>
            {!known && (
              <span className="rounded bg-[var(--bg-elevated)] px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
                sem categoria
              </span>
            )}
          </div>
          <div className="mt-0.5 text-[11px] text-[var(--text-muted)]">
            {m.articles} artigo(s) · {m.routes} rota(s) no route-map
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <Pill severity="error" count={m.errors} />
          <Pill severity="warn" count={m.warnings} />
          <Pill severity="info" count={m.info} />
        </div>
      </header>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-4 py-2 text-left text-xs text-[var(--text-muted)] hover:bg-[var(--bg-elevated)]"
      >
        {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        {total === 0 ? "Nenhum achado" : `Ver ${total} achado(s)`}
      </button>
      {open && total > 0 && (
        <ul className="divide-y divide-[var(--bg-border)] border-t border-[var(--bg-border)]">
          {m.findings.map((f, i) => (
            <li key={i} className="flex items-start gap-2 px-4 py-2 text-xs">
              <SeverityIcon severity={f.severity} />
              <div className="min-w-0 flex-1">
                <code className="block truncate text-[var(--text-primary)]">
                  {itemPrimary(f.item)}
                </code>
                <span className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
                  {f.sectionTitle}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Pill({ severity, count }: { severity: Severity; count: number }) {
  const styles: Record<Severity, string> = {
    error: "bg-[var(--danger)]/10 text-[var(--danger)]",
    warn: "bg-[var(--warning)]/10 text-[var(--warning)]",
    info: "bg-[var(--info)]/10 text-[var(--info)]",
  };
  return (
    <span
      className={`min-w-[28px] rounded px-1.5 py-0.5 text-center text-[10px] font-semibold ${styles[severity]} ${
        count === 0 ? "opacity-40" : ""
      }`}
    >
      {count}
    </span>
  );
}

function SeverityIcon({ severity }: { severity: Severity }) {
  if (severity === "error")
    return <AlertCircle className="h-3.5 w-3.5 shrink-0 text-[var(--danger)]" />;
  if (severity === "warn")
    return <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-[var(--warning)]" />;
  return <Info className="h-3.5 w-3.5 shrink-0 text-[var(--info)]" />;
}
