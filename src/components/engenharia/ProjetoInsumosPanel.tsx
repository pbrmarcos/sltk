import { Fragment, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  Plus,
  Trash2,
  CheckCircle2,
  CalendarIcon,
  AlertTriangle,
  History,
  ChevronDown,
  ChevronRight,
  Package,
  Send,
  ShoppingCart,
  FileSpreadsheet,
  Rocket,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { AuditoriaSolicitacoesPanel } from "@/components/compras/AuditoriaSolicitacoesPanel";
import { AlmoxLinhaCell } from "@/components/engenharia/AlmoxLinhaCell";
import { getEstoqueDosInsumos } from "@/lib/almoxarifado.functions";
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
import { useServerFn } from "@tanstack/react-start";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  listInsumos,
  upsertInsumo,
  setInsumoStatus,
  removerInsumo,
  enviarInsumosParaAprovacao,
  atualizarEstoqueInsumo,
} from "@/lib/projeto-insumos.functions";
import { listCotacoesDoProjeto } from "@/lib/cotacoes.functions";
import { listFornecedoresAtivos } from "@/lib/ordens-compra.functions";
import { ImportarInsumosDialog } from "@/components/engenharia/ImportarInsumosDialog";
import { HistoricoInsumosDrawer } from "@/components/engenharia/HistoricoInsumosDrawer";
import { LiberarProducaoDialog } from "@/components/engenharia/LiberarProducaoDialog";
import { useAuth } from "@/hooks/use-auth";
import {
  INSUMO_CRITICIDADE,
  INSUMO_CRITICIDADE_COLOR,
  INSUMO_CRITICIDADE_LABEL,
  INSUMO_DISCIPLINAS,
  INSUMO_DISCIPLINA_LABEL,
  INSUMO_STATUS_COLOR,
  INSUMO_STATUS_LABEL,
  INSUMO_UNIDADES,
  type InsumoCriticidade,
  type InsumoDisciplina,
  type InsumoStatus,
} from "@/lib/projeto-insumos.shared";
import { cn } from "@/lib/utils";

type FormState = {
  descricao: string;
  disciplina: InsumoDisciplina;
  fabricante_sugerido: string;
  part_number: string;
  codigo_interno: string;
  unidade: string;
  quantidade: number;
  criticidade: InsumoCriticidade;
  lead_time_desejado_dias: number | "";
  necessidade_em: string;
  observacoes: string;
  sub_conjunto: string;
  custo_estimado_unit: number | "";
  fornecedor_sugerido_id: string;
};

const EMPTY: FormState = {
  descricao: "",
  disciplina: "mecanico",
  fabricante_sugerido: "",
  part_number: "",
  codigo_interno: "",
  unidade: "UN",
  quantidade: 1,
  criticidade: "media",
  lead_time_desejado_dias: "",
  necessidade_em: "",
  observacoes: "",
  sub_conjunto: "",
  custo_estimado_unit: "",
  fornecedor_sugerido_id: "",
};

