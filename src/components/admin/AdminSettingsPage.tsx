import type { ReactNode } from "react";
import { useAuth } from "@/hooks/use-auth";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { AccessDenied } from "@/components/layout/AccessDenied";

/** Wrapper comum das seções de /admin/* que hoje eram abas de Configurações — mesmo gate (admin-only) que existia antes. */
export function AdminSettingsPage({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  const { role } = useAuth();
  const crumbs = [
    { label: "Home", href: "/" },
    { label: "Administração", href: "/admin" },
    { label: title },
  ];

  if (role !== "admin") {
    return (
      <PageContainer>
        <PageHeader breadcrumbs={crumbs} title={title} />
        <AccessDenied message="Esta área é exclusiva para administradores." />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader breadcrumbs={crumbs} title={title} subtitle={subtitle} />
      {children}
    </PageContainer>
  );
}
