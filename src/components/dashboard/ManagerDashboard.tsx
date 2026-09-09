import { Link } from "@tanstack/react-router";
import { Users, Briefcase } from "lucide-react";
import type { DashboardData } from "@/lib/dashboard.functions";
import { KpiCard } from "./KpiCard";
import { DashboardCard } from "./DashboardCard";
import { DashboardShell } from "./DashboardShell";
import { PipelineFunnel } from "./PipelineFunnel";
import { RevenueTrendChart } from "./RevenueTrendChart";
import { HotOpportunitiesList } from "./HotOpportunitiesList";
import { SatStatusCard } from "./SatStatusCard";
import { TarefasAgendaCard } from "./TarefasAgendaCard";
import { ModulesActiveGrid } from "./ModulesActiveGrid";
import { useRoleDashboards } from "./useRoleDashboards";

const fmtBRL = (n: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(n);
const fmtPct = (n: number) => `${(n * 100).toFixed(1)}%`;
const fmtInt = (n: number) => new Intl.NumberFormat("pt-BR").format(n);

const STAGE_COLORS: Record<string, string> = {
  novo: "#94a3b8",
  qualificado: "#0ea5e9",
  proposta: "#6366f1",
  negociacao: "#a855f7",
  ganho: "#22c55e",
  perdido: "#ef4444",
};
const STAGE_LABEL: Record<string, string> = {
  novo: "Novo",
  qualificado: "Qualificado",
  proposta: "Proposta",
  negociacao: "Negociação",
  ganho: "Ganho",
  perdido: "Perdido",
};

export function ManagerDashboard({ data, userName }: { data: DashboardData; userName: string }) {
  const { data: roleData } = useRoleDashboards();
  const funnel = data.funnel.map((f) => ({
    label: STAGE_LABEL[f.stage] ?? f.stage,
    valor: f.valor,
    count: f.count,
    color: STAGE_COLORS[f.stage] ?? "#6366f1",
  }));

  return (
    <DashboardShell
      userName={userName}
      roleLabel="Estratégico"
      subtitle="Visão executiva do comercial e dos processos em execução."
      actions={[
        { label: "Pipeline", to: "/comercial/pipeline", icon: Briefcase },
        { label: "Clientes", to: "/clientes", icon: Users },
      ]}
    >
      {/* KPI row */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <KpiCard
          label="Pipeline aberto"
          value={fmtBRL(data.kpis.pipelineValor)}
          hint={`${data.kpis.pipelineCount} oportunidades`}
        />
        <KpiCard
          label="Ganho no mês"
          value={fmtBRL(data.kpis.ganhoMes)}
          delta={data.kpis.ganhoMesDelta}
          accent="success"
        />
        <KpiCard
          label="Win rate (90d)"
          value={fmtPct(data.kpis.winRate)}
          delta={data.kpis.winRateDelta}
          deltaSuffix="pp"
          accent="primary"
        />
        <KpiCard
          label="Ticket médio"
          value={fmtBRL(data.kpis.ticketMedio)}
          delta={data.kpis.ticketMedioDelta}
          accent="primary"
        />
        <KpiCard
          label="Ciclo médio"
          value={`${data.kpis.cicloMedioDias.toFixed(0)}d`}
          delta={data.kpis.cicloMedioDelta}
          invertDelta
          accent="warning"
        />
        <KpiCard
          label="Clientes ativos"
          value={fmtInt(data.clientesAtivos)}
          hint={`${data.oportunidadesAbertas} ops em aberto`}
        />
      </div>

      {/* Row 2: Funnel + Revenue */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <DashboardCard
          title="Funil de vendas"
          hint="Últimos 90 dias por etapa"
          className="xl:col-span-1"
        >
          <PipelineFunnel data={funnel} />
        </DashboardCard>

        <DashboardCard
          title="Receita ganha por mês"
          hint="Histórico dos últimos 6 meses"
          className="xl:col-span-2"
        >
          <RevenueTrendChart data={data.revenueByMonth} />
        </DashboardCard>
      </div>

      {/* Row 3: Hot opps + Processos donut + Tarefas */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <DashboardCard
          title="Oportunidades quentes"
          hint="Em proposta ou negociação"
          action={
            <Link
              to="/comercial/pipeline"
              className="text-[11px] font-medium text-[var(--primary)] hover:underline"
            >
              ver pipeline
            </Link>
          }
        >
          <HotOpportunitiesList items={data.hotOpportunities} />
        </DashboardCard>

        <DashboardCard title="Agenda & tarefas" hint="Próximos 7 compromissos">
          <TarefasAgendaCard tasks={data.upcomingTasks} />
        </DashboardCard>
      </div>

      {/* Row 4: SAT */}
      <div className="grid grid-cols-1 gap-4">
        <DashboardCard
          title="Pós-vendas — SATs"
          hint="Status atual e últimos relatórios"
          action={
            <Link
              to="/pos-vendas/sat"
              className="text-[11px] font-medium text-[var(--primary)] hover:underline"
            >
              ver todos
            </Link>
          }
        >
          <SatStatusCard byStatus={data.satByStatus} recent={data.recentSats} />
        </DashboardCard>
      </div>

      <ModulesActiveGrid data={roleData} exclude={["comercial"]} />
    </DashboardShell>
  );
}
