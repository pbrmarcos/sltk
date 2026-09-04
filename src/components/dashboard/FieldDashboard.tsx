import { HeadphonesIcon, Wrench, CalendarDays } from "lucide-react";
import { KpiCard } from "./KpiCard";
import { MeterCard } from "./MeterCard";
import { DashboardCard } from "./DashboardCard";
import { DashboardShell } from "./DashboardShell";
import { StatusList } from "./StatusList";
import { useRoleDashboards } from "./useRoleDashboards";

export function FieldDashboard({ userName }: { userName: string }) {
  const { data, isLoading } = useRoleDashboards();
  const d = data?.field;
  const sla = d?.slaMeter ?? { atual: 0, alvo: 95 };

  return (
    <DashboardShell
      userName={userName}
      roleLabel="Campo · Instalação"
      subtitle="Chamados em atendimento, SATs pendentes e aderência de SLA."
      actions={[
        { label: "Chamados", to: "/pos-vendas/chamados", icon: HeadphonesIcon },
        { label: "SATs", to: "/pos-vendas/sat", icon: Wrench },
        { label: "Agenda", to: "/pos-vendas/agenda", icon: CalendarDays },
      ]}
    >
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard label="SATs pendentes" value={isLoading ? "…" : String(d?.kpis.satsPendentes ?? 0)} accent="warning" />
        <KpiCard label="Chamados abertos" value={isLoading ? "…" : String(d?.kpis.chamadosAbertos ?? 0)} accent="primary" />
        <KpiCard label="SLA vencendo (24h)" value={isLoading ? "…" : String(d?.kpis.slaVencendo ?? 0)} accent="danger" />
        <KpiCard label="SATs assinados (30d)" value={isLoading ? "…" : String(d?.kpis.satsAssinados30d ?? 0)} accent="success" />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <MeterCard
          label="Aderência de SLA (30d)"
          value={sla.atual}
          target={sla.alvo}
          format={(n) => `${n}%`}
          hint={`Meta ${sla.alvo}% · atual ${sla.atual}%`}
          tone={sla.atual >= sla.alvo ? "success" : "warning"}
        />
        <DashboardCard title="Chamados em atendimento" className="xl:col-span-2">
          <StatusList items={d?.chamados ?? []} empty="Nenhum chamado aberto." />
        </DashboardCard>
      </div>

      <DashboardCard title="SATs em preenchimento" hint="Aguardando conclusão">
        <StatusList items={d?.sats ?? []} empty="Nenhum SAT pendente." />
      </DashboardCard>
    </DashboardShell>
  );
}
