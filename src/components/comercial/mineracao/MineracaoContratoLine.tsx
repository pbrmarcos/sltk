import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { StatLine, type StatItem } from "@/components/data/StatLine";
import { atualizarRestricoes, getMineracaoStatus } from "@/lib/mineracao.functions";

export function useMineracaoStatus() {
  const fetchStatus = useServerFn(getMineracaoStatus);
  return useQuery({ queryKey: ["mineracao-status"], queryFn: () => fetchStatus() });
}

/** Consumo do contrato Penta em uma linha: "bases 3/25 · NCMs 12/30 · empresas 420/1000 · [Atualizar]". */
export function MineracaoContratoLine() {
  const qc = useQueryClient();
  const status = useMineracaoStatus();
  const atualizarFn = useServerFn(atualizarRestricoes);
  const atualizar = useMutation({
    mutationFn: () => atualizarFn({} as never),
    onSuccess: (r) => {
      if (r.erro) toast.error(r.erro);
      else toast.success("Limites atualizados com a Penta.");
      qc.setQueryData(["mineracao-status"], r.erro ? status.data : r);
      void qc.invalidateQueries({ queryKey: ["mineracao-status"] });
    },
    onError: (e: unknown) => toast.error((e as Error)?.message ?? "Falha ao atualizar limites."),
  });

  const r = status.data?.dados ?? null;
  const tone = (used: number, limit: number): StatItem["tone"] =>
    limit > 0 && used / limit >= 1
      ? "danger"
      : limit > 0 && used / limit >= 0.8
        ? "warning"
        : "default";

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px]">
      {status.isLoading ? (
        <span className="text-muted-foreground">Carregando consumo…</span>
      ) : r ? (
        <StatLine
          className="text-[12.5px]"
          items={[
            {
              label: `bases de ${r.bases.limite}`,
              value: r.bases.usadas,
              tone: tone(r.bases.usadas, r.bases.limite),
            },
            {
              label: `NCMs de ${r.rubros.limite}`,
              value: r.rubros.usadas,
              tone: tone(r.rubros.usadas, r.rubros.limite),
            },
            {
              label: `empresas de ${r.empresas.limite}`,
              value: r.empresas.usadas,
              tone: tone(r.empresas.usadas, r.empresas.limite),
            },
            { label: `· contrato ${r.estado} até ${r.vigencia.fim}`, value: "" },
          ]}
        />
      ) : (
        <span className="text-muted-foreground">Consumo do contrato ainda não consultado.</span>
      )}
      <Button
        variant="ghost"
        size="sm"
        className="h-7 px-2 text-xs text-muted-foreground"
        onClick={() => atualizar.mutate()}
        disabled={atualizar.isPending}
        title={
          status.data?.atualizado_em
            ? `Atualizado em ${new Date(status.data.atualizado_em).toLocaleString("pt-BR")}`
            : "Consultar limites na Penta"
        }
      >
        <RefreshCw className={`h-3.5 w-3.5 ${atualizar.isPending ? "animate-spin" : ""}`} />
        Atualizar
      </Button>
    </div>
  );
}
