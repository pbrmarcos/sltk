import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";
import { CalendarRange } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ProjetoInsumosPanel } from "@/components/engenharia/ProjetoInsumosPanel";
import type { InsumoDisciplina } from "@/lib/projeto-insumos.shared";
import { supabase } from "@/integrations/supabase/client";
import { allProjetosQueryOptions } from "@/lib/engenharia.queries";
import { createProjeto, updateProjeto } from "@/lib/equipamento-projetos.functions";
import {
  PROJETO_STATUS,
  PROJETO_STATUS_COLOR,
  PROJETO_STATUS_LABEL,
  type ProjetoDisciplina,
  type ProjetoStatus,
} from "@/lib/engenharia.shared";
import { cn } from "@/lib/utils";

export function ProjetosListPage({ disciplina }: { disciplina: ProjetoDisciplina }) {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"todos" | ProjetoStatus>("todos");
  const [revisao, setRevisao] = useState("");
  const [page, setPage] = useState(1);
  const [openNovo, setOpenNovo] = useState(false);
  const [detalhe, setDetalhe] = useState<any | null>(null);

  const { data, isLoading } = useQuery(allProjetosQueryOptions({ disciplina, q, status, page }));
  const realRows = (data?.rows ?? []).filter((r: any) =>
    revisao.trim() ? String(r.revisao ?? "").toLowerCase().includes(revisao.trim().toLowerCase()) : true,
  );
  const hasFilters = !!q || status !== "todos" || !!revisao;

  // Show DEMO content when DB is empty and no filters are applied
  const showDemo = !isLoading && realRows.length === 0 && !hasFilters;
  const demoRows = showDemo ? buildDemoProjetos(disciplina) : [];
  const rowsFiltered = showDemo ? demoRows : realRows;

  function clearFilters() {
    setQ("");
    setStatus("todos");
    setRevisao("");
    setPage(1);
  }

  const baseForKpis = showDemo ? demoRows : (data?.rows ?? []);
  const kpis = baseForKpis.reduce(
    (acc: Record<ProjetoStatus, number>, r: any) => {
      acc[r.status as ProjetoStatus] = (acc[r.status as ProjetoStatus] ?? 0) + 1;
      return acc;
    },
    { em_elaboracao: 0, em_aprovacao: 0, liberado_producao: 0, obsoleto: 0 },
  );

  const liberaMut = useMutation({
    mutationFn: (id: string) => updateProjeto({ data: { id, status: "liberado_producao" } }),
    onSuccess: () => {
      toast.success("Projeto liberado para produção.");
      qc.invalidateQueries({ queryKey: ["engenharia", "projetos"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Falha ao liberar."),
  });

  const title = disciplina === "mecanico" ? "Projetos Mecânicos" : "Projetos Elétricos";
  const subtitle =
    disciplina === "mecanico"
      ? "Revisões de desenhos, BOM mecânico e liberação para produção."
      : "Revisões elétricas, esquemas e liberação para produção.";

  return (
    <PageContainer>
      <PageHeader
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "Engenharia" }, { label: title }]}
        title={title}
        subtitle={subtitle}
        actions={<Button onClick={() => setOpenNovo(true)}>Nova revisão</Button>}
      />

      {showDemo && (
        <div className="mb-4 flex items-center gap-2 rounded-[var(--radius-lg)] border border-dashed border-[var(--bg-border)] bg-[var(--gantt-header-bg)] px-4 py-2 text-xs text-[var(--gantt-text-muted)]">
          <span className="inline-flex items-center rounded-sm bg-[var(--gantt-text)] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
            Demo
          </span>
          Nenhuma revisão cadastrada ainda — exibindo exemplos. Clique em "Nova revisão" para criar a primeira.
        </div>
      )}

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {PROJETO_STATUS.map((s) => (
          <div
            key={s}
            className="rounded-[var(--radius-lg)] border border-[var(--bg-border)] bg-[var(--bg-surface)] p-4 shadow-[var(--shadow-sm)]"
          >
            <div className="text-[11px] uppercase tracking-wide text-[var(--text-muted)]">
              {PROJETO_STATUS_LABEL[s]}
            </div>
            <div className="mt-1 text-2xl font-semibold">{kpis[s] ?? 0}</div>
          </div>
        ))}
      </div>

      <div className="mb-2 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_160px_220px]">
        <Input
          placeholder="Buscar por código, equipamento, modelo ou cliente…"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
        />
        <Input
          placeholder="Revisão (R00…)"
          value={revisao}
          onChange={(e) => setRevisao(e.target.value)}
        />
        <Select value={status} onValueChange={(v) => { setStatus(v as typeof status); setPage(1); }}>
          <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os status</SelectItem>
            {PROJETO_STATUS.map((s) => (
              <SelectItem key={s} value={s}>{PROJETO_STATUS_LABEL[s]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {hasFilters && (
        <div className="mb-4 flex flex-wrap items-center gap-2 text-xs">
          {q && <Badge variant="outline">Busca: {q}</Badge>}
          {revisao && <Badge variant="outline">Revisão: {revisao}</Badge>}
          {status !== "todos" && <Badge variant="outline">Status: {PROJETO_STATUS_LABEL[status]}</Badge>}
          <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={clearFilters}>
            Limpar filtros
          </Button>
        </div>
      )}

      <div className="rounded-[var(--radius-lg)] border border-[var(--bg-border)] bg-[var(--bg-surface)] shadow-[var(--shadow-sm)]">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-[var(--text-muted)]">Carregando…</div>
        ) : !rowsFiltered.length ? (
          <div className="p-8 text-center text-sm text-[var(--text-muted)]">
            Nenhuma revisão encontrada.
          </div>
        ) : (
          <ul className="divide-y divide-[var(--bg-border)]">
            {rowsFiltered.map((r: any) => {
              const isDemoRow = !!r.__demo;
              return (
              <li
                key={r.id}
                className={cn(
                  "grid grid-cols-[120px_1fr_80px_auto_auto_auto] items-center gap-3 p-4 text-sm transition-colors",
                  !isDemoRow && "cursor-pointer hover:bg-[var(--gantt-row-hover)]",
                )}
                onClick={() => { if (!isDemoRow) setDetalhe(r); }}
              >
                <span className="font-mono text-xs">{r.cliente_equipamentos?.codigo ?? "—"}</span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium">{r.cliente_equipamentos?.modelo}</span>
                    {isDemoRow && (
                      <span className="rounded-sm bg-[var(--gantt-text)] px-1 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white">
                        Demo
                      </span>
                    )}
                  </div>
                  <div className="truncate text-xs text-[var(--text-muted)]">
                    {r.clientes?.razao_social} · H/H: {Number(r.hh_consumida ?? 0).toFixed(1)}
                  </div>
                </div>
                <Badge variant="outline" className="text-[11px]">{r.revisao}</Badge>
                <Badge variant="outline" className={cn("text-[11px]", PROJETO_STATUS_COLOR[r.status as ProjetoStatus])}>
                  {PROJETO_STATUS_LABEL[r.status as ProjetoStatus]}
                </Badge>
                <Button
                  asChild
                  size="sm"
                  variant="ghost"
                  title="Ver Gantt / Etapas"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Link
                    to="/engenharia/etapas"
                    search={{
                      eqp: isDemoRow ? undefined : r.equipamento_id,
                      fase: isDemoRow ? undefined : "engenharia",
                    }}
                  >
                    <CalendarRange className="h-3.5 w-3.5" /> Gantt
                  </Link>
                </Button>
                {!isDemoRow && (r.status === "em_elaboracao" || r.status === "em_aprovacao") ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm("Liberar esta revisão para produção?")) liberaMut.mutate(r.id);
                    }}
                  >
                    Liberar
                  </Button>
                ) : (
                  <span />
                )}
              </li>
              );
            })}
          </ul>
        )}
      </div>

      {data && data.total > 50 && (
        <div className="mt-3 flex items-center justify-between text-xs text-[var(--text-muted)]">
          <span>Total: {data.total}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>
              Anterior
            </Button>
            <Button variant="outline" size="sm" disabled={page * 50 >= data.total} onClick={() => setPage(page + 1)}>
              Próxima
            </Button>
          </div>
        </div>
      )}

      <NovaRevisaoDialog
        disciplina={disciplina}
        open={openNovo}
        onClose={() => setOpenNovo(false)}
        onCreated={() => {
          qc.invalidateQueries({ queryKey: ["engenharia", "projetos"] });
          setOpenNovo(false);
        }}
      />

      <ProjetoDetalheDialog
        projeto={detalhe}
        disciplina={disciplina}
        onClose={() => setDetalhe(null)}
      />
    </PageContainer>
  );
}

