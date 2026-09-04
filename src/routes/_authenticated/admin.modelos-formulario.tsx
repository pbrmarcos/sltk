import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ShieldAlert } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ChecklistTiposPanel } from "@/components/admin/ChecklistTiposPanel";
import { EntrevistaSegmentosPanel } from "@/components/admin/EntrevistaSegmentosPanel";

export const Route = createFileRoute("/_authenticated/admin/modelos-formulario")({
  component: ModelosFormularioPage,
  head: () => ({
    meta: [
      { title: "Modelos de Formulário — Admin | SLTK" },
      { name: "description", content: "Gerencie os tipos de Checklist (RFQ) e os segmentos de Entrevista." },
    ],
  }),
});

function ModelosFormularioPage() {
  const { role } = useAuth();
  const isAdmin = role === "admin";
  const canManage = isAdmin || role === "manager";

  const crumbs = [
    { label: "Home", href: "/" },
    { label: "Administração", href: "/admin" },
    { label: "Modelos de Formulário" },
  ];

  if (!canManage) {
    return (
      <PageContainer>
        <PageHeader breadcrumbs={crumbs} title="Modelos de Formulário" />
        <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-[var(--bg-border)] bg-[var(--bg-surface)] p-12 text-center">
          <ShieldAlert className="h-10 w-10 text-[var(--danger)]" />
          <h2 className="text-lg font-semibold">Acesso restrito</h2>
          <p className="text-sm text-[var(--text-muted)]">Esta área é exclusiva para administradores e gestores.</p>
        </div>
      </PageContainer>
    );
  }

  return <ModelosFormularioPanel crumbs={crumbs} isAdmin={isAdmin} />;
}

function ModelosFormularioPanel({
  crumbs,
  isAdmin,
}: {
  crumbs: { label: string; href?: string }[];
  isAdmin: boolean;
}) {
  const [tab, setTab] = useState<"entrevista" | "checklist">(() => {
    if (!isAdmin) return "entrevista";
    if (typeof window === "undefined") return "checklist";
    const p = new URLSearchParams(window.location.search).get("tab");
    return p === "entrevista" ? "entrevista" : "checklist";
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if ((isAdmin && tab === "checklist") || (!isAdmin && tab === "entrevista")) {
      url.searchParams.delete("tab");
    } else {
      url.searchParams.set("tab", tab);
    }
    window.history.replaceState(null, "", url.toString());
  }, [tab, isAdmin]);

  return (
    <PageContainer>
      <PageHeader
        breadcrumbs={crumbs}
        title="Modelos de Formulário"
        subtitle="Schemas usados nos formulários públicos: tipos de Checklist (RFQ) e segmentos de Entrevista."
      />

      <Tabs value={tab} onValueChange={(v) => setTab(v as "entrevista" | "checklist")} className="w-full">
        <TabsList>
          <TabsTrigger value="entrevista">Entrevista</TabsTrigger>
          {isAdmin && <TabsTrigger value="checklist">Checklist</TabsTrigger>}
        </TabsList>
        <TabsContent value="entrevista" className="mt-4">
          <EntrevistaSegmentosPanel isAdmin={isAdmin} />
        </TabsContent>
        {isAdmin && (
          <TabsContent value="checklist" className="mt-4">
            <ChecklistTiposPanel />
          </TabsContent>
        )}
      </Tabs>
    </PageContainer>
  );
}
