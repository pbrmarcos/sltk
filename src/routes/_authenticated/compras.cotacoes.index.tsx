import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TableEmpty, TableError, TableSkeleton } from "@/components/data/TableStates";
import { Plus, Search, FileText, ShoppingCart, ExternalLink } from "lucide-react";
import { listCotacoes } from "@/lib/cotacoes.functions";
import { listInsumosRfq } from "@/lib/projeto-insumos.functions";
import {
  COTACAO_STATUS,
  COTACAO_STATUS_COLOR,
  COTACAO_STATUS_LABEL,
  type CotacaoStatus,
} from "@/lib/cotacoes.shared";
import {
  INSUMO_STATUS_COLOR,
  INSUMO_STATUS_LABEL,
  type InsumoStatus,
} from "@/lib/projeto-insumos.shared";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/compras/cotacoes/")({
  component: CotacoesListPage,
});

function CotacoesListPage() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"todos" | CotacaoStatus>("todos");
  const listFn = useServerFn(listCotacoes);
  const listInsumosFn = useServerFn(listInsumosRfq);

  const listQ = useQuery({
    queryKey: ["cotacoes", "list", { q, status }],
    queryFn: () => listFn({ data: { q: q || undefined, status } }),
    placeholderData: keepPreviousData,
  });

  const insumosQ = useQuery({
    queryKey: ["cotacoes", "insumos-rfq", { q }],
    queryFn: () => listInsumosFn({ data: { q: q || "", status: "todos" } }),
    placeholderData: keepPreviousData,
  });

  const rows = (listQ.data?.rows ?? []) as Array<{
    id: string;
    codigo: string;
    titulo: string;
    status: string;
    prazo_resposta: string | null;
    convites: number;
    respondidos: number;
  }>;
  const insumos = (insumosQ.data ?? []) as Array<{
    id: string;
    codigo_interno: string | null;
    descricao: string;
    part_number: string | null;
    fabricante_sugerido: string | null;
    disciplina: string;
    unidade: string;
    quantidade: number;
    criticidade: string;
    status: string;
    necessidade_em: string | null;
    docs_gerados: number;
    convites: number;
    respondidos: number;
    ordem_compra_id: string | null;
    clientes?: { codigo: string; razao_social: string } | null;
    equipamento_projetos?: {
      revisao: string;
      cliente_equipamentos?: { codigo: string } | null;
    } | null;
  }>;

  const total = (listQ.data?.total ?? 0) + insumos.length;
  const abertas =
    rows.filter((r) => r.status === "aberta").length +
    insumos.filter((i) => i.status === "em_cotacao").length;
  const respondidas =
    rows.filter((r) => r.status === "respondida").length +
    insumos.filter((i) => i.status === "pronto_aprovacao" || i.status === "cotado").length;
  const encerradas =
    rows.filter((r) => r.status === "escolhida" || r.status === "encerrada").length +
    insumos.filter((i) => i.status === "em_compra").length;

  return (
    <PageContainer>
      <PageHeader
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Compras" },
          { label: "Cotações (Checklist)" },
        ]}
        title="Cotações (Checklist)"
        subtitle="Pedidos de cotação a fornecedores e comparativo de propostas"
        actions={
          <Button asChild>
            <Link to="/compras/cotacoes/nova">
              <Plus className="mr-2 size-4" /> Nova cotação
            </Link>
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <KpiCard label="Total" value={total} />
        <KpiCard label="Abertas" value={abertas} />
        <KpiCard label="Respondidas" value={respondidas} />
        <KpiCard label="Encerradas / escolhidas" value={encerradas} />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 size-4 -translate-y-1/2 text-[var(--text-muted)]" />
          <Input
            placeholder="Buscar por código, título, descrição ou PN..."
            className="pl-8 w-80"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos status</SelectItem>
            {COTACAO_STATUS.map((s) => (
              <SelectItem key={s} value={s}>
                {COTACAO_STATUS_LABEL[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Checklists formais (agrupados) */}
      <div className="mt-6">
        <div className="flex items-baseline justify-between mb-2">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">Checklists formais (agrupados)</h2>
          <span className="text-xs text-[var(--text-secondary)]">{rows.length} registro(s)</span>
        </div>
        <div className="rounded-md border bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Título</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Prazo</TableHead>
                <TableHead>Convidados</TableHead>
                <TableHead>Respostas</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {listQ.isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="p-0">
                    <TableSkeleton columns={7} rows={4} />
                  </TableCell>
                </TableRow>
              ) : listQ.error ? (
                <TableRow>
                  <TableCell colSpan={7}>
                    <TableError
                      description={(listQ.error as Error).message}
                      onRetry={() => listQ.refetch()}
                    />
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7}>
                    <TableEmpty title="Nenhuma cotação formal encontrada." />
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs">{r.codigo}</TableCell>
                    <TableCell className="font-medium">{r.titulo}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn(COTACAO_STATUS_COLOR[r.status as CotacaoStatus])}
                      >
                        {COTACAO_STATUS_LABEL[r.status as CotacaoStatus]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {r.prazo_resposta
                        ? new Date(r.prazo_resposta).toLocaleDateString("pt-BR")
                        : "—"}
                    </TableCell>
                    <TableCell>{r.convites}</TableCell>
                    <TableCell>
                      {r.respondidos}/{r.convites}
                    </TableCell>
                    <TableCell>
                      <Button asChild size="sm" variant="ghost">
                        <Link to="/compras/cotacoes/$id" params={{ id: r.id }}>
                          Abrir
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Checklist por Insumo (fluxo direto da solicitação) */}
      <div className="mt-8">
        <div className="flex items-baseline justify-between mb-2">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">
            Checklist por Insumo (fluxo direto)
          </h2>
          <span className="text-xs text-[var(--text-secondary)]">{insumos.length} registro(s)</span>
        </div>
        <div className="rounded-md border bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Cliente / Equip.</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Docs</TableHead>
                <TableHead>Envios</TableHead>
                <TableHead>Necessidade</TableHead>
                <TableHead className="w-56 text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {insumosQ.isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="p-0">
                    <TableSkeleton columns={7} rows={4} />
                  </TableCell>
                </TableRow>
              ) : insumosQ.error ? (
                <TableRow>
                  <TableCell colSpan={7}>
                    <TableError
                      description={(insumosQ.error as Error).message}
                      onRetry={() => insumosQ.refetch()}
                    />
                  </TableCell>
                </TableRow>
              ) : insumos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7}>
                    <TableEmpty title="Nenhum checklist emitido a partir de solicitação de compra." />
                  </TableCell>
                </TableRow>
              ) : (
                insumos.map((i) => {
                  const podeEmitirOc =
                    (i.status === "cotado" || i.status === "pronto_aprovacao") &&
                    !i.ordem_compra_id;
                  return (
                    <TableRow key={i.id}>
                      <TableCell>
                        <div className="font-medium text-sm leading-tight">{i.descricao}</div>
                        <div className="text-[11px] font-mono text-[var(--text-secondary)]">
                          {i.codigo_interno ?? "—"}
                          {i.fabricante_sugerido ? ` · ${i.fabricante_sugerido}` : ""}
                          {i.part_number ? ` · PN ${i.part_number}` : ""}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">
                        <div>{i.clientes?.codigo ?? "—"}</div>
                        <div className="text-[var(--text-secondary)]">
                          {i.equipamento_projetos?.cliente_equipamentos?.codigo ?? "—"}
                          {i.equipamento_projetos?.revisao
                            ? ` · Rev. ${i.equipamento_projetos.revisao}`
                            : ""}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(INSUMO_STATUS_COLOR[i.status as InsumoStatus])}
                        >
                          {INSUMO_STATUS_LABEL[i.status as InsumoStatus]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">
                        <span className="inline-flex items-center gap-1">
                          <FileText className="h-3 w-3 text-[var(--text-muted)]" />
                          {i.docs_gerados}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs">
                        {i.respondidos}/{i.convites}
                      </TableCell>
                      <TableCell className="text-xs">
                        {i.necessidade_em
                          ? new Date(i.necessidade_em).toLocaleDateString("pt-BR")
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              navigate({
                                to: "/compras/solicitacao",
                                search: { insumo_id: i.id } as never,
                              })
                            }
                          >
                            Abrir
                          </Button>
                          {i.ordem_compra_id ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                navigate({
                                  to: "/compras/ordens/$id",
                                  params: { id: i.ordem_compra_id! },
                                })
                              }
                            >
                              <ExternalLink className="h-3 w-3 mr-1" />
                              OC
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              disabled={!podeEmitirOc}
                              title={
                                podeEmitirOc
                                  ? "Emitir Ordem de Compra"
                                  : "Disponível quando o insumo estiver Cotado ou Pronto p/ aprovação"
                              }
                              onClick={() =>
                                navigate({
                                  to: "/compras/ordens/nova",
                                  search: { insumo_id: i.id } as never,
                                })
                              }
                            >
                              <ShoppingCart className="h-3 w-3 mr-1" />
                              Emitir OC
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </PageContainer>
  );
}

function KpiCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border bg-white p-4">
      <div className="text-xs text-[var(--text-secondary)]">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </div>
  );
}
