import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { allEtpsQueryOptions } from "@/lib/engenharia.queries";
import { createEtp } from "@/lib/equipamento-etps.functions";
import {
  ETP_STATUS,
  ETP_STATUS_COLOR,
  ETP_STATUS_LABEL,
  type EtpStatus,
} from "@/lib/engenharia.shared";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/engenharia/etp/")({
  component: EtpListPage,
});

function EtpListPage() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"todos" | EtpStatus>("todos");
  const [page, setPage] = useState(1);
  const [openNovo, setOpenNovo] = useState(false);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery(allEtpsQueryOptions({ q, status, page }));

  const kpis = (data?.rows ?? []).reduce(
    (acc: Record<EtpStatus, number>, r: any) => {
      acc[r.status as EtpStatus] = (acc[r.status as EtpStatus] ?? 0) + 1;
      return acc;
    },
    { rascunho: 0, em_revisao: 0, aprovado: 0, rejeitado: 0, obsoleto: 0 } as Record<
      EtpStatus,
      number
    >,
  );

  return (
    <PageContainer>
      <PageHeader
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "Operações" }, { label: "ETPs" }]}
        title="ETPs — Especificações Técnicas do Produto"
        subtitle="Versionamento por equipamento. Versão aprovada é a referência para fabricação."
        actions={<Button onClick={() => setOpenNovo(true)}>Novo ETP</Button>}
      />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {ETP_STATUS.map((s) => (
          <div
            key={s}
            className="rounded-[var(--radius-lg)] border border-[var(--bg-border)] bg-[var(--bg-surface)] p-4 shadow-[var(--shadow-sm)]"
          >
            <div className="text-[11px] uppercase tracking-wide text-[var(--text-muted)]">
              {ETP_STATUS_LABEL[s]}
            </div>
            <div className="mt-1 text-2xl font-semibold">{kpis[s] ?? 0}</div>
          </div>
        ))}
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_220px]">
        <Input
          placeholder="Buscar por equipamento, código ou cliente…"
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
            {ETP_STATUS.map((s) => (
              <SelectItem key={s} value={s}>
                {ETP_STATUS_LABEL[s]}
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
            Nenhum ETP encontrado.
          </div>
        ) : (
          <ul className="divide-y divide-[var(--bg-border)]">
            {data.rows.map((r: any) => (
              <li key={r.id}>
                <Link
                  to="/engenharia/etp/$id"
                  params={{ id: r.id }}
                  className="grid grid-cols-[120px_1fr_auto_auto] items-center gap-3 p-4 hover:bg-[var(--bg-elevated)]"
                >
                  <span className="font-mono text-xs">{r.cliente_equipamentos?.codigo ?? "—"}</span>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">
                      {r.cliente_equipamentos?.modelo}
                    </div>
                    <div className="truncate text-xs text-[var(--text-muted)]">
                      {r.clientes?.razao_social}
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[11px]">
                    v{r.versao}
                  </Badge>
                  <Badge
                    variant="outline"
                    className={cn("text-[11px]", ETP_STATUS_COLOR[r.status as EtpStatus])}
                  >
                    {ETP_STATUS_LABEL[r.status as EtpStatus]}
                  </Badge>
                </Link>
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

      <NovoEtpDialog
        open={openNovo}
        onClose={() => setOpenNovo(false)}
        onCreated={() => {
          qc.invalidateQueries({ queryKey: ["engenharia", "etps"] });
          setOpenNovo(false);
        }}
      />
    </PageContainer>
  );
}

function NovoEtpDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const navigate = useNavigate();
  const [equipamentoId, setEquipamentoId] = useState<string>("");
  const [busca, setBusca] = useState("");

  const { data: eqps } = useQuery({
    queryKey: ["engenharia", "novo-etp", "equipamentos", busca],
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
    mutationFn: () => createEtp({ data: { equipamento_id: equipamentoId } }),
    onSuccess: (row: any) => {
      toast.success("ETP criado (rascunho).");
      onCreated();
      if (row?.id) navigate({ to: "/engenharia/etp/$id", params: { id: row.id } });
    },
    onError: (e: any) => toast.error(e?.message ?? "Falha ao criar."),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg overflow-hidden">
        <DialogHeader>
          <DialogTitle>Novo ETP</DialogTitle>
        </DialogHeader>
        <div className="min-w-0 space-y-3 text-sm">
          <label className="block space-y-1">
            <span className="text-muted-foreground text-xs">Buscar equipamento</span>
            <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="modelo…" />
          </label>
          <label className="block space-y-1">
            <span className="text-muted-foreground text-xs">Equipamento</span>
            <Select value={equipamentoId} onValueChange={setEquipamentoId}>
              <SelectTrigger className="h-9 w-full min-w-0 [&>span]:block [&>span]:min-w-0 [&>span]:flex-1 [&>span]:truncate [&>span]:text-left">
                <SelectValue placeholder="Selecione…" />
              </SelectTrigger>
              <SelectContent className="max-h-80 max-w-[calc(100vw-3rem)]">
                {(eqps ?? []).map((e: any) => (
                  <SelectItem key={e.id} value={e.id} className="max-w-full">
                    <span className="block truncate">
                      {e.codigo} · {e.modelo}
                      {e.clientes?.razao_social ? ` — ${e.clientes.razao_social}` : ""}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            disabled={!equipamentoId || createMut.isPending}
            onClick={() => createMut.mutate()}
          >
            Criar e abrir editor
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
