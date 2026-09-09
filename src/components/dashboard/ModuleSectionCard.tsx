import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import type { AppModule } from "@/lib/permissoes.functions";
import type { ModuleSummary } from "@/lib/dashboards-role.server";
import { MODULE_DASHBOARD_META } from "./module-meta";
import { HeatStrip } from "./HeatStrip";
import { StatusList } from "./StatusList";

const ACCENT_COLOR: Record<NonNullable<ModuleSummary["kpis"][number]["accent"]>, string> = {
  primary: "var(--primary)",
  success: "var(--success, #22c55e)",
  warning: "var(--warning, #f59e0b)",
  danger: "var(--danger, #ef4444)",
};

export function ModuleSectionCard({
  module,
  summary,
  step,
}: {
  module: AppModule;
  summary: ModuleSummary;
  step?: number;
}) {
  const meta = MODULE_DASHBOARD_META[module];
  if (!meta) return null;
  const Icon = meta.icon;

  return (
    <section className="rounded-[var(--radius-lg)] border border-[var(--bg-border)] bg-[var(--bg-surface)] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
      <header className="mb-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          {step !== undefined && (
            <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[var(--bg-elevated)] text-[10px] font-bold tabular-nums text-[var(--text-muted)]">
              {step}
            </span>
          )}
          <span
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full"
            style={{ background: `${meta.color}1A`, color: meta.color }}
          >
            <Icon className="h-4 w-4" />
          </span>
          <h3 className="text-[13px] font-semibold tracking-tight text-[var(--text-primary)]">
            {meta.label}
          </h3>
        </div>
        <Link
          to={meta.to}
          className="inline-flex shrink-0 items-center gap-0.5 text-[11px] font-medium text-[var(--primary)] hover:underline"
        >
          ver módulo <ArrowRight className="h-3 w-3" />
        </Link>
      </header>

      {summary.kpis.length > 0 && (
        <div
          className="mb-4 grid gap-3"
          style={{ gridTemplateColumns: `repeat(${summary.kpis.length}, minmax(0, 1fr))` }}
        >
          {summary.kpis.map((k) => (
            <div key={k.label}>
              <div className="truncate text-[10.5px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
                {k.label}
              </div>
              <div
                className="mt-0.5 text-lg font-semibold tabular-nums"
                style={{ color: k.accent ? ACCENT_COLOR[k.accent] : "var(--text-primary)" }}
              >
                {k.value}
              </div>
            </div>
          ))}
        </div>
      )}

      {summary.segments && summary.segments.length > 0 && <HeatStrip segments={summary.segments} />}
      {summary.list && <StatusList items={summary.list.slice(0, 4)} empty="Nada pendente." />}
    </section>
  );
}
