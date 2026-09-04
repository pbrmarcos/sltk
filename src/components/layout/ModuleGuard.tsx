import { Link, useRouterState } from "@tanstack/react-router";
import { useRef } from "react";
import { ShieldAlert } from "lucide-react";

import { useAuth } from "@/hooks/use-auth";
import { useMyModules } from "@/hooks/use-my-modules";
import { moduleForPath } from "@/lib/route-modules";
import { MODULE_LABEL } from "@/lib/permissoes.functions";
import { Button } from "@/components/ui/button";

/**
 * Guard de módulo aplicado a todas as rotas autenticadas.
 * Bloqueia acesso por URL direta a módulos que o papel não possui.
 */
export function ModuleGuard({ children }: { children: React.ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { role, roleLoading } = useAuth();
  const { modules, loading } = useMyModules();
  // Depois que os filhos renderizaram uma vez, o guard nunca mais os substitui
  // por um estado de carregamento — isso desmontaria formulários e diálogos.
  const renderedOnce = useRef(false);

  const required = moduleForPath(pathname);
  if (!required) {
    renderedOnce.current = true;
    return <>{children}</>;
  }
  // "Verificando permissões" só no primeiro carregamento, quando ainda não há
  // nenhum dado de permissão para o usuário atual.
  if ((roleLoading || loading) && !renderedOnce.current) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-sm text-[var(--text-muted)]">
        Verificando permissões…
      </div>
    );
  }
  if (role === "admin" || modules.has(required)) {
    renderedOnce.current = true;
    return <>{children}</>;
  }



  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <div className="max-w-md rounded-lg border border-[var(--bg-border)] bg-[var(--bg-surface)] p-8 text-center">
        <ShieldAlert className="mx-auto mb-4 h-10 w-10 text-[var(--text-muted)]" />
        <h1 className="text-lg font-semibold">Acesso restrito</h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          Seu perfil não tem permissão para o módulo{" "}
          <strong>{MODULE_LABEL[required]}</strong>. Solicite liberação a um
          administrador em Administração › Usuários &amp; Permissões.
        </p>
        <Button asChild className="mt-6">
          <Link to="/dashboard">Voltar ao dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
