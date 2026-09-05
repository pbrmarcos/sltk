import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useAuth } from "@/hooks/use-auth";
import {
  ChevronDown,
  ChevronRight,
  GripVertical,
  MessageSquare,
  Plus,
  Trash2,
  User,
  CalendarClock,
  AlertTriangle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { confirmDiscard } from "@/lib/unsaved-guard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  listDisciplinaEtapas,
  createEtapa,
  updateEtapa,
  deleteEtapa,
  reorderEtapas,
  listEtapaComentarios,
  addEtapaComentario,
  listUsuariosParaEtapa,
  ETAPA_STATUS_LIST,
  PRIORIDADES,
  type Disciplina,
  type EtapaStatus,
  type Prioridade,
} from "@/lib/equipamento-disciplina-etapas.functions";
import {
  DISCIPLINA_LABEL,
  ETAPA_STATUS_ORDEM,
  ETAPA_STATUS_LABEL,
  ETAPA_STATUS_COLOR,
  ETAPA_STATUS_DOT,
  PRIORIDADE_LABEL,
  PRIORIDADE_COLOR,
  isDueDatePast,
} from "@/lib/disciplina-etapas.shared";
import { BomTable } from "./BomTable";
import { EtapaAnexosPanel } from "./EtapaAnexosPanel";
import { ImportarDisciplinaDialog } from "./ImportarDisciplinaDialog";
import { HistoricoEquipamentoDrawer } from "./HistoricoEquipamentoDrawer";
import { isEquipamentoEmPlanejamento } from "@/lib/equipamento-import.functions";
import { FileSpreadsheet, History } from "lucide-react";

type EtapaRow = {
  id: string;
  equipamento_id: string;
  disciplina: string;
  parent_id: string | null;
  ordem: number;
  titulo: string;
  descricao: string | null;
  status: EtapaStatus;
  prioridade: Prioridade;
  progresso: number;
  data_vencimento: string | null;
  responsavel_id: string | null;
  responsavel_nome: string | null;
  comentarios_count: number;
};

