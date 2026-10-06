import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { FileText, Inbox, Wrench } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatLine } from "@/components/data/StatLine";
import { MineracaoResumo } from "@/components/clientes/MinerarDados";
import type { MineracaoIA } from "@/lib/minerar-cliente.functions";
import {
  clienteOportunidadesQueryOptions,
  clienteOrcamentosQueryOptions,
  clienteTimelineQueryOptions,
} from "@/lib/clientes.queries";
import { clienteEquipamentosQueryOptions } from "@/lib/equipamentos.queries";
import {
  EQUIPAMENTO_CATEGORIA_LABEL,
  EQUIPAMENTO_STATUS_COLOR,
  EQUIPAMENTO_STATUS_LABEL,
  type EquipamentoCategoria,
  type EquipamentoStatus,
} from "@/lib/equipamentos.shared";
import { approveDocument } from "@/lib/docs/docs.functions";
import { orcamentoStatusMeta } from "@/lib/orcamentos.shared";
import {
  EquipamentoDrawer,
  type EquipamentoRow,
} from "@/components/clientes/equipamentos/EquipamentoDrawer";
import { cn } from "@/lib/utils";
import { CompletarCadastroSection } from "./CompletarCadastroSection";
import {
  EmptyState,
  FichaSection,
  fmtDate,
  fmtDateTime,
  fmtMoney,
  type ClienteRow,
  type FichaTab,
} from "./ficha-utils";

