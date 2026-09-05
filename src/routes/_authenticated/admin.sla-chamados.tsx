import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listSlaConfig, upsertSlaConfig } from "@/lib/sla-config.functions";

const ORIGEM_LABEL: Record<string, string> = {
  site_publico: "Suporte / Site público",
  interno: "Interno (Solutek)",
  contato_site: "Contato do site",
};
const PRIO_LABEL: Record<string, string> = {
  critica: "Crítica",
  alta: "Alta",
  media: "Média",
  baixa: "Baixa",
};
const PRIO_ORDER = ["critica", "alta", "media", "baixa"];

export const Route = createFileRoute("/_authenticated/admin/sla-chamados")({
  head: () => ({
    meta: [{ title: "SLA de Chamados — Administração" }],
  }),
  component: SlaChamadosPage,
});

type Row = {
  origem: string;
  prioridade: string;
  resposta_horas: number;
  resolucao_horas: number;
  estagnado_horas: number;
};

function SlaChamadosPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["sla-config"],
    queryFn: () => listSlaConfig(),
  });
  const [edits, setEdits] = useState<Record<string, Partial<Row>>>({});

  const upsert = useMutation({
    mutationFn: (r: Row) => upsertSlaConfig({ data: r }),
    onSuccess: () => {
      toast.success("SLA atualizado.");
      qc.invalidateQueries({ queryKey: ["sla-config"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const rows = (data?.rows ?? []) as Row[];
  const byOrigem = new Map<string, Row[]>();
  for (const r of rows) {
    if (!byOrigem.has(r.origem)) byOrigem.set(r.origem, []);
    byOrigem.get(r.origem)!.push(r);
  }
  for (const list of byOrigem.values()) {
    list.sort((a, b) => PRIO_ORDER.indexOf(a.prioridade) - PRIO_ORDER.indexOf(b.prioridade));
  }

  const key = (o: string, p: string) => `${o}:${p}`;
  const patched = (r: Row): Row => ({ ...r, ...(edits[key(r.origem, r.prioridade)] ?? {}) });
  const isDirty = (r: Row) => {
    const p = patched(r);
    return (
      p.resposta_horas !== r.resposta_horas ||
      p.resolucao_horas !== r.resolucao_horas ||
      p.estagnado_horas !== r.estagnado_horas
    );
  };
  const setField = (r: Row, field: keyof Row, value: number) =>
    setEdits((prev) => ({
      ...prev,
      [key(r.origem, r.prioridade)]: { ...prev[key(r.origem, r.prioridade)], [field]: value },
    }));

  return (
    <PageContainer>
      <PageHeader
        breadcrumbs={[{ label: "Administração" }, { label: "SLA de Chamados" }]}
        title="SLA de Chamados"
        subtitle="Prazos de resposta, resolução e estagnação por categoria (origem) e prioridade. Aplicados automaticamente aos novos chamados e aos alertas periódicos."
      />
      {isLoading ? (
        <div className="text-sm text-muted-foreground">Carregando…</div>
      ) : (
        <div className="space-y-4">
          {Array.from(byOrigem.entries()).map(([origem, list]) => (
            <Card key={origem}>
              <CardHeader>
                <CardTitle className="text-base">{ORIGEM_LABEL[origem] ?? origem}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                        <th className="py-2 pr-3 font-medium">Prioridade</th>
                        <th className="py-2 pr-3 font-medium">Resposta (h)</th>
                        <th className="py-2 pr-3 font-medium">Resolução (h)</th>
                        <th className="py-2 pr-3 font-medium">Estagnado (h)</th>
                        <th className="py-2 pr-3" />
                      </tr>
                    </thead>
                    <tbody>
                      {list.map((r) => {
                        const p = patched(r);
                        const dirty = isDirty(r);
                        return (
                          <tr key={r.prioridade} className="border-b last:border-b-0">
                            <td className="py-2 pr-3 font-medium">{PRIO_LABEL[r.prioridade]}</td>
                            <td className="py-2 pr-3">
                              <Input
                                type="number"
                                min={1}
                                className="h-8 w-24"
                                value={p.resposta_horas}
                                onChange={(e) =>
                                  setField(r, "resposta_horas", Number(e.target.value))
                                }
                              />
                            </td>
                            <td className="py-2 pr-3">
                              <Input
                                type="number"
                                min={1}
                                className="h-8 w-24"
                                value={p.resolucao_horas}
                                onChange={(e) =>
                                  setField(r, "resolucao_horas", Number(e.target.value))
                                }
                              />
                            </td>
                            <td className="py-2 pr-3">
                              <Input
                                type="number"
                                min={1}
                                className="h-8 w-24"
                                value={p.estagnado_horas}
                                onChange={(e) =>
                                  setField(r, "estagnado_horas", Number(e.target.value))
                                }
                              />
                            </td>
                            <td className="py-2 pr-3 text-right">
                              <Button
                                size="sm"
                                disabled={!dirty || upsert.isPending}
                                onClick={() => upsert.mutate(p)}
                              >
                                Salvar
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          ))}
          <p className="text-xs text-muted-foreground">
            Os prazos afetam apenas novos chamados ou aqueles cuja prioridade/origem for alterada.
            Chamados existentes mantêm o SLA calculado no momento da criação.
          </p>
        </div>
      )}
    </PageContainer>
  );
}
