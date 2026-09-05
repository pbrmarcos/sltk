type Segment = { label: string; value: number; color: string };

export function HeatStrip({ segments, hint }: { segments: Segment[]; hint?: string }) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  return (
    <div>
      <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-[var(--bg-elevated)]">
        {segments.map((s) => (
          <div
            key={s.label}
            title={`${s.label}: ${s.value}`}
            style={{ width: `${(s.value / total) * 100}%`, background: s.color }}
          />
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
        {segments.map((s) => (
          <div
            key={s.label}
            className="flex items-center gap-1.5 text-[11.5px] text-[var(--text-muted)]"
          >
            <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
            <span className="text-[var(--text-primary)]">{s.value}</span>
            <span>{s.label}</span>
          </div>
        ))}
      </div>
      {hint && <div className="mt-2 text-[11.5px] text-[var(--text-muted)]">{hint}</div>}
    </div>
  );
}
