import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { getEquipamentoBomResumo, runSeedEquipamento } from "@/lib/equipamento-bom.functions";
import { DISCIPLINA_LABEL } from "@/lib/disciplina-etapas.shared";
import { Package, ExternalLink, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";

export function BomSummaryCard({ equipamentoId }: { equipamentoId: string }) {
  const qc = useQueryClient();
  const auth = useAuth();
  const isManager = auth.role === "admin" || auth.role === "manager";

  const { data } = useQuery({
    queryKey: ["eq-bom-resumo", equipamentoId],
    queryFn: () => getEquipamentoBomResumo({ data: { equipamento_id: equipamentoId } }),
  });

  const seedMut = useMutation({
    mutationFn: () => runSeedEquipamento({ data: { equipamento_id: equipamentoId } }),
    onSuccess: () => {
      toast.success("Seed aplicado. Etapas e BOM base foram criados.");
      qc.invalidateQueries({ queryKey: ["eq-bom-resumo", equipamentoId] });
      qc.invalidateQueries({ queryKey: ["eq-disc-etapas", equipamentoId] });
      qc.invalidateQueries({ queryKey: ["eq-bom", equipamentoId] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Falha ao aplicar seed."),
  });

  if (!data) return null;
  const buckets = data.buckets ?? {};
  const keys = Object.keys(buckets);

  if (data.totalItens === 0) {
    return (
      <div className="rounded-md border border-dashed border-border/60 bg-card/30 p-3">
        <div className="mb-2 flex items-center gap-2 text-[12px] font-semibold">
          <Package className="h-4 w-4" /> Insumos & Materiais (BOM)
        </div>
        <p className="text-[11.5px] text-muted-foreground">
          Este equipamento ainda não possui etapas nem BOM base cadastrados.
          {isManager
            ? " Você pode aplicar o seed padrão agora."
            : " Peça a um manager para aplicar o seed."}
        </p>
        {isManager && (
          <Button
            size="sm"
            variant="secondary"
            className="mt-2"
            disabled={seedMut.isPending}
            onClick={() => seedMut.mutate()}
          >
            <Sparkles className="mr-1 h-3.5 w-3.5" />
            {seedMut.isPending ? "Aplicando…" : "Aplicar seed"}
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-md border border-border/60 bg-card/50 p-3">
      <div className="mb-2 flex items-center justify-between gap-2 text-[12px] font-semibold">
        <span className="flex items-center gap-2">
          <Package className="h-4 w-4" /> Insumos & Materiais (BOM)
        </span>
        <Link
          to="/compras/solicitacao"
          search={{ equipamento: equipamentoId, origem: "eqp" }}
          className="inline-flex items-center gap-1 text-[11px] font-normal text-primary hover:underline"
        >
          Ver em Compras → Necessidades <ExternalLink className="h-3 w-3" />
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-3 text-[11.5px] sm:grid-cols-4">
        <div>
          <div className="text-[10px] uppercase text-muted-foreground">Itens</div>
          <div className="text-[15px] font-semibold">{data.totalItens}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase text-muted-foreground">Custo estimado</div>
          <div className="text-[15px] font-semibold">
            {Number(data.custoTotal).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          </div>
        </div>
      </div>
      <div className="mt-3 space-y-1.5">
        {keys.map((k) => {
          const b = buckets[k]!;
          const label = DISCIPLINA_LABEL[k as keyof typeof DISCIPLINA_LABEL] ?? k;
          const okPct = b.total ? Math.round((b.aprovados / b.total) * 100) : 0;
          return (
            <div key={k}>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground">{label}</span>
                <span>
                  {b.aprovados}/{b.total} aprovados · {b.pendentes} pendentes
                </span>
              </div>
              <div className="mt-0.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full bg-emerald-500" style={{ width: `${okPct}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
