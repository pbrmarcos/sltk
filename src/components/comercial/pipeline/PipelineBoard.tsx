import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  type DropAnimation,
} from "@dnd-kit/core";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Plus, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { pipelineQueryOptions, useUpdateStage } from "@/lib/oportunidades.queries";
import {
  PIPELINE_STAGES,
  STAGE_LABEL,
  type PipelineStage,
  type OportunidadeLite,
} from "@/lib/oportunidades.functions";
import { StatLine } from "@/components/data/StatLine";
import { EditOportunidadeDialog } from "./EditOportunidadeDialog";
import { PipelineTable } from "./PipelineTable";
import { LostOportunidadesList } from "./LostOportunidadesList";
import { RestoredOportunidadeBadge } from "./RestoredOportunidadeBadge";
import { ConvertWizardDialog } from "./ConvertWizardDialog";
import { MarcarPerdidaDialog } from "./MarcarPerdidaDialog";
import { avisoMover } from "@/lib/comercial/guia";
import { toast } from "sonner";

export type PipelineView = "kanban" | "table" | "perdidas";

/** Soltar: o card "assenta" no lugar com uma curva suave. */
const DROP_ANIMATION: DropAnimation = {
  duration: 220,
  easing: "cubic-bezier(0.2, 0.8, 0.2, 1)",
};

const ACTIVE_PIPELINE_STAGES = PIPELINE_STAGES.filter((stage) => stage !== "perdido");

const STAGE_HEADER_TONE: Record<PipelineStage, string> = {
  novo: "border-t-slate-300",
  qualificado: "border-t-blue-400",
  proposta: "border-t-indigo-400",
  negociacao: "border-t-amber-400",
  ganho: "border-t-emerald-500",
  perdido: "border-t-rose-400",
};

function formatBRL(v: number | null): string {
  if (!v) return "—";
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `R$ ${(v / 1_000).toFixed(0)}k`;
  return `R$ ${v.toFixed(0)}`;
}

function ageDays(date: string): number {
  return Math.floor((Date.now() - new Date(date).getTime()) / 86_400_000);
}

/** Visual do card — usado no lugar e no "fantasma" que acompanha o dedo/mouse. */
function OportunidadeCardBody({
  opp,
  onOpenNotas,
}: {
  opp: OportunidadeLite;
  onOpenNotas?: () => void;
}) {
  const age = ageDays(opp.stage_entered_at);
  const ageTone = age > 14 ? "text-rose-600" : age > 7 ? "text-amber-600" : "text-muted-foreground";
  return (
    <>
      <div className="font-semibold text-sm leading-tight truncate">
        {opp.cliente_nome || opp.empresa_lead || opp.nome_lead || "Sem empresa"}
      </div>
      <div className="text-xs text-muted-foreground truncate">{opp.titulo}</div>
      <RestoredOportunidadeBadge restoredAt={opp.restored_at} restoredBy={opp.restored_by_nome} />
      <div className="flex items-center justify-between gap-2 pt-0.5 text-xs">
        <span className="font-medium">{formatBRL(opp.valor_estimado)}</span>
        <div className="flex items-center gap-2 shrink-0">
          {opp.notas_count > 0 && (
            <button
              type="button"
              title="Ver anotações"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                onOpenNotas?.();
              }}
              className="inline-flex items-center gap-0.5 text-muted-foreground hover:text-foreground"
            >
              <MessageSquare className="h-3 w-3" /> {opp.notas_count}
            </button>
          )}
          <span className={ageTone} title="Dias nesta etapa">
            {age}d
          </span>
        </div>
      </div>
      {opp.pipeline_stage === "ganho" && !opp.processo_id && (
        <Button
          asChild
          size="sm"
          variant="default"
          className="w-full h-7 text-xs"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <Link
            to="/comercial/orcamento/novo"
            search={{
              oportunidade: opp.id,
              oportunidadeCodigo: opp.codigo,
              ...(opp.cliente_id ? { cliente: opp.cliente_id } : {}),
              titulo: opp.titulo,
            }}
          >
            <FileText className="w-3 h-3 mr-1" /> Gerar orçamento
          </Link>
        </Button>
      )}
      {opp.processo_id && (
        <Badge variant="secondary" className="text-[10px]">
          Processo criado
        </Badge>
      )}
    </>
  );
}

