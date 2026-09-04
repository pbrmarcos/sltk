import { MOEDAS, moedaLabel, toMoedaISO } from "@/lib/moedas";
import { useEffect, useRef, useState } from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Plus, Trash2, Save, X, Loader2, ChevronDown, Search, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ComboboxAdd } from "@/components/ui/combobox-add";
import { paisesQueryOptions } from "@/lib/clientes.queries";
import { segmentosQueryOptions, leadOrigensQueryOptions } from "@/lib/cadastros.queries";
import { createSegmento } from "@/lib/segmentos.functions";
import { createLeadOrigem } from "@/lib/lead-origens.functions";
import { enrichDocumento } from "@/lib/enrich.functions";
import { listProvedoresAtivosPorPais } from "@/lib/integracoes.functions";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { StatusBadge } from "@/components/ui/status-badge";
import { useClienteStatusLabel } from "@/components/clientes/ClienteStatusBadge";
import { Flag } from "@/components/ui/flag";
import {
  clienteInputSchema,
  type ClienteInput,
  formatDocumento,
  normalizeDocumento,
  CLIENTE_IDIOMAS,
  CLIENTE_STATUS,
  REGIMES_TRIBUTARIOS,
  MATRIZ_FILIAL,
} from "@/lib/clientes.shared";
import { createCliente } from "@/lib/clientes.functions";
import { cn } from "@/lib/utils";
import { focusFirstError } from "@/lib/form-errors";
import { validarDocumentoFiscal } from "@/lib/documentos-fiscais";


/**
 * Validação de documento por país — delega ao módulo central
 * `src/lib/documentos-fiscais.ts`, o mesmo usado no backend.
 * Nunca bloqueia países sem validador implementado.
 */
function validateDocumentoPais(
  pais: string,
  raw: string,
): { ok: boolean; reason?: string; canSearch: boolean } {
  const r = validarDocumentoFiscal(pais, raw ?? "");
  return { ok: r.ok, canSearch: r.ok, reason: r.ok ? undefined : r.mensagem };
}


const DEFAULTS: ClienteInput = {
  razao_social: "",
  nome_fantasia: "",
  apelido: "",
  pais: "BR",
  documento_fiscal_numero: "",
  inscricao_estadual: "",
  moeda: "BRL",
  idioma: "pt",
  status: "suspect",
  segmento_id: null,
  lead_origem_id: null,
  key_account: false,
  observacoes: "",
  site: "",
  email_corporativo: "",
  telefone_corporativo_ddi: "+55",
  telefone_corporativo_numero: "",
  ramal: "",
  matriz_filial: null,
  endereco_logradouro: "",
  endereco_numero: "",
  endereco_complemento: "",
  endereco_bairro: "",
  endereco_cidade: "",
  endereco_estado: "",
  endereco_codigo_postal: "",
  latitude: null,
  longitude: null,
  regime_tributario: null,
  cnae_principal: "",
  cnaes_secundarios: [],
  natureza_juridica_codigo: "",
  natureza_juridica_descricao: "",
  situacao_cadastral: "",
  data_situacao: "",
  motivo_situacao: "",
  data_abertura: "",
  capital_social: null,
  porte: "",
  social_linkedin: "",
  social_instagram: "",
  social_facebook: "",
  social_twitter: "",
  social_whatsapp: "",
  social_skype: "",
  socios: [],
  contatos: [{ nome: "", cargo: "", email: "", telefone_ddi: "+55", telefone_numero: "", principal: true }],
};

export type ClienteFormProps = {
  /** `page` = tela cheia (/clientes/novo). `modal` = versão mínima dentro de um diálogo. */
  variant?: "page" | "modal";
  initialValues?: Partial<ClienteInput>;
  /** Quando informado, o formulário não navega após salvar — devolve o cliente criado. */
  onCreated?: (cliente: { id: string; codigo: string }, values: ClienteInput) => void;
  onCancel?: () => void;
};

