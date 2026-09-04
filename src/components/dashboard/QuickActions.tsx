import { Link } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";

export type QuickAction = {
  label: string;
  to: string;
  icon: LucideIcon;
};

export function QuickActions({ actions }: { actions: QuickAction[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((a) => (
        <Link
          key={a.to + a.label}
          to={a.to}
          className="inline-flex items-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--bg-border)] bg-[var(--bg-surface)] px-3 py-2 text-[12px] font-medium text-[var(--text-primary)] transition-colors hover:border-[var(--primary)]/40 hover:bg-[var(--bg-elevated)]"
        >
          <a.icon className="h-3.5 w-3.5" />
          {a.label}
        </Link>
      ))}
    </div>
  );
}
