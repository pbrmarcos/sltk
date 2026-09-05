import { createFileRoute } from "@tanstack/react-router";
import { useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { PlanejamentoTabs } from "@/components/engenharia/PlanejamentoTabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { equipamentoEtapasQueryOptions } from "@/lib/engenharia.queries";
import { upsertEtapas } from "@/lib/equipamento-etapas.functions";
import {
  ETAPA_FASES,
  ETAPA_FASE_LABEL,
  ETAPA_STATUS,
  ETAPA_STATUS_LABEL,
  type EtapaFase,
  type EtapaStatus,
} from "@/lib/engenharia.shared";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/engenharia/etapas")({
  validateSearch: (s: Record<string, unknown>) => ({
    eqp: typeof s.eqp === "string" ? s.eqp : undefined,
    fase: typeof s.fase === "string" ? s.fase : undefined,
  }),
  component: EtapasPage,
});

type EtapaRow = {
  id?: string;
  ordem: number;
  nome: string;
  fase: EtapaFase;
  data_inicio_prev: string | null;
  data_fim_prev: string | null;
  data_inicio_real?: string | null;
  data_fim_real?: string | null;
  hh_mecanica_estimada: number;
  hh_eletrica_estimada: number;
  hh_mecanica_real: number;
  hh_eletrica_real: number;
  progresso: number;
  status: EtapaStatus;
};

function EtapasPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/engenharia/etapas" });
  const [equipamentoId, setEquipamentoId] = useState<string>(search.eqp ?? "");
  const [busca, setBusca] = useState("");
  useEffect(() => {
    if (search.eqp) setEquipamentoId(search.eqp);
  }, [search.eqp]);

  const { data: eqps } = useQuery({
    queryKey: ["engenharia", "etapas", "equipamentos"],
    queryFn: async () => {
      const { data } = await supabase
        .from("cliente_equipamentos")
        .select("id, codigo, modelo, clientes(razao_social)")
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(200);
      return data ?? [];
    },
  });

  const eqpsFiltered = (eqps ?? []).filter((e: any) => {
    if (!busca.trim()) return true;
    const t = busca.trim().toLowerCase();
    return (
      String(e.codigo ?? "")
        .toLowerCase()
        .includes(t) ||
      String(e.modelo ?? "")
        .toLowerCase()
        .includes(t) ||
      String(e.clientes?.razao_social ?? "")
        .toLowerCase()
        .includes(t)
    );
  });

  return (
    <PageContainer>
      <PageHeader
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Engenharia" },
          { label: "Planejamento" },
          { label: "Gantt / Etapas" },
        ]}
        title="Planejamento"
        subtitle="Plano de etapas por equipamento, com H/H estimada mecânica e elétrica."
      />
      <PlanejamentoTabs />

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_220px]">
        <Input
          placeholder="Buscar equipamento (código, modelo ou cliente)…"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
        <Select value={equipamentoId} onValueChange={setEquipamentoId}>
          <SelectTrigger className="h-10">
            <SelectValue placeholder="Selecione um equipamento…" />
          </SelectTrigger>
          <SelectContent className="max-h-96">
            {eqpsFiltered.map((e: any) => (
              <SelectItem key={e.id} value={e.id}>
                {e.codigo} · {e.modelo}{" "}
                {e.clientes?.razao_social ? `— ${e.clientes.razao_social}` : ""}
              </SelectItem>
            ))}
            {eqpsFiltered.length === 0 && (
              <div className="px-2 py-3 text-xs text-muted-foreground">Nenhum equipamento.</div>
            )}
          </SelectContent>
        </Select>
        <Select
          value={search.fase ?? "__all__"}
          onValueChange={(v) =>
            navigate({
              search: (prev: any) => ({ ...prev, fase: v === "__all__" ? undefined : v }),
            })
          }
        >
          <SelectTrigger className="h-10">
            <SelectValue placeholder="Fase" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Todas as fases</SelectItem>
            {ETAPA_FASES.map((f) => (
              <SelectItem key={f} value={f}>
                {ETAPA_FASE_LABEL[f]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {equipamentoId ? (
        <EtapasEditor
          equipamentoId={equipamentoId}
          faseFilter={search.fase as EtapaFase | undefined}
        />
      ) : (
        <DemoGanttPanel faseFilter={search.fase as EtapaFase | undefined} />
      )}
    </PageContainer>
  );
}

function EtapasEditor({
  equipamentoId,
  faseFilter,
}: {
  equipamentoId: string;
  faseFilter?: EtapaFase;
}) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery(equipamentoEtapasQueryOptions(equipamentoId));
  const [rows, setRows] = useState<EtapaRow[]>([]);
  const [removeIds, setRemoveIds] = useState<string[]>([]);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (data) {
      setRows(
        data.map((d) => ({
          id: d.id,
          ordem: d.ordem,
          nome: d.nome,
          fase: d.fase as EtapaFase,
          data_inicio_prev: d.data_inicio_prev,
          data_fim_prev: d.data_fim_prev,
          data_inicio_real: d.data_inicio_real,
          data_fim_real: d.data_fim_real,
          hh_mecanica_estimada: Number(d.hh_mecanica_estimada ?? 0),
          hh_eletrica_estimada: Number(d.hh_eletrica_estimada ?? 0),
          hh_mecanica_real: Number((d as any).hh_mecanica_real ?? 0),
          hh_eletrica_real: Number((d as any).hh_eletrica_real ?? 0),
          progresso: d.progresso ?? 0,
          status: d.status as EtapaStatus,
        })),
      );
      setRemoveIds([]);
      setDirty(false);
    }
  }, [data]);

  const filteredRows = useMemo(
    () => (faseFilter ? rows.filter((r) => r.fase === faseFilter) : rows),
    [rows, faseFilter],
  );

  const totals = useMemo(() => {
    return rows.reduce(
      (acc, r) => {
        acc.total += 1;
        if (r.status === "concluida") acc.concluidas += 1;
        if (r.status === "atrasada") acc.atrasadas += 1;
        acc.hhMec += r.hh_mecanica_estimada;
        acc.hhElet += r.hh_eletrica_estimada;
        acc.hhMecReal += r.hh_mecanica_real;
        acc.hhEletReal += r.hh_eletrica_real;
        return acc;
      },
      { total: 0, concluidas: 0, atrasadas: 0, hhMec: 0, hhElet: 0, hhMecReal: 0, hhEletReal: 0 },
    );
  }, [rows]);

  const saveMut = useMutation({
    mutationFn: () => {
      // Validações
      const errs: string[] = [];
      for (const r of rows) {
        if (!r.nome?.trim()) errs.push(`Etapa #${r.ordem}: nome obrigatório`);
        if (r.ordem < 0) errs.push(`Etapa "${r.nome}": ordem inválida`);
        if (r.data_inicio_prev && r.data_fim_prev && r.data_inicio_prev > r.data_fim_prev)
          errs.push(`Etapa "${r.nome}": início posterior ao fim`);
        if (
          r.hh_mecanica_estimada < 0 ||
          r.hh_eletrica_estimada < 0 ||
          r.hh_mecanica_real < 0 ||
          r.hh_eletrica_real < 0
        )
          errs.push(`Etapa "${r.nome}": horas negativas`);
        const year = new Date(r.data_inicio_prev ?? r.data_fim_prev ?? Date.now()).getFullYear();
        if (year < 2000 || year > new Date().getFullYear() + 10)
          errs.push(`Etapa "${r.nome}": data fora do intervalo razoável`);
      }
      if (errs.length) throw new Error(errs.slice(0, 4).join(" · "));
      return upsertEtapas({
        data: {
          equipamento_id: equipamentoId,
          etapas: rows.map((r) => ({
            id: r.id,
            ordem: r.ordem,
            nome: r.nome,
            fase: r.fase,
            data_inicio_prev: r.data_inicio_prev || null,
            data_fim_prev: r.data_fim_prev || null,
            data_inicio_real: r.data_inicio_real || null,
            data_fim_real: r.data_fim_real || null,
            hh_mecanica_estimada: r.hh_mecanica_estimada,
            hh_eletrica_estimada: r.hh_eletrica_estimada,
            hh_mecanica_real: r.hh_mecanica_real,
            hh_eletrica_real: r.hh_eletrica_real,
            progresso: r.progresso,
            status: r.status,
          })),
          remove_ids: removeIds,
        },
      });
    },
    onSuccess: () => {
      toast.success(`Plano salvo (${rows.length} etapa${rows.length === 1 ? "" : "s"}).`);
      setDirty(false);
      qc.invalidateQueries({ queryKey: ["engenharia", "etapas", equipamentoId] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Falha ao salvar o plano."),
  });

  function update(idx: number, patch: Partial<EtapaRow>) {
    setRows((rs) => rs.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
    setDirty(true);
  }

  function add() {
    setRows((rs) => [
      ...rs,
      {
        ordem: rs.length,
        nome: "Nova etapa",
        fase: faseFilter ?? "engenharia",
        data_inicio_prev: null,
        data_fim_prev: null,
        hh_mecanica_estimada: 0,
        hh_eletrica_estimada: 0,
        hh_mecanica_real: 0,
        hh_eletrica_real: 0,
        progresso: 0,
        status: "pendente",
      },
    ]);
    setDirty(true);
  }

  function remove(idx: number) {
    const r = rows[idx];
    if (r.id) setRemoveIds((ids) => [...ids, r.id!]);
    setRows((rs) => rs.filter((_, i) => i !== idx));
    setDirty(true);
  }

  if (isLoading) return <div className="p-4 text-sm text-[var(--text-muted)]">Carregando…</div>;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Kpi label="Etapas" value={totals.total} />
        <Kpi label="Concluídas" value={totals.concluidas} />
        <Kpi label="Atrasadas" value={totals.atrasadas} accent="text-rose-700" />
        <Kpi
          label="H/H mec (est/real)"
          value={`${totals.hhMec.toFixed(1)} / ${totals.hhMecReal.toFixed(1)}`}
        />
        <Kpi
          label="H/H elet (est/real)"
          value={`${totals.hhElet.toFixed(1)} / ${totals.hhEletReal.toFixed(1)}`}
        />
      </div>

      {filteredRows.length > 0 && (
        <GanttView
          rows={filteredRows}
          onChange={(id, patch) => {
            setRows((rs) => rs.map((r) => (id && r.id === id ? { ...r, ...patch } : r)));
            setDirty(true);
          }}
        />
      )}

      <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-[var(--bg-border)] bg-[var(--bg-surface)]">
        <table className="w-full text-xs">
          <thead className="bg-[var(--bg-elevated)] text-[var(--text-muted)]">
            <tr>
              <th className="p-2 text-left">#</th>
              <th className="p-2 text-left">Etapa</th>
              <th className="p-2 text-left">Fase</th>
              <th className="p-2 text-left">Início prev.</th>
              <th className="p-2 text-left">Fim prev.</th>
              <th className="p-1.5 text-right text-[10.5px] font-medium uppercase tracking-wide">
                Mec est.
              </th>
              <th className="p-1.5 text-right text-[10.5px] font-medium uppercase tracking-wide">
                Mec real
              </th>
              <th className="p-1.5 text-right text-[10.5px] font-medium uppercase tracking-wide">
                Elet est.
              </th>
              <th className="p-1.5 text-right text-[10.5px] font-medium uppercase tracking-wide">
                Elet real
              </th>
              <th className="p-2 text-right">%</th>
              <th className="p-2 text-left">Status</th>
              <th className="p-2"></th>
            </tr>
          </thead>
          <tbody>
            {(faseFilter ? rows.filter((r) => r.fase === faseFilter) : rows).map((r) => {
              const i = rows.indexOf(r);
              return (
                <tr key={r.id ?? `new-${i}`} className="border-t border-[var(--bg-border)]">
                  <td className="p-1">
                    <Input
                      type="number"
                      className="h-8 w-14"
                      value={r.ordem}
                      onChange={(e) => update(i, { ordem: Number(e.target.value) })}
                    />
                  </td>
                  <td className="p-1">
                    <Input
                      className="h-8"
                      value={r.nome}
                      onChange={(e) => update(i, { nome: e.target.value })}
                    />
                  </td>
                  <td className="p-1">
                    <Select
                      value={r.fase}
                      onValueChange={(v) => update(i, { fase: v as EtapaFase })}
                    >
                      <SelectTrigger className="h-8 w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ETAPA_FASES.map((f) => (
                          <SelectItem key={f} value={f}>
                            {ETAPA_FASE_LABEL[f]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="p-1">
                    <Input
                      type="date"
                      className="h-8 w-36"
                      value={r.data_inicio_prev ?? ""}
                      onChange={(e) => update(i, { data_inicio_prev: e.target.value || null })}
                    />
                  </td>
                  <td className="p-1">
                    <Input
                      type="date"
                      className="h-8 w-36"
                      value={r.data_fim_prev ?? ""}
                      onChange={(e) => update(i, { data_fim_prev: e.target.value || null })}
                    />
                  </td>
                  <td className="p-1 text-right">
                    <Input
                      type="number"
                      step="0.5"
                      className="h-8 w-16 text-right text-[11.5px] tabular-nums"
                      value={r.hh_mecanica_estimada}
                      onChange={(e) => update(i, { hh_mecanica_estimada: Number(e.target.value) })}
                    />
                  </td>
                  <td className="p-1 text-right">
                    <Input
                      type="number"
                      step="0.5"
                      className={cn(
                        "h-8 w-16 text-right text-[11.5px] tabular-nums",
                        hhRealClass(r.hh_mecanica_real, r.hh_mecanica_estimada),
                      )}
                      value={r.hh_mecanica_real}
                      onChange={(e) => update(i, { hh_mecanica_real: Number(e.target.value) })}
                    />
                  </td>
                  <td className="p-1 text-right">
                    <Input
                      type="number"
                      step="0.5"
                      className="h-8 w-16 text-right text-[11.5px] tabular-nums"
                      value={r.hh_eletrica_estimada}
                      onChange={(e) => update(i, { hh_eletrica_estimada: Number(e.target.value) })}
                    />
                  </td>
                  <td className="p-1 text-right">
                    <Input
                      type="number"
                      step="0.5"
                      className={cn(
                        "h-8 w-16 text-right text-[11.5px] tabular-nums",
                        hhRealClass(r.hh_eletrica_real, r.hh_eletrica_estimada),
                      )}
                      value={r.hh_eletrica_real}
                      onChange={(e) => update(i, { hh_eletrica_real: Number(e.target.value) })}
                    />
                  </td>
                  <td className="p-1 text-right">
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      className="h-8 w-16 text-right"
                      value={r.progresso}
                      onChange={(e) =>
                        update(i, { progresso: Math.max(0, Math.min(100, Number(e.target.value))) })
                      }
                    />
                  </td>
                  <td className="p-1">
                    <Select
                      value={r.status}
                      onValueChange={(v) => update(i, { status: v as EtapaStatus })}
                    >
                      <SelectTrigger className="h-8 w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ETAPA_STATUS.map((s) => (
                          <SelectItem key={s} value={s}>
                            {ETAPA_STATUS_LABEL[s]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="p-1">
                    <button
                      onClick={() => remove(i)}
                      className="rounded p-1 text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] hover:text-rose-700"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex justify-between">
        <Button variant="outline" size="sm" onClick={add}>
          <Plus className="h-3.5 w-3.5" /> Adicionar etapa
        </Button>
        <div className="flex items-center gap-3">
          {dirty && (
            <span className="text-xs font-medium text-amber-700">● Alterações não salvas</span>
          )}
          <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending || !dirty}>
            {saveMut.isPending ? "Salvando…" : "Salvar plano"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function Kpi({ label, value, accent }: { label: string; value: React.ReactNode; accent?: string }) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--bg-border)] bg-[var(--bg-surface)] p-3 shadow-[var(--shadow-sm)]">
      <div className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">{label}</div>
      <div className={cn("mt-0.5 text-xl font-semibold", accent)}>{value}</div>
    </div>
  );
}

function hhRealClass(real: number, est: number): string {
  if (!real) return "text-[var(--text-muted)]";
  if (!est) return "bg-amber-50";
  const ratio = real / est;
  if (ratio <= 1) return "bg-emerald-50 text-emerald-800";
  if (ratio <= 1.2) return "bg-amber-50 text-amber-800";
  return "bg-rose-50 text-rose-800";
}

/* ============================================================
 * Gantt — visual ABB-inspired
 * ============================================================ */

const FASE_BG_VAR: Record<EtapaFase, string> = {
  engenharia: "var(--gantt-fase-engenharia)",
  compras: "var(--gantt-fase-compras)",
  fabricacao: "var(--gantt-fase-fabricacao)",
  montagem: "var(--gantt-fase-montagem)",
  qualidade: "var(--gantt-fase-qualidade)",
  expedicao: "var(--gantt-fase-expedicao)",
};

const STATUS_DOT: Record<EtapaStatus, string> = {
  pendente: "bg-zinc-400",
  em_andamento: "bg-sky-500",
  concluida: "bg-emerald-500",
  atrasada: "bg-rose-500",
  bloqueada: "bg-amber-500",
};

function GanttView({
  rows,
  onChange,
  readOnly,
}: {
  rows: EtapaRow[];
  onChange?: (id: string | undefined, patch: Partial<EtapaRow>) => void;
  readOnly?: boolean;
}) {
  const validRows = rows.filter((r) => r.data_inicio_prev && r.data_fim_prev);
  const trackRef = useRef<HTMLDivElement>(null);

  if (!validRows.length) {
    return (
      <div className="rounded-[var(--radius-lg)] border border-dashed border-[var(--bg-border)] p-6 text-center text-xs text-[var(--text-muted)]">
        Defina datas de início e fim previstas para visualizar o Gantt.
      </div>
    );
  }

  // Compute span padded to whole months
  const minRaw = Math.min(...validRows.map((r) => new Date(r.data_inicio_prev!).getTime()));
  const maxRaw = Math.max(...validRows.map((r) => new Date(r.data_fim_prev!).getTime()));
  const minD = new Date(minRaw);
  const maxD = new Date(maxRaw);
  const min = new Date(minD.getFullYear(), minD.getMonth(), 1).getTime();
  const max = new Date(maxD.getFullYear(), maxD.getMonth() + 1, 0).getTime();
  const span = Math.max(1, max - min);
  const today = Date.now();
  const todayLeft = ((today - min) / span) * 100;

  // Build month + week ticks
  const months: { label: string; left: number; width: number }[] = [];
  {
    const cursor = new Date(min);
    while (cursor.getTime() < max) {
      const start = new Date(cursor.getFullYear(), cursor.getMonth(), 1).getTime();
      const end = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1).getTime();
      months.push({
        label: cursor
          .toLocaleDateString("pt-BR", { month: "short", year: "2-digit" })
          .replace(".", ""),
        left: ((start - min) / span) * 100,
        width: ((Math.min(end, max) - start) / span) * 100,
      });
      cursor.setMonth(cursor.getMonth() + 1);
    }
  }
  const weeks: number[] = [];
  {
    const dayMs = 86400000;
    const cursor = new Date(min);
    // align to next monday
    const dow = cursor.getDay();
    const shift = (8 - dow) % 7;
    cursor.setDate(cursor.getDate() + shift);
    while (cursor.getTime() <= max) {
      weeks.push(((cursor.getTime() - min) / span) * 100);
      cursor.setTime(cursor.getTime() + 7 * dayMs);
    }
  }

  function startDrag(e: React.MouseEvent, row: EtapaRow, mode: "move" | "resize-end") {
    if (readOnly || !onChange) return;
    e.preventDefault();
    e.stopPropagation();
    const track = trackRef.current;
    if (!track) return;
    const rect = track.getBoundingClientRect();
    const startX = e.clientX;
    const startStart = new Date(row.data_inicio_prev!).getTime();
    const startEnd = new Date(row.data_fim_prev!).getTime();
    function onMove(ev: MouseEvent) {
      const deltaPx = ev.clientX - startX;
      const deltaMs = (deltaPx / rect.width) * span;
      const dayMs = 86400000;
      const snapped = Math.round(deltaMs / dayMs) * dayMs;
      if (mode === "move") {
        const ns = new Date(startStart + snapped).toISOString().slice(0, 10);
        const ne = new Date(startEnd + snapped).toISOString().slice(0, 10);
        onChange!(row.id, { data_inicio_prev: ns, data_fim_prev: ne });
      } else {
        const ne = new Date(Math.max(startStart + dayMs, startEnd + snapped))
          .toISOString()
          .slice(0, 10);
        onChange!(row.id, { data_fim_prev: ne });
      }
    }
    function onUp() {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      toast.info("Etapa movida — clique em 'Salvar plano' para confirmar.", { duration: 1800 });
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  const LEFT_COL = 280; // px
  const ROW_H = 36;

  return (
    <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--bg-border)] bg-white shadow-[var(--shadow-sm)]">
      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-[var(--gantt-grid)] bg-[var(--gantt-header-bg)] px-4 py-2 text-[10px] uppercase tracking-wide text-[var(--gantt-text-muted)]">
        <span className="font-semibold text-[var(--gantt-text)]">Fases</span>
        {ETAPA_FASES.map((f) => (
          <span key={f} className="inline-flex items-center gap-1.5">
            <span className="h-2 w-3 rounded-sm" style={{ background: FASE_BG_VAR[f] }} />
            {ETAPA_FASE_LABEL[f]}
          </span>
        ))}
        <span className="ml-auto inline-flex items-center gap-1.5 normal-case">
          <span className="h-3 w-0.5" style={{ background: "var(--gantt-today)" }} />
          Hoje
        </span>
      </div>

      <div className="overflow-x-auto">
        <div style={{ minWidth: LEFT_COL + 720 }}>
          {/* Header */}
          <div className="flex border-b border-[var(--gantt-grid-strong)]">
            <div
              className="shrink-0 border-r border-[var(--gantt-grid-strong)] bg-[var(--gantt-header-bg)] px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--gantt-text-muted)]"
              style={{ width: LEFT_COL }}
            >
              Etapa
            </div>
            <div className="relative flex-1 bg-[var(--gantt-header-bg)]">
              {/* Months row */}
              <div className="relative h-6 border-b border-[var(--gantt-grid)]">
                {months.map((m, i) => (
                  <div
                    key={i}
                    className="absolute top-0 flex h-full items-center justify-center border-r border-[var(--gantt-grid)] text-[11px] font-semibold uppercase tracking-wide text-[var(--gantt-text)]"
                    style={{ left: `${m.left}%`, width: `${m.width}%` }}
                  >
                    {m.label}
                  </div>
                ))}
              </div>
              {/* Weeks ticks */}
              <div className="relative h-3">
                {weeks.map((w, i) => (
                  <div
                    key={i}
                    className="absolute top-0 h-full w-px bg-[var(--gantt-grid)]"
                    style={{ left: `${w}%` }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Rows */}
          <div className="relative">
            {validRows.map((r, i) => (
              <div
                key={r.id ?? `g-${i}`}
                className="group flex border-b border-[var(--gantt-grid)] transition-colors hover:bg-[var(--gantt-row-hover)]"
                style={{ background: i % 2 === 1 ? "var(--gantt-row-alt)" : undefined }}
              >
                {/* Left column */}
                <div
                  className="shrink-0 border-r border-[var(--gantt-grid)] px-3 py-2"
                  style={{ width: LEFT_COL, height: ROW_H }}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={cn("h-1.5 w-1.5 shrink-0 rounded-full", STATUS_DOT[r.status])}
                    />
                    <span className="truncate text-[12px] font-medium text-[var(--gantt-text)]">
                      {r.ordem + 1}. {r.nome}
                    </span>
                  </div>
                  <div className="mt-0.5 flex items-center gap-2 text-[10px] text-[var(--gantt-text-muted)]">
                    <span
                      className="inline-flex h-3.5 items-center rounded-sm px-1 text-[9px] font-semibold uppercase tracking-wide text-white"
                      style={{ background: FASE_BG_VAR[r.fase] }}
                    >
                      {ETAPA_FASE_LABEL[r.fase]}
                    </span>
                    <span>{r.progresso}%</span>
                  </div>
                </div>
                {/* Track */}
                <div
                  ref={i === 0 ? trackRef : undefined}
                  className="relative flex-1 select-none"
                  style={{ height: ROW_H }}
                >
                  {/* week grid */}
                  {weeks.map((w, wi) => (
                    <div
                      key={wi}
                      className="absolute top-0 h-full w-px bg-[var(--gantt-grid)]"
                      style={{ left: `${w}%` }}
                    />
                  ))}
                  {/* today line */}
                  {today >= min && today <= max && (
                    <div
                      className="pointer-events-none absolute top-0 bottom-0 z-10 w-px"
                      style={{ left: `${todayLeft}%`, background: "var(--gantt-today)" }}
                    />
                  )}
                  <GanttBar
                    row={r}
                    min={min}
                    span={span}
                    readOnly={readOnly}
                    onMouseDownMove={(e) => startDrag(e, r, "move")}
                    onMouseDownResize={(e) => startDrag(e, r, "resize-end")}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {!readOnly && (
        <p className="border-t border-[var(--gantt-grid)] bg-[var(--gantt-header-bg)] px-4 py-1.5 text-[10px] text-[var(--gantt-text-muted)]">
          Arraste a barra para mover a etapa; arraste a borda direita para alterar o fim. Lembre-se
          de clicar em "Salvar plano".
        </p>
      )}
    </div>
  );
}

function GanttBar({
  row,
  min,
  span,
  readOnly,
  onMouseDownMove,
  onMouseDownResize,
}: {
  row: EtapaRow;
  min: number;
  span: number;
  readOnly?: boolean;
  onMouseDownMove: (e: React.MouseEvent) => void;
  onMouseDownResize: (e: React.MouseEvent) => void;
}) {
  const start = new Date(row.data_inicio_prev!).getTime();
  const end = new Date(row.data_fim_prev!).getTime();
  const left = ((start - min) / span) * 100;
  const width = Math.max(0.5, ((end - start) / span) * 100);
  const bg = FASE_BG_VAR[row.fase];

  const startLabel = new Date(start).toLocaleDateString("pt-BR");
  const endLabel = new Date(end).toLocaleDateString("pt-BR");

  return (
    <div
      className={cn(
        "absolute top-1/2 -translate-y-1/2 overflow-hidden rounded-[3px] text-[10px] text-white shadow-sm transition-shadow",
        readOnly ? "cursor-default" : "cursor-grab active:cursor-grabbing",
        "group-hover:shadow-md",
      )}
      style={{
        left: `${left}%`,
        width: `${width}%`,
        height: 18,
        background: `linear-gradient(180deg, color-mix(in oklab, ${bg} 92%, white), ${bg})`,
      }}
      title={`${row.nome} · ${ETAPA_FASE_LABEL[row.fase]} · ${startLabel} → ${endLabel} · ${row.progresso}%`}
      onMouseDown={onMouseDownMove}
    >
      {/* progress overlay */}
      <div
        className="absolute inset-y-0 left-0 bg-white/35"
        style={{ width: `${Math.max(0, Math.min(100, row.progresso))}%` }}
      />
      <span className="relative z-[1] flex h-full items-center px-1.5 font-medium tracking-tight">
        <span className="truncate">{row.nome}</span>
      </span>
      {!readOnly && (
        <div
          onMouseDown={onMouseDownResize}
          className="absolute inset-y-0 right-0 z-[2] w-1.5 cursor-ew-resize bg-white/0 opacity-0 transition-opacity hover:bg-white/40 group-hover:opacity-100"
          title="Arraste para alterar o fim"
        />
      )}
    </div>
  );
}

/* ============================================================
 * Demo Gantt (read-only) — shown when no equipamento selected
 * ============================================================ */

function buildDemoEtapas(): EtapaRow[] {
  const now = new Date();
  const startBase = new Date(now.getFullYear(), now.getMonth() - 2, 1);
  function addDays(d: Date, days: number) {
    const x = new Date(d);
    x.setDate(x.getDate() + days);
    return x.toISOString().slice(0, 10);
  }
  const seq: Array<{
    nome: string;
    fase: EtapaFase;
    offset: number;
    dur: number;
    prog: number;
    status: EtapaStatus;
    hhM: number;
    hhE: number;
    hhMr: number;
    hhEr: number;
  }> = [
    {
      nome: "Levantamento de requisitos",
      fase: "engenharia",
      offset: 0,
      dur: 7,
      prog: 100,
      status: "concluida",
      hhM: 24,
      hhE: 16,
      hhMr: 26,
      hhEr: 18,
    },
    {
      nome: "Detalhamento mecânico",
      fase: "engenharia",
      offset: 6,
      dur: 18,
      prog: 100,
      status: "concluida",
      hhM: 120,
      hhE: 0,
      hhMr: 132,
      hhEr: 0,
    },
    {
      nome: "Detalhamento elétrico",
      fase: "engenharia",
      offset: 10,
      dur: 18,
      prog: 100,
      status: "concluida",
      hhM: 0,
      hhE: 96,
      hhMr: 0,
      hhEr: 104,
    },
    {
      nome: "Compra de componentes",
      fase: "compras",
      offset: 22,
      dur: 25,
      prog: 80,
      status: "em_andamento",
      hhM: 8,
      hhE: 8,
      hhMr: 8,
      hhEr: 6,
    },
    {
      nome: "Compra de painel elétrico",
      fase: "compras",
      offset: 26,
      dur: 22,
      prog: 60,
      status: "em_andamento",
      hhM: 0,
      hhE: 12,
      hhMr: 0,
      hhEr: 8,
    },
    {
      nome: "Fabricação da estrutura",
      fase: "fabricacao",
      offset: 38,
      dur: 22,
      prog: 45,
      status: "em_andamento",
      hhM: 220,
      hhE: 0,
      hhMr: 110,
      hhEr: 0,
    },
    {
      nome: "Fabricação de transportadores",
      fase: "fabricacao",
      offset: 44,
      dur: 24,
      prog: 30,
      status: "atrasada",
      hhM: 180,
      hhE: 0,
      hhMr: 70,
      hhEr: 0,
    },
    {
      nome: "Montagem mecânica",
      fase: "montagem",
      offset: 62,
      dur: 18,
      prog: 10,
      status: "em_andamento",
      hhM: 240,
      hhE: 0,
      hhMr: 24,
      hhEr: 0,
    },
    {
      nome: "Montagem elétrica",
      fase: "montagem",
      offset: 70,
      dur: 16,
      prog: 0,
      status: "pendente",
      hhM: 0,
      hhE: 180,
      hhMr: 0,
      hhEr: 0,
    },
    {
      nome: "Testes funcionais",
      fase: "qualidade",
      offset: 84,
      dur: 10,
      prog: 0,
      status: "pendente",
      hhM: 32,
      hhE: 32,
      hhMr: 0,
      hhEr: 0,
    },
    {
      nome: "FAT — Aprovação do cliente",
      fase: "qualidade",
      offset: 92,
      dur: 5,
      prog: 0,
      status: "pendente",
      hhM: 16,
      hhE: 16,
      hhMr: 0,
      hhEr: 0,
    },
    {
      nome: "Embalagem e expedição",
      fase: "expedicao",
      offset: 96,
      dur: 7,
      prog: 0,
      status: "pendente",
      hhM: 24,
      hhE: 0,
      hhMr: 0,
      hhEr: 0,
    },
  ];
  return seq.map((s, i) => ({
    id: `demo-${i}`,
    ordem: i,
    nome: s.nome,
    fase: s.fase,
    data_inicio_prev: addDays(startBase, s.offset),
    data_fim_prev: addDays(startBase, s.offset + s.dur),
    data_inicio_real: null,
    data_fim_real: null,
    hh_mecanica_estimada: s.hhM,
    hh_eletrica_estimada: s.hhE,
    hh_mecanica_real: s.hhMr,
    hh_eletrica_real: s.hhEr,
    progresso: s.prog,
    status: s.status,
  }));
}

function DemoGanttPanel({ faseFilter }: { faseFilter?: EtapaFase }) {
  const rows = useMemo(() => buildDemoEtapas(), []);
  const filtered = faseFilter ? rows.filter((r) => r.fase === faseFilter) : rows;
  const totals = rows.reduce(
    (acc, r) => {
      acc.total += 1;
      if (r.status === "concluida") acc.concluidas += 1;
      if (r.status === "atrasada") acc.atrasadas += 1;
      acc.hhMec += r.hh_mecanica_estimada;
      acc.hhElet += r.hh_eletrica_estimada;
      acc.hhMecReal += r.hh_mecanica_real;
      acc.hhEletReal += r.hh_eletrica_real;
      return acc;
    },
    { total: 0, concluidas: 0, atrasadas: 0, hhMec: 0, hhElet: 0, hhMecReal: 0, hhEletReal: 0 },
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-[var(--radius-lg)] border border-dashed border-[var(--bg-border)] bg-[var(--gantt-header-bg)] px-4 py-2 text-xs text-[var(--gantt-text-muted)]">
        <span>
          <span className="mr-2 inline-flex items-center rounded-sm bg-[var(--gantt-text)] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
            Demo
          </span>
          Visualização de exemplo — escolha um equipamento acima para editar um plano real.
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Kpi label="Etapas" value={totals.total} />
        <Kpi label="Concluídas" value={totals.concluidas} />
        <Kpi label="Atrasadas" value={totals.atrasadas} accent="text-rose-700" />
        <Kpi
          label="H/H mec (est/real)"
          value={`${totals.hhMec.toFixed(0)} / ${totals.hhMecReal.toFixed(0)}`}
        />
        <Kpi
          label="H/H elet (est/real)"
          value={`${totals.hhElet.toFixed(0)} / ${totals.hhEletReal.toFixed(0)}`}
        />
      </div>
      <GanttView rows={filtered} readOnly />
    </div>
  );
}
