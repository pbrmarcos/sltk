import { Link } from "@tanstack/react-router";
import { FileText } from "lucide-react";
import type { DashboardData, SatStatusKey } from "@/lib/dashboard.functions";

const STATUS_LABEL: Record<SatStatusKey, string> = {
  rascunho: "Rascunhos",
  preenchendo: "Em preenchimento",
  assinado: "Assinados",
  arquivado: "Arquivados",
};
const STATUS_COLOR: Record<SatStatusKey, string> = {
  rascunho: "#94a3b8",
  preenchendo: "#0ea5e9",
  assinado: "#22c55e",
  arquivado: "#a855f7",
};

const fmtDate = (s: string) =>
  new Date(s).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });

export function SatStatusCard({
  byStatus,
  recent,
}: {
  byStatus: DashboardData["satByStatus"];
  recent: DashboardData["recentSats"];
}) {
  const total = (Object.values(byStatus) as number[]).reduce((a, b) => a + b, 0);
  const keys = Object.keys(byStatus) as SatStatusKey[];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        {keys.map((k) => (
          <div
            key={k}
            className="rounded-[var(--radius-md)] border border-[var(--bg-border)] bg-[var(--bg-elevated)]/40 p-3"
          >
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-[var(--text-muted)]">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: STATUS_COLOR[k] }} />
              {STATUS_LABEL[k]}
            </div>
            <div className="mt-1 text-xl font-semibold tabular-nums text-[var(--text-primary)]">
              {byStatus[k]}
            </div>
          </div>
        ))}
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between text-[11px] uppercase tracking-wider text-[var(--text-muted)]">
          <span>Últimos SATs</span>
          <span className="tabular-nums">{total} total</span>
        </div>
        {recent.length === 0 ? (
          <div className="py-6 text-center text-[12px] text-[var(--text-muted)]">
            Nenhum SAT registrado ainda.
          </div>
        ) : (
          <ul className="divide-y divide-[var(--bg-border)]">
            {recent.map((s) => (
              <li key={s.id}>
                <Link
                  to="/pos-vendas/sat/$id"
                  params={{ id: s.id }}
                  className="flex items-center gap-2.5 py-2 text-[12.5px] transition-colors hover:bg-[var(--bg-elevated)]/40"
                >
                  <FileText className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium text-[var(--text-primary)]">
                      {s.codigo}
                    </div>
                    <div className="truncate text-[11px] text-[var(--text-muted)]">
                      {s.cliente ?? "—"}
                    </div>
                  </div>
                  <span className="text-[11px] tabular-nums text-[var(--text-muted)]">
                    {fmtDate(s.updatedAt)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
