import { createFileRoute, Link, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { ProjetosListPage } from "@/components/engenharia/ProjetosListPage";
import { listInsumosPendentesAprovacao } from "@/lib/projeto-insumos.functions";
import { cn } from "@/lib/utils";

const searchSchema = z.object({
  d: z.enum(["mecanico", "eletrico"]).optional().default("mecanico"),
  open: z.string().uuid().optional(),
});

export const Route = createFileRoute("/_authenticated/engenharia/projetos")({
  validateSearch: (s) => searchSchema.parse(s),
  component: ProjetosUnified,
});

function ProjetosUnified() {
  const { d, open } = Route.useSearch();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  // Guard: só renderiza os tabs quando estamos exatamente nesta rota
  const showTabs = pathname === "/engenharia/projetos";

  // Só admin/manager conseguem decidir aprovação — pra quem não pode, o
  // servidor recusa e a query fica vazia/erro, então não mostramos nada.
  const { data: pendentes = [] } = useQuery({
    queryKey: ["engenharia", "insumos-pendentes-aprovacao"],
    queryFn: () => listInsumosPendentesAprovacao(),
    retry: false,
    enabled: showTabs,
  });

  return (
    <div className="flex flex-col">
      {showTabs && pendentes.length > 0 && (
        <div className="mx-auto w-full max-w-7xl px-4 pt-4 sm:px-6 lg:px-8">
          <div className="rounded-[var(--radius-lg)] border border-amber-200 bg-amber-50 p-3 text-xs dark:border-amber-900 dark:bg-amber-950/30">
            <div className="mb-2 font-semibold text-amber-800 dark:text-amber-200">
              {pendentes.length} insumo(ns) aguardando aprovação
            </div>
            <ul className="space-y-1">
              {pendentes.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-2">
                  <span className="truncate text-amber-800 dark:text-amber-200">
                    {p.descricao} — {p.quantidade} {p.unidade}
                    {p.equipamento_codigo ? ` · ${p.equipamento_codigo}` : ""}
                    {p.revisao ? ` (${p.revisao})` : ""}
                  </span>
                  <Link
                    to="/engenharia/projetos"
                    search={{
                      d: p.disciplina === "eletrico" ? "eletrico" : "mecanico",
                      open: p.projeto_id,
                    }}
                    className="shrink-0 whitespace-nowrap text-amber-900 underline hover:no-underline dark:text-amber-100"
                  >
                    Abrir e decidir
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
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
      <ProjetosListPage key={d} disciplina={d} openId={open} />
    </div>
  );
}
