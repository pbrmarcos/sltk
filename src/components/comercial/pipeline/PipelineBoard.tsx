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
import { Archive, Trophy, FileText, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { pipelineQueryOptions, useUpdateStage } from "@/lib/oportunidades.queries";
import {
  PIPELINE_STAGES,
  STAGE_LABEL,
  LIFECYCLE_OF_STAGE,
  type PipelineStage,
  type OportunidadeLite,
} from "@/lib/oportunidades.functions";
import { EditOportunidadeDialog } from "./EditOportunidadeDialog";
import { PipelineTable } from "./PipelineTable";
import { LostOportunidadesList } from "./LostOportunidadesList";
import { ClienteStatusBadge } from "@/components/clientes/ClienteStatusBadge";
import { CLIENTE_LIFECYCLE_LABEL } from "@/lib/clientes.shared";
import { RestoredOportunidadeBadge } from "./RestoredOportunidadeBadge";
import { ConvertWizardDialog } from "./ConvertWizardDialog";
import { NewOportunidadeDialog } from "./NewOportunidadeDialog";
import {
  ProcessoComercialGuia,
  StageHintButton,
} from "@/components/comercial/ProcessoComercialGuia";
import { STAGE_GUIA, avisoMover } from "@/lib/comercial/guia";
import { toast } from "sonner";

const ACTIVE_PIPELINE_STAGES = PIPELINE_STAGES.filter((stage) => stage !== "perdido");

const LIFECYCLE_TONE: Record<string, string> = {
  suspect:
    "bg-[var(--badge-neutral-bg)] text-[var(--badge-neutral-fg)] border-[var(--badge-neutral-border)]",
  prospect: "bg-blue-50 text-blue-700 border-blue-200",
  cliente: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

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
  onWin,
  onOpen,
}: {
  opp: OportunidadeLite;
  onWin: (o: OportunidadeLite) => void;
  onOpen: (o: OportunidadeLite) => void;
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
      className="cursor-grab active:cursor-grabbing p-3 space-y-2 hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="text-xs text-muted-foreground font-mono">{opp.codigo}</div>
          <div className="font-medium text-sm leading-tight line-clamp-2">{opp.titulo}</div>
        </div>
        <ClienteStatusBadge status={opp.lifecycle_stage} className="shrink-0" />
      </div>
      <div className="text-xs text-muted-foreground truncate">
        {opp.cliente_nome || opp.empresa_lead || opp.nome_lead || "—"}
      </div>
      <RestoredOportunidadeBadge restoredAt={opp.restored_at} restoredBy={opp.restored_by_nome} />
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold">{formatBRL(opp.valor_estimado)}</span>
        <span className="text-muted-foreground">{opp.probabilidade}%</span>
      </div>
      <div className="flex items-center justify-between text-[11px]">
        <span className="truncate text-muted-foreground">{opp.responsavel_nome}</span>
        <span className={ageTone}>{age}d</span>
      </div>
      {opp.pipeline_stage !== "ganho" && opp.pipeline_stage !== "perdido" && (
        <Button
          size="sm"
          variant="outline"
          className="w-full h-7 text-xs"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onWin(opp);
          }}
        >
          <Trophy className="w-3 h-3 mr-1" /> Marcar ganho
        </Button>
      )}
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
  onWin,
  onOpen,
  onNew,
}: {
  stage: PipelineStage;
  items: OportunidadeLite[];
  totalValor: number;
  onWin: (o: OportunidadeLite) => void;
  onOpen: (o: OportunidadeLite) => void;
  onNew: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex flex-col h-full bg-muted/30 rounded-lg border-t-4 w-[85vw] sm:w-auto sm:min-w-0 shrink-0 sm:shrink",
        STAGE_HEADER_TONE[stage],
        isOver && "ring-2 ring-primary/50",
      )}
    >
      <div className="p-3 border-b">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <h3 className="font-semibold text-sm truncate">{STAGE_LABEL[stage]}</h3>
            <StageHintButton stage={stage} />
          </div>
          <Badge variant="secondary" className="text-xs">
            {items.length}
          </Badge>
        </div>
        <div className="text-xs text-muted-foreground mt-1">{formatBRL(totalValor)}</div>
      </div>
      <div className="flex-1 p-2 space-y-2 overflow-y-auto min-h-0">
        {items.length === 0 ? (
          stage === "novo" ? (
            <div className="text-center text-xs text-muted-foreground p-4 space-y-2">
              <p>
                Oportunidades nascem de um suspect: crie manualmente, converta um lead da Mineração
                ou receba pelo formulário público do site.
              </p>
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onNew}>
                <Plus className="w-3 h-3 mr-1" /> Nova oportunidade
              </Button>
            </div>
          ) : (
            <div className="text-center text-xs text-muted-foreground py-8 px-3">
              <div>Vazio</div>
              <div className="mt-1">{STAGE_GUIA[stage].proximo}</div>
            </div>
          )
        ) : (
          items.map((o) => <OportunidadeCard key={o.id} opp={o} onWin={onWin} onOpen={onOpen} />)
        )}
      </div>
    </div>
  );
}