/* ============= DEMO data ============= */
function buildDemoProjetos(disciplina: ProjetoDisciplina) {
  const base = [
    {
      codigo: "DEMO-ENV-001",
      modelo: "Envasadora rotativa 12 bicos",
      cliente: "Indústria Alfa Bebidas S/A",
      revisao: "R02",
      status: "liberado_producao" as ProjetoStatus,
      hh: 248,
    },
    {
      codigo: "DEMO-ENV-002",
      modelo: "Esteira transportadora 6m",
      cliente: "Beta Alimentos Ltda",
      revisao: "R01",
      status: "em_aprovacao" as ProjetoStatus,
      hh: 96,
    },
    {
      codigo: "DEMO-MIX-003",
      modelo: "Misturador horizontal 500L",
      cliente: "Gamma Farma",
      revisao: "R00",
      status: "em_elaboracao" as ProjetoStatus,
      hh: 32,
    },
    {
      codigo: "DEMO-ROT-004",
      modelo: "Rotuladora autoadesiva",
      cliente: "Delta Cosméticos",
      revisao: "R03",
      status: "em_elaboracao" as ProjetoStatus,
      hh: 18,
    },
    {
      codigo: "DEMO-PAL-005",
      modelo: "Paletizador automático",
      cliente: "Indústria Alfa Bebidas S/A",
      revisao: "R01",
      status: "obsoleto" as ProjetoStatus,
      hh: 410,
    },
  ];
  return base.map((b, i) => ({
    __demo: true,
    id: `demo-${disciplina}-${i}`,
    equipamento_id: `demo-eqp-${i}`,
    revisao: b.revisao,
    status: b.status,
    hh_consumida: b.hh,
    cliente_equipamentos: { codigo: b.codigo, modelo: b.modelo },
    clientes: { razao_social: b.cliente },
    disciplina,
    observacoes: "Conteúdo de demonstração — crie uma revisão real para substituir.",
  }));
}

