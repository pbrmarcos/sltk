import { Link } from "@tanstack/react-router";
import { Flame, ChevronRight } from "lucide-react";
import type { DashboardData } from "@/lib/dashboard.functions";

const fmtBRL = (n: number | null) =>
  n === null ? "—" : new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(n);
const fmtDate = (s: string | null) => s ? new Date(s).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }) : "—";

export function HotOpportunitiesList({ items }: { items: DashboardData["hotOpportunities"] }) {
  if (items.length === 0) {
    return <div className="py-8 text-center text-[12px] text-[var(--text-muted)]">Sem oportunidades em proposta ou negociação.</div>;
  }
  return (
    <ul className="divide-y divide-[var(--bg-border)]">
      {items.map((o) => {
        const overdue = o.expectedClose ? new Date(o.expectedClose).getTime() < Date.now() : false;
        return (
          <li key={o.id} className="group">
            <Link
              to="/comercial/orcamento/$id"
              params={{ id: o.id }}
              className="flex items-center gap-3 px-1 py-3 transition-colors hover:bg-[var(--bg-elevated)]/40"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--primary)]/10 text-[var(--primary)]">
                <Flame className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-medium text-[var(--text-primary)]">{o.titulo}</div>
                <div className="truncate text-[11.5px] text-[var(--text-muted)]">
                  {o.cliente ?? "—"} · {o.codigo ?? "—"} · {o.stage === "proposta" ? "Proposta" : "Negociação"}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[13px] font-semibold tabular-nums text-[var(--text-primary)]">{fmtBRL(o.valor)}</div>
                <div className={`text-[11px] tabular-nums ${overdue ? "text-red-400" : "text-[var(--text-muted)]"}`}>
                  {o.probabilidade}% · {fmtDate(o.expectedClose)}
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-[var(--text-muted)] opacity-0 transition-opacity group-hover:opacity-100" />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
