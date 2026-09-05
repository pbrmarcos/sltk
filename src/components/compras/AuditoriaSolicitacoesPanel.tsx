import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  History,
  MessageCircle,
  FilePlus2,
  FileMinus2,
  Pencil,
  Sparkles,
  DollarSign,
  RefreshCw,
  Undo2,
  User as UserIcon,
  Search,
  Trash2,
  RotateCcw,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { listAtividadesSolicitacoes, reverterAtividade } from "@/lib/insumo-anexos.functions";

type FilterKey = "todos" | "status_alterado" | "editado" | "arquivos" | "comentario" | "removidos";

const TIPOS: Record<
  string,
  { icon: React.ComponentType<{ className?: string }>; color: string; label: string }
> = {
  criado: {
    icon: Sparkles,
    color: "text-emerald-600 bg-emerald-50 border-emerald-200",
    label: "Criado",
  },
  editado: { icon: Pencil, color: "text-blue-600 bg-blue-50 border-blue-200", label: "Editado" },
  status_alterado: {
    icon: RefreshCw,
    color: "text-amber-600 bg-amber-50 border-amber-200",
    label: "Status",
  },
  anexo_adicionado: {
    icon: FilePlus2,
    color: "text-purple-600 bg-purple-50 border-purple-200",
    label: "Anexo",
  },
  anexo_removido: {
    icon: FileMinus2,
    color: "text-red-600 bg-red-50 border-red-200",
    label: "Anexo removido",
  },
  orcamento_recebido: {
    icon: DollarSign,
    color: "text-emerald-700 bg-emerald-50 border-emerald-200",
    label: "Orçamento",
  },
  comentario: {
    icon: MessageCircle,
    color: "text-[var(--text-secondary)] bg-[var(--bg-elevated)] border-[var(--bg-border)]",
    label: "Comentário",
  },
  insumo_removido: {
    icon: Trash2,
    color: "text-rose-700 bg-rose-50 border-rose-200",
    label: "Insumo removido",
  },
  insumo_restaurado: {
    icon: RotateCcw,
    color: "text-emerald-700 bg-emerald-50 border-emerald-200",
    label: "Insumo restaurado",
  },
};

const FIELD_LABEL: Record<string, string> = {
  descricao: "Descrição",
  quantidade: "Quantidade",
  unidade: "Unidade",
  fabricante_sugerido: "Fabricante",
  part_number: "Part Number",
  codigo_interno: "Código interno",
  criticidade: "Criticidade",
  lead_time_desejado_dias: "Lead time",
  necessidade_em: "Necessidade em",
  observacoes: "Observações",
  especificacao_tecnica: "Especificação técnica",
  status: "Status",
};

const CLIENT_FILTERS: Record<FilterKey, (t: string) => boolean> = {
  todos: () => true,
  status_alterado: (t) => t === "status_alterado",
  editado: (t) => t === "editado" || t === "criado",
  arquivos: (t) => t === "anexo_adicionado" || t === "anexo_removido" || t === "orcamento_recebido",
  comentario: (t) => t === "comentario",
  removidos: (t) => t === "insumo_removido" || t === "insumo_restaurado",
};

