import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Filter,
  Loader2,
  Plus,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Trash2,
  Wrench,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { clienteEquipamentosQueryOptions } from "@/lib/equipamentos.queries";
import { createEquipamento, softDeleteEquipamento } from "@/lib/equipamentos.functions";
import {
  EQUIPAMENTO_CATEGORIAS,
  EQUIPAMENTO_CATEGORIA_LABEL,
  EQUIPAMENTO_STATUS,
  EQUIPAMENTO_STATUS_LABEL,
  EQUIPAMENTO_STATUS_COLOR,
  EQUIPAMENTO_STATUS_FASE,
  EQUIPAMENTO_FASES,
  EQUIPAMENTO_FASE_LABEL,
  garantiaStatus,
  type EquipamentoCategoria,
  type EquipamentoStatus,
  type EquipamentoFase,
} from "@/lib/equipamentos.shared";
import {
  EquipamentoDrawer,
  type EquipamentoRow,
} from "@/components/clientes/equipamentos/EquipamentoDrawer";
import { CriarEquipamentoWizard } from "@/components/clientes/equipamentos/CriarEquipamentoWizard";
import { cn } from "@/lib/utils";
import { useMyModules } from "@/hooks/use-my-modules";
import { useAuth } from "@/hooks/use-auth";
import { Chip, EmptyState, FichaSection, fmtDate, fmtMoney } from "./ficha-utils";

type NovoEquipamentoInput = {
  clienteId: string;
  modelo: string;
  fabricante?: string;
  numero_serie: string | null;
  tag_cliente: string | null;
  categoria: EquipamentoCategoria;
  status: EquipamentoStatus;
  data_entrega: string | null;
  data_instalacao: string | null;
  data_garantia_fim: string | null;
  localizacao: string | null;
  valor_venda: number | null;
  observacoes: string | null;
};

