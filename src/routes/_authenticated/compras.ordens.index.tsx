import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, keepPreviousData, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
import { TableEmpty } from "@/components/data/TableStates";
import {
  Plus,
  Search,
  FileText,
  Clock,
  CheckCircle2,
  Send,
  PackageCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import {
  listOrdensCompra,
  getOrdensCompraKpis,
  createOrdemDeInsumo,
} from "@/lib/ordens-compra.functions";
import { listInsumosAguardandoOC } from "@/lib/projeto-insumos.functions";
import {
  OC_STATUS,
  OC_STATUS_COLOR,
  OC_STATUS_LABEL,
  type OcStatus,
} from "@/lib/ordens-compra.shared";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/compras/ordens/")({
  component: OrdensListPage,
});

function fmtBRL(v: number, moeda = "BRL") {
  try {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: moeda }).format(v || 0);
  } catch {
    return `${moeda} ${v?.toFixed(2)}`;
  }
}

function fmtDate(s?: string | null) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("pt-BR");
}

function OrdensListPage() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"todos" | OcStatus>("todos");
  const [tipo, setTipo] = useState<"todos" | "normal" | "terceiros">("todos");
  const listFn = useServerFn(listOrdensCompra);
  const kpiFn = useServerFn(getOrdensCompraKpis);
  const aguardandoFn = useServerFn(listInsumosAguardandoOC);
  const emitirFn = useServerFn(createOrdemDeInsumo);
  const navigate = useNavigate();
  const qc = useQueryClient();

  const listQ = useQuery({
    queryKey: ["ordens", "list", { q, status, tipo }],
    queryFn: () => listFn({ data: { q: q || undefined, status, tipo } }),
    placeholderData: keepPreviousData,
  });
  const kpiQ = useQuery({ queryKey: ["ordens", "kpis"], queryFn: () => kpiFn() });
  const aguardandoQ = useQuery({
    queryKey: ["ordens", "aguardando-oc"],
    queryFn: () => aguardandoFn(),
  });

  const emitirMut = useMutation({
    mutationFn: (insumo_id: string) => emitirFn({ data: { insumo_id } }),
    onSuccess: (res: any) => {
      toast.success(`OC ${res?.numero ?? ""} emitida`);
      qc.invalidateQueries({ queryKey: ["ordens"] });
      if (res?.id) navigate({ to: "/compras/ordens/$id", params: { id: res.id } });
    },
    onError: (e: Error) => toast.error(e.message || "Falha ao emitir OC"),
  });

  const rows = listQ.data?.rows ?? [];
  const kpis = kpiQ.data;
  const aguardando = (aguardandoQ.data ?? []) as any[];

  return (
    <PageContainer>
      <PageHeader
        breadcrumbs={[
          { label: "Compras", href: "/compras/solicitacao" },
          { label: "Ordens de Compra" },
        ]}
        title="Ordens de Compra"
        subtitle="Gere, aprove e acompanhe as OCs emitidas para os fornecedores."
        actions={
          <Button asChild>
            <Link to="/compras/ordens/nova">
              <Plus className="h-4 w-4" /> Nova OC
            </Link>
          </Button>
        }
      />

      {/* Banner: insumos aprovados aguardando emissão de OC */}
      {aguardando.length > 0 && (
        <div className="mb-4 rounded-lg border border-amber-300/60 bg-gradient-to-r from-amber-50 to-white dark:from-amber-950/30 dark:to-transparent dark:border-amber-800/60">
          <div className="p-4 flex items-start gap-3 border-b border-amber-200/60 dark:border-amber-800/40">
            <div className="rounded-md bg-amber-500/15 p-2 text-amber-700 dark:text-amber-300">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-amber-900 dark:text-amber-100">
                  {aguardando.length}{" "}
                  {aguardando.length === 1 ? "solicitação aprovada" : "solicitações aprovadas"}{" "}
                  aguardando emissão
                </h3>
                <Badge
                  variant="outline"
                  className="border-amber-300 text-amber-800 dark:text-amber-200"
                >
                  Ação rápida
                </Badge>
              </div>
              <p className="text-sm text-amber-800/80 dark:text-amber-200/80 mt-0.5">
                Insumos já aprovados por engenharia/gerência. Clique em <b>Emitir OC</b> para gerar
                a Ordem de Compra em um clique — os PDFs (PT/ES/EN) são salvos automaticamente no
                Drive.
              </p>
            </div>
          </div>
          <div className="divide-y divide-amber-200/50 dark:divide-amber-800/40">
            {aguardando.slice(0, 5).map((r: any) => (
              <div key={r.insumo_id} className="p-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                      {r.codigo_interno || r.part_number || "—"}
                    </span>
                    <span className="truncate font-medium">{r.descricao}</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5 flex flex-wrap gap-x-3">
                    <span>
                      Qtd:{" "}
                      <b>
                        {r.quantidade} {r.unidade}
                      </b>
                    </span>
                    {r.fornecedor_sugerido_nome && (
                      <span>
                        Fornecedor: <b>{r.fornecedor_sugerido_nome}</b>
                      </span>
                    )}
                    {r.valor_previsto != null && (
                      <span>
                        Valor:{" "}
                        <b>
                          {new Intl.NumberFormat("pt-BR", {
                            style: "currency",
                            currency: r.moeda_prevista || "BRL",
                          }).format(Number(r.valor_previsto))}
                        </b>
                      </span>
                    )}
                    {r.lead_time_dias != null && <span>Prazo: {r.lead_time_dias} dias</span>}
                    {r.cliente_codigo && <span>Cliente: {r.cliente_codigo}</span>}
                    {r.necessidade_em && <span>Necessidade: {fmtDate(r.necessidade_em)}</span>}
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => emitirMut.mutate(r.insumo_id)}
                  disabled={emitirMut.isPending}
                  className="bg-amber-600 hover:bg-amber-700 text-white"
                >
                  <Zap className="h-4 w-4" /> Emitir OC
                </Button>
              </div>
            ))}
            {aguardando.length > 5 && (
              <div className="p-2 text-center text-xs text-muted-foreground">
                +{aguardando.length - 5} outros insumos aguardando emissão
              </div>
            )}
          </div>
        </div>
      )}

      {/* KPIs */}
      <div className="grid gap-3 md:grid-cols-5 mb-4">
        <KpiCard icon={FileText} label="Total" value={kpis?.total ?? 0} color="text-[var(--text-primary)]" />
        <KpiCard
          icon={Clock}
          label="Aguardando"
          value={kpis?.aguardando ?? 0}
          color="text-amber-700"
        />
        <KpiCard
          icon={CheckCircle2}
          label="Aprovadas"
          value={kpis?.aprovadas ?? 0}
          color="text-blue-700"
        />
        <KpiCard icon={Send} label="Enviadas" value={kpis?.enviadas ?? 0} color="text-indigo-700" />
        <KpiCard
          icon={PackageCheck}
          label="Recebidas"
          value={kpis?.recebidas ?? 0}
          color="text-emerald-700"
        />
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2 mb-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por número ou fornecedor..."
            className="pl-9"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os status</SelectItem>
            {OC_STATUS.map((s) => (
              <SelectItem key={s} value={s}>
                {OC_STATUS_LABEL[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={tipo} onValueChange={(v) => setTipo(v as typeof tipo)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os tipos</SelectItem>
            <SelectItem value="normal">Normal</SelectItem>
            <SelectItem value="terceiros">Terceiros</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tabela */}
      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[120px]">Número</TableHead>
              <TableHead>Fornecedor</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Emissão</TableHead>
              <TableHead>Entrega</TableHead>
              <TableHead className="text-right">Valor total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={7}>
                  <TableEmpty title="Nenhuma OC encontrada" />
                </TableCell>
              </TableRow>
            )}
            {rows.map((r: any) => (
              <TableRow key={r.id} className="cursor-pointer hover:bg-muted/50">
                <TableCell className="font-mono font-medium">
                  <Link to="/compras/ordens/$id" params={{ id: r.id }} className="hover:underline">
                    {r.numero}
                  </Link>
                </TableCell>
                <TableCell>
                  {r.fornecedor_razao_social || r.fornecedor_nome_fantasia || "—"}
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={cn("border", OC_STATUS_COLOR[r.status as OcStatus])}
                  >
                    {OC_STATUS_LABEL[r.status as OcStatus]}
                  </Badge>
                </TableCell>
                <TableCell className="capitalize">{r.tipo}</TableCell>
                <TableCell>{fmtDate(r.emissao_em)}</TableCell>
                <TableCell>{fmtDate(r.entrega_prevista)}</TableCell>
                <TableCell className="text-right font-medium">
                  {fmtBRL(Number(r.valor_total ?? 0), r.moeda)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </PageContainer>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <Icon className={cn("h-8 w-8", color)} />
        <div>
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="text-2xl font-semibold">{value}</div>
        </div>
      </CardContent>
    </Card>
  );
}
