import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Check, RotateCcw, ShieldCheck } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { listRevisao, aprovarItem, solicitarAjuste } from "@/lib/know-how.functions";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/know-how/revisar")({
  component: KnowHowRevisar,
});

function KnowHowRevisar() {
  const { role } = useAuth();
  const canReview = role === "admin" || role === "manager";

  const list = useQuery({
    queryKey: ["kh", "revisao"],
    queryFn: () => listRevisao(),
    enabled: canReview,
  });

  const aprovarFn = useServerFn(aprovarItem);
  const ajusteFn = useServerFn(solicitarAjuste);

  const aprovar = useMutation({
    mutationFn: (id: string) => aprovarFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Publicado.");
      list.refetch();
    },
    onError: (e: unknown) => toast.error((e as Error).message),
  });

  const ajustar = useMutation({
    mutationFn: (id: string) => ajusteFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Devolvido para ajuste.");
      list.refetch();
    },
    onError: (e: unknown) => toast.error((e as Error).message),
  });

  if (!canReview) {
    return (
      <PageContainer>
        <p className="text-sm text-[var(--text-muted)]">Apenas gestores podem revisar conteúdo.</p>
        <Button asChild variant="outline" size="sm" className="mt-4">
          <Link to="/know-how">
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Voltar
          </Link>
        </Button>
      </PageContainer>
    );
  }

  const rows = list.data ?? [];

  return (
    <PageContainer>
      <PageHeader
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Know-how", href: "/know-how" },
          { label: "Revisar" },
        ]}
        title="Revisar rascunhos"
        subtitle="Aprove para publicar ou devolva para ajuste."
      />

      {list.isLoading ? (
        <p className="text-sm text-[var(--text-muted)]">Carregando…</p>
      ) : rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[var(--bg-border)] bg-[var(--bg-surface)] p-10 text-center">
          <ShieldCheck className="mx-auto mb-3 h-10 w-10 text-[var(--text-muted)] opacity-40" />
          <p className="text-sm text-[var(--text-muted)]">Nenhum item aguardando revisão.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((it: any) => (
            <div
              key={it.id}
              className="flex items-start justify-between gap-4 rounded-lg border border-[var(--bg-border)] bg-[var(--bg-surface)] p-4"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    to="/know-how/$slug"
                    params={{ slug: it.slug }}
                    className="text-sm font-semibold text-[var(--text-primary)] hover:underline"
                  >
                    {it.titulo}
                  </Link>
                  <Badge variant="outline" className="text-[10px] uppercase">{it.tipo}</Badge>
                  <span className="text-xs text-[var(--text-muted)]">v{it.versao}</span>
                </div>
                {it.resumo && (
                  <p className="mt-1 line-clamp-2 text-xs text-[var(--text-muted)]">{it.resumo}</p>
                )}
              </div>
              <div className="flex shrink-0 gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => ajustar.mutate(it.id)}
                  disabled={ajustar.isPending}
                >
                  <RotateCcw className="mr-1.5 h-4 w-4" />
                  Ajuste
                </Button>
                <Button size="sm" onClick={() => aprovar.mutate(it.id)} disabled={aprovar.isPending}>
                  <Check className="mr-1.5 h-4 w-4" />
                  Aprovar
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </PageContainer>
  );
}
