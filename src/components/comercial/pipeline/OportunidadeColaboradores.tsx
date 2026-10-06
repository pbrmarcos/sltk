import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  listOportunidadeColaboradores,
  convidarColaborador,
  revogarColaborador,
} from "@/lib/oportunidade-colaboradores.functions";
import { listSalesUsers } from "@/lib/checklist.functions";
import { cn } from "@/lib/utils";

function iniciais(nome: string | null | undefined) {
  return (nome ?? "?")
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/**
 * Fileira de avatares dos colaboradores da oportunidade com um "+" que abre o
 * convite. Substitui o card lateral "Colaboradores".
 */
export function OportunidadeColaboradores({
  oppId,
  responsavelNome,
  locked,
}: {
  oppId: string;
  responsavelNome: string;
  locked?: boolean;
}) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [novoId, setNovoId] = useState("");

  const listFn = useServerFn(listOportunidadeColaboradores);
  const convidarFn = useServerFn(convidarColaborador);
  const revogarFn = useServerFn(revogarColaborador);
  const listSalesFn = useServerFn(listSalesUsers);

  const colabQ = useQuery({
    queryKey: ["op-colaboradores", oppId],
    queryFn: () => listFn({ data: { oportunidade_id: oppId } }),
  });
  const salesQ = useQuery({
    queryKey: ["sales-users-comercial"],
    queryFn: () => listSalesFn(),
    enabled: open,
  });
  const ativos = (colabQ.data ?? []).filter((c) => !c.revogado_em);

  const convidar = useMutation({
    mutationFn: (user_id: string) => convidarFn({ data: { oportunidade_id: oppId, user_id } }),
    onSuccess: () => {
      setNovoId("");
      qc.invalidateQueries({ queryKey: ["op-colaboradores", oppId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const revogar = useMutation({
    mutationFn: (id: string) => revogarFn({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["op-colaboradores", oppId] }),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex items-center -space-x-1.5 rounded-full hover:opacity-90"
          title={`Responsável: ${responsavelNome}${ativos.length ? ` · +${ativos.length} colaborador(es)` : ""}`}
          aria-label="Colaboradores"
        >
          <Avatar nome={responsavelNome} className="bg-primary text-primary-foreground" />
          {ativos.slice(0, 3).map((c) => (
            <Avatar key={c.id} nome={c.user_nome} />
          ))}
          {ativos.length > 3 && <Avatar nome={`+${ativos.length - 3}`} raw />}
          {!locked && (
            <span className="grid h-7 w-7 place-items-center rounded-full border border-dashed bg-background text-muted-foreground">
              <Plus className="h-3.5 w-3.5" />
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 space-y-3 text-sm">
        <div>
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
            Responsável
          </div>
          <div className="font-medium">{responsavelNome}</div>
        </div>
        <div className="space-y-1.5">
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
            Colaboradores
          </div>
          {ativos.length === 0 && (
            <p className="text-xs text-muted-foreground">Ninguém convidado ainda.</p>
          )}
          {ativos.map((c) => (
            <div key={c.id} className="flex items-center justify-between gap-2 text-[13px]">
              <span className="truncate">{c.user_nome ?? c.user_email}</span>
              {!locked && (
                <button
                  type="button"
                  className="text-muted-foreground hover:text-destructive"
                  aria-label="Remover colaborador"
                  disabled={revogar.isPending}
                  onClick={() => revogar.mutate(c.id)}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
        {!locked && (
          <div className="flex items-center gap-2">
            <Select value={novoId} onValueChange={setNovoId}>
              <SelectTrigger className="h-8 flex-1 text-xs">
                <SelectValue placeholder="Convidar…" />
              </SelectTrigger>
              <SelectContent>
                {(salesQ.data ?? [])
                  .filter((u) => !ativos.some((c) => c.user_id === u.id))
                  .map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.nome}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              className="h-8"
              disabled={!novoId || convidar.isPending}
              onClick={() => convidar.mutate(novoId)}
            >
              {convidar.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Convidar"}
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

function Avatar({
  nome,
  className,
  raw,
}: {
  nome: string | null | undefined;
  className?: string;
  raw?: boolean;
}) {
  return (
    <span
      className={cn(
        "grid h-7 w-7 place-items-center rounded-full border-2 border-background bg-muted text-[10px] font-semibold text-foreground",
        className,
      )}
      title={nome ?? undefined}
    >
      {raw ? nome : iniciais(nome)}
    </span>
  );
}
