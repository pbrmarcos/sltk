import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { fallback, zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { TemplatesProjetoPage } from "@/components/templates-projeto/TemplatesProjetoPage";
import { TemplatesSATPage } from "@/components/templates-sistema/sat/TemplatesSATPage";
import { TemplatesFATPage } from "@/components/templates-sistema/fat/TemplatesFATPage";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { listTemplates } from "@/lib/processo-templates.functions";
import { listFATTemplates } from "@/lib/fat-templates.functions";
import { listSATTemplates } from "@/lib/sat-templates.functions";

type MainAba = "projetos" | "fat" | "sat";
type ViewAba = "ativos" | "arquivados";

const searchSchema = z.object({
  aba: fallback(z.enum(["projetos", "fat", "sat"]), "projetos").default("projetos"),
});

function TemplateDocumentosPage() {
  const search = Route.useSearch();
  const [aba, setAba] = useState<MainAba>(search.aba);
  const [viewProjetos, setViewProjetos] = useState<ViewAba>("ativos");
  const [viewFat, setViewFat] = useState<ViewAba>("ativos");
  const [viewSat, setViewSat] = useState<ViewAba>("ativos");

  // contagens (queries em cache compartilhado com os filhos)
  const projListFn = useServerFn(listTemplates);
  const fatListFn = useServerFn(listFATTemplates);
  const satListFn = useServerFn(listSATTemplates);

  const projAllQ = useQuery({
    queryKey: ["processo-templates", "todos", "", "ativos"],
    queryFn: () => projListFn({ data: { incluir_arquivados: true } }),
  });
  const fatQ = useQuery({ queryKey: ["fat-templates"], queryFn: () => fatListFn() });
  const satQ = useQuery({ queryKey: ["sat-templates"], queryFn: () => satListFn() });

  const counts =
    aba === "projetos"
      ? {
          ativos: (projAllQ.data ?? []).filter((t) => !t.deleted_at).length,
          arquivados: (projAllQ.data ?? []).filter((t) => !!t.deleted_at).length,
        }
      : aba === "fat"
        ? {
            ativos: (fatQ.data ?? []).filter((t) => !t.deleted_at).length,
            arquivados: (fatQ.data ?? []).filter((t) => !!t.deleted_at).length,
          }
        : {
            ativos: (satQ.data ?? []).filter((t) => !t.deleted_at).length,
            arquivados: (satQ.data ?? []).filter((t) => !!t.deleted_at).length,
          };

  const view = aba === "projetos" ? viewProjetos : aba === "fat" ? viewFat : viewSat;
  const setView = aba === "projetos" ? setViewProjetos : aba === "fat" ? setViewFat : setViewSat;

  return (
    <PageContainer>
      <PageHeader
        breadcrumbs={[{ label: "Documentos" }, { label: "Templates de Documentos" }]}
        title="Templates de Documentos"
        subtitle="Padrões reutilizáveis de documentos do sistema (Projetos, FAT, SAT)"
      />
      <Tabs value={aba} onValueChange={(v) => setAba(v as MainAba)} className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <TabsList>
            <TabsTrigger value="projetos">Projetos</TabsTrigger>
            <TabsTrigger value="fat">FAT</TabsTrigger>
            <TabsTrigger value="sat">SAT</TabsTrigger>
          </TabsList>

          <Tabs value={view} onValueChange={(v) => setView(v as ViewAba)}>
            <TabsList>
              <TabsTrigger value="ativos">Ativos ({counts.ativos})</TabsTrigger>
              <TabsTrigger value="arquivados">Arquivados ({counts.arquivados})</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <TabsContent value="projetos" className="mt-4">
          <TemplatesProjetoPage view={viewProjetos} />
        </TabsContent>
        <TabsContent value="fat" className="mt-4">
          <TemplatesFATPage view={viewFat} />
        </TabsContent>
        <TabsContent value="sat" className="mt-4">
          <TemplatesSATPage view={viewSat} />
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}

export const Route = createFileRoute("/_authenticated/template-documentos")({
  validateSearch: zodValidator(searchSchema),
  component: TemplateDocumentosPage,
});
