import * as React from "react";

export function DashboardCard({
  title,
  hint,
  action,
  className = "",
  children,
}: {
  title: string;
  hint?: string;
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={`rounded-[var(--radius-lg)] border border-[var(--bg-border)] bg-[var(--bg-surface)] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)] ${className}`}
    >
      <header className="mb-4 flex items-start justify-between gap-2">
        <div>
          <h3 className="text-[13px] font-semibold tracking-tight text-[var(--text-primary)]">{title}</h3>
          {hint && <p className="text-[11.5px] text-[var(--text-muted)]">{hint}</p>}
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}