function OportunidadeCard({
  opp,
  onOpen,
}: {
  opp: OportunidadeLite;
  onOpen: (o: OportunidadeLite, tab?: "dados" | "notas") => void;
}) {
  // Sem transform aqui: o card no lugar vira um "espaço reservado" e quem se
  // move é o DragOverlay, desenhado por cima de tudo (nunca é cortado pela coluna).
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: opp.id });
  return (
    <Card
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={(e) => {
        if (isDragging) return;
        e.stopPropagation();
        onOpen(opp);
      }}
      className={cn(
        "cursor-grab touch-manipulation select-none p-3 space-y-1.5 transition-[opacity,box-shadow] duration-150 hover:shadow-md",
        isDragging && "opacity-30 border-dashed shadow-none",
      )}
    >
      <OportunidadeCardBody opp={opp} onOpenNotas={() => onOpen(opp, "notas")} />
    </Card>
  );
}

function StageColumn({
  stage,
  items,
  totalValor,
  onOpen,
  onNew,
}: {
  stage: PipelineStage;
  items: OportunidadeLite[];
  totalValor: number;
  onOpen: (o: OportunidadeLite, tab?: "dados" | "notas") => void;
  onNew: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        // Abaixo de xl: colunas de largura fixa com rolagem horizontal do quadro.
        "flex flex-col max-h-[70dvh] bg-muted/30 rounded-lg border-t-4 w-[78vw] sm:w-[260px] xl:w-auto shrink-0 xl:shrink transition-colors duration-150",
        STAGE_HEADER_TONE[stage],
        isOver && "bg-primary/5 ring-2 ring-primary/40",
      )}
    >
      <div className="flex items-center justify-between gap-2 p-3 border-b">
        <h3 className="font-semibold text-sm truncate">{STAGE_LABEL[stage]}</h3>
        <span className="shrink-0 text-xs text-muted-foreground">
          {items.length} · {formatBRL(totalValor)}
        </span>
      </div>
      <div className="no-scrollbar flex-1 p-2 space-y-2 overflow-y-auto overscroll-contain min-h-0">
        {items.length === 0 ? (
          stage === "novo" ? (
            <div className="text-center p-4">
              <Button size="sm" variant="outline" className="h-8 text-xs" onClick={onNew}>
                <Plus className="w-3 h-3 mr-1" /> Nova oportunidade
              </Button>
            </div>
          ) : (
            <div className="text-center text-xs text-muted-foreground py-6 px-3">Vazio</div>
          )
        ) : (
          items.map((o) => <OportunidadeCard key={o.id} opp={o} onOpen={onOpen} />)
        )}
      </div>
    </div>
  );
}

