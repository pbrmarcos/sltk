import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Wrench } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { getMaintenanceGate } from "@/lib/maintenance.functions";
import { MaintenancePage } from "@/components/site/MaintenancePage";

/**
 * Bloqueia o app inteiro quando o modo manutenção está ativo.
 * Admins passam direto (com um aviso fixo); todo o resto vê a página de
 * manutenção. Fail-open: se a leitura do flag falhar, o site segue no ar.
 */
export function MaintenanceGate({ children }: { children: React.ReactNode }) {
  const { user, role, loading } = useAuth();
  const gateFn = useServerFn(getMaintenanceGate);

  const q = useQuery({
    queryKey: ["maintenance-gate"],
    queryFn: () => gateFn(),
    refetchInterval: 60_000,
    staleTime: 30_000,
    retry: 1,
  });

  const enabled = q.data?.enabled === true;
  if (!enabled) return <>{children}</>;

  // Sessão ainda resolvendo: segura na página de manutenção (sem flash do app).
  const isAdmin = !loading && !!user && role === "admin";
  if (isAdmin) {
    return (
      <>
        {children}
        <Link
          to="/admin/manutencao"
          className="fixed bottom-4 left-1/2 z-[100] flex -translate-x-1/2 items-center gap-2 rounded-full border border-amber-300 bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-800 shadow-lg transition-colors hover:bg-amber-100"
        >
          <Wrench className="h-3.5 w-3.5" />
          Modo manutenção ativo — visitantes veem a página de manutenção
        </Link>
      </>
    );
  }

  return <MaintenancePage message={q.data?.message ?? null} endsAt={q.data?.ends_at ?? null} />;
}
