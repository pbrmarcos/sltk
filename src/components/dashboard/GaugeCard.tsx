type Props = {
  label: string;
  value: number; // 0..1
  hint?: string;
  tone?: "primary" | "success" | "warning" | "danger";
};

const COLOR: Record<NonNullable<Props["tone"]>, string> = {
  primary: "var(--primary)",
  success: "#22c55e",
  warning: "#f59e0b",
  danger: "#ef4444",
};

export function GaugeCard({ label, value, hint, tone = "primary" }: Props) {
  const pct = Math.max(0, Math.min(1, value));
  const color = COLOR[tone];
  const size = 128;
  const stroke = 12;
  const r = (size - stroke) / 2;
  const c = Math.PI * r; // half circumference
  const dash = c * pct;

  return (
    <div className="flex h-full flex-col rounded-[var(--radius-lg)] border border-[var(--bg-border)] bg-[var(--bg-surface)] p-4">
      <span className="text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
        {label}
      </span>
      <div className="mt-2 flex flex-1 items-center justify-center">
        <div className="relative" style={{ width: size, height: size / 2 + 8 }}>
          <svg width={size} height={size / 2 + stroke} viewBox={`0 0 ${size} ${size / 2 + stroke}`}>
            <path
              d={`M ${stroke / 2} ${size / 2} A ${r} ${r} 0 0 1 ${size - stroke / 2} ${size / 2}`}
              fill="none"
              stroke="var(--bg-elevated)"
              strokeWidth={stroke}
              strokeLinecap="round"
            />
            <path
              d={`M ${stroke / 2} ${size / 2} A ${r} ${r} 0 0 1 ${size - stroke / 2} ${size / 2}`}
              fill="none"
              stroke={color}
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={`${dash} ${c}`}
              style={{ transition: "stroke-dasharray 400ms ease" }}
            />
          </svg>
          <div className="absolute inset-x-0 bottom-0 text-center">
            <div className="text-xl font-semibold tabular-nums text-[var(--text-primary)]">
              {(pct * 100).toFixed(0)}%
            </div>
          </div>
        </div>
      </div>
      {hint && (
        <div className="mt-1 text-center text-[11.5px] text-[var(--text-muted)]">{hint}</div>
      )}
    </div>
  );
}
