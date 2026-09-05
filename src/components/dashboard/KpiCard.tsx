import { ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  label: string;
  value: string;
  hint?: string;
  delta?: number;
  deltaSuffix?: string;
  invertDelta?: boolean;
  accent?: "primary" | "success" | "warning" | "danger";
};

export function KpiCard({
  label,
  value,
  hint,
  delta,
  deltaSuffix = "%",
  invertDelta,
  accent = "primary",
}: Props) {
  const up = (delta ?? 0) > 0.5;
  const down = (delta ?? 0) < -0.5;
  const positive = invertDelta ? down : up;
  const negative = invertDelta ? up : down;
  const accentColor =
    accent === "success"
      ? "var(--success, #22c55e)"
      : accent === "warning"
        ? "var(--warning, #f59e0b)"
        : accent === "danger"
          ? "var(--danger,  #ef4444)"
          : "var(--primary)";

  return (
    <div className="relative overflow-hidden rounded-[var(--radius-lg)] border border-[var(--bg-border)] bg-[var(--bg-surface)] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)] transition-colors hover:border-[var(--text-muted)]/40">
      <div
        className="absolute inset-x-0 top-0 h-px opacity-60"
        style={{ background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)` }}
      />
      <div className="flex items-start justify-between gap-2">
        <span className="text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
          {label}
        </span>
        {delta !== undefined && (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium",
              positive && "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
              negative && "border-red-500/30 bg-red-500/10 text-red-400",
              !positive &&
                !negative &&
                "border-[var(--bg-border)] bg-[var(--bg-elevated)] text-[var(--text-muted)]",
            )}
          >
            {positive ? (
              <ArrowUpRight className="h-3 w-3" />
            ) : negative ? (
              <ArrowDownRight className="h-3 w-3" />
            ) : (
              <Minus className="h-3 w-3" />
            )}
            {Math.abs(delta).toFixed(1)}
            {deltaSuffix}
          </span>
        )}
      </div>
      <div className="mt-3 text-2xl font-semibold tracking-tight text-[var(--text-primary)] tabular-nums">
        {value}
      </div>
      {hint && <div className="mt-1 text-[12px] text-[var(--text-muted)]">{hint}</div>}
    </div>
  );
}
