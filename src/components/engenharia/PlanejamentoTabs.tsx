import { Link, useRouterState } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

/**
 * Nav de abas compartilhada entre as telas de Gantt/Etapas e H/H.
 * Mantém rotas distintas (URL estável) mas unifica visualmente.
 */
export function PlanejamentoTabs() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const tabs = [
    { label: "Gantt / Etapas", to: "/engenharia/etapas" as const },
    { label: "H/H Estimado vs Real", to: "/engenharia/hh" as const },
  ];
  return (
    <div className="mb-4 flex gap-1 border-b border-[var(--bg-border)]">
      {tabs.map((t) => {
        const active = pathname === t.to;
        return (
          <Link
            key={t.to}
            to={t.to}
            className={cn(
              "-mb-px border-b-2 px-4 py-2 text-sm transition-colors",
              active
                ? "border-[var(--primary)] font-medium text-[var(--text-primary)]"
                : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]",
            )}
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
