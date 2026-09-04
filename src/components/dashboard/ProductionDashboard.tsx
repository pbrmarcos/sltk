import { Factory, ClipboardCheck, AlertTriangle } from "lucide-react";
import { KpiCard } from "./KpiCard";
import { GaugeCard } from "./GaugeCard";
import { DashboardCard } from "./DashboardCard";
import { DashboardShell } from "./DashboardShell";
import { StatusList } from "./StatusList";
import { HeatStrip } from "./HeatStrip";
import { useRoleDashboards } from "./useRoleDashboards";

export function ProductionDashboard({ userName }: { userName: string }) {
  const { data, isLoading } = useRoleDashboards();
  const d = data?.production;
  const aderencia = d?.aderencia ?? 0;

  return (
    <DashboardShell
      userName={userName}
      roleLabel="Automação · Produção"
      subtitle="Montagens em execução, aderência de prazo e não conformidades."
      actions={[
        { label: "Kanban montagem", to: "/producao/montagem", icon: Factory },
        { label: "FAT", to: "/qualidade/fat", icon: ClipboardCheck },
        { label: "NCs", to: "/qualidade/rnc", icon: AlertTriangle },
      ]}
    >
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard label="Em execução" value={isLoading ? "…" : String(d?.kpis.osExecucao ?? 0)} accent="primary" />
        <KpiCard label="Atrasadas" value={isLoading ? "…" : String(d?.kpis.atrasadas ?? 0)} accent="danger" />
        <KpiCard label="Entregas na semana" value={isLoading ? "…" : String(d?.kpis.entregasSemana ?? 0)} accent="success" />
        <KpiCard label="NCs abertas" value={isLoading ? "…" : String(d?.kpis.ncAbertas ?? 0)} accent="warning" />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <GaugeCard
          label="Aderência de prazo"
          value={aderencia}
          tone={aderencia >= 0.9 ? "success" : aderencia >= 0.75 ? "primary" : "warning"}
          hint="Montagens concluídas dentro da previsão"
        />
        <DashboardCard title="Montagens por situação" hint="Distribuição atual" className="xl:col-span-2">
          <HeatStrip segments={d?.etapasHeat ?? []} hint="Onde estão os itens de produção." />
        </DashboardCard>
      </div>

      <DashboardCard title="Próximas entregas" hint="Por previsão de término">
        <StatusList items={d?.entregas ?? []} empty="Nenhuma montagem cadastrada ainda." />
      </DashboardCard>
    </DashboardShell>
  );
}
