import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  STAGE_LABEL,
  type OportunidadeLite,
  type PipelineStage,
} from "@/lib/oportunidades.functions";

const STAGE_TONE: Record<PipelineStage, string> = {
  novo: "bg-slate-100 text-slate-700",
  qualificado: "bg-blue-50 text-blue-700",
  proposta: "bg-indigo-50 text-indigo-700",
  negociacao: "bg-amber-50 text-amber-700",
  ganho: "bg-emerald-50 text-emerald-700",
  perdido: "bg-rose-50 text-rose-700",
};

function formatBRL(v: number | null): string {
  if (!v) return "—";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v);
}

function ageDays(date: string): number {
  return Math.floor((Date.now() - new Date(date).getTime()) / 86_400_000);
}

export function PipelineTable({
  items,
  onRowClick,
}: {
  items: OportunidadeLite[];
  onRowClick: (opp: OportunidadeLite) => void;
}) {
  if (items.length === 0) {
    return <div className="text-center text-sm text-muted-foreground py-12 border rounded-lg bg-muted/20">Nenhuma oportunidade.</div>;
  }
  return (
    <>
      {/* Desktop / tablet: tabela */}
      <div className="hidden md:block border rounded-lg overflow-hidden bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs text-muted-foreground">
              <tr>
                <th className="text-left font-medium px-3 py-2">Código</th>
                <th className="text-left font-medium px-3 py-2">Título</th>
                <th className="text-left font-medium px-3 py-2">Cliente / Lead</th>
                <th className="text-left font-medium px-3 py-2">Estágio</th>
                <th className="text-right font-medium px-3 py-2">Valor</th>
                <th className="text-right font-medium px-3 py-2">Prob.</th>
                <th className="text-left font-medium px-3 py-2 hidden lg:table-cell">Pilar</th>
                <th className="text-right font-medium px-3 py-2">Idade</th>
              </tr>
            </thead>
            <tbody>
              {items.map((o) => {
                const age = ageDays(o.stage_entered_at);
                const ageTone = age > 14 ? "text-rose-600" : age > 7 ? "text-amber-600" : "text-muted-foreground";
                return (
                  <tr
                    key={o.id}
                    onClick={() => onRowClick(o)}
                    className="border-t hover:bg-muted/30 cursor-pointer"
                  >
                    <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{o.codigo}</td>
                    <td className="px-3 py-2 font-medium">{o.titulo}</td>
                    <td className="px-3 py-2 text-muted-foreground truncate max-w-[200px]">
                      {o.cliente_nome || o.empresa_lead || o.nome_lead || "—"}
                    </td>
                    <td className="px-3 py-2">
                      <Badge variant="outline" className={cn("text-[10px]", STAGE_TONE[o.pipeline_stage])}>
                        {STAGE_LABEL[o.pipeline_stage]}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-right font-semibold">{formatBRL(o.valor_estimado)}</td>
                    <td className="px-3 py-2 text-right text-muted-foreground">{o.probabilidade}%</td>
                    <td className="px-3 py-2 text-muted-foreground hidden lg:table-cell truncate max-w-[160px]">{o.responsavel_nome}</td>
                    <td className={cn("px-3 py-2 text-right", ageTone)}>{age}d</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile: cards empilhados */}
      <div className="md:hidden space-y-2">
        {items.map((o) => {
          const age = ageDays(o.stage_entered_at);
          const ageTone = age > 14 ? "text-rose-600" : age > 7 ? "text-amber-600" : "text-muted-foreground";
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => onRowClick(o)}
              className="w-full text-left border rounded-lg p-3 bg-white space-y-1.5 active:bg-muted/40"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-[10px] font-mono text-muted-foreground">{o.codigo}</div>
                  <div className="font-medium text-sm leading-tight">{o.titulo}</div>
                </div>
                <Badge variant="outline" className={cn("text-[10px] shrink-0", STAGE_TONE[o.pipeline_stage])}>
                  {STAGE_LABEL[o.pipeline_stage]}
                </Badge>
              </div>
              <div className="text-xs text-muted-foreground truncate">
                {o.cliente_nome || o.empresa_lead || o.nome_lead || "—"}
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold">{formatBRL(o.valor_estimado)}</span>
                <span className="text-muted-foreground">{o.probabilidade}%</span>
                <span className={ageTone}>{age}d</span>
              </div>
            </button>
          );
        })}
      </div>
    </>
  );
}