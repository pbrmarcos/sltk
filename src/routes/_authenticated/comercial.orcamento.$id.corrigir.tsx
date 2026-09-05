import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { OrcamentoWizard } from "@/components/orcamento/OrcamentoWizard";
import { getOrcamentoForEdit } from "@/lib/docs/docs.functions";

export const Route = createFileRoute("/_authenticated/comercial/orcamento/$id/corrigir")({
  component: CorrigirOrcamentoPage,
});

function CorrigirOrcamentoPage() {
  const { id } = Route.useParams();
  const q = useQuery({
    queryKey: ["orcamento-edit", id],
    queryFn: () => getOrcamentoForEdit({ data: { documento_id: id } }),
  });

  return (
    <PageContainer>
      <PageHeader
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Comercial" },
          { label: "Orçamentos", href: "/comercial/orcamento" },
          { label: q.data?.codigo ?? id, href: `/documentos/${id}` },
          { label: "Corrigir" },
        ]}
        title={`Corrigir ${q.data?.codigo ?? "orçamento"}`}
        subtitle="Reabre o wizard pré-preenchido e gera uma nova versão (major/minor/patch automático)"
      />
      {q.isLoading ? (
        <div className="p-12 text-center">
          <Loader2 className="mx-auto h-6 w-6 animate-spin" />
        </div>
      ) : q.isError || !q.data ? (
        <div className="p-12 text-center text-rose-600">
          Erro ao carregar orçamento para correção.
        </div>
      ) : (
        <OrcamentoWizard
          mode="corrigir"
          documentoId={q.data.documento_id}
          versaoAtual={q.data.versao_atual}
          codigoExistente={q.data.codigo}
          initialPayload={q.data.payload}
          initialTitulo={q.data.titulo}
        />
      )}
    </PageContainer>
  );
}
