import { Link, useRouterState } from "@tanstack/react-router";
import { History, ShieldCheck } from "lucide-react";
import { CATEGORIES } from "@/content/docs/types";
import { DocSearch } from "./DocSearch";

export function DocsShell({ children }: { children: React.ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
      <aside className="hidden lg:block">
        <nav className="sticky top-4 rounded-[var(--radius-lg)] border border-[var(--bg-border)] bg-[var(--bg-surface)] p-2">
          <div className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            Categorias
          </div>
          <ul className="space-y-0.5">
            {CATEGORIES.map((c) => {
              const href = `/ajuda/documentacao/${c.id}`;
              const active = pathname.startsWith(href);
              return (
                <li key={c.id}>
                  <Link
                    to={href}
                    className={`block rounded px-2 py-1.5 text-sm ${
                      active
                        ? "bg-[var(--bg-elevated)] font-medium text-[var(--text-primary)]"
                        : "text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]"
                    }`}
                  >
                    {c.label}
                  </Link>
                </li>
              );
            })}
          </ul>
          <div className="mt-2 border-t border-[var(--bg-border)] pt-2">
            <Link
              to="/ajuda/atualizacoes"
              className={`flex items-center gap-2 rounded px-2 py-1.5 text-sm ${
                pathname.startsWith("/ajuda/atualizacoes")
                  ? "bg-[var(--bg-elevated)] font-medium text-[var(--text-primary)]"
                  : "text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]"
              }`}
            >
              <History className="h-4 w-4" /> Atualizações
            </Link>
            <Link
              to="/ajuda/auditoria"
              className={`mt-1 flex items-center gap-2 rounded px-2 py-1.5 text-sm ${
                pathname.startsWith("/ajuda/auditoria")
                  ? "bg-[var(--bg-elevated)] font-medium text-[var(--text-primary)]"
                  : "text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]"
              }`}
            >
              <ShieldCheck className="h-4 w-4" /> Auditoria
            </Link>
          </div>
        </nav>
      </aside>
      <div className="min-w-0 space-y-4">
        {pathname !== "/ajuda/documentacao" && (
          <DocSearch placeholder="Buscar em toda a documentação…" mode="compact" maxResults={10} />
        )}
        {children}
      </div>

    </div>
  );
}

