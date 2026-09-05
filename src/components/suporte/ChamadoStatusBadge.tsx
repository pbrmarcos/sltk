import { Badge } from "@/components/ui/badge";

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  aberto: { label: "Aberto", className: "bg-sky-100 text-sky-800 border-sky-200" },
  em_analise: { label: "Em análise", className: "bg-amber-100 text-amber-800 border-amber-200" },
  aguardando_cliente: {
    label: "Aguardando cliente",
    className: "bg-violet-100 text-violet-800 border-violet-200",
  },
  resolvido: {
    label: "Resolvido",
    className: "bg-emerald-100 text-emerald-800 border-emerald-200",
  },
  reaberto: { label: "Reaberto", className: "bg-rose-100 text-rose-800 border-rose-200" },
  arquivado: {
    label: "Arquivado",
    className: "bg-neutral-100 text-neutral-700 border-neutral-200",
  },
};

export function ChamadoStatusBadge({ status }: { status: string }) {
  const s = STATUS_MAP[status] ?? { label: status, className: "" };
  return (
    <Badge variant="outline" className={s.className}>
      {s.label}
    </Badge>
  );
}
