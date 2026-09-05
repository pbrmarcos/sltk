import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  AlertTriangle,
  CheckCircle2,
  CircleSlash,
  Loader2,
  MinusCircle,
  RefreshCw,
} from "lucide-react";
import { runDiagnostico, type CapabilityStatus, type DiagnosticoResumo } from "@/lib/system-diagnostics.functions";
import { AREA_LABEL, CAPABILITIES, type CapabilityArea } from "@/lib/system-keys";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { IntegracoesTab } from "@/components/admin/IntegracoesTab";
import { GroqConfigCard } from "@/components/admin/GroqConfigCard";
import { EnriquecimentoLogsTab } from "@/components/admin/EnriquecimentoLogsTab";
import { BancoTab } from "@/components/admin/BancoTab";

const AREAS = Object.keys(AREA_LABEL) as CapabilityArea[];

const STATUS_META: Record<
  CapabilityStatus["status"],
  { label: string; className: string; Icon: typeof CheckCircle2 }
> = {
  ok: { label: "Funcionando", className: "text-[var(--success)]", Icon: CheckCircle2 },
  ausente: { label: "Não configurada", className: "text-[var(--text-muted)]", Icon: MinusCircle },
  erro: { label: "Com erro", className: "text-[var(--danger)]", Icon: AlertTriangle },
  nao_testado: { label: "Configurada", className: "text-[var(--text-muted)]", Icon: CircleSlash },
};

export function DiagnosticoTab() {
  const [itens, setItens] = useState<CapabilityStatus[]>([]);
  const [resumo, setResumo] = useState<DiagnosticoResumo | null>(null);
  const [testando, setTestando] = useState<string | null>(null);
  const fn = useServerFn(runDiagnostico);

  const rodar = useMutation({
    mutationFn: (ids?: string[]) => fn({ data: { ids } }),
    onMutate: (ids) => setTestando(ids?.length === 1 ? ids[0]! : "*"),
    onSettled: () => setTestando(null),
    onSuccess: (res, ids) => {
      if (ids?.length) {
        setItens((prev) => {
          const mapa = new Map(res.itens.map((i) => [i.id, i]));
          return prev.map((i) => mapa.get(i.id) ?? i);
        });
      } else {
        setItens(res.itens);
        setResumo(res.resumo);
      }
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "Não foi possível executar o diagnóstico."),
  });

  const porArea = useMemo(() => {
    const base = itens.length
      ? itens
      : CAPABILITIES.map<CapabilityStatus>((c) => ({
          id: c.id,
          label: c.label,
          descricao: c.descricao,
          impacto: c.impacto,
          area: c.area,
          criticidade: c.criticidade,
          status: "nao_testado",
          detalhe: "Ainda não verificada nesta sessão.",
          envs: [],
        }));
    return AREAS.map((area) => ({ area, itens: base.filter((i) => i.area === area) })).filter(
      (g) => g.itens.length > 0,
    );
  }, [itens]);

  const rodandoTudo = rodar.isPending && testando === "*";

  return (
    <Tabs defaultValue="chaves" className="w-full">
      <TabsList>
        <TabsTrigger value="chaves">Chaves</TabsTrigger>
        <TabsTrigger value="banco">Banco de Dados</TabsTrigger>
        <TabsTrigger value="fiscal">Integrações fiscais</TabsTrigger>
        <TabsTrigger value="logs">Logs</TabsTrigger>
      </TabsList>

      <TabsContent value="chaves" className="mt-4 space-y-6">
        <div className="rounded-[var(--radius-lg)] border border-[var(--bg-border)] bg-[var(--bg-surface)] p-4 shadow-[var(--shadow-sm)]">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">Chaves & Diagnóstico</h2>
              <p className="mt-0.5 max-w-2xl text-[12.5px] text-[var(--text-muted)]">
                Todas as credenciais externas usadas pelo sistema, o que cada uma habilita e o que deixa de
                funcionar quando está ausente. Os valores nunca são exibidos — apenas mascarados.
              </p>
            </div>
            <Button size="sm" onClick={() => rodar.mutate(undefined)} disabled={rodar.isPending}>
              {rodandoTudo ? (
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-3.5 w-3.5" />
              )}
              Testar tudo
            </Button>
          </div>

          {resumo && (
            <div className="mt-3 flex flex-wrap items-center gap-2 text-[12px]">
              <Badge variant="outline" className="text-[10.5px]">{resumo.ok} funcionando</Badge>
              <Badge variant="outline" className="text-[10.5px]">{resumo.ausentes} não configuradas</Badge>
              <Badge variant="outline" className="text-[10.5px]">{resumo.erros} com erro</Badge>
              <span className="text-[var(--text-muted)]">
                Última verificação: {new Date(resumo.verificadoEm).toLocaleString("pt-BR")}
              </span>
            </div>
          )}
        </div>

        {porArea.map(({ area, itens: linhas }) => (
          <section key={area} className="space-y-2">
            <h3 className="text-[12px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
              {AREA_LABEL[area]}
            </h3>
            <div className="divide-y divide-[var(--bg-border)] rounded-[var(--radius-lg)] border border-[var(--bg-border)] bg-[var(--bg-surface)] shadow-[var(--shadow-sm)]">
              {linhas.map((i) => {
                const meta = STATUS_META[i.status];
                const Icon = meta.Icon;
                return (
                  <div key={i.id} className="flex flex-wrap items-start justify-between gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-[13.5px] font-semibold text-[var(--text-primary)]">{i.label}</h4>
                        {i.criticidade === "critica" && (
                          <Badge variant="secondary" className="text-[10px]">Crítica</Badge>
                        )}
                        {typeof i.latencia_ms === "number" && (
                          <Badge variant="outline" className="text-[10px]">{i.latencia_ms} ms</Badge>
                        )}
                      </div>
                      <p className="mt-0.5 text-[12px] text-[var(--text-muted)]">{i.descricao}</p>
                      {i.status !== "ok" && (
                        <p className="mt-0.5 text-[12px] text-[var(--text-muted)]">{i.impacto}</p>
                      )}
                      {i.detalhe && (
                        <p className={`mt-1 text-[12px] ${meta.className}`}>{i.detalhe}</p>
                      )}
                      {i.envs.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          {i.envs.map((e) => (
                            <code
                              key={e.nome}
                              className="rounded bg-muted px-1.5 py-0.5 text-[10.5px] font-mono text-muted-foreground"
                              title={e.presente ? (e.mascara ?? "") : "Não definida neste ambiente"}
                            >
                              {e.nome}: {e.presente ? (e.mascara ?? "definida") : "—"}
                              {e.opcional ? " (opcional)" : ""}
                            </code>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`inline-flex items-center gap-1.5 text-[12px] font-medium ${meta.className}`}>
                        <Icon className="h-4 w-4" /> {meta.label}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => rodar.mutate([i.id])}
                        disabled={rodar.isPending}
                      >
                        {rodar.isPending && testando === i.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          "Testar"
                        )}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </TabsContent>

      <TabsContent value="banco" className="mt-4">
        <BancoTab />
      </TabsContent>

      <TabsContent value="fiscal" className="mt-4 space-y-6">
        <section className="space-y-2">
          <h3 className="text-[12px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            Conta Groq
          </h3>
          <GroqConfigCard />
        </section>

        <section className="space-y-2">
          <h3 className="text-[12px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            Provedores fiscais por país
          </h3>
          <IntegracoesTab />
        </section>
      </TabsContent>

      <TabsContent value="logs" className="mt-4">
        <EnriquecimentoLogsTab />
      </TabsContent>
    </Tabs>
  );
}
