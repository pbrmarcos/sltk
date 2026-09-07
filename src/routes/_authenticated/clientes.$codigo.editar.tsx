import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { ClienteForm } from "@/components/clientes/ClienteForm";
import { clienteByCodigoQueryOptions, paisesQueryOptions } from "@/lib/clientes.queries";
import type { ClienteInput } from "@/lib/clientes.shared";

export const Route = createFileRoute("/_authenticated/clientes/$codigo/editar")({
  loader: ({ context, params }) => {
    context.queryClient.ensureQueryData(clienteByCodigoQueryOptions(params.codigo));
    context.queryClient.ensureQueryData(paisesQueryOptions());
  },
  component: EditarClientePage,
});

function EditarClientePage() {
  const { codigo } = Route.useParams();
  const { data } = useSuspenseQuery(clienteByCodigoQueryOptions(codigo));
  const cliente = data.cliente;

  const initialValues: Partial<ClienteInput> = {
    ...(cliente as unknown as Partial<ClienteInput>),
    contatos: (data.contatos ?? []).map((c: any) => ({
      nome: c.nome,
      cargo: c.cargo ?? "",
      email: c.email ?? "",
      telefone_ddi: c.telefone_ddi ?? "",
      telefone_numero: c.telefone_numero ?? "",
      principal: !!c.principal,
    })),
  };

  return (
    <PageContainer>
      <PageHeader
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Comercial" },
          { label: "Clientes", href: "/clientes" },
          { label: cliente.razao_social, href: `/clientes/${cliente.codigo}` },
          { label: "Editar" },
        ]}
        title={`Editar — ${cliente.razao_social}`}
        subtitle={`#${cliente.codigo}`}
      />
      <ClienteForm
        mode="edit"
        clienteId={cliente.id}
        clienteCodigo={cliente.codigo}
        initialValues={initialValues}
      />
    </PageContainer>
  );
}
