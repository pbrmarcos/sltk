import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, PlayCircle, CheckCircle2, ChevronDown, ChevronRight, TriangleAlert } from "lucide-react";
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
import { listarMigrations, aplicarMigration } from "@/lib/migrations.functions";

export function MigrationsTab() {
  const listar = useServerFn(listarMigrations);
  const aplicar = useServerFn(aplicarMigration);
  const [applyingName, setApplyingName] = useState<string | null>(null);
  const [openSql, setOpenSql] = useState<Record<string, boolean>>({});
  const [confirmName, setConfirmName] = useState<string | null>(null);

  const q = useQuery({
    queryKey: ["admin", "migrations"],
    queryFn: () => listar(),
  });

  async function handleApply(name: string) {
    setConfirmName(null);
    setApplyingName(name);
    try {
      const r = await aplicar({ data: { name } });
      if (r.ok) {
        toast.success(`Migration aplicada: ${name}`);
        await q.refetch();
      } else {
        toast.error(r.error ?? "Falha ao aplicar migration");
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao aplicar migration");
    } finally {
      setApplyingName(null);
    }
  }

  if (q.isLoading) {
    return (
      <div className="flex items-center gap-2 p-6 text-sm text-[var(--text-muted)]">
        <Loader2 className="h-4 w-4 animate-spin" /> Carregando migrations…
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

  const items = q.data ?? [];
  const pendentes = items.filter((i) => !i.applied_at);

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-[var(--bg-border)] bg-[var(--bg-surface)] p-4 text-sm text-[var(--text-muted)]">
        Arquivos em <code>supabase/pending-migrations/</code>. Ao aplicar, o SQL é
        executado via Management API do Supabase e registrado em{" "}
        <code>public._migrations_applied</code>.{" "}
        <span className="text-[var(--text-primary)]">{pendentes.length} pendente(s)</span>.
      </div>

      <div className="space-y-2">
        {items.map((m) => {
          const applied = !!m.applied_at;
          const open = openSql[m.name] ?? false;
          return (
            <div
              key={m.name}
              className="rounded-lg border border-[var(--bg-border)] bg-[var(--bg-surface)]"
            >
              <div className="flex items-center justify-between gap-3 p-3">
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <button
                    onClick={() => setOpenSql((s) => ({ ...s, [m.name]: !open }))}
                    className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                    aria-label="Ver SQL"
                  >
                    {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </button>
                  {applied ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-[var(--success)]" />
                  ) : (
                    <div className="h-2 w-2 shrink-0 rounded-full bg-[var(--warning)]" />
                  )}
                  <span className="truncate font-mono text-sm">{m.name}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-[var(--text-muted)]">
                  {applied ? (
                    <span>aplicada em {new Date(m.applied_at!).toLocaleString("pt-BR")}</span>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => setConfirmName(m.name)}
                      disabled={applyingName === m.name}
                    >
                      {applyingName === m.name ? (
                        <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <PlayCircle className="mr-1 h-3.5 w-3.5" />
                      )}
                      Aplicar
                    </Button>
                  )}
                </div>
              </div>
              {open && (
                <pre className="max-h-80 overflow-auto border-t border-[var(--bg-border)] bg-[var(--bg-elevated)] p-3 text-xs">
{m.sql}
                </pre>
              )}
            </div>
          );
        })}
        {items.length === 0 && (
          <div className="rounded-lg border border-[var(--bg-border)] p-6 text-center text-sm text-[var(--text-muted)]">
            Nenhum arquivo em supabase/pending-migrations/.
          </div>
        )}
      </div>

      <AlertDialog open={!!confirmName} onOpenChange={(v) => !v && setConfirmName(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <TriangleAlert className="h-4 w-4 text-[var(--warning)]" /> Aplicar migration em produção
            </AlertDialogTitle>
            <AlertDialogDescription>
              O SQL de <code className="font-mono">{confirmName}</code> será executado diretamente no
              banco de produção via Management API, sem possibilidade de desfazer automaticamente. A
              aplicação fica registrada em Auditoria com o seu usuário. Confirma?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmName && handleApply(confirmName)}>
              Aplicar migration
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
