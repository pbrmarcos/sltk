import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatLine } from "@/components/data/StatLine";
import { type OportunidadeLite } from "@/lib/oportunidades.functions";
import { useRestoreOportunidade } from "@/lib/oportunidades.queries";

function formatBRL(v: number | null): string {
  if (!v) return "—";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(v);
}

function formatDate(date: string | null): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("pt-BR");
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
    return (
      <div className="text-center text-sm text-muted-foreground py-12 border rounded-lg bg-muted/20">
        Nenhuma oportunidade perdida.
      </div>
    );
  }

  const restaurar = (o: OportunidadeLite) => (
    <Button
      size="sm"
      variant="outline"
      className="h-7 text-xs"
      disabled={restore.isPending}
      onClick={(e) => {
        e.stopPropagation();
        restore.mutate({ id: o.id });
      }}
    >
      <RotateCcw className="h-3.5 w-3.5 mr-1" /> Restaurar
    </Button>
  );

  return (
    <div className="space-y-3">
      <StatLine
        items={[
          { label: "perdidas", value: items.length },
          { label: "em valor", value: formatBRL(total), tone: "danger" },
          { label: "última perda", value: formatDate(items[0]?.lost_at ?? null) },
        ]}
      />

      <div className="hidden md:block border rounded-lg overflow-hidden bg-white">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs text-muted-foreground">
            <tr>
              <th className="text-left font-medium px-3 py-2">Empresa</th>
              <th className="text-left font-medium px-3 py-2">Oportunidade</th>
              <th className="text-right font-medium px-3 py-2">Valor</th>
              <th className="text-left font-medium px-3 py-2">Quando</th>
              <th className="text-left font-medium px-3 py-2 hidden lg:table-cell">Motivo</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {items.map((o) => (
              <tr
                key={o.id}
                className="border-t hover:bg-muted/30 cursor-pointer"
                onClick={() => onOpen(o)}
              >
                <td className="px-3 py-2 font-medium truncate max-w-[220px]">
                  {o.cliente_nome || o.empresa_lead || o.nome_lead || "—"}
                </td>
                <td className="px-3 py-2 text-muted-foreground">
                  <span className="font-mono text-[11px] mr-2">{o.codigo}</span>
                  {o.titulo}
                </td>
                <td className="px-3 py-2 text-right font-semibold">
                  {formatBRL(o.valor_estimado)}
                </td>
                <td
                  className="px-3 py-2 text-muted-foreground whitespace-nowrap"
                  title={o.lost_by_nome ? `Marcada por ${o.lost_by_nome}` : undefined}
                >
                  {formatDate(o.lost_at)}
                </td>
                <td
                  className="px-3 py-2 text-muted-foreground hidden lg:table-cell max-w-[280px] truncate"
                  title={o.lost_reason ?? ""}
                >
                  {o.lost_reason || "—"}
                </td>
                <td className="px-3 py-2 text-right">{restaurar(o)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="md:hidden space-y-2">
        {items.map((o) => (
          <div
            key={o.id}
            className="rounded-lg border bg-white p-3 space-y-1"
            onClick={() => onOpen(o)}
          >
            <div className="font-medium text-sm leading-tight truncate">
              {o.cliente_nome || o.empresa_lead || o.nome_lead || "—"}
            </div>
            <div className="text-xs text-muted-foreground truncate">{o.titulo}</div>
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold">{formatBRL(o.valor_estimado)}</span>
              <span className="text-muted-foreground">{formatDate(o.lost_at)}</span>
            </div>
            {o.lost_reason && (
              <p className="text-xs text-muted-foreground line-clamp-2">{o.lost_reason}</p>
            )}
            <div className="pt-1">{restaurar(o)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
