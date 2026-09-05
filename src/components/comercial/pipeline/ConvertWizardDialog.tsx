import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  Search,
  Building2,
  Sparkles,
  CheckCircle2,
  XCircle,
  PauseCircle,
  Trophy,
  ArrowLeft,
  ArrowRight,
  UserPlus,
  Link as LinkIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { OportunidadeLite } from "@/lib/oportunidades.functions";
import { createOportunidade } from "@/lib/oportunidades.functions";
import {
  listOportunidadesByEmpresa,
  convertOportunidadesToCliente,
  type EmpresaOpp,
} from "@/lib/oportunidades-convert.functions";
import { listClientes, createCliente } from "@/lib/clientes.functions";
import { paisesQueryOptions } from "@/lib/clientes.queries";
import { enrichDocumento } from "@/lib/enrich.functions";
import { listTemplates } from "@/lib/processo-templates.functions";
import { sugerirTemplateParaOportunidade } from "@/lib/rfq.functions";
import {
  normalizeDocumento,
  type ClienteInput,
  CLIENTE_LIFECYCLE_LABEL,
  CLIENTE_LIFECYCLE_COLOR,
  type ClienteLifecycle,
  razaoSocialLabel,
  nomeFantasiaLabel,
} from "@/lib/clientes.shared";
import { validarDocumentoFiscal } from "@/lib/documentos-fiscais";
import { focusFirstError, focusFieldByName } from "@/lib/form-errors";

type Step = 1 | 2 | 3;
type Mode = "search" | "create";
type Action = "win" | "keep" | "lose";

type OppPlan = {
  action: Action;
  template_id?: string;
  lost_reason?: string;
};

function fmtBRL(v: number | null): string {
  if (!v) return "—";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(v);
}

const STAGE_TONE: Record<string, string> = {
  novo: "bg-[var(--badge-neutral-bg)] text-[var(--badge-neutral-fg)]",
  qualificado: "bg-blue-50 text-blue-700",
  proposta: "bg-indigo-50 text-indigo-700",
  negociacao: "bg-amber-50 text-amber-700",
  ganho: "bg-emerald-50 text-emerald-700",
};