export function DisciplinaTab({
  equipamentoId,
  disciplina,
}: {
  equipamentoId: string;
  disciplina: Disciplina;
}) {
  const qc = useQueryClient();
  const auth = useAuth();
  const isManager = auth.role === "admin" || auth.role === "manager";
  const queryKey = ["eq-disc-etapas", equipamentoId, disciplina];
  const { data: rows = [], isLoading } = useQuery({
    queryKey,
    queryFn: () => listDisciplinaEtapas({ data: { equipamentoId, disciplina } }),
  });

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [openEtapa, setOpenEtapa] = useState<EtapaRow | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [histOpen, setHistOpen] = useState(false);

  const { data: statusInfo } = useQuery({
    queryKey: ["eq-status-planejamento", equipamentoId],
    queryFn: () => isEquipamentoEmPlanejamento({ data: { equipamentoId } }),
  });
  const emPlanejamento = statusInfo?.emPlanejamento ?? false;

  const roots = useMemo(() => (rows as EtapaRow[]).filter((r) => !r.parent_id), [rows]);
  const childrenByParent = useMemo(() => {
    const m: Record<string, EtapaRow[]> = {};
    for (const r of rows as EtapaRow[]) {
      if (r.parent_id) (m[r.parent_id] ??= []).push(r);
    }
    return m;
  }, [rows]);

  const groups = useMemo(() => {
    const g: Record<EtapaStatus, EtapaRow[]> = {
      em_progresso: [],
      nao_iniciado: [],
      bloqueado: [],
      concluido: [],
    };
    for (const r of roots) g[r.status].push(r);
    for (const s of ETAPA_STATUS_LIST) g[s].sort((a, b) => a.ordem - b.ordem);
    return g;
  }, [roots]);

  const invalidate = () => qc.invalidateQueries({ queryKey });

  const createMut = useMutation({
    mutationFn: (p: any) => createEtapa({ data: p }),
    onSuccess: () => {
      invalidate();
    },
    onError: (e: any) => toast.error(e?.message ?? "Falha ao criar etapa"),
  });

  const updateMut = useMutation({
    mutationFn: (p: any) => updateEtapa({ data: p }),
    onSuccess: invalidate,
    onError: (e: any) => toast.error(e?.message ?? "Falha ao atualizar"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteEtapa({ data: { id } }),
    onSuccess: invalidate,
    onError: (e: any) => toast.error(e?.message ?? "Falha ao remover"),
  });

  const reorderMut = useMutation({
    mutationFn: (items: { id: string; ordem: number; status?: EtapaStatus }[]) =>
      reorderEtapas({ data: { equipamento_id: equipamentoId, disciplina, items } }),
    onSuccess: invalidate,
    onError: (e: any) => toast.error(e?.message ?? "Falha ao reordenar"),
  });

  const handleAddInline = async (status: EtapaStatus, titulo: string) => {
    const t = titulo.trim();
    if (!t) return;
    const nextOrdem = (roots[roots.length - 1]?.ordem ?? 0) + 1;
    await createMut.mutateAsync({
      equipamento_id: equipamentoId,
      disciplina,
      titulo: t,
      ordem: nextOrdem,
      status,
    });
  };

  const handleAddSubtask = async (parent: EtapaRow) => {
    await createMut.mutateAsync({
      equipamento_id: equipamentoId,
      disciplina,
      titulo: "Nova subtarefa",
      parent_id: parent.id,
    });
    setExpanded((s) => ({ ...s, [parent.id]: true }));
  };

  // Drag handler at parent level — supports cross-group drag (change status).
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor),
  );

  const findGroupOfId = (id: string): EtapaStatus | null => {
    for (const s of ETAPA_STATUS_LIST) {
      if (groups[s].some((r) => r.id === id)) return s;
    }
    // pode ser um droppable de container: id = `group:<status>`
    if (typeof id === "string" && id.startsWith("group:")) {
      const s = id.slice("group:".length) as EtapaStatus;
      if (ETAPA_STATUS_LIST.includes(s)) return s;
    }
    return null;
  };

  const handleDragEnd = (e: DragEndEvent) => {
    const activeId = String(e.active.id);
    const overId = e.over ? String(e.over.id) : null;
    if (!overId || activeId === overId) return;
    const fromGroup = findGroupOfId(activeId);
    const toGroup = findGroupOfId(overId);
    if (!fromGroup || !toGroup) return;

    if (fromGroup === toGroup) {
      // Reordenar dentro do grupo
      const list = groups[fromGroup];
      const oldIndex = list.findIndex((i) => i.id === activeId);
      const newIndex = list.findIndex((i) => i.id === overId);
      if (oldIndex < 0 || newIndex < 0) return;
      const reordered = arrayMove(list, oldIndex, newIndex);
      const payload = reordered.map((r, idx) => ({ id: r.id, ordem: idx + 1 }));
      reorderMut.mutate(payload);
    } else {
      // Mover entre grupos: muda status
      updateMut.mutate({ id: activeId, status: toGroup });
    }
  };

  return (
    <div className="space-y-6">
      <section>
        <div className="mb-2 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold">Etapas · {DISCIPLINA_LABEL[disciplina]}</h3>
            <p className="text-[11px] text-muted-foreground">
              Arraste para reordenar ou solte em outro grupo para mudar o status. Digite abaixo para
              adicionar rapidamente.
            </p>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <span>
              {roots.length} etapas · {groups.concluido.length}/{roots.length} concluídas
            </span>
            {emPlanejamento && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 gap-1 text-[11px]"
                onClick={() => setImportOpen(true)}
              >
                <FileSpreadsheet className="h-3.5 w-3.5" /> Excel
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1 text-[11px]"
              onClick={() => setHistOpen(true)}
              title="Histórico de importações e edições"
            >
              <History className="h-3.5 w-3.5" /> Histórico
            </Button>
          </div>
        </div>
        {!emPlanejamento && statusInfo && (
          <div className="mb-2 rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
            Equipamento em fase <strong>{statusInfo.status}</strong> — edição em bloco por Excel só
            é liberada durante o planejamento. Use os diálogos para editar etapas individualmente.
          </div>
        )}

        {isLoading ? (
          <div className="text-[12px] text-muted-foreground">Carregando etapas…</div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <div className="grid gap-2 md:grid-cols-2">
              {ETAPA_STATUS_ORDEM.map((status) => (
                <StatusGroup
                  key={status}
                  status={status}
                  items={groups[status]}
                  childrenByParent={childrenByParent}
                  expanded={expanded}
                  onToggleExpand={(id) => setExpanded((s) => ({ ...s, [id]: !s[id] }))}
                  onOpen={(row) => setOpenEtapa(row)}
                  onAdd={(titulo) => handleAddInline(status, titulo)}
                  onAddSubtask={handleAddSubtask}
                  onDelete={(id) => deleteMut.mutate(id)}
                  onEditTitleInline={(id, titulo) => updateMut.mutate({ id, titulo })}
                  onChangeStatus={(id, s) => updateMut.mutate({ id, status: s })}
                  editingId={editingId}
                  setEditingId={setEditingId}
                  isManager={isManager}
                />
              ))}
            </div>
          </DndContext>
        )}
      </section>

      <section>
        <BomTable equipamentoId={equipamentoId} equipamentoDisciplina={disciplina} />
      </section>

      {openEtapa && (
        <EtapaSheet etapa={openEtapa} onClose={() => setOpenEtapa(null)} onChanged={invalidate} />
      )}

      <ImportarDisciplinaDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        equipamentoId={equipamentoId}
        disciplina={disciplina}
        onImported={invalidate}
      />

      <HistoricoEquipamentoDrawer
        open={histOpen}
        onOpenChange={setHistOpen}
        equipamentoId={equipamentoId}
      />
    </div>
  );
}

