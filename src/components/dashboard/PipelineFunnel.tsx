import * as React from "react";

type Slice = { label: string; valor: number; count: number; color: string };

export function PipelineFunnel({ data }: { data: Slice[] }) {
  const max = Math.max(...data.map((d) => d.valor), 1);
  const fmtBRL = (n: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(n);

  return (
    <div className="space-y-3">
      {data.map((d) => {
        const pct = (d.valor / max) * 100;
        return (
          <div key={d.label} className="group">
            <div className="mb-1 flex items-center justify-between text-[12px]">
              <span className="font-medium text-[var(--text-primary)]">{d.label}</span>
              <span className="tabular-nums text-[var(--text-muted)]">
                <span className="text-[var(--text-secondary)]">{d.count}</span> · {fmtBRL(d.valor)}
              </span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-[var(--bg-elevated)]">
              <div
                className="h-full rounded-full transition-all duration-500 ease-out"
                style={{ width: `${Math.max(pct, 2)}%`, background: `linear-gradient(90deg, ${d.color}, ${d.color}cc)` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
