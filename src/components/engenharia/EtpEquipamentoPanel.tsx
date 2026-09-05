import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { FileSignature, Link2, Loader2, Plus, Search } from "lucide-react";
import { equipamentoEtpsQueryOptions } from "@/lib/engenharia.queries";
import {
  buscarEtpsParaVincular,
  createEtp,
  vincularEtpAoEquipamento,
} from "@/lib/equipamento-etps.functions";
import { ETP_STATUS_LABEL } from "@/lib/engenharia.shared";
import { useAuth } from "@/hooks/use-auth";

type EtpBusca = {
  id: string;
  versao: number;
  status: string;
  updated_at: string;
  cliente_equipamentos?: { codigo?: string | null; modelo?: string | null } | null;
  clientes?: { codigo?: string | null; razao_social?: string | null } | null;
};

export function EtpEquipamentoPanel({ equipamentoId }: { equipamentoId: string }) {
  const qc = useQueryClient();
  const { role } = useAuth();
  const podeEditar = role === "admin" || role === "manager" || role === "engineer";
  const listQ = useQuery(equipamentoEtpsQueryOptions(equipamentoId));
  const [buscaOpen, setBuscaOpen] = useState(false);

  const criar = useMutation({
    mutationFn: () => createEtp({ data: { equipamento_id: equipamentoId } }),
    onSuccess: () => {
      toast.success("Novo ETP criado.");
      qc.invalidateQueries({ queryKey: ["engenharia", "etps"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const etps = (listQ.data ?? []) as Array<{
    id: string;
    versao: number;
    status: string;
    updated_at: string;
    aprovado_em: string | null;
  }>;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-sm font-semibold">ETPs vinculados</h3>
        <span className="text-xs text-muted-foreground">{etps.length} registro(s)</span>
        <div className="ml-auto flex gap-2">
          {podeEditar && (
            <>
              <Dialog open={buscaOpen} onOpenChange={setBuscaOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline">
                    <Search className="mr-1.5 h-4 w-4" /> Buscar ETP
                  </Button>
                </DialogTrigger>
                <BuscarEtpDialog equipamentoId={equipamentoId} onDone={() => setBuscaOpen(false)} />
              </Dialog>
              <Button size="sm" onClick={() => criar.mutate()} disabled={criar.isPending}>
                {criar.isPending ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="mr-1.5 h-4 w-4" />
                )}
                Novo ETP
              </Button>
            </>
          )}
        </div>
      </div>

      {listQ.isLoading ? (
        <p className="text-xs text-muted-foreground">Carregando…</p>
      ) : etps.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-muted/20 p-6 text-center">
          <FileSignature className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
          <p className="text-[13px] font-medium">Nenhum ETP vinculado</p>
          <p className="mt-1 text-[12.5px] text-muted-foreground">
            Crie um novo ETP ou vincule um existente do mesmo cliente.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {etps.map((e) => (
            <li key={e.id} className="flex items-center gap-3 px-3 py-2.5">
              <Badge variant="outline">v{e.versao}</Badge>
              <span className="text-[13px]">
                {ETP_STATUS_LABEL[e.status as keyof typeof ETP_STATUS_LABEL] ?? e.status}
              </span>
              <span className="ml-auto text-xs text-muted-foreground">
                {new Date(e.updated_at).toLocaleDateString("pt-BR")}
              </span>
              <Button asChild size="sm" variant="ghost">
                <Link to="/engenharia/etp/$id" params={{ id: e.id }}>
                  Abrir
                </Link>
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function BuscarEtpDialog({ equipamentoId, onDone }: { equipamentoId: string; onDone: () => void }) {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const buscaQ = useQuery({
    queryKey: ["etp-busca", q, equipamentoId],
    queryFn: () => buscarEtpsParaVincular({ data: { q, excluir_equipamento_id: equipamentoId } }),
  });

  const vincular = useMutation({
    mutationFn: (etpId: string) =>
      vincularEtpAoEquipamento({ data: { etp_id: etpId, equipamento_id: equipamentoId } }),
    onSuccess: () => {
      toast.success("ETP vinculado ao equipamento.");
      qc.invalidateQueries({ queryKey: ["engenharia"] });
      onDone();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rows = (buscaQ.data ?? []) as EtpBusca[];

  return (
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle>Buscar ETP</DialogTitle>
        <DialogDescription>
          Localize por código do equipamento, cliente ou versão e vincule ao equipamento atual.
        </DialogDescription>
      </DialogHeader>
      <Input
        autoFocus
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Ex.: DEMO-EQP-004, Verde Valle, v2…"
      />
      <div className="max-h-[50vh] overflow-y-auto rounded-lg border border-border">
        {buscaQ.isLoading ? (
          <p className="p-4 text-xs text-muted-foreground">Buscando…</p>
        ) : rows.length === 0 ? (
          <p className="p-4 text-xs text-muted-foreground">Nenhum ETP encontrado.</p>
        ) : (
          <ul className="divide-y divide-border">
            {rows.map((r) => (
              <li key={r.id} className="flex items-center gap-3 px-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium">
                    {r.cliente_equipamentos?.codigo ?? "—"} · v{r.versao}
                    {r.cliente_equipamentos?.modelo ? ` — ${r.cliente_equipamentos.modelo}` : ""}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {r.clientes?.razao_social ?? "Cliente não informado"} ·{" "}
                    {ETP_STATUS_LABEL[r.status as keyof typeof ETP_STATUS_LABEL] ?? r.status}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={vincular.isPending}
                  onClick={() => vincular.mutate(r.id)}
                >
                  <Link2 className="mr-1.5 h-4 w-4" /> Vincular
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </DialogContent>
  );
}
