import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { ArrowDownToLine, ArrowUpFromLine, BookmarkPlus, Scale } from "lucide-react";
import {
  cancelarReserva,
  getAlmoxItem,
  listAlmoxCadastros,
  listProjetosAtivos,
  registrarMovimento,
  reservarEstoque,
} from "@/lib/almoxarifado.functions";

export const Route = createFileRoute("/_authenticated/compras/almoxarifado/$id")({
  head: () => ({
    meta: [
      { title: "Item do almoxarifado — Solutek Hub" },
      {
        name: "description",
        content: "Saldo por local, movimentos e reservas do item de estoque.",
      },
      { property: "og:title", content: "Item do almoxarifado — Solutek Hub" },
      { property: "og:description", content: "Saldo, movimentos e reservas do item." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ItemPage,
});

const fmtQtd = (v: unknown) => Number(v ?? 0).toLocaleString("pt-BR", { maximumFractionDigits: 3 });
const fmtBRL = (v: unknown) =>
  Number(v ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtData = (s?: string | null) => (s ? new Date(s).toLocaleString("pt-BR") : "—");

const TIPO_LABEL: Record<string, string> = {
  entrada_oc: "Entrada por OC",
  entrada_avulsa: "Entrada avulsa",
  saida_projeto: "Saída para projeto",
  devolucao: "Devolução",
  transferencia: "Transferência",
  ajuste: "Ajuste de inventário",
};

function ItemPage() {
  const { id } = useParams({ from: "/_authenticated/compras/almoxarifado/$id" });
  const qc = useQueryClient();
  const getFn = useServerFn(getAlmoxItem);
  const cadFn = useServerFn(listAlmoxCadastros);
  const projFn = useServerFn(listProjetosAtivos);
  const movFn = useServerFn(registrarMovimento);
  const reservarFn = useServerFn(reservarEstoque);
  const cancelarFn = useServerFn(cancelarReserva);

  const { data, isLoading } = useQuery({
    queryKey: ["almox-item", id],
    queryFn: () => getFn({ data: { id } }),
  });
  const { data: cad } = useQuery({
    queryKey: ["almox-cadastros"],
    queryFn: () => cadFn(),
    staleTime: 300_000,
  });
  const { data: projetos = [] } = useQuery({
    queryKey: ["almox-projetos"],
    queryFn: () => projFn(),
    staleTime: 300_000,
  });

  const localPadrao = useMemo(
    () =>
      ((cad?.locais ?? []) as any[]).find((l) => l.padrao)?.id ??
      ((cad?.locais ?? []) as any[])[0]?.id ??
      "",
    [cad],
  );

  const [dlg, setDlg] = useState<null | "entrada" | "saida" | "ajuste" | "reserva">(null);
  const [f, setF] = useState({
    quantidade: "",
    custo: "",
    local_id: "",
    projeto_id: "",
    justificativa: "",
    observacao: "",
    negativo: false,
  });
  const abrir = (tipo: typeof dlg) => {
    setF({
      quantidade: "",
      custo: "",
      local_id: localPadrao,
      projeto_id: "",
      justificativa: "",
      observacao: "",
      negativo: false,
    });
    setDlg(tipo);
  };

  const invalidar = () => {
    qc.invalidateQueries({ queryKey: ["almox-item", id] });
    qc.invalidateQueries({ queryKey: ["almox-estoque"] });
  };

  const mov = useMutation({
    mutationFn: async () => {
      const qtd = Number(String(f.quantidade).replace(",", "."));
      if (!(qtd > 0)) throw new Error("Informe uma quantidade maior que zero.");
      if (dlg === "reserva") {
        return reservarFn({
          data: {
            item_id: id,
            projeto_id: f.projeto_id,
            quantidade: qtd,
            observacao: f.observacao || null,
          },
        });
      }
      return movFn({
        data: {
          item_id: id,
          local_id: f.local_id || localPadrao,
          tipo: dlg === "entrada" ? "entrada_avulsa" : dlg === "saida" ? "saida_projeto" : "ajuste",
          quantidade: qtd,
          custo_unitario: Number(String(f.custo).replace(",", ".")) || 0,
          projeto_id: f.projeto_id || null,
          justificativa: f.justificativa || null,
          observacao: f.observacao || null,
          negativo: f.negativo,
        },
      });
    },
    onSuccess: () => {
      toast.success("Movimento registrado.");
      setDlg(null);
      invalidar();
    },
    onError: (e: any) => toast.error(e?.message ?? "Não foi possível registrar."),
  });

  const cancelar = useMutation({
    mutationFn: (reserva_id: string) =>
      cancelarFn({ data: { reserva_id, motivo: "Cancelada na tela do item" } }),
    onSuccess: () => {
      toast.success("Reserva cancelada.");
      invalidar();
    },
    onError: (e: any) => toast.error(e?.message ?? "Não foi possível cancelar."),
  });

  const item = data?.item as any;
  const saldo = data?.saldo as any;

  return (
    <PageContainer>
      <PageHeader
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Compras" },
          { label: "Almoxarifado", href: "/compras/almoxarifado" },
          { label: item?.codigo ?? "Item" },
        ]}
        title={item?.descricao ?? (isLoading ? "Carregando…" : "Item")}
        subtitle={
          item
            ? `${item.codigo} · ${item.unidade_estoque}${item.part_number ? ` · PN ${item.part_number}` : ""}`
            : undefined
        }
        actions={
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => abrir("entrada")}>
              <ArrowDownToLine className="mr-2 h-4 w-4" /> Entrada
            </Button>
            <Button size="sm" variant="outline" onClick={() => abrir("saida")}>
              <ArrowUpFromLine className="mr-2 h-4 w-4" /> Retirada
            </Button>
            <Button size="sm" variant="outline" onClick={() => abrir("ajuste")}>
              <Scale className="mr-2 h-4 w-4" /> Ajuste
            </Button>
            <Button size="sm" onClick={() => abrir("reserva")}>
              <BookmarkPlus className="mr-2 h-4 w-4" /> Reservar
            </Button>
          </div>
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-4">
        <Kpi label="Total" value={fmtQtd(saldo?.total)} />
        <Kpi label="Reservado" value={fmtQtd(saldo?.reservado)} />
        <Kpi label="Disponível" value={fmtQtd(saldo?.disponivel)} />
        <Kpi label="Custo médio" value={fmtBRL(saldo?.custo_medio)} />
      </div>

      <Tabs defaultValue="movimentos">
        <TabsList>
          <TabsTrigger value="movimentos">Movimentos</TabsTrigger>
          <TabsTrigger value="locais">Saldo por local</TabsTrigger>
          <TabsTrigger value="reservas">Reservas</TabsTrigger>
        </TabsList>

        <TabsContent value="movimentos" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Local</TableHead>
                    <TableHead className="text-right">Qtd.</TableHead>
                    <TableHead className="text-right">Custo un.</TableHead>
                    <TableHead className="text-right">Custo médio após</TableHead>
                    <TableHead>Projeto</TableHead>
                    <TableHead>Usuário</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {((data?.movimentos ?? []) as any[]).map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="whitespace-nowrap text-xs">
                        {fmtData(m.created_at)}
                      </TableCell>
                      <TableCell>{TIPO_LABEL[m.tipo] ?? m.tipo}</TableCell>
                      <TableCell className="font-mono text-xs">{m.local_codigo}</TableCell>
                      <TableCell
                        className={`text-right font-medium ${Number(m.quantidade) < 0 ? "text-[var(--danger,#b91c1c)]" : ""}`}
                      >
                        {fmtQtd(m.quantidade)}
                      </TableCell>
                      <TableCell className="text-right">{fmtBRL(m.custo_unitario)}</TableCell>
                      <TableCell className="text-right">{fmtBRL(m.custo_medio_apos)}</TableCell>
                      <TableCell className="text-xs">{m.projeto_codigo ?? "—"}</TableCell>
                      <TableCell className="text-xs">{m.autor}</TableCell>
                    </TableRow>
                  ))}
                  {!isLoading && (data?.movimentos ?? []).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8}>
                        <TableEmpty title="Nenhum movimento registrado" />
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="locais" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Local</TableHead>
                    <TableHead className="text-right">Saldo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {((data?.por_local ?? []) as any[]).map((l) => (
                    <TableRow key={l.local_id}>
                      <TableCell className="font-mono text-xs">{l.local_codigo}</TableCell>
                      <TableCell className="text-right">{fmtQtd(l.saldo)}</TableCell>
                    </TableRow>
                  ))}
                  {!isLoading && (data?.por_local ?? []).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={2}>
                        <TableEmpty title="Sem saldo em nenhum local" />
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reservas" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Projeto</TableHead>
                    <TableHead className="text-right">Reservado</TableHead>
                    <TableHead className="text-right">Retirado</TableHead>
                    <TableHead>Validade</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {((data?.reservas ?? []) as any[]).map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="text-xs">{r.projeto_codigo}</TableCell>
                      <TableCell className="text-right">{fmtQtd(r.quantidade)}</TableCell>
                      <TableCell className="text-right">{fmtQtd(r.quantidade_retirada)}</TableCell>
                      <TableCell className="text-xs">{fmtData(r.expira_em)}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{r.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {r.status === "ativa" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={cancelar.isPending}
                            onClick={() => cancelar.mutate(r.id)}
                          >
                            Cancelar
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {!isLoading && (data?.reservas ?? []).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6}>
                        <TableEmpty title="Nenhuma reserva para este item" />
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={dlg !== null} onOpenChange={(v) => !v && setDlg(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {dlg === "entrada"
                ? "Entrada avulsa"
                : dlg === "saida"
                  ? "Retirada para projeto"
                  : dlg === "ajuste"
                    ? "Ajuste de inventário"
                    : "Reservar para projeto"}
            </DialogTitle>
            <DialogDescription>
              Disponível agora: {fmtQtd(saldo?.disponivel)} {item?.unidade_estoque}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>Quantidade *</Label>
              <Input
                inputMode="decimal"
                value={f.quantidade}
                onChange={(e) => setF((s) => ({ ...s, quantidade: e.target.value }))}
              />
            </div>
            {dlg !== "reserva" && (
              <div>
                <Label>Local</Label>
                <Select
                  value={f.local_id}
                  onValueChange={(v) => setF((s) => ({ ...s, local_id: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o local" />
                  </SelectTrigger>
                  <SelectContent>
                    {((cad?.locais ?? []) as any[]).map((l) => (
                      <SelectItem key={l.id} value={l.id}>
                        {l.codigo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {(dlg === "saida" || dlg === "reserva") && (
              <div>
                <Label>Projeto *</Label>
                <Select
                  value={f.projeto_id}
                  onValueChange={(v) => setF((s) => ({ ...s, projeto_id: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o projeto" />
                  </SelectTrigger>
                  <SelectContent>
                    {(projetos as any[]).map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {dlg === "entrada" && (
              <div>
                <Label>Custo unitário</Label>
                <Input
                  inputMode="decimal"
                  value={f.custo}
                  onChange={(e) => setF((s) => ({ ...s, custo: e.target.value }))}
                />
              </div>
            )}
            {dlg === "ajuste" && (
              <>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={f.negativo}
                    onChange={(e) => setF((s) => ({ ...s, negativo: e.target.checked }))}
                  />
                  Ajuste negativo (baixa de estoque)
                </label>
                <div>
                  <Label>Justificativa *</Label>
                  <Textarea
                    rows={2}
                    value={f.justificativa}
                    onChange={(e) => setF((s) => ({ ...s, justificativa: e.target.value }))}
                  />
                </div>
              </>
            )}
            <div>
              <Label>Observação</Label>
              <Textarea
                rows={2}
                value={f.observacao}
                onChange={(e) => setF((s) => ({ ...s, observacao: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDlg(null)}>
              Cancelar
            </Button>
            <Button onClick={() => mov.mutate()} disabled={mov.isPending}>
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="mt-6">
        <Button asChild variant="ghost" size="sm">
          <Link to="/compras/almoxarifado">← Voltar ao almoxarifado</Link>
        </Button>
      </div>
    </PageContainer>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-[var(--text-muted)]">{label}</p>
        <p className="text-lg font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}
