import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { listFats, FAT_STATUS_LABEL } from "@/lib/fat.functions";
import { TableError } from "@/components/data/TableStates";

export const Route = createFileRoute("/_authenticated/qualidade/fat/")({
  component: FatListPage,
});

function FatListPage() {
  const fetchFn = useServerFn(listFats);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("todos");
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["fat", "list", q, status],
    queryFn: () => fetchFn({ data: { q, status } }),
  });
  return (
    <PageContainer>
      <PageHeader
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "Qualidade" }, { label: "FAT" }]}
        title="FAT — Factory Acceptance Test"
        subtitle="Validação final de equipamentos antes do embarque"
        actions={
          <Button asChild>
            <Link to="/qualidade/fat/novo">Novo FAT</Link>
          </Button>
        }
      />
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_200px]">
        <Input placeholder="Buscar por código ou TAG…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="h-10 rounded-[var(--radius-md)] border border-[var(--bg-border)] bg-[var(--bg-surface)] px-3 text-sm"
        >
          <option value="todos">Todos os status</option>
          {Object.entries(FAT_STATUS_LABEL).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>
      <div className="rounded-[var(--radius-lg)] border border-[var(--bg-border)] bg-[var(--bg-surface)] shadow-[var(--shadow-sm)]">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-[var(--text-muted)]">Carregando…</div>
        ) : error ? (
          <TableError description={(error as Error).message} onRetry={() => refetch()} />
        ) : !data?.rows.length ? (
          <div className="p-8 text-center text-sm text-[var(--text-muted)]">
            Nenhum FAT encontrado. Clique em "Novo FAT" para começar.
          </div>
        ) : (
          <ul className="divide-y divide-[var(--bg-border)]">
            {data.rows.map((r) => (
              <li key={r.id}>
                <Link
                  to="/qualidade/fat/$id"
                  params={{ id: r.id }}
                  className="grid grid-cols-1 gap-2 p-4 hover:bg-[var(--bg-elevated)] sm:grid-cols-[120px_1fr_auto] sm:items-center"
                >
                  <span className="font-mono text-sm font-semibold">{r.codigo ?? "—"}</span>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{r.processo_nome}</div>
                    <div className="truncate text-xs text-[var(--text-muted)]">
                      {r.cliente_nome} {r.tag_equipamento ? `· ${r.tag_equipamento}` : ""}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-[var(--text-muted)]">{r.progresso}%</span>
                    <Badge variant="secondary">{FAT_STATUS_LABEL[r.status] ?? r.status}</Badge>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </PageContainer>
  );
}