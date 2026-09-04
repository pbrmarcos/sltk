import { createFileRoute } from "@tanstack/react-router";
import { ShieldAlert } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { AuditTrailTab } from "@/components/admin/AuditTrailTab";

export const Route = createFileRoute("/_authenticated/admin/auditoria")({
  component: AuditoriaPage,
});

function AuditoriaPage() {
  const { role } = useAuth();
  const crumbs = [
    { label: "Home", href: "/" },
    { label: "Administração", href: "/admin" },
    { label: "Auditoria" },
  ];

  if (role !== "admin" && role !== "manager") {
    return (
      <PageContainer>
        <PageHeader breadcrumbs={crumbs} title="Auditoria" />
        <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-[var(--bg-border)] bg-[var(--bg-surface)] p-12 text-center">
          <ShieldAlert className="h-10 w-10 text-[var(--danger)]" />
          <h2 className="text-lg font-semibold">Acesso restrito</h2>
          <p className="text-sm text-[var(--text-muted)]">
            Esta área é exclusiva para administradores e gestores.
          </p>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        breadcrumbs={crumbs}
        title="Auditoria"
        subtitle="Trilha completa de alterações registradas pelo sistema."
      />
      <AuditTrailTab />
    </PageContainer>
  );
}
