import { Ruler, FolderKanban, Clock } from "lucide-react";
import { KpiCard } from "./KpiCard";
import { DashboardCard } from "./DashboardCard";
import { DashboardShell } from "./DashboardShell";
import { StatusList } from "./StatusList";
import { HeatStrip } from "./HeatStrip";
import { useRoleDashboards } from "./useRoleDashboards";

export function EngineeringDashboard({ userName }: { userName: string }) {
  const { data, isLoading } = useRoleDashboards();
  const d = data?.engineering;

  return (
    <DashboardShell
      userName={userName}
      roleLabel="Projeto · Engenharia"
      subtitle="ETPs em aberto, etapas de projeto e revisões críticas."
      actions={[
        { label: "Projetos", to: "/engenharia/projetos", icon: FolderKanban },
        { label: "ETPs", to: "/engenharia/etp", icon: Ruler },
        { label: "Apontar HH", to: "/engenharia/hh", icon: Clock },
      ]}
    >
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard
          label="ETPs em aberto"
          value={isLoading ? "…" : String(d?.kpis.etpsAbertos ?? 0)}
          accent="primary"
        />
        <KpiCard
          label="Etapas em aberto"
          value={isLoading ? "…" : String(d?.kpis.etapasAbertas ?? 0)}
        />
        <KpiCard
          label="Revisões abertas"
          value={isLoading ? "…" : String(d?.kpis.revisoes ?? 0)}
          accent="warning"
        />
        <KpiCard
          label="Etapas atrasadas"
          value={isLoading ? "…" : String(d?.kpis.atrasadas ?? 0)}
          accent="danger"
        />
      </div>

      <DashboardCard title="ETPs por situação" hint="Contagem atual">
        <HeatStrip segments={d?.kanban ?? []} hint="Distribuição dos ETPs entre as situações." />
      </DashboardCard>

      <DashboardCard title="Etapas mais urgentes" hint="Priorize hoje">
        <StatusList
          items={d?.criticas ?? []}
          empty="Nenhuma etapa de engenharia cadastrada ainda."
        />
      </DashboardCard>
    </DashboardShell>
  );
}
