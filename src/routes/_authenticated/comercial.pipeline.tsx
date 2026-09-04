import { createFileRoute, useRouter } from "@tanstack/react-router";
import { Suspense, useEffect, useState } from "react";
import { Loader2, AlertTriangle, Plus, LayoutGrid, Table as TableIcon } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { PipelineBoard } from "@/components/comercial/pipeline/PipelineBoard";
import { NewOportunidadeDialog } from "@/components/comercial/pipeline/NewOportunidadeDialog";
import { pipelineQueryOptions } from "@/lib/oportunidades.queries";

export const Route = createFileRoute("/_authenticated/comercial/pipeline")({
  loader: ({ context }) => context.queryClient.ensureQueryData(pipelineQueryOptions()),
  component: PipelinePage,
  errorComponent: PipelineError,
  notFoundComponent: () => <div className="p-8">Não encontrado</div>,
});

function PipelinePage() {
  const [view, setView] = useState<"kanban" | "table">("kanban");
  const [newOpen, setNewOpen] = useState(false);
  useEffect(() => {
    setNewOpen(window.localStorage.getItem("solutek:pipeline:new-open") === "1");
  }, []);
  useEffect(() => {
    if (newOpen) window.localStorage.setItem("solutek:pipeline:new-open", "1");
    else window.localStorage.removeItem("solutek:pipeline:new-open");
  }, [newOpen]);
  return (
    <PageContainer>
      <PageHeader
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Comercial" },
          { label: "Pipeline" },
        ]}
        title="Pipeline Comercial"
        subtitle="Suspect → Prospect → Cliente. Arraste para mover entre estágios."
        actions={
          <>
            <div className="hidden sm:inline-flex rounded-md border bg-white p-0.5">
              <Button
                size="sm"
                variant={view === "kanban" ? "secondary" : "ghost"}
                className="h-7 px-2"
                onClick={() => setView("kanban")}
              >
                <LayoutGrid className="w-4 h-4 mr-1" /> Kanban
              </Button>
              <Button
                size="sm"
                variant={view === "table" ? "secondary" : "ghost"}
                className="h-7 px-2"
                onClick={() => setView("table")}
              >
                <TableIcon className="w-4 h-4 mr-1" /> Tabela
              </Button>
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="sm:hidden h-8 px-2"
              onClick={() => setView(view === "kanban" ? "table" : "kanban")}
              aria-label="Alternar visualização"
            >
              {view === "kanban" ? <TableIcon className="w-4 h-4" /> : <LayoutGrid className="w-4 h-4" />}
            </Button>
            <Button size="sm" onClick={() => setNewOpen(true)}>
              <Plus className="w-4 h-4 mr-1" /> <span className="hidden sm:inline">Nova oportunidade</span><span className="sm:hidden">Nova</span>
            </Button>
          </>
        }
      />
      <Suspense fallback={<div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> Carregando…</div>}>
        <PipelineBoard view={view} />
      </Suspense>
      <NewOportunidadeDialog open={newOpen} onOpenChange={setNewOpen} />
    </PageContainer>
  );
}

function PipelineError({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  return (
    <PageContainer>
      <div className="border border-rose-200 bg-rose-50 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-600" />
          <div className="flex-1">
            <h2 className="font-semibold text-rose-900">Erro ao carregar pipeline</h2>
            <p className="text-sm text-rose-700 mt-1">{error.message}</p>
            <Button
              size="sm"
              variant="outline"
              className="mt-3"
              onClick={() => { reset(); router.invalidate(); }}
            >
              Tentar novamente
            </Button>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}