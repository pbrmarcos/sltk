import { Badge } from "@/components/ui/badge";

function hoursSince(date: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 3_600_000));
}

export function RestoredOportunidadeBadge({
  restoredAt,
  restoredBy,
}: {
  restoredAt: string | null;
  restoredBy: string | null;
}) {
  if (!restoredAt) return null;
  const hours = hoursSince(restoredAt);
  if (hours >= 48) return null;

  return (
    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-[10px]">
      Restaurado por {restoredBy || "—"} · há {hours < 1 ? "menos de 1h" : `${hours}h`}
    </Badge>
  );
}