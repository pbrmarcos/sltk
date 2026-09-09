import * as React from "react";
import { CheckCircle2, AlertTriangle } from "lucide-react";
import { type QuickAction } from "./QuickActions";
import { ShortcutsPanel } from "./ShortcutsPanel";
import { usePendenciasSidebar } from "@/hooks/use-pendencias";
import { cn } from "@/lib/utils";

type Props = {
  userName: string;
  roleLabel: string;
  subtitle?: string;
  actions?: QuickAction[];
  children: React.ReactNode;
};

export function DashboardShell({ userName, roleLabel, subtitle, actions, children }: Props) {
  const { data: pendData } = usePendenciasSidebar();
  const totalPend = pendData ? Object.values(pendData.map).reduce((s, n) => s + n, 0) : undefined;
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
        {totalPend !== undefined && (
          <div
            className={cn(
              "inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-[12px] font-medium",
              totalPend === 0
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                : totalPend > 15
                  ? "border-red-500/30 bg-red-500/10 text-red-400"
                  : "border-amber-500/30 bg-amber-500/10 text-amber-400",
            )}
          >
            {totalPend === 0 ? (
              <CheckCircle2 className="h-3.5 w-3.5" />
            ) : (
              <AlertTriangle className="h-3.5 w-3.5" />
            )}
            {totalPend === 0
              ? "Tudo em dia"
              : `${totalPend} ${totalPend === 1 ? "item pede" : "itens pedem"} atenção`}
          </div>
        )}
      </div>
      {actions && actions.length > 0 && (
        <ShortcutsPanel actions={actions} pendMap={pendData?.map} />
      )}
      {children}
    </div>
  );
}
