import { Badge } from "@/components/ui/badge";

const MAP: Record<string, { label: string; className: string }> = {
  suporte: { label: "Suporte", className: "bg-indigo-100 text-indigo-800 border-indigo-200" },
  site_publico: { label: "Suporte", className: "bg-indigo-100 text-indigo-800 border-indigo-200" },
  contato_site: {
    label: "Site (contato)",
    className: "bg-emerald-100 text-emerald-800 border-emerald-200",
  },
  interno: { label: "Interno", className: "bg-[var(--badge-neutral-bg)] text-[var(--badge-neutral-fg)] border-[var(--badge-neutral-border)]" },
};

export function ChamadoOrigemBadge({ origem }: { origem: string | null | undefined }) {
  const s = MAP[origem ?? "site_publico"] ?? MAP.site_publico;
  return (
    <Badge variant="outline" className={s.className}>
      {s.label}
    </Badge>
  );
}
