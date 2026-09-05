import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Copy,
  FileDown,
  Loader2,
  MessageSquare,
  Save,
  ExternalLink,
  Printer,
  Paperclip,
  History,
  FileText,
  Wrench,
  CalendarIcon,
  HelpCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Calendar } from "@/components/ui/calendar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  INSUMO_CRITICIDADE,
  INSUMO_CRITICIDADE_COLOR,
  INSUMO_CRITICIDADE_LABEL,
  INSUMO_STATUS_COLOR,
  INSUMO_STATUS_LABEL,
  INSUMO_UNIDADES,
  type InsumoCriticidade,
  type InsumoStatus,
} from "@/lib/projeto-insumos.shared";
import type { InsumoRow } from "@/lib/projeto-insumos.functions";
import { upsertInsumo, setInsumoStatus } from "@/lib/projeto-insumos.functions";
import { gerarDocumentoRfqInsumo, listInsumoDocumentos } from "@/lib/compras-rfq-docs.functions";
import { InsumoAnexosPanel } from "./InsumoAnexosPanel";
import { InsumoHistoricoPanel } from "./InsumoHistoricoPanel";
import { InsumoOverviewPanel } from "./InsumoOverviewPanel";
import { RfqTooltip } from "./RfqTooltip";
import { itemTag } from "@/lib/docs/item-tag";
import { useFormDraft } from "@/hooks/use-form-draft";
import { confirmDiscard } from "@/lib/unsaved-guard";

type Idioma = "pt" | "es" | "en";
const IDIOMAS: Idioma[] = ["pt", "es", "en"];
const IDIOMA_LABEL: Record<Idioma, string> = {
  pt: "Português",
  es: "Español",
  en: "English",
};
const IDIOMA_FLAG: Record<Idioma, string> = {
  pt: "🇧🇷",
  es: "🇪🇸",
  en: "🇺🇸",
};

type Props = {
  insumo: InsumoRow | null;
  onClose: () => void;
};