/* ============= Detalhe inline ============= */
function ProjetoDetalheDialog({
  projeto,
  disciplina,
  onClose,
}: {
  projeto: any | null;
  disciplina: ProjetoDisciplina;
  onClose: () => void;
}) {
  return (
    <Dialog open={!!projeto} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-6xl w-[95vw] max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {disciplina === "mecanico" ? "Projeto Mecânico" : "Projeto Elétrico"} ·{" "}
            <span className="font-mono text-base">{projeto?.cliente_equipamentos?.codigo}</span>{" "}
            <Badge variant="outline" className="ml-2 text-[10px]">{projeto?.revisao}</Badge>
          </DialogTitle>
        </DialogHeader>
        {projeto && (
          <Tabs defaultValue="resumo" className="w-full">
            <TabsList>
              <TabsTrigger value="resumo">Resumo</TabsTrigger>
              <TabsTrigger value="insumos" disabled={!!projeto.__demo}>
                Insumos &amp; Materiais
              </TabsTrigger>
            </TabsList>
            <TabsContent value="resumo" className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <Info label="Equipamento" value={projeto.cliente_equipamentos?.modelo} />
                <Info label="Cliente" value={projeto.clientes?.razao_social} />
                <Info label="Revisão" value={projeto.revisao} />
                <Info
                  label="Status"
                  value={
                    <Badge variant="outline" className={cn("text-[11px]", PROJETO_STATUS_COLOR[projeto.status as ProjetoStatus])}>
                      {PROJETO_STATUS_LABEL[projeto.status as ProjetoStatus]}
                    </Badge>
                  }
                />
                <Info label="H/H consumida" value={`${Number(projeto.hh_consumida ?? 0).toFixed(1)} h`} />
                <Info
                  label="Liberado em"
                  value={projeto.liberado_em ? new Date(projeto.liberado_em).toLocaleString("pt-BR") : "—"}
                />
              </div>
              {projeto.observacoes && (
                <div>
                  <div className="mb-1 text-[11px] uppercase tracking-wide text-[var(--text-muted)]">Observações</div>
                  <div className="whitespace-pre-wrap rounded-[var(--radius-lg)] border border-[var(--bg-border)] bg-[var(--bg-elevated)] p-3 text-xs">
                    {projeto.observacoes}
                  </div>
                </div>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={onClose}>Fechar</Button>
                {!projeto.__demo && (
                  <Button asChild>
                    <Link to="/engenharia/etapas" search={{ eqp: projeto.equipamento_id, fase: "engenharia" }}>
                      Abrir Gantt
                    </Link>
                  </Button>
                )}
              </div>
            </TabsContent>
            <TabsContent value="insumos">
              {projeto.__demo ? (
                <div className="text-xs text-zinc-500 p-4">
                  Insumos só ficam disponíveis em projetos reais (não DEMO).
                </div>
              ) : (
                <ProjetoInsumosPanel
                  projetoId={projeto.id}
                  defaultDisciplina={disciplina as InsumoDisciplina}
                />
              )}
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-[var(--text-muted)]">{label}</div>
      <div className="mt-0.5 text-sm">{value ?? "—"}</div>
    </div>
  );
}

function NovaRevisaoDialog({
  disciplina,
  open,
  onClose,
  onCreated,
}: {
  disciplina: ProjetoDisciplina;
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [equipamentoId, setEquipamentoId] = useState<string>("");
  const [revisao, setRevisao] = useState("R00");
  const [busca, setBusca] = useState("");

  const { data: eqps } = useQuery({
    queryKey: ["engenharia", "nova-rev", "equipamentos", busca],
    queryFn: async () => {
      let q = supabase
        .from("cliente_equipamentos")
        .select("id, codigo, modelo, clientes(razao_social)")
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(50);
      if (busca.trim()) q = q.ilike("modelo", `%${busca.trim()}%`);
      const { data } = await q;
      return data ?? [];
    },
    enabled: open,
  });

  const createMut = useMutation({
    mutationFn: () => createProjeto({ data: { equipamento_id: equipamentoId, disciplina, revisao } }),
    onSuccess: () => {
      toast.success("Revisão criada.");
      onCreated();
    },
    onError: (e: any) => toast.error(e?.message ?? "Falha ao criar."),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nova revisão · {disciplina === "mecanico" ? "Mecânico" : "Elétrico"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <label className="block space-y-1">
            <span className="text-muted-foreground text-xs">Buscar equipamento</span>
            <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="modelo…" />
          </label>
          <label className="block space-y-1">
            <span className="text-muted-foreground text-xs">Equipamento</span>
            <Select value={equipamentoId} onValueChange={setEquipamentoId}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Selecione…" /></SelectTrigger>
              <SelectContent className="max-h-80">
                {(eqps ?? []).map((e: any) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.codigo} · {e.modelo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          <label className="block space-y-1">
            <span className="text-muted-foreground text-xs">Revisão</span>
            <Input value={revisao} onChange={(e) => setRevisao(e.target.value)} placeholder="R00" />
          </label>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button disabled={!equipamentoId || createMut.isPending} onClick={() => createMut.mutate()}>
            Criar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}