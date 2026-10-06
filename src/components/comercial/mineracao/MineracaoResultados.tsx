/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  AlertTriangle,
  ChevronDown,
  Download,
  Loader2,
  MessageSquare,
  Send,
  Sparkles,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { StatLine } from "@/components/data/StatLine";
import {
  converterLeadEmOportunidade,
  listarResultados,
  salvarAnotacaoLead,
} from "@/lib/mineracao.functions";
import { reanalisarLeads } from "@/lib/mineracao-analise.functions";
import { exportarResultadosXlsx } from "@/lib/mineracao/exportar";
import { cn } from "@/lib/utils";
import { metaDaCampanha, rotuloModo, usd, type Campanha, type Papel } from "./mineracao-utils";

/**
 * Resultados de uma busca: linha de totais, filtro + Exportar, tabela de 7
 * colunas. Ticket médio, anotação, análise da IA e parceiros ficam no detalhe
 * da linha; ações em lote numa barra que só aparece com seleção.
 */
export function MineracaoResultados({
  campanhaId,
  campanha,
  aviso,
  onLimparAviso,
}: {
  campanhaId: string;
  campanha: Campanha | undefined;
  aviso: string | null;
  onLimparAviso: () => void;
}) {
  const qc = useQueryClient();
  const fetchResultados = useServerFn(listarResultados);
  const converter = useServerFn(converterLeadEmOportunidade);
  const salvarNota = useServerFn(salvarAnotacaoLead);
  const reanalisar = useServerFn(reanalisarLeads);

  const [busca, setBusca] = React.useState("");
  const [selecionados, setSelecionados] = React.useState<string[]>([]);
  const [aberto, setAberto] = React.useState<string | null>(null);
  const [papel, setPapel] = React.useState<Papel>("importador");
  const [exportando, setExportando] = React.useState(false);

  React.useEffect(() => {
    setSelecionados([]);
    setAberto(null);
  }, [campanhaId]);

  const resultados = useQuery({
    queryKey: ["mineracao-resultados", campanhaId, busca],
    queryFn: () =>
      fetchResultados({ data: { campanha_id: campanhaId, busca: busca || undefined } }),
    refetchInterval: (q) =>
      ((q.state.data ?? []) as Array<Record<string, unknown>>).some(
        (r) => r["analise_status"] === "pendente",
      )
        ? 6000
        : false,
  });
  const linhas = (resultados.data ?? []) as Array<Record<string, any>>;
  const selecionaveis = linhas
    .filter((r) => !r["convertido_oportunidade_id"])
    .map((r) => r["id"] as string);
  const todos = selecionaveis.length > 0 && selecionaveis.every((id) => selecionados.includes(id));
  const totalValor = linhas.reduce((s, r) => s + Number(r["valor_total"] ?? 0), 0);
  const totalOps = linhas.reduce((s, r) => s + Number(r["operacoes"] ?? 0), 0);

  const notaMut = useMutation({
    mutationFn: (v: { resultado_id: string; anotacao: string }) => salvarNota({ data: v }),
    onSuccess: () => {
      toast.success("Anotação salva.");
      void qc.invalidateQueries({ queryKey: ["mineracao-resultados"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const converterMut = useMutation({
    mutationFn: (ids: string[]) => converter({ data: { resultado_ids: ids, papel } }),
    onSuccess: (r) => {
      toast.success(
        `${r.criadas.length} suspect(s) no pipeline${r.ignorados ? ` · ${r.ignorados} já convertido(s)` : ""}.`,
      );
      setSelecionados([]);
      void qc.invalidateQueries({ queryKey: ["mineracao-resultados"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const reanalisarMut = useMutation({
    mutationFn: (ids: string[]) => reanalisar({ data: { ids } }),
    onSuccess: (r) => {
      toast.success(`${r.enfileirados} lead(s) na fila da IA.`);
      void qc.invalidateQueries({ queryKey: ["mineracao-resultados"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const exportar = async () => {
    if (!campanha) return;
    setExportando(true);
    try {
      await exportarResultadosXlsx(
        linhas,
        metaDaCampanha(campanha),
        `mineracao-${campanha["nome"]}`,
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível exportar.");
    } finally {
      setExportando(false);
    }
  };

  return (
    <section className="rounded-lg border bg-card">
      <div className="flex flex-wrap items-center gap-3 border-b px-3 py-2.5">
        <StatLine
          items={[
            {
              label: campanha?.["modo"] === "empresas" ? "empresas" : "relações",
              value: linhas.length,
            },
            { label: "em valor", value: usd(totalValor) },
            { label: "operações", value: totalOps.toLocaleString("pt-BR") },
          ]}
        />
        {campanha && (
          <span className="text-[11.5px] text-muted-foreground">
            {rotuloModo(campanha["modo"])} · {campanha["start_date"]} → {campanha["end_date"]} ·{" "}
            {campanha["responsavel"] ?? "—"}
          </span>
        )}
        <div className="flex-1" />
        <Input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Filtrar empresa…"
          className="h-8 w-44 text-[12px]"
        />
        <Button
          size="sm"
          variant="outline"
          className="h-8"
          disabled={!linhas.length || exportando}
          onClick={() => void exportar()}
        >
          {exportando ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Download className="h-3.5 w-3.5" />
          )}
          Exportar
        </Button>
      </div>

      {aviso && (
        <div className="flex items-start gap-2 border-b bg-amber-50 px-3 py-2 text-[12px] text-amber-900">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span className="flex-1">{aviso}</span>
          <button type="button" onClick={onLimparAviso} aria-label="Fechar aviso">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead className="text-left text-[11.5px] text-muted-foreground">
            <tr className="border-b">
              <th className="w-9 p-2">
                <Checkbox
                  checked={todos}
                  aria-label="Selecionar todos"
                  onCheckedChange={(v) => setSelecionados(v ? selecionaveis : [])}
                />
              </th>
              <th className="p-2 font-medium">Empresa</th>
              <th className="p-2 font-medium">Contraparte</th>
              <th className="p-2 font-medium">NCMs</th>
              <th className="p-2 text-right font-medium">Operações</th>
              <th className="p-2 text-right font-medium">Valor</th>
              <th className="hidden p-2 font-medium md:table-cell">Última op.</th>
              <th className="p-2 font-medium">Pipeline</th>
            </tr>
          </thead>
          <tbody>
            {resultados.isLoading && (
              <tr>
                <td colSpan={8} className="p-6 text-center text-muted-foreground">
                  Carregando resultados…
                </td>
              </tr>
            )}
            {linhas.map((r) => {
              const id = r["id"] as string;
              const convertido = Boolean(r["convertido_oportunidade_id"]);
              const ops = Number(r["operacoes"] ?? 0);
              const valor = Number(r["valor_total"] ?? 0);
              const parceiros = (r["parceiros"] ?? []) as Array<{
                nome: string;
                operacoes: number;
                valor: number;
              }>;
              const rubros = (r["rubros"] ?? []) as string[];
              const expandido = aberto === id;
              return (
                <React.Fragment key={id}>
                  <tr
                    className={cn(
                      "cursor-pointer border-b hover:bg-muted/30",
                      expandido && "bg-muted/20",
                    )}
                    onClick={() => setAberto(expandido ? null : id)}
                  >
                    <td className="p-2" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selecionados.includes(id)}
                        disabled={convertido}
                        onCheckedChange={(v) =>
                          setSelecionados((s) => (v ? [...s, id] : s.filter((x) => x !== id)))
                        }
                      />
                    </td>
                    <td className="p-2 font-medium">
                      <div className="flex items-center gap-1.5">
                        <ChevronDown
                          className={cn(
                            "h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform",
                            expandido && "rotate-180",
                          )}
                        />
                        <span className="truncate">{r["empresa"]}</span>
                        <GradePill r={r} onReanalisar={() => reanalisarMut.mutate([id])} />
                        {r["anotacao"] ? (
                          <MessageSquare
                            className="h-3 w-3 shrink-0 text-muted-foreground"
                            aria-label={String(r["anotacao"])}
                          />
                        ) : null}
                      </div>
                    </td>
                    <td className="p-2 text-muted-foreground">
                      {r["contraparte"]
                        ? String(r["contraparte"])
                        : parceiros.length
                          ? `${parceiros.length} parceiro(s)`
                          : "—"}
                    </td>
                    <td className="p-2 text-muted-foreground" title={rubros.join(", ")}>
                      {rubros.length <= 2 ? rubros.join(", ") : `${rubros.length} NCMs`}
                    </td>
                    <td className="p-2 text-right tabular-nums">{ops}</td>
                    <td className="p-2 text-right tabular-nums">{usd(valor)}</td>
                    <td className="hidden p-2 text-muted-foreground md:table-cell">
                      {r["ultima_operacao"] ?? "—"}
                    </td>
                    <td className="p-2 text-[12px] text-muted-foreground">
                      {convertido ? "Suspect" : "—"}
                    </td>
                  </tr>
                  {expandido && (
                    <tr className="border-b bg-muted/20">
                      <td />
                      <td colSpan={7} className="p-3">
                        <DetalheLinha
                          r={r}
                          ops={ops}
                          valor={valor}
                          parceiros={parceiros}
                          convertido={convertido}
                          salvarNota={(texto) =>
                            notaMut.mutate({ resultado_id: id, anotacao: texto })
                          }
                          salvando={notaMut.isPending}
                          onAnalisar={() => reanalisarMut.mutate([id])}
                          onEnviar={() => converterMut.mutate([id])}
                          enviando={converterMut.isPending}
                        />
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
            {!resultados.isLoading && linhas.length === 0 && (
              <tr>
                <td colSpan={8} className="p-6 text-center text-muted-foreground">
                  Nenhuma empresa nesta busca.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selecionados.length > 0 && (
        <div className="sticky bottom-3 z-20 mx-auto mt-3 flex w-fit max-w-[calc(100%-1.5rem)] flex-wrap items-center gap-2 rounded-full border bg-card px-4 py-2 text-[12.5px] shadow-lg">
          <span className="font-medium">{selecionados.length} selecionada(s)</span>
          <select
            value={papel}
            onChange={(e) => setPapel(e.target.value as Papel)}
            className="h-7 rounded-md border bg-background px-2 text-[12px]"
            title="Quem vira suspect"
          >
            <option value="importador">Abordar a empresa</option>
            <option value="fornecedor">Abordar a contraparte</option>
            <option value="ambos">As duas pontas</option>
          </select>
          <Button
            size="sm"
            className="h-7"
            disabled={converterMut.isPending}
            onClick={() => converterMut.mutate(selecionados)}
          >
            {converterMut.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
            Enviar como suspect
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7"
            disabled={reanalisarMut.isPending}
            onClick={() => reanalisarMut.mutate(selecionados)}
          >
            <Sparkles className="h-3.5 w-3.5" /> Analisar com IA
          </Button>
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground"
            onClick={() => setSelecionados([])}
            aria-label="Limpar seleção"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </section>
  );
}

function GradePill({ r, onReanalisar }: { r: Record<string, any>; onReanalisar: () => void }) {
  if (r["analise_status"] === "pendente")
    return <Loader2 className="h-3 w-3 shrink-0 animate-spin text-muted-foreground" />;
  if (r["analise_status"] === "erro")
    return (
      <button
        type="button"
        title="Reanalisar"
        onClick={(e) => {
          e.stopPropagation();
          onReanalisar();
        }}
        className="shrink-0 rounded-full bg-[var(--danger)]/10 px-1.5 text-[10px] font-semibold text-[var(--danger)]"
      >
        erro ↻
      </button>
    );
  const g = r["analise_grade"];
  if (!g) return null;
  return (
    <span
      className={cn(
        "shrink-0 rounded-full px-1.5 text-[10px] font-bold",
        g === "A"
          ? "bg-emerald-500/15 text-emerald-700"
          : g === "B"
            ? "bg-amber-500/15 text-amber-700"
            : "bg-slate-500/15 text-slate-600",
      )}
      title="Nota da IA"
    >
      {String(g)}
    </span>
  );
}

function DetalheLinha({
  r,
  ops,
  valor,
  parceiros,
  convertido,
  salvarNota,
  salvando,
  onAnalisar,
  onEnviar,
  enviando,
}: {
  r: Record<string, any>;
  ops: number;
  valor: number;
  parceiros: Array<{ nome: string; operacoes: number; valor: number }>;
  convertido: boolean;
  salvarNota: (texto: string) => void;
  salvando: boolean;
  onAnalisar: () => void;
  onEnviar: () => void;
  enviando: boolean;
}) {
  const [nota, setNota] = React.useState(String(r["anotacao"] ?? ""));
  const a = r["analise_ia"] as
    | {
        motivo?: string;
        abordagem_sugerida?: string | null;
        produtos_sltk?: string[];
        dados?: {
          documento_verificado?: string | null;
          receita?: { cnae_principal?: string } | null;
          site?: { resumo?: string | null } | null;
          telefone?: string | null;
          email?: string | null;
        };
      }
    | null
    | undefined;
  const rubros = (r["rubros"] ?? []) as string[];

  return (
    <div className="grid gap-3 text-[12.5px] lg:grid-cols-[1fr_280px]">
      <div className="space-y-2">
        <StatLine
          className="text-[12px]"
          items={[
            { label: "ticket médio", value: usd(ops > 0 ? valor / ops : 0) },
            { label: "NCMs", value: rubros.join(", ") || "—" },
            ...(r["ultima_operacao"]
              ? [{ label: "última operação", value: String(r["ultima_operacao"]) }]
              : []),
          ]}
        />
        {a ? (
          <div className="space-y-1 rounded-md border bg-card p-2.5">
            {a.motivo && (
              <p>
                <strong>IA:</strong> {a.motivo}
              </p>
            )}
            {a.abordagem_sugerida && (
              <p className="text-muted-foreground">
                <strong>Abordagem:</strong> {a.abordagem_sugerida}
              </p>
            )}
            {!!a.produtos_sltk?.length && (
              <p className="text-muted-foreground">
                <strong>Produtos SLTK:</strong> {a.produtos_sltk.join(", ")}
              </p>
            )}
            <p className="text-[11.5px] text-muted-foreground">
              {a.dados?.documento_verificado
                ? `CNPJ ${a.dados.documento_verificado}`
                : "CNPJ não verificado"}
              {a.dados?.receita?.cnae_principal ? ` · CNAE ${a.dados.receita.cnae_principal}` : ""}
              {a.dados?.telefone ? ` · ${a.dados.telefone}` : ""}
              {a.dados?.email ? ` · ${a.dados.email}` : ""}
            </p>
            {a.dados?.site?.resumo && (
              <p className="text-[11.5px] text-muted-foreground">{a.dados.site.resumo}</p>
            )}
          </div>
        ) : (
          <p className="text-[12px] text-muted-foreground">Sem análise da IA ainda.</p>
        )}
        {parceiros.length > 0 && (
          <ul className="space-y-0.5 text-[12px] text-muted-foreground">
            {parceiros.map((p) => (
              <li key={p.nome} className="flex justify-between gap-4">
                <span className="text-foreground">{p.nome}</span>
                <span>
                  {p.operacoes} op. · {usd(p.valor)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="space-y-2">
        <div className="flex gap-1.5">
          <Input
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            placeholder="Anotação (contato, próximo passo…)"
            className="h-8 text-[12px]"
          />
          <Button
            size="sm"
            variant="outline"
            className="h-8"
            disabled={salvando || nota === String(r["anotacao"] ?? "")}
            onClick={() => salvarNota(nota)}
          >
            Salvar
          </Button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Button size="sm" variant="outline" className="h-8" onClick={onAnalisar}>
            <Sparkles className="h-3.5 w-3.5" /> Analisar com IA
          </Button>
          <Button size="sm" className="h-8" disabled={convertido || enviando} onClick={onEnviar}>
            {enviando ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
            {convertido ? "Já é suspect" : "Enviar como suspect"}
          </Button>
        </div>
      </div>
    </div>
  );
}
