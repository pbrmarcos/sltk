/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import { toast } from "sonner";
import {
  ArrowLeft, Plus, GripVertical, Trash2, Pencil, Sparkles, ChevronsUpDown, History,
  MessageSquareText, ListChecks, TextCursorInput, Hash, Globe2, ChevronsRight,
} from "lucide-react";
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, useSortable, verticalListSortingStrategy, arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  getSegmentoAdmin, upsertPergunta, excluirPergunta, reordenarPerguntas,
  upsertOpcao, excluirOpcao, reordenarOpcoes, traduzirTexto, historicoSegmento,
  type PerguntaAdminRow, type OpcaoAdminRow,
} from "@/lib/entrevistas-admin.functions";
import { groupContactMatrix } from "@/lib/entrevistas-shared";

import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/admin/entrevistas/$segmentoId")({
  component: AdminEntrevistaEditor,
  head: () => ({
    meta: [
      { title: "Editar segmento — Admin Entrevistas | SLTK" },
      { name: "description", content: "Adicione, edite, reordene e traduza perguntas de um segmento de entrevista." },
    ],
  }),
});

const FORMATOS = [
  { v: "single_choice", label: "Escolha única", icon: ListChecks },
  { v: "multi_choice", label: "Múltipla escolha", icon: ListChecks },
  { v: "text", label: "Texto curto", icon: TextCursorInput },
  { v: "textarea", label: "Texto longo", icon: TextCursorInput },
  { v: "number", label: "Número", icon: Hash },
  { v: "country", label: "País", icon: Globe2 },
] as const;

