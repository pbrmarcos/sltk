import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { OrcamentoWizard } from "@/components/orcamento/OrcamentoWizard";
import { getEtp } from "@/lib/equipamento-etps.functions";

type NovoOrcamentoSearch = {
  oportunidade?: string;
  oportunidadeCodigo?: string;
  cliente?: string;
  titulo?: string;
  etp?: string;
};

export const Route = createFileRoute("/_authenticated/comercial/orcamento/novo")({
  validateSearch: (search: Record<string, unknown>): NovoOrcamentoSearch => ({
    oportunidade:
      typeof search["oportunidade"] === "string" ? (search["oportunidade"] as string) : undefined,
    oportunidadeCodigo:
      typeof search["oportunidadeCodigo"] === "string"
        ? (search["oportunidadeCodigo"] as string)
        : undefined,
    cliente: typeof search["cliente"] === "string" ? (search["cliente"] as string) : undefined,
    titulo: typeof search["titulo"] === "string" ? (search["titulo"] as string) : undefined,
    etp: typeof search["etp"] === "string" ? (search["etp"] as string) : undefined,
  }),
  component: NovoOrcamentoPage,
});

// Conexão mínima ETP -> Orçamento: só prefill de cliente/título a partir do
// ETP, sem vínculo formal no banco nem trava — o botão "Gerar orçamento" do
// ETP aprovado manda o id aqui.
function NovoOrcamentoPage() {
  const { oportunidade, oportunidadeCodigo, cliente, titulo, etp } = Route.useSearch();

  const { data: etpData } = useQuery({
    queryKey: ["etp-prefill-orcamento", etp],
    queryFn: () => getEtp({ data: { id: etp! } }),
    enabled: !!etp,
  });

  const etpEquipamento = etpData as
    | { cliente_id?: string; cliente_equipamentos?: { codigo?: string; modelo?: string } | null }
    | undefined;
  const prefillCliente = cliente ?? etpEquipamento?.cliente_id ?? null;
  const prefillTitulo =
    titulo ??
    (etpEquipamento?.cliente_equipamentos
      ? `Orçamento — ${etpEquipamento.cliente_equipamentos.codigo ?? ""} ${etpEquipamento.cliente_equipamentos.modelo ?? ""}`.trim()
      : undefined);

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
            : etp
              ? "Pré-preenchido a partir do ETP · gera PDF nos 3 idiomas"
              : "Wizard de criação · gera PDF nos 3 idiomas com versionamento"
        }
      />
      <OrcamentoWizard
        mode="novo"
        initialTitulo={prefillTitulo}
        prefillClienteId={prefillCliente}
        prefillOportunidade={
          oportunidade ? { id: oportunidade, codigo: oportunidadeCodigo ?? null } : null
        }
      />
    </PageContainer>
  );
}