export function ClienteForm({ variant = "page", initialValues, onCreated, onCancel }: ClienteFormProps = {}) {
  const isModal = variant === "modal";
  const statusLabel = useClienteStatusLabel();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const paises = useQuery(paisesQueryOptions());
  const segmentos = useQuery(segmentosQueryOptions());
  const origens = useQuery(leadOrigensQueryOptions());
  const provedores = useQuery({
    queryKey: ["integracoes", "ativos-por-pais"],
    queryFn: () => listProvedoresAtivosPorPais(),
    staleTime: 60_000,
  });
  const create = useServerFn(createCliente);
  const enrich = useServerFn(enrichDocumento);
  const createSegmentoFn = useServerFn(createSegmento);
  const createOrigemFn = useServerFn(createLeadOrigem);
  const [closeAfter, setCloseAfter] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const [enrichLoading, setEnrichLoading] = useState(false);
  const [enrichStatus, setEnrichStatus] = useState<
    { kind: "idle" } | { kind: "ok"; message: string } | { kind: "err"; message: string }
  >({ kind: "idle" });
  const autoTriedDocRef = useRef<string>("");
  // Identificador da consulta de enriquecimento em andamento. Cada nova
  // chamada incrementa o contador e respostas com id desatualizado são
  // descartadas — evita que uma resposta antiga sobrescreva o formulário
  // ou trave o estado de loading quando o usuário consulta outro documento.
  const enrichReqIdRef = useRef(0);

  const form = useForm<ClienteInput>({
    resolver: zodResolver(clienteInputSchema) as never,
    defaultValues: { ...DEFAULTS, ...initialValues },
    mode: "onBlur",
    reValidateMode: "onChange",

  });

  const contatos = useFieldArray({ control: form.control, name: "contatos" });
  const socios = useFieldArray({ control: form.control, name: "socios" });

  const paisCodigo = form.watch("pais");
  const documento = form.watch("documento_fiscal_numero");
  const paisCfg = paises.data?.find((p) => p.codigo === paisCodigo);

  function onPaisChange(codigo: string) {
    form.setValue("pais", codigo);
    const p = paises.data?.find((x) => x.codigo === codigo);
    if (p) {
      form.setValue("moeda", p.moeda_padrao);
      const idioma = (CLIENTE_IDIOMAS as readonly string[]).includes(p.idioma_padrao)
        ? (p.idioma_padrao as ClienteInput["idioma"])
        : "pt";
      form.setValue("idioma", idioma);
    }
  }

  async function lookupCep(cep: string) {
    const digits = cep.replace(/\D/g, "");
    if (paisCodigo !== "BR" || digits.length !== 8) return;
    setCepLoading(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      if (!res.ok) return;
      const j = await res.json();
      if (j.erro) return;
      form.setValue("endereco_logradouro", j.logradouro ?? "");
      form.setValue("endereco_bairro", j.bairro ?? "");
      form.setValue("endereco_cidade", j.localidade ?? "");
      form.setValue("endereco_estado", j.uf ?? "");
    } catch {
      // silencioso
    } finally {
      setCepLoading(false);
    }
  }

  async function handleEnrich() {
    if (!paisCodigo) {
      toast.error("Selecione o país primeiro.");
      return;
    }
    const valid = validateDocumentoPais(paisCodigo, documento || "");
    if (!valid.ok) {
      toast.error(valid.reason ?? "Documento inválido.");
      setEnrichStatus({ kind: "err", message: valid.reason ?? "Documento inválido." });
      return;
    }
    const doc = normalizeDocumento(documento || "");
    // Nova consulta cancela a anterior: incrementa o id e ignora respostas
    // que cheguem depois com id antigo.
    const myId = ++enrichReqIdRef.current;
    setEnrichLoading(true);
    setEnrichStatus({ kind: "idle" });
    // Não limpa nada antes da consulta: se a consulta falhar (documento
    // inválido, provedor fora do ar), os dados já digitados permanecem.
    // Em caso de sucesso, cada campo é sobrescrito abaixo.

    try {
      const resp = await enrich({ data: { pais: paisCodigo, documento: doc } });
      if (enrichReqIdRef.current !== myId) return; // resposta obsoleta
      if (!resp || !resp.ok) {
        const msg = (resp && "error" in resp && resp.error) || "Não foi possível consultar — preencha manualmente.";
        toast.error(msg);
        setEnrichStatus({ kind: "err", message: msg });
        return;
      }
      const r = resp.data;
      // Sobrescreve sempre — cada consulta substitui o conteúdo anterior.
      // Se o provedor não retornar o campo, limpa para não manter dado da consulta anterior.
      const setAlways = (key: keyof ClienteInput, val: unknown) => {
        const empty =
          val === undefined || val === null || (typeof val === "string" && val.trim() === "");
        // Preserva o tipo do valor atual do formulário ao limpar:
        // string -> "", número/array/etc -> null.
        const cur = form.getValues(key);
        const emptyValue = typeof cur === "string" ? "" : null;
        const next = empty ? emptyValue : val;
        form.setValue(key, next as never, { shouldDirty: true, shouldValidate: false });
      };
      setAlways("razao_social", r.razao_social);
      setAlways("nome_fantasia", r.nome_fantasia);
      setAlways("email_corporativo", r.email_corporativo);
      setAlways("telefone_corporativo_ddi", r.telefone_corporativo_ddi);
      setAlways("telefone_corporativo_numero", r.telefone_corporativo_numero);
      setAlways("data_abertura", r.data_abertura);
      setAlways("situacao_cadastral", r.situacao_cadastral);
      setAlways("data_situacao", r.data_situacao);
      setAlways("motivo_situacao", r.motivo_situacao);
      setAlways("capital_social", r.capital_social);
      setAlways("porte", r.porte);
      setAlways("cnae_principal", r.cnae_principal);
      setAlways(
        "cnaes_secundarios",
        r.cnaes_secundarios && r.cnaes_secundarios.length > 0 ? r.cnaes_secundarios : null,
      );
      setAlways("natureza_juridica_codigo", r.natureza_juridica_codigo);
      setAlways("natureza_juridica_descricao", r.natureza_juridica_descricao);
      setAlways("endereco_logradouro", r.endereco_logradouro);
      setAlways("endereco_numero", r.endereco_numero);
      setAlways("endereco_complemento", r.endereco_complemento);
      setAlways("endereco_bairro", r.endereco_bairro);
      setAlways("endereco_cidade", r.endereco_cidade);
      setAlways("endereco_estado", r.endereco_estado);
      setAlways("endereco_codigo_postal", r.endereco_codigo_postal);
      // Sócios: substitui a lista a cada consulta em uma única atualização.
      socios.replace(
        r.socios && r.socios.length > 0
          ? r.socios.map((s) => ({ nome: s.nome, qualificacao: s.qualificacao ?? "", desde: s.desde ?? "" }))
          : [],
      );
      const okMsg = `Dados preenchidos automaticamente (fonte: ${r._source}${resp.cached ? " · cache" : ""}).`;
      toast.success(okMsg);
      setEnrichStatus({ kind: "ok", message: okMsg });
    } catch (e: unknown) {
      if (enrichReqIdRef.current !== myId) return;
      const msg = e instanceof Error ? e.message : "Falha ao consultar.";
      toast.error(msg);
      setEnrichStatus({ kind: "err", message: msg });
    } finally {
      if (enrichReqIdRef.current === myId) setEnrichLoading(false);
    }
  }

  // Auto-busca para Paraguai (RUC): dispara quando documento normalizado tem 7-9 dígitos
  // válido. Evita loop guardando o último doc tentado: ao digitar um novo
  // documento, dispara nova busca mesmo se já houver dados preenchidos.
  useEffect(() => {
    if (!paisCodigo) return;
    const info = provedores.data?.[paisCodigo];
    if (!info?.hasActive) return;
    const valid = validateDocumentoPais(paisCodigo, documento || "");
    if (!valid.canSearch) return;
    const doc = normalizeDocumento(documento || "");
    if (autoTriedDocRef.current === doc) return;
    // Debounce: aguarda o usuário parar de digitar (700ms) antes de consultar.
    const t = setTimeout(() => {
      autoTriedDocRef.current = doc;
      void handleEnrich();
    }, 700);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paisCodigo, documento, provedores.data]);

  const mutation = useMutation({
    mutationFn: (input: ClienteInput) => create({ data: input }),
    onSuccess: (res, vars) => {
      toast.success(`Cliente ${res.codigo} criado.`);
      if (onCreated) {
        // Fluxo em modal: quem chamou decide o que fazer (atualizar cache,
        // selecionar o cliente). Nada de navegação/refetch que remonte a tela.
        onCreated({ id: res.id, codigo: res.codigo }, vars);
        return;
      }
      qc.invalidateQueries({ queryKey: ["clientes"] });
      if (closeAfter) navigate({ to: "/clientes" });
      else navigate({ to: "/clientes/$codigo", params: { codigo: res.codigo } });
    },
    onError: (err: unknown) => {
      const e = err as { message?: string; field?: string };
      const msg = e.message ?? "Falha ao salvar cliente.";
      toast.error(msg);
      // Nunca limpa valores: apenas ancora a mensagem no campo correspondente.
      if (e.field) {
        form.setError(e.field as keyof ClienteInput, { message: msg }, { shouldFocus: true });
        focusFirstError(form.formState.errors as Record<string, unknown>);
      }

    },
  });

  function onSubmit(values: ClienteInput) {
    values.documento_fiscal_numero = normalizeDocumento(values.documento_fiscal_numero);
    mutation.mutate(values);
  }

  const docError = form.formState.errors.documento_fiscal_numero?.message;
  const showFiscalBR = paisCodigo === "BR";

  const provInfo = provedores.data?.[paisCodigo];
  const provHasActive = Boolean(provInfo?.hasActive);
  const provHasAvailable = Boolean(provInfo?.hasAvailable);
  const docValidation = validateDocumentoPais(paisCodigo, documento || "");
  const canSearch = provHasActive && docValidation.canSearch && !enrichLoading;
  const provStatus: { tone: "success" | "warning" | "neutral"; label: string } = provHasActive
    ? { tone: "success", label: "Provedor ativo" }
    : provHasAvailable
      ? { tone: "warning", label: "Provedor desativado" }
      : { tone: "neutral", label: "Sem provedor" };

  return (
    <form onSubmit={form.handleSubmit(onSubmit, (errs) => { toast.error("Verifique os campos destacados — nenhum dado foi perdido."); focusFirstError(errs as Record<string, unknown>); })} className="space-y-6">
      {isModal ? (
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => onCancel?.()} disabled={mutation.isPending}>
            <X className="mr-1.5 h-4 w-4" /> Cancelar
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />}
            Salvar cliente
          </Button>
        </div>
      ) : (
        <div className="sticky top-0 z-10 flex flex-wrap items-center justify-end gap-2 -mx-4 md:-mx-6 border-b border-[var(--bg-border)] bg-[var(--bg-surface)] px-4 md:px-6 py-3">
          <Button type="submit" disabled={mutation.isPending} onClick={() => setCloseAfter(false)}>
            {mutation.isPending && !closeAfter ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />}
            Salvar
          </Button>
          <Button type="submit" variant="secondary" disabled={mutation.isPending} onClick={() => setCloseAfter(true)}>
            {mutation.isPending && closeAfter ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />}
            Salvar e fechar
          </Button>
          <Button type="button" variant="outline" onClick={() => navigate({ to: "/clientes" })} disabled={mutation.isPending}>
            <X className="mr-1.5 h-4 w-4" /> Cancelar
          </Button>
        </div>
      )}

      {/* Identificação */}
      <Section title="Identificação">
        <Grid>
          <Field label="País" error={form.formState.errors.pais?.message}>
            <Select value={paisCodigo} onValueChange={onPaisChange}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione…">
                  {paisCfg && (
                    <span className="inline-flex items-center gap-2">
                      <Flag code={paisCfg.codigo} size={18} />
                      <span>{paisCfg.nome}</span>
                    </span>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {(paises.data ?? []).map((p) => (
                  <SelectItem key={p.codigo} value={p.codigo}>
                    <span className="inline-flex items-center gap-2">
                      <Flag code={p.codigo} size={18} />
                      <span>{p.nome}</span>
                      <span className="text-[11px] text-muted-foreground">({p.codigo})</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field
            label={`${paisCfg?.documento_nome ?? "Documento"} *`}
            error={docError}
            help={paisCfg?.documento_mascara && paisCfg.documento_mascara !== "livre" ? `Formato: ${paisCfg.documento_mascara}` : undefined}
          >
            <div className="flex gap-2">
              <Controller
                control={form.control}
                name="documento_fiscal_numero"
                render={({ field }) => (
                  <Input
                    value={paisCfg ? formatDocumento(field.value, paisCfg.documento_mascara) : field.value}
                    onChange={(e) => field.onChange(normalizeDocumento(e.target.value))}
                    onBlur={field.onBlur}
                    placeholder={paisCfg?.documento_mascara && paisCfg.documento_mascara !== "livre" ? paisCfg.documento_mascara : ""}
                    className="flex-1"
                  />
                )}
              />
              {(() => {
                const tip = provHasActive
                  ? enrichLoading
                    ? "Consulta em andamento…"
                    : !docValidation.canSearch
                      ? docValidation.reason ?? "Documento inválido."
                      : `Buscar dados em ${paisCfg?.documento_nome ?? "documento"}`
                  : provHasAvailable
                    ? "Provedor não ativado. Habilite em Configurações > Integrações."
                    : `Autocompletar não disponível para ${paisCfg?.nome ?? paisCodigo}.`;
                return (
                  <TooltipProvider delayDuration={150}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleEnrich}
                          disabled={!canSearch}
                            aria-label="Buscar dados do documento"
                          >
                            {enrichLoading ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-label="Consulta em andamento" />
                            ) : (
                              <Search className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>{tip}</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                );
              })()}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <StatusBadge tone={provStatus.tone}>{provStatus.label}</StatusBadge>
              {enrichLoading && (
                <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" /> Consultando provedor…
                </span>
              )}
              {!enrichLoading && provHasActive && documento && !docValidation.canSearch && (
                <span className="inline-flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400">
                  <AlertCircle className="h-3 w-3" /> {docValidation.reason}
                </span>
              )}
              {!enrichLoading && enrichStatus.kind === "ok" && (
                <span className="inline-flex items-center gap-1 text-[11px] text-[var(--success,#15803d)]">
                  <CheckCircle2 className="h-3 w-3" /> {enrichStatus.message}
                </span>
              )}
              {!enrichLoading && enrichStatus.kind === "err" && (
                <span className="inline-flex items-center gap-1 text-[11px] text-destructive">
                  <AlertCircle className="h-3 w-3" /> {enrichStatus.message}
                </span>
              )}
              {!enrichLoading && enrichStatus.kind === "idle" && !provHasActive && (
                <span className="text-[11px] text-muted-foreground">
                  {provHasAvailable
                    ? "Ative o provedor em Configurações > Integrações para usar a busca automática."
                    : `Autocompletar não disponível para ${paisCfg?.nome ?? paisCodigo}. Preencha manualmente.`}
                </span>
              )}
            </div>
          </Field>
          <Field label="Razão social *" error={form.formState.errors.razao_social?.message}>
            <Input {...form.register("razao_social")} />
          </Field>
          <Field label="Nome fantasia">
            <Input {...form.register("nome_fantasia")} />
          </Field>
          {!isModal && (
            <>
          <Field label="Apelido">
            <Input {...form.register("apelido")} />
          </Field>
          <Field label="Inscrição estadual">
            <Input {...form.register("inscricao_estadual")} />
          </Field>
          <Field label="Segmento">
            <Controller
              control={form.control}
              name="segmento_id"
              render={({ field }) => (
                <ComboboxAdd
                  options={segmentos.data ?? []}
                  value={field.value ?? null}
                  onChange={field.onChange}
                  placeholder="Selecione um segmento…"
                  onCreate={async (nome) => {
                    const r = await createSegmentoFn({ data: { nome } });
                    await qc.invalidateQueries({ queryKey: ["cadastros", "segmentos"] });
                    return r;
                  }}
                />
              )}
            />
          </Field>
          <Field label="Origem do lead">
            <Controller
              control={form.control}
              name="lead_origem_id"
              render={({ field }) => (
                <ComboboxAdd
                  options={origens.data ?? []}
                  value={field.value ?? null}
                  onChange={field.onChange}
                  placeholder="Selecione a origem…"
                  emptyText="Nenhuma origem cadastrada — digite para adicionar."
                  onCreate={async (nome) => {
                    const r = await createOrigemFn({ data: { nome } });
                    await qc.invalidateQueries({ queryKey: ["cadastros", "lead_origens"] });
                    return r;
                  }}
                />
              )}
            />
          </Field>
          <Field label="Matriz / Filial">
            <Controller
              control={form.control}
              name="matriz_filial"
              render={({ field }) => (
                <Select value={field.value ?? "_none"} onValueChange={(v) => field.onChange(v === "_none" ? null : v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">—</SelectItem>
                    {MATRIZ_FILIAL.map((m) => <SelectItem key={m} value={m}>{m === "matriz" ? "Matriz" : "Filial"}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>
          <Field label="Site">
            <Input type="url" placeholder="https://…" {...form.register("site")} />
          </Field>
            </>
          )}
          <Field label="E-mail corporativo" error={form.formState.errors.email_corporativo?.message}>
            <Input type="email" {...form.register("email_corporativo")} />
          </Field>
          <Field label="Telefone corporativo">
            <div className="flex gap-2">
              <Input className="w-20" {...form.register("telefone_corporativo_ddi")} placeholder="+55" />
              <Input className="flex-1" {...form.register("telefone_corporativo_numero")} />
              <Input className="w-20" {...form.register("ramal")} placeholder="Ramal" />
            </div>
          </Field>
        </Grid>
      </Section>

      {/* Configuração comercial */}
      <Section title="Configuração comercial">
        <Grid>
          <Field label="Status do cliente">
            <Controller
              control={form.control}
              name="status"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CLIENTE_STATUS.map((s) => <SelectItem key={s} value={s}>{statusLabel(s)}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>
          <Field label="Moeda (ISO 4217)">
            <Controller
              control={form.control}
              name="moeda"
              render={({ field }) => (
                <Select value={toMoedaISO(field.value)} onValueChange={field.onChange}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MOEDAS.map((m) => (
                      <SelectItem key={m.codigo} value={m.codigo}>{moedaLabel(m.codigo)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>
          {!isModal && (
            <>
          <Field label="Idioma">
            <Controller
              control={form.control}
              name="idioma"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CLIENTE_IDIOMAS.map((i) => <SelectItem key={i} value={i}>{i.toUpperCase()}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>
          <Field label="Key account">
            <label className="inline-flex items-center gap-2 text-sm">
              <Controller
                control={form.control}
                name="key_account"
                render={({ field }) => (
                  <Checkbox checked={field.value} onCheckedChange={(v) => field.onChange(!!v)} />
                )}
              />
              <span>Marcar como conta-chave</span>
            </label>
          </Field>
            </>
          )}
        </Grid>
      </Section>

      {/* Endereço */}
      {!isModal && (
      <Section title="Endereço">
        <Grid>
          <Field label={paisCodigo === "BR" ? "CEP" : "Código postal"}>
            <Controller
              control={form.control}
              name="endereco_codigo_postal"
              render={({ field }) => (
                <div className="relative">
                  <Input
                    value={field.value ?? ""}
                    onChange={field.onChange}
                    onBlur={(e) => {
                      field.onBlur();
                      if (paisCodigo === "BR") void lookupCep(e.target.value);
                    }}
                  />
                  {cepLoading && <Loader2 className="absolute right-2 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />}
                </div>
              )}
            />
          </Field>
          <Field label="Logradouro"><Input {...form.register("endereco_logradouro")} /></Field>
          <Field label="Número"><Input {...form.register("endereco_numero")} /></Field>
          <Field label="Complemento"><Input {...form.register("endereco_complemento")} /></Field>
          <Field label="Bairro"><Input {...form.register("endereco_bairro")} /></Field>
          <Field label="Cidade"><Input {...form.register("endereco_cidade")} /></Field>
          <Field label="Estado / Província"><Input {...form.register("endereco_estado")} /></Field>
          <Field label="Latitude">
            <Input type="number" step="0.000001"
              {...form.register("latitude", { setValueAs: (v) => (v === "" || v == null ? null : Number(v)) })} />
          </Field>
          <Field label="Longitude">
            <Input type="number" step="0.000001"
              {...form.register("longitude", { setValueAs: (v) => (v === "" || v == null ? null : Number(v)) })} />
          </Field>
        </Grid>
      </Section>
      )}



      {/* Contatos */}
      <Section
        title={isModal ? "Contato principal" : "Contatos"}
        right={
          isModal ? undefined : (
          <Button type="button" variant="outline" size="sm"
            onClick={() => contatos.append({ nome: "", cargo: "", email: "", telefone_ddi: defaultDdi(paisCodigo), telefone_numero: "", principal: false })}>
            <Plus className="mr-1 h-4 w-4" /> Adicionar contato
          </Button>
          )
        }
      >
        <div className="space-y-3">
          {(isModal ? contatos.fields.slice(0, 1) : contatos.fields).map((f, i) => (
            <div key={f.id} className="rounded-md border border-[var(--bg-border)] p-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <Field label="Nome *" error={form.formState.errors.contatos?.[i]?.nome?.message}>
                  <Input {...form.register(`contatos.${i}.nome` as const)} />
                </Field>
                {!isModal && (
                  <Field label="Cargo"><Input {...form.register(`contatos.${i}.cargo` as const)} /></Field>
                )}
                <Field label="E-mail" error={form.formState.errors.contatos?.[i]?.email?.message}>
                  <Input type="email" {...form.register(`contatos.${i}.email` as const)} />
                </Field>
                {!isModal && (
                  <Field label="DDI"><Input className="w-24" {...form.register(`contatos.${i}.telefone_ddi` as const)} /></Field>
                )}
                <Field label="Telefone"><Input {...form.register(`contatos.${i}.telefone_numero` as const)} /></Field>
                <div className={isModal ? "hidden" : "flex items-end justify-between gap-2"}>
                  <label className="inline-flex items-center gap-2 text-sm">
                    <Controller
                      control={form.control}
                      name={`contatos.${i}.principal` as const}
                      render={({ field }) => (
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={(v) => {
                            if (v) {
                              contatos.fields.forEach((_, idx) => {
                                form.setValue(`contatos.${idx}.principal` as const, idx === i);
                              });
                            } else field.onChange(false);
                          }}
                        />
                      )}
                    />
                    <span>Principal</span>
                  </label>
                  {contatos.fields.length > 1 && (
                    <Button type="button" variant="ghost" size="icon" onClick={() => contatos.remove(i)} aria-label="Remover">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Sócios — colapsável */}
      {!isModal && (
      <CollapsibleSection title="Sócios (opcional)" defaultOpen={false}
        right={
          <Button type="button" variant="outline" size="sm"
            onClick={(e) => { e.stopPropagation(); socios.append({ nome: "", qualificacao: "", desde: "" }); }}>
            <Plus className="mr-1 h-4 w-4" /> Adicionar sócio
          </Button>
        }>
        {socios.fields.length === 0 ? (
          <p className="text-[12px] text-muted-foreground">Nenhum sócio cadastrado.</p>
        ) : (
          <div className="space-y-3">
            {socios.fields.map((f, i) => (
              <div key={f.id} className="rounded-md border border-[var(--bg-border)] p-3">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <Field label="Nome *"><Input {...form.register(`socios.${i}.nome` as const)} /></Field>
                  <Field label="Qualificação"><Input {...form.register(`socios.${i}.qualificacao` as const)} /></Field>
                  <div className="flex items-end gap-2">
                    <Field label="Desde">
                      <Input type="date" {...form.register(`socios.${i}.desde` as const)} />
                    </Field>
                    <Button type="button" variant="ghost" size="icon" onClick={() => socios.remove(i)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CollapsibleSection>
      )}

      {/* Fiscal BR — colapsável, só visível quando pais=BR */}
      {showFiscalBR && !isModal && (
        <CollapsibleSection title="Dados fiscais (Brasil)" defaultOpen={false}>
          <Grid>
            <Field label="Regime tributário">
              <Controller
                control={form.control}
                name="regime_tributario"
                render={({ field }) => (
                  <Select value={field.value ?? "_none"} onValueChange={(v) => field.onChange(v === "_none" ? null : v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">—</SelectItem>
                      {REGIMES_TRIBUTARIOS.map((r) => (
                        <SelectItem key={r} value={r}>{regimeLabel(r)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
            <Field label="Situação cadastral"><Input {...form.register("situacao_cadastral")} /></Field>
            <Field label="Data da situação"><Input type="date" {...form.register("data_situacao")} /></Field>
            <Field label="Motivo da situação"><Input {...form.register("motivo_situacao")} /></Field>
            <Field label="Data de abertura"><Input type="date" {...form.register("data_abertura")} /></Field>
            <Field label="Capital social">
              <Input type="number" step="0.01"
                {...form.register("capital_social", { setValueAs: (v) => (v === "" || v == null ? null : Number(v)) })} />
            </Field>
            <Field label="Porte"><Input {...form.register("porte")} /></Field>
            <Field label="Natureza jurídica — código"><Input {...form.register("natureza_juridica_codigo")} /></Field>
            <Field label="Natureza jurídica — descrição"><Input {...form.register("natureza_juridica_descricao")} /></Field>
            <Field label="CNAE principal"><Input {...form.register("cnae_principal")} /></Field>
          </Grid>
        </CollapsibleSection>
      )}

      {/* Redes sociais — colapsável */}
      {!isModal && (
      <CollapsibleSection title="Redes sociais (opcional)" defaultOpen={false}>
        <Grid>
          <Field label="LinkedIn"><Input placeholder="https://linkedin.com/company/…" {...form.register("social_linkedin")} /></Field>
          <Field label="Instagram"><Input placeholder="@usuario" {...form.register("social_instagram")} /></Field>
          <Field label="Facebook"><Input {...form.register("social_facebook")} /></Field>
          <Field label="Twitter / X"><Input placeholder="@usuario" {...form.register("social_twitter")} /></Field>
          <Field label="WhatsApp"><Input placeholder="+55 11 99999-9999" {...form.register("social_whatsapp")} /></Field>
          <Field label="Skype"><Input {...form.register("social_skype")} /></Field>
        </Grid>
      </CollapsibleSection>
      )}

      {/* Observações */}
      {!isModal && (
      <Section title="Observações">
        <Textarea rows={4} {...form.register("observacoes")} />
      </Section>
      )}
    </form>
  );
}

function Section({ title, right, children }: { title: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-[var(--radius-lg)] border border-[var(--bg-border)] bg-[var(--bg-surface)] shadow-[var(--shadow-sm)]">
      <div className="flex items-center justify-between border-b border-[var(--bg-border)] px-4 py-3">
        <h2 className="text-sm font-semibold text-[var(--text-primary)]">{title}</h2>
        {right}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

function CollapsibleSection({
  title, right, defaultOpen = false, children,
}: { title: string; right?: React.ReactNode; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <section className="rounded-[var(--radius-lg)] border border-[var(--bg-border)] bg-[var(--bg-surface)] shadow-[var(--shadow-sm)]">
        <div className="flex items-center justify-between border-b border-[var(--bg-border)] px-4 py-3">
          <CollapsibleTrigger asChild>
            <button type="button" className="flex flex-1 items-center gap-2 text-left text-sm font-semibold text-[var(--text-primary)]">
              <ChevronDown className={cn("h-4 w-4 transition-transform", !open && "-rotate-90")} />
              {title}
            </button>
          </CollapsibleTrigger>
          {right}
        </div>
        <CollapsibleContent>
          <div className="p-4">{children}</div>
        </CollapsibleContent>
      </section>
    </Collapsible>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{children}</div>;
}

function Field({ label, error, help, children }: { label: string; error?: string; help?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[12.5px]">{label}</Label>
      {children}
      {help && !error && <p className="text-[11px] text-muted-foreground">{help}</p>}
      {error && <p className="text-[11px] text-destructive">{error}</p>}
    </div>
  );
}

function regimeLabel(r: string): string {
  switch (r) {
    case "mei": return "MEI";
    case "simples": return "Simples Nacional";
    case "lucro_presumido": return "Lucro Presumido";
    case "lucro_real": return "Lucro Real";
    default: return r;
  }
}

function defaultDdi(country: string): string {
  const map: Record<string, string> = {
    BR: "+55", AR: "+54", CL: "+56", PE: "+51", UY: "+598", PY: "+595",
    CO: "+57", EC: "+593", BO: "+591", PA: "+507", CR: "+506", VE: "+58",
    SV: "+503", NI: "+505", HN: "+504", GT: "+502", MX: "+52",
  };
  return map[country] ?? "+";
}