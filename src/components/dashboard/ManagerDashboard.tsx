import { Link } from "@tanstack/react-router";
import { ArrowRight, Users, Briefcase } from "lucide-react";
import type { DashboardData } from "@/lib/dashboard.functions";
import { KpiCard } from "./KpiCard";
import { DashboardCard } from "./DashboardCard";
import { PipelineFunnel } from "./PipelineFunnel";
import { RevenueTrendChart } from "./RevenueTrendChart";
import { HotOpportunitiesList } from "./HotOpportunitiesList";
import { SatStatusCard } from "./SatStatusCard";
import { TarefasAgendaCard } from "./TarefasAgendaCard";

const fmtBRL = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(n);
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
  const funnel = data.funnel.map((f) => ({
    label: STAGE_LABEL[f.stage] ?? f.stage,
    valor: f.valor,
    count: f.count,
    color: STAGE_COLORS[f.stage] ?? "#6366f1",
  }));
  const today = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-[12px] uppercase tracking-wider text-[var(--text-muted)]">{today}</div>
          <h1 className="mt-1 text-[26px] font-semibold tracking-tight text-[var(--text-primary)]">
            Olá, <span className="text-[var(--primary)]">{userName.split(" ")[0]}</span> 👋
          </h1>
          <p className="text-[13px] text-[var(--text-muted)]">Visão executiva do comercial e dos processos em execução.</p>
        </div>
        <div className="flex gap-2">
          <Link
            to="/comercial/pipeline"
            className="inline-flex items-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--bg-border)] bg-[var(--bg-surface)] px-3 py-2 text-[12px] font-medium text-[var(--text-primary)] transition-colors hover:border-[var(--primary)]/40 hover:bg-[var(--bg-elevated)]"
          >
            <Briefcase className="h-3.5 w-3.5" /> Pipeline <ArrowRight className="h-3 w-3" />
          </Link>
          <Link
            to="/clientes"
            className="inline-flex items-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--bg-border)] bg-[var(--bg-surface)] px-3 py-2 text-[12px] font-medium text-[var(--text-primary)] transition-colors hover:border-[var(--primary)]/40 hover:bg-[var(--bg-elevated)]"
          >
            <Users className="h-3.5 w-3.5" /> Clientes <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <KpiCard label="Pipeline aberto" value={fmtBRL(data.kpis.pipelineValor)} hint={`${data.kpis.pipelineCount} oportunidades`} />
        <KpiCard label="Ganho no mês" value={fmtBRL(data.kpis.ganhoMes)} delta={data.kpis.ganhoMesDelta} accent="success" />
        <KpiCard label="Win rate (90d)" value={fmtPct(data.kpis.winRate)} delta={data.kpis.winRateDelta} deltaSuffix="pp" accent="primary" />
        <KpiCard label="Ticket médio" value={fmtBRL(data.kpis.ticketMedio)} delta={data.kpis.ticketMedioDelta} accent="primary" />
        <KpiCard label="Ciclo médio" value={`${data.kpis.cicloMedioDias.toFixed(0)}d`} delta={data.kpis.cicloMedioDelta} invertDelta accent="warning" />
        <KpiCard label="Clientes ativos" value={fmtInt(data.clientesAtivos)} hint={`${data.oportunidadesAbertas} ops em aberto`} />
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
            <Link to="/pos-vendas/sat" className="text-[11px] font-medium text-[var(--primary)] hover:underline">
              ver todos
            </Link>
          }
        >
          <SatStatusCard byStatus={data.satByStatus} recent={data.recentSats} />
        </DashboardCard>
      </div>
    </div>
  );
}
