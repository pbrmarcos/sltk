import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
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
import { Checkbox } from "@/components/ui/checkbox";
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
import { Boxes, Package, PackageCheck, Plus, Search, TriangleAlert } from "lucide-react";
import {
  buscarItensSemelhantes,
  getOcRecebimento,
  listAlmoxCadastros,
  listAlmoxEstoque,
  listOcsParaReceber,
  registrarRecebimento,
  salvarAlmoxItem,
} from "@/lib/almoxarifado.functions";

export const Route = createFileRoute("/_authenticated/compras/almoxarifado/")({
  head: () => ({
    meta: [
      { title: "Almoxarifado — Solutek Hub" },
      {
        name: "description",
        content: "Saldo de estoque, catálogo de itens e recebimento de ordens de compra.",
      },
      { property: "og:title", content: "Almoxarifado — Solutek Hub" },
      { property: "og:description", content: "Saldo, catálogo e recebimento do almoxarifado." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AlmoxarifadoPage,
});

const fmtQtd = (v: unknown) => Number(v ?? 0).toLocaleString("pt-BR", { maximumFractionDigits: 3 });
const fmtBRL = (v: unknown) =>
  Number(v ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function AlmoxarifadoPage() {
  const [tab, setTab] = useState("estoque");
  return (
    <PageContainer>
      <PageHeader
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Compras" },
          { label: "Almoxarifado" },
        ]}
        title="Almoxarifado"
        subtitle="Saldo por item, catálogo e entradas por ordem de compra."
        actions={
          <Button asChild variant="outline">
            <Link to="/compras/almoxarifado/ordens">Ordens de compra em tempo real</Link>
          </Button>
        }
      />
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="estoque">
            <Boxes className="mr-2 h-4 w-4" /> Estoque
          </TabsTrigger>
          <TabsTrigger value="recebimento">
            <PackageCheck className="mr-2 h-4 w-4" /> Recebimento por OC
          </TabsTrigger>
        </TabsList>
        <TabsContent value="estoque" className="mt-4">
          <EstoqueTab />
        </TabsContent>
        <TabsContent value="recebimento" className="mt-4">
          <RecebimentoTab />
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}

/* ---------------------------------------------------------------- */

function EstoqueTab() {
  const [q, setQ] = useState("");
  const [abaixo, setAbaixo] = useState(false);
  const [comSaldo, setComSaldo] = useState(false);
  const [novoAberto, setNovoAberto] = useState(false);
  const listFn = useServerFn(listAlmoxEstoque);

  const { data, isLoading } = useQuery({
    queryKey: ["almox-estoque", q, abaixo, comSaldo],
    queryFn: () =>
      listFn({ data: { q, somente_abaixo_minimo: abaixo, somente_com_saldo: comSaldo } }),
    placeholderData: keepPreviousData,
  });

  const rows = (data?.rows ?? []) as any[];
  const kpis = data?.kpis;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-4">
        <Kpi label="Itens ativos" value={String(kpis?.itens ?? 0)} icon={Package} />
        <Kpi label="Com saldo" value={String(kpis?.com_saldo ?? 0)} icon={Boxes} />
        <Kpi
          label="Abaixo do mínimo"
          value={String(kpis?.abaixo_minimo ?? 0)}
          icon={TriangleAlert}
        />
        <Kpi label="Valor em estoque" value={fmtBRL(kpis?.valor)} icon={Package} />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[260px] flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-[var(--text-muted)]" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por código ou descrição"
            className="pl-8"
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={abaixo} onCheckedChange={(v) => setAbaixo(!!v)} /> Abaixo do mínimo
        </label>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={comSaldo} onCheckedChange={(v) => setComSaldo(!!v)} /> Somente com
          saldo
        </label>
        <Button onClick={() => setNovoAberto(true)}>
          <Plus className="mr-2 h-4 w-4" /> Novo item
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Un.</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Reservado</TableHead>
                <TableHead className="text-right">Disponível</TableHead>
                <TableHead className="text-right">Custo médio</TableHead>
                <TableHead className="text-right">Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!isLoading && rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8}>
                    <TableEmpty title="Nenhum item encontrado" />
                  </TableCell>
                </TableRow>
              )}
              {rows.map((r) => (
                <TableRow key={r.item_id}>
                  <TableCell className="font-mono text-xs">
                    <Link
                      to="/compras/almoxarifado/$id"
                      params={{ id: r.item_id }}
                      className="hover:underline"
                    >
                      {r.codigo}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Link
                      to="/compras/almoxarifado/$id"
                      params={{ id: r.item_id }}
                      className="hover:underline"
                    >
                      {r.descricao}
                    </Link>
                    {r.abaixo_minimo && (
                      <Badge variant="secondary" className="ml-2">
                        abaixo do mínimo
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>{r.unidade_estoque}</TableCell>
                  <TableCell className="text-right">{fmtQtd(r.total)}</TableCell>
                  <TableCell className="text-right">{fmtQtd(r.reservado)}</TableCell>
                  <TableCell className="text-right font-medium">{fmtQtd(r.disponivel)}</TableCell>
                  <TableCell className="text-right">{fmtBRL(r.custo_medio)}</TableCell>
                  <TableCell className="text-right">{fmtBRL(r.valor_total)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <NovoItemDialog open={novoAberto} onOpenChange={setNovoAberto} />
    </div>
  );
}

function Kpi({ label, value, icon: Icon }: { label: string; value: string; icon: any }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <Icon className="h-5 w-5 text-[var(--text-muted)]" />
        <div>
          <p className="text-xs text-[var(--text-muted)]">{label}</p>
          <p className="text-lg font-semibold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

/* ---------------------------------------------------------------- */

function NovoItemDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const qc = useQueryClient();
  const cadFn = useServerFn(listAlmoxCadastros);
  const salvarFn = useServerFn(salvarAlmoxItem);
  const similaresFn = useServerFn(buscarItensSemelhantes);

  const { data: cad } = useQuery({
    queryKey: ["almox-cadastros"],
    queryFn: () => cadFn(),
    staleTime: 300_000,
  });
  const [form, setForm] = useState({
    descricao: "",
    unidade_estoque: "UN",
    categoria: "",
    part_number: "",
    codigo_fabricante: "",
    fabricante: "",
    estoque_minimo: "0",
  });
  const [similares, setSimilares] = useState<any[]>([]);
  const [confirmado, setConfirmado] = useState(false);
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const salvar = useMutation({
    mutationFn: async () => {
      if (!confirmado && form.descricao.trim().length >= 3) {
        const s = (await similaresFn({
          data: { descricao: form.descricao, part_number: form.part_number || null },
        })) as any[];
        if (s.length) {
          setSimilares(s);
          setConfirmado(true);
          throw new Error("__similares__");
        }
      }
      return salvarFn({
        data: {
          descricao: form.descricao,
          unidade_estoque: form.unidade_estoque,
          categoria: form.categoria || null,
          part_number: form.part_number || null,
          codigo_fabricante: form.codigo_fabricante || null,
          fabricante: form.fabricante || null,
          estoque_minimo: Number(form.estoque_minimo) || 0,
        },
      });
    },
    onSuccess: (r: any) => {
      toast.success(`Item ${r?.codigo ?? ""} criado.`);
      qc.invalidateQueries({ queryKey: ["almox-estoque"] });
      onOpenChange(false);
      setForm({
        descricao: "",
        unidade_estoque: "UN",
        categoria: "",
        part_number: "",
        codigo_fabricante: "",
        fabricante: "",
        estoque_minimo: "0",
      });
      setSimilares([]);
      setConfirmado(false);
    },
    onError: (e: any) => {
      if (e?.message === "__similares__") return;
      toast.error(e?.message ?? "Não foi possível salvar o item.");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Novo item de almoxarifado</DialogTitle>
          <DialogDescription>O código é gerado automaticamente (ALM-#####).</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div>
            <Label>Descrição *</Label>
            <Input value={form.descricao} onChange={(e) => set("descricao", e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Unidade *</Label>
              <Select value={form.unidade_estoque} onValueChange={(v) => set("unidade_estoque", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {((cad?.unidades ?? []) as any[]).map((u) => (
                    <SelectItem key={u.codigo} value={u.codigo}>
                      {u.codigo} — {u.descricao}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Estoque mínimo</Label>
              <Input
                inputMode="decimal"
                value={form.estoque_minimo}
                onChange={(e) => set("estoque_minimo", e.target.value)}
              />
            </div>
            <div>
              <Label>Part number</Label>
              <Input
                value={form.part_number}
                onChange={(e) => set("part_number", e.target.value)}
              />
            </div>
            <div>
              <Label>Código do fabricante</Label>
              <Input
                value={form.codigo_fabricante}
                onChange={(e) => set("codigo_fabricante", e.target.value)}
              />
            </div>
            <div>
              <Label>Fabricante</Label>
              <Input value={form.fabricante} onChange={(e) => set("fabricante", e.target.value)} />
            </div>
            <div>
              <Label>Categoria</Label>
              <Input value={form.categoria} onChange={(e) => set("categoria", e.target.value)} />
            </div>
          </div>
          {similares.length > 0 && (
            <div className="rounded-md border border-[var(--bg-border)] bg-[var(--bg-elevated)] p-3 text-xs">
              <p className="mb-1 font-medium">
                Itens semelhantes já cadastrados — confirme antes de duplicar:
              </p>
              <ul className="list-disc pl-4">
                {similares.map((s) => (
                  <li key={s.id}>
                    <span className="font-mono">{s.codigo}</span> — {s.descricao}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={() => salvar.mutate()}
            disabled={salvar.isPending || form.descricao.trim().length < 3}
          >
            {confirmado && similares.length ? "Cadastrar mesmo assim" : "Cadastrar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------------------------------------------------------- */

function RecebimentoTab() {
  const qc = useQueryClient();
  const ocsFn = useServerFn(listOcsParaReceber);
  const detFn = useServerFn(getOcRecebimento);
  const cadFn = useServerFn(listAlmoxCadastros);
  const estoqueFn = useServerFn(listAlmoxEstoque);
  const receberFn = useServerFn(registrarRecebimento);

  const [ocId, setOcId] = useState<string>("");
  const [nf, setNf] = useState("");
  const [obs, setObs] = useState("");
  const [linhas, setLinhas] = useState<
    Record<string, { item_id: string; qtd: string; custo: string }>
  >({});

  const { data: ocs = [] } = useQuery({ queryKey: ["almox-ocs"], queryFn: () => ocsFn() });
  const { data: cad } = useQuery({
    queryKey: ["almox-cadastros"],
    queryFn: () => cadFn(),
    staleTime: 300_000,
  });
  const { data: catalogo } = useQuery({
    queryKey: ["almox-catalogo-simples"],
    queryFn: () => estoqueFn({ data: { per_page: 200 } }),
    staleTime: 60_000,
  });
  const { data: det } = useQuery({
    queryKey: ["almox-oc-det", ocId],
    queryFn: () => detFn({ data: { ordem_compra_id: ocId } }),
    enabled: !!ocId,
  });

  const localPadrao = useMemo(
    () => ((cad?.locais ?? []) as any[]).find((l) => l.padrao)?.id ?? (cad?.locais ?? [])[0]?.id,
    [cad],
  );

  const receber = useMutation({
    mutationFn: async () => {
      const payload = Object.entries(linhas)
        .filter(([, v]) => v.item_id && Number(v.qtd) > 0)
        .map(([ociId, v]) => ({
          ordem_compra_item_id: ociId,
          item_id: v.item_id,
          local_id: localPadrao,
          quantidade: Number(v.qtd),
          custo_unitario: Number(v.custo) || 0,
        }));
      if (!payload.length)
        throw new Error("Informe item de almoxarifado e quantidade em ao menos uma linha.");
      return receberFn({
        data: {
          ordem_compra_id: ocId,
          evento_key: `${ocId}:${nf || "sem-nf"}:${payload.map((p) => `${p.ordem_compra_item_id}=${p.quantidade}`).join("|")}`,
          nota_fiscal: nf || null,
          observacao: obs || null,
          linhas: payload,
        },
      });
    },
    onSuccess: (r: any) => {
      toast[r?.repetido ? "info" : "success"](
        r?.repetido
          ? "Este recebimento já havia sido registrado."
          : "Recebimento registrado no estoque.",
      );
      setLinhas({});
      setNf("");
      setObs("");
      qc.invalidateQueries({ queryKey: ["almox-oc-det", ocId] });
      qc.invalidateQueries({ queryKey: ["almox-estoque"] });
      qc.invalidateQueries({ queryKey: ["almox-ocs"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Não foi possível registrar o recebimento."),
  });

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <Label>Ordem de compra</Label>
          <Select value={ocId} onValueChange={setOcId}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione a OC" />
            </SelectTrigger>
            <SelectContent>
              {(ocs as any[]).map((o) => (
                <SelectItem key={o.id} value={o.id}>
                  {o.numero} — {o.fornecedor_razao_social ?? "sem fornecedor"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Nota fiscal</Label>
          <Input value={nf} onChange={(e) => setNf(e.target.value)} placeholder="Número da NF" />
        </div>
        <div>
          <Label>Observação</Label>
          <Textarea rows={1} value={obs} onChange={(e) => setObs(e.target.value)} />
        </div>
      </div>

      {ocId && (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item da OC</TableHead>
                  <TableHead className="text-right">Pedido</TableHead>
                  <TableHead className="text-right">Recebido</TableHead>
                  <TableHead className="text-right">Pendente</TableHead>
                  <TableHead>Item do almoxarifado</TableHead>
                  <TableHead className="w-28 text-right">Receber</TableHead>
                  <TableHead className="w-28 text-right">Custo un.</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {((det?.itens ?? []) as any[]).map((it) => {
                  const l = linhas[it.id] ?? {
                    item_id: "",
                    qtd: "",
                    custo: String(it.valor_unitario ?? 0),
                  };
                  const upd = (patch: Partial<typeof l>) =>
                    setLinhas((s) => ({ ...s, [it.id]: { ...l, ...patch } }));
                  return (
                    <TableRow key={it.id}>
                      <TableCell className="max-w-[280px] truncate">{it.descricao}</TableCell>
                      <TableCell className="text-right">{fmtQtd(it.quantidade)}</TableCell>
                      <TableCell className="text-right">{fmtQtd(it.quantidade_recebida)}</TableCell>
                      <TableCell className="text-right font-medium">
                        {fmtQtd(it.quantidade_pendente)}
                      </TableCell>
                      <TableCell>
                        <Select value={l.item_id} onValueChange={(v) => upd({ item_id: v })}>
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Vincular item" />
                          </SelectTrigger>
                          <SelectContent>
                            {((catalogo?.rows ?? []) as any[]).map((c) => (
                              <SelectItem key={c.item_id} value={c.item_id}>
                                {c.codigo} — {c.descricao}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input
                          className="h-8 text-right text-xs"
                          inputMode="decimal"
                          value={l.qtd}
                          onChange={(e) => upd({ qtd: e.target.value })}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          className="h-8 text-right text-xs"
                          inputMode="decimal"
                          value={l.custo}
                          onChange={(e) => upd({ custo: e.target.value })}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
                {det && (det.itens ?? []).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7}>
                      <TableEmpty title="Esta OC não tem itens" />
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {ocId && (
        <div className="flex justify-end">
          <Button onClick={() => receber.mutate()} disabled={receber.isPending}>
            <PackageCheck className="mr-2 h-4 w-4" /> Registrar recebimento
          </Button>
        </div>
      )}
    </div>
  );
}
