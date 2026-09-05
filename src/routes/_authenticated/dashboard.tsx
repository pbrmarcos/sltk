import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { ManagerDashboard } from "@/components/dashboard/ManagerDashboard";
import { AdminDashboard } from "@/components/dashboard/AdminDashboard";
import { SalesDashboard } from "@/components/dashboard/SalesDashboard";
import { EngineeringDashboard } from "@/components/dashboard/EngineeringDashboard";
import { ProductionDashboard } from "@/components/dashboard/ProductionDashboard";
import { AssemblyDashboard } from "@/components/dashboard/AssemblyDashboard";
import { PurchasingDashboard } from "@/components/dashboard/PurchasingDashboard";
import { FieldDashboard } from "@/components/dashboard/FieldDashboard";
import { getManagerDashboard } from "@/lib/dashboard.functions";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardPage,
  errorComponent: ({ error, reset }) => {
    const msg = error?.message ?? "";
    if (/Unauthorized|No authorization header/i.test(msg)) {
      if (typeof window !== "undefined") window.location.replace("/login");
      return null;
    }
    return (
      <PageContainer>
        <PageHeader title="Dashboard" breadcrumbs={[{ label: "Home" }]} />
        <div className="rounded-[var(--radius-lg)] border border-red-500/30 bg-red-500/5 p-6 text-[13px] text-red-300">
          <div className="font-semibold">Falha ao carregar o dashboard</div>
          <div className="mt-1 opacity-80">{msg || "Erro desconhecido."}</div>
          <button
            onClick={() => reset()}
            className="mt-3 rounded-md border border-red-500/40 px-3 py-1.5 text-[12px] hover:bg-red-500/10"
          >
            Tentar novamente
          </button>
        </div>
      </PageContainer>
    );
  },
  notFoundComponent: () => (
    <PageContainer>
      <div className="p-8 text-center text-[var(--text-muted)]">Página não encontrada.</div>
    </PageContainer>
  ),
});

function DashboardPage() {
  const { session, profile, role } = useAuth();
  const fetchDashboard = useServerFn(getManagerDashboard);
  const userId = session?.user.id ?? null;

  if (!session) {
    return (
      <PageContainer>
        <div className="p-8 text-center text-[var(--text-muted)]">Carregando sessão…</div>
      </PageContainer>
    );
  }

  const userName = profile?.full_name ?? profile?.email ?? "Usuário";

  // Manager/admin fallback keeps live pipeline data (real backend query).
  if (role === "manager") {
    return <ManagerInner userId={userId!} fetchDashboard={fetchDashboard} userName={userName} />;
  }

  // Other roles: mocked, per-role dashboards.
  return (
    <PageContainer>
      {role === "admin" && <AdminDashboard userName={userName} />}
      {role === "sales" && <SalesDashboard userName={userName} />}
      {role === "engineer" && <EngineeringDashboard userName={userName} />}
      {role === "production" && <ProductionDashboard userName={userName} />}
      {role === "assembly" && <AssemblyDashboard userName={userName} />}
      {role === "purchasing" && <PurchasingDashboard userName={userName} />}
      {role === "field" && <FieldDashboard userName={userName} />}
      {!role && <SalesDashboard userName={userName} />}
    </PageContainer>
  );
}

function ManagerInner({
  userId,
  fetchDashboard,
  userName,
}: {
  userId: string;
  fetchDashboard: () => Promise<Awaited<ReturnType<typeof getManagerDashboard>>>;
  userName: string;
}) {
  const { data } = useSuspenseQuery({
    queryKey: ["manager-dashboard", userId],
    queryFn: async () => {
      const { data: s } = await supabase.auth.getSession();
      if (!s.session?.access_token) {
        if (typeof window !== "undefined") window.location.replace("/login");
        throw new Error("Sessão expirada");
      }
      return fetchDashboard();
    },
    staleTime: 60_000,
    retry: false,
  });

  return (
    <PageContainer>
      <ManagerDashboard data={data} userName={userName} />
    </PageContainer>
  );
}
