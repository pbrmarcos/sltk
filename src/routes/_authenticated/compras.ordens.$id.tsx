import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getOrdemCompra,
  updateOrdemCompra,
  upsertItemOc,
  removeItemOc,
  setOcStatus,
} from "@/lib/ordens-compra.functions";
import { OC_STATUS_COLOR, OC_STATUS_LABEL, type OcStatus } from "@/lib/ordens-compra.shared";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  Plus,
  Printer,
  Trash2,
  Wand2,
  Save,
  CheckCircle2,
  Send,
  XCircle,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/compras/ordens/$id")({
  component: OrdemDetailPage,
});

function fmtBRL(v: number, moeda = "BRL") {
  try {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: moeda }).format(v || 0);
  } catch {
    return `${moeda} ${v?.toFixed(2)}`;
  }
}

function OrdemDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const getFn = useServerFn(getOrdemCompra);
  const updateFn = useServerFn(updateOrdemCompra);
  const upsertItemFn = useServerFn(upsertItemOc);
  const removeItemFn = useServerFn(removeItemOc);
  const statusFn = useServerFn(setOcStatus);

  const q = useQuery({
    queryKey: ["ordens", "detail", id],
    queryFn: () => getFn({ data: { id } }),
  });

  const [wizardOpen, setWizardOpen] = useState(false);
  const [itemOpen, setItemOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);

  if (q.isLoading) return <div className="p-8">Carregando...</div>;
  if (q.error || !q.data) return <div className="p-8 text-destructive">Erro ao carregar OC</div>;

  const { oc, itens, historico, faltantes } = q.data;
  const editavel = ["rascunho", "aguardando_aprovacao"].includes(oc.status);

  async function reload() {
    await qc.invalidateQueries({ queryKey: ["ordens"] });
  }

  async function saveHeader(patch: Record<string, unknown>) {
    try {
      await updateFn({ data: { id, patch: patch as any } });
      toast.success("Salvo");
      await reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar");
    }
  }

  async function changeStatus(target: OcStatus, observacao?: string) {
    try {
      await statusFn({ data: { id, status: target, observacao } });
      toast.success("Status atualizado");
      await reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    }
  }

  return (
    <PageContainer>
      <PageHeader
        breadcrumbs={[
          { label: "Compras", href: "/compras/solicitacao" },
          { label: "Ordens de Compra", href: "/compras/ordens" },
          { label: oc.numero },
        ]}
        title={`OC ${oc.numero}`}
        subtitle={oc.fornecedor_razao_social ?? "—"}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <a href={`/compras/ordens/${id}/imprimir`} target="_blank" rel="noopener">
                <Printer className="h-4 w-4" /> Imprimir
              </a>
            </Button>
            {oc.status === "rascunho" && (
              <Button onClick={() => changeStatus("aguardando_aprovacao")}>
                <Send className="h-4 w-4" /> Enviar para aprovação
              </Button>
            )}
            {oc.status === "aguardando_aprovacao" && (
              <Button onClick={() => changeStatus("aprovada")}>
                <CheckCircle2 className="h-4 w-4" /> Aprovar
              </Button>
            )}
            {oc.status === "aprovada" && (
              <Button onClick={() => changeStatus("enviada")}>
                <Send className="h-4 w-4" /> Marcar como enviada
              </Button>
            )}
          </div>
        }
      />

      <div className="flex items-center gap-3 mb-4">
        <Badge variant="outline" className={cn("border", OC_STATUS_COLOR[oc.status as OcStatus])}>
          {OC_STATUS_LABEL[oc.status as OcStatus]}
        </Badge>
        {oc.cotacao_id && (
          <Link
            to="/compras/cotacoes/$id"
            params={{ id: oc.cotacao_id }}
            className="text-xs underline"
          >
            Ver cotação origem
          </Link>
        )}
        <span className="text-sm text-muted-foreground ml-auto">
          Valor total:{" "}
          <strong className="text-foreground">{fmtBRL(Number(oc.valor_total), oc.moeda)}</strong>
        </span>
      </div>

      {/* Wizard: dados faltantes */}
      {faltantes.length > 0 && (
        <Alert className="mb-4 border-amber-300 bg-amber-50">
          <AlertTriangle className="h-4 w-4 text-amber-700" />
          <AlertTitle className="text-amber-900">
            {faltantes.length} campo(s) obrigatório(s) faltando
          </AlertTitle>
          <AlertDescription className="text-amber-800 flex items-center justify-between">
            <span>{faltantes.map((f) => f.label).join(" · ")}</span>
            <Button size="sm" variant="outline" onClick={() => setWizardOpen(true)}>
              <Wand2 className="h-3 w-3" /> Completar agora
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="itens" className="w-full">
        <TabsList>
          <TabsTrigger value="itens">Itens ({itens.length})</TabsTrigger>
          <TabsTrigger value="dados">Dados</TabsTrigger>
          <TabsTrigger value="terceiros">Terceiros</TabsTrigger>
          <TabsTrigger value="hist">Histórico ({historico.length})</TabsTrigger>
        </TabsList>

        {/* ============ ITENS ============ */}
        <TabsContent value="itens" className="space-y-4">
          <div className="flex justify-end">
            <Button
              size="sm"
              disabled={!editavel}
              onClick={() => {
                setEditingItem(null);
                setItemOpen(true);
              }}
            >
              <Plus className="h-4 w-4" /> Adicionar item
            </Button>
          </div>
          <div className="rounded-md border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nº</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Un.</TableHead>
                  <TableHead className="text-right">Qtde</TableHead>
                  <TableHead className="text-right">Vlr Unit.</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="w-[80px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {itens.map((it: any, idx: number) => (
                  <TableRow
                    key={it.id}
                    className={editavel ? "cursor-pointer hover:bg-muted/50" : ""}
                    onClick={() => {
                      if (editavel) {
                        setEditingItem(it);
                        setItemOpen(true);
                      }
                    }}
                  >
                    <TableCell>{idx + 1}</TableCell>
                    <TableCell className="font-mono text-xs">{it.codigo_produto ?? "—"}</TableCell>
                    <TableCell className="max-w-[400px] truncate">{it.descricao}</TableCell>
                    <TableCell>{it.unidade}</TableCell>
                    <TableCell className="text-right">{Number(it.quantidade).toFixed(2)}</TableCell>
                    <TableCell className="text-right">
                      {fmtBRL(Number(it.valor_unitario), oc.moeda)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {fmtBRL(Number(it.valor_total ?? 0), oc.moeda)}
                    </TableCell>
                    <TableCell>
                      {editavel && (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={async (e) => {
                            e.stopPropagation();
                            if (!confirm("Remover item?")) return;
                            await removeItemFn({ data: { id: it.id } });
                            toast.success("Item removido");
                            await reload();
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {itens.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      Nenhum item adicionado ainda.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Totais */}
          <div className="ml-auto max-w-sm space-y-1 text-sm">
            <Row label="Subtotal" value={fmtBRL(Number(oc.valor_subtotal), oc.moeda)} />
            <Row label="Desconto" value={`- ${fmtBRL(Number(oc.valor_desconto), oc.moeda)}`} />
            <Row label="IPI" value={fmtBRL(Number(oc.valor_ipi), oc.moeda)} />
            <Row label="ICMS-ST" value={fmtBRL(Number(oc.valor_icms_st), oc.moeda)} />
            <Row label="Frete" value={fmtBRL(Number(oc.valor_frete), oc.moeda)} />
            <div className="flex justify-between border-t pt-1 font-semibold">
              <span>Valor total</span>
              <span>{fmtBRL(Number(oc.valor_total), oc.moeda)}</span>
            </div>
          </div>
        </TabsContent>

        {/* ============ DADOS ============ */}
        <TabsContent value="dados">
          <DadosForm oc={oc} onSave={saveHeader} readonly={!editavel} />
        </TabsContent>

        {/* ============ TERCEIROS ============ */}
        <TabsContent value="terceiros" className="space-y-4">
          {oc.tipo !== "terceiros" ? (
            <Alert>
              <AlertDescription>
                Esta OC não é do tipo "Terceiros". Para gerar uma OC pass-through, crie uma nova
                selecionando o tipo "Terceiros".
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Cliente final (destino do repasse)</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3 md:grid-cols-2">
                  <TextField
                    label="Razão social"
                    defaultValue={oc.cliente_final_razao_social}
                    field="cliente_final_razao_social"
                    onSave={saveHeader}
                    readonly={!editavel}
                  />
                  <TextField
                    label="CNPJ"
                    defaultValue={oc.cliente_final_cnpj}
                    field="cliente_final_cnpj"
                    onSave={saveHeader}
                    readonly={!editavel}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Markup por item</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>Aplicar markup global aos itens sem valor:</span>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="%"
                      className="h-8 w-24"
                      disabled={!editavel}
                      onBlur={async (e) => {
                        const pct = Number(e.target.value);
                        if (!pct || !editavel) return;
                        await Promise.all(
                          itens
                            .filter(
                              (it: any) => it.markup_pct == null && it.valor_repasse_unit == null,
                            )
                            .map((it: any) =>
                              upsertItemFn({
                                data: {
                                  id: it.id,
                                  ordem_compra_id: id,
                                  codigo_produto: it.codigo_produto,
                                  descricao: it.descricao,
                                  unidade: it.unidade,
                                  quantidade: Number(it.quantidade),
                                  valor_unitario: Number(it.valor_unitario),
                                  valor_desconto: Number(it.valor_desconto),
                                  valor_ipi: Number(it.valor_ipi),
                                  valor_icms_st: Number(it.valor_icms_st),
                                  markup_pct: pct,
                                  data_entrega: it.data_entrega,
                                  observacoes: it.observacoes,
                                },
                              }),
                            ),
                        );
                        toast.success("Markup aplicado");
                        e.currentTarget.value = "";
                        await reload();
                      }}
                    />
                  </div>
                  <div className="rounded-md border bg-card overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Descrição</TableHead>
                          <TableHead className="text-right">Custo unit.</TableHead>
                          <TableHead className="text-right">Markup %</TableHead>
                          <TableHead className="text-right">Repasse unit.</TableHead>
                          <TableHead className="text-right">Qtde</TableHead>
                          <TableHead className="text-right">Repasse total</TableHead>
                          <TableHead className="text-right">Margem</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {itens.map((it: any) => {
                          const custoTot = Number(it.valor_total ?? 0);
                          const repasseTot = Number(it.valor_repasse_total_item ?? 0);
                          const margem = repasseTot - custoTot;
                          return (
                            <TableRow
                              key={it.id}
                              className={editavel ? "cursor-pointer hover:bg-muted/50" : ""}
                              onClick={() => {
                                if (editavel) {
                                  setEditingItem(it);
                                  setItemOpen(true);
                                }
                              }}
                            >
                              <TableCell className="max-w-[300px] truncate">
                                {it.descricao}
                              </TableCell>
                              <TableCell className="text-right">
                                {fmtBRL(Number(it.valor_unitario), oc.moeda)}
                              </TableCell>
                              <TableCell className="text-right">
                                {it.markup_pct != null
                                  ? `${Number(it.markup_pct).toFixed(2)}%`
                                  : "—"}
                              </TableCell>
                              <TableCell className="text-right">
                                {it.valor_repasse_unit != null
                                  ? fmtBRL(Number(it.valor_repasse_unit), oc.moeda)
                                  : it.markup_pct != null
                                    ? fmtBRL(
                                        Number(it.valor_unitario) *
                                          (1 + Number(it.markup_pct) / 100),
                                        oc.moeda,
                                      )
                                    : "—"}
                              </TableCell>
                              <TableCell className="text-right">
                                {Number(it.quantidade).toFixed(2)}
                              </TableCell>
                              <TableCell className="text-right font-medium">
                                {fmtBRL(repasseTot, oc.moeda)}
                              </TableCell>
                              <TableCell
                                className={cn(
                                  "text-right",
                                  margem < 0 ? "text-destructive" : "text-emerald-600",
                                )}
                              >
                                {fmtBRL(margem, oc.moeda)}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                        {itens.length === 0 && (
                          <TableRow>
                            <TableCell
                              colSpan={7}
                              className="text-center text-muted-foreground py-6"
                            >
                              Adicione itens na aba "Itens" para configurar o repasse.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              <div className="grid gap-3 md:grid-cols-3">
                <Card>
                  <CardContent className="p-4">
                    <div className="text-xs text-muted-foreground">Custo total (fornecedor)</div>
                    <div className="text-2xl font-semibold mt-1">
                      {fmtBRL(Number(oc.valor_total), oc.moeda)}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-xs text-muted-foreground">Repasse total (cliente)</div>
                    <div className="text-2xl font-semibold mt-1">
                      {fmtBRL(Number(oc.valor_repasse_total ?? oc.valor_repasse ?? 0), oc.moeda)}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-xs text-muted-foreground">Margem bruta</div>
                    <div
                      className={cn(
                        "text-2xl font-semibold mt-1",
                        Number(oc.margem_bruta ?? 0) < 0 ? "text-destructive" : "text-emerald-600",
                      )}
                    >
                      {fmtBRL(Number(oc.margem_bruta ?? 0), oc.moeda)}
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-1">
                      {Number(oc.valor_total) > 0
                        ? `${((Number(oc.margem_bruta ?? 0) / Number(oc.valor_total)) * 100).toFixed(1)}% sobre custo`
                        : ""}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>

        {/* ============ HISTÓRICO ============ */}
        <TabsContent value="hist">
          <div className="space-y-2">
            {historico.map((h: any) => (
              <div
                key={h.id}
                className="rounded-md border bg-card p-3 text-sm flex justify-between gap-4"
              >
                <div>
                  <div className="font-medium">{h.acao}</div>
                  <div className="text-xs text-muted-foreground">
                    {h.usuario_nome} · {new Date(h.created_at).toLocaleString("pt-BR")}
                  </div>
                  {h.detalhes && (
                    <pre className="mt-1 text-[11px] text-muted-foreground overflow-x-auto">
                      {JSON.stringify(h.detalhes, null, 0)}
                    </pre>
                  )}
                </div>
                {h.status_novo && (
                  <Badge
                    variant="outline"
                    className={cn("border shrink-0", OC_STATUS_COLOR[h.status_novo as OcStatus])}
                  >
                    {OC_STATUS_LABEL[h.status_novo as OcStatus] ?? h.status_novo}
                  </Badge>
                )}
              </div>
            ))}
            {historico.length === 0 && (
              <div className="text-center text-muted-foreground py-8">Sem histórico.</div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Wizard Dialog */}
      <WizardDialog
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        oc={oc}
        faltantes={faltantes}
        onSave={saveHeader}
      />

      {/* Item Dialog */}
      <ItemDialog
        open={itemOpen}
        onOpenChange={setItemOpen}
        ocId={id}
        item={editingItem}
        moeda={oc.moeda}
        isTerceiros={oc.tipo === "terceiros"}
        onSaved={reload}
      />

      {oc.status !== "cancelada" && oc.status !== "recebida" && (
        <div className="mt-6 border-t pt-4">
          <Button
            variant="outline"
            size="sm"
            className="text-destructive"
            onClick={() => {
              const obs = prompt("Justificativa do cancelamento:");
              if (obs) changeStatus("cancelada", obs);
            }}
          >
            <XCircle className="h-4 w-4" /> Cancelar OC
          </Button>
        </div>
      )}
    </PageContainer>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}

/* ============ DADOS FORM ============ */
function DadosForm({
  oc,
  onSave,
  readonly,
}: {
  oc: any;
  onSave: (p: Record<string, unknown>) => void;
  readonly: boolean;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Comprador</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <TextField
            label="Razão social"
            defaultValue={oc.comprador_razao_social}
            field="comprador_razao_social"
            onSave={onSave}
            readonly={readonly}
          />
          <TextField
            label="CNPJ"
            defaultValue={oc.comprador_cnpj}
            field="comprador_cnpj"
            onSave={onSave}
            readonly={readonly}
          />
          <TextField
            label="Inscr. Estadual"
            defaultValue={oc.comprador_ie}
            field="comprador_ie"
            onSave={onSave}
            readonly={readonly}
          />
          <TextField
            label="Endereço"
            defaultValue={oc.comprador_endereco}
            field="comprador_endereco"
            onSave={onSave}
            readonly={readonly}
          />
          <div className="grid grid-cols-3 gap-2">
            <TextField
              label="Cidade"
              defaultValue={oc.comprador_cidade}
              field="comprador_cidade"
              onSave={onSave}
              readonly={readonly}
            />
            <TextField
              label="UF"
              defaultValue={oc.comprador_uf}
              field="comprador_uf"
              onSave={onSave}
              readonly={readonly}
            />
            <TextField
              label="CEP"
              defaultValue={oc.comprador_cep}
              field="comprador_cep"
              onSave={onSave}
              readonly={readonly}
            />
          </div>
          <TextField
            label="Telefone"
            defaultValue={oc.comprador_telefone}
            field="comprador_telefone"
            onSave={onSave}
            readonly={readonly}
          />
          <TextField
            label="E-mail"
            defaultValue={oc.comprador_email}
            field="comprador_email"
            onSave={onSave}
            readonly={readonly}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Fornecedor</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <TextField
            label="Razão social"
            defaultValue={oc.fornecedor_razao_social}
            field="fornecedor_razao_social"
            onSave={onSave}
            readonly={readonly}
          />
          <TextField
            label="CNPJ / Tax ID"
            defaultValue={oc.fornecedor_cnpj}
            field="fornecedor_cnpj"
            onSave={onSave}
            readonly={readonly}
          />
          <TextField
            label="Inscr. Estadual"
            defaultValue={oc.fornecedor_ie}
            field="fornecedor_ie"
            onSave={onSave}
            readonly={readonly}
          />
          <TextField
            label="Endereço"
            defaultValue={oc.fornecedor_endereco}
            field="fornecedor_endereco"
            onSave={onSave}
            readonly={readonly}
          />
          <div className="grid grid-cols-3 gap-2">
            <TextField
              label="Cidade"
              defaultValue={oc.fornecedor_cidade}
              field="fornecedor_cidade"
              onSave={onSave}
              readonly={readonly}
            />
            <TextField
              label="UF"
              defaultValue={oc.fornecedor_uf}
              field="fornecedor_uf"
              onSave={onSave}
              readonly={readonly}
            />
            <TextField
              label="CEP"
              defaultValue={oc.fornecedor_cep}
              field="fornecedor_cep"
              onSave={onSave}
              readonly={readonly}
            />
          </div>
          <TextField
            label="Telefone"
            defaultValue={oc.fornecedor_telefone}
            field="fornecedor_telefone"
            onSave={onSave}
            readonly={readonly}
          />
          <TextField
            label="E-mail"
            defaultValue={oc.fornecedor_email}
            field="fornecedor_email"
            onSave={onSave}
            readonly={readonly}
          />
          <TextField
            label="Contato"
            defaultValue={oc.fornecedor_contato}
            field="fornecedor_contato"
            onSave={onSave}
            readonly={readonly}
          />
        </CardContent>
      </Card>

      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle className="text-base">Condições comerciais</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <Field label="Condição de pagamento">
            <Input
              defaultValue={oc.condicao_pagamento ?? ""}
              disabled={readonly}
              onBlur={(e) => onSave({ condicao_pagamento: e.target.value })}
            />
          </Field>
          <Field label="Incoterm">
            <Input
              defaultValue={oc.incoterm ?? ""}
              disabled={readonly}
              onBlur={(e) => onSave({ incoterm: e.target.value })}
            />
          </Field>
          <Field label="Moeda">
            <Select
              value={oc.moeda}
              disabled={readonly}
              onValueChange={(v) => onSave({ moeda: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["BRL", "USD", "EUR", "CNY"].map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Entrega prevista">
            <Input
              type="date"
              defaultValue={oc.entrega_prevista ?? ""}
              disabled={readonly}
              onBlur={(e) => onSave({ entrega_prevista: e.target.value || null })}
            />
          </Field>
          <Field label="Transportadora">
            <Input
              defaultValue={oc.transportadora ?? ""}
              disabled={readonly}
              onBlur={(e) => onSave({ transportadora: e.target.value })}
            />
          </Field>
          <Field label="Valor do frete">
            <Input
              type="number"
              step="0.01"
              defaultValue={oc.valor_frete ?? 0}
              disabled={readonly}
              onBlur={(e) => onSave({ valor_frete: Number(e.target.value) })}
            />
          </Field>
          <Field label="Observações (aparece no PDF)">
            <Textarea
              rows={3}
              defaultValue={oc.observacoes ?? ""}
              disabled={readonly}
              onBlur={(e) => onSave({ observacoes: e.target.value })}
            />
          </Field>
          <Field label="Observações internas">
            <Textarea
              rows={3}
              defaultValue={oc.observacoes_internas ?? ""}
              disabled={readonly}
              onBlur={(e) => onSave({ observacoes_internas: e.target.value })}
            />
          </Field>
        </CardContent>
      </Card>
    </div>
  );
}

function TextField({
  label,
  defaultValue,
  field,
  onSave,
  readonly,
}: {
  label: string;
  defaultValue?: string | null;
  field: string;
  onSave: (p: Record<string, unknown>) => void;
  readonly: boolean;
}) {
  return (
    <Field label={label}>
      <Input
        defaultValue={defaultValue ?? ""}
        disabled={readonly}
        onBlur={(e) => onSave({ [field]: e.target.value })}
      />
    </Field>
  );
}

/* ============ WIZARD DIALOG ============ */
function WizardDialog({
  open,
  onOpenChange,
  oc,
  faltantes,
  onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  oc: any;
  faltantes: Array<{ key: string; label: string; group: string }>;
  onSave: (p: Record<string, unknown>) => void;
}) {
  const [form, setForm] = useState<Record<string, string>>({});

  async function handleSave() {
    const patch: Record<string, unknown> = {};
    for (const k of Object.keys(form)) if (form[k]) patch[k] = form[k];
    if (Object.keys(patch).length) await onSave(patch);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Completar dados obrigatórios</DialogTitle>
          <DialogDescription>
            A OC não pode ser aprovada sem estes campos. Preencha para prosseguir.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 md:grid-cols-2 max-h-[60vh] overflow-y-auto">
          {faltantes
            .filter((f) => f.key !== "itens")
            .map((f) => (
              <Field key={f.key} label={f.label}>
                <Input
                  defaultValue={(oc[f.key] as string) ?? ""}
                  onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))}
                />
              </Field>
            ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave}>
            <Save className="h-4 w-4" /> Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ============ ITEM DIALOG ============ */
function ItemDialog({
  open,
  onOpenChange,
  ocId,
  item,
  moeda,
  isTerceiros,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  ocId: string;
  item: any | null;
  moeda: string;
  isTerceiros: boolean;
  onSaved: () => Promise<void>;
}) {
  const upsertFn = useServerFn(upsertItemOc);
  const [f, setF] = useState<Record<string, any>>(() => item ?? {});

  // Reset on open
  useState(() => {
    setF(item ?? {});
  });

  async function handleSave() {
    try {
      await upsertFn({
        data: {
          id: item?.id ?? undefined,
          ordem_compra_id: ocId,
          codigo_produto: f.codigo_produto || null,
          descricao: f.descricao || "",
          unidade: f.unidade || "UN",
          quantidade: Number(f.quantidade || 1),
          valor_unitario: Number(f.valor_unitario || 0),
          valor_desconto: Number(f.valor_desconto || 0),
          valor_ipi: Number(f.valor_ipi || 0),
          valor_icms_st: Number(f.valor_icms_st || 0),
          markup_pct: f.markup_pct !== "" && f.markup_pct != null ? Number(f.markup_pct) : null,
          valor_repasse_unit:
            f.valor_repasse_unit !== "" && f.valor_repasse_unit != null
              ? Number(f.valor_repasse_unit)
              : null,
          data_entrega: f.data_entrega || null,
          observacoes: f.observacoes || null,
        },
      });
      toast.success("Item salvo");
      await onSaved();
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar item");
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (v) setF(item ?? {});
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{item ? "Editar item" : "Adicionar item"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Código do produto">
            <Input
              defaultValue={item?.codigo_produto ?? ""}
              onChange={(e) => setF((p) => ({ ...p, codigo_produto: e.target.value }))}
            />
          </Field>
          <Field label="Unidade">
            <Input
              defaultValue={item?.unidade ?? "UN"}
              onChange={(e) => setF((p) => ({ ...p, unidade: e.target.value }))}
            />
          </Field>
          <div className="md:col-span-2">
            <Field label="Descrição *">
              <Textarea
                rows={2}
                defaultValue={item?.descricao ?? ""}
                onChange={(e) => setF((p) => ({ ...p, descricao: e.target.value }))}
              />
            </Field>
          </div>
          <Field label="Quantidade *">
            <Input
              type="number"
              step="0.01"
              defaultValue={item?.quantidade ?? 1}
              onChange={(e) => setF((p) => ({ ...p, quantidade: e.target.value }))}
            />
          </Field>
          <Field label={`Valor unitário (${moeda}) *`}>
            <Input
              type="number"
              step="0.0001"
              defaultValue={item?.valor_unitario ?? 0}
              onChange={(e) => setF((p) => ({ ...p, valor_unitario: e.target.value }))}
            />
          </Field>
          <Field label="Desconto">
            <Input
              type="number"
              step="0.01"
              defaultValue={item?.valor_desconto ?? 0}
              onChange={(e) => setF((p) => ({ ...p, valor_desconto: e.target.value }))}
            />
          </Field>
          <Field label="IPI (R$)">
            <Input
              type="number"
              step="0.01"
              defaultValue={item?.valor_ipi ?? 0}
              onChange={(e) => setF((p) => ({ ...p, valor_ipi: e.target.value }))}
            />
          </Field>
          <Field label="ICMS-ST (R$)">
            <Input
              type="number"
              step="0.01"
              defaultValue={item?.valor_icms_st ?? 0}
              onChange={(e) => setF((p) => ({ ...p, valor_icms_st: e.target.value }))}
            />
          </Field>
          <Field label="Data de entrega">
            <Input
              type="date"
              defaultValue={item?.data_entrega ?? ""}
              onChange={(e) => setF((p) => ({ ...p, data_entrega: e.target.value }))}
            />
          </Field>
          {isTerceiros && (
            <>
              <div className="md:col-span-2 border-t pt-3">
                <div className="text-xs font-semibold text-muted-foreground mb-2">
                  Pass-through — preencha o markup OU o valor de repasse
                </div>
              </div>
              <Field label="Markup %">
                <Input
                  type="number"
                  step="0.01"
                  defaultValue={item?.markup_pct ?? ""}
                  onChange={(e) => setF((p) => ({ ...p, markup_pct: e.target.value }))}
                />
              </Field>
              <Field label={`Valor de repasse unitário (${moeda})`}>
                <Input
                  type="number"
                  step="0.0001"
                  defaultValue={item?.valor_repasse_unit ?? ""}
                  onChange={(e) => setF((p) => ({ ...p, valor_repasse_unit: e.target.value }))}
                />
              </Field>
            </>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave}>
            <Save className="h-4 w-4" /> Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
