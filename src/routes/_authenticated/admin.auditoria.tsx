import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { ShieldAlert } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AuditTrailTab } from "@/components/admin/AuditTrailTab";
import { DrawerErrorsTab } from "@/components/admin/DrawerErrorsTab";

const searchSchema = z.object({
  tab: z.enum(["trilha", "erros-drawer"]).optional(),
});

export const Route = createFileRoute("/_authenticated/admin/auditoria")({
  validateSearch: searchSchema,
  component: AuditoriaPage,
});

function AuditoriaPage() {
  const { role } = useAuth();
  const { tab } = Route.useSearch();
  const navigate = useNavigate();
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

  const active = tab ?? "trilha";

  return (
    <PageContainer>
      <PageHeader
        breadcrumbs={crumbs}
        title="Auditoria"
        subtitle="Trilha completa de alterações e erros capturados pelo sistema."
      />
      <Tabs
        value={active}
        onValueChange={(v) =>
          navigate({
            to: "/admin/auditoria",
            search: { tab: v === "trilha" ? undefined : (v as "erros-drawer") },
          })
        }
        className="w-full"
      >
        <TabsList>
          <TabsTrigger value="trilha">Trilha de auditoria</TabsTrigger>
          <TabsTrigger value="erros-drawer">Erros do Drawer</TabsTrigger>
        </TabsList>
        <TabsContent value="trilha" className="mt-4">
          <AuditTrailTab />
        </TabsContent>
        <TabsContent value="erros-drawer" className="mt-4">
          <DrawerErrorsTab />
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}
