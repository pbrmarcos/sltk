import * as React from "react";
import { QuickActions, type QuickAction } from "./QuickActions";

type Props = {
  userName: string;
  roleLabel: string;
  subtitle?: string;
  actions?: QuickAction[];
  children: React.ReactNode;
};

const PERIODS = [
  { key: "7d", label: "7 dias" },
  { key: "30d", label: "30 dias" },
  { key: "90d", label: "90 dias" },
];

export function DashboardShell({ userName, roleLabel, subtitle, actions, children }: Props) {
  const [period, setPeriod] = React.useState("30d");
  const today = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });
  const first = userName.split(" ")[0];
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[12px] uppercase tracking-wider text-[var(--text-muted)]">
            <span>{today}</span>
            <span className="rounded-full border border-[var(--bg-border)] bg-[var(--bg-elevated)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-primary)]">
              {roleLabel}
            </span>
          </div>
          <h1 className="mt-1 truncate text-[26px] font-semibold tracking-tight text-[var(--text-primary)]">
            Olá, <span className="text-[var(--primary)]">{first}</span> 👋
          </h1>
          {subtitle && <p className="text-[13px] text-[var(--text-muted)]">{subtitle}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex overflow-hidden rounded-[var(--radius-md)] border border-[var(--bg-border)] bg-[var(--bg-surface)]">
            {PERIODS.map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => setPeriod(p.key)}
                className={
                  "px-2.5 py-1.5 text-[11.5px] font-medium transition-colors " +
                  (period === p.key
                    ? "bg-[var(--primary)]/15 text-[var(--primary)]"
                    : "text-[var(--text-muted)] hover:bg-[var(--bg-elevated)]")
                }
              >
                {p.label}
              </button>
            ))}
          </div>
          {actions && actions.length > 0 && <QuickActions actions={actions} />}
        </div>
      </div>
      {children}
    </div>
  );
}
