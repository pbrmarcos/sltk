import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { minerarCliente, type MineracaoIA } from "@/lib/minerar-cliente.functions";
import { cn } from "@/lib/utils";

/** Dispara o "Minerar dados" de um cliente e atualiza a ficha ao terminar. */
export function useMinerarCliente(clienteId: string) {
  const qc = useQueryClient();
  const fn = useServerFn(minerarCliente);
  return useMutation({
    mutationFn: () => fn({ data: { cliente_id: clienteId } }),
    onSuccess: async (r) => {
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      await qc.invalidateQueries({ queryKey: ["clientes"] });
      const n = r.preenchidos.length;
      const partes = [
        n
          ? `${n} campo${n > 1 ? "s" : ""} completado${n > 1 ? "s" : ""}`
          : "nada novo para completar",
        r.socios_novos ? `${r.socios_novos} sócio(s)` : null,
        r.mineracao.grade ? `nota ${r.mineracao.grade}` : null,
      ].filter(Boolean);
      toast.success(partes.join(" · "));
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Falha ao minerar dados."),
  });
}

const GRADE_TONE: Record<string, string> = {
  A: "bg-emerald-600 text-white",
  B: "bg-amber-500 text-white",
  C: "bg-slate-400 text-white",
};

/** Linha de progresso + cartão discreto com o último resultado da mineração. */
export function MineracaoResumo({
  pending,
  mineracao,
  mineradoEm,
}: {
  pending: boolean;
  mineracao: MineracaoIA | null | undefined;
  mineradoEm: string | null | undefined;
}) {
  if (pending) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-[12.5px] text-primary">
        <Loader2 className="h-4 w-4 animate-spin" />
        Buscando na Receita, no site e no Google…
      </div>
    );
  }
  if (!mineracao) return null;
  return (
    <div className="flex items-start gap-3 rounded-lg border bg-card px-3 py-2.5 text-[12.5px]">
      {mineracao.grade ? (
        <span
          className={cn(
            "grid h-8 w-8 shrink-0 place-items-center rounded-md text-[15px] font-bold",
            GRADE_TONE[mineracao.grade],
          )}
          title="Nota de aderência ao perfil SLTK"
        >
          {mineracao.grade}
        </span>
      ) : (
        <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
      )}
      <div className="min-w-0 flex-1 space-y-0.5">
        {mineracao.resumo && <p className="text-foreground">{mineracao.resumo}</p>}
        {mineracao.motivo && <p className="text-muted-foreground">{mineracao.motivo}</p>}
        {mineracao.abordagem_sugerida && (
          <p className="text-muted-foreground">
            <span className="font-medium text-foreground">Abordagem: </span>
            {mineracao.abordagem_sugerida}
          </p>
        )}
        {mineradoEm && (
          <p className="text-[11px] text-muted-foreground">
            Minerado em {new Date(mineradoEm).toLocaleDateString("pt-BR")}
          </p>
        )}
      </div>
    </div>
  );
}
