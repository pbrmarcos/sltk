import { Link, useRouterState } from "@tanstack/react-router";
import { HelpCircle } from "lucide-react";
import { getDocForRoute } from "@/content/docs/route-map";
import { ARTICLES } from "@/content/docs/loader";

/**
 * Botão contextual "Ajuda desta tela" — resolve a rota atual no ROUTE_DOC_MAP
 * e, se houver artigo publicado, renderiza um link discreto para ele.
 * Retorna null quando não há doc mapeado — nenhum ruído no PageHeader.
 */
export function PageDocLink() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  if (pathname.startsWith("/ajuda")) return null;
  const target = getDocForRoute(pathname);
  if (!target) return null;
  const exists = ARTICLES.some((a) => a.category === target.category && a.slug === target.slug);
  if (!exists) return null;
  return (
    <Link
      to="/ajuda/documentacao/$categoria/$slug"
      params={{ categoria: target.category, slug: target.slug }}
      title="Abrir a documentação desta tela"
      className="inline-flex items-center gap-1.5 rounded-md border border-[var(--bg-border)] bg-[var(--bg-surface)] px-2.5 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]"
    >
      <HelpCircle className="h-3.5 w-3.5" />
      Ajuda desta tela
    </Link>
  );
}
