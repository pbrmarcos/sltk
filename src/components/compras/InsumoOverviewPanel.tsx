import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import {
  CheckCircle2,
  Circle,
  AlertCircle,
  Trophy,
  Timer,
  Package,
  FileText,
  Wallet,
  CalendarClock,
  Sparkles,
  ArrowRight,
  HelpCircle,
  ShieldCheck,
  ShieldAlert,
  Send,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RfqTooltip } from "./RfqTooltip";
import { listInsumoAnexos } from "@/lib/insumo-anexos.functions";
import { listInsumoDocumentos } from "@/lib/compras-rfq-docs.functions";
import {
  solicitarAprovacaoOC,
  decidirAprovacaoOC,
  getAprovacaoAtualOC,
} from "@/lib/insumo-aprovacoes.functions";
import type { InsumoRow } from "@/lib/projeto-insumos.functions";
import type { InsumoStatus } from "@/lib/projeto-insumos.shared";

type Props = {
  insumo: InsumoRow;
  onGoToAnexos: () => void;
  onGoToAcoes: () => void;
};

type Anexo = {
  id: string;
  kind: string;
  valor: number | null;
  moeda: string | null;
  condicao_pagamento: string | null;
  lead_time_dias: number | null;
  incoterm: string | null;
  validade_ate: string | null;
  fornecedor_id: string | null;
  fornecedores?: {
    nome?: string | null;
    nome_fantasia?: string | null;
    codigo?: string | null;
  } | null;
  criado_em: string;
};

function fmtMoney(v: number | null | undefined, moeda: string | null | undefined) {
  if (v == null) return "—";
  try {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: moeda ?? "BRL" }).format(
      Number(v),
    );
  } catch {
    return `${moeda ?? ""} ${v}`;
  }
}

function fornecedorLabel(a: Anexo) {
  return (
    a.fornecedores?.nome_fantasia || a.fornecedores?.nome || a.fornecedores?.codigo || "Fornecedor"
  );
}

const STATUS_NEXT: Record<InsumoStatus, string> = {
  rascunho: "Aguardando aprovação da engenharia",
  aprovado: "Pronto para envio de Checklist pelo Compras",
  em_cotacao: "Aguardando propostas dos fornecedores",
  pronto_aprovacao: "Aguardando aprovação da engenharia/manager",
  cotado: "Aprovado — pronto para gerar Ordem de Compra",
  em_compra: "Ordem de compra em andamento",
  recebido: "Item recebido",
  cancelado: "Solicitação cancelada",
};

