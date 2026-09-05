import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  getTemplate,
  upsertTemplateItem,
  deleteTemplateItem,
  upsertTemplateTarefa,
  deleteTemplateTarefa,
  upsertTemplateEvento,
  deleteTemplateEvento,
  listTemplateVersoes,
  restaurarVersaoTemplate,
  salvarVersaoTemplate,
  reorderTemplateItens,
  reorderTemplateTarefas,
  reorderTemplateEventos,
  type TemplateRole,
} from "@/lib/processo-templates.functions";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Plus,
  Trash2,
  History,
  Save,
  Undo2,
  GripVertical,
  CheckSquare,
  ListTodo,
  CalendarClock,
  Info,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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
import {
  DndContext,
  closestCenter,
  PointerSensor,
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

function capitalize(s: string) {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatDateTime(iso: string | null | undefined) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return "—";
  }
}

/* ---------------- tag colors ---------------- */

const EVENTO_COLORS: Record<string, string> = {
  marco: "bg-violet-500/15 text-violet-700 border-violet-500/30 dark:text-violet-300",
  reuniao: "bg-sky-500/15 text-sky-700 border-sky-500/30 dark:text-sky-300",
  entrega: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30 dark:text-emerald-300",
  outro: "bg-slate-500/15 text-slate-700 border-slate-500/30 dark:text-slate-300",
  kickoff: "bg-amber-500/15 text-amber-700 border-amber-500/30 dark:text-amber-300",
  fat: "bg-fuchsia-500/15 text-fuchsia-700 border-fuchsia-500/30 dark:text-fuchsia-300",
  embarque: "bg-cyan-500/15 text-cyan-700 border-cyan-500/30 dark:text-cyan-300",
  instalacao: "bg-indigo-500/15 text-indigo-700 border-indigo-500/30 dark:text-indigo-300",
  treinamento: "bg-rose-500/15 text-rose-700 border-rose-500/30 dark:text-rose-300",
};

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-red-500/15 text-red-700 border-red-500/30 dark:text-red-300",
  manager: "bg-blue-500/15 text-blue-700 border-blue-500/30 dark:text-blue-300",
  engineer: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30 dark:text-emerald-300",
  production: "bg-amber-500/15 text-amber-700 border-amber-500/30 dark:text-amber-300",
  purchasing: "bg-violet-500/15 text-violet-700 border-violet-500/30 dark:text-violet-300",
  assembly: "bg-cyan-500/15 text-cyan-700 border-cyan-500/30 dark:text-cyan-300",
  field: "bg-orange-500/15 text-orange-700 border-orange-500/30 dark:text-orange-300",
  sales: "bg-pink-500/15 text-pink-700 border-pink-500/30 dark:text-pink-300",
};

function colorFor(map: Record<string, string>, key: string) {
  return map[key] ?? "bg-slate-500/15 text-slate-700 border-slate-500/30 dark:text-slate-300";
}

function hashColor(text: string) {
  const palette = [
    "bg-blue-500/15 text-blue-700 border-blue-500/30 dark:text-blue-300",
    "bg-emerald-500/15 text-emerald-700 border-emerald-500/30 dark:text-emerald-300",
    "bg-violet-500/15 text-violet-700 border-violet-500/30 dark:text-violet-300",
    "bg-amber-500/15 text-amber-700 border-amber-500/30 dark:text-amber-300",
    "bg-rose-500/15 text-rose-700 border-rose-500/30 dark:text-rose-300",
    "bg-cyan-500/15 text-cyan-700 border-cyan-500/30 dark:text-cyan-300",
    "bg-fuchsia-500/15 text-fuchsia-700 border-fuchsia-500/30 dark:text-fuchsia-300",
    "bg-orange-500/15 text-orange-700 border-orange-500/30 dark:text-orange-300",
  ];
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) >>> 0;
  return palette[h % palette.length];
}

/* ---------------- sortable row ---------------- */

