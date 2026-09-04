import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2, Rocket, Package, ClipboardList, Download, FileText } from "lucide-react";
import { resumoLiberacaoProducao, liberarEquipamentoProducao } from "@/lib/projeto-insumos.functions";
import { useFormDraft } from "@/hooks/use-form-draft";
import { confirmDiscard } from "@/lib/unsaved-guard";

function buildResumoRows(r: any, inicio: string, fim: string, obs: string) {
  const eq = r?.equipamento;
  const rows: Array<[string, string]> = [];
  rows.push(["Equipamento", `${eq?.codigo ?? ""} ${eq?.modelo ?? ""}`.trim()]);
  rows.push(["Cliente", `${eq?.clientes?.codigo ?? ""} ${eq?.clientes?.razao_social ?? ""}`.trim()]);
  rows.push(["Início previsto", inicio || ""]);
  rows.push(["Fim previsto", fim || ""]);
  rows.push(["Observações", obs || ""]);
  rows.push(["", ""]);
  rows.push(["Etapas por disciplina", ""]);
  rows.push(["Disciplina", "Concluídas / Em progresso / Bloqueadas / Não iniciadas"]);
  for (const [disc, s] of Object.entries(r?.etapasByDisc ?? {}) as Array<[string, any]>) {
    rows.push([disc, `${s.concluido ?? 0} / ${s.em_progresso ?? 0} / ${s.bloqueado ?? 0} / ${s.nao_iniciado ?? 0}`]);
  }
  rows.push(["", ""]);
  rows.push(["Insumos", ""]);
  rows.push(["Total de itens", String(r?.insumosTotais?.total ?? 0)]);
  rows.push(["Rascunhos", String(r?.insumosTotais?.rascunhoCount ?? 0)]);
  rows.push(["Aprovações pendentes", String(r?.aprovacoesPend ?? 0)]);
  rows.push(["Total estimado (R$)", String(r?.insumosTotais?.totalEstimado ?? 0)]);
  rows.push(["Total em estoque (R$)", String(r?.insumosTotais?.totalEstoque ?? 0)]);
  rows.push(["Total a comprar (R$)", String(r?.insumosTotais?.totalAComprar ?? 0)]);
  for (const [s, n] of Object.entries(r?.insumosStatus ?? {})) rows.push([`Status: ${s}`, String(n)]);
  return { eq, rows };
}

function downloadResumoCsv(r: any, inicio: string, fim: string, obs: string) {
  const { eq, rows } = buildResumoRows(r, inicio, fim, obs);
  const csv = rows
    .map(([a, b]) => [a, b].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(";"))
    .join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `resumo_liberacao_${(eq?.codigo ?? "equipamento").replace(/[^a-zA-Z0-9-_]/g, "_")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

async function downloadResumoPdf(r: any, inicio: string, fim: string, obs: string) {
  const { eq, rows } = buildResumoRows(r, inicio, fim, obs);
  const { pdf, Document, Page, Text, View, StyleSheet } = await import("@react-pdf/renderer");
  const styles = StyleSheet.create({
    page: { padding: 32, fontSize: 10, fontFamily: "Helvetica", color: "#111" },
    title: { fontSize: 16, fontFamily: "Helvetica-Bold", marginBottom: 4 },
    subtitle: { fontSize: 10, color: "#555", marginBottom: 14 },
    row: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: "#e5e7eb", paddingVertical: 4 },
    cellL: { width: "42%", fontFamily: "Helvetica-Bold", color: "#374151" },
    cellR: { width: "58%", color: "#111" },
    section: { marginTop: 10, marginBottom: 4, fontFamily: "Helvetica-Bold", fontSize: 11, color: "#a21caf" },
    foot: { marginTop: 18, fontSize: 8, color: "#6b7280" },
  });

  const isSection = (label: string) => label === "Etapas por disciplina" || label === "Insumos";

  const doc = (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Resumo de liberação para produção</Text>
        <Text style={styles.subtitle}>
          {`${eq?.codigo ?? ""} · ${eq?.modelo ?? ""}`.trim()}
          {eq?.clientes?.razao_social ? ` — ${eq.clientes.razao_social}` : ""}
        </Text>
        {rows.map(([a, b], i) => {
          if (!a && !b) return <View key={i} style={{ height: 6 }} />;
          if (isSection(a)) return <Text key={i} style={styles.section}>{a}</Text>;
          return (
            <View key={i} style={styles.row} wrap={false}>
              <Text style={styles.cellL}>{a}</Text>
              <Text style={styles.cellR}>{b}</Text>
            </View>
          );
        })}
        <Text style={styles.foot}>Gerado em {new Date().toLocaleString("pt-BR")}</Text>
      </Page>
    </Document>
  );

  const blob = await pdf(doc as any).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `resumo_liberacao_${(eq?.codigo ?? "equipamento").replace(/[^a-zA-Z0-9-_]/g, "_")}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}

