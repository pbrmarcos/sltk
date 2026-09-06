import { Wrench, ListChecks } from "lucide-react";
import { KpiCard } from "./KpiCard";
import { MeterCard } from "./MeterCard";
import { DashboardCard } from "./DashboardCard";
import { DashboardShell } from "./DashboardShell";
import { StatusList } from "./StatusList";
import { useRoleDashboards } from "./useRoleDashboards";

export function AssemblyDashboard({ userName }: { userName: string }) {
  const { data, isLoading } = useRoleDashboards();
  const d = data?.assembly;

  return (
    <DashboardShell
      userName={userName}
      roleLabel="Montagem"
      subtitle="Sua fila de etapas e o andamento das entregas."
      actions={[
        { label: "Minhas etapas", to: "/producao/montagem", icon: ListChecks },
        { label: "Ordens", to: "/producao/montagem", icon: Wrench },
      ]}
    >
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard
          label="Etapas em aberto"
          value={isLoading ? "…" : String(d?.kpis.etapasAbertas ?? 0)}
          accent="primary"
        />
        <KpiCard label="Em andamento" value={isLoading ? "…" : String(d?.kpis.emAndamento ?? 0)} />
        <KpiCard
          label="Concluídas (7 dias)"
          value={isLoading ? "…" : String(d?.kpis.concluidas7d ?? 0)}
          accent="success"
        />
        <KpiCard
          label="Atrasadas"
          value={isLoading ? "…" : String(d?.kpis.atrasadas ?? 0)}
          accent="danger"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <MeterCard
          label="Etapas concluídas"
          value={d?.progresso.atual ?? 0}
          target={Math.max(d?.progresso.alvo ?? 0, 1)}
          format={(n) => String(n)}
          hint={`${d?.progresso.atual ?? 0} de ${d?.progresso.alvo ?? 0} etapas cadastradas`}
          tone="success"
        />
        <DashboardCard title="Fila de etapas" hint="Ordem de execução" className="xl:col-span-2">
          <StatusList items={d?.fila ?? []} empty="Nenhuma etapa atribuída no momento." />
        </DashboardCard>
      </div>
    </DashboardShell>
  );
}
