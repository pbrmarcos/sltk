/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Plus, X, Save } from "lucide-react";
import { upsertEtapaTemplateItem, DISCIPLINAS, PRIORIDADES } from "@/lib/etapa-templates.functions";
import { confirmDiscard } from "@/lib/unsaved-guard";
import { useFormDraft } from "@/hooks/use-form-draft";

const ROLES = [
  "engineer",
  "manager",
  "assembly",
  "production",
  "purchasing",
  "sales",
  "field",
  "admin",
];

export function EtapaDialog({
  templateId,
  item,
  outrasEtapas,
  onClose,
  onSaved,
}: {
  templateId: string;
  item: any;
  outrasEtapas: Array<{ id: string; titulo: string; disciplina: string }>;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [titulo, setTitulo] = useState<string>(item.titulo ?? "");
  const [descricao, setDescricao] = useState<string>(item.descricao ?? "");
  const [prioridade, setPrioridade] = useState<string>(item.prioridade ?? "media");
  const [disciplina, setDisciplina] = useState<string>(item.disciplina ?? "planejamento");
  const [duracaoH, setDuracaoH] = useState<string>(
    item.duracao_h != null ? String(item.duracao_h) : "",
  );
  const [responsavelRole, setResponsavelRole] = useState<string>(
    item.responsavel_role ?? "__none__",
  );
  const [dependeDe, setDependeDe] = useState<string>(item.depende_de ?? "__none__");
  const [entregavel, setEntregavel] = useState<string>(item.entregavel ?? "");
  const [requerAnexo, setRequerAnexo] = useState<boolean>(!!item.requer_anexo);
  const [checklist, setChecklist] = useState<Array<{ texto: string }>>(
    Array.isArray(item.checklist) ? item.checklist : [],
  );
  const [newTask, setNewTask] = useState("");
  const initialDraft = {
    titulo: item.titulo ?? "",
    descricao: item.descricao ?? "",
    prioridade: item.prioridade ?? "media",
    disciplina: item.disciplina ?? "planejamento",
    duracaoH: item.duracao_h != null ? String(item.duracao_h) : "",
    responsavelRole: item.responsavel_role ?? "__none__",
    dependeDe: item.depende_de ?? "__none__",
    entregavel: item.entregavel ?? "",
    requerAnexo: !!item.requer_anexo,
    checklist: Array.isArray(item.checklist) ? item.checklist : [],
    newTask: "",
  };
  const currentDraft = {
    titulo,
    descricao,
    prioridade,
    disciplina,
    duracaoH,
    responsavelRole,
    dependeDe,
    entregavel,
    requerAnexo,
    checklist,
    newTask,
  };
  const { clearDraft, isDirty } = useFormDraft({
    formKey: `template-etapa:${templateId}:${item.id ?? "novo"}`,
    value: currentDraft,
    initialValue: initialDraft,
    onRestore: (saved) => {
      setTitulo(saved.titulo);
      setDescricao(saved.descricao);
      setPrioridade(saved.prioridade);
      setDisciplina(saved.disciplina);
      setDuracaoH(saved.duracaoH);
      setResponsavelRole(saved.responsavelRole);
      setDependeDe(saved.dependeDe);
      setEntregavel(saved.entregavel);
      setRequerAnexo(saved.requerAnexo);
      setChecklist(saved.checklist);
      setNewTask(saved.newTask);
    },
  });

  const mut = useMutation({
    mutationFn: () =>
      upsertEtapaTemplateItem({
        data: {
          id: item.id,
          templateId,
          disciplina: disciplina as any,
          ordem: item.ordem ?? 999,
          titulo,
          descricao: descricao || null,
          prioridade: prioridade as any,
          duracaoH: duracaoH ? Number(duracaoH) : null,
          responsavelRole: responsavelRole === "__none__" ? null : responsavelRole,
          dependeDe: dependeDe === "__none__" ? null : dependeDe,
          entregavel: entregavel || null,
          requerAnexo,
          checklist,
        },
      }),
    onSuccess: () => {
      clearDraft();
      toast.success("Salvo.");
      onSaved();
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro."),
  });

  function tryClose() {
    if (confirmDiscard(isDirty)) {
      clearDraft();
      onClose();
    }
  }

  function addTask() {
    if (!newTask.trim()) return;
    setChecklist((c) => [...c, { texto: newTask.trim() }]);
    setNewTask("");
  }

  return (
    <Dialog open onOpenChange={(o) => !o && tryClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{item.id ? "Editar etapa" : "Nova etapa"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Identificação */}
          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase text-muted-foreground">Identificação</h3>
            <div>
              <Label>Título *</Label>
              <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} autoFocus />
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={3} />
            </div>
            <div>
              <Label>Entregável esperado</Label>
              <Input
                value={entregavel}
                onChange={(e) => setEntregavel(e.target.value)}
                placeholder="Ex.: dossiê CE assinado, IHM comissionada..."
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={requerAnexo} onCheckedChange={setRequerAnexo} />
              <Label className="cursor-pointer">Exigir anexo para fechar a etapa</Label>
            </div>
          </section>

          {/* Classificação */}
          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase text-muted-foreground">Classificação</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Disciplina</Label>
                <Select value={disciplina} onValueChange={setDisciplina}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DISCIPLINAS.map((d) => (
                      <SelectItem key={d} value={d}>
                        {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Prioridade</Label>
                <Select value={prioridade} onValueChange={setPrioridade}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORIDADES.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Duração estimada (h)</Label>
                <Input
                  type="number"
                  step="0.5"
                  min="0"
                  value={duracaoH}
                  onChange={(e) => setDuracaoH(e.target.value)}
                  placeholder="Ex.: 8"
                />
              </div>
              <div>
                <Label>Responsável padrão</Label>
                <Select value={responsavelRole} onValueChange={setResponsavelRole}>
                  <SelectTrigger>
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">—</SelectItem>
                    {ROLES.map((r) => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label>Depende de (etapa anterior)</Label>
                <Select value={dependeDe} onValueChange={setDependeDe}>
                  <SelectTrigger>
                    <SelectValue placeholder="Nenhuma dependência" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— Nenhuma —</SelectItem>
                    {outrasEtapas
                      .filter((o) => o.id !== item.id)
                      .map((o) => (
                        <SelectItem key={o.id} value={o.id}>
                          [{o.disciplina}] {o.titulo}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </section>

          {/* Checklist */}
          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase text-muted-foreground">
              Checklist de sub-tarefas ({checklist.length})
            </h3>
            <div className="space-y-1.5">
              {checklist.map((t, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 rounded border border-border bg-muted/20 px-2 py-1.5"
                >
                  <span className="grid h-5 w-5 place-items-center rounded-full bg-primary/15 text-[10px] font-bold text-primary">
                    {i + 1}
                  </span>
                  <Input
                    value={t.texto}
                    onChange={(e) => {
                      const v = e.target.value;
                      setChecklist((c) => c.map((x, j) => (j === i ? { texto: v } : x)));
                    }}
                    className="h-7 flex-1"
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    onClick={() => setChecklist((c) => c.filter((_, j) => j !== i))}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <div className="flex gap-2">
                <Input
                  value={newTask}
                  onChange={(e) => setNewTask(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTask())}
                  placeholder="Nova sub-tarefa e Enter"
                  className="h-8"
                />
                <Button size="sm" variant="outline" onClick={addTask}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </section>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={tryClose}>
            Cancelar
          </Button>
          <Button onClick={() => mut.mutate()} disabled={!titulo || mut.isPending}>
            <Save className="mr-1 h-4 w-4" /> Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
