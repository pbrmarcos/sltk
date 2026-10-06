import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EntrevistasPanel } from "@/components/comercial/entrevistas/EntrevistasPanel";
import { ChecklistsInbox } from "@/components/comercial/checklists/ChecklistsInbox";

const ABAS = ["entrevistas", "checklists"] as const;
type Aba = (typeof ABAS)[number];

const searchSchema = z.object({
  aba: fallback(z.enum(ABAS), "entrevistas").default("entrevistas"),
  /** Checklist a abrir na inbox (links vindos de e-mail/notificação). */
  submissao: fallback(z.string().uuid().optional(), undefined).default(undefined),
});

export const Route = createFileRoute("/_authenticated/comercial/formularios")({
  validateSearch: zodValidator(searchSchema),
  component: FormulariosPage,
  head: () => ({ meta: [{ title: "Formulários — Comercial | SLTK" }] }),
});

/** Entrevistas técnicas e checklists: tudo que é enviado ao cliente e volta respondido. */
function FormulariosPage() {
  const { aba, submissao } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const setAba = (next: Aba) =>
    navigate({
      search: (prev: Record<string, unknown>) => ({ ...prev, aba: next }),
      replace: true,
    });

  return (
    <PageContainer>
      <PageHeader
        breadcrumbs={[{ label: "Comercial" }, { label: "Formulários" }]}
        title="Formulários"
        actions={
          <Tabs value={aba} onValueChange={(v) => setAba(v as Aba)}>
            <TabsList className="h-8">
              <TabsTrigger value="entrevistas" className="text-xs">
                Entrevistas
              </TabsTrigger>
              <TabsTrigger value="checklists" className="text-xs">
                Checklists
              </TabsTrigger>
            </TabsList>
          </Tabs>
        }
      />
      {aba === "entrevistas" ? (
        <EntrevistasPanel />
      ) : (
        <ChecklistsInbox submissaoInicial={submissao} />
      )}
    </PageContainer>
  );
}
