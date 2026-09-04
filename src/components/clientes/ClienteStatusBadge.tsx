import { useTranslation } from "react-i18next";
import "@/lib/i18n";
import { cn } from "@/lib/utils";
import {
  CLIENTE_STATUS_COLOR,
  clienteStatusLabelKey,
  statusFromLifecycle,
  type ClienteLifecycle,
  type ClienteStatus,
} from "@/lib/clientes.shared";

const VALID: ClienteStatus[] = ["ativo", "suspect", "prospect", "inativo"];

/** Normaliza qualquer valor vindo do banco (status novo ou lifecycle legado). */
export function toClienteStatus(value: string | null | undefined): ClienteStatus {
  if (value && (VALID as string[]).includes(value)) return value as ClienteStatus;
  return statusFromLifecycle(value as ClienteLifecycle | null | undefined);
}

/**
 * Badge único de status do cliente. Nunca renderizar junto de um badge de
 * estágio do funil sem rótulo — são conceitos distintos.
 */
export function ClienteStatusBadge({
  status,
  className,
  withLabel = false,
}: {
  status: string | null | undefined;
  className?: string;
  withLabel?: boolean;
}) {
  const { t } = useTranslation();
  const s = toClienteStatus(status);
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      {withLabel ? (
        <span className="text-[11px] text-[var(--text-muted)]">{t("cliente.statusLabel")}:</span>
      ) : null}
      <span
        className={cn(
          "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium",
          CLIENTE_STATUS_COLOR[s],
        )}
      >
        {t(clienteStatusLabelKey(s))}
      </span>
    </span>
  );
}

/** Hook utilitário para obter o rótulo traduzido do status. */
export function useClienteStatusLabel() {
  const { t } = useTranslation();
  return (status: string | null | undefined) => t(clienteStatusLabelKey(toClienteStatus(status)));
}