export function PipelineBoard({ view = "kanban" }: { view?: "kanban" | "table" }) {
  const { data } = useSuspenseQuery(pipelineQueryOptions());
  const update = useUpdateStage();
  const [scope, setScope] = useState<"ativas" | "perdidas">("ativas");
  const [lostDialog, setLostDialog] = useState<{ id: string } | null>(null);
  const [lostReason, setLostReason] = useState("");
  const [winDialog, setWinDialog] = useState<OportunidadeLite | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newOpen, setNewOpen] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem("solutek:pipeline:editing");
    if (saved) setEditingId(saved);
    setNewOpen(window.localStorage.getItem("solutek:pipeline:new-open") === "1");
  }, []);

  useEffect(() => {
    if (editingId) window.localStorage.setItem("solutek:pipeline:editing", editingId);
    else window.localStorage.removeItem("solutek:pipeline:editing");
  }, [editingId]);

  useEffect(() => {
    if (newOpen) window.localStorage.setItem("solutek:pipeline:new-open", "1");
    else window.localStorage.removeItem("solutek:pipeline:new-open");
  }, [newOpen]);

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
    <div className="flex flex-col flex-1 min-h-0 gap-4">
      <ProcessoComercialGuia />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-3">
          <div className="text-xs text-muted-foreground">Pipeline ativo</div>
          <div className="text-xl font-bold">{kpis.count}</div>
        </Card>
        <Card className="p-3">
          <div className="text-xs text-muted-foreground">Valor total</div>
          <div className="text-xl font-bold">{formatBRL(kpis.total)}</div>
        </Card>
        <Card className="p-3">
          <div className="text-xs text-muted-foreground">Valor ponderado</div>
          <div className="text-xl font-bold">{formatBRL(kpis.weighted)}</div>
        </Card>
        <Card className="p-3">
          <div className="text-xs text-muted-foreground">Taxa de conversão</div>
          <div className="text-xl font-bold">{kpis.winRate}%</div>
        </Card>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {(["suspect", "prospect", "cliente"] as const).map((lc) => {
            const count = activeItems.filter(
              (o) => LIFECYCLE_OF_STAGE[o.pipeline_stage] === lc,
            ).length;
            return (
              <Badge key={lc} variant="outline" className={LIFECYCLE_TONE[lc]}>
                {CLIENTE_LIFECYCLE_LABEL[lc]}: {count}
              </Badge>
            );
          })}
        </div>

        <div className="inline-flex rounded-lg border bg-white p-1">
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

      <div className="flex-1 min-h-0">
        {scope === "perdidas" ? (
          <LostOportunidadesList items={lostItems} onOpen={(o) => setEditingId(o.id)} />
        ) : view === "kanban" ? (
          <DndContext sensors={sensors} onDragEnd={onDragEnd}>
            <div className="flex h-full gap-3 overflow-x-auto pb-4 snap-x snap-mandatory sm:grid sm:grid-cols-5 sm:overflow-visible sm:snap-none w-full">
              {ACTIVE_PIPELINE_STAGES.map((stage) => {
                const items = grouped.get(stage) ?? [];
                const total = items.reduce((s, o) => s + (o.valor_estimado ?? 0), 0);
                return (
                  <div key={stage} className="snap-start min-w-0 h-full">
                    <StageColumn
                      stage={stage}
                      items={items}
                      totalValor={total}
                      onWin={(o) => setWinDialog(o)}
                      onOpen={(o) => setEditingId(o.id)}
                      onNew={() => setNewOpen(true)}
                    />
                  </div>
                );
              })}
            </div>
          </DndContext>
        ) : (
          <PipelineTable items={activeItems} onRowClick={(o) => setEditingId(o.id)} />
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

      <NewOportunidadeDialog open={newOpen} onOpenChange={setNewOpen} />

      <EditOportunidadeDialog
        opp={editing}
        onOpenChange={(o) => {
          if (!o) setEditingId(null);
        }}
      />
    </div>
  );
}
