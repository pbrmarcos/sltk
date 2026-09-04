import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { Plus, Search, Truck, X } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  listEmbarques,
  listTransportadoras,
  listClientesComEmbarques,
  LOGISTICA_STATUS,
  type LogisticaStatus,
} from "@/lib/logistica.functions";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/logistica/embarques/")({
  head: () => ({
    meta: [
      { title: "Logística & Embarque — Solutek Hub" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: EmbarquesIndex,
});

const STATUS_TONE: Record<LogisticaStatus, string> = {
  rascunho: "bg-slate-100 text-slate-700 border-slate-200",
  programado: "bg-blue-50 text-blue-700 border-blue-200",
  embarcado: "bg-amber-50 text-amber-800 border-amber-200",
  entregue: "bg-emerald-50 text-emerald-700 border-emerald-200",
  cancelado: "bg-rose-50 text-rose-700 border-rose-200",
};

const ALL = "all";

function EmbarquesIndex() {
  const { role } = useAuth();
  const canCreate = role === "admin" || role === "manager" || role === "field";

  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>(ALL);
  const [clienteId, setClienteId] = useState<string>(ALL);
  const [transportadoraId, setTransportadoraId] = useState<string>(ALL);
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  const listFn = useServerFn(listEmbarques);
  const embarques = useQuery({
    queryKey: ["logistica", "embarques", { q, status, clienteId, transportadoraId, dateFrom, dateTo }],
    queryFn: () =>
      listFn({
        data: {
          q: q || undefined,
          status: status === ALL ? undefined : (status as LogisticaStatus),
          clienteId: clienteId === ALL ? undefined : clienteId,
          transportadoraId: transportadoraId === ALL ? undefined : transportadoraId,
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
        },
      }),
  });

  const clientesFn = useServerFn(listClientesComEmbarques);
  const clientes = useQuery({
    queryKey: ["logistica", "clientes-com-embarques"],
    queryFn: () => clientesFn(),
  });

  const transportadorasFn = useServerFn(listTransportadoras);
  const transportadoras = useQuery({
    queryKey: ["logistica", "transportadoras"],
    queryFn: () => transportadorasFn(),
  });

  const hasFilters = useMemo(
    () =>
      q ||
      status !== ALL ||
      clienteId !== ALL ||
      transportadoraId !== ALL ||
      dateFrom ||
      dateTo,
    [q, status, clienteId, transportadoraId, dateFrom, dateTo],
  );

  function clearFilters() {
    setQ("");
    setStatus(ALL);
    setClienteId(ALL);
    setTransportadoraId(ALL);
    setDateFrom("");
    setDateTo("");
  }

  return (
    <PageContainer>
      <PageHeader
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "Logística" }]}
        title="Logística & Embarque"
        subtitle="Romaneio, embarque e entrega do equipamento pronto."
        actions={
          canCreate && (
            <Button asChild size="sm">
              <Link to="/logistica/embarques/novo">
                <Plus className="mr-1.5 h-4 w-4" /> Novo embarque
              </Link>
            </Button>
          )
        }
      />

      <div className="mb-6 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[240px] flex-1 max-w-md">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-[var(--text-muted)]" />
            <Input
              placeholder="Buscar por número, NF ou destino…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pl-8"
            />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-[170px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todos os status</SelectItem>
              {LOGISTICA_STATUS.map((s) => (
                <SelectItem key={s} value={s} className="capitalize">
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={clienteId} onValueChange={setClienteId}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Cliente" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todos os clientes</SelectItem>
              {(clientes.data ?? []).map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={transportadoraId} onValueChange={setTransportadoraId}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Transportadora" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todas as transportadoras</SelectItem>
              {(transportadoras.data ?? []).map((t: any) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
            <span>Prev. saída de</span>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="h-8 w-[150px]"
            />
            <span>até</span>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="h-8 w-[150px]"
            />
          </div>
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8">
              <X className="mr-1 h-3.5 w-3.5" /> Limpar filtros
            </Button>
          )}
          <div className="ml-auto text-xs text-[var(--text-muted)]">
            {embarques.data ? `${embarques.data.length} embarque(s)` : ""}
          </div>
        </div>
      </div>

      {embarques.isLoading ? (
        <p className="text-sm text-[var(--text-muted)]">Carregando…</p>
      ) : (embarques.data?.length ?? 0) === 0 ? (
        <div className="rounded-lg border border-dashed border-[var(--bg-border)] bg-[var(--bg-surface)] p-10 text-center">
          <Truck className="mx-auto mb-3 h-10 w-10 text-[var(--text-muted)] opacity-40" />
          <p className="text-sm text-[var(--text-muted)]">
            {hasFilters ? "Nenhum embarque encontrado para os filtros aplicados." : "Nenhum embarque cadastrado."}
            {canCreate && !hasFilters && (
              <>
                {" "}
                <Link to="/logistica/embarques/novo" className="underline">
                  Criar o primeiro
                </Link>
                .
              </>
            )}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-[var(--bg-border)] bg-[var(--bg-surface)]">
          <table className="w-full text-sm">
            <thead className="bg-[var(--bg-elevated)] text-left text-xs uppercase text-[var(--text-muted)]">
              <tr>
                <th className="px-3 py-2">Número</th>
                <th className="px-3 py-2">Cliente / Equipamento</th>
                <th className="px-3 py-2">Transportadora</th>
                <th className="px-3 py-2">Prev. saída</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {(embarques.data ?? []).map((e: any) => {
                const cli = e.projeto?.cliente;
                const eq = e.projeto?.equipamento;
                return (
                  <tr
                    key={e.id}
                    className="cursor-pointer border-t border-[var(--bg-border)] hover:bg-[var(--bg-elevated)]"
                  >
                    <td className="px-3 py-2 font-medium">
                      <Link
                        to="/logistica/embarques/$id"
                        params={{ id: e.id }}
                        className="hover:underline"
                      >
                        {e.numero}
                      </Link>
                    </td>
                    <td className="px-3 py-2">
                      <div className="text-[var(--text-primary)]">
                        {cli?.nome_fantasia || cli?.razao_social || "—"}
                      </div>
                      <div className="text-xs text-[var(--text-muted)]">
                        {eq?.apelido || eq?.modelo || "—"}
                      </div>
                    </td>
                    <td className="px-3 py-2">{e.transportadora?.nome || "—"}</td>
                    <td className="px-3 py-2 text-xs">
                      {e.previsao_saida ? new Date(e.previsao_saida).toLocaleDateString("pt-BR") : "—"}
                    </td>
                    <td className="px-3 py-2">
                      <Badge variant="outline" className={`text-[10px] uppercase ${STATUS_TONE[e.status as LogisticaStatus]}`}>
                        {e.status}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </PageContainer>
  );
}
