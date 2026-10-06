import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Factory, FileText, Target } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FormCollapsibleSection } from "@/components/form/FormCollapsibleSection";
import { ClienteChecklistTab } from "@/components/checklist/ClienteChecklistTab";
import { ClienteTimeComercialTab } from "@/components/checklist/ClienteTimeComercialTab";
import {
  clienteOportunidadesQueryOptions,
  clienteOrcamentosQueryOptions,
  clienteProcessosQueryOptions,
} from "@/lib/clientes.queries";
import { approveDocument } from "@/lib/docs/docs.functions";
import { orcamentoStatusMeta } from "@/lib/orcamentos.shared";
import { STAGE_LABEL, type PipelineStage } from "@/lib/oportunidades.functions";
import { cn } from "@/lib/utils";
import { EmptyState, FichaSection, fmtDate, fmtDateTime, fmtMoney } from "./ficha-utils";

const OPP_STAGE_COLOR: Record<PipelineStage, string> = {
  novo: "border-[var(--badge-neutral-border)] bg-[var(--badge-neutral-bg)] text-[var(--badge-neutral-fg)]",
  qualificado: "border-sky-200 bg-sky-50 text-sky-700",
  proposta: "border-indigo-200 bg-indigo-50 text-indigo-700",
  negociacao: "border-amber-200 bg-amber-50 text-amber-700",
  ganho: "border-emerald-200 bg-emerald-50 text-emerald-700",
  perdido: "border-rose-200 bg-rose-50 text-rose-700",
};

/** Aba Comercial: oportunidades, orçamentos, processos e checklists do cliente. */
export function ClienteComercialTab({ clienteId }: { clienteId: string }) {
  const opps = useQuery(clienteOportunidadesQueryOptions(clienteId));
  const orcamentos = useQuery(clienteOrcamentosQueryOptions(clienteId));
  const procs = useQuery(clienteProcessosQueryOptions(clienteId));
  const qc = useQueryClient();
  const aprovarMut = useMutation({
    mutationFn: (id: string) => approveDocument({ data: { documento_id: id } }),
    onSuccess: () => {
      toast.success("Orçamento aprovado — equipamentos gerados na ficha.");
      qc.invalidateQueries({ queryKey: ["clientes", clienteId] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Falha ao aprovar."),
  });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <FichaSection
          title={`Oportunidades${opps.data ? ` (${opps.data.length})` : ""}`}
          action={
            <Button asChild size="sm" variant="ghost" className="h-7 text-xs">
              <Link to="/comercial/pipeline">Pipeline</Link>
            </Button>
          }
        >
          {opps.isLoading ? (
            <div className="p-4 text-[12px] text-muted-foreground">Carregando…</div>
          ) : (opps.data?.length ?? 0) === 0 ? (
            <EmptyState
              icon={Target}
              title="Nenhuma oportunidade"
              hint="Use “Nova oportunidade” na barra de cima."
            />
          ) : (
            <ul className="divide-y divide-border">
              {opps.data!.map((o) => {
                const stage = o.pipeline_stage as PipelineStage;
                return (
                  <li key={o.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/30">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10.5px] text-muted-foreground">
                          {o.codigo}
                        </span>
                        <Badge
                          variant="outline"
                          className={cn("text-[10px]", OPP_STAGE_COLOR[stage])}
                        >
                          {STAGE_LABEL[stage] ?? stage}
                        </Badge>
                      </div>
                      <div className="truncate text-[12.5px] font-medium">{o.titulo}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {o.expected_close_date
                          ? `fechamento ${fmtDate(o.expected_close_date)}`
                          : `atualizada ${fmtDate(o.updated_at)}`}
                      </div>
                    </div>
                    <div className="text-right text-[12px] tabular-nums">
                      <div className="font-medium">{fmtMoney(o.valor_estimado)}</div>
                      <div className="text-muted-foreground">{o.probabilidade}%</div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </FichaSection>

        <FichaSection
          title={`Orçamentos${orcamentos.data ? ` (${orcamentos.data.length})` : ""}`}
          action={
            <Button asChild size="sm" variant="ghost" className="h-7 text-xs">
              <Link to="/comercial/orcamento/novo" search={{ cliente: clienteId } as never}>
                <FileText className="mr-1 h-3.5 w-3.5" /> Novo
              </Link>
            </Button>
          }
        >
          {orcamentos.isLoading ? (
            <div className="p-4 text-[12px] text-muted-foreground">Carregando…</div>
          ) : (orcamentos.data?.length ?? 0) === 0 ? (
            <EmptyState icon={FileText} title="Nenhum orçamento" />
          ) : (
            <ul className="divide-y divide-border">
              {orcamentos.data!.map((o: any) => {
                const sm = orcamentoStatusMeta(o.status);
                return (
                  <li key={o.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/30">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Link
                          to="/documentos/$id"
                          params={{ id: o.id }}
                          className="font-mono text-[10.5px] text-muted-foreground hover:underline"
                        >
                          {o.codigo}
                        </Link>
                        <Badge variant="outline" className={cn("text-[10px]", sm.cls)}>
                          {sm.label}
                        </Badge>
                        <span className="font-mono text-[10.5px] text-muted-foreground">
                          v{o.versao}
                        </span>
                      </div>
                      <div className="truncate text-[12.5px] font-medium">
                        {o.titulo || "Sem título"}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {fmtDateTime(o.created_at)}
                      </div>
                    </div>
                    {["rascunho", "emitido", "em_revisao"].includes(o.status) && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 shrink-0 text-[11px]"
                        disabled={aprovarMut.isPending}
                        onClick={() => aprovarMut.mutate(o.id)}
                      >
                        Aprovar
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </FichaSection>
      </div>

      <FichaSection title={`Processos${procs.data ? ` (${procs.data.length})` : ""}`}>
        {procs.isLoading ? (
          <div className="p-4 text-[12px] text-muted-foreground">Carregando…</div>
        ) : (procs.data?.length ?? 0) === 0 ? (
          <EmptyState icon={Factory} title="Sem processos" />
        ) : (
          <ul className="divide-y divide-border">
            {procs.data!.map((p) => (
              <li key={p.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/30">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10.5px] text-muted-foreground">
                      {p.codigo}
                    </span>
                    <Badge variant="outline" className="text-[10px] capitalize">
                      {p.stage}
                    </Badge>
                    {p.lost_at && (
                      <Badge
                        variant="outline"
                        className="border-rose-200 text-[10px] text-rose-700"
                      >
                        arquivado
                      </Badge>
                    )}
                  </div>
                  <div className="truncate text-[12.5px] font-medium">{p.titulo}</div>
                </div>
                <div className="text-right text-[12px] tabular-nums text-muted-foreground">
                  {p.progresso}%
                </div>
              </li>
            ))}
          </ul>
        )}
      </FichaSection>

      <ClienteChecklistTab clienteId={clienteId} />

      <FormCollapsibleSection title="Equipe com acesso a este cliente">
        <ClienteTimeComercialTab clienteId={clienteId} />
      </FormCollapsibleSection>
    </div>
  );
}
