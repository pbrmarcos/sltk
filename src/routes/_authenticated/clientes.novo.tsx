import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { ClienteRapidoForm } from "@/components/clientes/ClienteRapidoForm";

export const Route = createFileRoute("/_authenticated/clientes/novo")({
  component: NovoClientePage,
});

/** Cadastro rápido (7 campos); a ficha pede o resto com "Cadastro N% completo". */
function NovoClientePage() {
  const navigate = useNavigate();
  return (
    <PageContainer>
      <PageHeader
        breadcrumbs={[
          { label: "Comercial" },
          { label: "Clientes", href: "/clientes" },
          { label: "Novo" },
        ]}
        title="Novo cliente"
      />
      <div className="max-w-3xl rounded-[var(--radius-lg)] border border-[var(--bg-border)] bg-[var(--bg-surface)] p-4 shadow-[var(--shadow-sm)] md:p-5">
        <ClienteRapidoForm onCancel={() => navigate({ to: "/clientes" })} />
      </div>
    </PageContainer>
  );
}