export function AuditoriaSolicitacoesPanel({ projetoId }: { projetoId?: string } = {}) {
  const qc = useQueryClient();
  const listFn = useServerFn(listAtividadesSolicitacoes);
  const revertFn = useServerFn(reverterAtividade);

  const [filter, setFilter] = useState<FilterKey>("todos");
  const [actorQ, setActorQ] = useState("");
  const [revertTarget, setRevertTarget] = useState<any | null>(null);
  const [justificativa, setJustificativa] = useState("");
  const [reverting, setReverting] = useState(false);

  const q = useQuery({
    queryKey: ["compras", "auditoria", { actorQ, projetoId }],
    queryFn: () => listFn({ data: { limit: 300, tipo: "todos", actor_q: actorQ } }),
  });

  const rowsAll = useMemo(() => {
    const rows = (q.data ?? []) as any[];
    if (!projetoId) return rows;
    return rows.filter((r) => r.projeto_insumos?.projeto_id === projetoId);
  }, [q.data, projetoId]);

  const counts = useMemo(
    () => ({
      todos: rowsAll.length,
      status_alterado: rowsAll.filter((r) => CLIENT_FILTERS.status_alterado(r.tipo)).length,
      editado: rowsAll.filter((r) => CLIENT_FILTERS.editado(r.tipo)).length,
      arquivos: rowsAll.filter((r) => CLIENT_FILTERS.arquivos(r.tipo)).length,
      comentario: rowsAll.filter((r) => CLIENT_FILTERS.comentario(r.tipo)).length,
      removidos: rowsAll.filter((r) => CLIENT_FILTERS.removidos(r.tipo)).length,
    }),
    [rowsAll],
  );

  const rows = useMemo(
    () => rowsAll.filter((r) => CLIENT_FILTERS[filter](r.tipo)),
    [rowsAll, filter],
  );

  const FILTERS: Array<{ key: FilterKey; label: string }> = [
    { key: "todos", label: "Tudo" },
    { key: "status_alterado", label: "Status" },
    { key: "editado", label: "Campos" },
    { key: "arquivos", label: "Anexos" },
    { key: "comentario", label: "Comentários" },
    { key: "removidos", label: "Excluídos" },
  ];

  async function confirmarReverter() {
    if (!revertTarget) return;
    if (justificativa.trim().length < 3) {
      toast.error("Informe uma justificativa (mín. 3 caracteres).");
      return;
    }
    setReverting(true);
    try {
      await revertFn({
        data: { atividade_id: revertTarget.id, justificativa: justificativa.trim() },
      });
      toast.success("Alteração revertida.");
      setRevertTarget(null);
      setJustificativa("");
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["compras", "auditoria"] }),
        qc.invalidateQueries({ queryKey: ["compras", "solicitacoes"] }),
        qc.invalidateQueries({ queryKey: ["insumo-atividades", revertTarget.insumo_id] }),
        qc.invalidateQueries({ queryKey: ["insumo-anexos", revertTarget.insumo_id] }),
      ]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível reverter.");
    } finally {
      setReverting(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
          <Input
            className="pl-8 h-9 text-xs"
            placeholder="Filtrar por responsável…"
            value={actorQ}
            onChange={(e) => setActorQ(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={cn(
                "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] transition-colors",
                filter === f.key
                  ? "bg-[var(--text-primary)] border-[var(--text-primary)] text-[var(--bg-surface)]"
                  : "bg-[var(--bg-surface)] border-[var(--bg-border)] text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]",
              )}
            >
              {f.label}
              <span
                className={cn(
                  "rounded-full px-1.5 text-[10px]",
                  filter === f.key
                    ? "bg-[var(--bg-surface)]/20"
                    : "bg-[var(--bg-elevated)] text-[var(--text-muted)]",
                )}
              >
                {counts[f.key]}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-[var(--bg-border)] bg-[var(--bg-surface)]">
        {q.isLoading ? (
          <div className="p-8 text-center text-xs text-[var(--text-muted)]">Carregando…</div>
        ) : rows.length === 0 ? (
          <div className="p-8 text-center text-xs text-[var(--text-muted)] italic">
            Nenhuma atividade registrada para esse filtro.
          </div>
        ) : (
          <ol className="relative border-l border-[var(--bg-border)] ml-4 my-3 space-y-2">
            {rows.map((r) => {
              const cfg = TIPOS[r.tipo] ?? {
                icon: History,
                color:
                  "text-[var(--text-secondary)] bg-[var(--bg-elevated)] border-[var(--bg-border)]",
                label: r.tipo,
              };
              const Icon = cfg.icon;
              const pi = r.projeto_insumos;
              const cli = pi?.equipamento_projetos?.cliente_equipamentos?.clientes;
              const proj = pi?.equipamento_projetos?.cliente_equipamentos;
              return (
                <li key={r.id} className="ml-4 mr-3">
                  <span
                    className={cn(
                      "absolute -left-[9px] flex h-4 w-4 items-center justify-center rounded-full border bg-[var(--bg-surface)]",
                      cfg.color,
                    )}
                  >
                    <Icon className="h-2.5 w-2.5" />
                  </span>
                  <div className="rounded border border-[var(--bg-border)] bg-[var(--bg-surface)] p-2.5 text-xs">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge variant="outline" className={cn("font-normal", cfg.color)}>
                        {cfg.label}
                      </Badge>
                      <span className="text-[var(--text-primary)] font-medium truncate max-w-[240px]">
                        {pi?.descricao ?? "—"}
                      </span>
                      <span className="text-[var(--text-muted)]">·</span>
                      <span className="text-[var(--text-muted)]">
                        {cli?.codigo ?? "—"} / {proj?.codigo ?? "—"}
                      </span>
                      <span className="text-[var(--text-muted)]">·</span>
                      <span className="inline-flex items-center gap-1 text-[var(--text-secondary)]">
                        <UserIcon className="h-3 w-3" />
                        {r.actor_nome ?? "Sistema"}
                      </span>
                      <span className="text-[var(--text-muted)]">·</span>
                      <span className="text-[var(--text-muted)]">
                        {new Date(r.criado_em).toLocaleString("pt-BR")}
                      </span>
                      {r.revertable && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="ml-auto h-6 text-[10px] px-2"
                          onClick={() => setRevertTarget(r)}
                        >
                          <Undo2 className="mr-1 h-3 w-3" />
                          Reverter
                        </Button>
                      )}
                    </div>
                    <div className="text-[var(--text-primary)] mt-1 whitespace-pre-wrap">
                      {r.descricao}
                    </div>
                    {(r.tipo === "editado" || r.tipo === "status_alterado") &&
                      r.meta &&
                      typeof r.meta === "object" && (
                        <div className="mt-1.5 grid grid-cols-1 md:grid-cols-2 gap-1">
                          {Object.entries(r.meta).map(([k, v]) => {
                            if (!Array.isArray(v)) return null;
                            const [a, b] = v as [unknown, unknown];
                            return (
                              <div
                                key={k}
                                className="rounded bg-[var(--bg-elevated)] border border-[var(--bg-border)] px-1.5 py-1 text-[10px]"
                              >
                                <span className="text-[var(--text-muted)]">
                                  {FIELD_LABEL[k] ?? k}:{" "}
                                </span>
                                <span className="line-through text-red-600/70">
                                  {String(a ?? "—")}
                                </span>
                                <span className="mx-1 text-[var(--text-muted)]">→</span>
                                <span className="text-emerald-700">{String(b ?? "—")}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>

      <Dialog open={!!revertTarget} onOpenChange={(o) => !o && setRevertTarget(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Undo2 className="h-4 w-4" /> Reverter alteração
            </DialogTitle>
            <DialogDescription>
              Esta ação irá desfazer a mudança. Um novo registro será criado no histórico com sua
              justificativa.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <div className="rounded border border-[var(--bg-border)] bg-[var(--bg-elevated)] p-2 text-xs text-[var(--text-secondary)]">
              <b>Ação:</b> {revertTarget?.descricao}
              <div className="text-[10px] text-[var(--text-muted)] mt-1">
                {revertTarget?.actor_nome} ·{" "}
                {revertTarget && new Date(revertTarget.criado_em).toLocaleString("pt-BR")}
              </div>
            </div>
            <div>
              <label className="text-xs text-[var(--text-secondary)]">Justificativa *</label>
              <Textarea
                rows={3}
                value={justificativa}
                onChange={(e) => setJustificativa(e.target.value)}
                placeholder="Explique brevemente por que está revertendo…"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRevertTarget(null)} disabled={reverting}>
              Cancelar
            </Button>
            <Button onClick={confirmarReverter} disabled={reverting}>
              {reverting ? "Revertendo…" : "Confirmar reversão"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
