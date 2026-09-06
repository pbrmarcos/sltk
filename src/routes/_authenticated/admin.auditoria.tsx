import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { AccessDenied } from "@/components/layout/AccessDenied";
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
        <AccessDenied message="Esta área é exclusiva para administradores e gestores." />
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