const STATUS_BG: Record<EtapaStatus, string> = {
  em_progresso: "bg-blue-50/60 dark:bg-blue-950/20 border-blue-200/70 dark:border-blue-900/40",
  nao_iniciado: "bg-zinc-50/70 dark:bg-zinc-900/30 border-zinc-200/70 dark:border-zinc-800/60",
  bloqueado: "bg-rose-50/60 dark:bg-rose-950/20 border-rose-200/70 dark:border-rose-900/40",
  concluido:
    "bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200/70 dark:border-emerald-900/40",
};
const STATUS_BAR: Record<EtapaStatus, string> = {
  em_progresso: "before:bg-blue-500",
  nao_iniciado: "before:bg-zinc-400",
  bloqueado: "before:bg-rose-500",
  concluido: "before:bg-emerald-500",
};

function StatusGroup({
  status,
  items,
  childrenByParent,
  expanded,
  onToggleExpand,
  onOpen,
  onAdd,
  onAddSubtask,
  onDelete,
  onEditTitleInline,
  onChangeStatus,
  editingId,
  setEditingId,
  isManager,
}: {
  status: EtapaStatus;
  items: EtapaRow[];
  childrenByParent: Record<string, EtapaRow[]>;
  expanded: Record<string, boolean>;
  onToggleExpand: (id: string) => void;
  onOpen: (row: EtapaRow) => void;
  onAdd: (titulo: string) => void;
  onAddSubtask: (parent: EtapaRow) => void;
  onDelete: (id: string) => void;
  onEditTitleInline: (id: string, titulo: string) => void;
  onChangeStatus: (id: string, status: EtapaStatus) => void;
  editingId: string | null;
  setEditingId: (id: string | null) => void;
  isManager: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `group:${status}` });
  const [collapsed, setCollapsed] = useState(false);
  const [novo, setNovo] = useState("");
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "rounded-md border transition-colors",
        STATUS_BG[status],
        isOver && "ring-2 ring-primary/50",
      )}
    >
      <div className="flex items-center gap-2 border-b border-inherit px-2 py-1.5">
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="text-muted-foreground hover:text-foreground"
          aria-label="Recolher"
        >
          {collapsed ? (
            <ChevronRight className="h-3.5 w-3.5" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" />
          )}
        </button>
        <span className={cn("h-2 w-2 rounded-full", ETAPA_STATUS_DOT[status])} />
        <span className="text-[12px] font-semibold">{ETAPA_STATUS_LABEL[status]}</span>
        <span className="rounded-full bg-background/70 px-1.5 py-0.5 text-[10.5px] font-medium text-muted-foreground">
          {items.length}
        </span>
        <form
          className="ml-auto flex items-center gap-1"
          onSubmit={(e) => {
            e.preventDefault();
            onAdd(novo);
            setNovo("");
          }}
        >
          <Input
            value={novo}
            onChange={(e) => setNovo(e.target.value)}
            placeholder="+ nova etapa"
            className="h-6 w-[140px] border-transparent bg-background/60 text-[11.5px] focus-visible:ring-1"
          />
        </form>
      </div>

      {!collapsed && (
        <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
          <div className="min-h-[24px] divide-y divide-border/40">
            {items.length === 0 && (
              <p className="px-3 py-2 text-[11px] italic text-muted-foreground/70">Sem etapas.</p>
            )}
            {items.map((row) => (
              <SortableEtapa
                key={row.id}
                row={row}
                childrenRows={childrenByParent[row.id] ?? []}
                expanded={!!expanded[row.id]}
                onToggle={() => onToggleExpand(row.id)}
                onOpen={() => onOpen(row)}
                onOpenChild={(c) => onOpen(c)}
                onAddSubtask={() => onAddSubtask(row)}
                onDelete={() => onDelete(row.id)}
                onSaveTitle={(t) => onEditTitleInline(row.id, t)}
                onChangeStatus={(s) => onChangeStatus(row.id, s)}
                onChangeChildStatus={(childId, s) => onChangeStatus(childId, s)}
                isEditing={editingId === row.id}
                setEditing={(v) => setEditingId(v ? row.id : null)}
                isManager={isManager}
              />
            ))}
          </div>
        </SortableContext>
      )}
    </div>
  );
}