export function ClienteVisaoTab({
  cliente,
  completudePct,
  completarAberto,
  minerando,
  mineracao,
  mineradoEm,
  onGoTo,
}: {
  cliente: ClienteRow;
  completudePct: number;
  completarAberto: boolean;
  minerando: boolean;
  mineracao: MineracaoIA | null | undefined;
  mineradoEm: string | null | undefined;
  onGoTo: (tab: FichaTab) => void;
}) {
  const clienteId = cliente.id;
  const equips = useQuery(clienteEquipamentosQueryOptions(clienteId));
  const orcamentos = useQuery(clienteOrcamentosQueryOptions(clienteId));
  const timeline = useQuery(clienteTimelineQueryOptions(clienteId));
  const opps = useQuery(clienteOportunidadesQueryOptions(clienteId));
  const [selected, setSelected] = useState<EquipamentoRow | null>(null);
  const qc = useQueryClient();
  const aprovarMut = useMutation({
    mutationFn: (id: string) => approveDocument({ data: { documento_id: id } }),
    onSuccess: () => {
      toast.success("Orçamento aprovado — equipamentos gerados na ficha.");
      qc.invalidateQueries({ queryKey: ["clientes", clienteId] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Falha ao aprovar."),
  });

  const oppsAbertas = (opps.data ?? []).filter(
    (o) => o.pipeline_stage !== "ganho" && o.pipeline_stage !== "perdido",
  );
  const valorPipeline = oppsAbertas.reduce((s, o) => s + Number(o.valor_estimado ?? 0), 0);
  const orcAbertos = (orcamentos.data ?? []).filter((o: { status: string }) =>
    ["rascunho", "emitido", "em_revisao"].includes(o.status),
  ).length;

  return (
    <div className="space-y-4">
      <StatLine
        items={[
          { label: "equipamentos", value: equips.data?.length ?? "…" },
          {
            label: "oportunidades abertas",
            value: opps.data ? oppsAbertas.length : "…",
            hint: valorPipeline ? fmtMoney(valorPipeline) : undefined,
          },
          { label: "orçamentos em aberto", value: orcamentos.data ? orcAbertos : "…" },
          {
            label: "processos ativos",
            value: `${cliente.processos_ativos ?? 0}/${cliente.processos_total ?? 0}`,
          },
          {
            label: "último contato",
            value: cliente.ultimo_contato_em ? fmtDate(cliente.ultimo_contato_em) : "—",
          },
        ]}
      />

      {(minerando || mineracao) && (
        <MineracaoResumo pending={minerando} mineracao={mineracao} mineradoEm={mineradoEm} />
      )}

      {completudePct < 100 && (
        <div id="completar-cadastro" className="space-y-2">
          <div className="flex items-baseline justify-between">
            <h2 className="text-[13.5px] font-semibold">Completar cadastro</h2>
            <span className="text-[12px] text-muted-foreground">{completudePct}% completo</span>
          </div>
          <CompletarCadastroSection cliente={cliente} abrirPrimeira={completarAberto} />
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <FichaSection
          title="Orçamentos"
          action={
            (orcamentos.data?.length ?? 0) > 5 && (
              <button
                type="button"
                className="text-[11.5px] text-muted-foreground hover:underline"
                onClick={() => onGoTo("comercial")}
              >
                ver todos
              </button>
            )
          }
        >
          {orcamentos.isLoading ? (
            <div className="p-4 text-[12px] text-muted-foreground">Carregando…</div>
          ) : (orcamentos.data?.length ?? 0) === 0 ? (
            <EmptyState icon={FileText} title="Nenhum orçamento" />
          ) : (
            <ul className="divide-y divide-border">
              {orcamentos.data!.slice(0, 5).map((o: any) => {
                const sm = orcamentoStatusMeta(o.status);
                return (
                  <li key={o.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/30">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Link
                          to="/documentos/$id"
                          params={{ id: o.id }}
                          className="font-mono text-[10.5px] text-muted-foreground hover:underline"
                        >
                          {o.codigo}
                        </Link>
                        <Badge variant="outline" className={cn("text-[10px]", sm.cls)}>
                          {sm.label}
                        </Badge>
                      </div>
                      <div className="truncate text-[12.5px] font-medium">
                        {o.titulo || "Sem título"}
                      </div>
                    </div>
                    {["rascunho", "emitido", "em_revisao"].includes(o.status) && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 shrink-0 text-[11px]"
                        disabled={aprovarMut.isPending}
                        onClick={() => aprovarMut.mutate(o.id)}
                      >
                        Aprovar
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </FichaSection>

        <FichaSection
          title="Equipamentos"
          action={
            (equips.data?.length ?? 0) > 5 && (
              <button
                type="button"
                className="text-[11.5px] text-muted-foreground hover:underline"
                onClick={() => onGoTo("equipamentos")}
              >
                ver todos
              </button>
            )
          }
        >
          {equips.isLoading ? (
            <div className="p-4 text-[12px] text-muted-foreground">Carregando…</div>
          ) : (equips.data?.length ?? 0) === 0 ? (
            <EmptyState icon={Wrench} title="Nenhum equipamento" />
          ) : (
            <ul className="divide-y divide-border">
              {equips.data!.slice(0, 5).map((e) => {
                const status = e.status as EquipamentoStatus;
                return (
                  <li
                    key={e.id}
                    className="flex cursor-pointer items-center gap-3 px-4 py-2.5 hover:bg-muted/30"
                    onClick={() => setSelected(e as unknown as EquipamentoRow)}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[12.5px] font-medium">{e.modelo}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {EQUIPAMENTO_CATEGORIA_LABEL[e.categoria as EquipamentoCategoria] ??
                          e.categoria}
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={cn("text-[10px]", EQUIPAMENTO_STATUS_COLOR[status])}
                    >
                      {EQUIPAMENTO_STATUS_LABEL[status] ?? status}
                    </Badge>
                  </li>
                );
              })}
            </ul>
          )}
        </FichaSection>

        <FichaSection
          title="Últimas atividades"
          action={
            (timeline.data?.length ?? 0) > 5 && (
              <button
                type="button"
                className="text-[11.5px] text-muted-foreground hover:underline"
                onClick={() => onGoTo("historico")}
              >
                ver histórico
              </button>
            )
          }
        >
          {(timeline.data?.length ?? 0) === 0 ? (
            <EmptyState icon={Inbox} title="Sem atividades" />
          ) : (
            <ul className="divide-y divide-border">
              {timeline.data!.slice(0, 5).map((t) => (
                <li key={t.id} className="px-4 py-2.5 text-[12px]">
                  <div className="truncate font-medium text-foreground">{t.titulo}</div>
                  <div className="text-muted-foreground">
                    {fmtDateTime(t.ts)}
                    {t.user_nome ? ` · ${t.user_nome}` : ""}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </FichaSection>
      </div>

      <EquipamentoDrawer
        open={!!selected}
        onClose={() => setSelected(null)}
        equipamento={selected}
      />
    </div>
  );
}
