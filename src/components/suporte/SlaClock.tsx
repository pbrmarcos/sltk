import { Clock, AlertTriangle } from "lucide-react";

/**
 * Mostra o status de SLA: verde (>4h), âmbar (<=4h) ou vermelho (estourado).
 * `slaAt` é o timestamp-limite (sla_resposta_at ou sla_resolucao_at).
 */
export function SlaClock({
  slaAt,
  finalizedAt,
  label,
  compact = false,
}: {
  slaAt: string | null | undefined;
  finalizedAt?: string | null;
  label?: string;
  compact?: boolean;
}) {
  if (!slaAt) return null;
  const now = Date.now();
  const limit = new Date(slaAt).getTime();
  const finalized = finalizedAt ? new Date(finalizedAt).getTime() : null;

  // Se já respondeu/resolveu antes do prazo, mostra "no prazo".
  if (finalized !== null && finalized <= limit) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-emerald-700">
        <Clock className="h-3 w-3" />{" "}
        {compact ? "OK" : label ? `${label}: no prazo` : "SLA cumprido"}
      </span>
    );
  }

  const diffMs = limit - now;
  const overdue = diffMs < 0;
  const soon = !overdue && diffMs < 4 * 60 * 60 * 1000; // <4h
  const tone = overdue ? "text-rose-700" : soon ? "text-amber-700" : "text-emerald-700";
  const Icon = overdue ? AlertTriangle : Clock;

  const abs = Math.abs(diffMs);
  const hrs = Math.floor(abs / 3_600_000);
  const days = Math.floor(hrs / 24);
  const rem = hrs % 24;
  const text = days > 0 ? `${days}d ${rem}h` : `${hrs}h`;
  const suffix = overdue ? "atrasado" : "restantes";

  return (
    <span className={`inline-flex items-center gap-1 text-xs ${tone}`}>
      <Icon className="h-3 w-3" />
      {compact ? `${text} ${suffix}` : `${label ? label + ": " : ""}${text} ${suffix}`}
    </span>
  );
}
