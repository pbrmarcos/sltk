import { Link } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge, type BadgeTone } from "@/components/ui/status-badge";
import { useRoleDashboards } from "@/components/dashboard/useRoleDashboards";

const TONE: Record<string, BadgeTone> = {
  CRÍTICO: "danger",
  ATENÇÃO: "warning",
  FILA: "info",
  REVISÃO: "warning",
  OK: "success",
};

export function AdministracaoTab() {
  const { data, isLoading } = useRoleDashboards();
  const d = data?.admin;

  const metrics = [
    {
      key: "sla",
      label: "Chamados fora do SLA",
      value: d?.kpis.chamadosSla ?? 0,
      to: "/pos-vendas/chamados",
      bad: true,
    },
    {
      key: "forms",
      label: "Formulários sem leitura (72h)",
      value: d?.kpis.formulariosPendentes ?? 0,
      to: "/central-documentos",
      bad: true,
    },
    {
      key: "ocs",
      label: "OCs aguardando aprovação",
      value: d?.kpis.ocsAprovar ?? 0,
      to: "/compras/ordens",
      bad: false,
    },
    {
      key: "erros",
      label: "Erros de enriquecimento (24h)",
      value: d?.kpis.erros24h ?? 0,
      to: "/admin/configuracoes",
      bad: true,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((m) => (
          <Link
            key={m.key}
            to={m.to}
            className="block rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-accent"
          >
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {m.label}
            </div>
            <div className="mt-2 flex items-baseline justify-between gap-2">
              <div className="text-2xl font-semibold tabular-nums">{isLoading ? "…" : m.value}</div>
              <StatusBadge tone={m.value === 0 ? "success" : m.bad ? "danger" : "info"}>
                {m.value === 0 ? "OK" : "AÇÃO"}
              </StatusBadge>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Fila operacional</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-border">
              {(d?.fila ?? []).map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{item.titulo}</div>
                    <div className="truncate text-xs text-muted-foreground">{item.meta}</div>
                  </div>
                  <StatusBadge tone={TONE[item.status] ?? "neutral"}>{item.status}</StatusBadge>
                </li>
              ))}
              {!isLoading && !d?.fila.length && (
                <li className="py-6 text-center text-xs text-muted-foreground">Nada pendente.</li>
              )}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pendências por módulo</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {(d?.modulos ?? []).map((m) => (
                <li key={m.label} className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-muted-foreground">{m.label}</span>
                  <StatusBadge tone={m.value === 0 ? "success" : "info"}>{m.value}</StatusBadge>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Auditoria recente</CardTitle>
          <Button asChild size="sm" variant="ghost" className="h-8 px-2 text-xs">
            <Link to="/admin/auditoria">Ver tudo</Link>
          </Button>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3 text-sm">
            {(d?.auditoria ?? []).map((a) => (
              <li key={a.id} className="border-l border-border pl-3">
                <div className="font-medium">{a.actor}</div>
                <div className="text-xs leading-5 text-muted-foreground">
                  {a.action} <span className="font-medium text-foreground">{a.target}</span>
                </div>
                <div className="mt-0.5 text-[11px] text-muted-foreground/80">{a.when}</div>
              </li>
            ))}
            {!isLoading && !d?.auditoria.length && (
              <li className="py-6 text-center text-xs text-muted-foreground">
                Sem registros ainda.
              </li>
            )}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
