import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, ScanLine, ArrowLeft, Upload, Sparkles, CheckCircle2, Circle, AlertCircle, ExternalLink } from "lucide-react";
import { toast } from "sonner";

import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  scanFornecedorDocs,
  upsertFornecedor,
  listCategoriasFornecedor,
  uploadScanToDrive,
  linkScanSubmissao,
} from "@/lib/fornecedores.functions";
import { CategoriasPicker } from "@/components/fornecedores/CategoriasPicker";

import {
  fornecedorInputSchema,
  FORNECEDOR_RANKINGS,
  FORNECEDOR_STATUS,
  FORNECEDOR_STATUS_LABEL,
  INCOTERMS,
  MOEDAS,
  TAX_ID_TIPOS,
  CERTIFICACOES_SUGERIDAS,
  REGIMES_TRIBUTARIOS_BR,
  isBR,
  isCN,
  type FornecedorInput,
} from "@/lib/fornecedores.shared";
import { listPaises } from "@/lib/clientes.functions";
import { enrichDocumento } from "@/lib/enrich.functions";
import { Flag } from "@/components/ui/flag";

export const Route = createFileRoute("/_authenticated/fornecedores/novo")({
  component: NovoFornecedorPage,
});

const EMPTY: FornecedorInput = {
  nome: "",
  nome_fantasia: "",
  pais: "BR",
  cidade: "",
  endereco: "",
  site: "",
  email_corporativo: "",
  telefone_ddi: "+55",
  telefone_numero: "",
  idioma: "pt",
  ranking: "B",
  status: "em_avaliacao",
  observacoes: "",
  tags: [],
  palavras_chave: [],
  categorias: [],
  certificacoes: [],
  cnaes_secundarios: [],
};

async function fileToBase64(file: File): Promise<{ base64: string; mime: string }> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const result = r.result as string;
      const base64 = result.split(",")[1] ?? "";
      resolve({ base64, mime: file.type || "image/jpeg" });
    };
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

function NovoFornecedorPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [form, setForm] = useState<FornecedorInput>(EMPTY);
  const [tagsInput, setTagsInput] = useState("");
  const [keywordInput, setKeywordInput] = useState("");
  const [certInput, setCertInput] = useState("");
  const [tab, setTab] = useState<"scan" | "manual">("scan");
  const [scanning, setScanning] = useState(false);
  const [scanPreview, setScanPreview] = useState<string[]>([]);
  const [scanImages, setScanImages] = useState<Array<{ base64: string; mime: string }>>([]);
  const [enderecoOriginal, setEnderecoOriginal] = useState<string | null>(null);
  const [enrichment, setEnrichment] = useState<{
    resumo?: string | null;
    produtos_principais?: string[] | null;
    site_oficial?: string | null;
    ano_fundacao?: string | null;
    porte?: string | null;
    funcionarios?: string | null;
    certificacoes?: string[] | null;
    mercados_atendidos?: string[] | null;
    categorias_match?: string[] | null;
    fontes?: string[] | null;
  } | null>(null);
  const [scanError, setScanError] = useState<{
    message: string;
    action?: string;
    status?: number;
    code?: string;
    logged_at?: string;
    log_id?: string;
  } | null>(null);

  // ===== Indicador de progresso do pipeline =====
  type PhaseStatus = "idle" | "running" | "done" | "skipped" | "error";
  type Phases = { ocr: PhaseStatus; translation: PhaseStatus; enrichment: PhaseStatus; drive: PhaseStatus };
  const [phases, setPhases] = useState<Phases>({
    ocr: "idle",
    translation: "idle",
    enrichment: "idle",
    drive: "idle",
  });
  const [driveResult, setDriveResult] = useState<{
    folder_url: string | null;
    uploaded: Array<{ id: string; url: string; nome: string }>;
  } | null>(null);
  const [createdId, setCreatedId] = useState<string | null>(null);

  // ===== Campos preenchidos pela IA (revisão antes de salvar) =====
  const [aiFields, setAiFields] = useState<Record<string, unknown>>({});
  const [reviewOpen, setReviewOpen] = useState(false);

  // ===== Rascunho persistente (localStorage) =====
  const DRAFT_KEY = "fornecedor:novo:draft:v1";
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);
  // Trava o autosave após criar/limpar para evitar reescrever o draft entre o reset e o unmount.
  const draftSuspended = useRef(false);

  function resetPhases() {
    setPhases({ ocr: "idle", translation: "idle", enrichment: "idle", drive: "idle" });
    setDriveResult(null);
    setCreatedId(null);
  }

  function clearDraft() {
    draftSuspended.current = true;
    try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
    setHasDraft(false);
    setForm(EMPTY);
    setEnrichment(null);
    setEnderecoOriginal(null);
    setScanPreview([]);
    setScanImages([]);
    setAiFields({});
    resetPhases();
    // Permite que o autosave volte a operar depois do commit do reset.
    setTimeout(() => { draftSuspended.current = false; }, 0);
  }




  const categorias = useQuery({
    queryKey: ["fornecedores", "categorias"],
    queryFn: () => listCategoriasFornecedor(),
  });

  const paises = useQuery({
    queryKey: ["paises", "config"],
    queryFn: () => listPaises(),
  });

  const paisAtual = (paises.data ?? []).find((p) => p.codigo === form.pais.toUpperCase());

  const [enriching, setEnriching] = useState(false);
  async function buscarPorDocumento() {
    const doc = (form.tax_id ?? "").trim();
    if (!doc) {
      toast.error("Informe o documento antes de buscar.");
      return;
    }
    setEnriching(true);
    try {
      const res = await enrichDocumento({ data: { pais: form.pais, documento: doc } });
      if (!res.ok) {
        toast.error(res.error ?? "Não foi possível enriquecer.");
        return;
      }
      const d = res.data;
      setForm((p) => ({
        ...p,
        nome: p.nome || d.razao_social || p.nome,
        nome_fantasia: p.nome_fantasia || d.nome_fantasia || p.nome_fantasia,
        email_corporativo: p.email_corporativo || d.email_corporativo || p.email_corporativo,
        telefone_ddi: p.telefone_ddi || d.telefone_corporativo_ddi || p.telefone_ddi,
        telefone_numero: p.telefone_numero || d.telefone_corporativo_numero || p.telefone_numero,
        cidade: p.cidade || d.endereco_cidade || p.cidade,
        endereco_estado_provincia: p.endereco_estado_provincia || d.endereco_estado || p.endereco_estado_provincia,
        endereco_cep: p.endereco_cep || d.endereco_codigo_postal || p.endereco_cep,
        endereco:
          p.endereco ||
          [d.endereco_logradouro, d.endereco_numero, d.endereco_bairro, d.endereco_complemento]
            .filter(Boolean)
            .join(", ") ||
          p.endereco,
        data_abertura: p.data_abertura || d.data_abertura || p.data_abertura,
        situacao_cadastral: p.situacao_cadastral || d.situacao_cadastral || p.situacao_cadastral,
        capital_social: p.capital_social ?? d.capital_social ?? p.capital_social,
        natureza_juridica: p.natureza_juridica || d.natureza_juridica_descricao || p.natureza_juridica,
        cnae_principal: p.cnae_principal || d.cnae_principal || p.cnae_principal,
        cnaes_secundarios:
          p.cnaes_secundarios.length > 0
            ? p.cnaes_secundarios
            : (d.cnaes_secundarios ?? p.cnaes_secundarios),
        tax_id_tipo: p.tax_id_tipo || (paisAtual?.documento_nome ?? p.tax_id_tipo),
      }));
      toast.success("Dados oficiais carregados.");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setEnriching(false);
    }
  }

  const save = useMutation({
    mutationFn: async () => {
      const parsed = fornecedorInputSchema.safeParse(form);
      if (!parsed.success) {
        throw new Error(parsed.error.issues[0]?.message ?? "Dados inválidos");
      }
      return upsertFornecedor({ data: { patch: parsed.data } });
    },
    onSuccess: async (res) => {
      qc.invalidateQueries({ queryKey: ["fornecedores"] });
      setCreatedId(res.id ?? null);
      let driveFolderId: string | null = null;
      let driveFiles: Array<{ id: string; url: string; nome: string }> = [];
      let driveFolderUrl: string | null = null;
      if (res.id && scanImages.length > 0) {
        setPhases((p) => ({ ...p, drive: "running" }));
        try {
          const up = await uploadScanToDrive({
            data: {
              fornecedor_id: res.id,
              imagens: scanImages.map((i) => ({ ...i, tipo: "cartao" })),
            },
          });
          if (up.ok && up.uploaded.length) {
            driveFolderId = up.folder_id ?? null;
            driveFolderUrl = up.folder_url ?? null;
            driveFiles = up.uploaded;
            setDriveResult({ folder_url: up.folder_url ?? null, uploaded: up.uploaded });
            setPhases((p) => ({ ...p, drive: "done" }));
            toast.success(`${up.uploaded.length} imagem(ns) salva(s) no Drive`);
          } else {
            setPhases((p) => ({ ...p, drive: "error" }));
            toast.warning(up.ok ? "Nenhum arquivo enviado" : (up.error ?? "Drive indisponível"));
          }
        } catch (e) {
          setPhases((p) => ({ ...p, drive: "error" }));
          toast.warning(`Drive: ${(e as Error).message}`);
        }
      } else {
        setPhases((p) => ({ ...p, drive: "skipped" }));
      }

      // Persistir a submissão completa para o histórico do fornecedor
      if (res.id) {
        try {
          await linkScanSubmissao({
            data: {
              fornecedor_id: res.id,
              origem: "scan",
              imagens_count: scanImages.length,
              extracted: lastExtracted as never,
              enrichment: enrichment as never,
              endereco_original: enderecoOriginal,
              drive_folder_id: driveFolderId,
              drive_files: driveFiles as never,
              ok: true,
            },
          });
        } catch {
          // best-effort
        }
      }

      // Suspende o autosave antes de resetar, senão o useEffect reescreve o draft.
      draftSuspended.current = true;
      try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
      setHasDraft(false);
      setAiFields({});
      // Limpa o formulário para o próximo cadastro
      setForm(EMPTY);
      setEnrichment(null);
      setEnderecoOriginal(null);
      setScanPreview([]);
      setScanImages([]);
      setLastExtracted(null);
      // Garante que o draft fique vazio mesmo se algum efeito tentar gravar antes do unmount.
      try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
      toast.success("Fornecedor cadastrado");
      if (res.id) {
        navigate({ to: "/fornecedores/$id", params: { id: res.id } });
      }
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const [lastExtracted, setLastExtracted] = useState<unknown>(null);

  async function handleScan(files: FileList | null) {
    if (!files || files.length === 0) return;
    setScanning(true);
    setScanError(null);
    setEnrichment(null);
    setEnderecoOriginal(null);
    resetPhases();
    setPhases({ ocr: "running", translation: "running", enrichment: "running", drive: "idle" });
    try {
      const arr = Array.from(files).slice(0, 6);
      const previews: string[] = [];
      const images = await Promise.all(
        arr.map(async (f) => {
          const { base64, mime } = await fileToBase64(f);
          previews.push(`data:${mime};base64,${base64}`);
          return { base64, mime };
        }),
      );
      setScanPreview(previews);
      setScanImages(images);
      const res = await scanFornecedorDocs({ data: { imagens: images } });
      if (!res.ok) {
        setScanError(res.error);
        setPhases({ ocr: "error", translation: "error", enrichment: "error", drive: "idle" });
        toast.error(res.error.message);
        return;
      }
      const e = res.extracted as typeof res.extracted & { endereco_original?: string | null };
      const w = res.web as (typeof res.web & { categorias_match?: string[] | null }) | null;
      setLastExtracted(res.extracted);
      if (e.endereco_original) setEnderecoOriginal(e.endereco_original);
      if (w) setEnrichment(w);
      setPhases({
        ocr: "done",
        translation: e.endereco_original ? "done" : "skipped",
        enrichment: w ? "done" : "skipped",
        drive: "idle",
      });
      const matched = Array.isArray(w?.categorias_match) ? w!.categorias_match! : [];
      setForm((prev) => ({
        ...prev,
        nome: e.nome ?? prev.nome,
        nome_fantasia: e.nome_fantasia ?? prev.nome_fantasia,
        pais: e.pais ?? prev.pais,
        cidade: e.cidade ?? prev.cidade,
        endereco: e.endereco ?? prev.endereco,
        site: e.site ?? prev.site,
        email_corporativo: e.email_corporativo ?? prev.email_corporativo,
        telefone_ddi: e.telefone_ddi ?? prev.telefone_ddi,
        telefone_numero: e.telefone_numero ?? prev.telefone_numero,
        idioma: e.idioma ?? prev.idioma,
        observacoes: [
          e.observacoes,
          w?.resumo ? `\n— Resumo (web): ${w.resumo}` : "",
          w?.ano_fundacao ? `Fundada em ${w.ano_fundacao}.` : "",
          w?.porte ? `Porte: ${w.porte}.` : "",
          w?.funcionarios ? `Funcionários: ${w.funcionarios}.` : "",
          w?.certificacoes?.length ? `Certificações: ${w.certificacoes.join(", ")}.` : "",
          w?.mercados_atendidos?.length ? `Mercados: ${w.mercados_atendidos.join(", ")}.` : "",
          w?.fontes?.length ? `Fontes: ${w.fontes.slice(0, 3).join(" | ")}` : "",
        ]
          .filter(Boolean)
          .join("\n")
          .trim() || prev.observacoes,
        tags: e.categorias_sugeridas ?? prev.tags,
        categorias: matched.length
          ? Array.from(new Set([...prev.categorias, ...matched]))
          : prev.categorias,
        // ===== Mescla campos avançados extraídos pelo Groq/Firecrawl =====
        tax_id: prev.tax_id || (w as { tax_id?: string | null } | null)?.tax_id || prev.tax_id,
        tax_id_tipo: prev.tax_id_tipo || (w as { tax_id_tipo?: string | null } | null)?.tax_id_tipo || prev.tax_id_tipo,
        legal_name_local: prev.legal_name_local || (w as { legal_name_local?: string | null } | null)?.legal_name_local || prev.legal_name_local,
        moeda_padrao: prev.moeda_padrao || (w as { moeda_padrao?: string | null } | null)?.moeda_padrao || prev.moeda_padrao,
        incoterm_padrao: prev.incoterm_padrao || (w as { incoterm_padrao?: string | null } | null)?.incoterm_padrao || prev.incoterm_padrao,
        porto_origem: prev.porto_origem || (w as { porto_origem?: string | null } | null)?.porto_origem || prev.porto_origem,
        lead_time_dias: prev.lead_time_dias ?? (w as { lead_time_dias?: number | null } | null)?.lead_time_dias ?? prev.lead_time_dias,
        moq: prev.moq ?? (w as { moq?: number | null } | null)?.moq ?? prev.moq,
        payment_terms: prev.payment_terms || (w as { payment_terms?: string | null } | null)?.payment_terms || prev.payment_terms,
        funcionarios_faixa: prev.funcionarios_faixa || (w as { funcionarios_faixa?: string | null } | null)?.funcionarios_faixa || prev.funcionarios_faixa,
        fabrica_area_m2: prev.fabrica_area_m2 ?? (w as { fabrica_area_m2?: number | null } | null)?.fabrica_area_m2 ?? prev.fabrica_area_m2,
        capacidade_mensal: prev.capacidade_mensal || (w as { capacidade_mensal?: string | null } | null)?.capacidade_mensal || prev.capacidade_mensal,
        whatsapp_corp: prev.whatsapp_corp || (w as { whatsapp_corp?: string | null } | null)?.whatsapp_corp || prev.whatsapp_corp,
        wechat_corp: prev.wechat_corp || (w as { wechat_corp?: string | null } | null)?.wechat_corp || prev.wechat_corp,
        linkedin_url: prev.linkedin_url || (w as { linkedin_url?: string | null } | null)?.linkedin_url || prev.linkedin_url,
        alibaba_url: prev.alibaba_url || (w as { alibaba_url?: string | null } | null)?.alibaba_url || prev.alibaba_url,
        made_in_china_url: prev.made_in_china_url || (w as { made_in_china_url?: string | null } | null)?.made_in_china_url || prev.made_in_china_url,
        endereco_estado_provincia: prev.endereco_estado_provincia || (w as { endereco_estado_provincia?: string | null } | null)?.endereco_estado_provincia || prev.endereco_estado_provincia,
        fuso_horario: prev.fuso_horario || (w as { fuso_horario?: string | null } | null)?.fuso_horario || prev.fuso_horario,
        certificacoes: Array.from(new Set([
          ...prev.certificacoes,
          ...((w as { certificacoes?: string[] | null } | null)?.certificacoes ?? []),
        ])),
        palavras_chave: Array.from(new Set([
          ...prev.palavras_chave,
          ...((w as { palavras_chave?: string[] | null } | null)?.palavras_chave ?? []),
        ])),
      }));

      // Registrar campos preenchidos pela IA para revisão antes de salvar
      const ai: Record<string, unknown> = {};
      const eRec = e as Record<string, unknown>;
      const wRec = (w ?? {}) as Record<string, unknown>;
      const scalarKeys = [
        "nome", "nome_fantasia", "pais", "cidade", "endereco", "site",
        "email_corporativo", "telefone_ddi", "telefone_numero", "idioma", "observacoes",
        "tax_id", "tax_id_tipo", "legal_name_local", "moeda_padrao", "incoterm_padrao",
        "porto_origem", "lead_time_dias", "moq", "payment_terms", "funcionarios_faixa",
        "fabrica_area_m2", "capacidade_mensal", "whatsapp_corp", "wechat_corp",
        "linkedin_url", "alibaba_url", "made_in_china_url", "endereco_estado_provincia",
        "fuso_horario",
      ];
      for (const k of scalarKeys) {
        const v = eRec[k] ?? wRec[k];
        if (v !== undefined && v !== null && v !== "") ai[k] = v;
      }
      const arrKeys = ["tags", "categorias", "certificacoes", "palavras_chave"];
      for (const k of arrKeys) {
        const v = (eRec[k] ?? wRec[k]) as unknown[] | undefined;
        if (Array.isArray(v) && v.length > 0) ai[k] = v;
      }
      setAiFields((prev) => ({ ...prev, ...ai }));
      if (Object.keys(ai).length > 0) setReviewOpen(true);

      toast.success("Dados extraídos — revise os campos preenchidos pela IA antes de salvar.");
      setTab("manual");

    } catch (err) {
      setPhases((p) => ({
        ocr: p.ocr === "running" ? "error" : p.ocr,
        translation: p.translation === "running" ? "error" : p.translation,
        enrichment: p.enrichment === "running" ? "error" : p.enrichment,
        drive: p.drive,
      }));
      toast.error((err as Error).message);
    } finally {
      setScanning(false);
    }
  }



  useEffect(() => {
    function onPaste(e: ClipboardEvent) {
      if (tab !== "scan" || scanning) return;
      const items = e.clipboardData?.items;
      if (!items) return;
      const files: File[] = [];
      for (const it of Array.from(items)) {
        if (it.kind === "file" && it.type.startsWith("image/")) {
          const f = it.getAsFile();
          if (f) files.push(f);
        }
      }
      if (files.length === 0) return;
      e.preventDefault();
      const dt = new DataTransfer();
      files.slice(0, 6).forEach((f) => dt.items.add(f));
      void handleScan(dt.files);
    }
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [tab, scanning]);

  // Carrega rascunho ao montar
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const d = JSON.parse(raw) as {
          form?: FornecedorInput;
          phases?: Phases;
          enrichment?: typeof enrichment;
          enderecoOriginal?: string | null;
          aiFields?: Record<string, unknown>;
          scanPreview?: string[];
          tab?: "scan" | "manual";
        };
        if (d.form) setForm({ ...EMPTY, ...d.form });
        if (d.phases) setPhases(d.phases);
        if (d.enrichment) setEnrichment(d.enrichment);
        if (d.enderecoOriginal) setEnderecoOriginal(d.enderecoOriginal);
        if (d.aiFields) setAiFields(d.aiFields);
        if (d.scanPreview) setScanPreview(d.scanPreview);
        if (d.tab) setTab(d.tab);
        setHasDraft(true);
      }
    } catch { /* ignore */ }
    setDraftLoaded(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persiste rascunho a cada mudança relevante (depois do load inicial)
  useEffect(() => {
    if (!draftLoaded) return;
    if (draftSuspended.current) return;
    try {
      const payload = JSON.stringify({
        form, phases, enrichment, enderecoOriginal, aiFields, scanPreview, tab,
      });
      localStorage.setItem(DRAFT_KEY, payload);
      setHasDraft(true);
    } catch { /* ignore */ }
  }, [form, phases, enrichment, enderecoOriginal, aiFields, scanPreview, tab, draftLoaded]);



  function toggleCategoria(slug: string) {
    setForm((prev) => ({
      ...prev,
      categorias: prev.categorias.includes(slug)
        ? prev.categorias.filter((s) => s !== slug)
        : [...prev.categorias, slug],
    }));
  }

  function addTag() {
    const t = tagsInput.trim();
    if (!t) return;
    setForm((p) => ({ ...p, tags: Array.from(new Set([...p.tags, t])) }));
    setTagsInput("");
  }

  function addKeyword() {
    const t = keywordInput.trim();
    if (!t) return;
    setForm((p) => ({ ...p, palavras_chave: Array.from(new Set([...p.palavras_chave, t])) }));
    setKeywordInput("");
  }

  function toggleCert(c: string) {
    setForm((p) => ({
      ...p,
      certificacoes: p.certificacoes.includes(c)
        ? p.certificacoes.filter((x) => x !== c)
        : [...p.certificacoes, c],
    }));
  }

  function addCustomCert() {
    const t = certInput.trim();
    if (!t) return;
    setForm((p) => ({ ...p, certificacoes: Array.from(new Set([...p.certificacoes, t])) }));
    setCertInput("");
  }

  return (
    <PageContainer>
      <PageHeader
        breadcrumbs={[
          { label: "Compras", href: "/fornecedores" },
          { label: "Fornecedores", href: "/fornecedores" },
          { label: "Novo" },
        ]}
        title="Novo fornecedor"
        subtitle="Cadastro manual ou scan automático (Groq Llama 4 Scout) de cartões/folders."
        actions={
          <Button variant="outline" onClick={() => navigate({ to: "/fornecedores" })}>
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Button>
        }
      />

      <Tabs value={tab} onValueChange={(v) => setTab(v as "scan" | "manual")}>
        <TabsList>
          <TabsTrigger value="scan">
            <Sparkles className="mr-1.5 h-3.5 w-3.5" /> Scan automático
          </TabsTrigger>
          <TabsTrigger value="manual">
            <ScanLine className="mr-1.5 h-3.5 w-3.5" /> Cadastro manual
          </TabsTrigger>
        </TabsList>

        <TabsContent value="scan" className="mt-4">
          <div className="rounded-[var(--radius-md)] border-2 border-dashed border-[var(--bg-border)] bg-[var(--bg-surface)] p-8 text-center">
            <ScanLine className="mx-auto mb-3 h-8 w-8 text-[var(--text-muted)]" />
            <p className="text-sm font-medium text-[var(--text-primary)]">
              Envie cartões de visita, folders ou catálogos
            </p>
            <p className="mt-1 text-[12.5px] text-[var(--text-muted)]">
              JPG/PNG/WEBP até 6 imagens — OCR via Groq Llama 4 Scout vision + enriquecimento web (Firecrawl + Llama 3.3 70B).
            </p>

            <p className="mt-2 text-[11.5px] text-[var(--text-muted)]">
              Dica: cole imagens com <kbd className="rounded border border-[var(--bg-border)] bg-[var(--bg-surface)] px-1 text-[10px]">Ctrl</kbd> + <kbd className="rounded border border-[var(--bg-border)] bg-[var(--bg-surface)] px-1 text-[10px]">V</kbd>
            </p>

            <label className="mt-4 inline-flex">
              <input
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                disabled={scanning}
                onChange={(e) => handleScan(e.target.files)}
              />
              <span className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90">
                {scanning ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                {scanning ? "Analisando…" : "Selecionar imagens"}
              </span>
            </label>

            {scanPreview.length > 0 ? (
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                {scanPreview.map((src, i) => (
                  <img
                    key={i}
                    src={src}
                    alt={`Scan ${i + 1}`}
                    className="h-28 w-44 rounded-md object-cover ring-1 ring-[var(--bg-border)]"
                  />
                ))}
              </div>
            ) : null}
          </div>

          {(phases.ocr !== "idle" || phases.drive !== "idle") && (
            <ScanProgress phases={phases} />
          )}

          {driveResult && (
            <div className="mt-4 rounded-[var(--radius-md)] border border-emerald-200 bg-emerald-50/60 p-4">
              <div className="mb-2 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wide text-emerald-700">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Anexos no Google Drive
              </div>
              {driveResult.folder_url && (
                <a
                  href={driveResult.folder_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[12.5px] font-medium text-emerald-800 hover:underline"
                >
                  Abrir pasta do fornecedor <ExternalLink className="h-3 w-3" />
                </a>
              )}
              {driveResult.uploaded.length > 0 && (
                <ul className="mt-2 space-y-1 text-[12px]">
                  {driveResult.uploaded.map((u) => (
                    <li key={u.id}>
                      <a
                        href={u.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-emerald-800 hover:underline"
                      >
                        {u.nome}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
              {createdId && (
                <div className="mt-3">
                  <Button
                    size="sm"
                    onClick={() =>
                      navigate({ to: "/fornecedores/$id", params: { id: createdId } })
                    }
                  >
                    Abrir ficha do fornecedor
                  </Button>
                </div>
              )}
            </div>
          )}

          {scanError ? (

            <Alert variant="destructive" className="mt-4">
              <AlertTitle>
                Groq não conseguiu analisar as imagens
                {scanError.status ? ` — HTTP ${scanError.status}` : ""}
                {scanError.code ? ` (${scanError.code})` : ""}
              </AlertTitle>
              <AlertDescription className="mt-1 space-y-2">
                <p>{scanError.message}</p>
                {scanError.action ? (
                  <p className="rounded bg-black/10 px-2 py-1 font-mono text-[11.5px] leading-relaxed">
                    Detalhe Groq: {scanError.action}
                  </p>
                ) : null}
                {scanError.logged_at ? (
                  <p className="text-[11.5px] opacity-80">
                    Registrado em{" "}
                    {new Date(scanError.logged_at).toLocaleString("pt-BR")}
                    {scanError.log_id ? ` · log #${scanError.log_id.slice(0, 8)}` : ""}
                  </p>
                ) : null}
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    asChild
                  >
                    <a
                      href="https://console.groq.com/keys"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Gerenciar chave no console Groq ↗
                    </a>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setTab("manual")}
                  >
                    Continuar cadastro manual
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          ) : null}

        </TabsContent>

        <TabsContent value="manual" className="mt-4 space-y-6">
          {hasDraft && (
            <Alert>
              <AlertTitle className="flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5" /> Rascunho recuperado
              </AlertTitle>
              <AlertDescription className="mt-1 flex items-center justify-between gap-2">
                <span className="text-[12.5px]">
                  Você pode continuar de onde parou ou descartar este rascunho.
                </span>
                <Button type="button" size="sm" variant="outline" onClick={clearDraft}>
                  Descartar rascunho
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {Object.keys(aiFields).length > 0 && (
            <ReviewAIPanel
              aiFields={aiFields}
              open={reviewOpen}
              setOpen={setReviewOpen}
              onAccept={(accepted) => {
                // Remove do form os campos que foram desmarcados
                setForm((prev) => {
                  const next = { ...prev } as Record<string, unknown>;
                  for (const k of Object.keys(aiFields)) {
                    if (!accepted[k]) {
                      const orig = (EMPTY as unknown as Record<string, unknown>)[k];
                      next[k] = Array.isArray(orig) ? [] : orig ?? null;
                    }
                  }
                  return next as FornecedorInput;
                });
                // Mantém apenas os aceitos no aiFields para o usuário ver o que sobrou
                setAiFields((prev) => {
                  const out: Record<string, unknown> = {};
                  for (const [k, v] of Object.entries(prev)) {
                    if (accepted[k]) out[k] = v;
                  }
                  return out;
                });
                setReviewOpen(false);
                toast.success("Campos da IA confirmados");
              }}
            />
          )}


          <section className="rounded-[var(--radius-md)] border border-[var(--bg-border)] bg-[var(--bg-surface)] p-5">
            <h3 className="mb-3 text-[13px] font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
              Identificação
            </h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <Label>Razão social *</Label>
                <Input
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                />
              </div>
              <div>
                <Label>Nome fantasia</Label>
                <Input
                  value={form.nome_fantasia ?? ""}
                  onChange={(e) =>
                    setForm({ ...form, nome_fantasia: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>Site</Label>
                <Input
                  value={form.site ?? ""}
                  onChange={(e) => setForm({ ...form, site: e.target.value })}
                  placeholder="ex.: empresa.com"
                />
              </div>
              <div>
                <Label>País</Label>
                <Select
                  value={form.pais}
                  onValueChange={(v) => {
                    const p = (paises.data ?? []).find((x) => x.codigo === v);
                    setForm((prev) => ({
                      ...prev,
                      pais: v,
                      idioma: prev.idioma || p?.idioma_padrao || prev.idioma,
                      moeda_padrao: prev.moeda_padrao || p?.moeda_padrao || prev.moeda_padrao,
                      tax_id_tipo: prev.tax_id_tipo || p?.documento_nome || prev.tax_id_tipo,
                    }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {(paises.data ?? []).map((p) => (
                      <SelectItem key={p.codigo} value={p.codigo}>
                        <span className="inline-flex items-center gap-2">
                          <Flag code={p.codigo} size={18} />
                          <span>{p.nome}</span>
                          <span className="text-[11px] text-[var(--text-muted)]">{p.codigo}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Cidade</Label>
                <Input
                  value={form.cidade ?? ""}
                  onChange={(e) => setForm({ ...form, cidade: e.target.value })}
                />
              </div>
              <div className="md:col-span-2">
                <Label>Endereço</Label>
                <Input
                  value={form.endereco ?? ""}
                  onChange={(e) => setForm({ ...form, endereco: e.target.value })}
                />
                {enderecoOriginal && (
                  <p className="mt-1 text-[11px] text-[var(--text-muted)]">
                    Original: <span className="font-mono">{enderecoOriginal}</span> (traduzido automaticamente)
                  </p>
                )}
              </div>
            </div>
          </section>

          <section className="rounded-[var(--radius-md)] border border-[var(--bg-border)] bg-[var(--bg-surface)] p-5">
            <h3 className="mb-3 text-[13px] font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
              Contato corporativo
            </h3>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="md:col-span-2">
                <Label>E-mail corporativo</Label>
                <Input
                  type="email"
                  value={form.email_corporativo ?? ""}
                  onChange={(e) =>
                    setForm({ ...form, email_corporativo: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>Idioma preferido</Label>
                <Select
                  value={form.idioma ?? "en"}
                  onValueChange={(v) => setForm({ ...form, idioma: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">Inglês</SelectItem>
                    <SelectItem value="zh">Mandarim</SelectItem>
                    <SelectItem value="pt">Português</SelectItem>
                    <SelectItem value="es">Espanhol</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>DDI</Label>
                <Input
                  value={form.telefone_ddi ?? ""}
                  onChange={(e) =>
                    setForm({ ...form, telefone_ddi: e.target.value })
                  }
                  placeholder="86"
                />
              </div>
              <div className="md:col-span-2">
                <Label>Telefone</Label>
                <Input
                  value={form.telefone_numero ?? ""}
                  onChange={(e) =>
                    setForm({ ...form, telefone_numero: e.target.value })
                  }
                />
              </div>
            </div>
          </section>

          <section className="rounded-[var(--radius-md)] border border-[var(--bg-border)] bg-[var(--bg-surface)] p-5">
            <h3 className="mb-3 text-[13px] font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
              Classificação
            </h3>
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) =>
                    setForm({ ...form, status: v as FornecedorInput["status"] })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FORNECEDOR_STATUS.map((s) => (
                      <SelectItem key={s} value={s}>
                        {FORNECEDOR_STATUS_LABEL[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Ranking</Label>
                <Select
                  value={form.ranking}
                  onValueChange={(v) =>
                    setForm({ ...form, ranking: v as FornecedorInput["ranking"] })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FORNECEDOR_RANKINGS.map((r) => (
                      <SelectItem key={r} value={r}>
                        Rank {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {enrichment && (
              <div className="mt-4 rounded-[var(--radius-md)] border border-blue-200 bg-blue-50/60 p-4">
                <div className="mb-2 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wide text-blue-700">
                  <Sparkles className="h-3.5 w-3.5" />
                  Enriquecimento web
                </div>
                {enrichment.resumo && (
                  <p className="text-[13px] leading-relaxed text-[var(--text-primary)]">
                    {enrichment.resumo}
                  </p>
                )}
                <div className="mt-3 grid gap-2 text-[12px] sm:grid-cols-2 md:grid-cols-3">
                  {enrichment.site_oficial && (
                    <div><span className="text-[var(--text-muted)]">Site:</span> <a className="text-blue-700 hover:underline" href={enrichment.site_oficial.startsWith("http") ? enrichment.site_oficial : `https://${enrichment.site_oficial}`} target="_blank" rel="noreferrer">{enrichment.site_oficial}</a></div>
                  )}
                  {enrichment.ano_fundacao && (
                    <div><span className="text-[var(--text-muted)]">Fundada em:</span> {enrichment.ano_fundacao}</div>
                  )}
                  {enrichment.porte && (
                    <div><span className="text-[var(--text-muted)]">Porte:</span> {enrichment.porte}</div>
                  )}
                  {enrichment.funcionarios && (
                    <div><span className="text-[var(--text-muted)]">Funcionários:</span> {enrichment.funcionarios}</div>
                  )}
                </div>
                {enrichment.certificacoes && enrichment.certificacoes.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {enrichment.certificacoes.map((c) => (
                      <Badge key={c} variant="secondary" className="bg-white">{c}</Badge>
                    ))}
                  </div>
                )}
                {enrichment.mercados_atendidos && enrichment.mercados_atendidos.length > 0 && (
                  <div className="mt-2 text-[12px]">
                    <span className="text-[var(--text-muted)]">Mercados:</span> {enrichment.mercados_atendidos.join(", ")}
                  </div>
                )}
                {enrichment.fontes && enrichment.fontes.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5 text-[11px]">
                    {enrichment.fontes.slice(0, 5).map((f, i) => (
                      <a key={i} href={f} target="_blank" rel="noreferrer" className="rounded border border-blue-200 bg-white px-2 py-0.5 text-blue-700 hover:bg-blue-100">
                        fonte {i + 1}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="mt-4">
              <Label>Categorias</Label>
              <div className="mt-2">
                <CategoriasPicker
                  categorias={categorias.data ?? []}
                  selected={form.categorias}
                  onToggle={toggleCategoria}
                />
              </div>
            </div>

            <div className="mt-4">
              <Label>Tags livres</Label>
              <div className="mt-1 flex gap-2">
                <Input
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addTag();
                    }
                  }}
                  placeholder="ex.: china, beverage, hot-fill"
                />
                <Button type="button" variant="outline" onClick={addTag}>
                  Adicionar
                </Button>
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {form.tags.map((t) => (
                  <Badge
                    key={t}
                    variant="secondary"
                    className="cursor-pointer"
                    onClick={() =>
                      setForm((p) => ({
                        ...p,
                        tags: p.tags.filter((x) => x !== t),
                      }))
                    }
                  >
                    {t} ×
                  </Badge>
                ))}
              </div>
            </div>
          </section>

          {/* ============ Identidade legal & fiscal ============ */}
          <section className="rounded-[var(--radius-md)] border border-[var(--bg-border)] bg-[var(--bg-surface)] p-5">
            <h3 className="mb-3 text-[13px] font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
              Identidade legal & fiscal
            </h3>
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <Label>
                  {paisAtual?.documento_nome ?? "Tax ID"}
                </Label>
                <div className="flex gap-2">
                  <Input
                    value={form.tax_id ?? ""}
                    onChange={(e) => setForm({ ...form, tax_id: e.target.value })}
                    placeholder={paisAtual?.documento_mascara ?? "USCC/EIN/CNPJ…"}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={buscarPorDocumento}
                    disabled={enriching || !(form.tax_id ?? "").trim()}
                  >
                    {enriching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Buscar"}
                  </Button>
                </div>
              </div>
              <div>
                <Label>Tipo do Tax ID</Label>
                <Select
                  value={form.tax_id_tipo ?? ""}
                  onValueChange={(v) => setForm({ ...form, tax_id_tipo: v || null })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent>
                    {TAX_ID_TIPOS.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Ano de fundação</Label>
                <Input
                  type="number"
                  min={1800}
                  max={2100}
                  value={form.incorporation_year ?? ""}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      incorporation_year: e.target.value === "" ? null : Number(e.target.value),
                    })
                  }
                />
              </div>
              {isCN(form.pais) && (
                <div className="md:col-span-3">
                  <Label>Razão social local (CJK / idioma original)</Label>
                  <Input
                    value={form.legal_name_local ?? ""}
                    onChange={(e) => setForm({ ...form, legal_name_local: e.target.value })}
                    placeholder="深圳市…有限公司"
                  />
                </div>
              )}
              {isBR(form.pais) && (
                <>
                  <div>
                    <Label>Inscrição estadual</Label>
                    <Input
                      value={form.inscricao_estadual ?? ""}
                      onChange={(e) => setForm({ ...form, inscricao_estadual: e.target.value })}
                      placeholder="ISENTO ou nº IE"
                    />
                  </div>
                  <div>
                    <Label>Inscrição municipal</Label>
                    <Input
                      value={form.inscricao_municipal ?? ""}
                      onChange={(e) => setForm({ ...form, inscricao_municipal: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Regime tributário</Label>
                    <Select
                      value={form.regime_tributario ?? ""}
                      onValueChange={(v) => setForm({ ...form, regime_tributario: v || null })}
                    >
                      <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                      <SelectContent>
                        {REGIMES_TRIBUTARIOS_BR.map((r) => (
                          <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Situação cadastral</Label>
                    <Input
                      value={form.situacao_cadastral ?? ""}
                      onChange={(e) => setForm({ ...form, situacao_cadastral: e.target.value })}
                      placeholder="ATIVA / SUSPENSA / BAIXADA"
                    />
                  </div>
                  <div>
                    <Label>Data de abertura</Label>
                    <Input
                      type="date"
                      value={form.data_abertura ?? ""}
                      onChange={(e) => setForm({ ...form, data_abertura: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Capital social (R$)</Label>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={form.capital_social ?? ""}
                      onChange={(e) =>
                        setForm({ ...form, capital_social: e.target.value === "" ? null : Number(e.target.value) })
                      }
                    />
                  </div>
                  <div className="md:col-span-3">
                    <Label>Natureza jurídica</Label>
                    <Input
                      value={form.natureza_juridica ?? ""}
                      onChange={(e) => setForm({ ...form, natureza_juridica: e.target.value })}
                    />
                  </div>
                  <div className="md:col-span-3">
                    <Label>CNAE principal</Label>
                    <Input
                      value={form.cnae_principal ?? ""}
                      onChange={(e) => setForm({ ...form, cnae_principal: e.target.value })}
                      placeholder="00.00-0/00 — Descrição"
                    />
                  </div>
                  <div className="md:col-span-3">
                    <Label>CNAEs secundários (separados por vírgula)</Label>
                    <Input
                      value={form.cnaes_secundarios.join(", ")}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          cnaes_secundarios: e.target.value
                            .split(",")
                            .map((s) => s.trim())
                            .filter(Boolean),
                        })
                      }
                    />
                  </div>
                </>
              )}
            </div>
          </section>

          {/* ============ Comercial ============ */}
          <section className="rounded-[var(--radius-md)] border border-[var(--bg-border)] bg-[var(--bg-surface)] p-5">
            <h3 className="mb-3 text-[13px] font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
              Comercial
            </h3>
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <Label>Moeda padrão</Label>
                <Select
                  value={form.moeda_padrao ?? ""}
                  onValueChange={(v) => setForm({ ...form, moeda_padrao: v || null })}
                >
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    {MOEDAS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Incoterm padrão</Label>
                <Select
                  value={form.incoterm_padrao ?? ""}
                  onValueChange={(v) => setForm({ ...form, incoterm_padrao: v || null })}
                >
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    {INCOTERMS.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {isCN(form.pais) && (
                <div>
                  <Label>Porto de origem</Label>
                  <Input
                    value={form.porto_origem ?? ""}
                    onChange={(e) => setForm({ ...form, porto_origem: e.target.value })}
                    placeholder="Shanghai, Ningbo…"
                  />
                </div>
              )}
              <div>
                <Label>Lead time (dias)</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.lead_time_dias ?? ""}
                  onChange={(e) =>
                    setForm({ ...form, lead_time_dias: e.target.value === "" ? null : Number(e.target.value) })
                  }
                />
              </div>
              <div>
                <Label>MOQ</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.moq ?? ""}
                  onChange={(e) =>
                    setForm({ ...form, moq: e.target.value === "" ? null : Number(e.target.value) })
                  }
                />
              </div>
              <div>
                <Label>Cond. pagamento (dias)</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.condicao_pagamento_dias ?? ""}
                  onChange={(e) =>
                    setForm({ ...form, condicao_pagamento_dias: e.target.value === "" ? null : Number(e.target.value) })
                  }
                />
              </div>
              <div className="md:col-span-3">
                <Label>Termos de pagamento (texto)</Label>
                <Input
                  value={form.payment_terms ?? ""}
                  onChange={(e) => setForm({ ...form, payment_terms: e.target.value })}
                  placeholder="30% T/T antecipado, 70% contra B/L"
                />
              </div>
            </div>
          </section>

          {/* ============ Capacidade & qualidade ============ */}
          <section className="rounded-[var(--radius-md)] border border-[var(--bg-border)] bg-[var(--bg-surface)] p-5">
            <h3 className="mb-3 text-[13px] font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
              Capacidade & qualidade
            </h3>
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <Label>Funcionários (faixa)</Label>
                <Input
                  value={form.funcionarios_faixa ?? ""}
                  onChange={(e) => setForm({ ...form, funcionarios_faixa: e.target.value })}
                  placeholder="50-100"
                />
              </div>
              <div>
                <Label>Área da fábrica (m²)</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.fabrica_area_m2 ?? ""}
                  onChange={(e) =>
                    setForm({ ...form, fabrica_area_m2: e.target.value === "" ? null : Number(e.target.value) })
                  }
                />
              </div>
              <div>
                <Label>Capacidade mensal</Label>
                <Input
                  value={form.capacidade_mensal ?? ""}
                  onChange={(e) => setForm({ ...form, capacidade_mensal: e.target.value })}
                  placeholder="500 unidades/mês"
                />
              </div>
              <div>
                <Label>Auditado em</Label>
                <Input
                  type="date"
                  value={form.auditado_em ?? ""}
                  onChange={(e) => setForm({ ...form, auditado_em: e.target.value || null })}
                />
              </div>
              <div className="md:col-span-2">
                <Label>Auditor</Label>
                <Input
                  value={form.auditor ?? ""}
                  onChange={(e) => setForm({ ...form, auditor: e.target.value })}
                  placeholder="SGS, TÜV, interno…"
                />
              </div>
              <div>
                <Label>Score qualidade (0-100)</Label>
                <Input
                  type="number" min={0} max={100} step="0.1"
                  value={form.score_qualidade ?? ""}
                  onChange={(e) =>
                    setForm({ ...form, score_qualidade: e.target.value === "" ? null : Number(e.target.value) })
                  }
                />
              </div>
              <div>
                <Label>Score entrega (0-100)</Label>
                <Input
                  type="number" min={0} max={100} step="0.1"
                  value={form.score_entrega ?? ""}
                  onChange={(e) =>
                    setForm({ ...form, score_entrega: e.target.value === "" ? null : Number(e.target.value) })
                  }
                />
              </div>
              <div>
                <Label>Score preço (0-100)</Label>
                <Input
                  type="number" min={0} max={100} step="0.1"
                  value={form.score_preco ?? ""}
                  onChange={(e) =>
                    setForm({ ...form, score_preco: e.target.value === "" ? null : Number(e.target.value) })
                  }
                />
              </div>
            </div>

            <div className="mt-4">
              <Label>Certificações</Label>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {CERTIFICACOES_SUGERIDAS.map((c) => {
                  const active = form.certificacoes.includes(c);
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => toggleCert(c)}
                      className={`rounded-full border px-2.5 py-1 text-[11.5px] font-medium transition ${
                        active
                          ? "border-emerald-600 bg-emerald-600 text-white shadow-sm hover:bg-emerald-700"
                          : "border-[var(--bg-border)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]"
                      }`}
                    >
                      {c}
                    </button>
                  );
                })}
              </div>
              <div className="mt-2 flex gap-2">
                <Input
                  value={certInput}
                  onChange={(e) => setCertInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustomCert(); } }}
                  placeholder="Certificação personalizada"
                />
                <Button type="button" variant="outline" onClick={addCustomCert}>Adicionar</Button>
              </div>
              {form.certificacoes.filter((c) => !CERTIFICACOES_SUGERIDAS.includes(c as never)).length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {form.certificacoes
                    .filter((c) => !CERTIFICACOES_SUGERIDAS.includes(c as never))
                    .map((c) => (
                      <Badge
                        key={c}
                        variant="secondary"
                        className="cursor-pointer"
                        onClick={() => toggleCert(c)}
                      >
                        {c} ×
                      </Badge>
                    ))}
                </div>
              )}
            </div>
          </section>

          {/* ============ Canais & links ============ */}
          <section className="rounded-[var(--radius-md)] border border-[var(--bg-border)] bg-[var(--bg-surface)] p-5">
            <h3 className="mb-3 text-[13px] font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
              Canais & links
            </h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>WhatsApp corporativo</Label>
                <Input
                  value={form.whatsapp_corp ?? ""}
                  onChange={(e) => setForm({ ...form, whatsapp_corp: e.target.value })}
                />
              </div>
              {isCN(form.pais) && (
                <div>
                  <Label>WeChat corporativo</Label>
                  <Input
                    value={form.wechat_corp ?? ""}
                    onChange={(e) => setForm({ ...form, wechat_corp: e.target.value })}
                  />
                </div>
              )}
              <div>
                <Label>LinkedIn</Label>
                <Input
                  value={form.linkedin_url ?? ""}
                  onChange={(e) => setForm({ ...form, linkedin_url: e.target.value })}
                  placeholder="https://linkedin.com/company/…"
                />
              </div>
              {isCN(form.pais) && (
                <>
                  <div>
                    <Label>Alibaba</Label>
                    <Input
                      value={form.alibaba_url ?? ""}
                      onChange={(e) => setForm({ ...form, alibaba_url: e.target.value })}
                      placeholder="https://…alibaba.com"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label>Made-in-China</Label>
                    <Input
                      value={form.made_in_china_url ?? ""}
                      onChange={(e) => setForm({ ...form, made_in_china_url: e.target.value })}
                      placeholder="https://…made-in-china.com"
                    />
                  </div>
                </>
              )}
            </div>
          </section>

          {/* ============ Logística & operacional ============ */}
          <section className="rounded-[var(--radius-md)] border border-[var(--bg-border)] bg-[var(--bg-surface)] p-5">
            <h3 className="mb-3 text-[13px] font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
              Logística & operacional
            </h3>
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <Label>CEP / Postal</Label>
                <Input
                  value={form.endereco_cep ?? ""}
                  onChange={(e) => setForm({ ...form, endereco_cep: e.target.value })}
                />
              </div>
              <div>
                <Label>Estado / Província</Label>
                <Input
                  value={form.endereco_estado_provincia ?? ""}
                  onChange={(e) => setForm({ ...form, endereco_estado_provincia: e.target.value })}
                />
              </div>
              <div>
                <Label>Fuso horário</Label>
                <Input
                  value={form.fuso_horario ?? ""}
                  onChange={(e) => setForm({ ...form, fuso_horario: e.target.value })}
                  placeholder="Asia/Shanghai"
                />
              </div>
              <div>
                <Label>Próxima revisão</Label>
                <Input
                  type="date"
                  value={form.proxima_revisao_em ?? ""}
                  onChange={(e) => setForm({ ...form, proxima_revisao_em: e.target.value || null })}
                />
              </div>
              <div className="md:col-span-2">
                <Label>Motivo do bloqueio (se aplicável)</Label>
                <Input
                  value={form.motivo_bloqueio ?? ""}
                  onChange={(e) => setForm({ ...form, motivo_bloqueio: e.target.value })}
                />
              </div>
            </div>
          </section>

          {/* ============ Palavras-chave (busca) ============ */}
          <section className="rounded-[var(--radius-md)] border border-[var(--bg-border)] bg-[var(--bg-surface)] p-5">
            <Label>Palavras-chave de busca</Label>
            <p className="mt-1 text-[11.5px] text-[var(--text-muted)]">
              Alimentam a busca full-text — separe por Enter.
            </p>
            <div className="mt-2 flex gap-2">
              <Input
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addKeyword(); } }}
                placeholder="ex.: enchimento rotativo, servomotor"
              />
              <Button type="button" variant="outline" onClick={addKeyword}>Adicionar</Button>
            </div>
            <div className="mt-2 flex flex-wrap gap-1">
              {form.palavras_chave.map((k) => (
                <Badge
                  key={k}
                  variant="secondary"
                  className="cursor-pointer"
                  onClick={() =>
                    setForm((p) => ({ ...p, palavras_chave: p.palavras_chave.filter((x) => x !== k) }))
                  }
                >
                  {k} ×
                </Badge>
              ))}
            </div>
          </section>

          <section className="rounded-[var(--radius-md)] border border-[var(--bg-border)] bg-[var(--bg-surface)] p-5">
            <Label>Observações</Label>
            <Textarea
              rows={4}
              value={form.observacoes ?? ""}
              onChange={(e) =>
                setForm({ ...form, observacoes: e.target.value })
              }
              placeholder="Anotações sobre escopo, condições comerciais, MOQ, etc."
            />
          </section>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => navigate({ to: "/fornecedores" })}
            >
              Cancelar
            </Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending}>
              {save.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}
              Salvar fornecedor
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}

type PhaseStatusUI = "idle" | "running" | "done" | "skipped" | "error";

function ScanProgress({
  phases,
}: {
  phases: { ocr: PhaseStatusUI; translation: PhaseStatusUI; enrichment: PhaseStatusUI; drive: PhaseStatusUI };
}) {
  const steps: Array<{ key: keyof typeof phases; label: string; hint: string }> = [
    { key: "ocr", label: "OCR (Llama 4 Vision)", hint: "Extraindo dados das imagens" },
    { key: "translation", label: "Tradução", hint: "CJK → Português, se necessário" },
    { key: "enrichment", label: "Enriquecimento web", hint: "Firecrawl + Llama 3.3" },
    { key: "drive", label: "Upload Google Drive", hint: "Salva na pasta do fornecedor" },
  ];
  return (
    <div className="mt-4 rounded-[var(--radius-md)] border border-[var(--bg-border)] bg-[var(--bg-surface)] p-4">
      <div className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
        Pipeline do cadastro
      </div>
      <ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((s) => {
          const st = phases[s.key];
          const Icon =
            st === "done"
              ? CheckCircle2
              : st === "error"
                ? AlertCircle
                : st === "running"
                  ? Loader2
                  : Circle;
          const color =
            st === "done"
              ? "text-emerald-600"
              : st === "error"
                ? "text-rose-600"
                : st === "running"
                  ? "text-blue-600"
                  : st === "skipped"
                    ? "text-[var(--text-muted)]"
                    : "text-[var(--text-muted)]";
          return (
            <li
              key={s.key}
              className="flex items-start gap-2 rounded border border-[var(--bg-border)] bg-[var(--bg-base)] px-3 py-2"
            >
              <Icon className={`mt-0.5 h-4 w-4 ${color} ${st === "running" ? "animate-spin" : ""}`} />
              <div className="min-w-0">
                <div className="text-[12.5px] font-medium text-[var(--text-primary)]">{s.label}</div>
                <div className="text-[11px] text-[var(--text-muted)]">
                  {st === "skipped" ? "não necessário" : st === "idle" ? "aguardando" : s.hint}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

// ============================================================
// Review AI Panel — confirmação dos campos preenchidos pelo Groq
// ============================================================
const AI_FIELD_LABELS: Record<string, string> = {
  nome: "Razão social",
  nome_fantasia: "Nome fantasia",
  pais: "País",
  cidade: "Cidade",
  endereco: "Endereço",
  site: "Site",
  email_corporativo: "E-mail",
  telefone_ddi: "Telefone DDI",
  telefone_numero: "Telefone",
  idioma: "Idioma",
  observacoes: "Observações",
  tax_id: "Tax ID",
  tax_id_tipo: "Tipo de Tax ID",
  legal_name_local: "Razão social (local)",
  moeda_padrao: "Moeda padrão",
  incoterm_padrao: "Incoterm padrão",
  porto_origem: "Porto de origem",
  lead_time_dias: "Lead time (dias)",
  moq: "MOQ",
  payment_terms: "Condições de pagamento",
  funcionarios_faixa: "Faixa de funcionários",
  fabrica_area_m2: "Área da fábrica (m²)",
  capacidade_mensal: "Capacidade mensal",
  whatsapp_corp: "WhatsApp",
  wechat_corp: "WeChat",
  linkedin_url: "LinkedIn",
  alibaba_url: "Alibaba",
  made_in_china_url: "Made-in-China",
  endereco_estado_provincia: "Estado/Província",
  fuso_horario: "Fuso horário",
  tags: "Tags",
  categorias: "Categorias",
  certificacoes: "Certificações",
  palavras_chave: "Palavras-chave",
};

function formatAIValue(v: unknown): string {
  if (v == null) return "—";
  if (Array.isArray(v)) return v.join(", ");
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

function ReviewAIPanel({
  aiFields,
  open,
  setOpen,
  onAccept,
}: {
  aiFields: Record<string, unknown>;
  open: boolean;
  setOpen: (v: boolean) => void;
  onAccept: (accepted: Record<string, boolean>) => void;
}) {
  const keys = Object.keys(aiFields);
  const [accepted, setAccepted] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(keys.map((k) => [k, true])),
  );
  // Sync when aiFields keys change
  useEffect(() => {
    setAccepted((prev) => {
      const next: Record<string, boolean> = {};
      for (const k of keys) next[k] = prev[k] ?? true;
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keys.join("|")]);

  const totalAccepted = keys.filter((k) => accepted[k]).length;

  return (
    <section className="rounded-[var(--radius-md)] border border-violet-200 bg-violet-50/60">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-violet-700" />
          <span className="text-[13px] font-semibold text-violet-900">
            Revisão de campos preenchidos pela IA
          </span>
          <Badge className="bg-violet-200 text-violet-900 hover:bg-violet-200">
            {totalAccepted}/{keys.length}
          </Badge>
        </div>
        <span className="text-[11.5px] text-violet-700">
          {open ? "Recolher" : "Expandir"}
        </span>
      </button>
      {open && (
        <div className="border-t border-violet-200 p-4">
          <p className="mb-3 text-[12px] text-violet-900/80">
            Marque apenas os campos que deseja manter. Desmarcados serão limpos antes de salvar.
          </p>
          <div className="grid gap-2 md:grid-cols-2">
            {keys.map((k) => (
              <label
                key={k}
                className="flex items-start gap-2 rounded-md border border-violet-200 bg-white/70 p-2"
              >
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={!!accepted[k]}
                  onChange={(e) =>
                    setAccepted((prev) => ({ ...prev, [k]: e.target.checked }))
                  }
                />
                <div className="min-w-0">
                  <div className="text-[12px] font-medium text-[var(--text-primary)]">
                    {AI_FIELD_LABELS[k] ?? k}
                  </div>
                  <div className="truncate text-[11.5px] text-[var(--text-secondary)]" title={formatAIValue(aiFields[k])}>
                    {formatAIValue(aiFields[k])}
                  </div>
                </div>
              </label>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setAccepted(Object.fromEntries(keys.map((k) => [k, true])))
              }
            >
              Marcar todos
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setAccepted(Object.fromEntries(keys.map((k) => [k, false])))
              }
            >
              Desmarcar todos
            </Button>
            <Button type="button" size="sm" onClick={() => onAccept(accepted)}>
              <CheckCircle2 className="h-3.5 w-3.5" /> Confirmar campos
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}

