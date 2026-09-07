import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { allMontagensQueryOptions } from "@/lib/engenharia.queries";
import {
  createMontagem,
  updateMontagem,
  getMontagensKpis,
} from "@/lib/equipamento-montagens.functions";
import {
  MONTAGEM_STATUS,
  MONTAGEM_STATUS_COLOR,
  MONTAGEM_STATUS_LABEL,
  type MontagemStatus,
} from "@/lib/engenharia.shared";
import { cn } from "@/lib/utils";

export function MontagemListPage() {
  const qc = useQueryClient();
  const nav = useNavigate();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"todos" | MontagemStatus>("todos");
  const [page, setPage] = useState(1);
  const [openNovo, setOpenNovo] = useState(false);
  const [concluirConfirmId, setConcluirConfirmId] = useState<string | null>(null);
  const [bloquearId, setBloquearId] = useState<string | null>(null);
  const [bloquearMotivo, setBloquearMotivo] = useState("");

  const { data, isLoading } = useQuery(allMontagensQueryOptions({ q, status, page }));

  const { data: kpisData } = useQuery({
    queryKey: ["producao", "montagens", "kpis"],
    queryFn: () => getMontagensKpis(),
  });
  const kpis: Record<MontagemStatus, number> = kpisData ?? {
    nao_iniciada: 0,
    em_andamento: 0,
    concluida: 0,
    bloqueada: 0,
  };

  const concluirMut = useMutation({
    mutationFn: (id: string) =>
      updateMontagem({
        data: {
          id,
          status: "concluida",
          progresso: 100,
          fim_real: new Date().toISOString().slice(0, 10),
        },
      }),
    onSuccess: () => {
      toast.success("Montagem concluída.");
      qc.invalidateQueries({ queryKey: ["producao", "montagens"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Falha ao concluir."),
    onSettled: () => setConcluirConfirmId(null),
  });

  const iniciarMut = useMutation({
    mutationFn: (id: string) =>
      updateMontagem({
        data: { id, status: "em_andamento", inicio_real: new Date().toISOString().slice(0, 10) },
      }),
    onSuccess: () => {
      toast.success("Montagem iniciada.");
      qc.invalidateQueries({ queryKey: ["producao", "montagens"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Falha ao iniciar."),
  });

  const bloquearMut = useMutation({
    mutationFn: ({ id, motivo }: { id: string; motivo: string }) =>
      updateMontagem({ data: { id, status: "bloqueada", observacoes: motivo } }),
    onSuccess: () => {
      toast.success("Montagem bloqueada.");
      qc.invalidateQueries({ queryKey: ["producao", "montagens"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Falha ao bloquear."),
    onSettled: () => {
      setBloquearId(null);
      setBloquearMotivo("");
    },
  });

  const retomarMut = useMutation({
    mutationFn: (id: string) => updateMontagem({ data: { id, status: "em_andamento" } }),
    onSuccess: () => {
      toast.success("Montagem retomada.");
      qc.invalidateQueries({ queryKey: ["producao", "montagens"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Falha ao retomar."),
  });

  const progressoMut = useMutation({
    mutationFn: ({ id, progresso }: { id: string; progresso: number }) =>
      updateMontagem({ data: { id, progresso } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["producao", "montagens"] }),
    onError: (e: any) => toast.error(e?.message ?? "Falha ao atualizar progresso."),
  });

  return (
    <PageContainer>
      <PageHeader
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "Produção" }, { label: "Montagem" }]}
        title="Montagem"
        subtitle="Acompanhamento da montagem de cada equipamento."
        actions={<Button onClick={() => setOpenNovo(true)}>Nova montagem</Button>}
      />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {MONTAGEM_STATUS.map((s) => (
          <div
            key={s}
            className="rounded-[var(--radius-lg)] border border-[var(--bg-border)] bg-[var(--bg-surface)] p-4 shadow-[var(--shadow-sm)]"
          >
            <div className="text-[11px] uppercase tracking-wide text-[var(--text-muted)]">
              {MONTAGEM_STATUS_LABEL[s]}
            </div>
            <div className="mt-1 text-2xl font-semibold">{kpis[s] ?? 0}</div>
          </div>
        ))}
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_240px]">
        <Input
          placeholder="Buscar por equipamento ou cliente…"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
        />
        <Select
          value={status}
          onValueChange={(v) => {
            setStatus(v as typeof status);
            setPage(1);
          }}
        >
          <SelectTrigger className="h-10">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os status</SelectItem>
            {MONTAGEM_STATUS.map((s) => (
              <SelectItem key={s} value={s}>
                {MONTAGEM_STATUS_LABEL[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-[var(--radius-lg)] border border-[var(--bg-border)] bg-[var(--bg-surface)] shadow-[var(--shadow-sm)]">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-[var(--text-muted)]">Carregando…</div>
        ) : !data?.rows.length ? (
          <div className="p-8 text-center text-sm text-[var(--text-muted)]">
            Nenhuma montagem encontrada.
          </div>
        ) : (
          <ul className="divide-y divide-[var(--bg-border)]">
            {data.rows.map((r: any) => (
              <li
                key={r.id}
                className="grid grid-cols-[120px_1fr_120px_auto_auto] items-center gap-3 p-4 text-sm"
              >
                <span className="font-mono text-xs">{r.cliente_equipamentos?.codigo ?? "—"}</span>
                <div className="min-w-0">
                  <div className="truncate font-medium">{r.cliente_equipamentos?.modelo}</div>
                  <div className="truncate text-xs text-[var(--text-muted)]">
                    {r.clientes?.razao_social}
                    {r.inicio_previsto || r.fim_previsto
                      ? ` · ${r.inicio_previsto ?? "—"} → ${r.fim_previsto ?? "—"}`
                      : ""}
                  </div>
                  {Array.isArray(r.equipamento_projetos) && r.equipamento_projetos.length > 0 && (
                    <div className="mt-0.5 flex flex-wrap gap-2">
                      {r.equipamento_projetos.map((p: any) => (
                        <Link
                          key={p.id}
                          to="/engenharia/projetos"
                          search={{
                            d: p.disciplina === "eletrico" ? "eletrico" : "mecanico",
                            open: p.id,
                          }}
                          className="text-[11px] text-primary hover:underline"
                        >
                          Ver projeto ({p.disciplina === "eletrico" ? "elétrico" : "mecânico"})
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-20 overflow-hidden rounded-full bg-[var(--bg-elevated)]">
                    <div className="h-full bg-blue-500" style={{ width: `${r.progresso ?? 0}%` }} />
                  </div>
                  {r.status === "em_andamento" ? (
                    <input
                      type="number"
                      min={0}
                      max={100}
                      defaultValue={r.progresso ?? 0}
                      onBlur={(e) => {
                        const v = Math.max(0, Math.min(100, Number(e.target.value) || 0));
                        if (v !== (r.progresso ?? 0))
                          progressoMut.mutate({ id: r.id, progresso: v });
                      }}
                      className="w-12 rounded border border-[var(--bg-border)] bg-transparent px-1 py-0.5 text-xs tabular-nums outline-none focus:border-primary"
                      title="Progresso (%)"
                    />
                  ) : (
                    <span className="text-xs tabular-nums">{r.progresso ?? 0}%</span>
                  )}
                </div>
                <Badge
                  variant="outline"
                  className={cn("text-[11px]", MONTAGEM_STATUS_COLOR[r.status as MontagemStatus])}
                >
                  {MONTAGEM_STATUS_LABEL[r.status as MontagemStatus]}
                </Badge>
                <div className="flex flex-wrap justify-end gap-1.5">
                  {r.status === "nao_iniciada" && (
                    <>
                      <Button size="sm" variant="outline" onClick={() => iniciarMut.mutate(r.id)}>
                        Iniciar
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setBloquearId(r.id)}>
                        Bloquear
                      </Button>
                    </>
                  )}
                  {r.status === "em_andamento" && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setConcluirConfirmId(r.id)}
                      >
                        Concluir
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setBloquearId(r.id)}>
                        Bloquear
                      </Button>
                    </>
                  )}
                  {r.status === "bloqueada" && (
                    <Button size="sm" variant="outline" onClick={() => retomarMut.mutate(r.id)}>
                      Retomar
                    </Button>
                  )}
                  {r.status === "concluida" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const processoId = (
                          r.equipamento_projetos as
                            | Array<{ processo_id?: string | null }>
                            | undefined
                        )?.find((p) => p.processo_id)?.processo_id;
                        if (!processoId) {
                          toast.error("Nenhum processo vinculado a este equipamento.");
                          return;
                        }
                        nav({ to: "/qualidade/fat/novo", search: { processo: processoId } });
                      }}
                    >
                      Abrir FAT
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {data && data.total > 50 && (
        <div className="mt-3 flex items-center justify-between text-xs text-[var(--text-muted)]">
          <span>Total: {data.total}</span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page * 50 >= data.total}
              onClick={() => setPage(page + 1)}
            >
              Próxima
            </Button>
          </div>
        </div>
      )}

      <NovaMontagemDialog
        open={openNovo}
        onClose={() => setOpenNovo(false)}
        onCreated={() => {
          qc.invalidateQueries({ queryKey: ["producao", "montagens"] });
          setOpenNovo(false);
        }}
      />

      <AlertDialog
        open={!!concluirConfirmId}
        onOpenChange={(o) => !concluirMut.isPending && !o && setConcluirConfirmId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Marcar montagem como concluída?</AlertDialogTitle>
            <AlertDialogDescription>
              O progresso vai pra 100% e a data de término real é registrada hoje.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={concluirMut.isPending}
              onClick={() => concluirConfirmId && concluirMut.mutate(concluirConfirmId)}
            >
              Concluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!bloquearId}
        onOpenChange={(o) => {
          if (bloquearMut.isPending) return;
          if (!o) {
            setBloquearId(null);
            setBloquearMotivo("");
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bloquear montagem</AlertDialogTitle>
            <AlertDialogDescription>
              Descreva o impedimento — a equipe responsável é avisada por e-mail.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            value={bloquearMotivo}
            onChange={(e) => setBloquearMotivo(e.target.value)}
            placeholder="Motivo do bloqueio…"
            rows={3}
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={bloquearMut.isPending || !bloquearMotivo.trim()}
              onClick={(e) => {
                if (!bloquearMotivo.trim() || !bloquearId) {
                  e.preventDefault();
                  return;
                }
                bloquearMut.mutate({ id: bloquearId, motivo: bloquearMotivo.trim() });
              }}
            >
              Bloquear
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageContainer>
  );
}

function NovaMontagemDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [equipamentoId, setEquipamentoId] = useState<string>("");
  const [inicio, setInicio] = useState<string>("");
  const [fim, setFim] = useState<string>("");
  const [busca, setBusca] = useState("");

  const { data: eqps } = useQuery({
    queryKey: ["producao", "nova-montagem", "equipamentos", busca],
    queryFn: async () => {
      let q = supabase
        .from("cliente_equipamentos")
        .select("id, codigo, modelo, clientes(razao_social)")
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(50);
      if (busca.trim()) q = q.ilike("modelo", `%${busca.trim()}%`);
      const { data } = await q;
      return data ?? [];
    },
    enabled: open,
  });

  const createMut = useMutation({
    mutationFn: () =>
      createMontagem({
        data: {
          equipamento_id: equipamentoId,
          inicio_previsto: inicio || null,
          fim_previsto: fim || null,
        },
      }),
    onSuccess: () => {
      toast.success("Montagem criada.");
      onCreated();
    },
    onError: (e: any) => toast.error(e?.message ?? "Falha ao criar."),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nova montagem</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <label className="block space-y-1">
            <span className="text-muted-foreground text-xs">Buscar equipamento</span>
            <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="modelo…" />
          </label>
          <label className="block space-y-1">
            <span className="text-muted-foreground text-xs">Equipamento</span>
            <Select value={equipamentoId} onValueChange={setEquipamentoId}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Selecione…" />
              </SelectTrigger>
              <SelectContent className="max-h-80">
                {(eqps ?? []).map((e: any) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.codigo} · {e.modelo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1">
              <span className="text-muted-foreground text-xs">Início previsto</span>
              <Input type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} />
            </label>
            <label className="block space-y-1">
              <span className="text-muted-foreground text-xs">Fim previsto</span>
              <Input type="date" value={fim} onChange={(e) => setFim(e.target.value)} />
            </label>
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            disabled={!equipamentoId || createMut.isPending}
            onClick={() => createMut.mutate()}
          >
            Criar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
