import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  listTemplates,
  upsertTemplate,
  deleteTemplate,
  restoreTemplate,
  duplicateTemplate,
  type TemplateLite,
  type ProcessoTipo,
} from "@/lib/processo-templates.functions";
import { listRfqTipos } from "@/lib/rfq.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";

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
import { Plus, FileCog, Loader2, Copy, Undo2, Archive } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Info } from "lucide-react";
import { TemplateEditorDialog } from "./TemplateEditorDialog";

const TIPO_LABEL: Record<ProcessoTipo, string> = {
  projeto: "Projeto",
  atendimento: "Atendimento",
  instalacao: "Instalação",
};

const TIPO_COLOR: Record<ProcessoTipo, string> = {
  projeto: "bg-blue-500/15 text-blue-700 border-blue-500/30 dark:text-blue-300",
  atendimento: "bg-amber-500/15 text-amber-700 border-amber-500/30 dark:text-amber-300",
  instalacao: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30 dark:text-emerald-300",
};

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

export function TemplatesProjetoPage({ view = "ativos" }: { view?: "ativos" | "arquivados" }) {
  const qc = useQueryClient();
  const listFn = useServerFn(listTemplates);
  const upsertFn = useServerFn(upsertTemplate);
  const deleteFn = useServerFn(deleteTemplate);
  const restoreFn = useServerFn(restoreTemplate);
  const duplicateFn = useServerFn(duplicateTemplate);

  const [tipoFiltro, setTipoFiltro] = useState<ProcessoTipo | "todos">("todos");
  const [q, setQ] = useState("");
  const aba = view;
  const [novoOpen, setNovoOpen] = useState(false);
  const [novoNome, setNovoNome] = useState("");
  const [novoTipo, setNovoTipo] = useState<ProcessoTipo>("projeto");
  const [novoDesc, setNovoDesc] = useState("");
  const [novoRfqTipoId, setNovoRfqTipoId] = useState<string>("none");
  const [editId, setEditId] = useState<string | null>(null);
  const [delTpl, setDelTpl] = useState<TemplateLite | null>(null);

  const listQ = useQuery({
    queryKey: ["processo-templates", tipoFiltro, q, aba],
    queryFn: () =>
      listFn({
        data: {
          tipo: tipoFiltro === "todos" ? undefined : tipoFiltro,
          q: q || undefined,
          incluir_arquivados: true,
        },
      }),
  });

  const listRfqTiposFn = useServerFn(listRfqTipos);
  const rfqTiposQ = useQuery({
    queryKey: ["rfq-tipos-ativos-templates"],
    queryFn: () => listRfqTiposFn(),
  });

  const createMut = useMutation({
    mutationFn: () =>
      upsertFn({
        data: {
          nome: capitalize(novoNome.trim()),
          tipo: novoTipo,
          descricao: novoDesc.trim() ? capitalize(novoDesc.trim()) : null,
          ativo: true,
          rfq_tipo_id: novoRfqTipoId && novoRfqTipoId !== "none" ? novoRfqTipoId : null,
        },
      }),
    onSuccess: (r) => {
      toast.success("Template criado.");
      qc.invalidateQueries({ queryKey: ["processo-templates"] });
      setNovoOpen(false);
      setNovoNome("");
      setNovoDesc("");
      setNovoRfqTipoId("none");
      setEditId(r.id);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Template arquivado.");
      qc.invalidateQueries({ queryKey: ["processo-templates"] });
      setDelTpl(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const restoreMut = useMutation({
    mutationFn: (id: string) => restoreFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Template restaurado.");
      qc.invalidateQueries({ queryKey: ["processo-templates"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const duplicateMut = useMutation({
    mutationFn: (id: string) => duplicateFn({ data: { id } }),
    onSuccess: (r) => {
      toast.success("Template duplicado.");
      qc.invalidateQueries({ queryKey: ["processo-templates"] });
      setEditId(r.id);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleAtivo = useMutation({
    mutationFn: (t: TemplateLite) =>
      upsertFn({
        data: {
          id: t.id,
          nome: t.nome,
          tipo: t.tipo,
          descricao: t.descricao,
          ativo: !t.ativo,
          rfq_tipo_id: t.rfq_tipo_id,
        },
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["processo-templates"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const all = listQ.data ?? [];
  const rows = all.filter((t) => (aba === "ativos" ? !t.deleted_at : !!t.deleted_at));

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[220px] flex-1">
            <Label className="text-[12px] text-[var(--text-secondary)]">Buscar</Label>
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Nome do template"
            />
          </div>
          <div>
            <Label className="text-[12px] text-[var(--text-secondary)]">Tipo</Label>
            <Select value={tipoFiltro} onValueChange={(v) => setTipoFiltro(v as never)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="projeto">Projeto</SelectItem>
                <SelectItem value="atendimento">Atendimento</SelectItem>
                <SelectItem value="instalacao">Instalação</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={() => setNovoOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" /> Novo template
          </Button>
        </div>

        <div className="rounded-[var(--radius-lg)] border border-[var(--bg-border)] bg-[var(--bg-surface)]">
          <table className="w-full text-[13px]">
            <thead className="border-b border-[var(--bg-border)] text-left text-[12px] text-[var(--text-muted)]">
              <tr>
                <th className="px-4 py-2.5 font-medium">Nome</th>
                <th className="px-4 py-2.5 font-medium">Tipo</th>
                <th className="px-4 py-2.5 font-medium">Itens</th>
                <th className="px-4 py-2.5 font-medium">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="inline-flex items-center gap-1 cursor-help">
                        Tarefas <Info className="h-3 w-3 opacity-60" />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      Atividades acionáveis criadas automaticamente ao aplicar o template a um
                      processo, com prazo e responsável por perfil (role).
                    </TooltipContent>
                  </Tooltip>
                </th>
                <th className="px-4 py-2.5 font-medium">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="inline-flex items-center gap-1 cursor-help">
                        Eventos <Info className="h-3 w-3 opacity-60" />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      Marcos da timeline do processo (kickoff, FAT, embarque, instalação, etc.) com
                      data calculada a partir da data de início.
                    </TooltipContent>
                  </Tooltip>
                </th>
                <th className="px-4 py-2.5 font-medium">Criado por</th>
                <th className="px-4 py-2.5 font-medium">Atualizado por</th>
                {aba === "ativos" && <th className="px-4 py-2.5 font-medium">Ativo</th>}
                <th className="px-4 py-2.5 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {listQ.isLoading && (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-[var(--text-muted)]">
                    <Loader2 className="inline h-4 w-4 animate-spin" /> Carregando…
                  </td>
                </tr>
              )}
              {!listQ.isLoading && rows.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-[var(--text-muted)]">
                    Nenhum template encontrado.
                  </td>
                </tr>
              )}
              {rows.map((t) => (
                <tr key={t.id} className="border-t border-[var(--bg-border)]">
                  <td className="px-4 py-2.5">
                    <div className="font-medium text-[var(--text-primary)]">{t.nome}</div>
                    {t.descricao && (
                      <div className="text-[11.5px] text-[var(--text-muted)]">{t.descricao}</div>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    <Badge className={`border ${TIPO_COLOR[t.tipo]}`}>{TIPO_LABEL[t.tipo]}</Badge>
                  </td>
                  <td className="px-4 py-2.5">{t.itens_count}</td>
                  <td className="px-4 py-2.5">{t.tarefas_count}</td>
                  <td className="px-4 py-2.5">{t.eventos_count}</td>
                  <td className="px-4 py-2.5 text-[12px]">
                    <div>{t.created_by_nome ?? "—"}</div>
                    <div className="text-[11px] text-[var(--text-muted)]">
                      {formatDateTime(t.created_at)}
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-[12px]">
                    <div>{t.updated_by_nome ?? "—"}</div>
                    <div className="text-[11px] text-[var(--text-muted)]">
                      {formatDateTime(t.updated_at)}
                    </div>
                  </td>
                  {aba === "ativos" && (
                    <td className="px-4 py-2.5">
                      <Switch
                        checked={t.ativo}
                        onCheckedChange={() => toggleAtivo.mutate(t)}
                        disabled={toggleAtivo.isPending}
                      />
                    </td>
                  )}
                  <td className="px-4 py-2.5 text-right">
                    {aba === "ativos" ? (
                      <>
                        <Button size="sm" variant="ghost" onClick={() => setEditId(t.id)}>
                          <FileCog className="mr-1 h-3.5 w-3.5" /> Editar
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => duplicateMut.mutate(t.id)}
                          disabled={duplicateMut.isPending}
                          title="Duplicar"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-[var(--text-secondary)]"
                          onClick={() => setDelTpl(t)}
                          title="Arquivar"
                        >
                          <Archive className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => restoreMut.mutate(t.id)}
                        disabled={restoreMut.isPending}
                      >
                        <Undo2 className="mr-1 h-3.5 w-3.5" /> Restaurar
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Novo template */}
        <Dialog open={novoOpen} onOpenChange={setNovoOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo template</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Nome</Label>
                <Input
                  value={novoNome}
                  onChange={(e) => setNovoNome(capitalize(e.target.value))}
                  placeholder="Ex.: Máquina de embalagem padrão"
                />
              </div>
              <div>
                <Label>Tipo de processo</Label>
                <Select value={novoTipo} onValueChange={(v) => setNovoTipo(v as ProcessoTipo)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="projeto">Projeto</SelectItem>
                    <SelectItem value="atendimento">Atendimento</SelectItem>
                    <SelectItem value="instalacao">Instalação</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Descrição (opcional)</Label>
                <Input
                  value={novoDesc}
                  onChange={(e) => setNovoDesc(capitalize(e.target.value))}
                  placeholder="Subtítulo curto que descreve o uso do template"
                />
              </div>
              {novoTipo === "projeto" && (
                <div>
                  <Label>Máquina Checklist (opcional)</Label>
                  <Select value={novoRfqTipoId} onValueChange={setNovoRfqTipoId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Nenhuma máquina vinculada" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhuma</SelectItem>
                      {(rfqTiposQ.data ?? []).map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.nome_pt}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Vinculando a uma máquina, este template é sugerido automaticamente ao converter
                    oportunidades que já receberam formulário Checklist desse tipo.
                  </p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setNovoOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={() => createMut.mutate()}
                disabled={!novoNome.trim() || createMut.isPending}
              >
                {createMut.isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
                Criar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Editor */}
        {editId && (
          <TemplateEditorDialog
            templateId={editId}
            open={!!editId}
            onOpenChange={(o) => !o && setEditId(null)}
          />
        )}

        {/* Delete confirm */}
        <AlertDialog open={!!delTpl} onOpenChange={(o: boolean) => !o && setDelTpl(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Arquivar template?</AlertDialogTitle>
              <AlertDialogDescription>
                O template "{delTpl?.nome}" vai para a aba <strong>Arquivados</strong> e pode ser
                restaurado a qualquer momento.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={() => delTpl && delMut.mutate(delTpl.id)}>
                Arquivar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  );
}
