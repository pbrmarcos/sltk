import { Link } from "@tanstack/react-router";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Tela cheia de "acesso restrito" — usada por qualquer rota/aba que bloqueia
 * o conteúdo por papel ou módulo. Único visual pro sistema inteiro, em vez
 * de cada tela reimplementar o próprio card (achado da auditoria de
 * overlays: 8+ variações diferentes conviviam sem padrão).
 */
export function AccessDenied({
  message,
  backTo,
  backLabel = "Voltar ao dashboard",
  replace,
}: {
  message: React.ReactNode;
  backTo?: string;
  backLabel?: string;
  /** Usa `replace` na navegação de volta — evita loop quando o guard fica dentro de um layout que também checa auth. */
  replace?: boolean;
}) {
  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <div className="max-w-md rounded-lg border border-[var(--bg-border)] bg-[var(--bg-surface)] p-8 text-center">
        <ShieldAlert className="mx-auto mb-4 h-10 w-10 text-[var(--text-muted)]" />
        <h1 className="text-lg font-semibold">Acesso restrito</h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">{message}</p>
        {backTo && (
          <Button asChild className="mt-6">
            <Link to={backTo} replace={replace}>
              {backLabel}
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}
