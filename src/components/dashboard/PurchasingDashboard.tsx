import { ShoppingCart, FileSearch, PackageCheck } from "lucide-react";
import { KpiCard } from "./KpiCard";
import { DashboardCard } from "./DashboardCard";
import { DashboardShell } from "./DashboardShell";
import { StatusList } from "./StatusList";
import { useRoleDashboards } from "./useRoleDashboards";

const fmtBRL = (n: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(n);

export function PurchasingDashboard({ userName }: { userName: string }) {
  const { data, isLoading } = useRoleDashboards();
  const d = data?.purchasing;

  return (
    <DashboardShell
      userName={userName}
      roleLabel="Compras · PCP"
      subtitle="Ordens para aprovar, cotações em andamento e gasto do mês."
      actions={[
        { label: "Ordens", to: "/compras/ordens", icon: ShoppingCart },
        { label: "Cotações", to: "/compras/cotacoes", icon: FileSearch },
        { label: "Solicitações", to: "/compras/solicitacao", icon: PackageCheck },
      ]}
    >
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard
          label="OCs para aprovar"
          value={isLoading ? "…" : String(d?.kpis.ocsAprovar ?? 0)}
          accent="warning"
        />
        <KpiCard
          label="Cotações abertas"
          value={isLoading ? "…" : String(d?.kpis.cotacoesAbertas ?? 0)}
          accent="primary"
        />
        <KpiCard label="Gasto no mês" value={isLoading ? "…" : fmtBRL(d?.kpis.gastoMes ?? 0)} />
        <KpiCard
          label="Insumos aguardando"
          value={isLoading ? "…" : String(d?.kpis.insumosAguardando ?? 0)}
          accent="primary"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <DashboardCard title="Ordens pendentes" hint="Fila de aprovação">
          <StatusList items={d?.ocs ?? []} empty="Nenhuma ordem aguardando aprovação." />
        </DashboardCard>
        <DashboardCard title="Cotações em andamento" hint="Aguardando respostas ou análise">
          <StatusList items={d?.cotacoes ?? []} empty="Nenhuma cotação aberta." />
        </DashboardCard>
      </div>
    </DashboardShell>
  );
}
