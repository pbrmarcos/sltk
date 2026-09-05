import { Link } from "@tanstack/react-router";
import { StatusBadge, type BadgeTone } from "@/components/ui/status-badge";

export type StatusListItem = {
  id: string;
  titulo: string;
  meta?: string;
  status: string;
  tone: BadgeTone;
  to?: string;
};

export function StatusList({
  items,
  empty = "Sem itens.",
}: {
  items: StatusListItem[];
  empty?: string;
}) {
  if (!items.length) {
    return <div className="py-6 text-center text-[12px] text-[var(--text-muted)]">{empty}</div>;
  }
  return (
    <ul className="divide-y divide-[var(--bg-border)]">
      {items.map((it) => {
        const inner = (
          <div className="flex items-center justify-between gap-3 py-2.5">
            <div className="min-w-0">
              <div className="truncate text-[13px] font-medium text-[var(--text-primary)]">
                {it.titulo}
              </div>
              {it.meta && (
                <div className="truncate text-[11.5px] text-[var(--text-muted)]">{it.meta}</div>
              )}
            </div>
            <StatusBadge tone={it.tone}>{it.status}</StatusBadge>
          </div>
        );
        return (
          <li key={it.id}>
            {it.to ? (
              <Link
                to={it.to}
                className="block rounded-md px-1 transition-colors hover:bg-[var(--bg-elevated)]"
              >
                {inner}
              </Link>
            ) : (
              inner
            )}
          </li>
        );
      })}
    </ul>
  );
}
