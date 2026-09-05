import { createFileRoute } from "@tanstack/react-router";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { useState } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TableEmpty } from "@/components/data/TableStates";
import { Search, AlertTriangle, ChevronRight, History } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { InsumoActionDialog } from "@/components/compras/InsumoActionDialog";
import { AuditoriaSolicitacoesPanel } from "@/components/compras/AuditoriaSolicitacoesPanel";

import type { InsumoRow } from "@/lib/projeto-insumos.functions";
import {
  listInsumos,
  necessidadesPorCategoria,
} from "@/lib/projeto-insumos.functions";
import {
  INSUMO_CRITICIDADE,
  INSUMO_CRITICIDADE_COLOR,
  INSUMO_CRITICIDADE_LABEL,
  INSUMO_DISCIPLINA_LABEL,
  INSUMO_STATUS,
  INSUMO_STATUS_COLOR,
  INSUMO_STATUS_LABEL,
  type InsumoCriticidade,
  type InsumoStatus,
} from "@/lib/projeto-insumos.shared";
import { cn } from "@/lib/utils";

type SolicitacaoSearch = {
  equipamento?: string;
  origem?: "eqp" | "projeto" | "todos";
};

export const Route = createFileRoute("/_authenticated/compras/solicitacao")({
  validateSearch: (s: Record<string, unknown>): SolicitacaoSearch => ({
    equipamento: typeof s.equipamento === "string" ? s.equipamento : undefined,
    origem: (s.origem === "eqp" || s.origem === "projeto" || s.origem === "todos") ? s.origem : undefined,
  }),
  component: SolicitacoesPage,
});