export function InsumoActionDialog({ insumo, onClose }: Props) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const upsertFn = useServerFn(upsertInsumo);
  const setStatusFn = useServerFn(setInsumoStatus);
  const gerarDocFn = useServerFn(gerarDocumentoRfqInsumo);
  const listDocsFn = useServerFn(listInsumoDocumentos);

  const [descricao, setDescricao] = useState("");
  const [quantidade, setQuantidade] = useState<number>(1);
  const [unidade, setUnidade] = useState("UN");
  const [fabricante, setFabricante] = useState("");
  const [partNumber, setPartNumber] = useState("");
  const [codigoInterno, setCodigoInterno] = useState("");
  const [leadTime, setLeadTime] = useState<string>("");
  const [necessidadeEm, setNecessidadeEm] = useState<Date | undefined>(undefined);
  const [especificacao, setEspecificacao] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [criticidade, setCriticidade] = useState<InsumoCriticidade>("media");

  const [mensagemLang, setMensagemLang] = useState<Idioma>("pt");
  const [mensagens, setMensagens] = useState<Record<Idioma, string>>({ pt: "", es: "", en: "" });
  const [saving, setSaving] = useState(false);
  const [gerandoDoc, setGerandoDoc] = useState(false);
  const [idiomasGerar, setIdiomasGerar] = useState<Record<Idioma, boolean>>({
    pt: true,
    es: true,
    en: true,
  });
  const [notaCompras, setNotaCompras] = useState<string>("");
  const [tab, setTab] = useState<string>("detalhes");

  const [ultimosDocs, setUltimosDocs] = useState<
    Array<{
      idioma: Idioma;
      drive_view_url: string | null;
      file_name: string | null;
      error?: string;
    }>
  >([]);
  const [folderUrl, setFolderUrl] = useState<string | null>(null);

  const docsHistory = useQuery({
    queryKey: ["insumo-docs", insumo?.id],
    enabled: !!insumo,
    queryFn: () => listDocsFn({ data: { insumo_id: insumo!.id } }),
  });

  useEffect(() => {
    if (!insumo) return;
    setDescricao(insumo.descricao ?? "");
    setQuantidade(Number(insumo.quantidade ?? 1));
    setUnidade(insumo.unidade ?? "UN");
    setFabricante(insumo.fabricante_sugerido ?? "");
    setPartNumber(insumo.part_number ?? "");
    setCodigoInterno(insumo.codigo_interno ?? "");
    setLeadTime(insumo.lead_time_desejado_dias?.toString() ?? "");
    setNecessidadeEm(insumo.necessidade_em ? new Date(insumo.necessidade_em) : undefined);
    setEspecificacao(insumo.especificacao_tecnica ?? "");
    setObservacoes(insumo.observacoes ?? "");
    setCriticidade((insumo.criticidade as InsumoCriticidade) ?? "media");
  }, [insumo]);

  const initialDraft = {
    descricao: insumo?.descricao ?? "",
    quantidade: Number(insumo?.quantidade ?? 1),
    unidade: insumo?.unidade ?? "UN",
    fabricante: insumo?.fabricante_sugerido ?? "",
    partNumber: insumo?.part_number ?? "",
    codigoInterno: insumo?.codigo_interno ?? "",
    leadTime: insumo?.lead_time_desejado_dias?.toString() ?? "",
    necessidadeEm: insumo?.necessidade_em ?? "",
    especificacao: insumo?.especificacao_tecnica ?? "",
    observacoes: insumo?.observacoes ?? "",
    criticidade: (insumo?.criticidade as InsumoCriticidade | undefined) ?? "media",
    tab: "detalhes",
  };
  const currentDraft = {
    descricao,
    quantidade,
    unidade,
    fabricante,
    partNumber,
    codigoInterno,
    leadTime,
    necessidadeEm: necessidadeEm?.toISOString().slice(0, 10) ?? "",
    especificacao,
    observacoes,
    criticidade,
    tab,
  };
  const { clearDraft, isDirty } = useFormDraft({
    formKey: `insumo:editar:${insumo?.id ?? "fechado"}`,
    value: currentDraft,
    initialValue: initialDraft,
    enabled: !!insumo,
    onRestore: (saved) => {
      setDescricao(saved.descricao);
      setQuantidade(saved.quantidade);
      setUnidade(saved.unidade);
      setFabricante(saved.fabricante);
      setPartNumber(saved.partNumber);
      setCodigoInterno(saved.codigoInterno);
      setLeadTime(saved.leadTime);
      setNecessidadeEm(
        saved.necessidadeEm ? new Date(`${saved.necessidadeEm}T12:00:00`) : undefined,
      );
      setEspecificacao(saved.especificacao);
      setObservacoes(saved.observacoes);
      setCriticidade(saved.criticidade);
      setTab(saved.tab);
    },
  });

  function requestClose() {
    if (!confirmDiscard(isDirty)) return;
    clearDraft();
    onClose();
  }

  const mensagensPadrao = useMemo<Record<Idioma, string>>(() => {
    if (!insumo) return { pt: "", es: "", en: "" };
    const dataFmt = (locale: string) =>
      necessidadeEm ? necessidadeEm.toLocaleDateString(locale) : "—";
    const especBlock = (lbl: string) => (especificacao ? `\n\n${lbl}:\n${especificacao}` : "");

    return {
      pt: [
        "Prezados, boa tarde.",
        "",
        "Solicitamos cotação para o item abaixo:",
        "",
        `• Descrição: ${descricao}`,
        fabricante && `• Fabricante: ${fabricante}`,
        partNumber && `• Part Number: ${partNumber}`,
        codigoInterno && `• Código interno: ${codigoInterno}`,
        `• Quantidade: ${quantidade} ${unidade}`,
        leadTime && `• Lead time desejado: ${leadTime} dias`,
        necessidadeEm && `• Necessidade em: ${dataFmt("pt-BR")}`,
        especBlock("Especificação técnica"),
        "",
        "Aguardamos sua proposta com preço, prazo de entrega, condições de pagamento e Incoterm.",
        "",
        "Atenciosamente,",
      ]
        .filter(Boolean)
        .join("\n"),
      es: [
        "Estimados, buenas tardes.",
        "",
        "Solicitamos cotización para el ítem a continuación:",
        "",
        `• Descripción: ${descricao}`,
        fabricante && `• Fabricante: ${fabricante}`,
        partNumber && `• Part Number: ${partNumber}`,
        codigoInterno && `• Código interno: ${codigoInterno}`,
        `• Cantidad: ${quantidade} ${unidade}`,
        leadTime && `• Plazo deseado: ${leadTime} días`,
        necessidadeEm && `• Necesidad para: ${dataFmt("es-ES")}`,
        especBlock("Especificación técnica"),
        "",
        "Aguardamos su propuesta con precio, plazo de entrega, condiciones de pago e Incoterm.",
        "",
        "Atentamente,",
      ]
        .filter(Boolean)
        .join("\n"),
      en: [
        "Dear Sirs, good afternoon.",
        "",
        "We would like to request a quotation for the item below:",
        "",
        `• Description: ${descricao}`,
        fabricante && `• Manufacturer: ${fabricante}`,
        partNumber && `• Part Number: ${partNumber}`,
        codigoInterno && `• Internal code: ${codigoInterno}`,
        `• Quantity: ${quantidade} ${unidade}`,
        leadTime && `• Desired lead time: ${leadTime} days`,
        necessidadeEm && `• Required by: ${dataFmt("en-US")}`,
        especBlock("Technical specification"),
        "",
        "We look forward to your proposal with price, delivery time, payment terms and Incoterm.",
        "",
        "Best regards,",
      ]
        .filter(Boolean)
        .join("\n"),
    };
  }, [
    insumo,
    descricao,
    fabricante,
    partNumber,
    codigoInterno,
    quantidade,
    unidade,
    leadTime,
    necessidadeEm,
    especificacao,
  ]);

  useEffect(() => {
    setMensagens(mensagensPadrao);
  }, [mensagensPadrao]);

  async function handleSave() {
    if (!insumo) return;
    const errs: string[] = [];
    if (descricao.trim().length < 3) errs.push("Descrição deve ter ao menos 3 caracteres.");
    if (!Number.isFinite(quantidade) || quantidade <= 0)
      errs.push("Quantidade deve ser maior que zero.");
    if (!unidade) errs.push("Selecione a unidade.");
    if (leadTime && (!Number.isFinite(Number(leadTime)) || Number(leadTime) < 0)) {
      errs.push("Lead time deve ser um número não negativo.");
    }
    if (errs.length) {
      toast.error(errs[0], {
        description: errs.length > 1 ? errs.slice(1).join(" • ") : undefined,
      });
      return;
    }
    setSaving(true);
    try {
      await upsertFn({
        data: {
          id: insumo.id,
          projeto_id: insumo.projeto_id,
          disciplina: insumo.disciplina as
            | "mecanico"
            | "eletrico"
            | "automacao"
            | "montagem"
            | "outro",
          descricao: descricao.trim(),
          especificacao_tecnica: especificacao || null,
          codigo_interno: codigoInterno || null,
          fabricante_sugerido: fabricante || null,
          part_number: partNumber || null,
          categoria_slug: insumo.categoria_slug ?? null,
          unidade,
          quantidade: Number(quantidade) || 1,
          criticidade,
          lead_time_desejado_dias: leadTime ? Number(leadTime) : null,
          necessidade_em: necessidadeEm ? necessidadeEm.toISOString().slice(0, 10) : null,
          observacoes: observacoes || null,
        },
      });
      toast.success("Alterações salvas");
      clearDraft();
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["compras", "necessidades"] }),
        qc.invalidateQueries({ queryKey: ["compras", "solicitacoes"] }),
        qc.invalidateQueries({ queryKey: ["insumo-atividades", insumo.id] }),
        qc.invalidateQueries({ queryKey: ["compras", "auditoria"] }),
      ]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao salvar");
    } finally {
      setSaving(false);
    }
  }

  async function copiar(texto: string, label: string) {
    try {
      await navigator.clipboard.writeText(texto);
      toast.success(`${label} copiado`);
    } catch {
      toast.error("Não foi possível copiar");
    }
  }

  async function gerarDocumento() {
    if (!insumo) return;
    const idiomas = (Object.keys(idiomasGerar) as Idioma[]).filter((k) => idiomasGerar[k]);
    if (!idiomas.length) {
      toast.error("Selecione ao menos um idioma.");
      return;
    }
    setGerandoDoc(true);
    setUltimosDocs([]);
    try {
      await handleSave();
      const res = await gerarDocFn({
        data: { insumo_id: insumo.id, idiomas, nota_compras: notaCompras.trim() || null },
      });
      setFolderUrl(res.folder_url ?? null);
      setUltimosDocs(
        res.documentos.map((d) => ({
          idioma: d.idioma,
          drive_view_url: d.drive_view_url ?? null,
          file_name: d.file_name ?? null,
          error: d.error,
        })),
      );

      const gerados = res.documentos.filter((d) => d.drive_view_url);
      if (res.drive_ok && gerados.length > 0) {
        toast.success(`PDF gerado em ${gerados.length} idioma(s).`);
      } else if (gerados.length === 0) {
        toast.warning(
          "Documento gerado localmente. Conecte o Google Drive para salvar automaticamente.",
        );
      } else {
        toast.warning("Documento gerado, mas alguns idiomas falharam ao subir no Drive.");
      }
      await docsHistory.refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao gerar documento");
    } finally {
      setGerandoDoc(false);
    }
  }

  async function avancarStatus(next: InsumoStatus, successMsg: string) {
    if (!insumo) return;
    setSaving(true);
    try {
      await setStatusFn({ data: { id: insumo.id, status: next } });
      toast.success(successMsg);
      await qc.invalidateQueries({ queryKey: ["compras", "solicitacoes"] });
      await qc.invalidateQueries({ queryKey: ["insumo-atividades", insumo.id] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao atualizar status");
    } finally {
      setSaving(false);
    }
  }

  async function promoverParaOC() {
    if (!insumo) return;
    setSaving(true);
    try {
      await setStatusFn({ data: { id: insumo.id, status: "em_compra" } });
      toast.success("Status atualizado. Abrindo ordem de compra…");
      onClose();
      navigate({ to: "/compras/ordens/nova", search: { insumo_id: insumo.id } as never });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao promover para OC");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={!!insumo} onOpenChange={(o) => !o && requestClose()}>
      <DialogContent className="max-w-6xl max-h-[92vh] overflow-hidden p-0">
        {insumo ? (
          <div className="flex flex-col max-h-[92vh]">
            <div className="px-6 pt-5 pb-3 border-b bg-[var(--bg-surface)] shrink-0">
              <DialogHeader>
                <div className="flex flex-wrap items-center gap-2">
                  <DialogTitle className="text-xl">{descricao || "—"}</DialogTitle>
                  <Badge
                    variant="outline"
                    className={cn("font-normal", INSUMO_CRITICIDADE_COLOR[criticidade])}
                  >
                    {INSUMO_CRITICIDADE_LABEL[criticidade]}
                  </Badge>
                  <Badge
                    variant="outline"
                    className={cn(
                      "font-normal",
                      INSUMO_STATUS_COLOR[insumo.status as InsumoStatus],
                    )}
                  >
                    {INSUMO_STATUS_LABEL[insumo.status as InsumoStatus]}
                  </Badge>
                </div>
                <DialogDescription>
                  {insumo.clientes?.codigo ?? "—"} ·{" "}
                  {insumo.equipamento_projetos?.cliente_equipamentos?.codigo ?? "—"}
                  {" · Rev. "}
                  {insumo.equipamento_projetos?.revisao ?? "—"}
                </DialogDescription>
              </DialogHeader>
            </div>

            {/* Barra de status / progressão do fluxo */}
            <div className="px-6 py-2 border-b bg-[var(--bg-elevated)] shrink-0 flex flex-wrap items-center gap-2">
              <span className="text-[11px] uppercase tracking-wide text-[var(--text-muted)] font-medium mr-1">
                Fluxo
              </span>
              {(insumo.status === "rascunho" || insumo.status === "cancelado") && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                  disabled={saving}
                  onClick={() => avancarStatus("aprovado", "Insumo aprovado pela engenharia.")}
                >
                  Aprovar (engenharia)
                </Button>
              )}
              {insumo.status === "em_cotacao" && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs border-fuchsia-300 text-fuchsia-700 hover:bg-fuchsia-50"
                  disabled={saving}
                  onClick={() =>
                    avancarStatus("pronto_aprovacao", "Cotações prontas para revisão.")
                  }
                >
                  Marcar como pronto p/ aprovação
                </Button>
              )}
              {insumo.status === "pronto_aprovacao" && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs border-blue-300 text-blue-700 hover:bg-blue-50"
                  disabled={saving}
                  onClick={() =>
                    avancarStatus("cotado", "Cotações aprovadas por manager/engenharia.")
                  }
                >
                  Aprovar cotação
                </Button>
              )}
              {insumo.status === "cotado" && (
                <Button
                  size="sm"
                  className="h-7 text-xs bg-violet-600 hover:bg-violet-700"
                  disabled={saving}
                  onClick={promoverParaOC}
                >
                  Promover para Ordem de Compra
                </Button>
              )}
              {insumo.status !== "cancelado" && insumo.status !== "recebido" && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs text-[var(--text-muted)] hover:text-red-600 ml-auto"
                  disabled={saving}
                  onClick={() => avancarStatus("cancelado", "Solicitação cancelada.")}
                >
                  Cancelar
                </Button>
              )}
            </div>

            <Tabs value={tab} onValueChange={setTab} className="flex-1 flex flex-col min-h-0">
              <div className="border-b bg-[var(--bg-elevated)] px-6 shrink-0">
                <TabsList className="h-10 bg-transparent p-0 gap-1">
                  <TabsTrigger
                    value="detalhes"
                    className="data-[state=active]:bg-[var(--bg-surface)] data-[state=active]:shadow-sm h-9 px-3 text-xs gap-1.5"
                  >
                    <FileText className="h-3.5 w-3.5" /> Detalhes
                  </TabsTrigger>
                  <TabsTrigger
                    value="acoes"
                    className="data-[state=active]:bg-[var(--bg-surface)] data-[state=active]:shadow-sm h-9 px-3 text-xs gap-1.5"
                  >
                    <Wrench className="h-3.5 w-3.5" /> Ações do Compras
                  </TabsTrigger>
                  <TabsTrigger
                    value="anexos"
                    className="data-[state=active]:bg-[var(--bg-surface)] data-[state=active]:shadow-sm h-9 px-3 text-xs gap-1.5"
                  >
                    <Paperclip className="h-3.5 w-3.5" /> Anexos & Orçamentos
                  </TabsTrigger>
                  <TabsTrigger
                    value="historico"
                    className="data-[state=active]:bg-[var(--bg-surface)] data-[state=active]:shadow-sm h-9 px-3 text-xs gap-1.5"
                  >
                    <History className="h-3.5 w-3.5" /> Histórico
                  </TabsTrigger>
                </TabsList>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-4">
                <TabsContent value="detalhes" className="mt-0 space-y-4">
                  <InsumoOverviewPanel
                    insumo={insumo}
                    onGoToAnexos={() => setTab("anexos")}
                    onGoToAcoes={() => setTab("acoes")}
                  />

                  <details
                    className="rounded-lg border border-[var(--bg-border)] bg-[var(--bg-surface)] group"
                    open={insumo.status === "rascunho"}
                  >
                    <summary className="cursor-pointer select-none px-3 py-2 flex items-center justify-between text-[11px] uppercase tracking-wide text-[var(--text-secondary)] font-medium hover:bg-[var(--bg-elevated)]">
                      <span className="flex items-center gap-2">
                        <FileText className="h-3 w-3 text-[var(--text-muted)]" />
                        Dados do insumo
                      </span>
                      <span className="text-[10px] text-[var(--text-muted)] group-open:hidden">
                        clique para editar
                      </span>
                      <span className="text-[10px] text-[var(--text-muted)] hidden group-open:inline">
                        clique para recolher
                      </span>
                    </summary>
                    <div className="px-3 pb-3 pt-1 space-y-2">
                      <div>
                        <Label className="text-[11px]">Descrição</Label>
                        <Input
                          value={descricao}
                          onChange={(e) => setDescricao(e.target.value)}
                          className="h-8 text-xs"
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <div className="grid grid-cols-3 gap-2">
                          <div className="col-span-2">
                            <Label className="text-[11px]">Quantidade</Label>
                            <Input
                              type="number"
                              min={0}
                              step="any"
                              value={quantidade}
                              onChange={(e) => setQuantidade(Number(e.target.value))}
                              className="h-8 text-xs"
                            />
                          </div>
                          <div>
                            <Label className="text-[11px]">Unidade</Label>
                            <Select value={unidade} onValueChange={setUnidade}>
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {INSUMO_UNIDADES.map((u) => (
                                  <SelectItem key={u} value={u}>
                                    {u}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="text-[11px]">Fabricante</Label>
                            <Input
                              value={fabricante}
                              onChange={(e) => setFabricante(e.target.value)}
                              className="h-8 text-xs"
                            />
                          </div>
                          <div>
                            <Label className="text-[11px]">Part Number</Label>
                            <Input
                              value={partNumber}
                              onChange={(e) => setPartNumber(e.target.value)}
                              className="h-8 text-xs"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="text-[11px]">Código interno</Label>
                            <Input
                              value={codigoInterno}
                              onChange={(e) => setCodigoInterno(e.target.value)}
                              className="h-8 text-xs"
                            />
                          </div>
                          <div>
                            <Label className="text-[11px]">Lead time (dias)</Label>
                            <Input
                              type="number"
                              min={0}
                              value={leadTime}
                              onChange={(e) => setLeadTime(e.target.value)}
                              className="h-8 text-xs"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="text-[11px]">Necessidade em</Label>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    "w-full justify-start text-left font-normal h-8 text-xs px-2",
                                    !necessidadeEm && "text-muted-foreground",
                                  )}
                                >
                                  <CalendarIcon className="mr-1.5 h-3.5 w-3.5" />
                                  {necessidadeEm
                                    ? format(necessidadeEm, "dd/MM/yyyy", { locale: ptBR })
                                    : "Selecionar"}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                  mode="single"
                                  selected={necessidadeEm}
                                  onSelect={setNecessidadeEm}
                                  initialFocus
                                  className={cn("p-3 pointer-events-auto")}
                                />
                              </PopoverContent>
                            </Popover>
                          </div>
                          <div>
                            <Label className="text-[11px]">Criticidade</Label>
                            <Select
                              value={criticidade}
                              onValueChange={(v) => setCriticidade(v as InsumoCriticidade)}
                            >
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {INSUMO_CRITICIDADE.map((c) => (
                                  <SelectItem key={c} value={c}>
                                    {INSUMO_CRITICIDADE_LABEL[c]}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>

                      <div>
                        <Label className="text-[11px]">Especificação técnica</Label>
                        <Textarea
                          rows={2}
                          value={especificacao}
                          onChange={(e) => setEspecificacao(e.target.value)}
                          className="text-xs min-h-[54px]"
                        />
                      </div>
                      <div>
                        <Label className="text-[11px]">Observações</Label>
                        <Textarea
                          rows={1}
                          value={observacoes}
                          onChange={(e) => setObservacoes(e.target.value)}
                          className="text-xs min-h-[40px]"
                        />
                      </div>

                      <Button
                        variant="outline"
                        className="w-full h-8 text-xs"
                        onClick={handleSave}
                        disabled={saving}
                      >
                        <Save className="mr-1.5 h-3.5 w-3.5" />
                        Salvar alterações
                      </Button>
                    </div>
                  </details>
                </TabsContent>

                <TabsContent value="acoes" className="mt-0 space-y-3">
                  <div className="rounded-md border border-[var(--bg-border)] bg-[var(--bg-elevated)] p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs flex items-center gap-1.5">
                        <MessageSquare className="h-3.5 w-3.5" />
                        Mensagem para fornecedor
                      </Label>
                      <button
                        type="button"
                        className="text-[11px] text-[var(--text-muted)] hover:text-[var(--text-primary)] underline underline-offset-2"
                        onClick={() => setMensagens(mensagensPadrao)}
                      >
                        Restaurar padrão
                      </button>
                    </div>
                    <Tabs value={mensagemLang} onValueChange={(v) => setMensagemLang(v as Idioma)}>
                      <TabsList className="h-8 bg-[var(--bg-surface)]">
                        {IDIOMAS.map((l) => (
                          <TabsTrigger key={l} value={l} className="text-xs h-6 px-2">
                            <span className="mr-1">{IDIOMA_FLAG[l]}</span>
                            {IDIOMA_LABEL[l]}
                          </TabsTrigger>
                        ))}
                      </TabsList>
                      {IDIOMAS.map((l) => (
                        <TabsContent key={l} value={l} className="mt-2">
                          <Textarea
                            rows={8}
                            className="font-mono text-xs bg-[var(--bg-surface)]"
                            value={mensagens[l]}
                            onChange={(e) =>
                              setMensagens((prev) => ({ ...prev, [l]: e.target.value }))
                            }
                          />
                        </TabsContent>
                      ))}
                    </Tabs>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copiar(descricao, "Descrição")}
                      >
                        <Copy className="mr-1.5 h-3.5 w-3.5" /> Copiar descrição
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          copiar(
                            mensagens[mensagemLang],
                            `Mensagem (${IDIOMA_LABEL[mensagemLang]})`,
                          )
                        }
                      >
                        <Copy className="mr-1.5 h-3.5 w-3.5" /> Copiar mensagem (
                        {IDIOMA_FLAG[mensagemLang]})
                      </Button>
                    </div>
                  </div>

                  <Separator />

                  <div className="rounded-md border border-[var(--bg-border)] p-3 space-y-2 bg-[var(--bg-surface)]">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <Label className="text-xs flex items-center gap-1.5">
                        <Printer className="h-3.5 w-3.5" />
                        Gerar documento (trilíngue)
                      </Label>
                      {insumo?.id ? (
                        <Badge variant="outline" className="font-mono text-[10px] tracking-wider">
                          TAG:{" "}
                          {itemTag(
                            insumo.id,
                            (insumo as { created_at?: string | null }).created_at,
                          )}
                        </Badge>
                      ) : null}
                    </div>
                    <p className="text-[11px] text-[var(--text-muted)] leading-snug">
                      PDF em modo paisagem. O documento é externo: <strong>não</strong> inclui dados
                      do cliente ou do projeto — apenas a TAG interna do item.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {IDIOMAS.map((l) => (
                        <label
                          key={l}
                          className={cn(
                            "flex items-center gap-1.5 text-xs px-2 py-1 rounded border cursor-pointer",
                            idiomasGerar[l]
                              ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                              : "border-[var(--bg-border)] bg-[var(--bg-surface)] text-[var(--text-muted)]",
                          )}
                        >
                          <input
                            type="checkbox"
                            className="h-3 w-3"
                            checked={idiomasGerar[l]}
                            onChange={(e) =>
                              setIdiomasGerar((prev) => ({ ...prev, [l]: e.target.checked }))
                            }
                          />
                          <span>{IDIOMA_FLAG[l]}</span>
                          <span>{IDIOMA_LABEL[l]}</span>
                        </label>
                      ))}
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px] text-[var(--text-secondary)] flex items-center gap-1">
                        Nota do comprador (opcional)
                        <RfqTooltip>
                          <span className="cursor-help rounded-full bg-[var(--bg-elevated)] p-0.5">
                            <HelpCircle className="h-3 w-3 text-[var(--text-muted)]" />
                          </span>
                        </RfqTooltip>
                      </Label>
                      <Textarea
                        rows={2}
                        maxLength={2000}
                        value={notaCompras}
                        onChange={(e) => setNotaCompras(e.target.value)}
                        placeholder="Instruções específicas para o fornecedor neste Checklist (Solicitação de Cotação)."
                        className="text-xs"
                      />
                    </div>

                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={gerarDocumento}
                      disabled={gerandoDoc || saving}
                    >
                      {gerandoDoc ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Printer className="mr-2 h-4 w-4" />
                      )}
                      Gerar e salvar no Drive
                      <FileDown className="ml-auto h-4 w-4 opacity-60" />
                    </Button>

                    {(ultimosDocs.length > 0 || folderUrl) && (
                      <div className="mt-2 rounded-md border border-emerald-200 bg-emerald-50/60 p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-emerald-800 flex items-center gap-1.5">
                            <FileDown className="h-3.5 w-3.5" /> PDFs gerados
                          </span>
                          {folderUrl && (
                            <a
                              href={folderUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] text-emerald-700 hover:underline"
                            >
                              <ExternalLink className="h-3 w-3" /> Pasta do Drive
                            </a>
                          )}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
                          {ultimosDocs.map((d, i) => (
                            <div key={i}>
                              {d.drive_view_url ? (
                                <div className="flex items-center gap-1">
                                  <Button
                                    asChild
                                    size="sm"
                                    variant="outline"
                                    className="flex-1 justify-start bg-[var(--bg-surface)] border-emerald-300 text-emerald-800 hover:bg-emerald-100"
                                  >
                                    <a
                                      href={d.drive_view_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      title={d.file_name ?? undefined}
                                    >
                                      <span className="mr-1.5">{IDIOMA_FLAG[d.idioma]}</span>
                                      <span className="truncate flex-1 text-left">
                                        Abrir PDF ({IDIOMA_LABEL[d.idioma]})
                                      </span>
                                      <ExternalLink className="ml-1 h-3 w-3 opacity-70" />
                                    </a>
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-8 w-8 shrink-0 p-0 text-emerald-700 hover:bg-emerald-100"
                                    title={`Copiar link do PDF (${IDIOMA_LABEL[d.idioma]})`}
                                    onClick={async () => {
                                      try {
                                        await navigator.clipboard.writeText(d.drive_view_url!);
                                        toast.success(
                                          `Link do PDF em ${IDIOMA_LABEL[d.idioma]} copiado.`,
                                        );
                                      } catch {
                                        toast.error("Não foi possível copiar. Copie manualmente.");
                                      }
                                    }}
                                  >
                                    <Copy className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              ) : (
                                <div className="w-full rounded border border-amber-300 bg-amber-50 px-2 py-1.5 text-[11px] text-amber-800 flex items-center gap-1.5">
                                  <span>{IDIOMA_FLAG[d.idioma]}</span>
                                  <span className="truncate">{d.error ?? "gerado localmente"}</span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {docsHistory.data && docsHistory.data.length > 0 && (
                      <details className="pt-1">
                        <summary className="text-[11px] text-[var(--text-muted)] cursor-pointer hover:text-[var(--text-primary)]">
                          Histórico ({docsHistory.data.length})
                        </summary>
                        <div className="mt-1 space-y-0.5 max-h-32 overflow-y-auto">
                          {docsHistory.data.map((d) => (
                            <a
                              key={d.id}
                              href={d.drive_view_url ?? "#"}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1.5 text-[10px] text-[var(--text-secondary)] hover:text-blue-600"
                            >
                              <span>{IDIOMA_FLAG[d.idioma as Idioma]}</span>
                              <span className="truncate flex-1">{d.file_name ?? "—"}</span>
                              <span className="text-[var(--text-muted)]">
                                {new Date(d.criado_em).toLocaleDateString("pt-BR")}
                              </span>
                            </a>
                          ))}
                        </div>
                      </details>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="anexos" className="mt-0">
                  <InsumoAnexosPanel insumoId={insumo.id} />
                </TabsContent>

                <TabsContent value="historico" className="mt-0">
                  <InsumoHistoricoPanel insumoId={insumo.id} />
                </TabsContent>
              </div>
            </Tabs>

            <DialogFooter className="flex-row justify-end items-center gap-2 border-t px-6 py-3 bg-[var(--bg-surface)] shrink-0">
              <Button variant="outline" size="sm" onClick={requestClose}>
                Fechar
              </Button>
            </DialogFooter>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