function SortableEtapa({
  row,
  childrenRows,
  expanded,
  onToggle,
  onOpen,
  onOpenChild,
  onAddSubtask,
  onDelete,
  onSaveTitle,
  onChangeStatus,
  onChangeChildStatus,
  isEditing,
  setEditing,
  isManager,
}: {
  row: EtapaRow;
  childrenRows: EtapaRow[];
  expanded: boolean;
  onToggle: () => void;
  onOpen: () => void;
  onOpenChild: (c: EtapaRow) => void;
  onAddSubtask: () => void;
  onDelete: () => void;
  onSaveTitle: (t: string) => void;
  onChangeStatus: (s: EtapaStatus) => void;
  onChangeChildStatus: (childId: string, s: EtapaStatus) => void;
  isEditing: boolean;
  setEditing: (v: boolean) => void;
  isManager: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: row.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };
  const [titulo, setTitulo] = useState(row.titulo);

  const dueRed = isDueDatePast(row.data_vencimento) && row.status !== "concluido";
  const hasChildren = childrenRows.length > 0;
  const prioDot: Record<Prioridade, string> = {
    baixa: "bg-zinc-400",
    media: "bg-blue-500",
    alta: "bg-amber-500",
    urgente: "bg-rose-500",
  };

  return (
    <div ref={setNodeRef} style={style} className="group">
      <div className="flex items-center gap-1.5 px-2 py-1 text-[12px] hover:bg-background/60">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab text-muted-foreground/50 opacity-0 group-hover:opacity-100"
          aria-label="Arrastar"
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>

        {hasChildren ? (
          <button
            onClick={onToggle}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Expandir"
          >
            {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          </button>
        ) : (
          <span className="w-3" />
        )}

        <span
          className={cn("h-2 w-2 shrink-0 rounded-full", prioDot[row.prioridade])}
          title={`Prioridade: ${PRIORIDADE_LABEL[row.prioridade]}`}
        />

        {isEditing ? (
          <Input
            autoFocus
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            onBlur={() => {
              setEditing(false);
              if (titulo.trim() && titulo !== row.titulo) onSaveTitle(titulo.trim());
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                setEditing(false);
                if (titulo.trim() && titulo !== row.titulo) onSaveTitle(titulo.trim());
              } else if (e.key === "Escape") {
                setTitulo(row.titulo);
                setEditing(false);
              }
            }}
            className="h-6 flex-1 text-[12px]"
          />
        ) : (
          <button
            onClick={onOpen}
            onDoubleClick={() => setEditing(true)}
            className={cn(
              "flex-1 truncate text-left hover:underline",
              row.status === "concluido" && "text-muted-foreground line-through",
            )}
            title={row.titulo}
          >
            {row.titulo}
          </button>
        )}

        <div className="flex shrink-0 items-center gap-2 text-[10.5px] text-muted-foreground">
          {hasChildren && (
            <span title="Subtarefas concluídas">
              {childrenRows.filter((c) => c.status === "concluido").length}/{childrenRows.length}
            </span>
          )}
          {row.comentarios_count > 0 && (
            <span className="inline-flex items-center gap-0.5">
              <MessageSquare className="h-3 w-3" />
              {row.comentarios_count}
            </span>
          )}
          {row.data_vencimento && (
            <span
              className={cn(
                "inline-flex items-center gap-0.5",
                dueRed && "font-medium text-rose-600",
              )}
              title="Vencimento"
            >
              <CalendarClock className="h-3 w-3" />
              {new Date(row.data_vencimento).toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "2-digit",
              })}
              {dueRed && <AlertTriangle className="h-3 w-3" />}
            </span>
          )}
          {row.responsavel_nome && (
            <span
              className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-muted text-[9px] font-semibold uppercase text-foreground/70"
              title={row.responsavel_nome}
            >
              {row.responsavel_nome.trim().slice(0, 2)}
            </span>
          )}
          <span className="inline-flex w-16 items-center gap-1">
            <Progress value={row.progresso} className="h-1 flex-1" />
            <span className="tabular-nums text-[10px]">{row.progresso}%</span>
          </span>
        </div>

        <div className="flex shrink-0 items-center opacity-0 group-hover:opacity-100">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={onAddSubtask}
            title="Adicionar subtarefa"
          >
            <Plus className="h-3 w-3" />
          </Button>
          {isManager && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground hover:text-rose-600"
              onClick={() => {
                if (confirm(`Excluir "${row.titulo}"?`)) onDelete();
              }}
              title="Excluir"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      {expanded && hasChildren && (
        <div className="border-t border-border/40 bg-background/40 pl-8">
          {childrenRows.map((c) => (
            <div key={c.id} className="flex items-center gap-2 px-2 py-1 text-[11.5px]">
              <span className={cn("h-1.5 w-1.5 rounded-full", ETAPA_STATUS_DOT[c.status])} />
              <button
                onClick={() => onOpenChild(c)}
                className={cn(
                  "flex-1 truncate text-left hover:underline",
                  c.status === "concluido" && "text-muted-foreground line-through",
                )}
              >
                {c.titulo}
              </button>
              <span className="text-[10px] text-muted-foreground">{c.progresso}%</span>
              <Select
                value={c.status}
                onValueChange={(v) => onChangeChildStatus(c.id, v as EtapaStatus)}
              >
                <SelectTrigger className="h-5 w-[110px] text-[10px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ETAPA_STATUS_LIST.map((s) => (
                    <SelectItem key={s} value={s} className="text-[11px]">
                      {ETAPA_STATUS_LABEL[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function EtapaSheet({
  etapa,
  onClose,
  onChanged,
}: {
  etapa: EtapaRow;
  onClose: () => void;
  onChanged: () => void;
}) {
  const qc = useQueryClient();
  const [titulo, setTitulo] = useState(etapa.titulo);
  const [descricao, setDescricao] = useState(etapa.descricao ?? "");
  const [status, setStatus] = useState<EtapaStatus>(etapa.status);
  const [prioridade, setPrioridade] = useState<Prioridade>(etapa.prioridade);
  const [progresso, setProgresso] = useState<number>(etapa.progresso);
  const [dataVenc, setDataVenc] = useState<string>(etapa.data_vencimento ?? "");
  const [responsavelId, setResponsavelId] = useState<string | null>(etapa.responsavel_id);
  const [novoComentario, setNovoComentario] = useState("");

  const dirty =
    titulo !== etapa.titulo ||
    descricao !== (etapa.descricao ?? "") ||
    status !== etapa.status ||
    prioridade !== etapa.prioridade ||
    progresso !== etapa.progresso ||
    dataVenc !== (etapa.data_vencimento ?? "") ||
    responsavelId !== etapa.responsavel_id ||
    novoComentario.trim().length > 0;

  const attemptClose = () => {
    if (confirmDiscard(dirty)) onClose();
  };

  const { data: usuarios = [] } = useQuery({
    queryKey: ["usuarios-etapa"],
    queryFn: () => listUsuariosParaEtapa(),
    staleTime: 60000,
  });

  const { data: comentarios = [], isLoading: loadingCom } = useQuery({
    queryKey: ["etapa-com", etapa.id],
    queryFn: () => listEtapaComentarios({ data: { etapa_id: etapa.id } }),
  });

  const upd = useMutation({
    mutationFn: (p: any) => updateEtapa({ data: p }),
    onSuccess: () => {
      onChanged();
      toast.success("Etapa atualizada.");
    },
    onError: (e: any) => toast.error(e?.message ?? "Falha"),
  });

  const addCom = useMutation({
    mutationFn: (payload: { texto: string; mentions: string[] }) =>
      addEtapaComentario({
        data: { etapa_id: etapa.id, texto: payload.texto, mentions: payload.mentions },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["etapa-com", etapa.id] });
      onChanged();
      setNovoComentario("");
    },
    onError: (e: any) => toast.error(e?.message ?? "Falha ao comentar"),
  });

  // Detecta @menção: procura por @primeiro-nome ou @nome completo entre os usuários carregados
  const parseMentions = (txt: string): string[] => {
    const ids = new Set<string>();
    const usersArr = usuarios as { id: string; full_name: string | null; email: string | null }[];
    const regex = /@([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ0-9._\- ]{1,40})/g;
    let m: RegExpExecArray | null;
    while ((m = regex.exec(txt)) !== null) {
      const raw = m[1].trim().toLowerCase();
      const first = raw.split(" ")[0];
      const u = usersArr.find((u) => {
        const name = (u.full_name ?? u.email ?? "").toLowerCase();
        return name === raw || name.startsWith(raw) || name.split(" ")[0] === first;
      });
      if (u) ids.add(u.id);
    }
    return Array.from(ids);
  };

  const persistBasic = () => {
    const resp = usuarios.find((u: any) => u.id === responsavelId) as any;
    upd.mutate({
      id: etapa.id,
      titulo,
      descricao: descricao || null,
      status,
      prioridade,
      progresso,
      data_vencimento: dataVenc || null,
      responsavel_id: responsavelId,
      responsavel_nome: resp?.full_name ?? resp?.email ?? null,
    });
  };

  const addDaysToVenc = (days: number) => {
    const base = dataVenc ? new Date(dataVenc + "T00:00:00") : new Date();
    base.setDate(base.getDate() + days);
    const iso = base.toISOString().slice(0, 10);
    setDataVenc(iso);
  };

  return (
    <Dialog
      open
      onOpenChange={(o) => {
        if (!o) attemptClose();
      }}
    >
      <DialogContent
        className="z-[70] w-full max-w-md p-5"
        onEscapeKeyDown={(e) => {
          e.preventDefault();
          attemptClose();
        }}
        onPointerDownOutside={(e) => {
          e.preventDefault();
          attemptClose();
        }}
        onInteractOutside={(e) => {
          e.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle className="text-sm">Editar etapa</DialogTitle>
          <DialogDescription className="text-[11px]">
            Alterações são salvas ao clicar em Salvar.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-3 space-y-3">
          <div>
            <label className="text-[11px] text-muted-foreground">Título</label>
            <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} className="h-8" />
          </div>
          <div>
            <label className="text-[11px] text-muted-foreground">Descrição</label>
            <Textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] text-muted-foreground">Status</label>
              <Select value={status} onValueChange={(v) => setStatus(v as EtapaStatus)}>
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ETAPA_STATUS_LIST.map((s) => (
                    <SelectItem key={s} value={s}>
                      {ETAPA_STATUS_LABEL[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-[11px] text-muted-foreground">Prioridade</label>
              <Select value={prioridade} onValueChange={(v) => setPrioridade(v as Prioridade)}>
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORIDADES.map((p) => (
                    <SelectItem key={p} value={p}>
                      {PRIORIDADE_LABEL[p]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-[11px] text-muted-foreground">Progresso (%)</label>
              <Input
                type="number"
                min={0}
                max={100}
                value={progresso}
                onChange={(e) =>
                  setProgresso(Math.max(0, Math.min(100, Number(e.target.value) || 0)))
                }
                className="h-8"
              />
            </div>
            <div>
              <label className="text-[11px] text-muted-foreground">Vencimento</label>
              <Input
                type="date"
                value={dataVenc}
                onChange={(e) => setDataVenc(e.target.value)}
                onClick={(e) => {
                  // Abre calendário nativo quando disponível
                  const el = e.currentTarget as HTMLInputElement & { showPicker?: () => void };
                  el.showPicker?.();
                }}
                className="h-8"
              />
              <div className="mt-1 flex flex-wrap gap-1">
                {[7, 14, 21, 30].map((d) => (
                  <Button
                    key={d}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-6 px-2 text-[10.5px]"
                    onClick={() => addDaysToVenc(d)}
                  >
                    +{d}d
                  </Button>
                ))}
                {dataVenc && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-[10.5px] text-muted-foreground"
                    onClick={() => setDataVenc("")}
                  >
                    limpar
                  </Button>
                )}
              </div>
            </div>
          </div>
          <div>
            <label className="text-[11px] text-muted-foreground">Responsável</label>
            <Select
              value={responsavelId ?? "none"}
              onValueChange={(v) => setResponsavelId(v === "none" ? null : v)}
            >
              <SelectTrigger className="h-8">
                <SelectValue placeholder="—" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— Sem responsável —</SelectItem>
                {(usuarios as any[]).map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.full_name ?? u.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={attemptClose} disabled={upd.isPending}>
              Cancelar
            </Button>
            <Button size="sm" onClick={persistBasic} disabled={upd.isPending || !dirty}>
              Salvar
            </Button>
          </div>
        </div>

        <div className="mt-5 border-t border-border/40 pt-3">
          <h4 className="mb-2 text-[12px] font-semibold">Comentários ({comentarios.length})</h4>
          <div className="max-h-[200px] space-y-2 overflow-y-auto pr-1">
            {loadingCom ? (
              <div className="text-[11px] text-muted-foreground">Carregando…</div>
            ) : (comentarios as any[]).length === 0 ? (
              <div className="text-[11px] text-muted-foreground">Nenhum comentário ainda.</div>
            ) : (
              (comentarios as any[]).map((c) => (
                <div key={c.id} className="rounded border border-border/40 bg-card/50 p-2">
                  <div className="text-[11px] font-medium">{c.autor_nome ?? "Usuário"}</div>
                  <div className="text-[10px] text-muted-foreground">
                    {new Date(c.created_at).toLocaleString("pt-BR")}
                  </div>
                  <div className="mt-1 whitespace-pre-wrap text-[12px]">{c.texto}</div>
                </div>
              ))
            )}
          </div>
          <div className="mt-3 space-y-2">
            <Textarea
              placeholder="Escreva um comentário / feedback… (use @nome para mencionar)"
              value={novoComentario}
              onChange={(e) => setNovoComentario(e.target.value)}
              rows={2}
            />
            {parseMentions(novoComentario).length > 0 && (
              <div className="text-[10px] text-muted-foreground">
                {parseMentions(novoComentario).length} usuário(s) serão notificados via @menção.
              </div>
            )}
            <div className="flex justify-end">
              <Button
                size="sm"
                variant="secondary"
                disabled={!novoComentario.trim() || addCom.isPending}
                onClick={() =>
                  addCom.mutate({
                    texto: novoComentario.trim(),
                    mentions: parseMentions(novoComentario),
                  })
                }
              >
                Comentar
              </Button>
            </div>
          </div>
        </div>
        <EtapaAnexosPanel etapaId={etapa.id} />
      </DialogContent>
    </Dialog>
  );
}
