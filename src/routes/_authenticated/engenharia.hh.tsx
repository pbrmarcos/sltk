import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Fragment, useEffect, useState } from "react";
import { toast } from "sonner";
import { ChevronDown, ChevronRight } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { PlanejamentoTabs } from "@/components/engenharia/PlanejamentoTabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { hhConsolidadoQueryOptions, equipamentoEtapasQueryOptions } from "@/lib/engenharia.queries";
import { upsertEtapas } from "@/lib/equipamento-etapas.functions";
import { ETAPA_FASE_LABEL, type EtapaFase, type EtapaStatus } from "@/lib/engenharia.shared";
import {
  EQUIPAMENTO_STATUS_COLOR,
  EQUIPAMENTO_STATUS_LABEL,
  type EquipamentoStatus,
} from "@/lib/equipamentos.shared";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/engenharia/hh")({
  component: HHPage,
});

function HHPage() {
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [onlyWithEtapas, setOnlyWithEtapas] = useState(false);
  const { data, isLoading } = useQuery(
    hhConsolidadoQueryOptions({ page, q, only_with_etapas: onlyWithEtapas }),
  );

  const totals = (data?.rows ?? []).reduce(
    (acc, r) => {
      acc.estMec += r.hh_mec_est;
      acc.estElet += r.hh_elet_est;
      acc.realMec += r.hh_mec_real;
      acc.realElet += r.hh_elet_real;
      return acc;
    },
    { estMec: 0, estElet: 0, realMec: 0, realElet: 0 },
  );

  return (
    <PageContainer>
      <PageHeader
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Engenharia" },
          { label: "Planejamento" },
          { label: "H/H" },
        ]}
        title="Planejamento"
        subtitle="Consolidado mecânico e elétrico por equipamento. Estimado vem das etapas; consumido vem dos projetos."
      />
      <PlanejamentoTabs />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Input
          className="h-9 max-w-md"
          placeholder="Buscar por código, equipamento ou cliente…"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
        />
        <label className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
          <input
            type="checkbox"
            checked={onlyWithEtapas}
            onChange={(e) => {
              setOnlyWithEtapas(e.target.checked);
              setPage(1);
            }}
          />
          Somente com etapas cadastradas
        </label>
        {(q || onlyWithEtapas) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setQ("");
              setOnlyWithEtapas(false);
              setPage(1);
            }}
          >
            Limpar filtros
          </Button>
        )}
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi label="Estimado mec." value={totals.estMec.toFixed(1)} />
        <Kpi label="Consumido mec." value={totals.realMec.toFixed(1)} />
        <Kpi label="Estimado elet." value={totals.estElet.toFixed(1)} />
        <Kpi label="Consumido elet." value={totals.realElet.toFixed(1)} />
      </div>

      <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-[var(--bg-border)] bg-[var(--bg-surface)] shadow-[var(--shadow-sm)]">
        <table className="w-full text-sm">
          <thead className="bg-[var(--bg-elevated)] text-xs text-[var(--text-muted)]">
            <tr>
              <th className="p-3 text-left">Equipamento</th>
              <th className="p-3 text-left">Cliente</th>
              <th className="p-3 text-left">Status</th>
              <th className="p-3 text-right">Mec. est.</th>
              <th className="p-3 text-right">Mec. real</th>
              <th className="p-3 text-right">Elet. est.</th>
              <th className="p-3 text-right">Elet. real</th>
              <th className="p-3 text-right">% consumo</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-[var(--text-muted)]">
                  Carregando…
                </td>
              </tr>
            ) : !data?.rows.length ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-[var(--text-muted)]">
                  Sem equipamentos.
                </td>
              </tr>
            ) : (
              data.rows.map((r) => {
                const est = r.hh_mec_est + r.hh_elet_est;
                const real = r.hh_mec_real + r.hh_elet_real;
                const pct = est > 0 ? Math.round((real / est) * 100) : 0;
                const isOpen = expanded === r.id;
                return (
                  <Fragment key={r.id}>
                    <tr className="border-t border-[var(--bg-border)] hover:bg-[var(--bg-elevated)]/30">
                      <td className="p-3">
                        <button
                          type="button"
                          onClick={() => setExpanded(isOpen ? null : r.id)}
                          className="flex items-center gap-1 text-left"
                        >
                          {isOpen ? (
                            <ChevronDown className="h-3.5 w-3.5" />
                          ) : (
                            <ChevronRight className="h-3.5 w-3.5" />
                          )}
                          <span className="block">
                            <span className="block font-medium">{r.modelo}</span>
                            <span className="block font-mono text-[11px] text-[var(--text-muted)]">
                              {r.codigo}
                            </span>
                          </span>
                        </button>
                      </td>
                      <td className="p-3 text-xs">
                        <div>{r.cliente_nome}</div>
                        <div className="font-mono text-[10px] text-[var(--text-muted)]">
                          {r.cliente_codigo}
                        </div>
                      </td>
                      <td className="p-3">
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[11px]",
                            EQUIPAMENTO_STATUS_COLOR[r.status as EquipamentoStatus],
                          )}
                        >
                          {EQUIPAMENTO_STATUS_LABEL[r.status as EquipamentoStatus] ?? r.status}
                        </Badge>
                      </td>
                      <td className="p-3 text-right tabular-nums">{r.hh_mec_est.toFixed(1)}</td>
                      <td className="p-3 text-right tabular-nums">{r.hh_mec_real.toFixed(1)}</td>
                      <td className="p-3 text-right tabular-nums">{r.hh_elet_est.toFixed(1)}</td>
                      <td className="p-3 text-right tabular-nums">{r.hh_elet_real.toFixed(1)}</td>
                      <td
                        className={cn(
                          "p-3 text-right tabular-nums font-medium",
                          pct > 100 && "text-rose-700",
                        )}
                      >
                        {est > 0 ? `${pct}%` : "—"}
                      </td>
                    </tr>
                    {isOpen && (
                      <tr className="bg-[var(--bg-elevated)]/20">
                        <td colSpan={8} className="p-3">
                          <EtapasInline equipamentoId={r.id} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {data && data.total > 50 && (
        <div className="mt-3 flex items-center justify-between text-xs text-[var(--text-muted)]">
          <span>Total: {data.total}</span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page * 50 >= data.total}
              onClick={() => setPage(page + 1)}
            >
              Próxima
            </Button>
          </div>
        </div>
      )}
    </PageContainer>
  );
}

function EtapasInline({ equipamentoId }: { equipamentoId: string }) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery(equipamentoEtapasQueryOptions(equipamentoId));
  type LocalEtapa = {
    id: string;
    ordem: number;
    nome: string;
    fase: EtapaFase;
    hh_mecanica_estimada: number;
    hh_eletrica_estimada: number;
    hh_mecanica_real: number;
    hh_eletrica_real: number;
    data_inicio_prev: string | null;
    data_fim_prev: string | null;
    progresso: number;
    status: EtapaStatus;
  };
  const [rows, setRows] = useState<LocalEtapa[]>([]);
  useEffect(() => {
    if (data) {
      setRows(
        data.map((d: any) => ({
          id: d.id,
          ordem: d.ordem,
          nome: d.nome,
          fase: d.fase,
          hh_mecanica_estimada: Number(d.hh_mecanica_estimada ?? 0),
          hh_eletrica_estimada: Number(d.hh_eletrica_estimada ?? 0),
          hh_mecanica_real: Number(d.hh_mecanica_real ?? 0),
          hh_eletrica_real: Number(d.hh_eletrica_real ?? 0),
          data_inicio_prev: d.data_inicio_prev,
          data_fim_prev: d.data_fim_prev,
          progresso: d.progresso ?? 0,
          status: d.status,
        })),
      );
    }
  }, [data]);

  const saveMut = useMutation({
    mutationFn: () => {
      // Validações client-side
      const invalid: string[] = [];
      const warns: string[] = [];
      for (const r of rows) {
        if (r.hh_mecanica_real < 0 || r.hh_eletrica_real < 0)
          invalid.push(r.nome || `Etapa ${r.ordem}`);
        if (Number.isNaN(r.hh_mecanica_real) || Number.isNaN(r.hh_eletrica_real))
          invalid.push(r.nome || `Etapa ${r.ordem}`);
        const dobroMec =
          r.hh_mecanica_estimada > 0 && r.hh_mecanica_real > r.hh_mecanica_estimada * 2;
        const dobroElet =
          r.hh_eletrica_estimada > 0 && r.hh_eletrica_real > r.hh_eletrica_estimada * 2;
        if (dobroMec || dobroElet) warns.push(r.nome || `Etapa ${r.ordem}`);
      }
      if (invalid.length) {
        throw new Error(`Horas inválidas (negativas ou vazias): ${invalid.join(", ")}`);
      }
      if (warns.length) toast.warning(`Horas reais > 2× do estimado em: ${warns.join(", ")}`);
      return upsertEtapas({
        data: {
          equipamento_id: equipamentoId,
          etapas: rows.map((r) => ({
            id: r.id,
            ordem: r.ordem,
            nome: r.nome,
            fase: r.fase,
            data_inicio_prev: r.data_inicio_prev,
            data_fim_prev: r.data_fim_prev,
            hh_mecanica_estimada: r.hh_mecanica_estimada,
            hh_eletrica_estimada: r.hh_eletrica_estimada,
            hh_mecanica_real: Number.isFinite(r.hh_mecanica_real) ? r.hh_mecanica_real : 0,
            hh_eletrica_real: Number.isFinite(r.hh_eletrica_real) ? r.hh_eletrica_real : 0,
            progresso: r.progresso,
            status: r.status,
          })),
          remove_ids: [],
        },
      });
    },
    onSuccess: () => {
      toast.success(`Horas lançadas em ${rows.length} etapa${rows.length === 1 ? "" : "s"}.`);
      qc.invalidateQueries({ queryKey: ["engenharia", "etapas", equipamentoId] });
      qc.invalidateQueries({ queryKey: ["engenharia", "hh"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Falha ao salvar horas."),
  });

  if (isLoading) return <div className="text-xs text-[var(--text-muted)]">Carregando etapas…</div>;
  if (!rows.length)
    return (
      <div className="text-xs text-[var(--text-muted)]">
        Nenhuma etapa cadastrada para este equipamento. Vá em Gantt / Etapas para criar.
      </div>
    );

  return (
    <div>
      <table className="w-full text-[11px]">
        <thead className="text-[var(--text-muted)]">
          <tr>
            <th className="text-left p-1">Etapa</th>
            <th className="text-left p-1">Fase</th>
            <th className="text-right p-1">Mec est</th>
            <th className="text-right p-1">Mec real</th>
            <th className="text-right p-1">Elet est</th>
            <th className="text-right p-1">Elet real</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.id} className="border-t border-[var(--bg-border)]">
              <td className="p-1">{r.nome}</td>
              <td className="p-1">{ETAPA_FASE_LABEL[r.fase]}</td>
              <td className="p-1 text-right tabular-nums">{r.hh_mecanica_estimada.toFixed(1)}</td>
              <td className="p-1 text-right">
                <Input
                  type="number"
                  step="0.5"
                  className="h-7 w-20 text-right bg-amber-50 inline-block"
                  value={r.hh_mecanica_real}
                  onChange={(e) =>
                    setRows((rs) =>
                      rs.map((rr, j) =>
                        j === i ? { ...rr, hh_mecanica_real: Number(e.target.value) } : rr,
                      ),
                    )
                  }
                />
              </td>
              <td className="p-1 text-right tabular-nums">{r.hh_eletrica_estimada.toFixed(1)}</td>
              <td className="p-1 text-right">
                <Input
                  type="number"
                  step="0.5"
                  className="h-7 w-20 text-right bg-amber-50 inline-block"
                  value={r.hh_eletrica_real}
                  onChange={(e) =>
                    setRows((rs) =>
                      rs.map((rr, j) =>
                        j === i ? { ...rr, hh_eletrica_real: Number(e.target.value) } : rr,
                      ),
                    )
                  }
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-2 flex justify-end">
        <Button size="sm" onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>
          {saveMut.isPending ? "Salvando…" : "Lançar horas"}
        </Button>
      </div>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--bg-border)] bg-[var(--bg-surface)] p-4 shadow-[var(--shadow-sm)]">
      <div className="text-[11px] uppercase tracking-wide text-[var(--text-muted)]">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
    </div>
  );
}
