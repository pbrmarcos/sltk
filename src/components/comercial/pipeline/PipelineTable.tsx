import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  STAGE_LABEL,
  type OportunidadeLite,
  type PipelineStage,
} from "@/lib/oportunidades.functions";

const STAGE_TONE: Record<PipelineStage, string> = {
  novo: "bg-[var(--badge-neutral-bg)] text-[var(--badge-neutral-fg)]",
  qualificado: "bg-blue-50 text-blue-700",
  proposta: "bg-indigo-50 text-indigo-700",
  negociacao: "bg-amber-50 text-amber-700",
  ganho: "bg-emerald-50 text-emerald-700",
  perdido: "bg-rose-50 text-rose-700",
};

function formatBRL(v: number | null): string {
  if (!v) return "—";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(v);
}

function ageDays(date: string): number {
  return Math.floor((Date.now() - new Date(date).getTime()) / 86_400_000);
}

function ageTone(age: number) {
  return age > 14 ? "text-rose-600" : age > 7 ? "text-amber-600" : "text-muted-foreground";
}

export function PipelineTable({
  items,
  onRowClick,
}: {
  items: OportunidadeLite[];
  onRowClick: (opp: OportunidadeLite) => void;
}) {
  if (items.length === 0) {
    return (
      <div className="text-center text-sm text-muted-foreground py-12 border rounded-lg bg-muted/20">
        Nenhuma oportunidade.
      </div>
    );
  }
  return (
    <>
      {/* Desktop / tablet: tabela */}
      <div className="hidden md:block border rounded-lg overflow-hidden bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs text-muted-foreground">
              <tr>
                <th className="text-left font-medium px-3 py-2">Empresa</th>
                <th className="text-left font-medium px-3 py-2">Oportunidade</th>
                <th className="text-left font-medium px-3 py-2">Etapa</th>
                <th className="text-right font-medium px-3 py-2">Valor</th>
                <th className="text-left font-medium px-3 py-2 hidden lg:table-cell">
                  Responsável
                </th>
                <th className="text-right font-medium px-3 py-2">Na etapa</th>
              </tr>
            </thead>
            <tbody>
              {items.map((o) => {
                const age = ageDays(o.stage_entered_at);
                return (
                  <tr
                    key={o.id}
                    onClick={() => onRowClick(o)}
                    className="border-t hover:bg-muted/30 cursor-pointer"
                  >
                    <td className="px-3 py-2 font-medium truncate max-w-[220px]">
                      {o.cliente_nome || o.empresa_lead || o.nome_lead || "—"}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      <span className="font-mono text-[11px] mr-2">{o.codigo}</span>
                      {o.titulo}
                    </td>
                    <td className="px-3 py-2">
                      <Badge
                        variant="outline"
                        className={cn("text-[10px]", STAGE_TONE[o.pipeline_stage])}
                      >
                        {STAGE_LABEL[o.pipeline_stage]}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-right whitespace-nowrap">
                      <span className="font-semibold">{formatBRL(o.valor_estimado)}</span>
                      <span className="ml-1 text-[11px] text-muted-foreground">
                        {o.probabilidade}%
                      </span>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground hidden lg:table-cell truncate max-w-[160px]">
                      {o.responsavel_nome}
                    </td>
                    <td className={cn("px-3 py-2 text-right", ageTone(age))}>{age}d</td>
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
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => onRowClick(o)}
              className="w-full text-left border rounded-lg p-3 bg-white space-y-1 active:bg-muted/40"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 font-medium text-sm leading-tight truncate">
                  {o.cliente_nome || o.empresa_lead || o.nome_lead || "—"}
                </div>
                <Badge
                  variant="outline"
                  className={cn("text-[10px] shrink-0", STAGE_TONE[o.pipeline_stage])}
                >
                  {STAGE_LABEL[o.pipeline_stage]}
                </Badge>
              </div>
              <div className="text-xs text-muted-foreground truncate">{o.titulo}</div>
              <div className="flex items-center justify-between text-xs">
                <span>
                  <span className="font-semibold">{formatBRL(o.valor_estimado)}</span>
                  <span className="ml-1 text-muted-foreground">{o.probabilidade}%</span>
                </span>
                <span className={ageTone(age)}>{age}d</span>
              </div>
            </button>
          );
        })}
      </div>
    </>
  );
}