export function InsumoOverviewPanel({ insumo, onGoToAnexos, onGoToAcoes }: Props) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const listAnexosFn = useServerFn(listInsumoAnexos);
  const listDocsFn = useServerFn(listInsumoDocumentos);
  const getAprovFn = useServerFn(getAprovacaoAtualOC);
  const solicitarFn = useServerFn(solicitarAprovacaoOC);
  const decidirFn = useServerFn(decidirAprovacaoOC);

  const anexosQ = useQuery({
    queryKey: ["insumo-anexos", insumo.id],
    queryFn: () => listAnexosFn({ data: { insumo_id: insumo.id } }),
  });
  const docsQ = useQuery({
    queryKey: ["insumo-docs", insumo.id],
    queryFn: () => listDocsFn({ data: { insumo_id: insumo.id } }),
  });
  const aprovQ = useQuery({
    queryKey: ["insumo-aprov-oc", insumo.id],
    queryFn: () => getAprovFn({ data: { insumo_id: insumo.id } }),
  });

  const [dlgSolicitar, setDlgSolicitar] = useState(false);
  const [dlgDecidir, setDlgDecidir] = useState<null | "aprovado" | "recusado">(null);
  const [nota, setNota] = useState("");
  const [anexoEscolhido, setAnexoEscolhido] = useState<string | null>(null);

  const aprovAtual = aprovQ.data?.atual ?? null;
  const aprovada = aprovAtual?.decisao === "aprovado";
  const pendente = aprovAtual && !aprovAtual.decidido_em;

  async function handleSolicitar() {
    try {
      await solicitarFn({ data: { insumo_id: insumo.id, nota: nota || null } });
      toast.success("Aprovação solicitada");
      setDlgSolicitar(false);
      setNota("");
      qc.invalidateQueries({ queryKey: ["insumo-aprov-oc", insumo.id] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao solicitar");
    }
  }
  async function handleDecidir() {
    if (!aprovAtual || !dlgDecidir) return;
    if (dlgDecidir === "aprovado" && !anexoEscolhido) {
      toast.error("Escolha qual orçamento venceu");
      return;
    }
    try {
      await decidirFn({
        data: {
          aprovacao_id: aprovAtual.id,
          decisao: dlgDecidir,
          anexo_id: dlgDecidir === "aprovado" ? anexoEscolhido : null,
          nota: nota || null,
        },
      });
      toast.success(dlgDecidir === "aprovado" ? "Aprovado — enviado para o Compras" : "Recusado");
      setDlgDecidir(null);
      setNota("");
      setAnexoEscolhido(null);
      qc.invalidateQueries({ queryKey: ["insumo-aprov-oc", insumo.id] });
      qc.invalidateQueries({ queryKey: ["ordens", "aguardando-oc"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao decidir");
    }
  }

  const anexos = (anexosQ.data ?? []) as Anexo[];
  const orcamentos = useMemo(() => anexos.filter((a) => a.kind === "orcamento"), [anexos]);
  const rfqsGerados = docsQ.data?.length ?? 0;

  const { melhorPreco, melhorPrazo } = useMemo(() => {
    let best: Anexo | null = null;
    let fastest: Anexo | null = null;
    for (const o of orcamentos) {
      if (o.valor != null && (!best || Number(o.valor) < Number(best.valor))) best = o;
      if (
        o.lead_time_dias != null &&
        (!fastest || Number(o.lead_time_dias) < Number(fastest.lead_time_dias))
      )
        fastest = o;
    }
    return { melhorPreco: best, melhorPrazo: fastest };
  }, [orcamentos]);

  // Checklist de prontidão
  const checklist = useMemo(() => {
    const rows: Array<{
      key: string;
      label: React.ReactNode;
      ok: boolean;
      hint?: React.ReactNode;
    }> = [
      {
        key: "descricao",
        label: "Descrição preenchida",
        ok: !!insumo.descricao && insumo.descricao.length >= 3,
      },
      {
        key: "fabricante",
        label: "Fabricante informado",
        ok: !!insumo.fabricante_sugerido,
        hint: "Opcional, mas ajuda o fornecedor",
      },
      {
        key: "part_number",
        label: "Part Number / código",
        ok: !!insumo.part_number || !!insumo.codigo_interno,
        hint: "Ao menos um dos dois",
      },
      { key: "especificacao", label: "Especificação técnica", ok: !!insumo.especificacao_tecnica },
      { key: "necessidade", label: "Necessidade em (data)", ok: !!insumo.necessidade_em },
      { key: "criticidade", label: "Criticidade definida", ok: !!insumo.criticidade },
      {
        key: "rfq_gerado",
        label: (
          <span className="inline-flex items-center gap-1">
            Checklist gerado
            <RfqTooltip>
              <HelpCircle className="h-3 w-3 text-[var(--text-muted)] cursor-help" />
            </RfqTooltip>
          </span>
        ),
        ok: rfqsGerados > 0,
        hint: rfqsGerados ? `${rfqsGerados} PDF(s) no Drive` : "Gere na aba Ações",
      },
      {
        key: "propostas",
        label: "Propostas recebidas (≥ 2)",
        ok: orcamentos.length >= 2,
        hint: `${orcamentos.length} recebida(s)`,
      },
    ];
    const done = rows.filter((r) => r.ok).length;
    return { rows, done, total: rows.length, pct: Math.round((done / rows.length) * 100) };
  }, [insumo, rfqsGerados, orcamentos.length]);

  const status = insumo.status as InsumoStatus;
  const nextAction = STATUS_NEXT[status] ?? "—";

  return (
    <div className="space-y-4">
      {/* KPI grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <KpiCard
          icon={<Package className="h-4 w-4" />}
          label="Cotações recebidas"
          value={orcamentos.length.toString()}
          hint={
            <span className="inline-flex items-center gap-1">
              <RfqTooltip>
                <span className="cursor-help underline decoration-zinc-300 underline-offset-2">
                  {rfqsGerados ? `${rfqsGerados} Checklist enviado(s)` : "Nenhum Checklist enviado"}
                </span>
              </RfqTooltip>
            </span>
          }
          tone={orcamentos.length >= 2 ? "success" : orcamentos.length === 1 ? "warning" : "muted"}
        />
        <KpiCard
          icon={<Trophy className="h-4 w-4" />}
          label="Melhor preço"
          value={melhorPreco ? fmtMoney(Number(melhorPreco.valor), melhorPreco.moeda) : "—"}
          hint={melhorPreco ? fornecedorLabel(melhorPreco) : "aguardando"}
          tone={melhorPreco ? "success" : "muted"}
        />
        <KpiCard
          icon={<Timer className="h-4 w-4" />}
          label="Menor prazo"
          value={melhorPrazo?.lead_time_dias != null ? `${melhorPrazo.lead_time_dias} dias` : "—"}
          hint={melhorPrazo ? fornecedorLabel(melhorPrazo) : "aguardando"}
          tone={melhorPrazo ? "info" : "muted"}
        />
        <KpiCard
          icon={<Sparkles className="h-4 w-4" />}
          label="Próxima ação"
          value={nextAction}
          hint={`Status: ${status}`}
          tone="accent"
          small
        />
      </div>

      {/* Prontidão / checklist */}
      <div className="rounded-lg border border-[var(--bg-border)] bg-[var(--bg-surface)] p-3.5">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-wide text-[var(--text-muted)] font-medium">
              Prontidão do item
            </span>
            <Badge variant="outline" className="font-mono text-[10px]">
              {checklist.done}/{checklist.total}
            </Badge>
          </div>
          <span className="text-xs text-[var(--text-muted)] tabular-nums">{checklist.pct}%</span>
        </div>
        <Progress value={checklist.pct} className="h-1.5 mb-3" />
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5">
          {checklist.rows.map((r) => (
            <li key={r.key} className="flex items-start gap-2 text-xs">
              {r.ok ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 mt-0.5 shrink-0" />
              ) : (
                <Circle className="h-3.5 w-3.5 text-[var(--text-muted)] mt-0.5 shrink-0" />
              )}
              <div className="flex-1 leading-tight">
                <span
                  className={cn(r.ok ? "text-[var(--text-primary)]" : "text-[var(--text-muted)]")}
                >
                  {r.label}
                </span>
                {r.hint && (
                  <span className="block text-[10.5px] text-[var(--text-muted)]">{r.hint}</span>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Aprovação para emissão de OC */}
      <div
        className={cn(
          "rounded-lg border p-3.5",
          aprovada
            ? "border-emerald-200 bg-emerald-50/50"
            : pendente
              ? "border-amber-200 bg-amber-50/50"
              : "border-[var(--bg-border)] bg-[var(--bg-surface)]",
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2">
            {aprovada ? (
              <ShieldCheck className="h-4 w-4 text-emerald-600 mt-0.5" />
            ) : (
              <ShieldAlert className="h-4 w-4 text-amber-600 mt-0.5" />
            )}
            <div>
              <div className="text-sm font-medium text-[var(--text-primary)]">
                Aprovação para emissão de OC
              </div>
              <div className="text-xs text-[var(--text-secondary)] mt-0.5">
                {aprovada
                  ? "Aprovado — aguardando o Compras emitir a OC."
                  : pendente
                    ? "Aguardando decisão de engenheiro / gerente / admin."
                    : "Solicite aprovação antes de emitir a OC."}
              </div>
              {aprovada && aprovAtual?.fornecedor_id_sugerido && (
                <div className="text-[11px] text-emerald-700 mt-1">
                  Orçamento vencedor definido pelo aprovador.
                </div>
              )}
              {aprovAtual?.solicitacao_nota && (
                <div className="text-[11px] text-[var(--text-muted)] mt-1">
                  Nota da solicitação: {aprovAtual.solicitacao_nota}
                </div>
              )}
              {aprovAtual?.decisao_nota && (
                <div className="text-[11px] text-[var(--text-muted)] mt-0.5">
                  Nota da decisão: {aprovAtual.decisao_nota}
                </div>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-1.5 shrink-0">
            {!aprovAtual || aprovAtual.decidido_em
              ? !aprovada && (
                  <Button size="sm" variant="outline" onClick={() => setDlgSolicitar(true)}>
                    <Send className="h-3.5 w-3.5 mr-1" /> Solicitar aprovação
                  </Button>
                )
              : null}
            {pendente && (
              <>
                <Button
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700"
                  onClick={() => {
                    setAnexoEscolhido(null);
                    setDlgDecidir("aprovado");
                  }}
                >
                  Aprovar
                </Button>
                <Button size="sm" variant="destructive" onClick={() => setDlgDecidir("recusado")}>
                  Recusar
                </Button>
              </>
            )}
            {aprovada && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate({ to: "/compras/ordens" })}
              >
                Ver em Ordens de Compra
                <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            )}
          </div>
        </div>
      </div>

      <Dialog open={dlgSolicitar} onOpenChange={setDlgSolicitar}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Solicitar aprovação para emissão de OC</DialogTitle>
          </DialogHeader>
          <Textarea
            placeholder="Contextualize a solicitação (opcional)"
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDlgSolicitar(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSolicitar}>Enviar solicitação</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!dlgDecidir} onOpenChange={(o) => !o && setDlgDecidir(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {dlgDecidir === "aprovado" ? "Aprovar emissão de OC" : "Recusar emissão de OC"}
            </DialogTitle>
          </DialogHeader>

          {dlgDecidir === "aprovado" && (
            <div className="space-y-2">
              <div className="text-xs font-medium text-[var(--text-secondary)]">
                Selecione o orçamento vencedor
              </div>
              {orcamentos.length === 0 ? (
                <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                  Nenhum orçamento cadastrado. Adicione ao menos um orçamento na aba
                  <b> Anexos & Orçamentos</b> antes de aprovar.
                </div>
              ) : (
                <div className="max-h-64 overflow-y-auto rounded-md border border-[var(--bg-border)] divide-y">
                  {orcamentos.map((o) => {
                    const isBest = melhorPreco?.id === o.id;
                    const isFast = melhorPrazo?.id === o.id;
                    const checked = anexoEscolhido === o.id;
                    return (
                      <label
                        key={o.id}
                        className={cn(
                          "flex items-start gap-3 px-3 py-2 cursor-pointer hover:bg-[var(--bg-elevated)]",
                          checked && "bg-emerald-50/60",
                        )}
                      >
                        <input
                          type="radio"
                          name="orc-vencedor"
                          checked={checked}
                          onChange={() => setAnexoEscolhido(o.id)}
                          className="mt-1"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 text-sm font-medium text-[var(--text-primary)]">
                            <span className="truncate">{fornecedorLabel(o)}</span>
                            {isBest && (
                              <Badge
                                variant="outline"
                                className="border-emerald-300 text-emerald-700 text-[10px]"
                              >
                                <Trophy className="h-3 w-3 mr-0.5" /> Melhor preço
                              </Badge>
                            )}
                            {isFast && (
                              <Badge
                                variant="outline"
                                className="border-blue-300 text-blue-700 text-[10px]"
                              >
                                <Timer className="h-3 w-3 mr-0.5" /> Menor prazo
                              </Badge>
                            )}
                          </div>
                          <div className="text-[11px] text-[var(--text-muted)] mt-0.5 flex flex-wrap gap-x-3">
                            <span>
                              Valor: <b>{fmtMoney(Number(o.valor), o.moeda)}</b>
                            </span>
                            {o.lead_time_dias != null && (
                              <span>Prazo: {o.lead_time_dias} dias</span>
                            )}
                            {o.incoterm && <span>Incoterm: {o.incoterm}</span>}
                            {o.condicao_pagamento && <span>Pagto: {o.condicao_pagamento}</span>}
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <Textarea
            placeholder={
              dlgDecidir === "aprovado" ? "Justificativa (opcional)" : "Motivo da recusa (opcional)"
            }
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDlgDecidir(null)}>
              Cancelar
            </Button>
            <Button
              onClick={handleDecidir}
              disabled={dlgDecidir === "aprovado" && !anexoEscolhido}
              className={dlgDecidir === "aprovado" ? "bg-emerald-600 hover:bg-emerald-700" : ""}
              variant={dlgDecidir === "recusado" ? "destructive" : "default"}
            >
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Comparativo de propostas */}

      <div className="rounded-lg border border-[var(--bg-border)] bg-[var(--bg-surface)] overflow-hidden">
        <div className="flex items-center justify-between px-3.5 py-2.5 border-b bg-[var(--bg-elevated)]">
          <div className="flex items-center gap-2">
            <FileText className="h-3.5 w-3.5 text-[var(--text-muted)]" />
            <span className="text-xs uppercase tracking-wide text-[var(--text-secondary)] font-medium">
              Comparativo de propostas
            </span>
            <Badge variant="outline" className="font-mono text-[10px]">
              {orcamentos.length}
            </Badge>
          </div>
          <button
            type="button"
            onClick={onGoToAnexos}
            className="text-[11px] text-blue-600 hover:underline inline-flex items-center gap-1"
          >
            {orcamentos.length ? "Gerenciar orçamentos" : "Adicionar orçamento"}
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>

        {orcamentos.length === 0 ? (
          <EmptyState
            onGoToAnexos={onGoToAnexos}
            onGoToAcoes={onGoToAcoes}
            hasRfq={rfqsGerados > 0}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-[var(--bg-elevated)] text-[10.5px] uppercase tracking-wide text-[var(--text-muted)]">
                <tr>
                  <th className="text-left px-3 py-2 font-medium">Fornecedor</th>
                  <th className="text-right px-3 py-2 font-medium">
                    <Wallet className="h-3 w-3 inline mr-1" />
                    Valor
                  </th>
                  <th className="text-center px-3 py-2 font-medium">
                    <Timer className="h-3 w-3 inline mr-1" />
                    Prazo
                  </th>
                  <th className="text-center px-3 py-2 font-medium">Incoterm</th>
                  <th className="text-left px-3 py-2 font-medium">Pagamento</th>
                  <th className="text-center px-3 py-2 font-medium">
                    <CalendarClock className="h-3 w-3 inline mr-1" />
                    Validade
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--bg-border)]">
                {orcamentos.map((o) => {
                  const isBestPrice = melhorPreco?.id === o.id;
                  const isBestLead = melhorPrazo?.id === o.id;
                  const expired = o.validade_ate ? new Date(o.validade_ate) < new Date() : false;
                  return (
                    <tr
                      key={o.id}
                      className={cn(
                        "hover:bg-[var(--bg-elevated)]",
                        isBestPrice && "bg-emerald-50/30",
                      )}
                    >
                      <td
                        className="px-3 py-2 font-medium text-[var(--text-primary)] truncate max-w-[180px]"
                        title={fornecedorLabel(o)}
                      >
                        {fornecedorLabel(o)}
                      </td>
                      <td
                        className={cn(
                          "px-3 py-2 text-right tabular-nums",
                          isBestPrice && "text-emerald-700 font-semibold",
                        )}
                      >
                        <div className="flex items-center justify-end gap-1.5">
                          {isBestPrice && <Trophy className="h-3 w-3 text-emerald-600" />}
                          {fmtMoney(o.valor != null ? Number(o.valor) : null, o.moeda)}
                        </div>
                      </td>
                      <td
                        className={cn(
                          "px-3 py-2 text-center tabular-nums",
                          isBestLead && "text-blue-700 font-semibold",
                        )}
                      >
                        {o.lead_time_dias != null ? `${o.lead_time_dias} d` : "—"}
                      </td>
                      <td className="px-3 py-2 text-center text-[var(--text-secondary)]">
                        {o.incoterm || "—"}
                      </td>
                      <td
                        className="px-3 py-2 text-[var(--text-secondary)] truncate max-w-[160px]"
                        title={o.condicao_pagamento ?? ""}
                      >
                        {o.condicao_pagamento || "—"}
                      </td>
                      <td className="px-3 py-2 text-center">
                        {o.validade_ate ? (
                          <span
                            className={cn(
                              "inline-flex items-center gap-1",
                              expired ? "text-red-600" : "text-[var(--text-secondary)]",
                            )}
                          >
                            {expired && <AlertCircle className="h-3 w-3" />}
                            {format(new Date(o.validade_ate), "dd/MM/yy", { locale: ptBR })}
                          </span>
                        ) : (
                          <span className="text-[var(--text-muted)]">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {orcamentos.length >= 2 && (
          <div className="px-3.5 py-2 border-t bg-[var(--bg-elevated)] text-[11px] text-[var(--text-muted)] flex flex-wrap gap-x-4 gap-y-1">
            <span className="inline-flex items-center gap-1">
              <Trophy className="h-3 w-3 text-emerald-600" /> melhor preço
            </span>
            <span className="inline-flex items-center gap-1">
              <Timer className="h-3 w-3 text-blue-600" /> menor prazo
            </span>
            <span className="inline-flex items-center gap-1">
              <AlertCircle className="h-3 w-3 text-red-600" /> proposta vencida
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function KpiCard({
  icon,
  label,
  value,
  hint,
  tone = "muted",
  small = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: React.ReactNode;
  tone?: "success" | "warning" | "info" | "accent" | "muted";
  small?: boolean;
}) {
  const tones: Record<string, string> = {
    success: "border-emerald-200 bg-emerald-50/50 text-emerald-900",
    warning: "border-amber-200 bg-amber-50/50 text-amber-900",
    info: "border-blue-200 bg-blue-50/50 text-blue-900",
    accent: "border-violet-200 bg-violet-50/50 text-violet-900",
    muted: "border-[var(--bg-border)] bg-[var(--bg-surface)] text-[var(--text-secondary)]",
  };
  return (
    <div
      className={cn(
        "rounded-lg border p-2.5 flex flex-col justify-between min-h-[74px]",
        tones[tone],
      )}
    >
      <div className="flex items-center gap-1.5 text-[10.5px] uppercase tracking-wide opacity-80 font-medium">
        {icon}
        <span>{label}</span>
      </div>
      <div
        className={cn(
          "font-semibold leading-tight mt-1",
          small ? "text-[12px]" : "text-lg tabular-nums",
        )}
      >
        {value}
      </div>
      {hint && <div className="text-[10.5px] opacity-70 truncate">{hint}</div>}
    </div>
  );
}

function EmptyState({
  onGoToAnexos,
  onGoToAcoes,
  hasRfq,
}: {
  onGoToAnexos: () => void;
  onGoToAcoes: () => void;
  hasRfq: boolean;
}) {
  return (
    <div className="p-6 text-center">
      <div className="mx-auto h-10 w-10 rounded-full bg-[var(--bg-elevated)] flex items-center justify-center mb-2">
        <FileText className="h-5 w-5 text-[var(--text-muted)]" />
      </div>
      <p className="text-sm text-[var(--text-secondary)] font-medium">
        Nenhuma proposta recebida ainda
      </p>
      <p className="text-xs text-[var(--text-muted)] mt-1 mb-3">
        {hasRfq ? (
          <>
            <RfqTooltip>
              <span className="cursor-help underline decoration-zinc-300 underline-offset-2">
                Checklist
              </span>
            </RfqTooltip>{" "}
            já foi enviado — anexe as propostas retornadas pelos fornecedores.
          </>
        ) : (
          <>
            Gere o{" "}
            <RfqTooltip>
              <span className="cursor-help underline decoration-zinc-300 underline-offset-2">
                Checklist
              </span>
            </RfqTooltip>{" "}
            e depois anexe as propostas recebidas para comparar aqui.
          </>
        )}
      </p>
      <div className="flex items-center justify-center gap-2">
        {!hasRfq && (
          <button
            type="button"
            onClick={onGoToAcoes}
            className="text-[11px] px-2.5 py-1 rounded border border-[var(--bg-border)] hover:border-[var(--bg-border)] text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]"
          >
            Gerar Checklist
          </button>
        )}
        <button
          type="button"
          onClick={onGoToAnexos}
          className="text-[11px] px-2.5 py-1 rounded border border-blue-300 bg-blue-50 hover:bg-blue-100 text-blue-700"
        >
          Anexar proposta
        </button>
      </div>
    </div>
  );
}