function AdminEntrevistaEditor() {
  const { segmentoId } = Route.useParams();
  const { role } = useAuth();
  const canManage = role === "admin" || role === "manager";
  const qc = useQueryClient();

  const getFn = useServerFn(getSegmentoAdmin);
  const upPergFn = useServerFn(upsertPergunta);
  const delPergFn = useServerFn(excluirPergunta);
  const reordPergFn = useServerFn(reordenarPerguntas);

  const upOpFn = useServerFn(upsertOpcao);
  const delOpFn = useServerFn(excluirOpcao);
  const reordOpFn = useServerFn(reordenarOpcoes);
  const trFn = useServerFn(traduzirTexto);
  const histFn = useServerFn(historicoSegmento);

  const dados = useQuery({
    queryKey: ["admin-entrev-seg", segmentoId],
    queryFn: () => getFn({ data: { segmento_id: segmentoId } }),
    enabled: canManage,
  });
  const hist = useQuery({
    queryKey: ["admin-entrev-hist", segmentoId],
    queryFn: () => histFn({ data: { segmento_id: segmentoId } }),
    enabled: canManage,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["admin-entrev-seg", segmentoId] });
    qc.invalidateQueries({ queryKey: ["admin-entrev-hist", segmentoId] });
    qc.invalidateQueries({ queryKey: ["admin-entrev-segs"] });
  };

  const [editing, setEditing] = useState<Partial<PerguntaAdminRow> | null>(null);
  const [editOpcao, setEditOpcao] = useState<{ perguntaId: string; opcao: Partial<OpcaoAdminRow> | null } | null>(null);
  const [confirmDel, setConfirmDel] = useState<PerguntaAdminRow | null>(null);
  const [previewLang, setPreviewLang] = useState<"pt" | "es" | "en">("pt");

  const salvarPerg = useMutation({
    mutationFn: (payload: any) => upPergFn({ data: payload }),
    onSuccess: () => { toast.success("Pergunta salva."); setEditing(null); invalidate(); },
    onError: (e: any) => toast.error(e?.message ?? "Falha ao salvar."),
  });
  const excluirPerg = useMutation({
    mutationFn: (id: string) => delPergFn({ data: { id } }),
    onSuccess: () => { toast.success("Pergunta removida."); setConfirmDel(null); invalidate(); },
    onError: (e: any) => toast.error(e?.message ?? "Falha ao excluir."),
  });
  const reordPerg = useMutation({
    mutationFn: (ordem: string[]) => reordPergFn({ data: { segmento_id: segmentoId, ordem } }),
    onSuccess: () => invalidate(),
    onError: (e: any) => toast.error(e?.message ?? "Falha ao reordenar."),
  });

  const salvarOp = useMutation({
    mutationFn: (payload: any) => upOpFn({ data: payload }),
    onSuccess: () => { toast.success("Opção salva."); setEditOpcao(null); invalidate(); },
    onError: (e: any) => toast.error(e?.message ?? "Falha ao salvar opção."),
  });
  const excluirOp = useMutation({
    mutationFn: (id: string) => delOpFn({ data: { id } }),
    onSuccess: () => { toast.success("Opção removida."); invalidate(); },
    onError: (e: any) => toast.error(e?.message ?? "Falha ao excluir opção."),
  });
  const reordOp = useMutation({
    mutationFn: (v: { perguntaId: string; ordem: string[] }) => reordOpFn({ data: { pergunta_id: v.perguntaId, ordem: v.ordem } }),
    onSuccess: () => invalidate(),
    onError: (e: any) => toast.error(e?.message ?? "Falha ao reordenar."),
  });

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  if (!canManage) {
    return (
      <PageContainer>
        <PageHeader breadcrumbs={[{ label: "Administração", href: "/admin/configuracoes" }, { label: "Entrevistas" }]} title="Formulário de Entrevista" />
        <Card className="mt-6"><CardContent className="py-12 text-center text-muted-foreground">Acesso restrito a admin e manager.</CardContent></Card>
      </PageContainer>
    );
  }

  const seg = dados.data?.segmento;
  const perguntas = dados.data?.perguntas ?? [];

  const onDragPerg = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = perguntas.findIndex((p) => p.id === active.id);
    const newIdx = perguntas.findIndex((p) => p.id === over.id);
    if (oldIdx < 0 || newIdx < 0) return;
    const nova = arrayMove(perguntas, oldIdx, newIdx).map((p) => p.id);
    qc.setQueryData(["admin-entrev-seg", segmentoId], (prev: any) => ({
      ...prev, perguntas: arrayMove(prev.perguntas, oldIdx, newIdx),
    }));
    reordPerg.mutate(nova);
  };

  return (
    <PageContainer>
      <PageHeader
        breadcrumbs={[
          { label: "Administração", href: "/admin/configuracoes" },
          { label: "Entrevistas", href: "/admin/entrevistas" },
          { label: seg?.nome_pt ?? "…" },
        ]}
        title={seg?.nome_pt ?? "Carregando…"}
        subtitle="Reordene por arraste, edite os enunciados, ative/desative obrigatoriedade e traduza para ES/EN."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" asChild><Link to="/admin/entrevistas"><ArrowLeft className="h-4 w-4 mr-2" /> Voltar</Link></Button>
            <Button onClick={() => setEditing({ segmento_id: segmentoId, formato: "single_choice", obrigatoria: true, enunciado_pt: "", enunciado_es: "", enunciado_en: "" })}>
              <Plus className="h-4 w-4 mr-2" /> Nova pergunta
            </Button>
          </div>
        }
      />

      <Tabs defaultValue="perguntas" className="mt-4">
        <TabsList>
          <TabsTrigger value="perguntas"><MessageSquareText className="h-3.5 w-3.5 mr-1.5" /> Perguntas</TabsTrigger>
          <TabsTrigger value="preview"><ChevronsRight className="h-3.5 w-3.5 mr-1.5" /> Prévia</TabsTrigger>
          <TabsTrigger value="historico"><History className="h-3.5 w-3.5 mr-1.5" /> Histórico</TabsTrigger>
        </TabsList>

        <TabsContent value="perguntas" className="mt-4 space-y-3">
          {dados.isLoading ? (
            <div className="text-sm text-muted-foreground">Carregando…</div>
          ) : perguntas.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">Nenhuma pergunta ainda. Clique em "Nova pergunta".</CardContent></Card>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragPerg}>
              <SortableContext items={perguntas.map((p) => p.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                  {perguntas.map((p, idx) => (
                    <PerguntaCard
                      key={p.id}
                      pergunta={p}
                      indice={idx + 1}
                      onEdit={() => setEditing(p)}
                      onDelete={() => setConfirmDel(p)}
                      onAddOpcao={() => setEditOpcao({ perguntaId: p.id, opcao: null })}
                      onEditOpcao={(op) => setEditOpcao({ perguntaId: p.id, opcao: op })}
                      onDeleteOpcao={(id) => excluirOp.mutate(id)}
                      onReorderOpcoes={(ordem) => reordOp.mutate({ perguntaId: p.id, ordem })}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </TabsContent>

        <TabsContent value="preview" className="mt-4">
          <div className="mb-3 flex gap-1">
            {(["pt","es","en"] as const).map((l) => (
              <Button key={l} size="sm" variant={previewLang === l ? "default" : "outline"} onClick={() => setPreviewLang(l)}>
                {l.toUpperCase()}
              </Button>
            ))}
          </div>
          <Card><CardContent className="p-6 space-y-6">
            {perguntas.map((p, idx) => (
              <div key={p.id} className="space-y-2">
                <div className="text-xs text-muted-foreground">Pergunta {idx + 1} · {formatoLabel(p.formato)} {p.obrigatoria ? "· obrigatória" : ""}</div>
                <div className="font-medium">{pickLang(p, previewLang)}</div>
                {(p.formato === "single_choice" || p.formato === "multi_choice") && (() => {
                  const matrix = p.formato === "multi_choice" ? groupContactMatrix(p.opcoes) : null;
                  if (matrix) {
                    return (
                      <div className="border rounded-md overflow-hidden text-sm">
                        <div className="grid bg-slate-50 text-xs font-medium text-muted-foreground px-3 py-2"
                             style={{ gridTemplateColumns: "1.2fr 1.4fr 1.6fr 1.2fr" }}>
                          <div>Responsável</div>
                          <div>Nome</div>
                          <div>E-mail</div>
                          <div>WhatsApp</div>
                        </div>
                        {matrix.map((g) => (
                          <div key={g.role.id} className="grid px-3 py-2 border-t items-center"
                               style={{ gridTemplateColumns: "1.2fr 1.4fr 1.6fr 1.2fr" }}>
                            <div className="font-medium">{pickOpLang(g.role, previewLang)}</div>
                            <div className="text-muted-foreground italic">[nome]</div>
                            <div className="text-muted-foreground italic">[e-mail]</div>
                            <div className="text-muted-foreground italic">[whatsapp]</div>
                          </div>
                        ))}
                      </div>
                    );
                  }
                  return (
                    <ul className="text-sm space-y-1 pl-4 list-disc marker:text-muted-foreground">
                      {p.opcoes.map((o) => (
                        <li key={o.id}>{pickOpLang(o, previewLang)}{o.tem_descricao && <span className="text-xs text-muted-foreground"> (com "Descreva")</span>}</li>
                      ))}
                    </ul>
                  );
                })()}

                {(p.formato === "text" || p.formato === "textarea") && (
                  <div className="text-xs text-muted-foreground italic">[campo de {p.formato === "textarea" ? "texto longo" : "texto curto"}]</div>
                )}
                {p.formato === "number" && <div className="text-xs text-muted-foreground italic">[campo numérico]</div>}
                {p.formato === "country" && <div className="text-xs text-muted-foreground italic">[seletor de país]</div>}
              </div>
            ))}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="historico" className="mt-4">
          <Card><CardContent className="p-0">
            {hist.isLoading ? (
              <div className="p-6 text-sm text-muted-foreground">Carregando…</div>
            ) : (hist.data ?? []).length === 0 ? (
              <div className="p-6 text-sm text-muted-foreground">Sem alterações registradas.</div>
            ) : (
              <ul className="divide-y">
                {hist.data!.map((h: any) => (
                  <li key={h.id} className="p-3 text-sm flex items-start gap-3">
                    <Badge variant="outline" className="uppercase text-[10px]">{h.action}</Badge>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-muted-foreground">
                        {h.entity_type} · {new Date(h.created_at).toLocaleString("pt-BR")} · {h.actor_email ?? "—"}
                      </div>
                      <div className="truncate">
                        {h.after?.enunciado_pt || h.after?.label_pt || h.before?.enunciado_pt || h.before?.label_pt || "—"}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent></Card>
        </TabsContent>
      </Tabs>

      {/* Dialog Pergunta */}
      <Dialog open={!!editing} onOpenChange={(o) => { if (!o) setEditing(null); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Editar pergunta" : "Nova pergunta"}</DialogTitle>
            <DialogDescription>Enunciados em três idiomas. Use "Traduzir" para preencher ES/EN a partir do português.</DialogDescription>
          </DialogHeader>
          {editing && (
            <PerguntaForm
              initial={editing}
              onCancel={() => setEditing(null)}
              onSubmit={(v) => salvarPerg.mutate(v)}
              pending={salvarPerg.isPending}
              onTraduzir={async (texto, para) => {
                const r = await trFn({ data: { texto, para } });
                return r.texto;
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog Opção */}
      <Dialog open={!!editOpcao} onOpenChange={(o) => { if (!o) setEditOpcao(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editOpcao?.opcao?.id ? "Editar opção" : "Nova opção"}</DialogTitle>
          </DialogHeader>
          {editOpcao && (
            <OpcaoForm
              initial={editOpcao.opcao ?? { pergunta_id: editOpcao.perguntaId, label_pt: "", tem_descricao: false }}
              onCancel={() => setEditOpcao(null)}
              onSubmit={(v) => salvarOp.mutate({ ...v, pergunta_id: editOpcao.perguntaId })}
              pending={salvarOp.isPending}
              onTraduzir={async (texto, para) => {
                const r = await trFn({ data: { texto, para } });
                return r.texto;
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Confirmação de exclusão */}
      <Dialog open={!!confirmDel} onOpenChange={(o) => { if (!o) setConfirmDel(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir pergunta</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir <strong>{confirmDel?.enunciado_pt}</strong>?
              {(confirmDel?.respostas_count ?? 0) > 0 && (
                <span className="block mt-2 text-rose-700">Esta pergunta tem {confirmDel!.respostas_count} respostas — só admin pode excluir.</span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDel(null)}>Cancelar</Button>
            <Button variant="destructive" disabled={excluirPerg.isPending} onClick={() => confirmDel && excluirPerg.mutate(confirmDel.id)}>
              {excluirPerg.isPending ? "Excluindo…" : "Excluir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}

function pickLang(p: PerguntaAdminRow, l: "pt" | "es" | "en") {
  return (l === "es" ? p.enunciado_es : l === "en" ? p.enunciado_en : p.enunciado_pt) || p.enunciado_pt;
}
function pickOpLang(o: OpcaoAdminRow, l: "pt" | "es" | "en") {
  return (l === "es" ? o.label_es : l === "en" ? o.label_en : o.label_pt) || o.label_pt;
}
function formatoLabel(f: string) {
  return FORMATOS.find((x) => x.v === f)?.label ?? f;
}

function PerguntaCard(props: {
  pergunta: PerguntaAdminRow;
  indice: number;
  onEdit: () => void;
  onDelete: () => void;
  onAddOpcao: () => void;
  onEditOpcao: (o: OpcaoAdminRow) => void;
  onDeleteOpcao: (id: string) => void;
  onReorderOpcoes: (ordem: string[]) => void;
}) {
  const { pergunta: p, indice } = props;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: p.id });
  const style = { transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 20 : undefined };
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const suportaOpcoes = p.formato === "single_choice" || p.formato === "multi_choice";

  const onDragOp = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const ids = p.opcoes.map((o) => o.id);
    const oldIdx = ids.indexOf(String(active.id));
    const newIdx = ids.indexOf(String(over.id));
    if (oldIdx < 0 || newIdx < 0) return;
    props.onReorderOpcoes(arrayMove(ids, oldIdx, newIdx));
  };

  return (
    <div ref={setNodeRef} style={style}>
      <Accordion type="single" collapsible>
        <AccordionItem value={p.id} className="border rounded-md bg-card">
          <div className="flex items-start gap-2 p-3">
            <button className="mt-1 text-muted-foreground cursor-grab active:cursor-grabbing" {...attributes} {...listeners} aria-label="Arrastar">
              <GripVertical className="h-4 w-4" />
            </button>
            <div className="flex-1 min-w-0">
              <div className="text-[11px] text-muted-foreground flex items-center gap-2">
                <span>#{indice}</span>
                <Badge variant="outline" className="uppercase text-[10px]">{formatoLabel(p.formato)}</Badge>
                {p.obrigatoria && <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200 text-[10px]">obrigatória</Badge>}
                {p.respostas_count > 0 && <span>· {p.respostas_count} resposta{p.respostas_count === 1 ? "" : "s"}</span>}
              </div>
              <div className="font-medium leading-snug">{p.enunciado_pt}</div>
              <div className="text-xs text-muted-foreground truncate">
                ES: {p.enunciado_es || "—"} · EN: {p.enunciado_en || "—"}
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={props.onEdit} title="Editar"><Pencil className="h-4 w-4" /></Button>
              <Button size="icon" variant="ghost" className="h-7 w-7 text-rose-700" onClick={props.onDelete} title="Excluir"><Trash2 className="h-4 w-4" /></Button>
              {suportaOpcoes && (
                <AccordionTrigger className="p-1.5 hover:bg-muted rounded-md" aria-label="Ver opções">
                  <ChevronsUpDown className="h-4 w-4" />
                </AccordionTrigger>
              )}
            </div>
          </div>
          {suportaOpcoes && (
            <AccordionContent className="border-t p-3 bg-muted/30">
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs font-medium text-muted-foreground">Opções ({p.opcoes.length})</div>
                <Button size="sm" variant="outline" onClick={props.onAddOpcao}><Plus className="h-3 w-3 mr-1" /> Adicionar opção</Button>
              </div>
              {p.opcoes.length === 0 ? (
                <div className="text-xs text-muted-foreground italic">Nenhuma opção ainda.</div>
              ) : (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragOp}>
                  <SortableContext items={p.opcoes.map((o) => o.id)} strategy={verticalListSortingStrategy}>
                    <ul className="space-y-1">
                      {p.opcoes.map((o) => (
                        <OpcaoRow key={o.id} opcao={o} onEdit={() => props.onEditOpcao(o)} onDelete={() => props.onDeleteOpcao(o.id)} />
                      ))}
                    </ul>
                  </SortableContext>
                </DndContext>
              )}
            </AccordionContent>
          )}
        </AccordionItem>
      </Accordion>
    </div>
  );
}

function OpcaoRow({ opcao, onEdit, onDelete }: { opcao: OpcaoAdminRow; onEdit: () => void; onDelete: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: opcao.id });
  const style = { transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 20 : undefined };
  return (
    <li ref={setNodeRef} style={style} className="flex items-center gap-2 bg-background border rounded px-2 py-1.5">
      <button className="text-muted-foreground cursor-grab active:cursor-grabbing" {...attributes} {...listeners}>
        <GripVertical className="h-3.5 w-3.5" />
      </button>
      <div className="flex-1 min-w-0">
        <div className="text-sm truncate">{opcao.label_pt}{opcao.tem_descricao && <span className="text-xs text-muted-foreground"> · Descreva</span>}</div>
        <div className="text-[11px] text-muted-foreground truncate">ES: {opcao.label_es || "—"} · EN: {opcao.label_en || "—"}</div>
      </div>
      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={onEdit}><Pencil className="h-3 w-3" /></Button>
      <Button size="icon" variant="ghost" className="h-6 w-6 text-rose-700" onClick={onDelete}><Trash2 className="h-3 w-3" /></Button>
    </li>
  );
}

function PerguntaForm(props: {
  initial: Partial<PerguntaAdminRow>;
  onCancel: () => void;
  onSubmit: (v: any) => void;
  pending: boolean;
  onTraduzir: (texto: string, para: "es" | "en") => Promise<string>;
}) {
  const [formato, setFormato] = useState(props.initial.formato ?? "single_choice");
  const [pt, setPt] = useState(props.initial.enunciado_pt ?? "");
  const [es, setEs] = useState(props.initial.enunciado_es ?? "");
  const [en, setEn] = useState(props.initial.enunciado_en ?? "");
  const [obrig, setObrig] = useState(props.initial.obrigatoria ?? true);
  const [translating, setTranslating] = useState<null | "es" | "en">(null);

  const traduzir = async (para: "es" | "en") => {
    if (!pt.trim()) { toast.info("Preencha o enunciado em PT primeiro."); return; }
    try {
      setTranslating(para);
      const r = await props.onTraduzir(pt, para);
      if (para === "es") setEs(r); else setEn(r);
      toast.success(`Traduzido para ${para.toUpperCase()}.`);
    } catch (e: any) {
      toast.error(e?.message ?? "Falha na tradução.");
    } finally { setTranslating(null); }
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Formato *</Label>
          <Select value={formato} onValueChange={(v) => setFormato(v as any)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {FORMATOS.map((f) => <SelectItem key={f.v} value={f.v}>{f.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end gap-3">
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={obrig} onCheckedChange={setObrig} /> Obrigatória
          </label>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <Label>Enunciado (PT) *</Label>
          <div className="flex gap-1">
            <Button size="sm" variant="ghost" onClick={() => traduzir("es")} disabled={translating !== null || !pt.trim()}>
              <Sparkles className="h-3.5 w-3.5 mr-1" /> {translating === "es" ? "Traduzindo…" : "Preencher ES"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => traduzir("en")} disabled={translating !== null || !pt.trim()}>
              <Sparkles className="h-3.5 w-3.5 mr-1" /> {translating === "en" ? "Traduzindo…" : "Preencher EN"}
            </Button>
          </div>
        </div>
        <Textarea rows={2} value={pt} onChange={(e) => setPt(e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Enunciado (ES)</Label>
          <Textarea rows={2} value={es} onChange={(e) => setEs(e.target.value)} />
        </div>
        <div>
          <Label>Enunciado (EN)</Label>
          <Textarea rows={2} value={en} onChange={(e) => setEn(e.target.value)} />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={props.onCancel}>Cancelar</Button>
        <Button disabled={!pt.trim() || props.pending} onClick={() => props.onSubmit({
          id: props.initial.id, segmento_id: props.initial.segmento_id,
          formato, obrigatoria: obrig,
          enunciado_pt: pt, enunciado_es: es || null, enunciado_en: en || null,
        })}>
          {props.pending ? "Salvando…" : "Salvar pergunta"}
        </Button>
      </DialogFooter>
    </div>
  );
}

function OpcaoForm(props: {
  initial: Partial<OpcaoAdminRow>;
  onCancel: () => void;
  onSubmit: (v: any) => void;
  pending: boolean;
  onTraduzir: (texto: string, para: "es" | "en") => Promise<string>;
}) {
  const [pt, setPt] = useState(props.initial.label_pt ?? "");
  const [es, setEs] = useState(props.initial.label_es ?? "");
  const [en, setEn] = useState(props.initial.label_en ?? "");
  const [descreva, setDescreva] = useState(props.initial.tem_descricao ?? false);
  const [translating, setTranslating] = useState<null | "es" | "en">(null);

  const traduzir = async (para: "es" | "en") => {
    if (!pt.trim()) return;
    try {
      setTranslating(para);
      const r = await props.onTraduzir(pt, para);
      if (para === "es") setEs(r); else setEn(r);
    } catch (e: any) { toast.error(e?.message ?? "Falha na tradução."); }
    finally { setTranslating(null); }
  };

  return (
    <div className="space-y-3">
      <div>
        <div className="flex items-center justify-between">
          <Label>Rótulo (PT) *</Label>
          <div className="flex gap-1">
            <Button size="sm" variant="ghost" onClick={() => traduzir("es")} disabled={translating !== null || !pt.trim()}>
              <Sparkles className="h-3.5 w-3.5 mr-1" /> ES
            </Button>
            <Button size="sm" variant="ghost" onClick={() => traduzir("en")} disabled={translating !== null || !pt.trim()}>
              <Sparkles className="h-3.5 w-3.5 mr-1" /> EN
            </Button>
          </div>
        </div>
        <Input value={pt} onChange={(e) => setPt(e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Rótulo (ES)</Label>
          <Input value={es} onChange={(e) => setEs(e.target.value)} />
        </div>
        <div>
          <Label>Rótulo (EN)</Label>
          <Input value={en} onChange={(e) => setEn(e.target.value)} />
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <Switch checked={descreva} onCheckedChange={setDescreva} />
        Ao selecionar, pedir campo "Descreva" (texto extra)
      </label>
      <DialogFooter>
        <Button variant="outline" onClick={props.onCancel}>Cancelar</Button>
        <Button disabled={!pt.trim() || props.pending} onClick={() => props.onSubmit({
          id: props.initial.id, label_pt: pt, label_es: es || null, label_en: en || null, tem_descricao: descreva,
        })}>{props.pending ? "Salvando…" : "Salvar opção"}</Button>
      </DialogFooter>
    </div>
  );
}
