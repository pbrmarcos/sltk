import { APP_MODULES, type AppModule } from "@/lib/permissoes.functions";
import { useMyModules } from "@/hooks/use-my-modules";
import type { RoleDashboardsData } from "./useRoleDashboards";
import { ModuleSectionCard } from "./ModuleSectionCard";

/**
 * Grade de cards por módulo realmente habilitado pro usuário (via
 * `role_module_permissions`), excluindo o(s) módulo(s) já cobertos pelo
 * "hero" daquele dashboard — evita repetir o mesmo conteúdo duas vezes.
 */
export function ModulesActiveGrid({
  data,
  exclude = [],
}: {
  data: RoleDashboardsData | undefined;
  exclude?: AppModule[];
}) {
  const { modules: myModules } = useMyModules();
  if (!data) return null;
  const gridModules = APP_MODULES.filter(
    (m) => !exclude.includes(m) && myModules.has(m) && data.modules[m],
  );
  if (gridModules.length === 0) return null;

  return (
    <div>
      <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
        Módulos ativos
      </h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {gridModules.map((m) => (
          <ModuleSectionCard key={m} module={m} summary={data.modules[m]!} />
        ))}
      </div>
    </div>
  );
}
