import { createFileRoute, Link, useRouterState } from "@tanstack/react-router";
import { z } from "zod";
import { ProjetosListPage } from "@/components/engenharia/ProjetosListPage";
import { cn } from "@/lib/utils";

const searchSchema = z.object({
  d: z.enum(["mecanico", "eletrico"]).optional().default("mecanico"),
});

export const Route = createFileRoute("/_authenticated/engenharia/projetos")({
  validateSearch: (s) => searchSchema.parse(s),
  component: ProjetosUnified,
});

function ProjetosUnified() {
  const { d } = Route.useSearch();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  // Guard: só renderiza os tabs quando estamos exatamente nesta rota
  const showTabs = pathname === "/engenharia/projetos";

  return (
    <div className="flex flex-col">
      {showTabs && (
        <div className="mx-auto w-full max-w-7xl px-4 pt-4 sm:px-6 lg:px-8">
          <div className="flex gap-1 border-b border-[var(--bg-border)]">
            {[
              { label: "Mecânicos", value: "mecanico" as const },
              { label: "Elétricos", value: "eletrico" as const },
            ].map((t) => {
              const active = d === t.value;
              return (
                <Link
                  key={t.value}
                  to="/engenharia/projetos"
                  search={{ d: t.value }}
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
        </div>
      )}
      {/* key força reset do estado interno ao alternar disciplina */}
      <ProjetosListPage key={d} disciplina={d} />
    </div>
  );
}
