import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { Suspense, useEffect, useState } from "react";
import {
  Loader2,
  AlertTriangle,
  Plus,
  LayoutGrid,
  Table as TableIcon,
  Archive,
} from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { PipelineBoard, type PipelineView } from "@/components/comercial/pipeline/PipelineBoard";
import { NewOportunidadeDialog } from "@/components/comercial/pipeline/NewOportunidadeDialog";
import { StageHelpPopover } from "@/components/comercial/pipeline/StageHelpPopover";
import { pipelineQueryOptions } from "@/lib/oportunidades.queries";
import { cn } from "@/lib/utils";

const searchSchema = z.object({
  /** `?novo=1` abre o diálogo de nova oportunidade (atalho do dashboard). */
  novo: fallback(z.boolean(), false).default(false),
});

export const Route = createFileRoute("/_authenticated/comercial/pipeline")({
  validateSearch: zodValidator(searchSchema),
  loader: ({ context }) => context.queryClient.ensureQueryData(pipelineQueryOptions()),
  component: PipelinePage,
  errorComponent: PipelineError,
  notFoundComponent: () => <div className="p-8">Não encontrado</div>,
});

const VIEWS: Array<{ id: PipelineView; label: string; icon: typeof LayoutGrid }> = [
  { id: "kanban", label: "Kanban", icon: LayoutGrid },
  { id: "table", label: "Tabela", icon: TableIcon },
  { id: "perdidas", label: "Perdidas", icon: Archive },
];

function PipelinePage() {
  const { novo } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const [view, setView] = useState<PipelineView>("kanban");
  const [newOpen, setNewOpen] = useState(false);

  useEffect(() => {
    if (!novo) return;
    setNewOpen(true);
    navigate({ search: { novo: undefined } as never, replace: true });
  }, [novo, navigate]);

  return (
    <PageContainer>
      <PageHeader
        breadcrumbs={[{ label: "Comercial" }, { label: "Pipeline" }]}
        title="Pipeline"
        actions={
          <>
            <div className="inline-flex rounded-md border bg-[var(--bg-surface)] p-0.5">
              {VIEWS.map((v) => (
                <Button
                  key={v.id}
                  size="sm"
                  variant={view === v.id ? "secondary" : "ghost"}
                  className={cn("h-7 px-2", view !== v.id && "text-muted-foreground")}
                  onClick={() => setView(v.id)}
                  aria-label={v.label}
                >
                  <v.icon className="h-4 w-4 sm:mr-1" />
                  <span className="hidden sm:inline">{v.label}</span>
                </Button>
              ))}
            </div>
            <StageHelpPopover />
            <Button size="sm" onClick={() => setNewOpen(true)}>
              <Plus className="w-4 h-4 sm:mr-1" />
              <span className="hidden sm:inline">Nova oportunidade</span>
            </Button>
          </>
        }
      />
      <Suspense
        fallback={
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" /> Carregando…
          </div>
        }
      >
        <PipelineBoard view={view} onNew={() => setNewOpen(true)} />
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
              onClick={() => {
                reset();
                router.invalidate();
              }}
            >
              Tentar novamente
            </Button>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
