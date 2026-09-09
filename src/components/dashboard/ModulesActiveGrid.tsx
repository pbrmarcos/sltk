import type { AppModule } from "@/lib/permissoes.functions";
import { useMyModules } from "@/hooks/use-my-modules";
import type { RoleDashboardsData } from "./useRoleDashboards";
import { ModuleSectionCard } from "./ModuleSectionCard";

/**
 * Ordem real do processo, do lead ao pós-venda — não a ordem declarada em
 * APP_MODULES. Clientes vem primeiro (pré-requisito de tudo); Know-how fica
 * por último por ser apoio transversal, não uma etapa do fluxo.
 */
const PROCESS_ORDER: AppModule[] = [
  "clientes",
  "comercial",
  "engenharia",
  "fornecedores",
  "compras",
  "producao",
  "qualidade",
  "logistica",
  "pos_vendas",
  "know_how",
  "admin",
];

/**
 * Grade de cards por módulo realmente habilitado pro usuário (via
 * `role_module_permissions`), na ordem em que o trabalho passa pelos
 * módulos — excluindo o(s) módulo(s) já cobertos pelo "hero" daquele
 * dashboard, pra não repetir o mesmo conteúdo duas vezes.
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
  const gridModules = PROCESS_ORDER.filter(
    (m) => !exclude.includes(m) && myModules.has(m) && data.modules[m],
  );
  if (gridModules.length === 0) return null;

  return (
    <div>
      <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
        Fluxo operacional{" "}
        <span className="font-normal normal-case text-[var(--text-muted)]/70">
          — na ordem em que o trabalho passa pelos módulos
        </span>
      </h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {gridModules.map((m, i) => (
          <ModuleSectionCard key={m} module={m} step={i + 1} summary={data.modules[m]!} />
        ))}
      </div>
    </div>
  );
}