export function ConvertWizardDialog({
  source,
  open,
  onOpenChange,
}: {
  source: OportunidadeLite | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const qc = useQueryClient();
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>(1);
  const [mode, setMode] = useState<Mode>("search");
  const [clienteId, setClienteId] = useState<string | null>(null);
  const [clienteLabel, setClienteLabel] = useState<string>("");
  const [clienteLifecycle, setClienteLifecycle] = useState<ClienteLifecycle | null>(null);

  // ---- Step 1: search existing ----
  const [searchQ, setSearchQ] = useState("");
  const listClientesFn = useServerFn(listClientes);
  const searchClientesQ = useQuery({
    queryKey: ["wizard-clientes-search", searchQ],
    queryFn: () =>
      listClientesFn({
        data: { q: searchQ, status: "todos", pais: "todos", page: 1, pageSize: 25 },
      }),
    enabled: open && step === 1 && mode === "search" && searchQ.trim().length >= 2,
  });

  // ---- Step 1: create new (quick form) ----
  const paisesQ = useQuery(paisesQueryOptions());
  const [pais, setPais] = useState("BR");
  const [documento, setDocumento] = useState("");
  const [razaoSocial, setRazaoSocial] = useState("");
  const [nomeFantasia, setNomeFantasia] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [contatoNome, setContatoNome] = useState("");
  const [contatoEmail, setContatoEmail] = useState("");
  /** Erros por campo — nunca limpam os valores digitados. */
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const clearFieldError = (name: string) =>
    setFieldErrors((prev) => (prev[name] ? { ...prev, [name]: "" } : prev));

  const enrichFn = useServerFn(enrichDocumento);
  const enrichMut = useMutation({
    mutationFn: () => enrichFn({ data: { pais, documento: normalizeDocumento(documento) } }),
    onSuccess: (res) => {
      const envelope = res as {
        ok: boolean;
        data?: Record<string, unknown>;
        error?: string;
      } | null;
      if (!envelope || envelope.ok === false) {
        toast.message("Sem dados encontrados", {
          description: envelope?.error ?? "Preencha manualmente.",
        });
        return;
      }
      const rec = (envelope.data ?? {}) as Record<string, unknown>;
      const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
      const rs = str(rec.razao_social);
      const nf = str(rec.nome_fantasia);
      const em = str(rec.email_corporativo);
      const tel = str(rec.telefone_corporativo_numero);
      if (rs) setRazaoSocial(rs);
      if (nf) setNomeFantasia(nf);
      if (em) setEmail(em);
      if (tel) setTelefone(tel);
      if (!rs && !nf && !em && !tel) {
        toast.message("Sem dados encontrados", { description: "Preencha manualmente." });
        return;
      }
      toast.success("Dados preenchidos");
    },

    onError: (e: Error) => toast.error(e.message),
  });

  const createClienteFn = useServerFn(createCliente);
  const createMut = useMutation({
    mutationFn: (payload: ClienteInput) => createClienteFn({ data: payload }),
    onSuccess: (r) => {
      setClienteId(r.id);
      setClienteLabel(`${r.codigo} — ${razaoSocial}`);
      setClienteLifecycle("prospect");
      qc.invalidateQueries({ queryKey: ["clientes"] });
      toast.success(`Cliente ${r.codigo} criado`);
      setStep(2);
    },
    onError: (e: Error) => {
      // Erros do backend viram erro de campo (sem limpar nada) quando possível.
      const field = (e as unknown as { field?: string }).field;
      const msg = e.message || "Não foi possível criar o cliente.";
      const alvo =
        field ??
        (/raz[aã]o|raz[oó]n|legal name/i.test(msg)
          ? "razao_social"
          : /documento|cnpj|cuit|rut|ruc|nit|rfc|ein/i.test(msg)
            ? "documento_fiscal_numero"
            : null);
      if (alvo) {
        setFieldErrors((prev) => ({ ...prev, [alvo]: msg }));
        focusFirstError([alvo]);
      }
      toast.error(msg);
    },
  });

  function handleCreate() {
    const errs: Record<string, string> = {};
    if (!razaoSocial.trim()) {
      errs.razao_social = `${razaoSocialLabel(pais)} é obrigatória — o lead não trouxe o nome da empresa. Preencha aqui.`;
    }
    if (!documento.trim()) {
      errs.documento_fiscal_numero = "Informe o documento fiscal da empresa.";
    } else {
      const check = validarDocumentoFiscal(pais, documento);
      if (!check.ok) errs.documento_fiscal_numero = check.mensagem ?? "Documento fiscal inválido.";
    }
    if (!contatoNome.trim()) {
      errs.contato_nome = "Informe o nome do contato principal.";
    }
    setFieldErrors(errs);
    const nomes = Object.keys(errs).filter((k) => errs[k]);
    if (nomes.length > 0) {
      toast.error(
        nomes.length === 1
          ? errs[nomes[0]!]!
          : `Faltam ${nomes.length} campos obrigatórios — eles estão destacados abaixo.`,
      );
      focusFirstError(nomes);
      return;
    }

    const payload: ClienteInput = {
      razao_social: razaoSocial.trim(),
      nome_fantasia: nomeFantasia.trim() || null,
      apelido: null,
      pais,
      documento_fiscal_numero: normalizeDocumento(documento),
      inscricao_estadual: null,
      moeda: pais === "BR" ? "BRL" : pais === "US" ? "USD" : "USD",
      idioma: pais === "BR" ? "pt" : "es",
      status: "ativo",
      segmento_id: null,
      lead_origem_id: null,
      key_account: false,
      observacoes: source
        ? `Convertido da oportunidade ${source.codigo} — ${source.titulo}.`
        : null,
      site: null,
      email_corporativo: email.trim() || null,
      telefone_corporativo_ddi: null,
      telefone_corporativo_numero: telefone.trim() || null,
      ramal: null,
      matriz_filial: null,
      endereco_logradouro: null,
      endereco_numero: null,
      endereco_complemento: null,
      endereco_bairro: null,
      endereco_cidade: null,
      endereco_estado: null,
      endereco_codigo_postal: null,
      latitude: null,
      longitude: null,
      regime_tributario: null,
      cnae_principal: null,
      cnaes_secundarios: null,
      natureza_juridica_codigo: null,
      natureza_juridica_descricao: null,
      situacao_cadastral: null,
      data_situacao: null,
      motivo_situacao: null,
      data_abertura: null,
      capital_social: null,
      porte: null,
      social_linkedin: null,
      social_instagram: null,
      social_facebook: null,
      social_twitter: null,
      social_whatsapp: null,
      social_skype: null,
      socios: [],
      contatos: [
        {
          nome: contatoNome.trim(),
          email: contatoEmail.trim() || undefined,
          principal: true,
        },
      ],
    };
    createMut.mutate(payload);
  }

  // ---- Step 2: lista oportunidades da empresa + planos ----
  const listEmpresaFn = useServerFn(listOportunidadesByEmpresa);
  const empresaQ = useQuery({
    queryKey: ["wizard-empresa-opps", clienteId, source?.empresa_lead, source?.id],
    queryFn: () =>
      listEmpresaFn({
        data: {
          cliente_id: clienteId,
          empresa_lead: clienteId ? null : (source?.empresa_lead ?? null),
          source_id: source?.id,
        },
      }),
    enabled: open && step >= 2 && !!source,
  });

  const [plans, setPlans] = useState<Record<string, OppPlan>>({});

  // Quando empresa list chega, inicializa planos: source = win (com template), restantes = keep
  useEffect(() => {
    if (!empresaQ.data || !source) return;
    setPlans((prev) => {
      // mantém o que o user já mexeu; preenche default só para ids novos
      const next = { ...prev };
      // garante a opp de origem como WIN se ainda não estiver
      if (!next[source.id]) next[source.id] = { action: "win" };
      for (const o of empresaQ.data) {
        if (!next[o.id]) {
          next[o.id] = { action: o.id === source.id ? "win" : "keep" };
        }
      }
      return next;
    });
  }, [empresaQ.data, source]);

  // Templates
  const listTemplatesFn = useServerFn(listTemplates);
  const templatesQ = useQuery({
    queryKey: ["wizard-templates"],
    queryFn: () => listTemplatesFn({ data: { tipo: "projeto" } }),
    enabled: open && step >= 2,
  });

  // Sugestão automática a partir do Checklist recebido para a oportunidade de origem.
  const sugerirFn = useServerFn(sugerirTemplateParaOportunidade);
  const sugestaoQ = useQuery({
    queryKey: ["wizard-sugestao-template", source?.id ?? null],
    queryFn: () => sugerirFn({ data: { oportunidade_id: source!.id } }),
    enabled: open && step >= 2 && !!source?.id,
  });
  useEffect(() => {
    if (!open || step < 2) return;
    const sug = sugestaoQ.data;
    if (!sug?.template_id || !source?.id) return;
    setPlans((prev) => {
      const cur = prev[source.id];
      if (!cur || cur.action !== "win" || cur.template_id) return prev;
      return { ...prev, [source.id]: { ...cur, template_id: sug.template_id ?? undefined } };
    });
  }, [open, step, sugestaoQ.data, source?.id]);

  // Criar oportunidade direto no assistente quando a empresa não tem nenhuma
  const [novaOppTitulo, setNovaOppTitulo] = useState("");
  const criarOppFn = useServerFn(createOportunidade);
  /** Chave de idempotência estável por tentativa — só muda após sucesso. */
  const oppIdemKey = useRef<string>(crypto.randomUUID());
  const [confirmarDupOpp, setConfirmarDupOpp] = useState(false);
  const criarOppMut = useMutation({
    mutationFn: (opts?: { confirmar?: boolean }) =>
      criarOppFn({
        data: {
          titulo: (novaOppTitulo.trim() || source?.titulo || "Nova oportunidade").slice(0, 200),
          cliente_id: clienteId ?? undefined,
          valor_estimado: source?.valor_estimado ?? undefined,
          idempotency_key: oppIdemKey.current,
          confirmar_duplicata: opts?.confirmar ?? false,
        },
      }),
    onSuccess: async (r) => {
      if (r.needsConfirm) {
        setConfirmarDupOpp(true);
        toast.warning(
          `Já existe oportunidade aberta parecida (${r.duplicatas.map((d) => d.codigo).join(", ")}). Confirme abaixo se quer criar mesmo assim.`,
        );
        return;
      }
      setConfirmarDupOpp(false);
      oppIdemKey.current = crypto.randomUUID();
      setNovaOppTitulo("");
      toast.success(
        r.reused
          ? "Oportunidade já criada — reaproveitada."
          : "Oportunidade criada e vinculada ao cliente.",
      );
      await empresaQ.refetch();
      qc.invalidateQueries({ queryKey: ["pipeline"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const counts = useMemo(() => {
    let win = 0,
      keep = 0,
      lose = 0;
    const visiveis = empresaQ.data ?? [];
    for (const o of visiveis) {
      const p = plans[o.id];
      if (!p) continue;
      if (p.action === "win") win++;
      else if (p.action === "keep") keep++;
      else lose++;
    }
    return { win, keep, lose };
  }, [plans, empresaQ.data]);

  const planValid = useMemo(() => {
    for (const [, p] of Object.entries(plans)) {
      if (p.action === "lose" && (!p.lost_reason || p.lost_reason.trim().length < 10)) return false;
    }
    return counts.win + counts.keep + counts.lose > 0;
  }, [plans, counts]);

  // ---- Step 3: confirmar ----
  const convertFn = useServerFn(convertOportunidadesToCliente);
  const convertMut = useMutation({
    mutationFn: () => {
      if (!clienteId || !source) throw new Error("Estado inválido.");
      const oportunidades = (empresaQ.data ?? []).map((o) => {
        const p = plans[o.id] ?? { action: "keep" as Action };
        return {
          id: o.id,
          action: p.action,
          template_id: p.action === "win" ? p.template_id : undefined,
          lost_reason: p.action === "lose" ? p.lost_reason : undefined,
        };
      });
      return convertFn({
        data: {
          cliente_id: clienteId,
          source_oportunidade_id: source.id,
          oportunidades,
        },
      });
    },
    onSuccess: (r) => {
      toast.success(
        `Cliente ${r.cliente_codigo} ativado. ${r.processos.length} processo(s) criado(s).`,
      );
      qc.invalidateQueries({ queryKey: ["oportunidades", "pipeline"] });
      qc.invalidateQueries({ queryKey: ["clientes"] });
      if (clienteId) {
        qc.invalidateQueries({ queryKey: ["clientes", clienteId] });
      }
      onOpenChange(false);
      // Vai direto para a ficha 360º do cliente ativado
      navigate({ to: "/clientes/$codigo", params: { codigo: r.cliente_codigo } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // reset on close/source change
  useEffect(() => {
    if (!open) return;
    setStep(1);
    setPlans({});
    setClienteLifecycle(null);
    if (source?.cliente_id) {
      setMode("search");
      setClienteId(source.cliente_id);
      setClienteLabel(source.cliente_nome ?? "");
      // pula direto para step 2 quando já tem cliente vinculado
      setStep(2);
    } else {
      setMode("search");
      setClienteId(null);
      setClienteLabel("");
      setFieldErrors({});
      // Mapeamento lead → cliente. A empresa do lead pode estar em
      // `empresa_lead` ou, quando o lead foi criado sem empresa, no nome do
      // cliente já vinculado. O contato, e-mail e telefone do lead também são
      // transferidos (antes ficavam em branco).
      const empresa = (source?.empresa_lead ?? "").trim() || (source?.cliente_nome ?? "").trim();
      setSearchQ(empresa);
      setRazaoSocial(empresa);
      setNomeFantasia("");
      setDocumento("");
      setEmail((source?.email ?? "").trim());
      setTelefone((source?.telefone ?? "").trim());
      setContatoNome((source?.nome_lead ?? "").trim());
      setContatoEmail((source?.email ?? "").trim());
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, source?.id]);

  function setPlan(id: string, patch: Partial<OppPlan>) {
    setPlans((prev) => ({ ...prev, [id]: { ...(prev[id] ?? { action: "keep" }), ...patch } }));
  }

  if (!source) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-emerald-600" />
            Converter em Cliente Ativo
          </DialogTitle>
          <DialogDescription>
            Transforme oportunidades ganhas em cliente ativo + processos no pipeline de
            engenharia/produção.
          </DialogDescription>
        </DialogHeader>

        {/* Stepper */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {[
            { n: 1, label: "Empresa" },
            { n: 2, label: "Oportunidades" },
            { n: 3, label: "Confirmar" },
          ].map((s, i) => (
            <div key={s.n} className="flex items-center gap-2">
              <div
                className={cn(
                  "h-6 w-6 rounded-full grid place-items-center text-[11px] font-semibold border",
                  step === s.n
                    ? "bg-primary text-primary-foreground border-primary"
                    : step > s.n
                      ? "bg-emerald-100 text-emerald-700 border-emerald-300"
                      : "bg-muted",
                )}
              >
                {step > s.n ? <CheckCircle2 className="w-3.5 h-3.5" /> : s.n}
              </div>
              <span className={cn(step === s.n && "text-foreground font-medium")}>{s.label}</span>
              {i < 2 && <span className="mx-1">›</span>}
            </div>
          ))}
        </div>

        {/* ----- STEP 1 ----- */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="rounded-lg border bg-muted/30 p-3 text-xs">
              Oportunidade de origem: <strong>{source.codigo}</strong> — {source.titulo}
              <div className="text-muted-foreground mt-0.5">
                Lead: {source.empresa_lead || source.nome_lead || "—"}
              </div>
            </div>

            <div className="inline-flex rounded-lg border bg-white p-1 text-xs">
              <Button
                size="sm"
                variant={mode === "search" ? "secondary" : "ghost"}
                className="h-8 px-3"
                onClick={() => setMode("search")}
              >
                <LinkIcon className="w-3.5 h-3.5 mr-1" /> Vincular a cliente existente
              </Button>
              <Button
                size="sm"
                variant={mode === "create" ? "secondary" : "ghost"}
                className="h-8 px-3"
                onClick={() => setMode("create")}
              >
                <UserPlus className="w-3.5 h-3.5 mr-1" /> Criar novo cliente
              </Button>
            </div>

            {mode === "search" && (
              <div className="space-y-2">
                <Label>Buscar cliente</Label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
                  <Input
                    className="pl-8"
                    placeholder="Razão social, fantasia, código ou documento…"
                    value={searchQ}
                    onChange={(e) => setSearchQ(e.target.value)}
                  />
                </div>
                <div className="border rounded-lg divide-y bg-white max-h-[260px] overflow-auto">
                  {searchQ.trim().length < 2 && (
                    <div className="p-4 text-xs text-muted-foreground text-center">
                      Digite ao menos 2 caracteres para buscar.
                    </div>
                  )}
                  {searchClientesQ.isFetching && (
                    <div className="p-4 text-xs text-muted-foreground text-center">
                      <Loader2 className="inline w-3 h-3 animate-spin mr-1" /> Buscando…
                    </div>
                  )}
                  {!searchClientesQ.isFetching &&
                    searchQ.trim().length >= 2 &&
                    (searchClientesQ.data?.rows.length ?? 0) === 0 && (
                      <div className="p-4 text-xs text-muted-foreground text-center">
                        Nenhum cliente encontrado. Use "Criar novo cliente".
                      </div>
                    )}
                  {(searchClientesQ.data?.rows ?? []).map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setClienteId(c.id);
                        setClienteLabel(`${c.codigo} — ${c.razao_social}`);
                        setClienteLifecycle((c.lifecycle_stage as ClienteLifecycle | null) ?? null);
                        setStep(2);
                      }}
                      className={cn(
                        "w-full text-left p-2.5 hover:bg-muted/50 flex items-center gap-2",
                        clienteId === c.id && "bg-emerald-50",
                      )}
                    >
                      <Building2 className="w-4 h-4 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium truncate">
                          {c.razao_social}
                          {c.nome_fantasia ? (
                            <span className="text-muted-foreground"> · {c.nome_fantasia}</span>
                          ) : null}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {c.codigo} · {c.pais} · {c.documento_fiscal_numero}
                        </div>
                      </div>
                      {c.lifecycle_stage && (
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium",
                            CLIENTE_LIFECYCLE_COLOR[c.lifecycle_stage as ClienteLifecycle],
                          )}
                        >
                          {CLIENTE_LIFECYCLE_LABEL[c.lifecycle_stage as ClienteLifecycle]}
                        </span>
                      )}
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px]",
                          c.status === "ativo"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-amber-50 text-amber-700 border-amber-200",
                        )}
                      >
                        {c.status}
                      </Badge>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {mode === "create" && (
              <div className="grid gap-3">
                {/* Resumo do que será transferido do lead para o cliente */}
                <div className="rounded-lg border bg-white p-3 grid gap-2">
                  <div className="text-xs font-semibold">Dados que serão transferidos do lead</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
                    {[
                      {
                        campo: razaoSocialLabel(pais),
                        origem: "Empresa do lead",
                        valor: razaoSocial,
                        alvo: "razao_social",
                      },
                      {
                        campo: "Documento fiscal",
                        origem: "Preenchido aqui",
                        valor: documento,
                        alvo: "documento_fiscal_numero",
                      },
                      {
                        campo: "Contato principal",
                        origem: "Nome do lead",
                        valor: contatoNome,
                        alvo: "contato_nome",
                      },
                      {
                        campo: "Email",
                        origem: "Email do lead",
                        valor: email || contatoEmail,
                        alvo: null,
                      },
                      {
                        campo: "Telefone",
                        origem: "Telefone do lead",
                        valor: telefone,
                        alvo: null,
                      },
                    ].map((l) => {
                      const faltando = !l.valor.trim() && !!l.alvo;
                      return (
                        <div key={l.campo} className="flex items-center justify-between gap-2">
                          <span className="text-muted-foreground">{l.campo}</span>
                          {l.valor.trim() ? (
                            <span className="truncate font-medium">{l.valor}</span>
                          ) : faltando ? (
                            <button
                              type="button"
                              className="text-destructive font-medium underline underline-offset-2"
                              onClick={() => focusFieldByName(l.alvo!)}
                            >
                              obrigatório — preencher
                            </button>
                          ) : (
                            <span className="text-muted-foreground">— não informado</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Confira e edite abaixo antes de confirmar. Nada é perdido em caso de erro.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-[120px_1fr_auto] gap-2 items-end">
                  <div className="grid gap-1">
                    <Label>País *</Label>
                    <Select
                      value={pais}
                      onValueChange={(v) => {
                        setPais(v);
                        clearFieldError("documento_fiscal_numero");
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(paisesQ.data ?? []).map((p) => (
                          <SelectItem key={p.codigo} value={p.codigo}>
                            {p.codigo} — {p.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-1">
                    <Label>Documento fiscal *</Label>
                    <Input
                      name="documento_fiscal_numero"
                      data-field="documento_fiscal_numero"
                      aria-invalid={!!fieldErrors.documento_fiscal_numero}
                      className={cn(fieldErrors.documento_fiscal_numero && "border-destructive")}
                      value={documento}
                      onChange={(e) => {
                        setDocumento(e.target.value);
                        clearFieldError("documento_fiscal_numero");
                      }}
                      placeholder="CNPJ / CUIT / RUT / RUC…"
                    />
                    {fieldErrors.documento_fiscal_numero && (
                      <span className="text-[11px] text-destructive">
                        {fieldErrors.documento_fiscal_numero}
                      </span>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => enrichMut.mutate()}
                    disabled={!documento.trim() || enrichMut.isPending}
                  >
                    {enrichMut.isPending ? (
                      <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4 mr-1" />
                    )}
                    Enriquecer
                  </Button>
                </div>
                <div className="grid gap-1">
                  <Label>{razaoSocialLabel(pais)} *</Label>
                  <Input
                    name="razao_social"
                    data-field="razao_social"
                    aria-invalid={!!fieldErrors.razao_social}
                    className={cn(fieldErrors.razao_social && "border-destructive")}
                    value={razaoSocial}
                    onChange={(e) => {
                      setRazaoSocial(e.target.value);
                      clearFieldError("razao_social");
                    }}
                    maxLength={200}
                  />
                  {fieldErrors.razao_social && (
                    <span className="text-[11px] text-destructive">{fieldErrors.razao_social}</span>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="grid gap-1">
                    <Label>{nomeFantasiaLabel(pais)}</Label>
                    <Input
                      value={nomeFantasia}
                      onChange={(e) => setNomeFantasia(e.target.value)}
                      maxLength={200}
                    />
                  </div>
                  <div className="grid gap-1">
                    <Label>Email corporativo</Label>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      maxLength={200}
                    />
                  </div>
                  <div className="grid gap-1 sm:col-span-2">
                    <Label>Telefone corporativo</Label>
                    <Input
                      value={telefone}
                      onChange={(e) => setTelefone(e.target.value)}
                      maxLength={50}
                    />
                  </div>
                </div>
                <div className="rounded-lg border bg-muted/30 p-3 grid gap-2">
                  <div className="text-xs font-medium text-muted-foreground">Contato principal</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="grid gap-1">
                      <Label>Nome *</Label>
                      <Input
                        name="contato_nome"
                        data-field="contato_nome"
                        aria-invalid={!!fieldErrors.contato_nome}
                        className={cn(fieldErrors.contato_nome && "border-destructive")}
                        value={contatoNome}
                        onChange={(e) => {
                          setContatoNome(e.target.value);
                          clearFieldError("contato_nome");
                        }}
                        maxLength={120}
                      />
                      {fieldErrors.contato_nome && (
                        <span className="text-[11px] text-destructive">
                          {fieldErrors.contato_nome}
                        </span>
                      )}
                    </div>
                    <div className="grid gap-1">
                      <Label>Email</Label>
                      <Input
                        type="email"
                        value={contatoEmail}
                        onChange={(e) => setContatoEmail(e.target.value)}
                        maxLength={200}
                      />
                    </div>
                  </div>
                </div>
                <div className="text-[11px] text-muted-foreground">
                  Você poderá completar endereço, sócios e dados fiscais depois em{" "}
                  <strong>Clientes</strong>.
                </div>
              </div>
            )}
          </div>
        )}

        {/* ----- STEP 2 ----- */}
        {step === 2 && (
          <div className="space-y-3">
            <div className="rounded-lg border bg-emerald-50/50 p-3 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-700" />
              <div>
                Cliente selecionado: <strong>{clienteLabel || "—"}</strong>
              </div>
            </div>

            <div className="text-xs text-muted-foreground">
              Todas as oportunidades ativas dessa empresa. Defina o que fazer com cada uma:
            </div>

            {empresaQ.isLoading ? (
              <div className="text-center text-xs text-muted-foreground py-6">
                <Loader2 className="inline w-4 h-4 animate-spin mr-1" /> Carregando…
              </div>
            ) : (
              <div className="border rounded-lg divide-y bg-white">
                {(empresaQ.data ?? []).length === 0 && (
                  <div className="p-5 space-y-3 text-xs">
                    <div className="text-muted-foreground">
                      <strong className="text-foreground">
                        Nenhuma oportunidade vinculada a este cliente.
                      </strong>
                      <p className="mt-1">
                        Isso acontece quando as oportunidades da empresa ainda estão no lead (sem
                        cliente vinculado) ou quando já foram convertidas antes. Crie uma
                        oportunidade para este cliente para seguir com a conversão.
                      </p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Input
                        value={novaOppTitulo}
                        onChange={(e) => setNovaOppTitulo(e.target.value)}
                        placeholder={source.titulo || "Título da oportunidade"}
                        maxLength={200}
                      />
                      <Button
                        size="sm"
                        onClick={() => criarOppMut.mutate({ confirmar: confirmarDupOpp })}
                        disabled={criarOppMut.isPending}
                      >
                        {criarOppMut.isPending ? (
                          <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                        ) : (
                          <UserPlus className="w-4 h-4 mr-1" />
                        )}
                        {confirmarDupOpp ? "Criar mesmo assim" : "Criar oportunidade"}
                      </Button>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Para reaproveitar uma oportunidade existente, feche este assistente, abra o
                      card no pipeline e vincule a empresa ao cliente{" "}
                      <strong>{clienteLabel}</strong>.
                    </p>
                  </div>
                )}
                {(empresaQ.data ?? []).map((o: EmpresaOpp) => {
                  const plan = plans[o.id] ?? { action: "keep" as Action };
                  return (
                    <div key={o.id} className="p-3 space-y-2">
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-[11px] text-muted-foreground">
                              {o.codigo}
                            </span>
                            <span className="font-medium text-sm">{o.titulo}</span>
                            <Badge
                              variant="outline"
                              className={cn("text-[10px]", STAGE_TONE[o.pipeline_stage])}
                            >
                              {o.pipeline_stage}
                            </Badge>
                            {o.id === source.id && (
                              <Badge variant="secondary" className="text-[10px]">
                                origem
                              </Badge>
                            )}
                          </div>
                          <div className="text-[11px] text-muted-foreground mt-0.5">
                            {fmtBRL(o.valor_estimado)} · {o.probabilidade}%
                            {o.processo_id && " · já tem processo"}
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant={plan.action === "win" ? "default" : "outline"}
                            className={cn(
                              "h-8 px-2 text-xs",
                              plan.action === "win" && "bg-emerald-600 hover:bg-emerald-700",
                            )}
                            onClick={() => setPlan(o.id, { action: "win" })}
                          >
                            <Trophy className="w-3 h-3 mr-1" /> Ganhar
                          </Button>
                          <Button
                            size="sm"
                            variant={plan.action === "keep" ? "default" : "outline"}
                            className="h-8 px-2 text-xs"
                            onClick={() => setPlan(o.id, { action: "keep" })}
                          >
                            <PauseCircle className="w-3 h-3 mr-1" /> Manter
                          </Button>
                          <Button
                            size="sm"
                            variant={plan.action === "lose" ? "destructive" : "outline"}
                            className="h-8 px-2 text-xs"
                            onClick={() => setPlan(o.id, { action: "lose" })}
                          >
                            <XCircle className="w-3 h-3 mr-1" /> Perder
                          </Button>
                        </div>
                      </div>

                      {plan.action === "win" && !o.processo_id && (
                        <div className="grid sm:grid-cols-[140px_1fr] gap-2 items-center pl-1">
                          <Label className="text-[11px] text-muted-foreground">
                            Template do processo
                          </Label>
                          <Select
                            value={plan.template_id ?? "none"}
                            onValueChange={(v) =>
                              setPlan(o.id, { template_id: v === "none" ? undefined : v })
                            }
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="Nenhum template" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Sem template</SelectItem>
                              {(templatesQ.data ?? []).map((t) => (
                                <SelectItem key={t.id} value={t.id}>
                                  {t.nome}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {o.id === source?.id &&
                            sugestaoQ.data?.template_id &&
                            sugestaoQ.data.template_id === plan.template_id && (
                              <div className="col-span-full pl-[148px] -mt-1">
                                <Badge
                                  variant="outline"
                                  className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]"
                                >
                                  <Sparkles className="w-3 h-3 mr-1" />
                                  Sugerido pelo Checklist (
                                  {sugestaoQ.data.rfq_tipo_nome ?? "máquina vinculada"})
                                </Badge>
                              </div>
                            )}
                        </div>
                      )}

                      {plan.action === "lose" && (
                        <div className="pl-1">
                          <Textarea
                            placeholder="Motivo da perda (mín. 10 caracteres)…"
                            value={plan.lost_reason ?? ""}
                            onChange={(e) => setPlan(o.id, { lost_reason: e.target.value })}
                            rows={2}
                            maxLength={500}
                            className="text-xs"
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex gap-2 text-xs">
              <Badge
                variant="outline"
                className="bg-emerald-50 text-emerald-700 border-emerald-200"
              >
                Ganhar: {counts.win}
              </Badge>
              <Badge variant="outline" className="bg-[var(--badge-neutral-bg)] text-[var(--badge-neutral-fg)]">
                Manter: {counts.keep}
              </Badge>
              <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200">
                Perder: {counts.lose}
              </Badge>
            </div>
          </div>
        )}

        {/* ----- STEP 3 ----- */}
        {step === 3 && (
          <div className="space-y-3 text-sm">
            <div className="rounded-lg border bg-emerald-50/50 p-3 text-xs">
              <div className="font-medium text-emerald-900">Cliente</div>
              <div>{clienteLabel}</div>
              <div className="text-muted-foreground mt-1 flex items-center gap-2 flex-wrap">
                <span>
                  Status será garantido como <strong>ativo</strong>.
                </span>
                {counts.win > 0 && (
                  <span className="inline-flex items-center gap-1">
                    Status do cliente:
                    {clienteLifecycle && (
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                          CLIENTE_LIFECYCLE_COLOR[clienteLifecycle],
                        )}
                      >
                        {CLIENTE_LIFECYCLE_LABEL[clienteLifecycle]}
                      </span>
                    )}
                    <ArrowRight className="w-3 h-3" />
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                        CLIENTE_LIFECYCLE_COLOR.cliente,
                      )}
                    >
                      {CLIENTE_LIFECYCLE_LABEL.cliente}
                    </span>
                  </span>
                )}
              </div>
            </div>

            <div className="rounded-lg border bg-white">
              <div className="px-3 py-2 border-b bg-muted/30 text-xs font-medium">
                Ações sobre as oportunidades
              </div>
              <div className="divide-y">
                {(empresaQ.data ?? []).map((o) => {
                  const p = plans[o.id] ?? { action: "keep" as Action };
                  const tname =
                    p.action === "win" && p.template_id
                      ? (templatesQ.data ?? []).find((t) => t.id === p.template_id)?.nome
                      : null;
                  return (
                    <div key={o.id} className="px-3 py-2 text-xs flex items-center gap-2">
                      <span className="font-mono text-muted-foreground">{o.codigo}</span>
                      <span className="flex-1 truncate">{o.titulo}</span>
                      {p.action === "win" && (
                        <Badge className="bg-emerald-600 text-white text-[10px]">
                          ganhar → processo{tname ? ` (${tname})` : ""}
                        </Badge>
                      )}
                      {p.action === "keep" && (
                        <Badge variant="outline" className="text-[10px]">
                          manter
                        </Badge>
                      )}
                      {p.action === "lose" && (
                        <Badge variant="destructive" className="text-[10px]">
                          perder
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="text-xs text-muted-foreground">
              Confirmando: criamos {counts.win} processo(s), mantemos {counts.keep} no pipeline e
              arquivamos {counts.lose} como perdidas. Todas as oportunidades passam a apontar para
              este cliente. Ao final você será levado direto para a <strong>ficha 360º</strong> do
              cliente.
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-2">
          {step > 1 && (
            <Button variant="ghost" onClick={() => setStep((s) => (s - 1) as Step)}>
              <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
            </Button>
          )}
          <div className="flex-1" />
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>

          {step === 1 && mode === "create" && (
            <Button onClick={handleCreate} disabled={createMut.isPending}>
              {createMut.isPending && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
              Criar cliente e avançar <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          )}
          {step === 1 && mode === "search" && clienteId && (
            <Button onClick={() => setStep(2)}>
              Avançar <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          )}

          {step === 2 && (
            <Button onClick={() => setStep(3)} disabled={!planValid || empresaQ.isLoading}>
              Revisar <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          )}

          {step === 3 && (
            <Button
              onClick={() => convertMut.mutate()}
              disabled={convertMut.isPending}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {convertMut.isPending ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4 mr-1" />
              )}
              Confirmar conversão
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
