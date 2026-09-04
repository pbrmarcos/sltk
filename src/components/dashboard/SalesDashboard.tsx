import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { FileText, Target, Users } from "lucide-react";
import { KpiCard } from "./KpiCard";
import { DashboardCard } from "./DashboardCard";
import { DashboardShell } from "./DashboardShell";
import { StatusList } from "./StatusList";
import { PipelineFunnel } from "./PipelineFunnel";
import { getManagerDashboard } from "@/lib/dashboard.functions";

const fmtBRL = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(n);
const fmtPct = (n: number) => `${(n * 100).toFixed(1)}%`;
const fmtDate = (v: string | null) =>
  v ? new Date(v).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) : "sem data";

const STAGE_COLOR: Record<string, string> = {
  novo: "#94a3b8",
  qualificado: "#0ea5e9",
  proposta: "#6366f1",
  negociacao: "#f59e0b",
  ganho: "#22c55e",
  perdido: "#ef4444",
};

export function SalesDashboard({ userName }: { userName: string }) {
  const fetchDashboard = useServerFn(getManagerDashboard);
  const { data: d, isLoading } = useQuery({
    queryKey: ["dashboard", "sales"],
    queryFn: () => fetchDashboard(),
    staleTime: 60_000,
  });

  const loading = isLoading || !d;

  return (
    <DashboardShell
      userName={userName}
      roleLabel="Pilares · Comercial"
      subtitle="Pipeline, conversão e próximas ações — dados reais do sistema."
      actions={[
        { label: "Nova oportunidade", to: "/comercial/pipeline", icon: Target },
        { label: "Novo orçamento", to: "/comercial/orcamentos", icon: FileText },
        { label: "Clientes", to: "/clientes", icon: Users },
      ]}
    >
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard
          label="Pipeline aberto"
          value={loading ? "…" : fmtBRL(d.kpis.pipelineValor)}
          hint={loading ? undefined : `${d.kpis.pipelineCount} oportunidade(s)`}
        />
        <KpiCard
          label="Ganho no mês"
          value={loading ? "…" : fmtBRL(d.kpis.ganhoMes)}
          delta={d?.kpis.ganhoMesDelta}
          accent="success"
        />
        <KpiCard
          label="Win rate (90d)"
          value={loading ? "…" : fmtPct(d.kpis.winRate)}
          delta={d?.kpis.winRateDelta}
          deltaSuffix="pp"
        />
        <KpiCard
          label="Ticket médio"
          value={loading ? "…" : fmtBRL(d.kpis.ticketMedio)}
          delta={d?.kpis.ticketMedioDelta}
        />
      </div>

      <DashboardCard title="Funil comercial" hint="Últimos 90 dias">
        <PipelineFunnel
          data={(d?.funnel ?? []).map((f) => ({
            label: f.stage,
            valor: f.valor,
            count: f.count,
            color: STAGE_COLOR[f.stage] ?? "#94a3b8",
          }))}
        />
      </DashboardCard>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <DashboardCard title="Oportunidades quentes" hint="Proposta e negociação">
          <StatusList
            items={(d?.hotOpportunities ?? []).map((o) => ({
              id: o.id,
              titulo: `${o.codigo ? `${o.codigo} · ` : ""}${o.titulo}`,
              meta: `${o.cliente ?? "sem cliente"} · ${o.valor ? fmtBRL(o.valor) : "sem valor"} · ${fmtDate(o.expectedClose)}`,
              status: o.stage === "negociacao" ? "NEGOCIAÇÃO" : "PROPOSTA",
              tone: o.stage === "negociacao" ? ("warning" as const) : ("info" as const),
            }))}
            empty="Nenhuma oportunidade em proposta ou negociação."
          />
        </DashboardCard>
        <DashboardCard title="Próximas tarefas" hint="Processos em andamento">
          <StatusList
            items={(d?.upcomingTasks ?? []).map((t) => ({
              id: t.id,
              titulo: t.titulo,
              meta: `${t.cliente ?? t.processoCodigo ?? "—"} · prazo ${fmtDate(t.prazo)}`,
              status: new Date(t.prazo).getTime() < Date.now() ? "ATRASADA" : "ABERTA",
              tone: new Date(t.prazo).getTime() < Date.now() ? ("danger" as const) : ("neutral" as const),
            }))}
            empty="Nenhuma tarefa em aberto."
          />
        </DashboardCard>
      </div>
    </DashboardShell>
  );
}