function SolicitacoesPage() {
  const search = Route.useSearch();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"todos" | InsumoStatus>("todos");
  const [criticidade, setCriticidade] = useState<"todos" | InsumoCriticidade>("todos");
  const [disciplina, setDisciplina] = useState<string>("todos");
  const [origem, setOrigem] = useState<"todos" | "eqp" | "projeto">(search.origem ?? "todos");
  const equipamentoFilter = search.equipamento;
  const [selected, setSelected] = useState<InsumoRow | null>(null);

  const insumosQ = useQuery({
    queryKey: ["compras", "solicitacoes", { q, status, criticidade, disciplina, origem, equipamentoFilter }],
    queryFn: () =>
      listInsumos({
        data: {
          q: q || undefined,
          status,
          criticidade,
          disciplina: disciplina === "todos" ? undefined : disciplina,
          origem,
          equipamento_id: equipamentoFilter || undefined,
          page: 1,
          per_page: 100,
        },
      }),
    placeholderData: keepPreviousData,
  });

  const catsQ = useQuery({
    queryKey: ["compras", "solicitacoes", "por-categoria"],
    queryFn: () => necessidadesPorCategoria(),
  });

  const rows = insumosQ.data?.rows ?? [];
  const total = insumosQ.data?.total ?? 0;
  const criticos = rows.filter((r) => r.criticidade === "critica" || r.criticidade === "alta").length;

  return (
    <PageContainer>
      <PageHeader
        title="Solicitações de Compra"
        subtitle="Insumos solicitados pelos projetos por disciplina (pilar). Use para abrir cotações e ordens de compra."
        breadcrumbs={[{ label: "Compras" }, { label: "Solicitações" }]}
      />
      <Tabs defaultValue="lista" className="w-full">
        <TabsList>
          <TabsTrigger value="lista">Lista</TabsTrigger>
          <TabsTrigger value="auditoria">
            <History className="h-3.5 w-3.5 mr-1" />
            Auditoria
          </TabsTrigger>
        </TabsList>

        <TabsContent value="lista" className="mt-4">


      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        <KpiCard label="Itens listados" value={total} />
        <KpiCard
          label="Críticos / Alta"
          value={criticos}
          icon={<AlertTriangle className="h-4 w-4 text-amber-600" />}
        />
        <KpiCard label="Categorias com demanda" value={catsQ.data?.length ?? 0} />
      </div>

      {/* Categorias chips */}
      {catsQ.data && catsQ.data.length > 0 ? (
        <div className="mb-4 flex flex-wrap gap-2">
          {catsQ.data.slice(0, 12).map((c) => (
            <span
              key={c.categoria_slug ?? "sem"}
              className="inline-flex items-center gap-2 rounded-full border border-[var(--bg-border)] bg-[var(--bg-surface)] px-3 py-1 text-xs"
            >
              <span className="font-medium">{c.label}</span>
              <span className="text-[var(--text-muted)]">{c.total}</span>
              {c.criticos > 0 ? (
                <span className="rounded-full bg-amber-100 text-amber-700 px-1.5 py-[1px] text-[10px] font-medium">
                  {c.criticos} crítico{c.criticos > 1 ? "s" : ""}
                </span>
              ) : null}
            </span>
          ))}
        </div>
      ) : null}

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por descrição, código, part number..."
            className="pl-8"
          />
        </div>
        <Select value={status} onValueChange={(v) => setStatus(v as "todos" | InsumoStatus)}>
          <SelectTrigger className="w-[170px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os status</SelectItem>
            {INSUMO_STATUS.map((s) => (
              <SelectItem key={s} value={s}>
                {INSUMO_STATUS_LABEL[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={criticidade}
          onValueChange={(v) => setCriticidade(v as "todos" | InsumoCriticidade)}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Toda criticidade</SelectItem>
            {INSUMO_CRITICIDADE.map((c) => (
              <SelectItem key={c} value={c}>
                {INSUMO_CRITICIDADE_LABEL[c]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={disciplina} onValueChange={setDisciplina}>
          <SelectTrigger className="w-[170px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todas disciplinas</SelectItem>
            {Object.entries(INSUMO_DISCIPLINA_LABEL).map(([k, v]) => (
              <SelectItem key={k} value={k}>
                {v}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={origem} onValueChange={(v) => setOrigem(v as "todos" | "eqp" | "projeto")}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Toda origem</SelectItem>
            <SelectItem value="eqp">Aba EQP</SelectItem>
            <SelectItem value="projeto">Projeto formal</SelectItem>
          </SelectContent>
        </Select>
        {equipamentoFilter ? (
          <Badge variant="outline" className="border-blue-200 bg-blue-50 text-[11px] font-normal text-blue-700">
            Filtrado por equipamento
          </Badge>
        ) : null}
      </div>

      {/* Table */}
      <div className="rounded-lg border border-[var(--bg-border)] bg-[var(--bg-surface)]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Descrição</TableHead>
              <TableHead>Origem</TableHead>
              <TableHead>Disciplina</TableHead>
              <TableHead className="text-right">Qtd</TableHead>
              <TableHead>Criticidade</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Necessidade em</TableHead>
              <TableHead className="w-[60px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {insumosQ.isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-[var(--text-muted)]">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow><TableCell colSpan={8}><TableEmpty title="Nenhuma necessidade encontrada" description="Quando engenharia listar insumos nos projetos eles aparecem aqui para o Compras." /></TableCell></TableRow>
            ) : (
              rows.map((r) => (
                <TableRow
                  key={r.id}
                  className="cursor-pointer hover:bg-[var(--bg-elevated)]"
                  onClick={() => setSelected(r)}
                >
                  <TableCell>
                    <div className="font-medium text-[var(--text-primary)]">{r.descricao}</div>
                    <div className="text-xs text-[var(--text-muted)]">
                      {r.codigo_interno ? `${r.codigo_interno} · ` : ""}
                      {r.fabricante_sugerido ?? ""}
                      {r.part_number ? ` · PN ${r.part_number}` : ""}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs">
                    {r.equipamento_disciplina ? (
                      <>
                        <Badge variant="outline" className="border-blue-200 bg-blue-50 text-[10px] font-normal text-blue-700">
                          Aba EQP
                        </Badge>
                        <div className="mt-1 font-medium">
                          {r.cliente_equipamentos?.codigo ?? r.equipamento_projetos?.cliente_equipamentos?.codigo ?? "EQP"}
                          <span className="ml-1 text-[var(--text-muted)]">
                            · {r.equipamento_disciplina}
                          </span>
                        </div>
                        <div className="text-[var(--text-muted)]">
                          {r.clientes?.codigo ?? ""}
                        </div>
                      </>
                    ) : (
                      <>
                        <Badge variant="outline" className="border-[var(--bg-border)] bg-[var(--bg-elevated)] text-[10px] font-normal text-[var(--text-secondary)]">
                          Projeto formal
                        </Badge>
                        <div className="mt-1 font-medium">
                          {r.clientes?.codigo ?? "—"}{" "}
                          <span className="text-[var(--text-muted)]">
                            {r.equipamento_projetos?.cliente_equipamentos?.codigo ?? ""}
                          </span>
                        </div>
                        <div className="text-[var(--text-muted)]">
                          Rev. {r.equipamento_projetos?.revisao ?? "—"}
                        </div>
                      </>
                    )}
                  </TableCell>
                  <TableCell className="text-xs">
                    {INSUMO_DISCIPLINA_LABEL[
                      r.disciplina as keyof typeof INSUMO_DISCIPLINA_LABEL
                    ] ?? r.disciplina}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {r.quantidade} {r.unidade}
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
                  <TableCell className="text-xs text-[var(--text-secondary)]">
                    {r.necessidade_em
                      ? new Date(r.necessidade_em).toLocaleDateString("pt-BR")
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <ChevronRight className="h-4 w-4 text-[var(--text-muted)]" />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
          </Table>
        </div>
        </TabsContent>

        <TabsContent value="auditoria" className="mt-4">
          <AuditoriaSolicitacoesPanel />
        </TabsContent>
      </Tabs>

      <InsumoActionDialog insumo={selected} onClose={() => setSelected(null)} />
    </PageContainer>
  );
}



function KpiCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-[var(--bg-border)] bg-[var(--bg-surface)] p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wide text-[var(--text-muted)]">{label}</span>
        {icon}
      </div>
      <div className="mt-1 text-2xl font-semibold text-[var(--text-primary)] tabular-nums">{value}</div>
    </div>
  );
}
