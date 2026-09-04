import { cn } from "@/lib/utils";

type Props = {
  label: string;
  value: number;
  target: number;
  format?: (n: number) => string;
  hint?: string;
  tone?: "primary" | "success" | "warning" | "danger";
};

const TONE: Record<NonNullable<Props["tone"]>, string> = {
  primary: "bg-[var(--primary)]",
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  danger: "bg-red-500",
};

export function MeterCard({ label, value, target, format, hint, tone = "primary" }: Props) {
  const pct = target > 0 ? Math.min(100, Math.max(0, (value / target) * 100)) : 0;
  const fmt = format ?? ((n: number) => new Intl.NumberFormat("pt-BR").format(n));
  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--bg-border)] bg-[var(--bg-surface)] p-4">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)]">{label}</span>
        <span className="text-[11px] tabular-nums text-[var(--text-muted)]">
          {fmt(value)} <span className="opacity-60">/ {fmt(target)}</span>
        </span>
      </div>
      <div className="mt-2 text-xl font-semibold tabular-nums text-[var(--text-primary)]">{pct.toFixed(0)}%</div>
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[var(--bg-elevated)]">
        <div className={cn("h-full rounded-full transition-all", TONE[tone])} style={{ width: `${pct}%` }} />
      </div>
      {hint && <div className="mt-2 text-[11.5px] text-[var(--text-muted)]">{hint}</div>}
    </div>
  );
}
