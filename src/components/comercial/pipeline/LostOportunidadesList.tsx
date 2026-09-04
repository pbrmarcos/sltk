import { RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { type OportunidadeLite } from "@/lib/oportunidades.functions";
import { useRestoreOportunidade } from "@/lib/oportunidades.queries";

function formatBRL(v: number | null): string {
  if (!v) return "—";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v);
}

function formatDate(date: string | null): string {
  if (!date) return "—";
  return new Date(date).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export function LostOportunidadesList({
  items,
  onOpen,
}: {
  items: OportunidadeLite[];
  onOpen: (opp: OportunidadeLite) => void;
}) {
  const restore = useRestoreOportunidade();
  const total = items.reduce((sum, o) => sum + (o.valor_estimado ?? 0), 0);

  if (items.length === 0) {
    return <div className="text-center text-sm text-muted-foreground py-12 border rounded-lg bg-muted/20">Nenhuma oportunidade perdida.</div>;
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <div className="rounded-lg border bg-white p-3">
          <div className="text-xs text-muted-foreground">Perdidas</div>
          <div className="text-xl font-bold">{items.length}</div>
        </div>
        <div className="rounded-lg border bg-white p-3">
          <div className="text-xs text-muted-foreground">Valor perdido</div>
          <div className="text-xl font-bold">{formatBRL(total)}</div>
        </div>
        <div className="rounded-lg border bg-white p-3 col-span-2 md:col-span-1">
          <div className="text-xs text-muted-foreground">Última perda</div>
          <div className="text-sm font-semibold truncate">{formatDate(items[0]?.lost_at ?? null)}</div>
        </div>
      </div>

      <div className="hidden md:block border rounded-lg overflow-hidden bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs text-muted-foreground">
              <tr>
                <th className="text-left font-medium px-3 py-2">Oportunidade</th>
                <th className="text-left font-medium px-3 py-2">Cliente / Lead</th>
                <th className="text-right font-medium px-3 py-2">Valor</th>
                <th className="text-left font-medium px-3 py-2">Quem marcou</th>
                <th className="text-left font-medium px-3 py-2">Quando</th>
                <th className="text-left font-medium px-3 py-2 hidden lg:table-cell">Motivo</th>
                <th className="text-right font-medium px-3 py-2">Ações</th>
              </tr>
            </thead>
            <tbody>
              {items.map((o) => (
                <tr key={o.id} className="border-t hover:bg-muted/30">
                  <td className="px-3 py-2 cursor-pointer" onClick={() => onOpen(o)}>
                    <div className="font-medium">{o.titulo}</div>
                    <div className="font-mono text-[11px] text-muted-foreground">{o.codigo}</div>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground truncate max-w-[200px]">{o.cliente_nome || o.empresa_lead || o.nome_lead || "—"}</td>
                  <td className="px-3 py-2 text-right font-semibold">{formatBRL(o.valor_estimado)}</td>
                  <td className="px-3 py-2 text-muted-foreground">{o.lost_by_nome || "—"}</td>
                  <td className="px-3 py-2 text-muted-foreground">{formatDate(o.lost_at)}</td>
                  <td className="px-3 py-2 text-muted-foreground hidden lg:table-cell max-w-[260px] truncate" title={o.lost_reason ?? ""}>{o.lost_reason || "—"}</td>
                  <td className="px-3 py-2 text-right">
                    <Button size="sm" variant="outline" disabled={restore.isPending} onClick={() => restore.mutate({ id: o.id })}>
                      <RotateCcw className="h-3.5 w-3.5 mr-1" /> Restaurar
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="md:hidden space-y-2">
        {items.map((o) => (
          <div key={o.id} className="rounded-lg border bg-white p-3 space-y-2">
            <button type="button" className="w-full text-left" onClick={() => onOpen(o)}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-[10px] font-mono text-muted-foreground">{o.codigo}</div>
                  <div className="font-medium text-sm leading-tight">{o.titulo}</div>
                </div>
                <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 text-[10px]">Perdida</Badge>
              </div>
            </button>
            <div className="text-xs text-muted-foreground truncate">{o.cliente_nome || o.empresa_lead || o.nome_lead || "—"}</div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div><span className="text-muted-foreground">Valor</span><div className="font-semibold">{formatBRL(o.valor_estimado)}</div></div>
              <div><span className="text-muted-foreground">Quando</span><div>{formatDate(o.lost_at)}</div></div>
            </div>
            <div className="text-xs text-muted-foreground">Marcada por {o.lost_by_nome || "—"}</div>
            <div className={cn("text-xs rounded border border-rose-100 bg-rose-50 p-2", !o.lost_reason && "text-muted-foreground")}>{o.lost_reason || "Sem motivo registrado"}</div>
            <Button size="sm" variant="outline" className="w-full" disabled={restore.isPending} onClick={() => restore.mutate({ id: o.id })}>
              <RotateCcw className="h-3.5 w-3.5 mr-1" /> Restaurar
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}