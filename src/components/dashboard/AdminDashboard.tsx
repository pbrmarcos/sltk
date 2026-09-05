import { Users, Shield, Settings, ScrollText } from "lucide-react";
import { KpiCard } from "./KpiCard";
import { GaugeCard } from "./GaugeCard";
import { DashboardCard } from "./DashboardCard";
import { DashboardShell } from "./DashboardShell";
import { StatusList } from "./StatusList";
import { HeatStrip } from "./HeatStrip";
import { useRoleDashboards } from "./useRoleDashboards";

export function AdminDashboard({ userName }: { userName: string }) {
  const { data, isLoading } = useRoleDashboards();
  const d = data?.admin;
  const saude = d?.saudeGeral ?? 0;

  return (
    <DashboardShell
      userName={userName}
      roleLabel="Administração"
      subtitle="Saúde do sistema, fila operacional e auditoria."
      actions={[
        { label: "Usuários", to: "/admin/usuarios", icon: Users },
        { label: "SLA", to: "/admin/sla-chamados", icon: Shield },
        { label: "Auditoria", to: "/admin/auditoria", icon: ScrollText },
        { label: "Configurações", to: "/admin/configuracoes", icon: Settings },
      ]}
    >
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard
          label="Chamados fora do SLA"
          value={isLoading ? "…" : String(d?.kpis.chamadosSla ?? 0)}
          accent="danger"
        />
        <KpiCard
          label="Formulários > 72h"
          value={isLoading ? "…" : String(d?.kpis.formulariosPendentes ?? 0)}
          accent="warning"
        />
        <KpiCard
          label="OCs para aprovar"
          value={isLoading ? "…" : String(d?.kpis.ocsAprovar ?? 0)}
          accent="primary"
        />
        <KpiCard
          label="Erros enriquec. (24h)"
          value={isLoading ? "…" : String(d?.kpis.erros24h ?? 0)}
          accent="danger"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <GaugeCard
          label="Saúde geral do sistema"
          value={saude}
          tone={saude >= 0.85 ? "success" : saude >= 0.6 ? "primary" : "warning"}
          hint="Proporção de pendências sem criticidade"
        />
        <DashboardCard
          title="Pendências por módulo"
          hint="Contagem de itens em fila"
          className="xl:col-span-2"
        >
          <HeatStrip
            segments={d?.modulos ?? []}
            hint="Distribuição de pendências abertas por área."
          />
        </DashboardCard>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <DashboardCard title="Fila operacional" hint="Precisa de ação">
          <StatusList items={d?.fila ?? []} empty="Nada pendente." />
        </DashboardCard>
        <DashboardCard title="Auditoria recente" hint="Últimos registros">
          {d?.auditoria.length ? (
            <ul className="space-y-3 text-sm">
              {d.auditoria.map((a) => (
                <li key={a.id} className="border-l border-[var(--bg-border)] pl-3">
                  <div className="text-[13px] font-medium text-[var(--text-primary)]">
                    {a.actor}
                  </div>
                  <div className="text-[11.5px] leading-5 text-[var(--text-muted)]">
                    {a.action}{" "}
                    <span className="font-medium text-[var(--text-primary)]">{a.target}</span>
                  </div>
                  <div className="mt-0.5 text-[11px] text-[var(--text-muted)]/80">{a.when}</div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="py-6 text-center text-[12px] text-[var(--text-muted)]">
              Sem registros de auditoria.
            </div>
          )}
        </DashboardCard>
      </div>
    </DashboardShell>
  );
}