const ETAPA_STATUS_LABEL: Record<string, string> = {
  concluido: "Concluídas",
  em_progresso: "Em progresso",
  bloqueado: "Bloqueadas",
  nao_iniciado: "Não iniciadas",
};
const DISC_LABEL: Record<string, string> = {
  engenharia: "Engenharia",
  automacao: "Automação",
  planejamento: "Planejamento",
  producao: "Produção",
  qualidade: "Qualidade",
};

function fmtMoeda(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function LiberarProducaoDialog({
  open,
  onClose,
  equipamentoId,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  equipamentoId: string;
  onDone: () => void;
}) {
  const resumoFn = useServerFn(resumoLiberacaoProducao);
  const liberarFn = useServerFn(liberarEquipamentoProducao);

  const [inicio, setInicio] = useState<string>(() => {
    const d = new Date(); d.setDate(d.getDate() + 3);
    return d.toISOString().slice(0, 10);
  });
  const [fim, setFim] = useState<string>(() => {
    const d = new Date(); d.setDate(d.getDate() + 45);
    return d.toISOString().slice(0, 10);
  });
  const [obs, setObs] = useState("");
  const todayDefaults = (() => {
    const start = new Date(); start.setDate(start.getDate() + 3);
    const end = new Date(); end.setDate(end.getDate() + 45);
    return { inicio: start.toISOString().slice(0, 10), fim: end.toISOString().slice(0, 10), obs: "" };
  })();
  const { clearDraft, isDirty } = useFormDraft({
    formKey: `liberar-producao:${equipamentoId}`,
    value: { inicio, fim, obs },
    initialValue: todayDefaults,
    enabled: open,
    onRestore: (saved) => { setInicio(saved.inicio); setFim(saved.fim); setObs(saved.obs); },
  });

  function requestClose() {
    if (!confirmDiscard(isDirty)) return;
    clearDraft();
    onClose();
  }

  const { data: resumo, isLoading } = useQuery({
    queryKey: ["resumo-liberacao", equipamentoId],
    queryFn: () => resumoFn({ data: { equipamento_id: equipamentoId } }),
    enabled: open,
  });

  const mut = useMutation({
    mutationFn: () =>
      liberarFn({
        data: {
          equipamento_id: equipamentoId,
          observacoes: obs || null,
          inicio_previsto: inicio || null,
          fim_previsto: fim || null,
        },
      }),
    onSuccess: () => {
      clearDraft();
      toast.success("Equipamento liberado para produção.");
      onDone();
    },
    onError: (e: any) => toast.error(e?.message ?? "Falha ao liberar."),
  });

  const r = resumo as any;
  const eq = r?.equipamento;
  const disciplinasEtapas = Object.entries(r?.etapasByDisc ?? {}) as Array<[string, Record<string, number>]>;
  const insumosStatus = Object.entries(r?.insumosStatus ?? {}) as Array<[string, number]>;
  const totais = r?.insumosTotais;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && requestClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Rocket className="h-5 w-5 text-fuchsia-600" /> Liberar equipamento para produção
          </DialogTitle>
          <DialogDescription className="text-xs">
            Confira o resumo abaixo. Após liberar, o pacote técnico é congelado, a Ordem de Montagem é gerada
            e Compras passa a poder emitir Ordens de Compra dos insumos aprovados.
          </DialogDescription>
        </DialogHeader>

        {isLoading || !r ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Carregando resumo…</p>
        ) : (
          <div className="space-y-4 text-sm">
            {/* Cabeçalho */}
            <div className="rounded-md border bg-zinc-50 p-3">
              <div className="flex items-center gap-2">
                <span className="font-semibold">{eq?.modelo}</span>
                <Badge variant="outline" className="font-mono text-[10px]">{eq?.codigo}</Badge>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {eq?.clientes?.razao_social} {eq?.clientes?.codigo ? `· ${eq?.clientes?.codigo}` : ""}
              </p>
            </div>

            {/* Alertas */}
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {totais?.rascunhoCount > 0 && (
                <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>
                    <b>{totais.rascunhoCount}</b> {totais.rascunhoCount === 1 ? "insumo" : "insumos"} ainda em rascunho.
                    Você pode liberar mesmo assim, mas eles não gerarão OC até serem aprovados.
                  </span>
                </div>
              )}
              {r.aprovacoesPend > 0 && (
                <div className="flex items-start gap-2 rounded-md border border-rose-200 bg-rose-50 p-2 text-xs text-rose-900">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>
                    <b>{r.aprovacoesPend}</b> {r.aprovacoesPend === 1 ? "aprovação pendente" : "aprovações pendentes"} —
                    decida antes ou depois da liberação.
                  </span>
                </div>
              )}
            </div>

            {/* Etapas por disciplina */}
            <div>
              <p className="mb-1 flex items-center gap-1 text-xs font-semibold text-zinc-700">
                <ClipboardList className="h-3.5 w-3.5" /> Etapas por disciplina
              </p>
              {disciplinasEtapas.length === 0 ? (
                <p className="text-xs italic text-muted-foreground">Sem etapas cadastradas.</p>
              ) : (
                <div className="grid gap-1.5 text-xs sm:grid-cols-2">
                  {disciplinasEtapas.map(([disc, s]) => {
                    const total = Object.values(s).reduce((a, b) => a + b, 0);
                    const concl = s.concluido ?? 0;
                    return (
                      <div key={disc} className="rounded border p-2">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{DISC_LABEL[disc] ?? disc}</span>
                          <span className="tabular-nums text-muted-foreground">
                            {concl}/{total}
                          </span>
                        </div>
                        <div className="mt-1 flex flex-wrap gap-1 text-[10px]">
                          {(["concluido", "em_progresso", "bloqueado", "nao_iniciado"] as const).map((k) =>
                            (s[k] ?? 0) > 0 ? (
                              <Badge key={k} variant="outline" className="font-normal">
                                {ETAPA_STATUS_LABEL[k]}: {s[k]}
                              </Badge>
                            ) : null,
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Insumos */}
            <div>
              <p className="mb-1 flex items-center gap-1 text-xs font-semibold text-zinc-700">
                <Package className="h-3.5 w-3.5" /> Insumos ({totais?.total ?? 0})
              </p>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="rounded border p-2">
                  <p className="text-[10px] uppercase text-muted-foreground">Total estimado</p>
                  <p className="text-sm font-semibold tabular-nums">{fmtMoeda(totais?.totalEstimado ?? 0)}</p>
                </div>
                <div className="rounded border border-emerald-200 bg-emerald-50 p-2">
                  <p className="text-[10px] uppercase text-emerald-700">Em estoque</p>
                  <p className="text-sm font-semibold tabular-nums text-emerald-900">{fmtMoeda(totais?.totalEstoque ?? 0)}</p>
                </div>
                <div className="rounded border border-blue-200 bg-blue-50 p-2">
                  <p className="text-[10px] uppercase text-blue-700">A comprar</p>
                  <p className="text-sm font-semibold tabular-nums text-blue-900">{fmtMoeda(totais?.totalAComprar ?? 0)}</p>
                </div>
              </div>
              {insumosStatus.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1 text-[10px]">
                  {insumosStatus.map(([s, n]) => (
                    <Badge key={s} variant="outline" className="font-normal">
                      {s}: {n}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Datas e observações */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-[10px] uppercase tracking-wide text-muted-foreground">
                  Início previsto (montagem)
                </label>
                <Input type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} />
              </div>
              <div>
                <label className="mb-1 block text-[10px] uppercase tracking-wide text-muted-foreground">
                  Fim previsto (montagem)
                </label>
                <Input type="date" value={fim} onChange={(e) => setFim(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-[10px] uppercase tracking-wide text-muted-foreground">
                Observações do handoff
              </label>
              <Textarea
                rows={3}
                value={obs}
                onChange={(e) => setObs(e.target.value)}
                placeholder="Cuidados especiais, materiais críticos, restrições de montagem…"
              />
            </div>

            {r.jaLiberado && (
              <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 p-2 text-xs text-emerald-900">
                <CheckCircle2 className="h-4 w-4" /> Este equipamento já foi liberado para produção.
              </div>
            )}
          </div>
        )}

        <DialogFooter className="gap-2 sm:justify-between">
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={!r || isLoading}
              onClick={() => downloadResumoCsv(r, inicio, fim, obs)}
              className="gap-1"
            >
              <Download className="h-4 w-4" /> Baixar resumo (CSV)
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!r || isLoading}
              onClick={() =>
                downloadResumoPdf(r, inicio, fim, obs).catch((e) =>
                  toast.error(e?.message ?? "Falha ao gerar PDF."),
                )
              }
              className="gap-1"
            >
              <FileText className="h-4 w-4" /> Baixar resumo (PDF)
            </Button>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={requestClose} disabled={mut.isPending}>Cancelar</Button>
            <Button
              onClick={() => mut.mutate()}
              disabled={mut.isPending || r?.jaLiberado || isLoading}
              className="gap-1 bg-fuchsia-600 hover:bg-fuchsia-700"
            >
              <Rocket className="h-4 w-4" /> {mut.isPending ? "Liberando…" : "Confirmar liberação"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
