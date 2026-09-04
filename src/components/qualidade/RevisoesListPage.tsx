import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { allRevisoesQueryOptions } from "@/lib/engenharia.queries";
import { createRevisao, updateRevisao } from "@/lib/equipamento-revisoes.functions";
import {
  REVISAO_STATUS,
  REVISAO_STATUS_COLOR,
  REVISAO_STATUS_LABEL,
  type RevisaoDisciplina,
  type RevisaoStatus,
} from "@/lib/engenharia.shared";
import { cn } from "@/lib/utils";
import { useIsMounted } from "@/hooks/use-is-mounted";

export function RevisoesListPage({ disciplina }: { disciplina: RevisaoDisciplina }) {
  const qc = useQueryClient();
  const mounted = useIsMounted();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"todos" | RevisaoStatus>("todos");
  const [page, setPage] = useState(1);
  const [openNovo, setOpenNovo] = useState(false);

  const { data, isLoading } = useQuery(allRevisoesQueryOptions({ disciplina, q, status, page }));

  const kpis = (data?.rows ?? []).reduce(
    (acc: Record<RevisaoStatus, number>, r: any) => {
      acc[r.status as RevisaoStatus] = (acc[r.status as RevisaoStatus] ?? 0) + 1;
      return acc;
    },
    { pendente: 0, em_andamento: 0, aprovada: 0, aprovada_com_ressalvas: 0, reprovada: 0 },
  );

  const aprovarMut = useMutation({
    mutationFn: (id: string) =>
      updateRevisao({ data: { id, status: "aprovada", data_inspecao: new Date().toISOString().slice(0, 10) } }),
    onSuccess: () => {
      if (!mounted.current) return;
      toast.success("Revisão aprovada.");
      qc.invalidateQueries({ queryKey: ["qualidade", "revisoes"] });
    },
    onError: (e: any) => {
      if (!mounted.current) return;
      toast.error(e?.message ?? "Falha ao aprovar.");
    },
  });

  const title = disciplina === "mecanica" ? "Revisão Mecânica" : "Revisão Elétrica";
  const subtitle =
    disciplina === "mecanica"
      ? "Inspeções mecânicas pós-montagem por equipamento."
      : "Inspeções elétricas pós-montagem por equipamento.";

  return (
    <PageContainer>
      <PageHeader
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Qualidade" },
          { label: title },
        ]}
        title={title}
        subtitle={subtitle}
        actions={<Button onClick={() => setOpenNovo(true)}>Nova revisão</Button>}
      />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {REVISAO_STATUS.map((s) => (
          <div
            key={s}
            className="rounded-[var(--radius-lg)] border border-[var(--bg-border)] bg-[var(--bg-surface)] p-4 shadow-[var(--shadow-sm)]"
          >
            <div className="text-[11px] uppercase tracking-wide text-[var(--text-muted)]">
              {REVISAO_STATUS_LABEL[s]}
            </div>
            <div className="mt-1 text-2xl font-semibold">{kpis[s] ?? 0}</div>
          </div>
        ))}
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_240px]">
        <Input
          placeholder="Buscar por equipamento ou cliente…"
          value={q}
          onChange={(e) => { setQ(e.target.value); setPage(1); }}
        />
        <Select value={status} onValueChange={(v) => { setStatus(v as typeof status); setPage(1); }}>
          <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os status</SelectItem>
            {REVISAO_STATUS.map((s) => (
              <SelectItem key={s} value={s}>{REVISAO_STATUS_LABEL[s]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-[var(--radius-lg)] border border-[var(--bg-border)] bg-[var(--bg-surface)] shadow-[var(--shadow-sm)]">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-[var(--text-muted)]">Carregando…</div>
        ) : !data?.rows.length ? (
          <div className="p-8 text-center text-sm text-[var(--text-muted)]">
            Nenhuma revisão encontrada.
          </div>
        ) : (
          <ul className="divide-y divide-[var(--bg-border)]">
            {data.rows.map((r: any) => (
              <li
                key={r.id}
                className="grid grid-cols-[120px_1fr_90px_auto_auto] items-center gap-3 p-4 text-sm"
              >
                <span className="font-mono text-xs">{r.cliente_equipamentos?.codigo ?? "—"}</span>
                <div className="min-w-0">
                  <div className="truncate font-medium">{r.cliente_equipamentos?.modelo}</div>
                  <div className="truncate text-xs text-[var(--text-muted)]">
                    {r.clientes?.razao_social} · NCs: {r.nao_conformidades ?? 0} · Itens: {r.itens_verificados ?? 0}/{r.itens_totais ?? 0}
                  </div>
                </div>
                <Badge variant="outline" className="text-[11px]">Rev. {r.numero}</Badge>
                <Badge
                  variant="outline"
                  className={cn("text-[11px]", REVISAO_STATUS_COLOR[r.status as RevisaoStatus])}
                >
                  {REVISAO_STATUS_LABEL[r.status as RevisaoStatus]}
                </Badge>
                {r.status !== "aprovada" && r.status !== "reprovada" ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (confirm("Marcar esta revisão como aprovada?")) aprovarMut.mutate(r.id);
                    }}
                  >
                    Aprovar
                  </Button>
                ) : (
                  <span />
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {data && data.total > 50 && (
        <div className="mt-3 flex items-center justify-between text-xs text-[var(--text-muted)]">
          <span>Total: {data.total}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>
              Anterior
            </Button>
            <Button variant="outline" size="sm" disabled={page * 50 >= data.total} onClick={() => setPage(page + 1)}>
              Próxima
            </Button>
          </div>
        </div>
      )}

      <NovaRevisaoDialog
        disciplina={disciplina}
        open={openNovo}
        onClose={() => setOpenNovo(false)}
        onCreated={() => {
          qc.invalidateQueries({ queryKey: ["qualidade", "revisoes"] });
          if (!mounted.current) return;
          setOpenNovo(false);
        }}
      />
    </PageContainer>
  );
}

function NovaRevisaoDialog({
  disciplina,
  open,
  onClose,
  onCreated,
}: {
  disciplina: RevisaoDisciplina;
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const mounted = useIsMounted();
  const [equipamentoId, setEquipamentoId] = useState<string>("");
  const [numero, setNumero] = useState(1);
  const [busca, setBusca] = useState("");

  const { data: eqps } = useQuery({
    queryKey: ["qualidade", "nova-rev", "equipamentos", busca],
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
      createRevisao({ data: { equipamento_id: equipamentoId, disciplina, numero } }),
    onSuccess: () => {
      if (!mounted.current) return;
      toast.success("Revisão criada.");
      onCreated();
    },
    onError: (e: any) => {
      if (!mounted.current) return;
      toast.error(e?.message ?? "Falha ao criar.");
    },
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            Nova revisão · {disciplina === "mecanica" ? "Mecânica" : "Elétrica"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <label className="block space-y-1">
            <span className="text-muted-foreground text-xs">Buscar equipamento</span>
            <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="modelo…" />
          </label>
          <label className="block space-y-1">
            <span className="text-muted-foreground text-xs">Equipamento</span>
            <Select value={equipamentoId} onValueChange={setEquipamentoId}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Selecione…" /></SelectTrigger>
              <SelectContent className="max-h-80">
                {(eqps ?? []).map((e: any) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.codigo} · {e.modelo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          <label className="block space-y-1">
            <span className="text-muted-foreground text-xs">Número da revisão</span>
            <Input
              type="number"
              min={1}
              value={numero}
              onChange={(e) => setNumero(Math.max(1, parseInt(e.target.value || "1", 10)))}
            />
          </label>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button disabled={!equipamentoId || createMut.isPending} onClick={() => createMut.mutate()}>
            Criar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}