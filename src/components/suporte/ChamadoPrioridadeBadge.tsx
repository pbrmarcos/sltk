import { Badge } from "@/components/ui/badge";

const MAP: Record<string, { label: string; className: string }> = {
  baixa: { label: "Baixa", className: "bg-[var(--badge-neutral-bg)] text-[var(--badge-neutral-fg)] border-[var(--badge-neutral-border)]" },
  media: { label: "Média", className: "bg-sky-100 text-sky-800 border-sky-200" },
  alta: { label: "Alta", className: "bg-amber-100 text-amber-800 border-amber-200" },
  critica: { label: "Crítica", className: "bg-rose-100 text-rose-800 border-rose-200" },
};

export function ChamadoPrioridadeBadge({ prioridade }: { prioridade: string | null | undefined }) {
  const s = MAP[prioridade ?? "media"] ?? MAP.media;
  return (
    <Badge variant="outline" className={s.className}>
      {s.label}
    </Badge>
  );
}
