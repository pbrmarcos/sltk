import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Trash2, TriangleAlert, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { getDemoSeedSummary, deleteDemoSeedContent } from "@/lib/demo-seed.functions";

export function DadosDemoTab() {
  const summaryFn = useServerFn(getDemoSeedSummary);
  const deleteFn = useServerFn(deleteDemoSeedContent);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const q = useQuery({
    queryKey: ["admin", "demo-seed-summary"],
    queryFn: () => summaryFn(),
  });

  async function handleDelete() {
    setConfirmOpen(false);
    setDeleting(true);
    try {
      const r = await deleteFn();
      toast.success(`${r.deleted} registro(s) de demonstração excluído(s).`);
      await q.refetch();
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao excluir conteúdo de demonstração");
    } finally {
      setDeleting(false);
    }
  }

  if (q.isLoading) {
    return (
      <div className="flex items-center gap-2 p-6 text-sm text-[var(--text-muted)]">
        <Loader2 className="h-4 w-4 animate-spin" /> Carregando dados de demonstração…
      </div>
    );
  }
  if (q.error) {
    return (
      <div className="rounded-lg border border-[var(--danger)]/40 bg-[var(--danger)]/5 p-4 text-sm">
        Erro: {(q.error as Error).message}
      </div>
    );
  }

  const { total, byTable } = q.data ?? { total: 0, byTable: [] };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-[var(--bg-border)] bg-[var(--bg-surface)] p-4 text-sm text-[var(--text-muted)]">
        Registros criados pelo script de seed de demonstração (8 jornadas completas de cliente:
        clientes, checklists, equipamentos, montagens, FAT/SAT, chamados e mais), rastreados em{" "}
        <code>demo_seed_registry</code>.{" "}
        {total > 0 ? (
          <span className="text-[var(--text-primary)]">
            {total} registro(s) em {byTable.length} tabela(s)
          </span>
        ) : (
          <span className="text-[var(--text-primary)]">
            nenhum conteúdo de demonstração no momento
          </span>
        )}
        .
      </div>

      {byTable.length > 0 && (
        <div className="rounded-lg border border-[var(--bg-border)] bg-[var(--bg-surface)]">
          <div className="divide-y divide-[var(--bg-border)]">
            {byTable.map((t) => (
              <div
                key={t.table_name}
                className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
              >
                <div className="flex items-center gap-2">
                  <Database className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                  <span className="font-mono">{t.table_name}</span>
                </div>
                <span className="text-[var(--text-muted)]">{t.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {byTable.length === 0 ? (
        <div className="rounded-lg border border-[var(--bg-border)] p-6 text-center text-sm text-[var(--text-muted)]">
          Nenhum dado de demonstração cadastrado.
        </div>
      ) : (
        <Button variant="destructive" onClick={() => setConfirmOpen(true)} disabled={deleting}>
          {deleting ? (
            <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
          ) : (
            <Trash2 className="mr-1 h-3.5 w-3.5" />
          )}
          Excluir conteúdo DEMO
        </Button>
      )}

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <TriangleAlert className="h-4 w-4 text-[var(--warning)]" /> Excluir conteúdo de
              demonstração
            </AlertDialogTitle>
            <AlertDialogDescription>
              Isso apaga permanentemente todos os {total} registro(s) criados pelo seed de
              demonstração — clientes, oportunidades, processos, equipamentos, montagens, revisões,
              FAT/SAT, chamados, embarques e checklists — junto com os arquivos de evidência
              correspondentes no Storage. Nenhum outro dado do sistema é afetado. Não pode ser
              desfeito. Confirma?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Excluir conteúdo DEMO</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
