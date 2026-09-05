import { Line, LineChart, ResponsiveContainer } from "recharts";
import { ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  label: string;
  value: string;
  data: { v: number }[];
  delta?: number;
  deltaSuffix?: string;
  invertDelta?: boolean;
  hint?: string;
  color?: string;
};

export function SparkKpi({
  label,
  value,
  data,
  delta,
  deltaSuffix = "%",
  invertDelta,
  hint,
  color = "var(--primary)",
}: Props) {
  const up = (delta ?? 0) > 0.5;
  const down = (delta ?? 0) < -0.5;
  const positive = invertDelta ? down : up;
  const negative = invertDelta ? up : down;
  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--bg-border)] bg-[var(--bg-surface)] p-4">
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
      <div className="mt-2 flex items-end justify-between gap-3">
        <div className="text-2xl font-semibold tabular-nums text-[var(--text-primary)]">
          {value}
        </div>
        <div className="h-10 w-24">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <Line
                type="monotone"
                dataKey="v"
                stroke={color}
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
      {hint && <div className="mt-1 text-[11.5px] text-[var(--text-muted)]">{hint}</div>}
    </div>
  );
}
