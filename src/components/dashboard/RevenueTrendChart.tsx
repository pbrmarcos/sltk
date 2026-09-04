import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";

type Point = { month: string; valor: number; count: number };

const fmtCompact = (n: number) =>
  new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 }).format(n);
const fmtBRL = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(n);

function monthLabel(m: string) {
  const [y, mm] = m.split("-");
  const d = new Date(Number(y), Number(mm) - 1, 1);
  return d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
}

export function RevenueTrendChart({ data }: { data: Point[] }) {
  const formatted = data.map((d) => ({ ...d, mLabel: monthLabel(d.month) }));
  return (
    <div className="h-[220px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={formatted} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <defs>
            <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.95} />
              <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.35} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--bg-border)" vertical={false} />
          <XAxis dataKey="mLabel" tick={{ fill: "var(--text-muted)", fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: "var(--text-muted)", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={fmtCompact} />
          <Tooltip
            cursor={{ fill: "var(--bg-elevated)" }}
            contentStyle={{
              background: "var(--bg-surface)",
              border: "1px solid var(--bg-border)",
              borderRadius: 10,
              color: "var(--text-primary)",
              fontSize: 12,
            }}
            formatter={(v: any) => [fmtBRL(Number(v)), "Ganho"]}
            labelFormatter={(l) => `Mês: ${l}`}
          />
          <Bar dataKey="valor" fill="url(#barGrad)" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
