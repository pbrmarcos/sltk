import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  listSATTemplates,
  novaVersaoSATTemplate,
  setSATTemplateAtivo,
  archiveSATTemplate,
  type SATTemplateLite,
} from "@/lib/sat-templates.functions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, FileCog, Star, Archive, Plus } from "lucide-react";
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
import { SATTemplateEditorDialog } from "./SATTemplateEditorDialog";

function fmt(iso: string) {
  try {
    return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return "—";
  }
}

export function TemplatesSATPage({ view = "ativos" }: { view?: "ativos" | "arquivados" }) {
  const qc = useQueryClient();
  const listFn = useServerFn(listSATTemplates);
  const novaFn = useServerFn(novaVersaoSATTemplate);
  const ativoFn = useServerFn(setSATTemplateAtivo);
  const arquivarFn = useServerFn(archiveSATTemplate);

  const [editId, setEditId] = useState<string | null>(null);
  const [archTpl, setArchTpl] = useState<SATTemplateLite | null>(null);

  const listQ = useQuery({
    queryKey: ["sat-templates"],
    queryFn: () => listFn(),
  });

  const novaMut = useMutation({
    mutationFn: (base?: SATTemplateLite) =>
      novaFn({
        data: {
          base_id: base?.id,
          nome: base ? `${base.nome} (cópia)` : "Novo template SAT",
          descricao: base?.descricao ?? null,
        },
      }),
    onSuccess: (r) => {
      toast.success("Nova versão criada.");
      qc.invalidateQueries({ queryKey: ["sat-templates"] });
      setEditId(r.id);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const ativoMut = useMutation({
    mutationFn: (id: string) => ativoFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Template ativado.");
      qc.invalidateQueries({ queryKey: ["sat-templates"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const archMut = useMutation({
    mutationFn: (id: string) => arquivarFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Template arquivado.");
      qc.invalidateQueries({ queryKey: ["sat-templates"] });
      setArchTpl(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rows = (listQ.data ?? []).filter((t) =>
    view === "ativos" ? !t.deleted_at : !!t.deleted_at,
  );
  const ativos = rows.filter((r) => r.ativo);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="text-[13px] text-[var(--text-secondary)]">
          {ativos.length > 0 ? (
            <>
              Template ativo: <strong>v{ativos[0].versao}</strong> — {ativos[0].nome}
            </>
          ) : (
            <>Nenhum template ativo.</>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => novaMut.mutate(ativos[0])}
            disabled={novaMut.isPending || !ativos[0]}
          >
            <Plus className="mr-1 h-4 w-4" /> Nova versão (a partir da ativa)
          </Button>
          <Button onClick={() => novaMut.mutate(undefined)} disabled={novaMut.isPending}>
            <Plus className="mr-1 h-4 w-4" /> Template em branco
          </Button>
        </div>
      </div>

      <div className="rounded-[var(--radius-lg)] border border-[var(--bg-border)] bg-[var(--bg-surface)]">
        <table className="w-full text-[13px]">
          <thead className="border-b border-[var(--bg-border)] text-left text-[12px] text-[var(--text-muted)]">
            <tr>
              <th className="px-4 py-2.5 font-medium">Versão</th>
              <th className="px-4 py-2.5 font-medium">Nome</th>
              <th className="px-4 py-2.5 font-medium">Seções</th>
              <th className="px-4 py-2.5 font-medium">Itens</th>
              <th className="px-4 py-2.5 font-medium">Atualizado</th>
              <th className="px-4 py-2.5 font-medium">Status</th>
              <th className="px-4 py-2.5 font-medium text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {listQ.isLoading && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-[var(--text-muted)]">
                  <Loader2 className="inline h-4 w-4 animate-spin" /> Carregando…
                </td>
              </tr>
            )}
            {!listQ.isLoading && rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-[var(--text-muted)]">
                  Nenhuma versão criada. Crie uma para começar.
                </td>
              </tr>
            )}
            {rows.map((t) => (
              <tr key={t.id} className="border-t border-[var(--bg-border)]">
                <td className="px-4 py-2.5 font-medium">v{t.versao}</td>
                <td className="px-4 py-2.5">
                  <div className="font-medium">{t.nome}</div>
                  {t.descricao && (
                    <div className="text-[11.5px] text-[var(--text-muted)]">{t.descricao}</div>
                  )}
                </td>
                <td className="px-4 py-2.5">{t.secoes_count}</td>
                <td className="px-4 py-2.5">{t.itens_count}</td>
                <td className="px-4 py-2.5 text-[12px]">{fmt(t.updated_at)}</td>
                <td className="px-4 py-2.5">
                  {t.ativo ? (
                    <Badge className="border border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                      Ativa
                    </Badge>
                  ) : (
                    <Badge variant="outline">Rascunho</Badge>
                  )}
                </td>
                <td className="px-4 py-2.5 text-right">
                  <Button size="sm" variant="ghost" onClick={() => setEditId(t.id)}>
                    <FileCog className="mr-1 h-3.5 w-3.5" /> Editar
                  </Button>
                  {!t.ativo && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => ativoMut.mutate(t.id)}
                      disabled={ativoMut.isPending}
                      title="Ativar esta versão"
                    >
                      <Star className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  {!t.ativo && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-[var(--danger)]"
                      onClick={() => setArchTpl(t)}
                      title="Arquivar"
                    >
                      <Archive className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editId && (
        <SATTemplateEditorDialog
          templateId={editId}
          open={!!editId}
          onOpenChange={(o) => !o && setEditId(null)}
        />
      )}

      <AlertDialog open={!!archTpl} onOpenChange={(o: boolean) => !o && setArchTpl(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Arquivar versão?</AlertDialogTitle>
            <AlertDialogDescription>
              A versão v{archTpl?.versao} ficará indisponível para novos relatórios. Os relatórios
              existentes mantêm a estrutura que tinham.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => archTpl && archMut.mutate(archTpl.id)}>
              Arquivar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}