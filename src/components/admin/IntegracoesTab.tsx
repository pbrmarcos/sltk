import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { queryOptions } from "@tanstack/react-query";
import { listIntegracoes, toggleIntegracao } from "@/lib/integracoes.functions";
import { Flag } from "@/components/ui/flag";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

const integracoesQO = queryOptions({
  queryKey: ["admin", "integracoes"],
  queryFn: () => listIntegracoes(),
});

export function IntegracoesTab() {
  const qc = useQueryClient();
  const list = useQuery(integracoesQO);
  const toggleFn = useServerFn(toggleIntegracao);
  const m = useMutation({
    mutationFn: (vars: { provider: string; ativo: boolean }) => toggleFn({ data: vars }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "integracoes"] });
      toast.success("Integração atualizada.");
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Falha ao atualizar."),
  });

  if (list.isLoading) {
    return (
      <div className="flex justify-center p-10">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  const rows = list.data ?? [];

  return (
    <div className="space-y-3">
      <p className="text-sm text-[var(--text-muted)]">
        Ative ou desative provedores de autocompletar de documento fiscal por país. Provedores
        marcados como "Futuro" ainda não estão disponíveis.
      </p>
      <div className="rounded-[var(--radius-lg)] border border-[var(--bg-border)] bg-[var(--bg-surface)] shadow-[var(--shadow-sm)] divide-y divide-[var(--bg-border)]">
        {rows.map((r) => {
          const disabled = !r.disponivel;
          return (
            <div key={r.provider} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="flex min-w-0 items-start gap-3">
                <span className="mt-0.5">
                  <Flag code={r.pais} size={22} />
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-[13.5px] font-semibold text-[var(--text-primary)]">
                      {r.nome}
                    </h3>
                    <code className="rounded bg-muted px-1.5 py-0.5 text-[10.5px] font-mono text-muted-foreground">
                      {r.provider}
                    </code>
                    {disabled && (
                      <Badge variant="secondary" className="text-[10px]">
                        Futuro
                      </Badge>
                    )}
                    {r.requer_chave && (
                      <Badge variant="outline" className="text-[10px]">
                        Requer chave
                      </Badge>
                    )}
                  </div>
                  {r.descricao && (
                    <p className="mt-0.5 text-[12px] text-[var(--text-muted)]">{r.descricao}</p>
                  )}
                </div>
              </div>
              <Switch
                checked={r.ativo}
                disabled={disabled || m.isPending}
                onCheckedChange={(v) => m.mutate({ provider: r.provider, ativo: v })}
                aria-label={`Ativar ${r.nome}`}
              />
            </div>
          );
        })}
        {rows.length === 0 && (
          <p className="p-6 text-center text-sm text-muted-foreground">
            Nenhum provedor cadastrado.
          </p>
        )}
      </div>
    </div>
  );
}
