import { Calendar, CheckCircle2 } from "lucide-react";
import type { DashboardData } from "@/lib/dashboard.functions";

const fmtDate = (s: string) => {
  const d = new Date(s);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", weekday: "short" }).replace(".", "");
};

export function TarefasAgendaCard({ tasks }: { tasks: DashboardData["upcomingTasks"] }) {
  return (
    <div className="space-y-4">
      <div>
        <div className="mb-2 flex items-center gap-2 text-[11px] uppercase tracking-wider text-[var(--text-muted)]">
          <CheckCircle2 className="h-3 w-3" /> Próximas tarefas
        </div>
        {tasks.length === 0 ? (
          <div className="rounded-[var(--radius-md)] border border-dashed border-[var(--bg-border)] bg-[var(--bg-elevated)]/30 py-6 text-center text-[12px] text-[var(--text-muted)]">
            Sem tarefas pendentes.
          </div>
        ) : (
          <ul className="space-y-2">
            {tasks.map((t) => {
              const overdue = new Date(t.prazo).getTime() < Date.now();
              return (
                <li
                  key={t.id}
                  className="flex items-start gap-3 rounded-[var(--radius-md)] border border-[var(--bg-border)] bg-[var(--bg-elevated)]/40 p-2.5"
                >
                  <div className={`mt-1 h-2 w-2 shrink-0 rounded-full ${overdue ? "bg-red-400" : "bg-[var(--primary)]"}`} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[12.5px] font-medium text-[var(--text-primary)]">{t.titulo}</div>
                    <div className="truncate text-[11px] text-[var(--text-muted)]">
                      {t.processoCodigo ? `${t.processoCodigo} · ` : ""}{t.cliente ?? "—"}
                    </div>
                  </div>
                  <span className={`shrink-0 text-[11px] tabular-nums ${overdue ? "text-red-400" : "text-[var(--text-secondary)]"}`}>
                    {fmtDate(t.prazo)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="rounded-[var(--radius-md)] border border-dashed border-[var(--primary)]/30 bg-gradient-to-br from-[var(--primary)]/10 to-transparent p-3">
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-[var(--primary)]">
          <Calendar className="h-3 w-3" /> Google Agenda
        </div>
        <div className="mt-1 text-[12px] text-[var(--text-secondary)]">
          Em breve: reuniões e compromissos sincronizados aqui.
        </div>
      </div>
    </div>
  );
}