export function PipelineBoard({
  view = "kanban",
  onNew,
  abrirId,
}: {
  view?: PipelineView;
  onNew: () => void;
  /** Oportunidade a abrir ao carregar (vinda de um link). */
  abrirId?: string;
}) {
  const { data } = useSuspenseQuery(pipelineQueryOptions());
  const update = useUpdateStage();
  const [lostDialog, setLostDialog] = useState<OportunidadeLite | null>(null);
  const [winDialog, setWinDialog] = useState<OportunidadeLite | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTab, setEditingTab] = useState<"dados" | "notas">("dados");

  useEffect(() => {
    const saved = abrirId ?? window.localStorage.getItem("solutek:pipeline:editing");
    if (saved) setEditingId(saved);
  }, [abrirId]);

  useEffect(() => {
    if (editingId) window.localStorage.setItem("solutek:pipeline:editing", editingId);
    else window.localStorage.removeItem("solutek:pipeline:editing");
  }, [editingId]);

  const editing = editingId ? (data.find((item) => item.id === editingId) ?? null) : null;

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
    useSensor(KeyboardSensor),
  );

  const grouped = useMemo(() => {
    const map = new Map<PipelineStage, OportunidadeLite[]>();
    for (const s of ACTIVE_PIPELINE_STAGES) map.set(s, []);
    for (const o of data.filter((item) => item.pipeline_stage !== "perdido"))
      map.get(o.pipeline_stage)?.push(o);
    return map;
  }, [data]);

  const activeItems = useMemo(() => data.filter((o) => o.pipeline_stage !== "perdido"), [data]);

  const lostItems = useMemo(
    () =>
      data
        .filter((o) => o.pipeline_stage === "perdido")
        .sort(
          (a, b) =>
            new Date(b.lost_at ?? b.stage_entered_at).getTime() -
            new Date(a.lost_at ?? a.stage_entered_at).getTime(),
        ),
    [data],
  );

  const kpis = useMemo(() => {
    const active = data.filter(
      (o) => o.pipeline_stage !== "ganho" && o.pipeline_stage !== "perdido",
    );
    const total = active.reduce((s, o) => s + (o.valor_estimado ?? 0), 0);
    const weighted = active.reduce(
      (s, o) => s + ((o.valor_estimado ?? 0) * o.probabilidade) / 100,
      0,
    );
    const won = data.filter((o) => o.pipeline_stage === "ganho").length;
    const lost = lostItems.length;
    const winRate = won + lost === 0 ? 0 : Math.round((won / (won + lost)) * 100);
    return { total, weighted, count: active.length, winRate };
  }, [data, lostItems.length]);

  const abrir = (o: OportunidadeLite, tab?: "dados" | "notas") => {
    setEditingTab(tab ?? "dados");
    setEditingId(o.id);
  };

  const [arrastandoId, setArrastandoId] = useState<string | null>(null);
  const arrastando = arrastandoId ? (data.find((o) => o.id === arrastandoId) ?? null) : null;

  function onDragStart(e: DragStartEvent) {
    setArrastandoId(String(e.active.id));
    if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate?.(8);
  }

  function onDragEnd(e: DragEndEvent) {
    setArrastandoId(null);
    if (!e.over) return;
    const id = String(e.active.id);
    const newStage = String(e.over.id) as PipelineStage;
    const opp = data.find((o) => o.id === id);
    if (!opp || opp.pipeline_stage === newStage) return;

    if (newStage === "ganho") {
      const aviso = avisoMover("ganho", opp);
      if (aviso) toast.info(aviso);
      setWinDialog(opp);
      return;
    }
    if (newStage === "perdido") {
      setLostDialog(opp);
      return;
    }
    const aviso = avisoMover(newStage, opp);
    if (aviso) toast.warning(aviso);
    update.mutate({ id, stage: newStage });
  }

  return (
    <div className="flex flex-col gap-3">
      {view !== "perdidas" && (
        <StatLine
          items={[
            { label: "ativas", value: kpis.count },
            { label: "em pipeline", value: formatBRL(kpis.total) },
            { label: "ponderado", value: formatBRL(kpis.weighted) },
            { label: "conversão", value: `${kpis.winRate}%` },
          ]}
        />
      )}

      {view === "perdidas" ? (
        <LostOportunidadesList items={lostItems} onOpen={(o) => abrir(o)} />
      ) : view === "kanban" ? (
        <DndContext
          sensors={sensors}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          onDragCancel={() => setArrastandoId(null)}
          autoScroll={{ threshold: { x: 0.15, y: 0.2 }, acceleration: 12 }}
        >
          <div className="no-scrollbar flex w-full items-start gap-3 overflow-x-auto pb-4 snap-x snap-mandatory xl:grid xl:grid-cols-5 xl:overflow-visible xl:snap-none">
            {ACTIVE_PIPELINE_STAGES.map((stage) => {
              const items = grouped.get(stage) ?? [];
              const total = items.reduce((s, o) => s + (o.valor_estimado ?? 0), 0);
              // shrink-0: sem isso o wrapper encolhe e as colunas de largura fixa se sobrepõem (tablet).
              return (
                <div key={stage} className="snap-start shrink-0 xl:min-w-0 xl:shrink">
                  <StageColumn
                    stage={stage}
                    items={items}
                    totalValor={total}
                    onOpen={abrir}
                    onNew={onNew}
                  />
                </div>
              );
            })}
          </div>
          <DragOverlay dropAnimation={DROP_ANIMATION} zIndex={60}>
            {arrastando ? (
              <Card className="h-full cursor-grabbing p-3 space-y-1.5 rotate-[1.5deg] scale-[1.03] shadow-2xl ring-1 ring-primary/30">
                <OportunidadeCardBody opp={arrastando} />
              </Card>
            ) : null}
          </DragOverlay>
        </DndContext>
      ) : (
        <PipelineTable items={activeItems} onRowClick={(o) => abrir(o)} />
      )}

      <MarcarPerdidaDialog
        open={!!lostDialog}
        onOpenChange={(o) => !o && setLostDialog(null)}
        titulo={lostDialog?.titulo}
        pending={update.isPending}
        onConfirm={(reason) => {
          if (!lostDialog) return;
          update.mutate(
            { id: lostDialog.id, stage: "perdido", lost_reason: reason },
            { onSettled: () => setLostDialog(null) },
          );
        }}
      />

      <ConvertWizardDialog
        source={winDialog}
        open={!!winDialog}
        onOpenChange={(o) => {
          if (!o) setWinDialog(null);
        }}
      />

      <EditOportunidadeDialog
        opp={editing}
        initialTab={editingTab}
        onOpenChange={(o) => {
          if (!o) setEditingId(null);
        }}
      />
    </div>
  );
}
