import { createFileRoute } from "@tanstack/react-router";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { ClienteForm } from "@/components/clientes/ClienteForm";

export const Route = createFileRoute("/_authenticated/clientes/novo")({
  component: NovoClientePage,
});

function NovoClientePage() {
  return (
    <PageContainer>
      <PageHeader
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "CRM" },
          { label: "Clientes", href: "/clientes" },
          { label: "Novo" },
        ]}
        title="Novo cliente"
        subtitle="Cadastro internacional — Brasil e Américas"
      />
      <ClienteForm />
    </PageContainer>
  );
}
