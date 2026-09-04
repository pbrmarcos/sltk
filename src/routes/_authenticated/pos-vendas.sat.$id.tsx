import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { SATFormPage } from "@/components/pos-vendas/sat/SATFormPage";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText, Share2 } from "lucide-react";
import { generateSatDocument } from "@/lib/docs/docs.functions";
import { ShareLinkDialog } from "@/components/share/ShareLinkDialog";
import { ShareLinksManager } from "@/components/share/ShareLinksManager";

export const Route = createFileRoute("/_authenticated/pos-vendas/sat/$id")({
  component: SATDetailRoute,
});

function SATDetailRoute() {
  const { id } = Route.useParams();
  const nav = useNavigate();
  const genDoc = useServerFn(generateSatDocument);
  const [generating, setGenerating] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  async function gerarDocumento() {
    setGenerating(true);
    try {
      const res = await genDoc({ data: { sat_id: id } });
      toast.success(`Documento gerado: ${res.codigo} v${res.versao}`);
      nav({ to: "/documentos/$id", params: { id: res.documento_id } });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro ao gerar documento";
      toast.error(msg);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <PageContainer>
      <PageHeader
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Pós-venda", href: "/pos-vendas" },
          { label: "Relatórios SAT", href: "/pos-vendas/sat" },
          { label: id.slice(0, 8) },
        ]}
        title="Relatório SAT"
        subtitle="Preencha os campos e anexe fotos/documentos quando necessário"
        actions={
          <>
            <Button
              variant="outline"
              onClick={() => setShareOpen(true)}
              title="Gera um link assinado para o técnico em campo abrir pelo tablet/celular"
            >
              <Share2 className="mr-1.5 h-4 w-4" />
              Link de campo
            </Button>
            <Button
              variant="outline"
              onClick={gerarDocumento}
              disabled={generating}
              title="Gera PDFs PT/ES/EN e abre a ficha do documento (versão, aprovação, Drive, assinatura)"
            >
              <FileText className="mr-1.5 h-4 w-4" />
              {generating ? "Gerando…" : "Gerar documento (PT/ES/EN)"}
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to="/pos-vendas/sat">
                <ArrowLeft className="mr-1 h-3.5 w-3.5" /> Voltar
              </Link>
            </Button>
          </>
        }
      />
      <SATFormPage id={id} />
      <div className="mt-6">
        <ShareLinksManager tipo="sat" relatorioId={id} />
      </div>
      <ShareLinkDialog open={shareOpen} onOpenChange={setShareOpen} tipo="sat" relatorioId={id} />
    </PageContainer>
  );
}