function SortableRow({
  id,
  children,
}: {
  id: string;
  children: (h: { listeners: any; attributes: any }) => React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  return (
    <div ref={setNodeRef} style={style}>
      {children({ listeners, attributes })}
    </div>
  );
}

type Props = {
  templateId: string;
  open: boolean;
  onOpenChange: (o: boolean) => void;
};

const ROLES: TemplateRole[] = [
  "admin",
  "manager",
  "engineer",
  "production",
  "purchasing",
  "assembly",
  "field",
  "sales",
];

export function TemplateEditorDialog({ templateId, open, onOpenChange }: Props) {
  const qc = useQueryClient();
  const getFn = useServerFn(getTemplate);
  const upItem = useServerFn(upsertTemplateItem);
  const delItem = useServerFn(deleteTemplateItem);
  const upTar = useServerFn(upsertTemplateTarefa);
  const delTar = useServerFn(deleteTemplateTarefa);
  const upEvt = useServerFn(upsertTemplateEvento);
  const delEvt = useServerFn(deleteTemplateEvento);
  const listVerFn = useServerFn(listTemplateVersoes);
  const restoreVerFn = useServerFn(restaurarVersaoTemplate);
  const saveVerFn = useServerFn(salvarVersaoTemplate);
  const reorderItensFn = useServerFn(reorderTemplateItens);
  const reorderTarefasFn = useServerFn(reorderTemplateTarefas);
  const reorderEventosFn = useServerFn(reorderTemplateEventos);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const detalheQ = useQuery({
    queryKey: ["template-detalhe", templateId],
    queryFn: () => getFn({ data: { id: templateId } }),
    enabled: open,
  });

  const versoesQ = useQuery({
    queryKey: ["template-versoes", templateId],
    queryFn: () => listVerFn({ data: { template_id: templateId } }),
    enabled: open,
  });

  function invalidate() {
    qc.invalidateQueries({ queryKey: ["template-detalhe", templateId] });
    qc.invalidateQueries({ queryKey: ["template-versoes", templateId] });
    qc.invalidateQueries({ queryKey: ["processo-templates"] });
  }

  const [versaoRestore, setVersaoRestore] = useState<{ id: string; versao: number } | null>(null);
  const [saveVerOpen, setSaveVerOpen] = useState(false);
  const [motivoVer, setMotivoVer] = useState("");

  const restoreVerMut = useMutation({
    mutationFn: (id: string) => restoreVerFn({ data: { versao_id: id } }),
    onSuccess: () => {
      toast.success("Versão restaurada.");
      invalidate();
      setVersaoRestore(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveVerMut = useMutation({
    mutationFn: () => saveVerFn({ data: { template_id: templateId, motivo: motivoVer.trim() } }),
    onSuccess: () => {
      toast.success("Versão salva.");
      setSaveVerOpen(false);
      setMotivoVer("");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // --- Checklist ---
  const [novoItem, setNovoItem] = useState({
    secao: "Geral",
    titulo: "",
    obrigatorio: false,
    requer_arquivo: false,
  });
  const addItem = useMutation({
    mutationFn: () =>
      upItem({
        data: {
          template_id: templateId,
          secao: novoItem.secao.trim() || "Geral",
          titulo: novoItem.titulo.trim(),
          ordem: detalheQ.data?.itens.length ?? 0,
          obrigatorio: novoItem.obrigatorio,
          requer_arquivo: novoItem.requer_arquivo,
          tipos_arquivo_aceitos: novoItem.requer_arquivo ? ["pdf", "jpg", "png", "zip"] : [],
        },
      }),
    onSuccess: () => {
      setNovoItem({ secao: "Geral", titulo: "", obrigatorio: false, requer_arquivo: false });
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const removeItem = useMutation({
    mutationFn: (id: string) => delItem({ data: { id } }),
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });

  // --- Tarefas ---
  const [novaTar, setNovaTar] = useState({ titulo: "", dias: 7, role: "engineer" as TemplateRole });
  const addTar = useMutation({
    mutationFn: () =>
      upTar({
        data: {
          template_id: templateId,
          titulo: novaTar.titulo.trim(),
          ordem: detalheQ.data?.tarefas.length ?? 0,
          dias_apos_inicio: novaTar.dias,
          responsavel_role: novaTar.role,
        },
      }),
    onSuccess: () => {
      setNovaTar({ titulo: "", dias: 7, role: "engineer" });
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const removeTar = useMutation({
    mutationFn: (id: string) => delTar({ data: { id } }),
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });

  // --- Eventos ---
  const [novoEvt, setNovoEvt] = useState({ titulo: "", tipo: "marco" as const, dias: 14 });
  const addEvt = useMutation({
    mutationFn: () =>
      upEvt({
        data: {
          template_id: templateId,
          titulo: novoEvt.titulo.trim(),
          tipo: novoEvt.tipo,
          ordem: detalheQ.data?.eventos.length ?? 0,
          dias_apos_inicio: novoEvt.dias,
        },
      }),
    onSuccess: () => {
      setNovoEvt({ titulo: "", tipo: "marco", dias: 14 });
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const removeEvt = useMutation({
    mutationFn: (id: string) => delEvt({ data: { id } }),
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });

  const reorderItensMut = useMutation({
    mutationFn: (ids: string[]) =>
      reorderItensFn({ data: { template_id: templateId, ordered_ids: ids } }),
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });
  const reorderTarefasMut = useMutation({
    mutationFn: (ids: string[]) =>
      reorderTarefasFn({ data: { template_id: templateId, ordered_ids: ids } }),
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });
  const reorderEventosMut = useMutation({
    mutationFn: (ids: string[]) =>
      reorderEventosFn({ data: { template_id: templateId, ordered_ids: ids } }),
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });

  function handleDragEnd<T extends { id: string }>(
    list: T[],
    event: DragEndEvent,
    run: (ids: string[]) => void,
  ) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = list.findIndex((x) => x.id === active.id);
    const newIndex = list.findIndex((x) => x.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const next = arrayMove(list, oldIndex, newIndex);
    run(next.map((x) => x.id));
  }

  const d = detalheQ.data;

  return (
    <TooltipProvider delayDuration={200}>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl p-0 overflow-hidden">
          <div className="bg-gradient-to-br from-[var(--accent)]/10 via-transparent to-transparent px-6 pt-6 pb-4 border-b border-[var(--bg-border)]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-lg">
                {d?.template.nome ?? "Carregando…"}{" "}
                {d && (
                  <Badge
                    className={`ml-1 border ${colorFor({ projeto: "bg-blue-500/15 text-blue-700 border-blue-500/30 dark:text-blue-300", atendimento: "bg-amber-500/15 text-amber-700 border-amber-500/30 dark:text-amber-300", instalacao: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30 dark:text-emerald-300" }, d.template.tipo)}`}
                  >
                    {d.template.tipo}
                  </Badge>
                )}
              </DialogTitle>
              {d && (
                <div className="flex flex-wrap items-center gap-4 pt-2 text-[11.5px] text-[var(--text-muted)]">
                  <span>
                    Criado por{" "}
                    <strong className="text-[var(--text-secondary)]">
                      {d.template.created_by_nome ?? "—"}
                    </strong>{" "}
                    em {formatDateTime(d.template.created_at)}
                  </span>
                  <span>
                    Última edição por{" "}
                    <strong className="text-[var(--text-secondary)]">
                      {d.template.updated_by_nome ?? "—"}
                    </strong>{" "}
                    em {formatDateTime(d.template.updated_at)}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="ml-auto h-7 text-[11.5px]"
                    onClick={() => setSaveVerOpen(true)}
                  >
                    <Save className="mr-1 h-3.5 w-3.5" /> Salvar versão
                  </Button>
                </div>
              )}
            </DialogHeader>
          </div>

          <div className="px-6 pb-6 pt-3">
            {detalheQ.isLoading && (
              <div className="py-8 text-center text-[var(--text-muted)]">
                <Loader2 className="inline h-4 w-4 animate-spin" /> Carregando…
              </div>
            )}

            {d && (
              <Tabs defaultValue="checklist">
                <TabsList className="mb-3">
                  <TabsTrigger value="checklist" className="gap-1.5">
                    <CheckSquare className="h-3.5 w-3.5" /> Checklist
                    <span className="ml-1 rounded-full bg-[var(--bg-elevated)] px-1.5 text-[10.5px]">
                      {d.itens.length}
                    </span>
                  </TabsTrigger>
                  <TabsTrigger value="tarefas" className="gap-1.5">
                    <ListTodo className="h-3.5 w-3.5" /> Tarefas
                    <span className="ml-1 rounded-full bg-[var(--bg-elevated)] px-1.5 text-[10.5px]">
                      {d.tarefas.length}
                    </span>
                  </TabsTrigger>
                  <TabsTrigger value="eventos" className="gap-1.5">
                    <CalendarClock className="h-3.5 w-3.5" /> Eventos
                    <span className="ml-1 rounded-full bg-[var(--bg-elevated)] px-1.5 text-[10.5px]">
                      {d.eventos.length}
                    </span>
                  </TabsTrigger>
                  <TabsTrigger value="historico" className="gap-1.5">
                    <History className="h-3.5 w-3.5" /> Histórico
                    <span className="ml-1 rounded-full bg-[var(--bg-elevated)] px-1.5 text-[10.5px]">
                      {versoesQ.data?.length ?? 0}
                    </span>
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="checklist" className="space-y-3">
                  <div className="flex items-center gap-2 text-[12px] text-[var(--text-muted)]">
                    <Info className="h-3.5 w-3.5" />
                    Itens de verificação que devem ser conferidos. Arraste para reordenar.
                  </div>
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={(e) =>
                      handleDragEnd(d.itens, e, (ids) => reorderItensMut.mutate(ids))
                    }
                  >
                    <SortableContext
                      items={d.itens.map((i) => i.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-1.5 max-h-[400px] overflow-auto pr-1">
                        {d.itens.map((i) => (
                          <SortableRow key={i.id} id={i.id}>
                            {({ listeners, attributes }) => (
                              <div className="group flex items-center gap-2 rounded-lg border border-[var(--bg-border)] bg-[var(--bg-surface)] p-2 text-[13px] transition hover:border-[var(--accent)]/40 hover:shadow-sm">
                                <button
                                  {...attributes}
                                  {...listeners}
                                  className="cursor-grab touch-none text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                                  aria-label="Arrastar"
                                >
                                  <GripVertical className="h-4 w-4" />
                                </button>
                                <Badge className={`border ${hashColor(i.secao)}`}>{i.secao}</Badge>
                                <span className="flex-1">{i.titulo}</span>
                                {i.obrigatorio && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Badge className="border bg-red-500/15 text-red-700 border-red-500/30 dark:text-red-300">
                                        obrig.
                                      </Badge>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      Item de preenchimento obrigatório.
                                    </TooltipContent>
                                  </Tooltip>
                                )}
                                {i.requer_arquivo && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Badge className="border bg-indigo-500/15 text-indigo-700 border-indigo-500/30 dark:text-indigo-300">
                                        arquivo
                                      </Badge>
                                    </TooltipTrigger>
                                    <TooltipContent>Exige upload de arquivo.</TooltipContent>
                                  </Tooltip>
                                )}
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => removeItem.mutate(i.id)}
                                >
                                  <Trash2 className="h-3.5 w-3.5 text-[var(--danger)]" />
                                </Button>
                              </div>
                            )}
                          </SortableRow>
                        ))}
                        {d.itens.length === 0 && (
                          <p className="text-center text-[12px] text-[var(--text-muted)] py-6">
                            Sem itens. Adicione o primeiro abaixo.
                          </p>
                        )}
                      </div>
                    </SortableContext>
                  </DndContext>
                  <div className="grid grid-cols-12 gap-2 border-t border-[var(--bg-border)] pt-3">
                    <Input
                      className="col-span-3"
                      placeholder="Seção"
                      value={novoItem.secao}
                      onChange={(e) =>
                        setNovoItem((s) => ({ ...s, secao: capitalize(e.target.value) }))
                      }
                    />
                    <Input
                      className="col-span-5"
                      placeholder="Título do item"
                      value={novoItem.titulo}
                      onChange={(e) =>
                        setNovoItem((s) => ({ ...s, titulo: capitalize(e.target.value) }))
                      }
                    />
                    <label className="col-span-2 flex items-center gap-1.5 text-[12px]">
                      <Switch
                        checked={novoItem.obrigatorio}
                        onCheckedChange={(v) => setNovoItem((s) => ({ ...s, obrigatorio: v }))}
                      />{" "}
                      obrig.
                    </label>
                    <label className="col-span-1 flex items-center gap-1.5 text-[12px]">
                      <Switch
                        checked={novoItem.requer_arquivo}
                        onCheckedChange={(v) => setNovoItem((s) => ({ ...s, requer_arquivo: v }))}
                      />{" "}
                      arq.
                    </label>
                    <Button
                      className="col-span-1"
                      onClick={() => addItem.mutate()}
                      disabled={!novoItem.titulo.trim() || addItem.isPending}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="tarefas" className="space-y-3">
                  <div className="flex items-center gap-2 text-[12px] text-[var(--text-muted)]">
                    <Info className="h-3.5 w-3.5" />
                    Tarefas geradas automaticamente quando o template é aplicado a um processo, com
                    prazo calculado a partir da data de início.
                  </div>
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={(e) =>
                      handleDragEnd(d.tarefas, e, (ids) => reorderTarefasMut.mutate(ids))
                    }
                  >
                    <SortableContext
                      items={d.tarefas.map((t) => t.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-1.5 max-h-[400px] overflow-auto pr-1">
                        {d.tarefas.map((t) => (
                          <SortableRow key={t.id} id={t.id}>
                            {({ listeners, attributes }) => (
                              <div className="group flex items-center gap-2 rounded-lg border border-[var(--bg-border)] bg-[var(--bg-surface)] p-2 text-[13px] transition hover:border-[var(--accent)]/40 hover:shadow-sm">
                                <button
                                  {...attributes}
                                  {...listeners}
                                  className="cursor-grab touch-none text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                                  aria-label="Arrastar"
                                >
                                  <GripVertical className="h-4 w-4" />
                                </button>
                                <span className="flex-1">{t.titulo}</span>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Badge className="border bg-slate-500/15 text-slate-700 border-slate-500/30 dark:text-slate-300">
                                      D+{t.dias_apos_inicio}
                                    </Badge>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    Dias após o início do processo em que a tarefa vence.
                                  </TooltipContent>
                                </Tooltip>
                                {t.responsavel_role && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Badge
                                        className={`border ${colorFor(ROLE_COLORS, t.responsavel_role)}`}
                                      >
                                        {t.responsavel_role}
                                      </Badge>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      Perfil responsável por executar a tarefa.
                                    </TooltipContent>
                                  </Tooltip>
                                )}
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => removeTar.mutate(t.id)}
                                >
                                  <Trash2 className="h-3.5 w-3.5 text-[var(--danger)]" />
                                </Button>
                              </div>
                            )}
                          </SortableRow>
                        ))}
                        {d.tarefas.length === 0 && (
                          <p className="text-center text-[12px] text-[var(--text-muted)] py-6">
                            Sem tarefas.
                          </p>
                        )}
                      </div>
                    </SortableContext>
                  </DndContext>
                  <div className="grid grid-cols-12 gap-2 border-t border-[var(--bg-border)] pt-3">
                    <Input
                      className="col-span-6"
                      placeholder="Título da tarefa"
                      value={novaTar.titulo}
                      onChange={(e) =>
                        setNovaTar((s) => ({ ...s, titulo: capitalize(e.target.value) }))
                      }
                    />
                    <div className="col-span-2">
                      <Input
                        type="number"
                        placeholder="Dias"
                        value={novaTar.dias}
                        onChange={(e) =>
                          setNovaTar((s) => ({ ...s, dias: Number(e.target.value) || 0 }))
                        }
                      />
                    </div>
                    <Select
                      value={novaTar.role}
                      onValueChange={(v) => setNovaTar((s) => ({ ...s, role: v as TemplateRole }))}
                    >
                      <SelectTrigger className="col-span-3">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ROLES.map((r) => (
                          <SelectItem key={r} value={r}>
                            {r}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      className="col-span-1"
                      onClick={() => addTar.mutate()}
                      disabled={!novaTar.titulo.trim() || addTar.isPending}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="eventos" className="space-y-3">
                  <div className="flex items-center gap-2 text-[12px] text-[var(--text-muted)]">
                    <Info className="h-3.5 w-3.5" />
                    Marcos da timeline do processo (kickoff, FAT, embarque, etc.) com data calculada
                    a partir do início.
                  </div>
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={(ev) =>
                      handleDragEnd(d.eventos, ev, (ids) => reorderEventosMut.mutate(ids))
                    }
                  >
                    <SortableContext
                      items={d.eventos.map((x) => x.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-1.5 max-h-[400px] overflow-auto pr-1">
                        {d.eventos.map((e) => (
                          <SortableRow key={e.id} id={e.id}>
                            {({ listeners, attributes }) => (
                              <div className="group flex items-center gap-2 rounded-lg border border-[var(--bg-border)] bg-[var(--bg-surface)] p-2 text-[13px] transition hover:border-[var(--accent)]/40 hover:shadow-sm">
                                <button
                                  {...attributes}
                                  {...listeners}
                                  className="cursor-grab touch-none text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                                  aria-label="Arrastar"
                                >
                                  <GripVertical className="h-4 w-4" />
                                </button>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Badge className={`border ${colorFor(EVENTO_COLORS, e.tipo)}`}>
                                      {e.tipo}
                                    </Badge>
                                  </TooltipTrigger>
                                  <TooltipContent>Tipo do evento na timeline.</TooltipContent>
                                </Tooltip>
                                <span className="flex-1">{e.titulo}</span>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Badge className="border bg-slate-500/15 text-slate-700 border-slate-500/30 dark:text-slate-300">
                                      D+{e.dias_apos_inicio}
                                    </Badge>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    Dias após o início do processo em que o evento acontece.
                                  </TooltipContent>
                                </Tooltip>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => removeEvt.mutate(e.id)}
                                >
                                  <Trash2 className="h-3.5 w-3.5 text-[var(--danger)]" />
                                </Button>
                              </div>
                            )}
                          </SortableRow>
                        ))}
                        {d.eventos.length === 0 && (
                          <p className="text-center text-[12px] text-[var(--text-muted)] py-6">
                            Sem eventos.
                          </p>
                        )}
                      </div>
                    </SortableContext>
                  </DndContext>
                  <div className="grid grid-cols-12 gap-2 border-t border-[var(--bg-border)] pt-3">
                    <Input
                      className="col-span-6"
                      placeholder="Título do evento"
                      value={novoEvt.titulo}
                      onChange={(e) =>
                        setNovoEvt((s) => ({ ...s, titulo: capitalize(e.target.value) }))
                      }
                    />
                    <Select
                      value={novoEvt.tipo}
                      onValueChange={(v) =>
                        setNovoEvt((s) => ({ ...s, tipo: v as typeof novoEvt.tipo }))
                      }
                    >
                      <SelectTrigger className="col-span-3">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="marco">Marco</SelectItem>
                        <SelectItem value="reuniao">Reunião</SelectItem>
                        <SelectItem value="entrega">Entrega</SelectItem>
                        <SelectItem value="outro">Outro</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      className="col-span-2"
                      type="number"
                      placeholder="Dias"
                      value={novoEvt.dias}
                      onChange={(e) =>
                        setNovoEvt((s) => ({ ...s, dias: Number(e.target.value) || 0 }))
                      }
                    />
                    <Button
                      className="col-span-1"
                      onClick={() => addEvt.mutate()}
                      disabled={!novoEvt.titulo.trim() || addEvt.isPending}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="historico" className="space-y-2">
                  {versoesQ.isLoading && (
                    <p className="text-center text-[12px] text-[var(--text-muted)] py-4">
                      <Loader2 className="inline h-3.5 w-3.5 animate-spin" /> Carregando histórico…
                    </p>
                  )}
                  {!versoesQ.isLoading && (versoesQ.data ?? []).length === 0 && (
                    <p className="text-center text-[12px] text-[var(--text-muted)] py-4">
                      Sem versões salvas ainda. Toda alteração no template gera uma versão
                      automaticamente.
                    </p>
                  )}
                  <div className="max-h-[400px] space-y-1.5 overflow-auto">
                    {(versoesQ.data ?? []).map((v) => (
                      <div
                        key={v.id}
                        className="flex items-center gap-3 rounded border border-[var(--bg-border)] p-2.5 text-[12.5px]"
                      >
                        <Badge variant="outline" className="text-[11px]">
                          v{v.versao}
                        </Badge>
                        <div className="flex-1">
                          <div className="text-[var(--text-primary)]">
                            {v.motivo ?? "(sem motivo)"}
                          </div>
                          <div className="text-[11px] text-[var(--text-muted)]">
                            {v.created_by_nome ?? "—"} • {formatDateTime(v.created_at)}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setVersaoRestore({ id: v.id, versao: v.versao })}
                        >
                          <Undo2 className="mr-1 h-3.5 w-3.5" /> Restaurar
                        </Button>
                      </div>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            )}
          </div>

          {/* Salvar versão manual */}
          <Dialog open={saveVerOpen} onOpenChange={setSaveVerOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Salvar versão</DialogTitle>
              </DialogHeader>
              <div className="space-y-2">
                <Label>Motivo / nota</Label>
                <Input
                  value={motivoVer}
                  onChange={(e) => setMotivoVer(capitalize(e.target.value))}
                  placeholder="Ex.: Antes da revisão de outubro"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setSaveVerOpen(false)}>
                  Cancelar
                </Button>
                <Button
                  onClick={() => saveVerMut.mutate()}
                  disabled={!motivoVer.trim() || saveVerMut.isPending}
                >
                  {saveVerMut.isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />} Salvar
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Confirm restore version */}
          <AlertDialog open={!!versaoRestore} onOpenChange={(o) => !o && setVersaoRestore(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Restaurar versão #{versaoRestore?.versao}?</AlertDialogTitle>
                <AlertDialogDescription>
                  O conteúdo atual do template será substituído pelo desta versão. Uma nova versão
                  com o estado atual é salva automaticamente antes da restauração.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => versaoRestore && restoreVerMut.mutate(versaoRestore.id)}
                >
                  Restaurar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
