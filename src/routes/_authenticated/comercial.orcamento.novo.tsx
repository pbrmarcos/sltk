import { createFileRoute } from "@tanstack/react-router";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { OrcamentoWizard } from "@/components/orcamento/OrcamentoWizard";

type NovoOrcamentoSearch = {
  oportunidade?: string;
  oportunidadeCodigo?: string;
  cliente?: string;
  titulo?: string;
};

export const Route = createFileRoute("/_authenticated/comercial/orcamento/novo")({
  validateSearch: (search: Record<string, unknown>): NovoOrcamentoSearch => ({
    oportunidade: typeof search["oportunidade"] === "string" ? (search["oportunidade"] as string) : undefined,
    oportunidadeCodigo:
      typeof search["oportunidadeCodigo"] === "string" ? (search["oportunidadeCodigo"] as string) : undefined,
    cliente: typeof search["cliente"] === "string" ? (search["cliente"] as string) : undefined,
    titulo: typeof search["titulo"] === "string" ? (search["titulo"] as string) : undefined,
  }),
  component: NovoOrcamentoPage,
});

function NovoOrcamentoPage() {
  const { oportunidade, oportunidadeCodigo, cliente, titulo } = Route.useSearch();
  return (
    <PageContainer>
      <PageHeader
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Comercial" },
          { label: "Orçamentos", href: "/comercial/orcamento" },
          { label: "Novo" },
        ]}
        title="Novo orçamento"
        subtitle={
          oportunidadeCodigo
            ? `Vinculado à oportunidade ${oportunidadeCodigo} · gera PDF nos 3 idiomas`
            : "Wizard de criação · gera PDF nos 3 idiomas com versionamento"
        }
      />
      <OrcamentoWizard
        mode="novo"
        initialTitulo={titulo}
        prefillClienteId={cliente ?? null}
        prefillOportunidade={oportunidade ? { id: oportunidade, codigo: oportunidadeCodigo ?? null } : null}
      />
    </PageContainer>
  );
}