/** Aba Equipamentos: busca + Novo (manual ou de orçamento aprovado), chips de fase, 7 colunas. */
export function ClienteEquipamentosTab({ clienteId }: { clienteId: string }) {
  const qc = useQueryClient();
  // Criar/remover exige o módulo Engenharia no servidor; quem não tem só consulta.
  const { modules } = useMyModules();
  const { role } = useAuth();
  const podeEditar = role === "admin" || modules.has("engenharia");
  const { data, isLoading } = useQuery(clienteEquipamentosQueryOptions(clienteId));
  const [faseFilter, setFaseFilter] = useState<EquipamentoFase | "todos">("todos");
  const [categoriaFilter, setCategoriaFilter] = useState<EquipamentoCategoria | "todos">("todos");
  const [query, setQuery] = useState("");
  const [openNew, setOpenNew] = useState(false);
  const [openWizard, setOpenWizard] = useState(false);
  const [selected, setSelected] = useState<EquipamentoRow | null>(null);
  const [removerAlvo, setRemoverAlvo] = useState<{ id: string; codigo: string } | null>(null);

  const createMut = useMutation({
    mutationFn: (input: NovoEquipamentoInput) => createEquipamento({ data: input }),
    onSuccess: () => {
      toast.success("Equipamento adicionado.");
      qc.invalidateQueries({ queryKey: ["clientes", clienteId, "equipamentos"] });
      setOpenNew(false);
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Falha ao adicionar."),
  });
  const deleteMut = useMutation({
    mutationFn: (id: string) => softDeleteEquipamento({ data: { id } }),
    onSuccess: () => {
      toast.success("Equipamento removido.");
      qc.invalidateQueries({ queryKey: ["clientes", clienteId, "equipamentos"] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Falha ao remover."),
    onSettled: () => setRemoverAlvo(null),
  });

  if (isLoading) return <div className="text-[12px] text-muted-foreground">Carregando…</div>;

  const list = data ?? [];
  const total = list.length;
  const q = query.trim().toLowerCase();
  const filtered = list.filter((e) => {
    if (
      faseFilter !== "todos" &&
      EQUIPAMENTO_STATUS_FASE[e.status as EquipamentoStatus] !== faseFilter
    )
      return false;
    if (categoriaFilter !== "todos" && e.categoria !== categoriaFilter) return false;
    if (!q) return true;
    return (
      (e.modelo ?? "").toLowerCase().includes(q) ||
      (e.codigo ?? "").toLowerCase().includes(q) ||
      (e.numero_serie ?? "").toLowerCase().includes(q) ||
      (e.tag_cliente ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4">
      <FichaSection
        title={`Equipamentos (${total})`}
        action={
          <div className="flex items-center gap-2">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar…"
              className="h-8 w-40 text-[12px] sm:w-52"
            />
            {podeEditar && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" className="h-8">
                    <Plus className="h-3.5 w-3.5" /> Novo
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={() => setOpenNew(true)}>
                    <Plus className="mr-2 h-4 w-4" /> Cadastrar manualmente
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => setOpenWizard(true)}>
                    <Sparkles className="mr-2 h-4 w-4" /> A partir de orçamento aprovado
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        }
      >
        {total === 0 ? (
          <EmptyState
            icon={Wrench}
            title="Nenhum equipamento cadastrado"
            action={
              podeEditar && (
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-1"
                  onClick={() => setOpenNew(true)}
                >
                  <Plus className="h-3.5 w-3.5" /> Adicionar
                </Button>
              )
            }
          />
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-1.5 border-b border-border bg-muted/20 px-4 py-2">
              {(["todos", ...EQUIPAMENTO_FASES] as const).map((s) => (
                <Chip key={s} active={faseFilter === s} onClick={() => setFaseFilter(s)}>
                  {s === "todos" ? "Todas" : EQUIPAMENTO_FASE_LABEL[s]}
                </Chip>
              ))}
              <Select
                value={categoriaFilter}
                onValueChange={(v) => setCategoriaFilter(v as EquipamentoCategoria | "todos")}
              >
                <SelectTrigger className="ml-auto h-7 w-44 text-[11px]">
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas categorias</SelectItem>
                  {EQUIPAMENTO_CATEGORIAS.map((c) => (
                    <SelectItem key={c} value={c}>
                      {EQUIPAMENTO_CATEGORIA_LABEL[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {filtered.length === 0 ? (
              <EmptyState icon={Filter} title="Nenhum equipamento no filtro" />
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-[12.5px]">
                  <thead className="bg-muted/40 text-[11px] text-muted-foreground">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium">Equipamento</th>
                      <th className="px-4 py-2 text-left font-medium">Categoria</th>
                      <th className="px-4 py-2 text-left font-medium">Status</th>
                      <th className="hidden px-4 py-2 text-left font-medium lg:table-cell">
                        Local
                      </th>
                      <th className="hidden px-4 py-2 text-left font-medium md:table-cell">
                        Garantia
                      </th>
                      <th className="px-4 py-2 text-right font-medium">Valor</th>
                      <th className="px-2 py-2" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filtered.map((e) => {
                      const status = e.status as EquipamentoStatus;
                      const cat = e.categoria as EquipamentoCategoria;
                      const garStat = garantiaStatus(e.data_garantia_fim);
                      return (
                        <tr
                          key={e.id}
                          className="cursor-pointer hover:bg-muted/20"
                          onClick={() => setSelected(e as unknown as EquipamentoRow)}
                        >
                          <td className="px-4 py-2">
                            <div className="font-medium">{e.modelo}</div>
                            <div className="font-mono text-[10.5px] text-muted-foreground">
                              {e.codigo ?? "—"}
                              {e.numero_serie ? ` · S/N ${e.numero_serie}` : ""}
                              {e.tag_cliente ? ` · ${e.tag_cliente}` : ""}
                            </div>
                          </td>
                          <td className="px-4 py-2 text-muted-foreground">
                            {EQUIPAMENTO_CATEGORIA_LABEL[cat] ?? cat}
                          </td>
                          <td className="px-4 py-2">
                            <Badge
                              variant="outline"
                              className={cn("text-[10px]", EQUIPAMENTO_STATUS_COLOR[status])}
                              title={EQUIPAMENTO_FASE_LABEL[EQUIPAMENTO_STATUS_FASE[status]]}
                            >
                              {EQUIPAMENTO_STATUS_LABEL[status] ?? status}
                            </Badge>
                          </td>
                          <td className="hidden px-4 py-2 text-muted-foreground lg:table-cell">
                            {e.localizacao ?? "—"}
                          </td>
                          <td className="hidden px-4 py-2 text-[11.5px] md:table-cell">
                            {e.data_garantia_fim ? (
                              <span
                                className={cn(
                                  "inline-flex items-center gap-1",
                                  garStat === "ativa" && "text-emerald-700",
                                  garStat === "expirando" && "text-amber-700",
                                  garStat === "expirada" && "text-rose-700",
                                )}
                              >
                                {garStat === "expirada" ? (
                                  <ShieldAlert className="h-3 w-3" />
                                ) : (
                                  <ShieldCheck className="h-3 w-3" />
                                )}
                                {fmtDate(e.data_garantia_fim)}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="px-4 py-2 text-right tabular-nums">
                            {fmtMoney(e.valor_venda)}
                          </td>
                          <td className="px-2 py-2 text-right">
                            {podeEditar && (
                              <button
                                onClick={(ev) => {
                                  ev.stopPropagation();
                                  setRemoverAlvo({ id: e.id, codigo: e.codigo });
                                }}
                                className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-rose-700"
                                title="Remover"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </FichaSection>

      <NovoEquipamentoDialog
        open={openNew}
        onClose={() => setOpenNew(false)}
        onSubmit={(input) => createMut.mutate({ ...input, clienteId })}
        loading={createMut.isPending}
      />
      <EquipamentoDrawer
        open={!!selected}
        onClose={() => setSelected(null)}
        equipamento={selected}
      />
      <CriarEquipamentoWizard
        open={openWizard}
        onClose={() => setOpenWizard(false)}
        clienteId={clienteId}
      />
      <AlertDialog
        open={!!removerAlvo}
        onOpenChange={(o) => !deleteMut.isPending && !o && setRemoverAlvo(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover equipamento?</AlertDialogTitle>
            <AlertDialogDescription>
              {removerAlvo ? `O equipamento ${removerAlvo.codigo} será removido.` : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMut.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteMut.isPending}
              onClick={() => removerAlvo && deleteMut.mutate(removerAlvo.id)}
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function NovoEquipamentoDialog({
  open,
  onClose,
  onSubmit,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (input: Omit<NovoEquipamentoInput, "clienteId">) => void;
  loading: boolean;
}) {
  const [form, setForm] = useState({
    modelo: "",
    numero_serie: "",
    tag_cliente: "",
    categoria: "outro" as EquipamentoCategoria,
    status: "planejamento" as EquipamentoStatus,
    data_entrega: "",
    data_instalacao: "",
    data_garantia_fim: "",
    localizacao: "",
    valor_venda: "",
    observacoes: "",
  });
  const [mais, setMais] = useState(false);
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Adicionar equipamento</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 text-[12.5px]">
          <label className="col-span-2 space-y-1">
            <span className="text-xs text-muted-foreground">Modelo *</span>
            <Input
              value={form.modelo}
              onChange={(e) => set("modelo", e.target.value)}
              placeholder="Ex.: Envasadora STK-Fill 8000"
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs text-muted-foreground">Categoria</span>
            <Select
              value={form.categoria}
              onValueChange={(v) => set("categoria", v as EquipamentoCategoria)}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EQUIPAMENTO_CATEGORIAS.map((c) => (
                  <SelectItem key={c} value={c}>
                    {EQUIPAMENTO_CATEGORIA_LABEL[c]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          <label className="space-y-1">
            <span className="text-xs text-muted-foreground">Status</span>
            <Select
              value={form.status}
              onValueChange={(v) => set("status", v as EquipamentoStatus)}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EQUIPAMENTO_STATUS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {EQUIPAMENTO_STATUS_LABEL[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          <label className="space-y-1">
            <span className="text-xs text-muted-foreground">Valor de venda (R$)</span>
            <Input
              type="number"
              value={form.valor_venda}
              onChange={(e) => set("valor_venda", e.target.value)}
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs text-muted-foreground">Localização</span>
            <Input
              value={form.localizacao}
              onChange={(e) => set("localizacao", e.target.value)}
              placeholder="Linha 1 — Planta SP"
            />
          </label>
        </div>
        <button
          type="button"
          className="w-fit text-[12px] text-muted-foreground hover:text-foreground"
          onClick={() => setMais((v) => !v)}
        >
          {mais ? "Menos detalhes" : "Mais detalhes (série, datas, garantia)"}
        </button>
        {mais && (
          <div className="grid grid-cols-2 gap-3 text-[12.5px]">
            <label className="space-y-1">
              <span className="text-xs text-muted-foreground">Nº de série</span>
              <Input
                value={form.numero_serie}
                onChange={(e) => set("numero_serie", e.target.value)}
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs text-muted-foreground">Tag do cliente</span>
              <Input
                value={form.tag_cliente}
                onChange={(e) => set("tag_cliente", e.target.value)}
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs text-muted-foreground">Entrega</span>
              <Input
                type="date"
                value={form.data_entrega}
                onChange={(e) => set("data_entrega", e.target.value)}
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs text-muted-foreground">Instalação</span>
              <Input
                type="date"
                value={form.data_instalacao}
                onChange={(e) => set("data_instalacao", e.target.value)}
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs text-muted-foreground">Fim da garantia</span>
              <Input
                type="date"
                value={form.data_garantia_fim}
                onChange={(e) => set("data_garantia_fim", e.target.value)}
              />
            </label>
            <label className="col-span-2 space-y-1">
              <span className="text-xs text-muted-foreground">Observações</span>
              <Textarea
                rows={2}
                value={form.observacoes}
                onChange={(e) => set("observacoes", e.target.value)}
              />
            </label>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button
            size="sm"
            disabled={loading || form.modelo.trim().length < 2}
            onClick={() =>
              onSubmit({
                modelo: form.modelo.trim(),
                fabricante: "Solutek",
                numero_serie: form.numero_serie.trim() || null,
                tag_cliente: form.tag_cliente.trim() || null,
                categoria: form.categoria,
                status: form.status,
                data_entrega: form.data_entrega || null,
                data_instalacao: form.data_instalacao || null,
                data_garantia_fim: form.data_garantia_fim || null,
                localizacao: form.localizacao.trim() || null,
                valor_venda: form.valor_venda ? Number(form.valor_venda) : null,
                observacoes: form.observacoes.trim() || null,
              })
            }
          >
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Plus className="h-3.5 w-3.5" />
            )}
            Adicionar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
