/* eslint-disable @typescript-eslint/no-explicit-any */
import { useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  AlertTriangle,
  FileCheck2,
  Download,
  Eye,
  EyeOff,
  History as HistoryIcon,
  Upload,
  X,
  Loader2,
  Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { listClientes } from "@/lib/clientes.functions";
import { generateOrcamento, getSignedUrl } from "@/lib/docs/docs.functions";
import { uploadOrcamentoImagem, signOrcamentoImagem } from "@/lib/orcamento-imagens.functions";
import { listBlocos, getLayoutConfig } from "@/lib/docs/admin-docs.functions";
import { MOEDAS, MOEDA_PADRAO, formatMoeda, moedaLabel, toMoedaISO } from "@/lib/moedas";
import { useAuth } from "@/hooks/use-auth";
import type {
  OrcamentoPayload,
  Moeda,
  Parcela,
  EquipamentoOrcamento,
  Idioma,
} from "@/lib/docs/types";
import { OrcamentoPdfPreview } from "@/components/docs/OrcamentoPdfPreview";
import { diffOrcamentoPayload, type BumpKind, BUMP_LABEL } from "@/lib/docs/orcamento-diff";
import { calcularSubtotal } from "@/lib/docs/orcamento-calc";
import { useFormDraft } from "@/hooks/use-form-draft";
import { NovoClienteDialog } from "@/components/clientes/NovoClienteDialog";
import { getOportunidade, vincularClienteOportunidade } from "@/lib/oportunidades.functions";

const EMPTY_EQ = (): EquipamentoOrcamento => ({
  nome_pt: "",
  nome_es: "",
  nome_en: "",
  descricao_pt: "",
  descricao_es: "",
  descricao_en: "",
  quantidade: 1,
  valor_unitario: 0,
  imagem_url: null,
  imagem_legenda: null,
  opcional: false,
});

const BUMP_BADGE: Record<BumpKind, string> = {
  major: "bg-rose-100 text-rose-800 border-rose-200",
  minor: "bg-amber-100 text-amber-800 border-amber-200",
  patch: "bg-sky-100 text-sky-800 border-sky-200",
};

export type OrcamentoWizardProps = {
  mode: "novo" | "corrigir";
  documentoId?: string;
  versaoAtual?: string;
  codigoExistente?: string;
  initialPayload?: OrcamentoPayload;
  initialTitulo?: string;
  /** Pré-preenchimento vindo de uma oportunidade do pipeline. */
  prefillClienteId?: string | null;
  prefillOportunidade?: { id: string; codigo?: string | null } | null;
};

export function OrcamentoWizard({
  mode,
  documentoId,
  versaoAtual,
  codigoExistente,
  initialPayload,
  initialTitulo,
  prefillClienteId,
  prefillOportunidade,
}: OrcamentoWizardProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState(0);

  // Estado
  const [clienteId, setClienteId] = useState<string | null>(
    initialPayload?.cliente?.id ?? prefillClienteId ?? null,
  );
  const [clienteQ, setClienteQ] = useState("");
  const [titulo, setTitulo] = useState(initialTitulo ?? "");

  const [moeda, setMoeda] = useState<Moeda>(initialPayload?.moeda ?? MOEDA_PADRAO);
  /** Só herda a moeda do cadastro do cliente enquanto o usuário não escolher outra. */
  const [moedaTocada, setMoedaTocada] = useState(Boolean(initialPayload?.moeda));
  const [equipamentos, setEquipamentos] = useState<EquipamentoOrcamento[]>(
    initialPayload?.equipamentos?.length ? initialPayload.equipamentos : [EMPTY_EQ()],
  );
  const [pagamentoForma, setPagamentoForma] = useState(
    initialPayload?.pagamento?.forma ?? "Transferência bancária internacional",
  );
  const [parcelas, setParcelas] = useState<Parcela[]>(
    initialPayload?.pagamento?.parcelas ?? [
      {
        numero: 1,
        percentual: 60,
        descricao_pt: "60% antecipado na confirmação do pedido",
        descricao_es: "60% adelantado en la confirmación del pedido",
        descricao_en: "60% upfront upon order confirmation",
      },
      {
        numero: 2,
        percentual: 40,
        descricao_pt: "40% antes do embarque",
        descricao_es: "40% antes del embarque",
        descricao_en: "40% before shipment",
      },
    ],
  );
  const [prazoDias, setPrazoDias] = useState(initialPayload?.prazo?.dias ?? 180);
  const [prazoTexto, setPrazoTexto] = useState(initialPayload?.prazo?.texto_extra ?? "");
  const [incoterm, setIncoterm] = useState(initialPayload?.frete?.incoterm ?? "EXW");
  const [freteDesc, setFreteDesc] = useState(
    initialPayload?.frete?.descricao ?? "EXW Planta Solutek",
  );
  const [validadeDias, setValidadeDias] = useState(initialPayload?.validade?.dias ?? 20);
  const [overrides, setOverrides] = useState<
    Record<string, { pt?: string; es?: string; en?: string }>
  >(initialPayload?.blocos_overrides ?? {});

  // Revisão (modo corrigir)
  const [motivo, setMotivo] = useState("");
  const [bumpManual, setBumpManual] = useState<"auto" | BumpKind>("auto");

  // Cliente criado no modal — mantido em memória para aparecer na lista sem refetch.
  const [novoClienteOpen, setNovoClienteOpen] = useState(false);
  const [clienteExtra, setClienteExtra] = useState<any | null>(null);
  const [trocandoCliente, setTrocandoCliente] = useState(false);
  const qc = useQueryClient();

  // Contexto da oportunidade de origem (qualificação feita no pipeline)
  const getOppFn = useServerFn(getOportunidade);
  const vincularClienteFn = useServerFn(vincularClienteOportunidade);
  const oppQ = useQuery({
    queryKey: ["oportunidade-contexto", prefillOportunidade?.id],
    queryFn: () => getOppFn({ data: { id: prefillOportunidade!.id } }),
    enabled: !!prefillOportunidade?.id,
    staleTime: 60_000,
  });
  const opp = oppQ.data ?? null;

  // Clientes semelhantes à empresa do lead — evita cadastro duplicado.
  const similaresQ = useQuery({
    queryKey: ["clientes-similares", opp?.empresa_lead],
    queryFn: () => listClientes({ data: { q: opp!.empresa_lead as string, pageSize: 25 } }),
    enabled: !!opp && !opp.cliente_id && !!opp.empresa_lead,
    staleTime: 60_000,
  });
  const similares = ((similaresQ.data?.rows ?? []) as any[]).slice(0, 5);

  const clientesQ = useQuery({
    queryKey: ["clientes-mini", clienteQ, clienteId],
    queryFn: async () => {
      // Garante que o cliente já selecionado esteja na lista mesmo sem busca
      const r = await listClientes({ data: { q: clienteQ, pageSize: 25 } });
      if (clienteId && !r.rows.find((c: any) => c.id === clienteId)) {
        const extra = await listClientes({ data: { q: clienteId, pageSize: 25 } });
        return { ...r, rows: [...extra.rows, ...r.rows] };
      }
      return r;
    },
  });

  const blocosQ = useQuery({
    queryKey: ["blocos", "orcamento"],
    queryFn: () => listBlocos({ data: { tipo: "orcamento" } }),
  });
  const layoutQ = useQuery({
    queryKey: ["doc-layout", "orcamento"],
    queryFn: () => getLayoutConfig({ data: { tipo: "orcamento" } }),
  });

  const blocos = blocosQ.data ?? [];
  const clienteRows = useMemo(() => {
    const rows = (clientesQ.data?.rows ?? []) as any[];
    if (clienteExtra && !rows.find((c) => c.id === clienteExtra.id)) return [clienteExtra, ...rows];
    return rows;
  }, [clientesQ.data, clienteExtra]);
  const clienteRow = useMemo(
    () => clienteRows.find((c: any) => c.id === clienteId),
    [clienteRows, clienteId],
  );

  /** Novo cliente criado no modal: seleciona sem recarregar o wizard. */
  function handleClienteCriado(cliente: { id: string; codigo: string }, values: any) {
    const row = {
      id: cliente.id,
      codigo: cliente.codigo,
      razao_social: values.razao_social,
      nome_fantasia: values.nome_fantasia ?? null,
      pais: values.pais,
      documento_fiscal_numero: values.documento_fiscal_numero,
      moeda: values.moeda,
      endereco_cidade: values.endereco_cidade ?? null,
      status: values.status,
    };
    setClienteExtra(row);
    qc.setQueryData(["clientes-mini", clienteQ, clienteId], (old: any) =>
      old ? { ...old, rows: [row, ...old.rows] } : old,
    );
    qc.setQueryData(["clientes-mini", clienteQ, cliente.id], (old: any) =>
      old ? { ...old, rows: [row, ...old.rows.filter((c: any) => c.id !== row.id)] } : old,
    );
    setClienteId(cliente.id);
    setTrocandoCliente(false);
    toast.success(`Cliente ${cliente.codigo} criado e selecionado.`);
    void vincularOportunidade(cliente.id, cliente.codigo);
  }

  /** Liga o cliente escolhido/criado à oportunidade de origem (deixa de ser lead). */
  async function vincularOportunidade(novoClienteId: string, codigo?: string) {
    if (!prefillOportunidade?.id || opp?.cliente_id) return;
    try {
      await vincularClienteFn({ data: { id: prefillOportunidade.id, cliente_id: novoClienteId } });
      await qc.invalidateQueries({ queryKey: ["oportunidade-contexto", prefillOportunidade.id] });
      qc.invalidateQueries({ queryKey: ["pipeline"] });
      toast.success(
        `Oportunidade ${opp?.codigo ?? ""} vinculada ao cliente ${codigo ?? ""}.`.trim(),
      );
    } catch (e: any) {
      toast.error(e?.message ?? "Não foi possível vincular o cliente à oportunidade.");
    }
  }

  /** Dados do lead já qualificados no pipeline viram o rascunho do novo cliente. */
  const novoClienteInitial = useMemo(() => {
    if (!opp || opp.cliente_id) return undefined;
    const contato = (opp.nome_lead || opp.empresa_lead || "").trim();
    return {
      razao_social: opp.empresa_lead ?? "",
      email_corporativo: opp.email ?? null,
      telefone_corporativo_numero: opp.telefone ?? null,
      contatos: contato
        ? [
            {
              nome: contato,
              email: opp.email ?? undefined,
              telefone_numero: opp.telefone ?? null,
              principal: true,
            },
          ]
        : undefined,
    } as any;
  }, [opp]);

  // Herda o cliente e o título já qualificados na oportunidade.
  useEffect(() => {
    if (!opp) return;
    if (opp.cliente_id) setClienteId((prev) => prev ?? opp.cliente_id);
    setTitulo((prev) => prev || opp.titulo || "");
  }, [opp]);

  // Moeda vem do cadastro do cliente enquanto o usuário não escolher outra.
  useEffect(() => {
    if (moedaTocada) return;
    const doCliente = (clienteRow as any)?.moeda;
    if (!doCliente) return;
    setMoeda(toMoedaISO(doCliente, MOEDA_PADRAO));
  }, [clienteRow, moedaTocada]);

  const generate = useServerFn(generateOrcamento);
  const sign = useServerFn(getSignedUrl);
  const [result, setResult] = useState<{
    id: string;
    codigo: string;
    versao: string;
    arquivos: Record<string, string>;
    drive_synced?: boolean;
    drive_error?: string | null;
  } | null>(null);
  const [generating, setGenerating] = useState(false);
  const [previewOn, setPreviewOn] = useState(true);
  const [previewLang, setPreviewLang] = useState<Idioma>("pt");
  const initialDraft = useMemo(
    () => ({
      step: 0,
      clienteId: initialPayload?.cliente?.id ?? prefillClienteId ?? null,
      clienteQ: "",
      titulo: initialTitulo ?? "",
      moeda: initialPayload?.moeda ?? MOEDA_PADRAO,
      equipamentos: initialPayload?.equipamentos?.length
        ? initialPayload.equipamentos
        : [EMPTY_EQ()],
      pagamentoForma: initialPayload?.pagamento?.forma ?? "Transferência bancária internacional",
      parcelas: initialPayload?.pagamento?.parcelas ?? [
        {
          numero: 1,
          percentual: 60,
          descricao_pt: "60% antecipado na confirmação do pedido",
          descricao_es: "60% adelantado en la confirmación del pedido",
          descricao_en: "60% upfront upon order confirmation",
        },
        {
          numero: 2,
          percentual: 40,
          descricao_pt: "40% antes do embarque",
          descricao_es: "40% antes del embarque",
          descricao_en: "40% before shipment",
        },
      ],
      prazoDias: initialPayload?.prazo?.dias ?? 180,
      prazoTexto: initialPayload?.prazo?.texto_extra ?? "",
      incoterm: initialPayload?.frete?.incoterm ?? "EXW",
      freteDesc: initialPayload?.frete?.descricao ?? "EXW Planta Solutek",
      validadeDias: initialPayload?.validade?.dias ?? 20,
      overrides: initialPayload?.blocos_overrides ?? {},
      motivo: "",
      bumpManual: "auto" as const,
    }),
    [initialPayload, initialTitulo, prefillClienteId],
  );
  const { clearDraft } = useFormDraft({
    formKey: `orcamento:${mode}:${documentoId ?? prefillOportunidade?.id ?? "novo"}`,
    value: {
      step,
      clienteId,
      clienteQ,
      titulo,
      moeda,
      equipamentos,
      pagamentoForma,
      parcelas,
      prazoDias,
      prazoTexto,
      incoterm,
      freteDesc,
      validadeDias,
      overrides,
      motivo,
      bumpManual,
    },
    initialValue: initialDraft,
    onRestore: (saved) => {
      setStep(saved.step);
      setClienteId(saved.clienteId);
      setClienteQ(saved.clienteQ);
      setTitulo(saved.titulo);
      setMoeda(saved.moeda);
      setEquipamentos(saved.equipamentos);
      setPagamentoForma(saved.pagamentoForma);
      setParcelas(saved.parcelas);
      setPrazoDias(saved.prazoDias);
      setPrazoTexto(saved.prazoTexto);
      setIncoterm(saved.incoterm);
      setFreteDesc(saved.freteDesc);
      setValidadeDias(saved.validadeDias);
      setOverrides(saved.overrides);
      setMotivo(saved.motivo);
      setBumpManual(saved.bumpManual);
    },
  });

  // Quando o initialPayload muda (carregamento assíncrono em /corrigir), repopula uma vez.
  useEffect(() => {
    if (!initialPayload) return;
    setClienteId(initialPayload.cliente?.id ?? null);
    setMoeda(toMoedaISO(initialPayload.moeda, MOEDA_PADRAO));
    setMoedaTocada(Boolean(initialPayload.moeda));
    setEquipamentos(
      initialPayload.equipamentos?.length ? initialPayload.equipamentos : [EMPTY_EQ()],
    );
    setPagamentoForma(initialPayload.pagamento?.forma ?? "");
    setParcelas(initialPayload.pagamento?.parcelas ?? []);
    setPrazoDias(initialPayload.prazo?.dias ?? 180);
    setPrazoTexto(initialPayload.prazo?.texto_extra ?? "");
    setIncoterm(initialPayload.frete?.incoterm ?? "EXW");
    setFreteDesc(initialPayload.frete?.descricao ?? "");
    setValidadeDias(initialPayload.validade?.dias ?? 20);
    setOverrides(initialPayload.blocos_overrides ?? {});
    if (initialTitulo) setTitulo(initialTitulo);
  }, [initialPayload, initialTitulo]);

  const updateEq = (idx: number, patch: Partial<EquipamentoOrcamento>) =>
    setEquipamentos((arr) => arr.map((e, i) => (i === idx ? { ...e, ...patch } : e)));
  const removeEq = (idx: number) => setEquipamentos((arr) => arr.filter((_, i) => i !== idx));
  const addEq = () => setEquipamentos((arr) => [...arr, EMPTY_EQ()]);

  const subtotal = useMemo(() => calcularSubtotal(equipamentos), [equipamentos]);

  const buildPayload = (): OrcamentoPayload | null => {
    if (!clienteRow || !user) return null;
    const c = clienteRow as any;
    return {
      cliente: {
        id: c.id,
        codigo: c.codigo,
        razao_social: c.razao_social,
        nome_fantasia: c.nome_fantasia,
        documento_fiscal_numero: c.documento_fiscal_numero,
        endereco_logradouro: null,
        endereco_numero: null,
        endereco_bairro: null,
        endereco_cidade: c.endereco_cidade,
        endereco_estado: c.endereco_estado,
        pais: c.pais,
        email_corporativo: null,
        telefone_corporativo_ddi: null,
        telefone_corporativo_numero: null,
      },
      responsavel: {
        id: user.id,
        nome: (user.user_metadata as any)?.full_name || user.email || "Responsável",
        email: user.email ?? null,
        telefone: null,
        cargo: null,
      },
      equipamentos,
      moeda,
      pagamento: { forma: pagamentoForma, parcelas },
      prazo: { dias: prazoDias, texto_extra: prazoTexto || undefined },
      frete: { incoterm, descricao: freteDesc },
      validade: { dias: validadeDias },
      blocos_overrides: overrides,
      blocos_selecionados: initialPayload?.blocos_selecionados ?? blocos.map((b: any) => b.codigo),
      oportunidade_id: initialPayload?.oportunidade_id ?? prefillOportunidade?.id ?? null,
      oportunidade_codigo: initialPayload?.oportunidade_codigo ?? null,
    };
  };

  // Diff vs versão anterior (modo corrigir)
  const diff = useMemo(() => {
    if (mode !== "corrigir" || !initialPayload) return null;
    const p = buildPayload();
    if (!p) return null;
    return diffOrcamentoPayload(initialPayload, p);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    mode,
    initialPayload,
    clienteRow,
    equipamentos,
    moeda,
    parcelas,
    prazoDias,
    prazoTexto,
    incoterm,
    freteDesc,
    validadeDias,
    overrides,
    pagamentoForma,
  ]);

  const previewVersao = useMemo(() => {
    if (mode !== "corrigir" || !versaoAtual) return "1.0.0";
    const kind: BumpKind =
      bumpManual === "auto"
        ? diff?.kind === "none"
          ? "patch"
          : diff?.kind || "patch"
        : bumpManual;
    const parts = versaoAtual.split(".").map((p) => parseInt(p, 10) || 0);
    while (parts.length < 3) parts.push(0);
    if (kind === "major") {
      parts[0] += 1;
      parts[1] = 0;
      parts[2] = 0;
    } else if (kind === "minor") {
      parts[1] += 1;
      parts[2] = 0;
    } else {
      parts[2] += 1;
    }
    return parts.join(".");
  }, [mode, versaoAtual, bumpManual, diff]);

  // Validação
  const missingByBloco = useMemo(() => {
    const out: Record<string, string[]> = {};
    const payload = buildPayload();
    if (!payload) return out;
    const get = (path: string): unknown => {
      const parts = path.split(".");
      let cur: any = payload;
      for (const p of parts) {
        if (cur == null) return null;
        cur = cur[p];
      }
      return cur;
    };
    for (const b of blocos as any[]) {
      const miss: string[] = [];
      for (const v of b.variaveis_obrigatorias || []) {
        const val = get(v);
        if (val == null || (Array.isArray(val) && val.length === 0) || val === "") miss.push(v);
      }
      if (miss.length) out[b.codigo] = miss;
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blocos, clienteRow, equipamentos, pagamentoForma, prazoDias, incoterm, validadeDias, user]);

  const totalMissing = Object.values(missingByBloco).reduce((s, v) => s + v.length, 0);

  const handleGenerate = async () => {
    const payload = buildPayload();
    if (!payload) {
      toast.error("Selecione um cliente.");
      return;
    }
    if (totalMissing > 0) {
      toast.error("Há dados obrigatórios faltando.");
      return;
    }
    if (mode === "corrigir") {
      if (!motivo.trim()) {
        toast.error("Informe o motivo da correção.");
        return;
      }
      if (diff?.kind === "none" && bumpManual === "auto") {
        toast.error("Nenhuma alteração detectada. Modifique algo ou force o tipo de bump.");
        return;
      }
    }
    setGenerating(true);
    try {
      const kind: BumpKind | undefined =
        mode === "corrigir"
          ? bumpManual === "auto"
            ? diff?.kind === "none"
              ? "patch"
              : (diff?.kind as BumpKind) || "patch"
            : bumpManual
          : undefined;
      const res = await generate({
        data: {
          payload,
          titulo: titulo || undefined,
          documento_id: mode === "corrigir" ? documentoId : undefined,
          bump: kind,
          motivo: mode === "corrigir" ? motivo : undefined,
          bump_changes: mode === "corrigir" ? (diff?.changes ?? []) : undefined,
        },
      });
      setResult({
        id: res.documento_id as string,
        codigo: res.codigo,
        versao: res.versao,
        arquivos: res.arquivos,
        drive_synced: (res as any).drive_synced,
        drive_error: (res as any).drive_error,
      });
      clearDraft();
      const verbo = mode === "corrigir" ? "corrigido para" : "gerado";
      if ((res as any).drive_synced)
        toast.success(`Orçamento ${res.codigo} ${verbo} v${res.versao} e sincronizado no Drive.`);
      else if ((res as any).drive_error)
        toast.warning(
          `Orçamento ${res.codigo} ${verbo} v${res.versao}. Drive: ${(res as any).drive_error}`,
        );
      else toast.success(`Orçamento ${res.codigo} ${verbo} v${res.versao}.`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = async (lang: "pt" | "es" | "en") => {
    if (!result) return;
    const { url } = await sign({ data: { path: result.arquivos[lang] } });
    window.open(url, "_blank");
  };

  const STEPS =
    mode === "corrigir"
      ? ["Cliente", "Equipamentos", "Condições", "Revisão & nova versão"]
      : ["Cliente", "Equipamentos", "Condições", "Revisão & gerar"];

  return (
    <>
      {/* Stepper + toggle prévia */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {STEPS.map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium ${i === step ? "bg-[var(--accent)] text-white" : i < step ? "bg-[var(--accent-muted-color)] text-white" : "bg-[var(--bg-border)] text-[var(--text-muted)]"}`}
              >
                {i + 1}
              </div>
              <div className={`text-sm ${i === step ? "font-medium" : "text-[var(--text-muted)]"}`}>
                {label}
              </div>
              {i < STEPS.length - 1 ? (
                <ChevronRight className="h-4 w-4 text-[var(--text-muted)]" />
              ) : null}
            </div>
          ))}
        </div>
        <Button variant="outline" size="sm" onClick={() => setPreviewOn((v) => !v)}>
          {previewOn ? (
            <>
              <EyeOff className="mr-2 h-4 w-4" /> Ocultar prévia
            </>
          ) : (
            <>
              <Eye className="mr-2 h-4 w-4" /> Mostrar prévia
            </>
          )}
        </Button>
      </div>

      <NovoClienteDialog
        open={novoClienteOpen}
        onOpenChange={setNovoClienteOpen}
        onCreated={handleClienteCriado}
        initialValues={novoClienteInitial}
      />

      {mode === "corrigir" && versaoAtual && (
        <div className="mb-4 flex items-center gap-2 text-xs text-[var(--text-muted)]">
          <HistoryIcon className="h-3.5 w-3.5" />
          Corrigindo <span className="font-mono">{codigoExistente}</span> · versão atual{" "}
          <Badge variant="outline" className="font-mono">
            v{versaoAtual}
          </Badge>{" "}
          → próxima{" "}
          <Badge variant="outline" className="font-mono">
            v{previewVersao}
          </Badge>
        </div>
      )}

      <div className={previewOn ? "grid gap-4 lg:grid-cols-[1fr_540px]" : ""}>
        <div className="min-w-0">
          {step === 0 && (
            <section className="grid gap-4 rounded-lg border border-[var(--bg-border)] bg-[var(--bg-surface)] p-6">
              {opp && (
                <div className="rounded-lg border border-[var(--bg-border)] bg-[var(--bg-base)] p-4">
                  <div className="mb-2 flex flex-wrap items-center gap-2 text-sm">
                    <Building2 className="h-4 w-4 text-[var(--text-muted)]" />
                    <span className="font-medium">Oportunidade</span>
                    <Badge variant="outline" className="font-mono">
                      {opp.codigo}
                    </Badge>
                    {opp.cliente_id ? (
                      <Badge variant="secondary">Cliente vinculado</Badge>
                    ) : (
                      <Badge variant="outline" className="border-amber-300 text-amber-700">
                        Lead (sem cliente)
                      </Badge>
                    )}
                  </div>

                  {opp.cliente_id ? (
                    <div className="grid gap-1 text-sm">
                      <div className="font-medium">
                        {opp.cliente_nome ?? "—"}{" "}
                        <span className="font-mono text-xs text-[var(--text-muted)]">
                          {opp.cliente_codigo}
                        </span>
                      </div>
                      <div className="text-xs text-[var(--text-muted)]">
                        {[opp.cliente_documento, opp.cliente_pais, opp.cliente_moeda]
                          .filter(Boolean)
                          .join(" · ") || "—"}
                      </div>
                    </div>
                  ) : (
                    <div className="grid gap-2 text-sm">
                      <div className="grid gap-1 sm:grid-cols-2">
                        <div>
                          <span className="text-xs text-[var(--text-muted)]">Empresa:</span>{" "}
                          {opp.empresa_lead || "—"}
                        </div>
                        <div>
                          <span className="text-xs text-[var(--text-muted)]">Contato:</span>{" "}
                          {opp.nome_lead || "—"}
                        </div>
                        <div>
                          <span className="text-xs text-[var(--text-muted)]">E-mail:</span>{" "}
                          {opp.email || "—"}
                        </div>
                        <div>
                          <span className="text-xs text-[var(--text-muted)]">Telefone:</span>{" "}
                          {opp.telefone || "—"}
                        </div>
                      </div>
                      {similares.length > 0 && (
                        <Alert>
                          <AlertTriangle className="h-4 w-4" />
                          <AlertTitle>Clientes parecidos já cadastrados</AlertTitle>
                          <AlertDescription>
                            <div className="mt-1 grid gap-1">
                              {similares.map((c: any) => (
                                <button
                                  key={c.id}
                                  type="button"
                                  className="text-left text-sm underline-offset-2 hover:underline"
                                  onClick={() => {
                                    setClienteId(c.id);
                                    void vincularOportunidade(c.id, c.codigo);
                                  }}
                                >
                                  <span className="font-mono text-xs">{c.codigo}</span>{" "}
                                  {c.razao_social}
                                </button>
                              ))}
                            </div>
                          </AlertDescription>
                        </Alert>
                      )}
                      <div className="flex flex-wrap gap-2">
                        <Button type="button" size="sm" onClick={() => setNovoClienteOpen(true)}>
                          Criar cliente com estes dados
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => setTrocandoCliente(true)}
                        >
                          Vincular a um cliente existente
                        </Button>
                      </div>
                    </div>
                  )}

                  {opp.cliente_id && !trocandoCliente && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="mt-2 px-0 text-xs"
                      onClick={() => setTrocandoCliente(true)}
                    >
                      Trocar cliente
                    </Button>
                  )}
                </div>
              )}

              {(!opp || trocandoCliente) && (
                <>
                  <div>
                    <Label>Buscar cliente</Label>
                    <div className="flex items-end gap-2">
                      <Input
                        className="flex-1"
                        placeholder="Razão social, código…"
                        value={clienteQ}
                        onChange={(e) => setClienteQ(e.target.value)}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setNovoClienteOpen(true)}
                      >
                        + Novo cliente
                      </Button>
                    </div>
                  </div>
                  <div className="max-h-72 overflow-auto rounded border border-[var(--bg-border)]">
                    {clienteRows.map((c: any) => (
                      <button
                        key={c.id}
                        onClick={() => {
                          setClienteId(c.id);
                          void vincularOportunidade(c.id, c.codigo);
                        }}
                        className={`flex w-full items-center justify-between border-b border-[var(--bg-border)] px-3 py-2 text-left text-sm hover:bg-[var(--bg-base)] ${clienteId === c.id ? "bg-[var(--bg-base)]" : ""}`}
                      >
                        <span>
                          <span className="font-mono text-xs text-[var(--text-muted)]">
                            {c.codigo}
                          </span>{" "}
                          <span className="font-medium">{c.razao_social}</span>
                        </span>
                        <span className="text-xs text-[var(--text-muted)]">
                          {c.endereco_cidade} / {c.pais}
                        </span>
                      </button>
                    ))}
                  </div>
                </>
              )}

              {opp && !trocandoCliente && clienteId && clienteRow && (
                <div className="rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                  Cliente do orçamento: <strong>{(clienteRow as any).razao_social}</strong>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Título (opcional)</Label>
                  <Input
                    value={titulo}
                    onChange={(e) => setTitulo(e.target.value)}
                    placeholder="ex: Linha de envase 6000 BPM"
                  />
                </div>
                <div>
                  <Label>Moeda</Label>
                  <Select
                    value={moeda}
                    onValueChange={(v) => {
                      setMoeda(v as Moeda);
                      setMoedaTocada(true);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MOEDAS.map((m) => (
                        <SelectItem key={m.codigo} value={m.codigo}>
                          {moedaLabel(m.codigo)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="mt-1 text-[11px] text-[var(--text-muted)]">
                    {moedaTocada
                      ? "Moeda definida manualmente para este orçamento."
                      : "Herdada do cadastro do cliente — você pode alterar."}
                  </p>
                </div>
              </div>
            </section>
          )}

          {step === 1 && (
            <section className="space-y-4">
              {equipamentos.map((eq, idx) => (
                <div
                  key={idx}
                  className="rounded-lg border border-[var(--bg-border)] bg-[var(--bg-surface)] p-4"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">Equipamento #{idx + 1}</span>
                      <label className="flex items-center gap-1 text-xs">
                        <input
                          type="checkbox"
                          checked={eq.opcional}
                          onChange={(e) => updateEq(idx, { opcional: e.target.checked })}
                        />
                        Opcional
                      </label>
                    </div>
                    {equipamentos.length > 1 ? (
                      <Button size="sm" variant="ghost" onClick={() => removeEq(idx)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    ) : null}
                  </div>
                  <Tabs defaultValue="pt">
                    <TabsList>
                      <TabsTrigger value="pt">PT</TabsTrigger>
                      <TabsTrigger value="es">ES</TabsTrigger>
                      <TabsTrigger value="en">EN</TabsTrigger>
                    </TabsList>
                    {(["pt", "es", "en"] as const).map((l) => (
                      <TabsContent value={l} key={l} className="space-y-2 pt-3">
                        <Input
                          placeholder="Nome / título do equipamento"
                          value={(eq as any)[`nome_${l}`]}
                          onChange={(e) => updateEq(idx, { [`nome_${l}`]: e.target.value } as any)}
                        />
                        <Textarea
                          placeholder="Descrição técnica detalhada"
                          rows={4}
                          value={(eq as any)[`descricao_${l}`]}
                          onChange={(e) =>
                            updateEq(idx, { [`descricao_${l}`]: e.target.value } as any)
                          }
                        />
                      </TabsContent>
                    ))}
                  </Tabs>
                  <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-[1fr,1fr]">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Quantidade</Label>
                        <Input
                          type="number"
                          min={1}
                          value={eq.quantidade}
                          onChange={(e) =>
                            updateEq(idx, { quantidade: parseInt(e.target.value || "1", 10) })
                          }
                        />
                      </div>
                      <div>
                        <Label>Valor unitário ({moeda})</Label>
                        <Input
                          type="number"
                          min={0}
                          step={0.01}
                          value={eq.valor_unitario}
                          onChange={(e) =>
                            updateEq(idx, { valor_unitario: parseFloat(e.target.value || "0") })
                          }
                        />
                      </div>
                      <div className="col-span-2">
                        <Label>Legenda da imagem (opcional)</Label>
                        <Input
                          placeholder="ex: Vista frontal da esteira bovina"
                          value={eq.imagem_legenda ?? ""}
                          onChange={(e) =>
                            updateEq(idx, { imagem_legenda: e.target.value || null })
                          }
                        />
                      </div>
                    </div>
                    <div>
                      <Label>Imagem do equipamento (opcional)</Label>
                      <EquipImageUploader
                        clienteId={clienteId}
                        titulo={titulo}
                        equipamentoNome={eq.nome_pt || eq.nome_en || `Equipamento ${idx + 1}`}
                        value={eq.imagem_url ?? null}
                        onChange={(v) => updateEq(idx, { imagem_url: v })}
                      />
                    </div>
                  </div>
                </div>
              ))}
              <div className="flex items-center justify-between">
                <Button variant="outline" onClick={addEq}>
                  <Plus className="mr-2 h-4 w-4" /> Adicionar equipamento
                </Button>
                <div className="text-sm text-[var(--text-muted)]">
                  Subtotal (não opcionais):{" "}
                  <span className="font-mono font-medium text-[var(--text-primary)]">
                    {formatMoeda(subtotal, moeda)}
                  </span>
                </div>
              </div>
            </section>
          )}

          {step === 2 && (
            <section className="space-y-6 rounded-lg border border-[var(--bg-border)] bg-[var(--bg-surface)] p-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Forma de pagamento</Label>
                  <Input
                    value={pagamentoForma}
                    onChange={(e) => setPagamentoForma(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Prazo de entrega (dias)</Label>
                  <Input
                    type="number"
                    value={prazoDias}
                    onChange={(e) => setPrazoDias(parseInt(e.target.value || "0", 10))}
                  />
                </div>
                <div>
                  <Label>Validade da oferta (dias)</Label>
                  <Input
                    type="number"
                    value={validadeDias}
                    onChange={(e) => setValidadeDias(parseInt(e.target.value || "0", 10))}
                  />
                </div>
                <div>
                  <Label>Incoterm</Label>
                  <Select value={incoterm} onValueChange={setIncoterm}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {["EXW", "FCA", "FOB", "CIF", "DAP", "DDP"].map((i) => (
                        <SelectItem key={i} value={i}>
                          {i}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2">
                  <Label>Descrição do frete</Label>
                  <Input value={freteDesc} onChange={(e) => setFreteDesc(e.target.value)} />
                </div>
                <div className="col-span-2">
                  <Label>Texto adicional do prazo (opcional)</Label>
                  <Textarea
                    rows={2}
                    value={prazoTexto}
                    onChange={(e) => setPrazoTexto(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <h3 className="mb-2 text-sm font-medium">Parcelas</h3>
                <div className="space-y-2">
                  {parcelas.map((p, i) => (
                    <div
                      key={i}
                      className="grid grid-cols-12 items-end gap-2 rounded border border-[var(--bg-border)] p-2"
                    >
                      <div className="col-span-1">
                        <Label className="text-xs">Nº</Label>
                        <Input
                          type="number"
                          value={p.numero}
                          onChange={(e) =>
                            setParcelas((arr) =>
                              arr.map((x, j) =>
                                j === i ? { ...x, numero: parseInt(e.target.value || "0", 10) } : x,
                              ),
                            )
                          }
                        />
                      </div>
                      <div className="col-span-2">
                        <Label className="text-xs">%</Label>
                        <Input
                          type="number"
                          step={0.01}
                          value={p.percentual}
                          onChange={(e) =>
                            setParcelas((arr) =>
                              arr.map((x, j) =>
                                j === i
                                  ? { ...x, percentual: parseFloat(e.target.value || "0") }
                                  : x,
                              ),
                            )
                          }
                        />
                      </div>
                      {(["pt", "es", "en"] as const).map((l) => (
                        <div key={l} className="col-span-3">
                          <Label className="text-xs uppercase">Descrição {l}</Label>
                          <Input
                            value={(p as any)[`descricao_${l}`]}
                            onChange={(e) =>
                              setParcelas((arr) =>
                                arr.map((x, j) =>
                                  j === i
                                    ? ({ ...x, [`descricao_${l}`]: e.target.value } as Parcela)
                                    : x,
                                ),
                              )
                            }
                          />
                        </div>
                      ))}
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setParcelas((arr) => [
                        ...arr,
                        {
                          numero: arr.length + 1,
                          percentual: 0,
                          descricao_pt: "",
                          descricao_es: "",
                          descricao_en: "",
                        },
                      ])
                    }
                  >
                    <Plus className="mr-2 h-4 w-4" /> Adicionar parcela
                  </Button>
                </div>
              </div>

              <div>
                <h3 className="mb-2 text-sm font-medium">
                  Sobrescrever textos de blocos (opcional)
                </h3>
                <p className="mb-2 text-xs text-[var(--text-muted)]">
                  Use os defaults configurados em Admin → Documentos. Sobrescreva aqui apenas se
                  necessário.
                </p>
                <Tabs defaultValue="pt">
                  <TabsList>
                    <TabsTrigger value="pt">PT</TabsTrigger>
                    <TabsTrigger value="es">ES</TabsTrigger>
                    <TabsTrigger value="en">EN</TabsTrigger>
                  </TabsList>
                  {(["pt", "es", "en"] as const).map((l) => (
                    <TabsContent value={l} key={l} className="space-y-2 pt-3">
                      {blocos
                        .filter((b: any) =>
                          [
                            "garantia",
                            "montagem_manutencao",
                            "treinamento",
                            "embalagem",
                            "informacoes_gerais",
                          ].includes(b.codigo),
                        )
                        .map((b: any) => (
                          <div key={b.codigo}>
                            <Label className="text-xs">{b.nome}</Label>
                            <Textarea
                              rows={2}
                              placeholder={String(
                                (
                                  (l === "pt"
                                    ? b.conteudo_pt
                                    : l === "es"
                                      ? b.conteudo_es
                                      : b.conteudo_en) as any
                                )?.texto || "",
                              )}
                              value={overrides[b.codigo]?.[l] ?? ""}
                              onChange={(e) =>
                                setOverrides((o) => ({
                                  ...o,
                                  [b.codigo]: { ...o[b.codigo], [l]: e.target.value || undefined },
                                }))
                              }
                            />
                          </div>
                        ))}
                    </TabsContent>
                  ))}
                </Tabs>
              </div>
            </section>
          )}

          {step === 3 && (
            <section className="space-y-4">
              {totalMissing > 0 ? (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Dados obrigatórios faltando</AlertTitle>
                  <AlertDescription>
                    {Object.entries(missingByBloco).map(([bcod, vars]) => (
                      <div key={bcod} className="mt-1 text-xs">
                        <Badge variant="outline" className="mr-2">
                          {bcod}
                        </Badge>
                        {vars.join(", ")}
                      </div>
                    ))}
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert>
                  <FileCheck2 className="h-4 w-4" />
                  <AlertTitle>
                    {mode === "corrigir" ? "Pronto para gerar nova versão" : "Pronto para gerar"}
                  </AlertTitle>
                  <AlertDescription>
                    {mode === "corrigir"
                      ? `Será gerada a versão v${previewVersao} substituindo o status para rascunho (nova revisão exige nova aprovação).`
                      : "Todos os dados obrigatórios estão preenchidos. Será gerado código novo + versão inicial 1.0.0 nos 3 idiomas."}
                  </AlertDescription>
                </Alert>
              )}

              {mode === "corrigir" && (
                <div className="rounded-lg border border-[var(--bg-border)] bg-[var(--bg-surface)] p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <h3 className="text-sm font-medium">Resumo das alterações</h3>
                    {diff && diff.kind !== "none" && (
                      <Badge variant="outline" className={BUMP_BADGE[diff.kind as BumpKind]}>
                        {BUMP_LABEL[diff.kind as BumpKind]}
                      </Badge>
                    )}
                  </div>
                  {!diff || diff.changes.length === 0 ? (
                    <div className="text-xs text-[var(--text-muted)]">
                      Nenhuma alteração detectada ainda.
                    </div>
                  ) : (
                    <ul className="space-y-1 text-xs">
                      {diff.changes.map((c, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-[var(--text-muted)]">•</span>
                          <span>{c}</span>
                        </li>
                      ))}
                    </ul>
                  )}

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div>
                      <Label className="text-xs">Tipo de versão</Label>
                      <RadioGroup
                        value={bumpManual}
                        onValueChange={(v) => setBumpManual(v as any)}
                        className="mt-1 space-y-1"
                      >
                        <label className="flex items-center gap-2 text-xs">
                          <RadioGroupItem value="auto" /> Automático (sugerido:{" "}
                          <strong>
                            {diff?.kind === "none" ? "patch" : (diff?.kind ?? "patch")}
                          </strong>
                          )
                        </label>
                        <label className="flex items-center gap-2 text-xs">
                          <RadioGroupItem value="patch" /> Forçar patch (x.x.<strong>+1</strong>) —
                          só texto
                        </label>
                        <label className="flex items-center gap-2 text-xs">
                          <RadioGroupItem value="minor" /> Forçar minor (x.<strong>+1</strong>.0) —
                          produto/valor
                        </label>
                        <label className="flex items-center gap-2 text-xs">
                          <RadioGroupItem value="major" /> Forçar major (<strong>+1</strong>.0.0) —
                          cliente/escopo
                        </label>
                      </RadioGroup>
                    </div>
                    <div>
                      <Label className="text-xs">
                        Motivo da correção <span className="text-rose-600">*</span>
                      </Label>
                      <Textarea
                        rows={5}
                        placeholder="Ex.: Cliente solicitou aumento de quantidade e ajuste no prazo de entrega."
                        value={motivo}
                        onChange={(e) => setMotivo(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}

              {!result ? (
                <div className="rounded-lg border border-[var(--bg-border)] bg-[var(--bg-surface)] p-6">
                  <h3 className="text-base font-medium">{titulo || "Sem título"}</h3>
                  <p className="mt-1 text-sm text-[var(--text-muted)]">
                    Cliente: {(clienteRow as any)?.razao_social || "—"} · {equipamentos.length}{" "}
                    equipamento(s) · Subtotal {formatMoeda(subtotal, moeda)}
                  </p>
                  <div className="mt-4">
                    <Button onClick={handleGenerate} disabled={generating || totalMissing > 0}>
                      {generating
                        ? "Gerando…"
                        : mode === "corrigir"
                          ? `Gerar nova versão v${previewVersao}`
                          : "Gerar PDF nos 3 idiomas"}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-6">
                  <h3 className="text-base font-medium text-emerald-900">
                    Documento {result.codigo} v{result.versao} gerado
                  </h3>
                  {result.drive_synced ? (
                    <p className="mt-1 text-xs text-emerald-700">
                      ✓ Sincronizado automaticamente no Google Drive.
                    </p>
                  ) : result.drive_error ? (
                    <p className="mt-1 text-xs text-[var(--text-muted)]">
                      Arquivamento no Google Drive não realizado. O PDF foi gerado e pode ser
                      baixado normalmente — verifique a integração em Configurações › Chaves &amp;
                      Diagnóstico.
                    </p>
                  ) : null}
                  <div className="mt-3 grid grid-cols-3 gap-3">
                    {(["pt", "es", "en"] as const).map((l) => (
                      <Button key={l} variant="outline" onClick={() => handleDownload(l)}>
                        <Download className="mr-2 h-4 w-4" /> Baixar {l.toUpperCase()}
                      </Button>
                    ))}
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Button
                      onClick={() => navigate({ to: "/documentos/$id", params: { id: result.id } })}
                    >
                      Abrir documento (revisão & aprovação)
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => navigate({ to: "/comercial/orcamento" })}
                    >
                      Ir para lista
                    </Button>
                  </div>
                </div>
              )}
            </section>
          )}

          <div className="mt-6 flex items-center justify-between">
            <Button variant="outline" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>
              <ChevronLeft className="mr-2 h-4 w-4" /> Voltar
            </Button>
            {step < 3 ? (
              <Button
                onClick={() => setStep((s) => s + 1)}
                disabled={(step === 0 && !clienteId) || (step === 1 && equipamentos.length === 0)}
              >
                Avançar <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            ) : null}
          </div>
        </div>

        {previewOn && (
          <aside className="sticky top-4 h-[calc(100vh-6rem)] overflow-hidden rounded-lg border border-[var(--bg-border)] bg-[var(--bg-surface)]">
            <div className="flex items-center justify-between border-b border-[var(--bg-border)] px-3 py-2">
              <div className="text-xs font-medium">Prévia do PDF</div>
              <div className="flex gap-1">
                {(["pt", "es", "en"] as const).map((l) => (
                  <button
                    key={l}
                    onClick={() => setPreviewLang(l)}
                    className={`rounded px-2 py-0.5 text-xs uppercase ${previewLang === l ? "bg-[var(--accent)] text-white" : "text-[var(--text-muted)] hover:bg-[var(--bg-base)]"}`}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>
            <div className="h-[calc(100%-37px)]">
              {clienteRow && user ? (
                <OrcamentoPdfPreview
                  codigo={codigoExistente ?? "PRÉVIA"}
                  versao={mode === "corrigir" ? previewVersao : "0.0.0"}
                  idioma={previewLang}
                  payload={buildPayload() as OrcamentoPayload}
                  blocos={blocos as any}
                  layout={layoutQ.data ?? null}
                />
              ) : (
                <div className="flex h-full items-center justify-center p-4 text-center text-xs text-[var(--text-muted)]">
                  Selecione um cliente para visualizar a prévia.
                </div>
              )}
            </div>
          </aside>
        )}
      </div>
    </>
  );
}

function EquipImageUploader(props: {
  clienteId: string | null;
  titulo: string;
  equipamentoNome: string;
  value: string | null;
  onChange: (v: string | null) => void;
}) {
  const { clienteId, titulo, equipamentoNome, value, onChange } = props;
  const upload = useServerFn(uploadOrcamentoImagem);
  const sign = useServerFn(signOrcamentoImagem);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    let cancel = false;
    (async () => {
      if (!value) {
        setPreview(null);
        return;
      }
      if (/^https?:|^data:|^blob:/.test(value)) {
        setPreview(value);
        return;
      }
      try {
        const r = await sign({ data: { path: value } });
        if (!cancel) setPreview(r.url);
      } catch {
        if (!cancel) setPreview(null);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [value, sign]);

  const onPick = async (file: File) => {
    setErr(null);
    if (!clienteId) {
      setErr("Selecione um cliente antes de enviar imagens.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setErr("Máx. 8 MB.");
      return;
    }
    setBusy(true);
    try {
      const buf = await file.arrayBuffer();
      const bytes = new Uint8Array(buf);
      let bin = "";
      for (let i = 0; i < bytes.byteLength; i++) bin += String.fromCharCode(bytes[i]);
      const base64 = btoa(bin);
      const r = await upload({
        data: {
          cliente_id: clienteId,
          titulo: titulo || null,
          equipamento_nome: equipamentoNome,
          base64,
          content_type: file.type || "image/jpeg",
        },
      });
      onChange(r.path);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-md border border-dashed border-[var(--bg-border)] bg-[var(--bg-base)] p-2">
      {preview ? (
        <div className="flex items-center gap-3">
          <img src={preview} alt="" className="h-20 w-28 rounded object-contain bg-white" />
          <div className="flex flex-1 flex-col gap-1">
            <span className="truncate text-xs text-[var(--text-muted)]">Imagem carregada</span>
            <div className="flex gap-2">
              <label className="cursor-pointer text-xs underline text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                Trocar
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void onPick(f);
                    e.currentTarget.value = "";
                  }}
                />
              </label>
              <button
                type="button"
                onClick={() => onChange(null)}
                className="inline-flex items-center gap-1 text-xs text-[var(--danger)] hover:underline"
              >
                <X className="h-3 w-3" /> Remover
              </button>
            </div>
          </div>
        </div>
      ) : (
        <label className="flex cursor-pointer items-center justify-center gap-2 rounded px-2 py-4 text-xs text-[var(--text-muted)] hover:bg-[var(--bg-surface)]">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          {busy ? "Enviando…" : "Clique para enviar (PNG, JPG, WEBP — até 8 MB)"}
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="hidden"
            disabled={busy}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onPick(f);
              e.currentTarget.value = "";
            }}
          />
        </label>
      )}
      {err ? <p className="mt-1 text-[11px] text-[var(--danger)]">{err}</p> : null}
    </div>
  );
}
