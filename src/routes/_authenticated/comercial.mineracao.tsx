import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { History } from "lucide-react";
import { toast } from "sonner";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { listarCampanhas, listarResultados } from "@/lib/mineracao.functions";
import { exportarResultadosXlsx } from "@/lib/mineracao/exportar";
import { MineracaoContratoLine } from "@/components/comercial/mineracao/MineracaoContratoLine";
import { MineracaoBuscaForm } from "@/components/comercial/mineracao/MineracaoBuscaForm";
import { MineracaoResultados } from "@/components/comercial/mineracao/MineracaoResultados";
import { MineracaoHistoricoDialog } from "@/components/comercial/mineracao/MineracaoHistoricoDialog";
import {
  CAMPANHA_KEY,
  metaDaCampanha,
  type Campanha,
} from "@/components/comercial/mineracao/mineracao-utils";

export const Route = createFileRoute("/_authenticated/comercial/mineracao")({
  component: MineracaoPage,
  head: () => ({
    meta: [
      { title: "Mineração de leads — SLTK" },
      {
        name: "description",
        content:
          "Consulte transações de comércio exterior por NCM e período e envie os melhores leads para o pipeline.",
      },
    ],
  }),
});

/** Busca (1 card) → resultados (7 colunas). Histórico e consumo fora do caminho. */
function MineracaoPage() {
  const fetchCampanhas = useServerFn(listarCampanhas);
  const fetchResultados = useServerFn(listarResultados);
  const campanhas = useQuery({
    queryKey: ["mineracao-campanhas"],
    queryFn: () => fetchCampanhas(),
  });

  const [campanhaId, setCampanhaId] = React.useState<string | null>(null);
  const [historicoOpen, setHistoricoOpen] = React.useState(false);
  const [aviso, setAviso] = React.useState<string | null>(null);
  const [exportandoId, setExportandoId] = React.useState<string | null>(null);
  const resultadosRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    try {
      const saved = window.localStorage.getItem(CAMPANHA_KEY);
      if (saved) setCampanhaId(saved);
    } catch {
      /* sem persistência */
    }
  }, []);
  React.useEffect(() => {
    try {
      if (campanhaId) window.localStorage.setItem(CAMPANHA_KEY, campanhaId);
    } catch {
      /* sem persistência */
    }
  }, [campanhaId]);

  const abrirCampanha = (id: string) => {
    setCampanhaId(id);
    requestAnimationFrame(() =>
      resultadosRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
    );
  };

  const exportarCampanha = async (c: Campanha) => {
    setExportandoId(c["id"]);
    try {
      const dados = await fetchResultados({ data: { campanha_id: c["id"] } });
      await exportarResultadosXlsx(dados as never[], metaDaCampanha(c), `mineracao-${c["nome"]}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível exportar.");
    } finally {
      setExportandoId(null);
    }
  };

  const lista = (campanhas.data ?? []) as Campanha[];
  const campanhaAtual = lista.find((c) => c["id"] === campanhaId);

  return (
    <PageContainer>
      <PageHeader
        breadcrumbs={[{ label: "Comercial" }, { label: "Mineração" }]}
        title="Mineração de leads"
        actions={
          <Button size="sm" variant="outline" onClick={() => setHistoricoOpen(true)}>
            <History className="h-3.5 w-3.5 sm:mr-1" />
            <span className="hidden sm:inline">Histórico</span>
            {lista.length > 0 && (
              <span className="ml-1 rounded-full bg-muted px-1.5 text-[11px] text-muted-foreground">
                {lista.length}
              </span>
            )}
          </Button>
        }
      />

      <div className="mb-3">
        <MineracaoContratoLine />
      </div>

      <MineracaoBuscaForm onCampanha={abrirCampanha} onAviso={setAviso} />

      {campanhaId && (
        <div ref={resultadosRef} className="mt-4 scroll-mt-4">
          <MineracaoResultados
            campanhaId={campanhaId}
            campanha={campanhaAtual}
            aviso={aviso}
            onLimparAviso={() => setAviso(null)}
          />
        </div>
      )}

      <MineracaoHistoricoDialog
        open={historicoOpen}
        onOpenChange={setHistoricoOpen}
        campanhas={lista}
        campanhaId={campanhaId}
        onSelecionar={abrirCampanha}
        onExportar={(c) => void exportarCampanha(c)}
        exportandoId={exportandoId}
      />
    </PageContainer>
  );
}
