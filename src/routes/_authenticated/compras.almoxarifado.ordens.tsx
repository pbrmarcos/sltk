import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
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
  Activity,
  ClipboardList,
  PackageCheck,
  RefreshCw,
  Search,
  TriangleAlert,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getOcPainel, listOcsPainel } from "@/lib/almoxarifado.functions";

export const Route = createFileRoute("/_authenticated/compras/almoxarifado/ordens")({
  head: () => ({
    meta: [
      { title: "Ordens de compra — saldo e movimentos | Solutek Hub" },
      {
        name: "description",
        content:
          "Acompanhe em tempo real o que falta receber de cada ordem de compra e o custo médio dos itens.",
      },
      { property: "og:title", content: "Ordens de compra — saldo e movimentos" },
      {
        property: "og:description",
        content: "Pendências de recebimento e custo médio por item, em tempo real.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: OcsPainelPage,
});

const fmtQtd = (v: unknown) => Number(v ?? 0).toLocaleString("pt-BR", { maximumFractionDigits: 3 });
const fmtMoeda = (v: unknown, moeda = "BRL") =>
  Number(v ?? 0).toLocaleString("pt-BR", { style: "currency", currency: moeda || "BRL" });
const fmtData = (v: unknown) => (v ? new Date(String(v)).toLocaleDateString("pt-BR") : "—");
const fmtDataHora = (v: unknown) => (v ? new Date(String(v)).toLocaleString("pt-BR") : "—");

const TIPO_LABEL: Record<string, string> = {
  entrada_oc: "Entrada por OC",
  entrada_avulsa: "Entrada avulsa",
  saida_projeto: "Saída p/ projeto",
  saida_avulsa: "Saída avulsa",
  devolucao: "Devolução",
  ajuste: "Ajuste",
  transferencia: "Transferência",
};

function OcsPainelPage() {
  const qc = useQueryClient();
  const listar = useServerFn(listOcsPainel);
  const detalhe = useServerFn(getOcPainel);

  const [q, setQ] = useState("");
  const [somentePendentes, setSomentePendentes] = useState(true);
  const [selecionada, setSelecionada] = useState<string | null>(null);
  const [ultimoEvento, setUltimoEvento] = useState<Date | null>(null);

  const ocs = useQuery({
    queryKey: ["almox-ocs-painel", q, somentePendentes],
    queryFn: () => listar({ data: { q, somente_pendentes: somentePendentes } }),
    placeholderData: keepPreviousData,
    refetchInterval: 20_000,
  });

  const painel = useQuery({
    queryKey: ["almox-oc-painel", selecionada],
    queryFn: () => detalhe({ data: { ordem_compra_id: selecionada! } }),
    enabled: !!selecionada,
    placeholderData: keepPreviousData,
    refetchInterval: 15_000,
  });

  // tempo real: qualquer movimento ou recebimento atualiza os painéis
  useEffect(() => {
    const canal = supabase
      .channel("almox-ocs-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "almox_movimentos" }, () => {
        setUltimoEvento(new Date());
        qc.invalidateQueries({ queryKey: ["almox-ocs-painel"] });
        qc.invalidateQueries({ queryKey: ["almox-oc-painel"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "almox_recebimentos" }, () => {
        setUltimoEvento(new Date());
        qc.invalidateQueries({ queryKey: ["almox-ocs-painel"] });
        qc.invalidateQueries({ queryKey: ["almox-oc-painel"] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(canal);
    };
  }, [qc]);

  const rows = ocs.data?.rows ?? [];
  const kpis = ocs.data?.kpis;
  const det = painel.data;

  useEffect(() => {
    if (!selecionada && rows.length) setSelecionada(rows[0].id);
  }, [rows, selecionada]);

  return (
    <PageContainer>
      <PageHeader
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Compras" },
          { label: "Almoxarifado", href: "/compras/almoxarifado" },
          { label: "Ordens de compra" },
        ]}
        title="Ordens de compra — saldo e movimentos"
        subtitle="O que falta receber de cada OC, custo médio por item e movimentações atualizadas em tempo real."
        actions={
          <Button
            variant="outline"
            onClick={() => {
              qc.invalidateQueries({ queryKey: ["almox-ocs-painel"] });
              qc.invalidateQueries({ queryKey: ["almox-oc-painel"] });
            }}
          >
            <RefreshCw className="mr-2 h-4 w-4" /> Atualizar
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi icon={ClipboardList} label="Ordens listadas" value={String(kpis?.ocs ?? 0)} />
        <Kpi icon={TriangleAlert} label="Com pendência" value={String(kpis?.pendentes ?? 0)} />
        <Kpi
          icon={PackageCheck}
          label="Totalmente recebidas"
          value={String(kpis?.completas ?? 0)}
        />
        <Kpi icon={Activity} label="Quantidade a receber" value={fmtQtd(kpis?.qtd_falta)} />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[260px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Buscar por número da OC ou fornecedor"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <Checkbox
            checked={somentePendentes}
            onCheckedChange={(v) => setSomentePendentes(Boolean(v))}
          />
          Somente ordens em aberto
        </label>
        <Badge variant="outline" className="gap-1">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          Tempo real{ultimoEvento ? ` · ${ultimoEvento.toLocaleTimeString("pt-BR")}` : ""}
        </Badge>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(320px,420px)_1fr]">
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>OC</TableHead>
                  <TableHead className="w-[130px]">Recebido</TableHead>
                  <TableHead className="w-[90px] text-right">Falta</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3}>
                      <TableEmpty title="Nenhuma ordem de compra encontrada." />
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((o: any) => (
                    <TableRow
                      key={o.id}
                      onClick={() => setSelecionada(o.id)}
                      className={`cursor-pointer ${selecionada === o.id ? "bg-muted/60" : ""}`}
                    >
                      <TableCell>
                        <div className="font-medium">{o.numero ?? "—"}</div>
                        <div className="truncate text-xs text-muted-foreground">
                          {o.fornecedor_razao_social ?? "—"} · {fmtData(o.emissao_em)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Progress value={o.pct_recebido} className="h-2" />
                        <div className="mt-1 text-xs text-muted-foreground">
                          {fmtQtd(o.quantidade_recebida)} / {fmtQtd(o.quantidade_pedida)}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {o.quantidade_pendente > 0 ? (
                          <Badge variant="destructive">{fmtQtd(o.quantidade_pendente)}</Badge>
                        ) : (
                          <Badge variant="secondary">OK</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {!det ? (
            <Card>
              <CardContent className="p-6 text-sm text-muted-foreground">
                Selecione uma ordem de compra para ver os itens, o que falta receber e o custo
                médio.
              </CardContent>
            </Card>
          ) : (
            <>
              <Card>
                <CardContent className="flex flex-wrap items-center justify-between gap-4 p-4">
                  <div>
                    <div className="text-lg font-semibold">{det.oc.numero ?? "OC"}</div>
                    <div className="text-sm text-muted-foreground">
                      {det.oc.fornecedor_razao_social ?? "—"} · status {det.oc.status} · entrega{" "}
                      {fmtData(det.oc.entrega_prevista)}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-6 text-sm">
                    <Metric label="Pedido" value={fmtQtd(det.totais.pedida)} />
                    <Metric label="Recebido" value={fmtQtd(det.totais.recebida)} />
                    <Metric label="Falta receber" value={fmtQtd(det.totais.pendente)} destaque />
                    <Metric
                      label="Valor recebido"
                      value={fmtMoeda(det.totais.valor_recebido, det.oc.moeda)}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button asChild variant="outline" size="sm">
                      <Link to="/compras/ordens/$id" params={{ id: det.oc.id }}>
                        Abrir OC
                      </Link>
                    </Button>
                    <Button asChild size="sm">
                      <Link to="/compras/almoxarifado">Receber</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead className="text-right">Pedido</TableHead>
                        <TableHead className="text-right">Recebido</TableHead>
                        <TableHead className="text-right">Falta</TableHead>
                        <TableHead className="text-right">Custo médio</TableHead>
                        <TableHead className="text-right">Saldo em estoque</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {det.linhas.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6}>
                            <TableEmpty title="Esta ordem não possui itens." />
                          </TableCell>
                        </TableRow>
                      ) : (
                        det.linhas.map((l: any) => (
                          <TableRow key={l.id}>
                            <TableCell>
                              <div className="font-medium">{l.descricao}</div>
                              <div className="text-xs text-muted-foreground">
                                {l.item_codigo ? (
                                  <Link
                                    to="/compras/almoxarifado/$id"
                                    params={{ id: l.item_id }}
                                    className="underline underline-offset-2"
                                  >
                                    {l.item_codigo} · {l.item_descricao}
                                  </Link>
                                ) : (
                                  "Sem item de almoxarifado vinculado"
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {fmtQtd(l.quantidade)} {l.unidade ?? ""}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {fmtQtd(l.quantidade_recebida)}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {l.quantidade_pendente > 0 ? (
                                <Badge variant="destructive">{fmtQtd(l.quantidade_pendente)}</Badge>
                              ) : (
                                <Badge variant="secondary">completo</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {l.custo_medio == null ? "—" : fmtMoeda(l.custo_medio)}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {l.saldo_total == null ? (
                                "—"
                              ) : (
                                <span>
                                  {fmtQtd(l.saldo_total)}
                                  <span className="ml-1 text-xs text-muted-foreground">
                                    (livre {fmtQtd(l.saldo_disponivel)})
                                  </span>
                                </span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-0">
                  <div className="flex items-center gap-2 border-b px-4 py-3 text-sm font-medium">
                    <Activity className="h-4 w-4" /> Movimentos desta ordem
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Item</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead className="text-right">Qtd.</TableHead>
                        <TableHead className="text-right">Custo unit.</TableHead>
                        <TableHead className="text-right">Custo médio após</TableHead>
                        <TableHead>Local</TableHead>
                        <TableHead>Responsável</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {det.movimentos.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8}>
                            <TableEmpty title="Nenhum movimento registrado para esta ordem." />
                          </TableCell>
                        </TableRow>
                      ) : (
                        det.movimentos.map((m: any) => (
                          <TableRow key={m.id}>
                            <TableCell className="whitespace-nowrap text-xs">
                              {fmtDataHora(m.created_at)}
                            </TableCell>
                            <TableCell className="text-xs">
                              {m.item_codigo} · {m.item_descricao}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{TIPO_LABEL[m.tipo] ?? m.tipo}</Badge>
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {fmtQtd(m.quantidade)}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {fmtMoeda(m.custo_unitario)}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {fmtMoeda(m.custo_medio_apos)}
                            </TableCell>
                            <TableCell className="text-xs">{m.local_codigo}</TableCell>
                            <TableCell className="text-xs">{m.autor}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </PageContainer>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className="rounded-md bg-muted p-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <div>
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="text-lg font-semibold tabular-nums">{value}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function Metric({ label, value, destaque }: { label: string; value: string; destaque?: boolean }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`font-semibold tabular-nums ${destaque ? "text-destructive" : ""}`}>
        {value}
      </div>
    </div>
  );
}
