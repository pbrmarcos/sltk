import { useRouterState } from "@tanstack/react-router";
import { useRef } from "react";

import { useAuth } from "@/hooks/use-auth";
import { useMyModules } from "@/hooks/use-my-modules";
import { moduleForPath } from "@/lib/route-modules";
import { MODULE_LABEL } from "@/lib/permissoes.functions";
import { AccessDenied } from "@/components/layout/AccessDenied";

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
  const requiredList = Array.isArray(required) ? required : [required];
  if (role === "admin" || requiredList.some((m) => modules.has(m))) {
    renderedOnce.current = true;
    return <>{children}</>;
  }

  return (
    <AccessDenied
      backTo="/dashboard"
      message={
        <>
          Seu perfil não tem permissão para o módulo{" "}
          <strong>{requiredList.map((m) => MODULE_LABEL[m]).join(" ou ")}</strong>. Solicite
          liberação a um administrador em Administração › Usuários &amp; Permissões.
        </>
      }
    />
  );
}