function fmtMoeda(v: number | null | undefined): string {
  if (v == null || Number.isNaN(v)) return "—";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function ProjetoInsumosPanel({
  projetoId,
  defaultDisciplina,
}: {
  projetoId: string;
  defaultDisciplina?: InsumoDisciplina;
}) {
  const qc = useQueryClient();
  const upsertFn = useServerFn(upsertInsumo);
  const statusFn = useServerFn(setInsumoStatus);
  const removeFn = useServerFn(removerInsumo);
  const enviarAprovacaoFn = useServerFn(enviarInsumosParaAprovacao);
  const estoqueFn = useServerFn(atualizarEstoqueInsumo);
  const { role } = useAuth();
  const canLiberar = role === "admin" || role === "manager";

  const [form, setForm] = useState<FormState>({
    ...EMPTY,
    disciplina: defaultDisciplina ?? "mecanico",
  });
  const [adding, setAdding] = useState(false);
  const [delTarget, setDelTarget] = useState<{ id: string; descricao: string } | null>(null);
  const [delMotivo, setDelMotivo] = useState("");
  const [histOpen, setHistOpen] = useState(false);
  const [histDrawerOpen, setHistDrawerOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [liberarOpen, setLiberarOpen] = useState(false);
  const [envioNota, setEnvioNota] = useState("");
  const [envioOpen, setEnvioOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [aprovacaoFilter, setAprovacaoFilter] = useState<
    "todos" | "precisa" | "pendente" | "aprovado"
  >("todos");
  const [somenteAComprar, setSomenteAComprar] = useState(false);

  const fornecedoresQ = useQuery({
    queryKey: ["fornecedores", "ativos", "bom-panel"],
    queryFn: () => listFornecedoresAtivos({ data: {} }),
    staleTime: 60_000,
  });
  const fornecedores = (fornecedoresQ.data ?? []) as Array<{
    id: string;
    codigo: string | null;
    nome: string;
    nome_fantasia: string | null;
  }>;

  const insumosQ = useQuery({
    queryKey: ["projeto", "insumos", projetoId],
    queryFn: () => listInsumos({ data: { projeto_id: projetoId, per_page: 200 } }),
  });

  const rows = insumosQ.data?.rows ?? [];

  // Indicadores globais (antes de filtrar)
  const indicadores = useMemo(() => {
    const byStatus: Record<string, number> = {};
    let precisaAprov = 0;
    let pendentesAprov = 0;
    let aprovadosCount = 0;
    let aComprarCount = 0;
    for (const r of rows) {
      byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;
      const aComprar = Math.max(0, Number(r.quantidade) - Number(r.qtd_estoque ?? 0));
      if (aComprar > 0) aComprarCount++;
      if (r.status === "pronto_aprovacao") pendentesAprov++;
      else if (r.status === "aprovado") aprovadosCount++;
      else if (
        aComprar > 0 &&
        (r.status === "rascunho" || r.status === "em_cotacao" || r.status === "cotado")
      )
        precisaAprov++;
    }
    return {
      byStatus,
      precisaAprov,
      pendentesAprov,
      aprovadosCount,
      aComprarCount,
      total: rows.length,
    };
  }, [rows]);

  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      if (statusFilter !== "todos" && r.status !== statusFilter) return false;
      const aComprar = Math.max(0, Number(r.quantidade) - Number(r.qtd_estoque ?? 0));
      if (somenteAComprar && aComprar === 0) return false;
      if (aprovacaoFilter === "precisa") {
        if (!(aComprar > 0 && ["rascunho", "em_cotacao", "cotado"].includes(r.status)))
          return false;
      } else if (aprovacaoFilter === "pendente") {
        if (r.status !== "pronto_aprovacao") return false;
      } else if (aprovacaoFilter === "aprovado") {
        if (r.status !== "aprovado") return false;
      }
      return true;
    });
  }, [rows, statusFilter, aprovacaoFilter, somenteAComprar]);

  const grupos = useMemo(() => {
    const map = new Map<string, typeof filteredRows>();
    for (const r of filteredRows) {
      const key = r.sub_conjunto?.trim() || "Sem sub-conjunto";
      const arr = map.get(key) ?? [];
      arr.push(r);
      map.set(key, arr);
    }
    return Array.from(map.entries()).sort(([a], [b]) => {
      if (a === "Sem sub-conjunto") return 1;
      if (b === "Sem sub-conjunto") return -1;
      return a.localeCompare(b, "pt-BR");
    });
  }, [filteredRows]);

  const RFQ_ELIGIBLE = ["aprovado", "em_cotacao", "pronto_aprovacao", "cotado"] as const;
  const isRfqEligible = (s: string) => (RFQ_ELIGIBLE as readonly string[]).includes(s);
  const isSelectable = (s: string) => s === "rascunho" || isRfqEligible(s);

  const selectableIds = useMemo(
    () => filteredRows.filter((r) => isSelectable(r.status)).map((r) => r.id),
    [filteredRows],
  );
  const allSelected = selectableIds.length > 0 && selectableIds.every((id) => selected.has(id));

  const selectedRows = useMemo(() => rows.filter((r) => selected.has(r.id)), [rows, selected]);
  const selRascunho = selectedRows.filter((r) => r.status === "rascunho");
  const selRfq = selectedRows.filter((r) => isRfqEligible(r.status));
  const modoSelecao: "rascunho" | "rfq" | "misto" | "nenhum" =
    selectedRows.length === 0
      ? "nenhum"
      : selRascunho.length === selectedRows.length
        ? "rascunho"
        : selRfq.length === selectedRows.length
          ? "rfq"
          : "misto";
  const categoriasRfq = useMemo(() => {
    const s = new Set<string>();
    for (const r of selRfq) if (r.categoria_slug) s.add(r.categoria_slug);
    return Array.from(s);
  }, [selRfq]);

  // Prévia do envio p/ aprovação (client-side; server aplica a mesma lógica)
  const previaEnvio = useMemo(() => {
    const enviar: Array<{ id: string; descricao: string }> = [];
    const ignEstoque: Array<{ id: string; descricao: string }> = [];
    const ignPendente: Array<{ id: string; descricao: string }> = [];
    const ignAprovado: Array<{ id: string; descricao: string }> = [];
    for (const r of selectedRows) {
      const aComprar = Math.max(0, Number(r.quantidade) - Number(r.qtd_estoque ?? 0));
      if (aComprar === 0) {
        ignEstoque.push({ id: r.id, descricao: r.descricao });
        continue;
      }
      if (r.status === "pronto_aprovacao") {
        ignPendente.push({ id: r.id, descricao: r.descricao });
        continue;
      }
      if (r.status === "aprovado") {
        ignAprovado.push({ id: r.id, descricao: r.descricao });
        continue;
      }
      enviar.push({ id: r.id, descricao: r.descricao });
    }
    return { enviar, ignEstoque, ignPendente, ignAprovado };
  }, [selectedRows]);

  const navigate = useNavigate();
  function enviarParaRFQ() {
    const ids = selRfq.map((r) => r.id);
    if (!ids.length) return;
    navigate({
      to: "/compras/cotacoes/nova",
      search: {
        insumo_ids: ids.join(","),
        projeto_id: projetoId,
        origem: "bom" as const,
      },
    });
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(selectableIds));
  }
  function toggleGroup(key: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const cotacoesQ = useQuery({
    queryKey: ["projeto", "cotacoes", projetoId],
    queryFn: () => listCotacoesDoProjeto({ data: { projeto_id: projetoId } }),
    staleTime: 30_000,
  });
  const cotacoes = (cotacoesQ.data ?? []) as Array<{
    id: string;
    codigo: string;
    titulo: string;
    status: string;
    moeda: string;
    prazo_resposta: string | null;
    created_at: string;
    itens: number;
  }>;

  function invalidate() {
    qc.invalidateQueries({ queryKey: ["projeto", "insumos", projetoId] });
    qc.invalidateQueries({ queryKey: ["compras"] });
  }

  const saveMut = useMutation({
    mutationFn: (payload: FormState) =>
      upsertFn({
        data: {
          projeto_id: projetoId,
          descricao: payload.descricao,
          disciplina: payload.disciplina,
          fabricante_sugerido: payload.fabricante_sugerido || null,
          part_number: payload.part_number || null,
          codigo_interno: payload.codigo_interno || null,
          unidade: payload.unidade,
          quantidade: Number(payload.quantidade),
          criticidade: payload.criticidade,
          lead_time_desejado_dias:
            payload.lead_time_desejado_dias === "" ? null : Number(payload.lead_time_desejado_dias),
          necessidade_em: payload.necessidade_em || null,
          observacoes: payload.observacoes || null,
          sub_conjunto: payload.sub_conjunto.trim() || null,
          custo_estimado_unit:
            payload.custo_estimado_unit === "" ? null : Number(payload.custo_estimado_unit),
          fornecedor_sugerido_id: payload.fornecedor_sugerido_id || null,
        },
      }),
    onSuccess: () => {
      toast.success("Insumo adicionado.");
      setForm({ ...EMPTY, disciplina: defaultDisciplina ?? "mecanico" });
      setAdding(false);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const aprovarMut = useMutation({
    mutationFn: (id: string) => statusFn({ data: { id, status: "aprovado" } }),
    onSuccess: () => {
      toast.success("Insumo aprovado — visível para Compras.");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const enviarAprovacaoMut = useMutation({
    mutationFn: (payload: { ids: string[]; nota: string | null }) =>
      enviarAprovacaoFn({ data: payload }),
    onSuccess: (res: {
      enviados: number;
      ignorados: Array<{ descricao: string; motivo: string }>;
    }) => {
      if (res.enviados > 0) {
        toast.success(
          `${res.enviados} ${res.enviados === 1 ? "insumo enviado" : "insumos enviados"} para aprovação.` +
            (res.ignorados.length > 0 ? ` ${res.ignorados.length} ignorado(s).` : ""),
        );
      } else if (res.ignorados.length > 0) {
        toast.warning(
          `Nenhum insumo enviado — ${res.ignorados.length} ignorado(s): ${res.ignorados
            .slice(0, 3)
            .map((x) => x.motivo)
            .join(", ")}${res.ignorados.length > 3 ? "…" : ""}`,
        );
      }
      setSelected(new Set());
      setEnvioOpen(false);
      setEnvioNota("");
      invalidate();
      qc.invalidateQueries({ queryKey: ["projeto-insumo-historico", projetoId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const almoxEstoqueFn = useServerFn(getEstoqueDosInsumos);
  const { data: almoxEstoque } = useQuery({
    queryKey: ["projeto-insumos-estoque", projetoId],
    queryFn: () => almoxEstoqueFn({ data: { projeto_id: projetoId } }),
    staleTime: 60_000,
  });

  const estoqueMut = useMutation({
    mutationFn: (payload: { id: string; qtd_estoque: number }) => estoqueFn({ data: payload }),
    onSuccess: () => {
      invalidate();
      qc.invalidateQueries({ queryKey: ["projeto-insumo-historico", projetoId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const delMut = useMutation({
    mutationFn: (payload: { id: string; motivo: string | null }) =>
      removeFn({ data: { id: payload.id, motivo: payload.motivo } }),
    onSuccess: () => {
      toast.success("Insumo removido — registrado no histórico (retenção 30 dias).");
      setDelTarget(null);
      setDelMotivo("");
      invalidate();
    },
    onError: (e: Error) => {
      toast.error(`Falha ao remover: ${e.message}`);
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
            Insumos &amp; Materiais
          </h3>
          <p className="text-xs text-[var(--text-muted)]">
            BOM do projeto por pilar/disciplina. Itens aprovados aparecem em Compras → Necessidades.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => setImportOpen(true)}>
            <FileSpreadsheet className="h-4 w-4 mr-1" /> Import/Export Excel
          </Button>
          <Button size="sm" variant="outline" onClick={() => setHistDrawerOpen(true)}>
            <History className="h-4 w-4 mr-1" /> Histórico
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setHistOpen(true)}
            title="Timeline de aprovações"
          >
            Timeline
          </Button>
          {canLiberar ? (
            <Button
              size="sm"
              className="bg-fuchsia-600 hover:bg-fuchsia-700"
              onClick={() => setLiberarOpen(true)}
              title="Liberar equipamento para produção"
            >
              <Rocket className="h-4 w-4 mr-1" /> Liberar p/ produção
            </Button>
          ) : null}
          {!adding ? (
            <Button size="sm" onClick={() => setAdding(true)}>
              <Plus className="h-4 w-4 mr-1" /> Adicionar insumo
            </Button>
          ) : null}
        </div>
      </div>

      {adding ? (
        <div className="rounded-lg border border-[var(--bg-border)] bg-[var(--bg-surface)] p-3 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-2">
            <div className="md:col-span-3">
              <label className="text-xs text-[var(--text-secondary)]">Descrição *</label>
              <Input
                value={form.descricao}
                onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                placeholder="Ex.: Motor trifásico 5cv 220/380V"
              />
            </div>
            <div>
              <label className="text-xs text-[var(--text-secondary)]">Disciplina</label>
              <Select
                value={form.disciplina}
                onValueChange={(v) => setForm({ ...form, disciplina: v as InsumoDisciplina })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INSUMO_DISCIPLINAS.map((d) => (
                    <SelectItem key={d} value={d}>
                      {INSUMO_DISCIPLINA_LABEL[d]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-[var(--text-secondary)]">Qtd</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={form.quantidade}
                onChange={(e) => setForm({ ...form, quantidade: Number(e.target.value) })}
              />
            </div>
            <div>
              <label className="text-xs text-[var(--text-secondary)]">Unidade</label>
              <Select value={form.unidade} onValueChange={(v) => setForm({ ...form, unidade: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INSUMO_UNIDADES.map((u) => (
                    <SelectItem key={u} value={u}>
                      {u}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-[var(--text-secondary)]">Fabricante</label>
              <Input
                value={form.fabricante_sugerido}
                onChange={(e) => setForm({ ...form, fabricante_sugerido: e.target.value })}
                placeholder="WEG, Siemens..."
              />
            </div>
            <div>
              <label className="text-xs text-[var(--text-secondary)]">Part Number</label>
              <Input
                value={form.part_number}
                onChange={(e) => setForm({ ...form, part_number: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs text-[var(--text-secondary)]">Código interno</label>
              <Input
                value={form.codigo_interno}
                onChange={(e) => setForm({ ...form, codigo_interno: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs text-[var(--text-secondary)]">Criticidade</label>
              <Select
                value={form.criticidade}
                onValueChange={(v) => setForm({ ...form, criticidade: v as InsumoCriticidade })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INSUMO_CRITICIDADE.map((c) => (
                    <SelectItem key={c} value={c}>
                      {INSUMO_CRITICIDADE_LABEL[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-[var(--text-secondary)]">Lead time (dias)</label>
              <Input
                type="number"
                min="0"
                value={form.lead_time_desejado_dias}
                onChange={(e) =>
                  setForm({
                    ...form,
                    lead_time_desejado_dias: e.target.value === "" ? "" : Number(e.target.value),
                  })
                }
              />
            </div>
            <div>
              <label className="text-xs text-[var(--text-secondary)]">Necessidade em</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    type="button"
                    className={cn(
                      "w-full justify-start font-normal",
                      !form.necessidade_em && "text-[var(--text-muted)]",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {form.necessidade_em
                      ? new Date(form.necessidade_em + "T00:00:00").toLocaleDateString("pt-BR")
                      : "Selecionar data"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={
                      form.necessidade_em ? new Date(form.necessidade_em + "T00:00:00") : undefined
                    }
                    onSelect={(d) =>
                      setForm({
                        ...form,
                        necessidade_em: d
                          ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
                          : "",
                      })
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="md:col-span-2">
              <label className="text-xs text-[var(--text-secondary)]">Sub-conjunto</label>
              <Input
                value={form.sub_conjunto}
                onChange={(e) => setForm({ ...form, sub_conjunto: e.target.value })}
                placeholder="Ex.: Transportador de entrada"
                list={`bom-subconjuntos-${projetoId}`}
              />
              <datalist id={`bom-subconjuntos-${projetoId}`}>
                {Array.from(new Set(rows.map((r) => r.sub_conjunto).filter(Boolean))).map((s) => (
                  <option key={s as string} value={s as string} />
                ))}
              </datalist>
            </div>
            <div>
              <label className="text-xs text-[var(--text-secondary)]">Custo estimado (un)</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={form.custo_estimado_unit}
                onChange={(e) =>
                  setForm({
                    ...form,
                    custo_estimado_unit: e.target.value === "" ? "" : Number(e.target.value),
                  })
                }
              />
            </div>
            <div className="md:col-span-3">
              <label className="text-xs text-[var(--text-secondary)]">Fornecedor sugerido</label>
              <Select
                value={form.fornecedor_sugerido_id || "__none__"}
                onValueChange={(v) =>
                  setForm({ ...form, fornecedor_sugerido_id: v === "__none__" ? "" : v })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Nenhum" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Nenhum</SelectItem>
                  {fornecedores.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.nome_fantasia || f.nome}
                      {f.codigo ? ` · ${f.codigo}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-6">
              <label className="text-xs text-[var(--text-secondary)]">Observações</label>
              <Textarea
                rows={2}
                value={form.observacoes}
                onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setAdding(false)}>
              Cancelar
            </Button>
            <Button
              size="sm"
              disabled={!form.descricao || saveMut.isPending}
              onClick={() => saveMut.mutate(form)}
            >
              Salvar como rascunho
            </Button>
          </div>
        </div>
      ) : null}

      {/* Indicadores + Filtros */}
      {rows.length > 0 ? (
        <div className="rounded-lg border border-[var(--bg-border)] bg-[var(--bg-surface)] p-3 space-y-2">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <button
              type="button"
              onClick={() => {
                setAprovacaoFilter("todos");
                setStatusFilter("todos");
                setSomenteAComprar(false);
              }}
              className={cn(
                "rounded-md border px-2 py-1 hover:bg-[var(--bg-elevated)]",
                aprovacaoFilter === "todos" && statusFilter === "todos" && !somenteAComprar
                  ? "border-[var(--bg-border)] bg-[var(--bg-elevated)] font-medium"
                  : "border-[var(--bg-border)]",
              )}
            >
              Total <b className="ml-1 tabular-nums">{indicadores.total}</b>
            </button>
            <button
              type="button"
              onClick={() =>
                setAprovacaoFilter(aprovacaoFilter === "precisa" ? "todos" : "precisa")
              }
              className={cn(
                "rounded-md border px-2 py-1 hover:bg-amber-50",
                aprovacaoFilter === "precisa"
                  ? "border-amber-400 bg-amber-100 font-medium text-amber-900"
                  : "border-amber-200 text-amber-800",
              )}
            >
              Precisa aprovação <b className="ml-1 tabular-nums">{indicadores.precisaAprov}</b>
            </button>
            <button
              type="button"
              onClick={() =>
                setAprovacaoFilter(aprovacaoFilter === "pendente" ? "todos" : "pendente")
              }
              className={cn(
                "rounded-md border px-2 py-1 hover:bg-fuchsia-50",
                aprovacaoFilter === "pendente"
                  ? "border-fuchsia-400 bg-fuchsia-100 font-medium text-fuchsia-900"
                  : "border-fuchsia-200 text-fuchsia-800",
              )}
            >
              Aguardando decisão <b className="ml-1 tabular-nums">{indicadores.pendentesAprov}</b>
            </button>
            <button
              type="button"
              onClick={() =>
                setAprovacaoFilter(aprovacaoFilter === "aprovado" ? "todos" : "aprovado")
              }
              className={cn(
                "rounded-md border px-2 py-1 hover:bg-emerald-50",
                aprovacaoFilter === "aprovado"
                  ? "border-emerald-400 bg-emerald-100 font-medium text-emerald-900"
                  : "border-emerald-200 text-emerald-800",
              )}
            >
              Aprovados <b className="ml-1 tabular-nums">{indicadores.aprovadosCount}</b>
            </button>
            <button
              type="button"
              onClick={() => setSomenteAComprar((v) => !v)}
              className={cn(
                "rounded-md border px-2 py-1 hover:bg-blue-50",
                somenteAComprar
                  ? "border-blue-400 bg-blue-100 font-medium text-blue-900"
                  : "border-blue-200 text-blue-800",
              )}
            >
              A comprar <b className="ml-1 tabular-nums">{indicadores.aComprarCount}</b>
            </button>

            <div className="ml-auto flex items-center gap-2">
              <span className="text-[11px] text-[var(--text-muted)]">Status:</span>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-7 w-[170px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os status</SelectItem>
                  {(Object.keys(INSUMO_STATUS_LABEL) as InsumoStatus[]).map((s) => (
                    <SelectItem key={s} value={s}>
                      {INSUMO_STATUS_LABEL[s]}
                      {indicadores.byStatus[s] ? ` (${indicadores.byStatus[s]})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {(statusFilter !== "todos" || aprovacaoFilter !== "todos" || somenteAComprar) && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs"
                  onClick={() => {
                    setStatusFilter("todos");
                    setAprovacaoFilter("todos");
                    setSomenteAComprar(false);
                  }}
                >
                  Limpar filtros
                </Button>
              )}
            </div>
          </div>
          {filteredRows.length !== rows.length && (
            <p className="text-[11px] text-[var(--text-muted)]">
              Exibindo <b>{filteredRows.length}</b> de {rows.length} insumos com os filtros ativos.
            </p>
          )}
        </div>
      ) : null}

      {selected.size > 0 ? (
        <div
          className={cn(
            "rounded-lg border px-3 py-2 flex flex-wrap items-center justify-between gap-2",
            modoSelecao === "rascunho" && "border-emerald-200 bg-emerald-50",
            modoSelecao === "rfq" && "border-sky-200 bg-sky-50",
            modoSelecao === "misto" && "border-amber-200 bg-amber-50",
          )}
        >
          <div className="text-xs">
            <span className="font-medium">{selected.size}</span>{" "}
            {selected.size === 1 ? "item selecionado" : "itens selecionados"}
            {modoSelecao === "rascunho" && " · todos rascunhos → aprovar em lote"}
            {modoSelecao === "rfq" && (
              <>
                {" "}
                · todos aprovados/em cotação → gerar Checklist
                {categoriasRfq.length > 1 && (
                  <span className="ml-1 text-amber-700">
                    ({categoriasRfq.length} categorias — considere dividir)
                  </span>
                )}
              </>
            )}
            {modoSelecao === "misto" && (
              <> · seleção mista — separe rascunhos de aprovados para agir</>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setSelected(new Set())}
              disabled={enviarAprovacaoMut.isPending}
            >
              Limpar
            </Button>
            {(modoSelecao === "rascunho" || modoSelecao === "rfq") && (
              <Button
                size="sm"
                className="bg-violet-600 hover:bg-violet-700"
                disabled={enviarAprovacaoMut.isPending}
                onClick={() => setEnvioOpen(true)}
              >
                <Send className="h-4 w-4 mr-1" />
                Enviar seleção p/ aprovação ({selected.size})
              </Button>
            )}
            {modoSelecao === "rfq" && (
              <Button size="sm" className="bg-sky-600 hover:bg-sky-700" onClick={enviarParaRFQ}>
                <ShoppingCart className="h-4 w-4 mr-1" />
                Enviar para Cotação ({selRfq.length})
              </Button>
            )}
          </div>
        </div>
      ) : null}

      {cotacoes.length > 0 ? (
        <div className="rounded-lg border border-[var(--bg-border)] bg-[var(--bg-surface)] overflow-hidden">
          <div className="flex items-center gap-2 border-b border-[var(--bg-border)] bg-[var(--bg-elevated)] px-3 py-2 text-xs">
            <ShoppingCart className="h-3.5 w-3.5 text-[var(--text-muted)]" />
            <span className="font-semibold text-[var(--text-primary)]">Cotações desta B.O.M.</span>
            <Badge variant="outline" className="font-normal">
              {cotacoes.length}
            </Badge>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-[var(--bg-surface)] text-left text-[var(--text-muted)]">
                <tr>
                  <th className="px-3 py-1.5">Código</th>
                  <th className="px-3 py-1.5">Título</th>
                  <th className="px-3 py-1.5">Itens</th>
                  <th className="px-3 py-1.5">Status</th>
                  <th className="px-3 py-1.5">Criada</th>
                  <th className="px-3 py-1.5" />
                </tr>
              </thead>
              <tbody>
                {cotacoes.map((c) => (
                  <tr key={c.id} className="border-t border-[var(--bg-border)]">
                    <td className="px-3 py-1.5 font-mono">{c.codigo}</td>
                    <td className="px-3 py-1.5">{c.titulo}</td>
                    <td className="px-3 py-1.5 tabular-nums">{c.itens}</td>
                    <td className="px-3 py-1.5 capitalize">{c.status}</td>
                    <td className="px-3 py-1.5 text-[var(--text-muted)]">
                      {new Date(c.created_at).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="px-3 py-1.5 text-right">
                      <Link
                        to="/compras/cotacoes/$id"
                        params={{ id: c.id }}
                        className="text-sky-700 hover:underline"
                      >
                        Abrir →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      <div className="rounded-lg border border-[var(--bg-border)] bg-[var(--bg-surface)] overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={toggleAll}
                  disabled={selectableIds.length === 0}
                  aria-label="Selecionar todos os rascunhos"
                />
              </TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Disciplina</TableHead>
              <TableHead className="text-right">Qtd</TableHead>
              <TableHead className="text-right">Estoque</TableHead>
              <TableHead className="text-right">A comprar</TableHead>
              <TableHead className="text-right">Almoxarifado</TableHead>
              <TableHead className="text-right">Custo est.</TableHead>
              <TableHead>Fornecedor sugerido</TableHead>
              <TableHead>Criticidade</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[110px] text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {insumosQ.isLoading ? (
              <TableRow>
                <TableCell
                  colSpan={12}
                  className="text-center text-xs text-[var(--text-muted)] py-6"
                >
                  Carregando…
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={12}
                  className="text-center text-xs text-[var(--text-muted)] py-6"
                >
                  Nenhum insumo cadastrado para este projeto ainda.
                </TableCell>
              </TableRow>
            ) : (
              grupos.map(([grupo, itens]) => {
                const isCollapsed = collapsed.has(grupo);
                const subtotal = itens.reduce(
                  (acc, r) =>
                    acc +
                    (r.custo_estimado_unit
                      ? Number(r.custo_estimado_unit) * Number(r.quantidade)
                      : 0),
                  0,
                );
                return (
                  <Fragment key={`g-${grupo}`}>
                    <TableRow
                      key={`g-${grupo}`}
                      className="bg-[var(--bg-elevated)] hover:bg-[var(--bg-elevated)] cursor-pointer"
                      onClick={() => toggleGroup(grupo)}
                    >
                      <TableCell colSpan={12} className="py-2">
                        <div className="flex items-center gap-2 text-xs">
                          {isCollapsed ? (
                            <ChevronRight className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                          ) : (
                            <ChevronDown className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                          )}
                          <Package className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                          <span className="font-semibold text-[var(--text-primary)]">{grupo}</span>
                          <Badge variant="outline" className="font-normal">
                            {itens.length} {itens.length === 1 ? "item" : "itens"}
                          </Badge>
                          {subtotal > 0 ? (
                            <span className="ml-auto text-[11px] tabular-nums text-[var(--text-secondary)]">
                              Subtotal estimado: <b>{fmtMoeda(subtotal)}</b>
                            </span>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                    {isCollapsed
                      ? null
                      : itens.map((r) => {
                          const custoTotal =
                            r.custo_estimado_unit != null
                              ? Number(r.custo_estimado_unit) * Number(r.quantidade)
                              : null;
                          return (
                            <TableRow
                              key={r.id}
                              data-selected={selected.has(r.id) ? "" : undefined}
                            >
                              <TableCell>
                                <Checkbox
                                  checked={selected.has(r.id)}
                                  onCheckedChange={() => toggleOne(r.id)}
                                  disabled={!isSelectable(r.status)}
                                  aria-label={`Selecionar ${r.descricao}`}
                                />
                              </TableCell>
                              <TableCell>
                                <div className="text-sm font-medium text-[var(--text-primary)]">
                                  {r.descricao}
                                </div>
                                <div className="text-[11px] text-[var(--text-muted)]">
                                  {[r.fabricante_sugerido, r.part_number, r.codigo_interno]
                                    .filter(Boolean)
                                    .join(" · ") || "—"}
                                </div>
                              </TableCell>
                              <TableCell className="text-xs">
                                {INSUMO_DISCIPLINA_LABEL[r.disciplina as InsumoDisciplina] ??
                                  r.disciplina}
                              </TableCell>
                              <TableCell className="text-right text-xs tabular-nums">
                                {r.quantidade} {r.unidade}
                              </TableCell>
                              <TableCell className="text-right text-xs tabular-nums">
                                <EstoqueInput
                                  value={Number(r.qtd_estoque ?? 0)}
                                  disabled={!canLiberar && role !== "engineer"}
                                  onSave={(v) => estoqueMut.mutate({ id: r.id, qtd_estoque: v })}
                                />
                              </TableCell>
                              <TableCell className="text-right text-xs tabular-nums">
                                {(() => {
                                  const aComprar = Math.max(
                                    0,
                                    Number(r.quantidade) - Number(r.qtd_estoque ?? 0),
                                  );
                                  return aComprar === 0 ? (
                                    <Badge
                                      variant="outline"
                                      className="border-emerald-200 bg-emerald-50 text-emerald-700 font-normal"
                                    >
                                      ok
                                    </Badge>
                                  ) : (
                                    <span className="font-medium text-blue-700">
                                      {aComprar} {r.unidade}
                                    </span>
                                  );
                                })()}
                              </TableCell>
                              <TableCell className="text-right text-xs">
                                <AlmoxLinhaCell
                                  insumo={{
                                    id: r.id,
                                    descricao: r.descricao,
                                    unidade: r.unidade,
                                    quantidade: Number(r.quantidade),
                                  }}
                                  projetoId={projetoId}
                                  estoque={(almoxEstoque as any)?.[r.id]}
                                  podeEditar={canLiberar || role === "engineer"}
                                />
                              </TableCell>
                              <TableCell className="text-right text-xs tabular-nums">
                                {r.custo_estimado_unit != null ? (
                                  <div>
                                    <div>{fmtMoeda(Number(r.custo_estimado_unit))}</div>
                                    <div className="text-[10px] text-[var(--text-muted)]">
                                      Total: {fmtMoeda(custoTotal)}
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-[var(--text-muted)]">—</span>
                                )}
                              </TableCell>
                              <TableCell className="text-xs">
                                {r.fornecedor_sugerido ? (
                                  <span
                                    className="text-[var(--text-secondary)]"
                                    title={r.fornecedor_sugerido.nome}
                                  >
                                    {r.fornecedor_sugerido.nome_fantasia ||
                                      r.fornecedor_sugerido.nome}
                                  </span>
                                ) : (
                                  <span className="text-[var(--text-muted)]">—</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    "font-normal",
                                    INSUMO_CRITICIDADE_COLOR[r.criticidade as InsumoCriticidade],
                                  )}
                                >
                                  {INSUMO_CRITICIDADE_LABEL[r.criticidade as InsumoCriticidade]}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    "font-normal",
                                    INSUMO_STATUS_COLOR[r.status as InsumoStatus],
                                  )}
                                >
                                  {INSUMO_STATUS_LABEL[r.status as InsumoStatus]}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-1">
                                  {r.status === "rascunho" ? (
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-7 w-7"
                                      title="Aprovar e enviar para Compras"
                                      onClick={() => aprovarMut.mutate(r.id)}
                                    >
                                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                    </Button>
                                  ) : null}
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-7 w-7"
                                    title="Remover"
                                    onClick={() =>
                                      setDelTarget({ id: r.id, descricao: r.descricao })
                                    }
                                  >
                                    <Trash2 className="h-4 w-4 text-rose-600" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                  </Fragment>
                );
              })
            )}
          </TableBody>
          {rows.length > 0 ? (
            <tfoot className="bg-[var(--bg-elevated)] border-t border-[var(--bg-border)]">
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-2 text-xs text-[var(--text-secondary)] font-medium"
                >
                  Total geral estimado
                </td>
                <td className="px-4 py-2 text-right text-xs tabular-nums font-semibold text-[var(--text-primary)]">
                  {fmtMoeda(
                    rows.reduce(
                      (acc, r) =>
                        acc +
                        (r.custo_estimado_unit
                          ? Number(r.custo_estimado_unit) * Number(r.quantidade)
                          : 0),
                      0,
                    ),
                  )}
                </td>
                <td colSpan={4} />
              </tr>
            </tfoot>
          ) : null}
        </Table>
      </div>

      <AlertDialog
        open={!!delTarget}
        onOpenChange={(o) => {
          if (!o) {
            setDelTarget(null);
            setDelMotivo("");
          }
        }}
      >
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-rose-600" />
              Remover insumo
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm">
                <p>
                  Você está prestes a remover{" "}
                  <span className="font-medium text-[var(--text-primary)]">
                    "{delTarget?.descricao}"
                  </span>
                  .
                </p>
                <p className="text-xs text-[var(--text-muted)]">
                  O item é ocultado imediatamente e mantido por 30 dias no histórico. Após esse
                  prazo é excluído permanentemente. A remoção fica registrada com usuário, data e
                  motivo (opcional).
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-1">
            <label className="text-xs text-[var(--text-secondary)]">Motivo (opcional)</label>
            <Textarea
              rows={3}
              value={delMotivo}
              onChange={(e) => setDelMotivo(e.target.value)}
              placeholder="Ex.: item duplicado, substituído por outro fabricante…"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={delMut.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={delMut.isPending}
              className="bg-rose-600 hover:bg-rose-700 focus:ring-rose-600"
              onClick={(e) => {
                e.preventDefault();
                if (!delTarget) return;
                delMut.mutate({ id: delTarget.id, motivo: delMotivo.trim() || null });
              }}
            >
              {delMut.isPending ? "Removendo…" : "Confirmar remoção"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={histOpen} onOpenChange={setHistOpen}>
        <DialogContent className="max-w-5xl w-[95vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-4 w-4" /> Histórico &amp; Timeline do projeto
            </DialogTitle>
            <DialogDescription>
              Todas as atividades dos insumos deste projeto — inclusive itens removidos (retenção de
              30 dias). Use o filtro <b>Excluídos</b> para ver remoções e restaurar quando
              necessário.
            </DialogDescription>
          </DialogHeader>
          <AuditoriaSolicitacoesPanel projetoId={projetoId} />
        </DialogContent>
      </Dialog>

      <ImportarInsumosDialog open={importOpen} onOpenChange={setImportOpen} projetoId={projetoId} />

      <HistoricoInsumosDrawer
        open={histDrawerOpen}
        onOpenChange={setHistDrawerOpen}
        projetoId={projetoId}
      />

      {rows[0]?.equipamento_id && liberarOpen ? (
        <LiberarProducaoDialog
          open={liberarOpen}
          onClose={() => setLiberarOpen(false)}
          equipamentoId={rows[0].equipamento_id}
          onDone={() => {
            setLiberarOpen(false);
            invalidate();
            qc.invalidateQueries({ queryKey: ["engenharia"] });
          }}
        />
      ) : null}

      <AlertDialog open={envioOpen} onOpenChange={(o) => !o && setEnvioOpen(false)}>
        <AlertDialogContent className="max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Enviar seleção para aprovação</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-1 text-sm">
                <p>
                  <b className="text-emerald-700">{previaEnvio.enviar.length}</b>{" "}
                  {previaEnvio.enviar.length === 1
                    ? "insumo será enviado"
                    : "insumos serão enviados"}{" "}
                  para aprovação por engenheiro, gerente ou admin.
                </p>
                {previaEnvio.ignEstoque.length +
                  previaEnvio.ignPendente.length +
                  previaEnvio.ignAprovado.length >
                  0 && (
                  <p className="text-xs text-amber-700">
                    <b>
                      {previaEnvio.ignEstoque.length +
                        previaEnvio.ignPendente.length +
                        previaEnvio.ignAprovado.length}
                    </b>{" "}
                    ignorado(s):{" "}
                    {previaEnvio.ignEstoque.length > 0 &&
                      `${previaEnvio.ignEstoque.length} c/ estoque suficiente`}
                    {previaEnvio.ignEstoque.length > 0 &&
                      previaEnvio.ignPendente.length + previaEnvio.ignAprovado.length > 0 &&
                      ", "}
                    {previaEnvio.ignPendente.length > 0 &&
                      `${previaEnvio.ignPendente.length} aguardando decisão`}
                    {previaEnvio.ignPendente.length > 0 &&
                      previaEnvio.ignAprovado.length > 0 &&
                      ", "}
                    {previaEnvio.ignAprovado.length > 0 &&
                      `${previaEnvio.ignAprovado.length} já aprovado(s)`}
                    .
                  </p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>

          {previaEnvio.ignEstoque.length +
            previaEnvio.ignPendente.length +
            previaEnvio.ignAprovado.length >
            0 && (
            <div className="max-h-40 overflow-y-auto rounded-md border bg-[var(--bg-elevated)] p-2 text-[11px] space-y-1">
              {previaEnvio.ignEstoque.slice(0, 8).map((r) => (
                <div key={`e-${r.id}`}>
                  <Badge
                    variant="outline"
                    className="mr-1 border-emerald-200 bg-emerald-50 text-emerald-800 font-normal"
                  >
                    estoque
                  </Badge>
                  {r.descricao}
                </div>
              ))}
              {previaEnvio.ignPendente.slice(0, 8).map((r) => (
                <div key={`p-${r.id}`}>
                  <Badge
                    variant="outline"
                    className="mr-1 border-fuchsia-200 bg-fuchsia-50 text-fuchsia-800 font-normal"
                  >
                    aguardando
                  </Badge>
                  {r.descricao}
                </div>
              ))}
              {previaEnvio.ignAprovado.slice(0, 8).map((r) => (
                <div key={`a-${r.id}`}>
                  <Badge
                    variant="outline"
                    className="mr-1 border-emerald-200 bg-emerald-50 text-emerald-800 font-normal"
                  >
                    aprovado
                  </Badge>
                  {r.descricao}
                </div>
              ))}
              {previaEnvio.ignEstoque.length +
                previaEnvio.ignPendente.length +
                previaEnvio.ignAprovado.length >
                24 && <div className="italic text-[var(--text-muted)]">…e mais itens.</div>}
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs text-[var(--text-secondary)]">
              Nota para o aprovador (opcional)
            </label>
            <Textarea
              rows={3}
              value={envioNota}
              onChange={(e) => setEnvioNota(e.target.value)}
              placeholder="Contexto, prioridade, prazos…"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={enviarAprovacaoMut.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={enviarAprovacaoMut.isPending || previaEnvio.enviar.length === 0}
              className="bg-violet-600 hover:bg-violet-700"
              onClick={(e) => {
                e.preventDefault();
                if (previaEnvio.enviar.length === 0) {
                  toast.warning("Nenhum item elegível para envio na seleção.");
                  return;
                }
                enviarAprovacaoMut.mutate({
                  ids: previaEnvio.enviar.map((r) => r.id),
                  nota: envioNota.trim() || null,
                });
              }}
            >
              {enviarAprovacaoMut.isPending
                ? "Enviando…"
                : `Confirmar envio (${previaEnvio.enviar.length})`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function EstoqueInput({
  value,
  disabled,
  onSave,
}: {
  value: number;
  disabled?: boolean;
  onSave: (v: number) => void;
}) {
  const [local, setLocal] = useState(String(value));
  return (
    <input
      type="number"
      step="0.01"
      min="0"
      disabled={disabled}
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={() => {
        const n = Number(local);
        if (!Number.isFinite(n) || n < 0) {
          setLocal(String(value));
          return;
        }
        if (n !== value) onSave(n);
      }}
      className="w-16 rounded border border-[var(--bg-border)] bg-transparent px-1 py-0.5 text-right tabular-nums text-xs focus:border-primary focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
    />
  );
}
