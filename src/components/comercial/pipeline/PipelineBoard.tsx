import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Archive, FileText, Plus, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { pipelineQueryOptions, useUpdateStage } from "@/lib/oportunidades.queries";
import {
  PIPELINE_STAGES,
  STAGE_LABEL,
  type PipelineStage,
  type OportunidadeLite,
} from "@/lib/oportunidades.functions";
import { EditOportunidadeDialog } from "./EditOportunidadeDialog";
import { PipelineTable } from "./PipelineTable";
import { LostOportunidadesList } from "./LostOportunidadesList";
import { RestoredOportunidadeBadge } from "./RestoredOportunidadeBadge";
import { ConvertWizardDialog } from "./ConvertWizardDialog";
import { StageHintButton } from "@/components/comercial/ProcessoComercialGuia";
import { avisoMover } from "@/lib/comercial/guia";
import { toast } from "sonner";

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

function OportunidadeCard({
  opp,
  onOpen,
}: {
  opp: OportunidadeLite;
  onOpen: (o: OportunidadeLite, tab?: "dados" | "notas") => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: opp.id });
  const age = ageDays(opp.stage_entered_at);
  const ageTone = age > 14 ? "text-rose-600" : age > 7 ? "text-amber-600" : "text-muted-foreground";

  return (
    <Card
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{
        transform: transform ? `translate3d(${transform.x}px,${transform.y}px,0)` : undefined,
        opacity: isDragging ? 0.4 : 1,
      }}
      onClick={(e) => {
        if (isDragging) return;
        e.stopPropagation();
        onOpen(opp);
      }}
      className="cursor-grab active:cursor-grabbing p-3 space-y-1.5 hover:shadow-md transition-shadow"
    >
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
                onOpen(opp, "notas");
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
      {opp.pipeline_stage === "ganho" && (
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
        "flex flex-col max-h-[70vh] bg-muted/30 rounded-lg border-t-4 w-[78vw] sm:w-[260px] xl:w-auto shrink-0 xl:shrink",
        STAGE_HEADER_TONE[stage],
        isOver && "ring-2 ring-primary/50",
      )}
    >
      <div className="flex items-center justify-between gap-2 p-3 border-b">
        <div className="flex items-center gap-1.5 min-w-0">
          <h3 className="font-semibold text-sm truncate">{STAGE_LABEL[stage]}</h3>
          <StageHintButton stage={stage} />
        </div>
        <span className="shrink-0 text-xs text-muted-foreground">
          {items.length} · {formatBRL(totalValor)}
        </span>
      </div>
      <div className="flex-1 p-2 space-y-2 overflow-y-auto min-h-0">
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
}: {
  view?: "kanban" | "table";
  onNew: () => void;
}) {
  const { data } = useSuspenseQuery(pipelineQueryOptions());
  const update = useUpdateStage();
  const [scope, setScope] = useState<"ativas" | "perdidas">("ativas");
  const [lostDialog, setLostDialog] = useState<{ id: string } | null>(null);
  const [lostReason, setLostReason] = useState("");
  const [winDialog, setWinDialog] = useState<OportunidadeLite | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTab, setEditingTab] = useState<"dados" | "notas">("dados");

  useEffect(() => {
    const saved = window.localStorage.getItem("solutek:pipeline:editing");
    if (saved) setEditingId(saved);
  }, []);

  useEffect(() => {
    if (editingId) window.localStorage.setItem("solutek:pipeline:editing", editingId);
    else window.localStorage.removeItem("solutek:pipeline:editing");
  }, [editingId]);

  const editing = editingId ? (data.find((item) => item.id === editingId) ?? null) : null;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
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

  function onDragEnd(e: DragEndEvent) {
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
      setLostDialog({ id });
      setLostReason("");
      return;
    }
    const aviso = avisoMover(newStage, opp);
    if (aviso) toast.warning(aviso);
    update.mutate({ id, stage: newStage });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{kpis.count} ativas</span>
          {" · "}
          {formatBRL(kpis.total)}
          <span className="hidden sm:inline">
            {" · "}ponderado {formatBRL(kpis.weighted)}
            {" · "}conversão {kpis.winRate}%
          </span>
        </p>

        <div className="inline-flex rounded-lg border bg-[var(--bg-surface)] p-1">
          <Button
            size="sm"
            variant={scope === "ativas" ? "secondary" : "ghost"}
            className="h-8 px-3"
            onClick={() => setScope("ativas")}
          >
            Ativas <span className="ml-2 text-muted-foreground">{activeItems.length}</span>
          </Button>
          <Button
            size="sm"
            variant={scope === "perdidas" ? "secondary" : "ghost"}
            className="h-8 px-3"
            onClick={() => setScope("perdidas")}
          >
            <Archive className="h-4 w-4 mr-1" /> Perdidas{" "}
            <span className="ml-2 text-muted-foreground">{lostItems.length}</span>
          </Button>
        </div>
      </div>

      <div>
        {scope === "perdidas" ? (
          <LostOportunidadesList
            items={lostItems}
            onOpen={(o) => {
              setEditingTab("dados");
              setEditingId(o.id);
            }}
          />
        ) : view === "kanban" ? (
          <DndContext sensors={sensors} onDragEnd={onDragEnd}>
            <div className="flex w-full items-start gap-3 overflow-x-auto pb-4 snap-x snap-mandatory xl:grid xl:grid-cols-5 xl:overflow-visible xl:snap-none">
              {ACTIVE_PIPELINE_STAGES.map((stage) => {
                const items = grouped.get(stage) ?? [];
                const total = items.reduce((s, o) => s + (o.valor_estimado ?? 0), 0);
                return (
                  <div key={stage} className="snap-start min-w-0">
                    <StageColumn
                      stage={stage}
                      items={items}
                      totalValor={total}
                      onOpen={(o, tab) => {
                        setEditingTab(tab ?? "dados");
                        setEditingId(o.id);
                      }}
                      onNew={onNew}
                    />
                  </div>
                );
              })}
            </div>
          </DndContext>
        ) : (
          <PipelineTable
            items={activeItems}
            onRowClick={(o) => {
              setEditingTab("dados");
              setEditingId(o.id);
            }}
          />
        )}
      </div>

      <Dialog
        open={!!lostDialog}
        onOpenChange={(o) => !o && !update.isPending && setLostDialog(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Marcar como perdida</DialogTitle>
            <DialogDescription>Informe o motivo da perda para análise de funil.</DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Ex: preço, prazo, concorrente X, sem fit técnico..."
            value={lostReason}
            onChange={(e) => setLostReason(e.target.value)}
            maxLength={500}
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setLostDialog(null)}
              disabled={update.isPending}
            >
              Cancelar
            </Button>
            <Button
              onClick={() => {
                if (!lostDialog || !lostReason.trim()) return;
                update.mutate(
                  { id: lostDialog.id, stage: "perdido", lost_reason: lostReason.trim() },
                  { onSettled: () => setLostDialog(null) },
                );
              }}
              disabled={lostReason.trim().length < 10 || update.isPending}
            >
              Confirmar perda
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
