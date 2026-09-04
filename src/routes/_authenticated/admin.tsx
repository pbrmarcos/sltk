import { createFileRoute, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { Loader2, ShieldAlert } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { PageContainer } from "@/components/layout/PageContainer";
import { logAdminLogin } from "@/lib/admin-events.functions";

const ALLOWED = new Set(["admin", "manager", "engineer"]);
const LOGIN_FLAG_KEY = "sltk_admin_logged";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminLayout,
});

function AdminLayout() {
  const { role, roleLoading, loading } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const allowed = role ? ALLOWED.has(role) : false;

  useEffect(() => {
    if (loading || roleLoading) return;
    if (!allowed) {
      const t = setTimeout(() => {
        void navigate({ to: "/dashboard", replace: true });
      }, 1500);
      return () => clearTimeout(t);
    }
  }, [loading, roleLoading, allowed, navigate]);

  // /admin agora consolida a visão administrativa dentro de Configurações → aba Administração.
  useEffect(() => {
    if (loading || roleLoading || !allowed) return;
    if (pathname === "/admin") {
      void navigate({ to: "/admin/configuracoes", replace: true });
    }
  }, [loading, roleLoading, allowed, pathname, navigate]);

  useEffect(() => {
    if (loading || roleLoading || !allowed) return;
    if (typeof window === "undefined") return;
    try {
      if (window.sessionStorage.getItem(LOGIN_FLAG_KEY) !== "1") {
        window.sessionStorage.setItem(LOGIN_FLAG_KEY, "1");
        void logAdminLogin();
      }
    } catch {
      /* sessionStorage indisponível — silencia */
    }
  }, [loading, roleLoading, allowed]);

  if (loading || roleLoading) {
    return (
      <PageContainer>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Verificando permissões…
        </div>
      </PageContainer>
    );
  }

  if (!allowed) {
    return (
      <PageContainer>
        <div className="mx-auto max-w-md rounded-lg border bg-card p-6 text-center">
          <ShieldAlert className="mx-auto mb-3 h-8 w-8 text-destructive" />
          <h1 className="text-lg font-semibold">Acesso restrito</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Este painel é reservado a administradores, gestores e engenharia.
            Você será redirecionado.
          </p>
        </div>
      </PageContainer>
    );
  }

  if (pathname === "/admin") {
    return (
      <PageContainer>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Abrindo Configurações…
        </div>
      </PageContainer>
    );
  }

  return <Outlet />;
}
