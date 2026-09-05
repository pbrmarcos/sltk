import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { NewOportunidadeDialog } from "@/components/comercial/pipeline/NewOportunidadeDialog";
import { useSuspenseQuery, useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { toast } from "sonner";
import {
  clienteByCodigoQueryOptions,
  paisesQueryOptions,
  clienteOportunidadesQueryOptions,
  clienteProcessosQueryOptions,
  clienteDocumentosQueryOptions,
  clienteTimelineQueryOptions,
  clienteOrcamentosQueryOptions,
} from "@/lib/clientes.queries";
import { clienteEquipamentosQueryOptions } from "@/lib/equipamentos.queries";
import { createEquipamento, softDeleteEquipamento } from "@/lib/equipamentos.functions";
import {
  EquipamentoDrawer,
  type EquipamentoRow,
} from "@/components/clientes/equipamentos/EquipamentoDrawer";
import { CriarEquipamentoWizard } from "@/components/clientes/equipamentos/CriarEquipamentoWizard";
import { ClienteRfqTab } from "@/components/rfq/ClienteRfqTab";
import { ClienteTimeComercialTab } from "@/components/rfq/ClienteTimeComercialTab";
import {
  SensitiveOnly,
  RestrictedNotice,
  RevealableValue,
  maskDocumento,
  maskEmail,
  maskPhone,
  useSensitiveAccess,
} from "@/lib/sensitive";

type NovoEquipamentoInput = {
  clienteId: string;
  modelo: string;
  fabricante?: string;
  numero_serie: string | null;
  tag_cliente: string | null;
  categoria: EquipamentoCategoria;
  status: EquipamentoStatus;
  data_entrega: string | null;
  data_instalacao: string | null;
  data_garantia_fim: string | null;
  localizacao: string | null;
  valor_venda: number | null;
  observacoes: string | null;
};
import {
  EQUIPAMENTO_CATEGORIAS,
  EQUIPAMENTO_CATEGORIA_LABEL,
  EQUIPAMENTO_STATUS,
  EQUIPAMENTO_STATUS_LABEL,
  EQUIPAMENTO_STATUS_COLOR,
  EQUIPAMENTO_STATUS_FASE,
  EQUIPAMENTO_FASES,
  EQUIPAMENTO_FASE_LABEL,
  garantiaStatus,
  type EquipamentoCategoria,
  type EquipamentoStatus,
  type EquipamentoFase,
} from "@/lib/equipamentos.shared";
import { addClienteInteracao, geocodeCliente } from "@/lib/clientes.functions";
import { addClienteSocio, removerClienteSocio } from "@/lib/clientes.functions";
import {
  uploadClienteDocumento,
  removerClienteDocumento,
  CLIENTE_DOC_CATEGORIAS,
  CLIENTE_DOC_CATEGORIA_LABEL,
} from "@/lib/cliente-documentos.functions";
import { formatDocumento } from "@/lib/clientes.shared";
import { ClienteStatusBadge } from "@/components/clientes/ClienteStatusBadge";
import { cn } from "@/lib/utils";
import { approveDocument } from "@/lib/docs/docs.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft,
  Building2,
  Phone,
  Mail,
  Globe,
  MapPin,
  Calendar,
  DollarSign,
  FileText,
  Plus,
  Sparkles,
  TrendingUp,
  Users,
  ChevronRight,
  Briefcase,
  Factory,
  MessageSquare,
  Star,
  Hash,
  ExternalLink,
  Inbox,
  Upload,
  Trash2,
  Navigation,
  Filter,
  Loader2,
  AlertCircle,
  Clock,
  Wrench,
  ShieldCheck,
  ShieldAlert,
  Cog,
} from "lucide-react";

const TABS = [
  { id: "gestao", label: "Gestão" },
  { id: "time", label: "Time" },
] as const;

/** Seções internas da aba Gestão (a ficha foi consolidada em 2 abas). */
const GESTAO_SECOES = [
  { id: "visao", label: "Visão geral" },
  { id: "equipamentos", label: "Equipamentos" },
  { id: "rfq", label: "Checklists" },
  { id: "socios", label: "Sócios" },
  { id: "documentos", label: "Documentos" },
  { id: "timeline", label: "Timeline" },
] as const;
type GestaoSecao = (typeof GESTAO_SECOES)[number]["id"];
type TabId = (typeof TABS)[number]["id"];

type TimelineFilter = "todos" | "manuais" | "oportunidades" | "processos" | "sistema";
const TIMELINE_FILTER_LABEL: Record<TimelineFilter, string> = {
  todos: "Todos",
  manuais: "Manuais",
  oportunidades: "Oportunidades",
  processos: "Processos",
  sistema: "Sistema",
};
const MANUAL_TIPOS = new Set(["nota", "ligacao", "reuniao", "email", "visita"]);
function bucketFor(tipo: string): Exclude<TimelineFilter, "todos"> {
  if (MANUAL_TIPOS.has(tipo)) return "manuais";
  if (tipo.startsWith("oportunidade")) return "oportunidades";
  if (tipo.startsWith("processo")) return "processos";
  return "sistema";
}
const TIPO_LABEL: Record<string, string> = {
  documento_anexado: "documento anexado",
  documento_removido: "documento removido",
  socio_adicionado: "sócio adicionado",
  socio_removido: "sócio removido",
  geocoded: "geocodificado",
};

const searchSchema = z.object({
  tab: fallback(z.enum(["gestao", "time"]), "gestao").default("gestao"),
  sec: fallback(
    z.enum(["visao", "equipamentos", "rfq", "socios", "documentos", "timeline"]),
    "visao",
  ).default("visao"),
});

export const Route = createFileRoute("/_authenticated/clientes/$codigo")({
  validateSearch: zodValidator(searchSchema),
  loader: ({ context, params }) => {
    context.queryClient.ensureQueryData(clienteByCodigoQueryOptions(params.codigo));
    context.queryClient.ensureQueryData(paisesQueryOptions());
  },
  component: ClientePage,
});

function fmtMoney(v: number | null | undefined) {
  if (v == null) return "—";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(Number(v));
}
function fmtDate(d: string | null | undefined) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("pt-BR");
  } catch {
    return "—";
  }
}
function fmtDateTime(d: string | null | undefined) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return "—";
  }
}

function EmptyState({
  icon: Icon,
  title,
  hint,
  action,
}: {
  icon: any;
  title: string;
  hint?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
      <div className="grid h-10 w-10 place-items-center rounded-full bg-muted text-muted-foreground">
        <Icon className="h-5 w-5" />
      </div>
      <div className="text-[13px] font-medium text-foreground">{title}</div>
      {hint && <div className="max-w-sm text-[12px] text-muted-foreground">{hint}</div>}
      {action}
    </div>
  );
}

function ClientePage() {
  const { codigo } = Route.useParams();
  const { tab, sec } = Route.useSearch();
  const [showDetalhes, setShowDetalhes] = useState(false);
  const [novaOppOpen, setNovaOppOpen] = useState(false);
  const { canSee: canSeeSensivel } = useSensitiveAccess();

  const navigate = useNavigate({ from: Route.fullPath });
  const { data } = useSuspenseQuery(clienteByCodigoQueryOptions(codigo));
  const paises = useSuspenseQuery(paisesQueryOptions());
  const cliente = data.cliente;
  const contatos = data.contatos;
  const paisCfg = paises.data.find((p) => p.codigo === cliente.pais);
  const documentoFmt = paisCfg
    ? formatDocumento(cliente.documento_fiscal_numero, paisCfg.documento_mascara)
    : cliente.documento_fiscal_numero;

  const initials = cliente.razao_social
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const setTab = (next: TabId) =>
    navigate({
      search: (prev: Record<string, unknown>) => ({ ...prev, tab: next }),
      replace: true,
    });
  const setSec = (next: GestaoSecao) =>
    navigate({
      search: (prev: Record<string, unknown>) => ({ ...prev, tab: "gestao", sec: next }),
      replace: true,
    });

  return (
    <div className="w-full bg-muted/30 text-foreground">
      <main className="flex-1 overflow-y-auto">
        {/* Topbar */}
        <div className="sticky top-0 z-20 flex min-h-14 flex-wrap items-center gap-2 border-b border-border bg-card/85 px-4 py-2 backdrop-blur md:gap-3 md:px-6">
          <Link
            to="/clientes"
            className="flex items-center gap-1.5 rounded-md px-2 py-1 text-[12.5px] text-muted-foreground hover:bg-muted"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Clientes
          </Link>
          <ChevronRight className="hidden h-3.5 w-3.5 text-muted-foreground/60 sm:inline" />
          <span className="truncate text-[12.5px] font-medium text-foreground">
            {cliente.razao_social}
          </span>
          <ClienteStatusBadge
            status={cliente.status ?? cliente.lifecycle_stage}
            withLabel
            className="ml-2"
          />
          {cliente.key_account && (
            <Badge
              variant="outline"
              className="ml-1 hidden items-center gap-1 border-amber-300 bg-amber-50 text-amber-700 sm:inline-flex"
            >
              <Star className="h-3 w-3 fill-amber-500 stroke-amber-500" /> Key Account
            </Badge>
          )}
          <div className="ml-auto flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setNovaOppOpen(true)}>
              <Plus className="h-3.5 w-3.5" /> Nova oportunidade
            </Button>
            <NewOportunidadeDialog
              open={novaOppOpen}
              onOpenChange={setNovaOppOpen}
              clienteId={cliente.id}
              empresaNome={cliente.nome_fantasia || cliente.razao_social}
            />
          </div>
        </div>

        {/* Header */}
        <div className="px-4 pt-4 md:px-6 md:pt-5">
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm md:p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-5">
              <div className="flex items-start gap-4 lg:contents">
                <div
                  className="grid h-16 w-16 shrink-0 place-items-center rounded-xl text-xl font-bold text-white shadow-md md:h-20 md:w-20 md:text-2xl"
                  style={{ background: "linear-gradient(135deg,#1e3a8a,#3b82f6 60%,#06b6d4)" }}
                >
                  {initials}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="truncate text-[17px] font-semibold tracking-tight text-foreground md:text-[20px]">
                      {cliente.razao_social}
                    </h1>
                    <span className="rounded bg-muted px-1.5 py-0.5 text-[10.5px] font-mono text-muted-foreground">
                      #{cliente.codigo}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12.5px] text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <Building2 className="h-3.5 w-3.5" /> {cliente.segmento ?? "Segmento —"}
                    </span>
                    <AddressLine cliente={cliente} paisNome={paisCfg?.nome ?? cliente.pais} />
                    <button
                      type="button"
                      onClick={() => setShowDetalhes((v) => !v)}
                      className="inline-flex items-center gap-1 rounded px-1 text-[12px] font-medium text-foreground hover:underline"
                      aria-expanded={showDetalhes}
                    >
                      {showDetalhes ? "Menos detalhes" : "Mais detalhes"}
                    </button>
                  </div>
                  {showDetalhes && (
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12.5px] text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5">
                        <Hash className="h-3.5 w-3.5" /> {paisCfg?.documento_nome ?? "Doc"}{" "}
                        <RevealableValue
                          value={documentoFmt}
                          masked={maskDocumento(documentoFmt)}
                        />
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5" /> Desde {fmtDate(cliente.created_at)}
                      </span>
                    </div>
                  )}
                  {showDetalhes && (
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {cliente.telefone_corporativo_numero && (
                        <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1 text-[11.5px]">
                          <Phone className="h-3 w-3" />
                          <RevealableValue
                            value={`${cliente.telefone_corporativo_ddi ?? ""} ${cliente.telefone_corporativo_numero}`}
                            masked={maskPhone(cliente.telefone_corporativo_numero)}
                          />
                        </span>
                      )}
                      {cliente.email_corporativo &&
                        (canSeeSensivel ? (
                          <a
                            href={`mailto:${cliente.email_corporativo}`}
                            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1 text-[11.5px] hover:bg-muted/30"
                          >
                            <Mail className="h-3 w-3" />
                            {cliente.email_corporativo}
                          </a>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1 text-[11.5px]">
                            <Mail className="h-3 w-3" />
                            <RevealableValue
                              value={cliente.email_corporativo}
                              masked={maskEmail(cliente.email_corporativo)}
                            />
                          </span>
                        ))}
                      {cliente.site && (
                        <a
                          href={
                            cliente.site.startsWith("http")
                              ? cliente.site
                              : `https://${cliente.site}`
                          }
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1 text-[11.5px] hover:bg-muted/30"
                        >
                          <Globe className="h-3 w-3" />
                          {cliente.site}
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* KPIs reais */}
              <div className="grid grid-cols-2 gap-2 md:grid-cols-3 md:gap-3 lg:shrink-0">
                <KpiCard
                  label="Op. abertas"
                  value={String(cliente.oportunidades_abertas ?? 0)}
                  icon={Briefcase}
                  color="blue"
                />
                <KpiCard
                  label="Processos ativos"
                  value={`${cliente.processos_ativos ?? 0} / ${cliente.processos_total ?? 0}`}
                  icon={Factory}
                  color="violet"
                />
                <KpiCard
                  label="Último contato"
                  value={cliente.ultimo_contato_em ? fmtDate(cliente.ultimo_contato_em) : "—"}
                  icon={MessageSquare}
                  color="amber"
                />
              </div>
            </div>

            {/* Tabs */}
            <div className="mt-4 -mb-4 -mx-4 md:mt-5 md:-mb-5 md:-mx-5">
              <div className="px-4 pb-3 lg:hidden md:px-5">
                <Select value={tab} onValueChange={(v) => setTab(v as TabId)}>
                  <SelectTrigger className="h-10 w-full text-[13px] font-medium">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TABS.map((t) => (
                      <SelectItem key={t.id} value={t.id} className="text-[13px]">
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="hidden border-b border-border lg:block">
                <div className="flex items-center gap-1 px-5">
                  {TABS.map((t) => {
                    const active = tab === t.id;
                    return (
                      <button
                        key={t.id}
                        onClick={() => setTab(t.id)}
                        className={cn(
                          "relative shrink-0 px-3 py-2.5 text-[12.5px] font-medium whitespace-nowrap transition-colors",
                          active
                            ? "text-[var(--brand-blue,#1e40af)]"
                            : "text-muted-foreground hover:text-foreground",
                        )}
                      >
                        {t.label}
                        {active && (
                          <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-[var(--brand-blue,#1e40af)]" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="px-4 py-4 md:px-6 md:py-5">
          {tab === "gestao" && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-1.5">
                {GESTAO_SECOES.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSec(s.id)}
                    className={cn(
                      "rounded-full border px-3 py-1 text-[12px] font-medium transition-colors",
                      sec === s.id
                        ? "border-transparent bg-[var(--brand-blue,#1e40af)] text-white"
                        : "border-border bg-card text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
              {sec === "visao" && (
                <VisaoTab
                  clienteId={cliente.id}
                  contatosCount={contatos.length}
                  onGoToTab={setTab}
                />
              )}
              {sec === "equipamentos" && <EquipamentosTab clienteId={cliente.id} />}
              {sec === "rfq" && <ClienteRfqTab clienteId={cliente.id} />}
              {sec === "socios" && (
                <SensitiveOnly fallback={<RestrictedNotice what="Quadro societário" />}>
                  <SociosTab
                    clienteId={cliente.id}
                    socios={(data as any).socios ?? []}
                    codigo={cliente.codigo}
                  />
                </SensitiveOnly>
              )}
              {sec === "documentos" && (
                <SensitiveOnly
                  fallback={<RestrictedNotice what="Documentos e anexos do cliente" />}
                >
                  <DocumentosTab clienteId={cliente.id} />
                </SensitiveOnly>
              )}
              {sec === "timeline" && <TimelineTab clienteId={cliente.id} />}
            </div>
          )}
          {tab === "time" && (
            <div className="space-y-6">
              <ClienteTimeComercialTab clienteId={cliente.id} />
              <ContatosTab contatos={contatos} editHref={`/clientes/${cliente.codigo}`} />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function KpiCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: string;
  icon: any;
  color: "emerald" | "blue" | "violet" | "amber";
}) {
  return (
    <div className="rounded-lg border border-border bg-muted/30 px-3 py-2.5 lg:min-w-[140px]">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        <Icon
          className={cn(
            "h-3.5 w-3.5",
            color === "emerald" && "text-emerald-500",
            color === "blue" && "text-blue-500",
            color === "violet" && "text-violet-500",
            color === "amber" && "text-amber-500",
          )}
        />
      </div>
      <div className="mt-1 truncate text-[15px] font-semibold tabular-nums text-foreground">
        {value}
      </div>
    </div>
  );
}

function SectionCard({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-card shadow-sm">
      <div className="flex items-center justify-between border-b border-border px-5 py-3">
        <h2 className="text-[14px] font-semibold text-foreground">{title}</h2>
        {action}
      </div>
      <div>{children}</div>
    </section>
  );
}

/* -------- helpers de cores e KPIs (v0.22.0) -------- */

const OPP_STAGES = ["novo", "qualificado", "proposta", "negociacao", "ganho", "perdido"] as const;
type OppStage = (typeof OPP_STAGES)[number];

const OPP_STAGE_LABEL: Record<OppStage, string> = {
  novo: "Novo",
  qualificado: "Qualificado",
  proposta: "Proposta",
  negociacao: "Negociação",
  ganho: "Ganho",
  perdido: "Perdido",
};

const OPP_STAGE_COLOR: Record<OppStage, string> = {
  novo: "border-slate-200 bg-slate-50 text-slate-700",
  qualificado: "border-sky-200 bg-sky-50 text-sky-700",
  proposta: "border-indigo-200 bg-indigo-50 text-indigo-700",
  negociacao: "border-amber-200 bg-amber-50 text-amber-700",
  ganho: "border-emerald-200 bg-emerald-50 text-emerald-700",
  perdido: "border-rose-200 bg-rose-50 text-rose-700",
};

const PROC_STAGE_COLOR: Record<string, string> = {
  // Projeto
  Lead: "border-slate-200 bg-slate-50 text-slate-700",
  ETP: "border-sky-200 bg-sky-50 text-sky-700",
  Orçamento: "border-indigo-200 bg-indigo-50 text-indigo-700",
  OC: "border-violet-200 bg-violet-50 text-violet-700",
  "Eng. Mecânica": "border-indigo-200 bg-indigo-50 text-indigo-700",
  "Eng. Elétrica": "border-indigo-200 bg-indigo-50 text-indigo-700",
  Montagem: "border-orange-200 bg-orange-50 text-orange-700",
  FAT: "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700",
  Embarque: "border-cyan-200 bg-cyan-50 text-cyan-700",
  "Pós-venda": "border-teal-200 bg-teal-50 text-teal-700",
  // Atendimento
  Solicitação: "border-slate-200 bg-slate-50 text-slate-700",
  Análise: "border-sky-200 bg-sky-50 text-sky-700",
  Registro: "border-indigo-200 bg-indigo-50 text-indigo-700",
  Resolução: "border-amber-200 bg-amber-50 text-amber-700",
  Encerrado: "border-emerald-200 bg-emerald-50 text-emerald-700",
  // Instalação
  Preparação: "border-slate-200 bg-slate-50 text-slate-700",
  Agendamento: "border-sky-200 bg-sky-50 text-sky-700",
  Arranque: "border-amber-200 bg-amber-50 text-amber-700",
  Treinamento: "border-violet-200 bg-violet-50 text-violet-700",
  "Entrega Técnica": "border-emerald-200 bg-emerald-50 text-emerald-700",
};

function MiniKpi({
  label,
  value,
  sub,
  icon: Icon,
  color,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: any;
  color: "emerald" | "blue" | "violet" | "amber";
}) {
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2.5 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        <Icon
          className={cn(
            "h-3.5 w-3.5",
            color === "emerald" && "text-emerald-500",
            color === "blue" && "text-blue-500",
            color === "violet" && "text-violet-500",
            color === "amber" && "text-amber-500",
          )}
        />
      </div>
      <div className="mt-1 truncate text-[15px] font-semibold tabular-nums text-foreground">
        {value}
      </div>
      {sub && <div className="truncate text-[10.5px] text-muted-foreground">{sub}</div>}
    </div>
  );
}

/* -------------- AddressLine (com Maps + geocoding) -------------- */

type ClienteAddr = {
  id: string;
  endereco_logradouro?: string | null;
  endereco_numero?: string | null;
  endereco_bairro?: string | null;
  endereco_cidade?: string | null;
  endereco_estado?: string | null;
  endereco_codigo_postal?: string | null;
  pais: string;
  latitude?: number | null;
  longitude?: number | null;
  geocoded_at?: string | null;
};

function AddressLine({ cliente, paisNome }: { cliente: ClienteAddr; paisNome: string }) {
  const qc = useQueryClient();
  const display =
    [cliente.endereco_cidade, cliente.endereco_estado].filter(Boolean).join(" — ") || "—";
  const queryParts = [
    [cliente.endereco_logradouro, cliente.endereco_numero].filter(Boolean).join(", "),
    cliente.endereco_bairro,
    cliente.endereco_cidade,
    cliente.endereco_estado,
    cliente.endereco_codigo_postal,
    paisNome,
  ].filter(Boolean) as string[];
  const hasCoords = typeof cliente.latitude === "number" && typeof cliente.longitude === "number";
  const mapsHref = hasCoords
    ? `https://www.openstreetmap.org/?mlat=${cliente.latitude}&mlon=${cliente.longitude}#map=15/${cliente.latitude}/${cliente.longitude}`
    : queryParts.length > 0
      ? `https://www.openstreetmap.org/search?query=${encodeURIComponent(queryParts.join(", "))}`
      : null;
  const canGeocode = queryParts.length >= 2 && !hasCoords;

  const geoMut = useMutation({
    mutationFn: () => geocodeCliente({ data: { clienteId: cliente.id } }),
    onSuccess: (r) => {
      toast.success(`Geocodificado (${r.latitude.toFixed(4)}, ${r.longitude.toFixed(4)})`);
      qc.invalidateQueries({ queryKey: ["clientes", "detail-codigo"] });
      qc.invalidateQueries({ queryKey: ["clientes", cliente.id, "timeline"] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Falha ao geocodificar."),
  });

  const geoErrorMsg =
    geoMut.error instanceof Error
      ? geoMut.error.message
      : geoMut.isError
        ? "Falha ao geocodificar."
        : null;

  return (
    <span className="inline-flex items-center gap-1.5">
      <MapPin className="h-3.5 w-3.5" />
      <span>
        {display}, {paisNome}
      </span>
      {mapsHref && (
        <a
          href={mapsHref}
          target="_blank"
          rel="noreferrer"
          className="ml-1 inline-flex items-center gap-0.5 rounded border border-border bg-card px-1.5 py-0.5 text-[10.5px] text-muted-foreground hover:text-foreground"
          title={hasCoords ? "Abrir coordenadas no mapa" : "Buscar endereço no mapa"}
        >
          <Navigation className="h-3 w-3" />
          {hasCoords ? "Mapa" : "Buscar"}
        </a>
      )}
      {(canGeocode || geoMut.isError) && !geoMut.isPending && (
        <button
          type="button"
          onClick={() => geoMut.mutate()}
          className={cn(
            "inline-flex items-center gap-0.5 rounded border px-1.5 py-0.5 text-[10.5px] hover:text-foreground",
            geoMut.isError
              ? "border-destructive/40 bg-destructive/10 text-destructive hover:bg-destructive/15"
              : "border-border bg-card text-muted-foreground",
          )}
          title={geoErrorMsg ?? "Geocodificar via Nominatim e salvar lat/lng"}
        >
          {geoMut.isError ? (
            <>
              <AlertCircle className="h-3 w-3" />
              Tentar novamente
            </>
          ) : (
            "Geocodificar"
          )}
        </button>
      )}
      {geoMut.isPending && (
        <span
          className="inline-flex items-center gap-1 rounded border border-border bg-card px-1.5 py-0.5 text-[10.5px] text-muted-foreground"
          aria-live="polite"
        >
          <Loader2 className="h-3 w-3 animate-spin" />
          Geocodificando…
        </span>
      )}
      {hasCoords && cliente.geocoded_at && !geoMut.isPending && (
        <span
          className="inline-flex items-center gap-1 text-[10.5px] text-muted-foreground/80"
          title={`Última geocodificação: ${fmtDateTime(cliente.geocoded_at)}`}
        >
          <Clock className="h-3 w-3" />
          {fmtDateTime(cliente.geocoded_at)}
        </span>
      )}
      {geoErrorMsg && !geoMut.isPending && (
        <span className="text-[10.5px] text-destructive" role="alert">
          {geoErrorMsg}
        </span>
      )}
    </span>
  );
}

/* -------------- Tabs -------------- */

function VisaoTab({
  clienteId,
  contatosCount,
  onGoToTab,
}: {
  clienteId: string;
  contatosCount: number;
  onGoToTab: (t: TabId) => void;
}) {
  const equips = useQuery(clienteEquipamentosQueryOptions(clienteId));
  const procs = useQuery(clienteProcessosQueryOptions(clienteId));
  const docs = useQuery(clienteDocumentosQueryOptions(clienteId));
  const orcamentos = useQuery(clienteOrcamentosQueryOptions(clienteId));
  const timeline = useQuery(clienteTimelineQueryOptions(clienteId));
  const [selected, setSelected] = useState<EquipamentoRow | null>(null);
  const qcVisao = useQueryClient();
  const aprovarMut = useMutation({
    mutationFn: (id: string) => approveDocument({ data: { documento_id: id } }),
    onSuccess: () => {
      toast.success("Orçamento aprovado — equipamentos gerados na ficha do cliente.");
      qcVisao.invalidateQueries({ queryKey: ["clientes", clienteId] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Não foi possível aprovar o orçamento."),
  });

  return (
    <div className="grid grid-cols-12 gap-4 md:gap-5">
      <div className="col-span-12 space-y-5 lg:col-span-8">
        <SectionCard
          title="Equipamentos do cliente"
          action={
            <span className="text-[11px] text-muted-foreground">
              {equips.data?.length ?? 0} no total
            </span>
          }
        >
          {equips.isLoading ? (
            <div className="p-5 text-[12px] text-muted-foreground">Carregando…</div>
          ) : (equips.data?.length ?? 0) === 0 ? (
            <EmptyState
              icon={Wrench}
              title="Nenhum equipamento"
              hint="Cadastre os equipamentos deste cliente — engenharia, produção, qualidade ou operação."
            />
          ) : (
            <ul className="divide-y divide-border">
              {equips.data!.slice(0, 5).map((e) => {
                const status = e.status as EquipamentoStatus;
                return (
                  <li
                    key={e.id}
                    className="flex cursor-pointer items-center gap-3 px-5 py-3 hover:bg-muted/30"
                    onClick={() => setSelected(e as unknown as EquipamentoRow)}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10.5px] text-muted-foreground">
                          {e.codigo ?? "—"}
                        </span>
                        <Badge
                          variant="outline"
                          className={cn("text-[10px]", EQUIPAMENTO_STATUS_COLOR[status])}
                        >
                          {EQUIPAMENTO_STATUS_LABEL[status] ?? status}
                        </Badge>
                      </div>
                      <div className="truncate text-[12.5px] font-medium">{e.modelo}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {EQUIPAMENTO_CATEGORIA_LABEL[e.categoria as EquipamentoCategoria] ??
                          e.categoria}
                        {e.localizacao ? ` · ${e.localizacao}` : ""}
                      </div>
                    </div>
                    <div className="text-right text-[12px] tabular-nums">
                      {fmtMoney(e.valor_venda)}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </SectionCard>

        <SectionCard
          title="Processos recentes"
          action={
            <span className="text-[11px] text-muted-foreground">
              {procs.data?.length ?? 0} no total
            </span>
          }
        >
          {procs.isLoading ? (
            <div className="p-5 text-[12px] text-muted-foreground">Carregando…</div>
          ) : (procs.data?.length ?? 0) === 0 ? (
            <EmptyState
              icon={Factory}
              title="Sem processos"
              hint="Os processos aparecerão aqui quando forem abertos."
            />
          ) : (
            <ul className="divide-y divide-border">
              {procs.data!.slice(0, 5).map((p) => (
                <li key={p.id} className="flex items-center gap-3 px-5 py-3 hover:bg-muted/30">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10.5px] text-muted-foreground">
                        {p.codigo}
                      </span>
                      <Badge variant="outline" className="text-[10px] capitalize">
                        {p.stage}
                      </Badge>
                      {p.lost_at && (
                        <Badge
                          variant="outline"
                          className="text-[10px] border-rose-200 text-rose-700"
                        >
                          arquivado
                        </Badge>
                      )}
                    </div>
                    <div className="truncate text-[12.5px] font-medium">{p.titulo}</div>
                  </div>
                  <div className="text-right text-[12px] tabular-nums text-muted-foreground">
                    {p.progresso}%
                  </div>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard
          title="Orçamentos"
          action={
            <span className="text-[11px] text-muted-foreground">
              {orcamentos.data?.length ?? 0} no total
            </span>
          }
        >
          {orcamentos.isLoading ? (
            <div className="p-5 text-[12px] text-muted-foreground">Carregando…</div>
          ) : (orcamentos.data?.length ?? 0) === 0 ? (
            <EmptyState
              icon={FileText}
              title="Nenhum orçamento"
              hint="Gere o primeiro orçamento deste cliente em Comercial → Orçamentos."
            />
          ) : (
            <ul className="divide-y divide-border">
              {orcamentos.data!.slice(0, 8).map((o: any) => {
                const ORC_STATUS_META: Record<string, { label: string; cls: string }> = {
                  rascunho: {
                    label: "Rascunho",
                    cls: "bg-slate-100 text-slate-700 border-slate-200",
                  },
                  emitido: {
                    label: "Emitido",
                    cls: "bg-slate-100 text-slate-700 border-slate-200",
                  },
                  em_revisao: {
                    label: "Em revisão",
                    cls: "bg-amber-50 text-amber-800 border-amber-200",
                  },
                  aprovado: {
                    label: "Aprovado",
                    cls: "bg-emerald-50 text-emerald-800 border-emerald-200",
                  },
                  publicado: { label: "Publicado", cls: "bg-sky-50 text-sky-800 border-sky-200" },
                  arquivado: {
                    label: "Arquivado",
                    cls: "bg-rose-50 text-rose-800 border-rose-200",
                  },
                };
                const sm = ORC_STATUS_META[o.status] ?? { label: o.status, cls: "" };
                return (
                  <li key={o.id} className="flex items-center gap-3 px-5 py-3 hover:bg-muted/30">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Link
                          to="/documentos/$id"
                          params={{ id: o.id }}
                          className="font-mono text-[10.5px] text-muted-foreground hover:underline"
                        >
                          {o.codigo}
                        </Link>
                        <Badge variant="outline" className={cn("text-[10px]", sm.cls)}>
                          {sm.label}
                        </Badge>
                        <span className="font-mono text-[10.5px] text-muted-foreground">
                          v{o.versao}
                        </span>
                      </div>
                      <div className="truncate text-[12.5px] font-medium">
                        {o.titulo || "Sem título"}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {fmtDateTime(o.created_at)}
                      </div>
                    </div>
                    {["rascunho", "emitido", "em_revisao"].includes(o.status) && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 shrink-0 text-[11px]"
                        disabled={aprovarMut.isPending}
                        onClick={() => aprovarMut.mutate(o.id)}
                      >
                        Marcar como aprovado
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </SectionCard>
      </div>

      <aside className="col-span-12 space-y-5 lg:col-span-4">
        <SectionCard
          title="Contatos-chave"
          action={<span className="text-[11px] text-muted-foreground">{contatosCount}</span>}
        >
          {contatosCount === 0 ? (
            <EmptyState icon={Users} title="Sem contatos cadastrados" />
          ) : (
            <div className="px-5 py-3 text-[12px] text-muted-foreground">
              Veja a aba{" "}
              <button
                type="button"
                className="font-medium text-foreground hover:underline"
                onClick={() => onGoToTab("time")}
              >
                Contatos
              </button>{" "}
              para detalhes.
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="Documentos recentes"
          action={
            <span className="text-[11px] text-muted-foreground">{docs.data?.length ?? 0}</span>
          }
        >
          {(docs.data?.length ?? 0) === 0 ? (
            <EmptyState icon={FileText} title="Sem documentos" />
          ) : (
            <ul className="divide-y divide-border">
              {docs.data!.slice(0, 5).map((d) => (
                <li key={d.id} className="flex items-center gap-3 px-5 py-2.5 text-[12px]">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <div className="min-w-0 flex-1 truncate">{d.nome_final}</div>
                  {d.drive_view_url && (
                    <a
                      href={d.drive_view_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard title="Últimas atividades">
          {(timeline.data?.length ?? 0) === 0 ? (
            <EmptyState icon={Inbox} title="Sem atividades registradas" />
          ) : (
            <ul className="divide-y divide-border">
              {timeline.data!.slice(0, 5).map((t) => (
                <li key={t.id} className="px-5 py-2.5 text-[12px]">
                  <div className="font-medium text-foreground">{t.titulo}</div>
                  <div className="text-muted-foreground">
                    {fmtDateTime(t.ts)}
                    {t.user_nome ? ` · ${t.user_nome}` : ""}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </aside>

      <EquipamentoDrawer
        open={!!selected}
        onClose={() => setSelected(null)}
        equipamento={selected}
      />
    </div>
  );
}

function EquipamentosTab({ clienteId }: { clienteId: string }) {
  const qc = useQueryClient();
  const nav = useNavigate();
  const { data, isLoading } = useQuery(clienteEquipamentosQueryOptions(clienteId));
  const [faseFilter, setFaseFilter] = useState<EquipamentoFase | "todos">("todos");
  const [categoriaFilter, setCategoriaFilter] = useState<EquipamentoCategoria | "todos">("todos");
  const [query, setQuery] = useState("");
  const [openNew, setOpenNew] = useState(false);
  const [openWizard, setOpenWizard] = useState(false);
  const [selected, setSelected] = useState<EquipamentoRow | null>(null);

  const createMut = useMutation({
    mutationFn: (input: NovoEquipamentoInput) => createEquipamento({ data: input }),
    onSuccess: () => {
      toast.success("Equipamento adicionado.");
      qc.invalidateQueries({ queryKey: ["clientes", clienteId, "equipamentos"] });
      setOpenNew(false);
    },
    onError: (e: any) => toast.error(e?.message ?? "Falha ao adicionar."),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => softDeleteEquipamento({ data: { id } }),
    onSuccess: () => {
      toast.success("Equipamento removido.");
      qc.invalidateQueries({ queryKey: ["clientes", clienteId, "equipamentos"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Falha ao remover."),
  });

  if (isLoading) return <div className="text-[12px] text-muted-foreground">Carregando…</div>;

  const list = data ?? [];
  const total = list.length;
  const emOperacao = list.filter((e) => e.status === "operacional").length;
  const emEngenharia = list.filter(
    (e) => EQUIPAMENTO_STATUS_FASE[e.status as EquipamentoStatus] === "engenharia",
  ).length;
  const emProducao = list.filter(
    (e) => EQUIPAMENTO_STATUS_FASE[e.status as EquipamentoStatus] === "producao",
  ).length;
  const emQualidade = list.filter(
    (e) => EQUIPAMENTO_STATUS_FASE[e.status as EquipamentoStatus] === "qualidade",
  ).length;
  const emManutencao = list.filter((e) => e.status === "manutencao").length;
  const valorTotal = list.reduce((s, e) => s + Number(e.valor_venda ?? 0), 0);
  const garantiasExpirando = list.filter(
    (e) => garantiaStatus(e.data_garantia_fim) === "expirando",
  ).length;

  const q = query.trim().toLowerCase();
  const filtered = list.filter((e) => {
    if (
      faseFilter !== "todos" &&
      EQUIPAMENTO_STATUS_FASE[e.status as EquipamentoStatus] !== faseFilter
    )
      return false;
    if (categoriaFilter !== "todos" && e.categoria !== categoriaFilter) return false;
    if (!q) return true;
    return (
      (e.modelo ?? "").toLowerCase().includes(q) ||
      (e.codigo ?? "").toLowerCase().includes(q) ||
      (e.numero_serie ?? "").toLowerCase().includes(q) ||
      (e.tag_cliente ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 md:grid-cols-5 md:gap-3">
        <MiniKpi label="Total" value={String(total)} sub="equipamentos" icon={Cog} color="blue" />
        <MiniKpi
          label="Em operação"
          value={String(emOperacao)}
          sub={total ? `${Math.round((emOperacao / total) * 100)}%` : "—"}
          icon={ShieldCheck}
          color="emerald"
        />
        <MiniKpi
          label="Em fabricação"
          value={String(emProducao)}
          sub={`${emEngenharia} engenharia · ${emQualidade} qualidade`}
          icon={Factory}
          color="blue"
        />
        <MiniKpi
          label="Em manutenção"
          value={String(emManutencao)}
          sub="operação"
          icon={Wrench}
          color="amber"
        />
        <MiniKpi
          label="Valor total"
          value={fmtMoney(valorTotal)}
          sub="todos equipamentos"
          icon={DollarSign}
          color="violet"
        />
        <MiniKpi
          label="Garantias expirando"
          value={String(garantiasExpirando)}
          sub="≤ 60 dias"
          icon={ShieldAlert}
          color="amber"
        />
      </div>

      <SectionCard
        title={`Equipamentos (${filtered.length}/${total})`}
        action={
          <div className="flex items-center gap-2">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar modelo, série, código…"
              className="h-8 w-52 text-[12px]"
            />
            <Button
              size="sm"
              variant="outline"
              className="h-8"
              onClick={() =>
                nav({ to: "/comercial/orcamento/novo", search: { cliente: clienteId } })
              }
            >
              <FileText className="h-3.5 w-3.5" /> Criar orçamento
            </Button>
            <Button size="sm" variant="ghost" className="h-8" onClick={() => setOpenWizard(true)}>
              <Sparkles className="h-3.5 w-3.5" /> De orçamento aprovado
            </Button>
            <Button size="sm" className="h-8" onClick={() => setOpenNew(true)}>
              <Plus className="h-3.5 w-3.5" /> Adicionar
            </Button>
          </div>
        }
      >
        {total === 0 ? (
          <EmptyState
            icon={Wrench}
            title="Nenhum equipamento cadastrado"
            hint="Cadastre os equipamentos do cliente — da engenharia ao pós-venda."
            action={
              <Button size="sm" variant="outline" className="mt-2" onClick={() => setOpenNew(true)}>
                <Plus className="h-3.5 w-3.5" /> Adicionar equipamento
              </Button>
            }
          />
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-1.5 border-b border-border bg-muted/20 px-5 py-2.5">
              {(["todos", ...EQUIPAMENTO_FASES] as const).map((s) => {
                const active = faseFilter === s;
                const label = s === "todos" ? "Todas fases" : EQUIPAMENTO_FASE_LABEL[s];
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setFaseFilter(s)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] transition-colors",
                      active
                        ? "border-[var(--brand-blue,#1e40af)] bg-[var(--brand-blue,#1e40af)]/10 text-[var(--brand-blue,#1e40af)]"
                        : "border-border bg-card text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {label}
                  </button>
                );
              })}
              <span className="mx-2 h-4 w-px bg-border" />
              <Select value={categoriaFilter} onValueChange={(v) => setCategoriaFilter(v as any)}>
                <SelectTrigger className="h-7 w-48 text-[11px]">
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas categorias</SelectItem>
                  {EQUIPAMENTO_CATEGORIAS.map((c) => (
                    <SelectItem key={c} value={c}>
                      {EQUIPAMENTO_CATEGORIA_LABEL[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {filtered.length === 0 ? (
              <EmptyState
                icon={Filter}
                title="Nenhum equipamento no filtro"
                hint="Ajuste a busca ou os filtros."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-[12.5px]">
                  <thead className="bg-muted/40 text-[11px] uppercase text-muted-foreground">
                    <tr>
                      <th className="px-4 py-2 text-left">Código</th>
                      <th className="px-4 py-2 text-left">Modelo</th>
                      <th className="px-4 py-2 text-left">Categoria</th>
                      <th className="px-4 py-2 text-left">Fase</th>
                      <th className="px-4 py-2 text-left">Status</th>
                      <th className="px-4 py-2 text-left">Série / Tag</th>
                      <th className="px-4 py-2 text-left">Garantia</th>
                      <th className="px-4 py-2 text-right">Valor</th>
                      <th className="px-4 py-2"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filtered.map((e) => {
                      const status = e.status as EquipamentoStatus;
                      const cat = e.categoria as EquipamentoCategoria;
                      const fase = EQUIPAMENTO_STATUS_FASE[status];
                      const garStat = garantiaStatus(e.data_garantia_fim);
                      return (
                        <tr
                          key={e.id}
                          className="cursor-pointer hover:bg-muted/20"
                          onClick={() => setSelected(e as unknown as EquipamentoRow)}
                        >
                          <td className="px-4 py-2 font-mono text-[11.5px] text-muted-foreground">
                            {e.codigo ?? "—"}
                          </td>
                          <td className="px-4 py-2">
                            <div className="font-medium">{e.modelo}</div>
                            {e.localizacao && (
                              <div className="text-[11px] text-muted-foreground">
                                {e.localizacao}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-2 text-muted-foreground">
                            {EQUIPAMENTO_CATEGORIA_LABEL[cat] ?? cat}
                          </td>
                          <td className="px-4 py-2 text-[11.5px] text-muted-foreground">
                            {EQUIPAMENTO_FASE_LABEL[fase]}
                          </td>
                          <td className="px-4 py-2">
                            <Badge
                              variant="outline"
                              className={cn(EQUIPAMENTO_STATUS_COLOR[status])}
                            >
                              {EQUIPAMENTO_STATUS_LABEL[status] ?? status}
                            </Badge>
                          </td>
                          <td className="px-4 py-2 text-[11.5px] text-muted-foreground">
                            {e.numero_serie ?? "—"}
                            {e.tag_cliente ? ` · ${e.tag_cliente}` : ""}
                          </td>
                          <td className="px-4 py-2 text-[11.5px]">
                            {e.data_garantia_fim ? (
                              <span
                                className={cn(
                                  "inline-flex items-center gap-1",
                                  garStat === "ativa" && "text-emerald-700",
                                  garStat === "expirando" && "text-amber-700",
                                  garStat === "expirada" && "text-rose-700",
                                )}
                              >
                                {garStat === "expirada" ? (
                                  <ShieldAlert className="h-3 w-3" />
                                ) : (
                                  <ShieldCheck className="h-3 w-3" />
                                )}
                                {fmtDate(e.data_garantia_fim)}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="px-4 py-2 text-right tabular-nums">
                            {fmtMoney(e.valor_venda)}
                          </td>
                          <td className="px-4 py-2 text-right">
                            <button
                              onClick={(ev) => {
                                ev.stopPropagation();
                                if (confirm(`Remover equipamento ${e.codigo}?`))
                                  deleteMut.mutate(e.id);
                              }}
                              className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-rose-700"
                              title="Remover"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </SectionCard>

      <NovoEquipamentoDialog
        open={openNew}
        onClose={() => setOpenNew(false)}
        onSubmit={(input) => createMut.mutate({ ...input, clienteId })}
        loading={createMut.isPending}
      />

      <EquipamentoDrawer
        open={!!selected}
        onClose={() => setSelected(null)}
        equipamento={selected}
      />

      <CriarEquipamentoWizard
        open={openWizard}
        onClose={() => setOpenWizard(false)}
        clienteId={clienteId}
      />
    </div>
  );
}

function NovoEquipamentoDialog({
  open,
  onClose,
  onSubmit,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (input: Omit<NovoEquipamentoInput, "clienteId">) => void;
  loading: boolean;
}) {
  const [form, setForm] = useState({
    modelo: "",
    fabricante: "Solutek",
    numero_serie: "",
    tag_cliente: "",
    categoria: "outro" as EquipamentoCategoria,
    status: "planejamento" as EquipamentoStatus,
    data_entrega: "",
    data_instalacao: "",
    data_garantia_fim: "",
    localizacao: "",
    valor_venda: "",
    observacoes: "",
  });
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-xl border border-border bg-card p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[15px] font-semibold">Adicionar equipamento</h2>
          <button onClick={onClose} className="rounded p-1 text-muted-foreground hover:bg-muted">
            ✕
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 text-[12.5px]">
          <label className="col-span-2 space-y-1">
            <span className="text-muted-foreground">Modelo *</span>
            <Input
              value={form.modelo}
              onChange={(e) => setForm({ ...form, modelo: e.target.value })}
              placeholder="Ex.: Envasadora STK-Fill 8000"
            />
          </label>
          <label className="space-y-1">
            <span className="text-muted-foreground">Categoria</span>
            <Select
              value={form.categoria}
              onValueChange={(v) => setForm({ ...form, categoria: v as EquipamentoCategoria })}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EQUIPAMENTO_CATEGORIAS.map((c) => (
                  <SelectItem key={c} value={c}>
                    {EQUIPAMENTO_CATEGORIA_LABEL[c]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          <label className="space-y-1">
            <span className="text-muted-foreground">Status</span>
            <Select
              value={form.status}
              onValueChange={(v) => setForm({ ...form, status: v as EquipamentoStatus })}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EQUIPAMENTO_STATUS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {EQUIPAMENTO_STATUS_LABEL[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          <label className="space-y-1">
            <span className="text-muted-foreground">Nº de série</span>
            <Input
              value={form.numero_serie}
              onChange={(e) => setForm({ ...form, numero_serie: e.target.value })}
            />
          </label>
          <label className="space-y-1">
            <span className="text-muted-foreground">Tag do cliente</span>
            <Input
              value={form.tag_cliente}
              onChange={(e) => setForm({ ...form, tag_cliente: e.target.value })}
            />
          </label>
          <label className="space-y-1">
            <span className="text-muted-foreground">Data entrega</span>
            <Input
              type="date"
              value={form.data_entrega}
              onChange={(e) => setForm({ ...form, data_entrega: e.target.value })}
            />
          </label>
          <label className="space-y-1">
            <span className="text-muted-foreground">Data instalação</span>
            <Input
              type="date"
              value={form.data_instalacao}
              onChange={(e) => setForm({ ...form, data_instalacao: e.target.value })}
            />
          </label>
          <label className="space-y-1">
            <span className="text-muted-foreground">Fim da garantia</span>
            <Input
              type="date"
              value={form.data_garantia_fim}
              onChange={(e) => setForm({ ...form, data_garantia_fim: e.target.value })}
            />
          </label>
          <label className="space-y-1">
            <span className="text-muted-foreground">Valor de venda (R$)</span>
            <Input
              type="number"
              value={form.valor_venda}
              onChange={(e) => setForm({ ...form, valor_venda: e.target.value })}
            />
          </label>
          <label className="col-span-2 space-y-1">
            <span className="text-muted-foreground">Localização</span>
            <Input
              value={form.localizacao}
              onChange={(e) => setForm({ ...form, localizacao: e.target.value })}
              placeholder="Ex.: Linha 1 - Planta SP"
            />
          </label>
          <label className="col-span-2 space-y-1">
            <span className="text-muted-foreground">Observações</span>
            <Textarea
              rows={3}
              value={form.observacoes}
              onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
            />
          </label>
        </div>

        <div className="mt-4 flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button
            size="sm"
            disabled={loading || form.modelo.trim().length < 2}
            onClick={() =>
              onSubmit({
                modelo: form.modelo.trim(),
                fabricante: form.fabricante.trim() || "Solutek",
                numero_serie: form.numero_serie.trim() || null,
                tag_cliente: form.tag_cliente.trim() || null,
                categoria: form.categoria,
                status: form.status,
                data_entrega: form.data_entrega || null,
                data_instalacao: form.data_instalacao || null,
                data_garantia_fim: form.data_garantia_fim || null,
                localizacao: form.localizacao.trim() || null,
                valor_venda: form.valor_venda ? Number(form.valor_venda) : null,
                observacoes: form.observacoes.trim() || null,
              })
            }
          >
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Plus className="h-3.5 w-3.5" />
            )}{" "}
            Adicionar
          </Button>
        </div>
      </div>
    </div>
  );
}

type ContatoFilter = "todos" | "principal" | "com_email" | "com_telefone";
const CONTATO_FILTER_LABEL: Record<ContatoFilter, string> = {
  todos: "Todos",
  principal: "Principais",
  com_email: "Com e-mail",
  com_telefone: "Com telefone",
};

function ContatosTab({ contatos, editHref: _editHref }: { contatos: any[]; editHref: string }) {
  const [filter, setFilter] = useState<ContatoFilter>("todos");
  const [query, setQuery] = useState("");

  if (contatos.length === 0)
    return (
      <SectionCard title="Contatos">
        <EmptyState
          icon={Users}
          title="Sem contatos"
          hint="Adicione contatos editando o cadastro do cliente."
        />
      </SectionCard>
    );

  const total = contatos.length;
  const comEmail = contatos.filter((c) => !!c.email).length;
  const comTelefone = contatos.filter((c) => !!c.telefone_numero).length;
  const principais = contatos.filter((c) => c.principal).length;

  const counts: Record<ContatoFilter, number> = {
    todos: total,
    principal: principais,
    com_email: comEmail,
    com_telefone: comTelefone,
  };

  const q = query.trim().toLowerCase();
  const filtered = contatos
    .filter((c) => {
      if (filter === "principal" && !c.principal) return false;
      if (filter === "com_email" && !c.email) return false;
      if (filter === "com_telefone" && !c.telefone_numero) return false;
      if (!q) return true;
      return (
        String(c.nome ?? "")
          .toLowerCase()
          .includes(q) ||
        String(c.cargo ?? "")
          .toLowerCase()
          .includes(q) ||
        String(c.email ?? "")
          .toLowerCase()
          .includes(q)
      );
    })
    .sort((a, b) =>
      a.principal === b.principal
        ? String(a.nome).localeCompare(String(b.nome))
        : a.principal
          ? -1
          : 1,
    );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-3">
        <MiniKpi
          label="Total"
          value={String(total)}
          sub={`${principais} principais`}
          icon={Users}
          color="blue"
        />
        <MiniKpi
          label="Principais"
          value={String(principais)}
          sub="marcados como chave"
          icon={Star}
          color="amber"
        />
        <MiniKpi
          label="Com e-mail"
          value={String(comEmail)}
          sub={total ? `${Math.round((comEmail / total) * 100)}% cobertura` : "—"}
          icon={Mail}
          color="emerald"
        />
        <MiniKpi
          label="Com telefone"
          value={String(comTelefone)}
          sub={total ? `${Math.round((comTelefone / total) * 100)}% cobertura` : "—"}
          icon={Phone}
          color="violet"
        />
      </div>

      <SectionCard
        title={`Contatos (${filtered.length}/${total})`}
        action={
          <div className="flex items-center gap-2">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar nome, cargo, e-mail…"
              className="h-8 w-56 text-[12px]"
            />
          </div>
        }
      >
        <div className="flex flex-wrap items-center gap-1.5 border-b border-border bg-muted/20 px-5 py-2.5">
          {(["todos", "principal", "com_email", "com_telefone"] as ContatoFilter[]).map((f) => {
            const active = filter === f;
            return (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] transition-colors",
                  active
                    ? "border-[var(--brand-blue,#1e40af)] bg-[var(--brand-blue,#1e40af)]/10 text-[var(--brand-blue,#1e40af)]"
                    : "border-border bg-card text-muted-foreground hover:text-foreground",
                )}
              >
                {CONTATO_FILTER_LABEL[f]}
                <span
                  className={cn(
                    "rounded px-1 text-[10px] tabular-nums",
                    active ? "bg-[var(--brand-blue,#1e40af)]/15" : "bg-muted",
                  )}
                >
                  {counts[f]}
                </span>
              </button>
            );
          })}
        </div>
        {filtered.length === 0 ? (
          <EmptyState
            icon={Filter}
            title="Nenhum contato no filtro"
            hint="Ajuste a busca ou o filtro acima."
          />
        ) : (
          <ul className="divide-y divide-border">
            {filtered.map((c) => {
              const tel = [c.telefone_ddi, c.telefone_numero].filter(Boolean).join(" ");
              return (
                <li key={c.id} className="flex items-center gap-3 px-5 py-3 hover:bg-muted/20">
                  <div
                    className={cn(
                      "grid h-9 w-9 shrink-0 place-items-center rounded-full text-[11px] font-bold text-white",
                      c.principal
                        ? "bg-gradient-to-br from-amber-500 to-amber-700"
                        : "bg-gradient-to-br from-slate-700 to-slate-900",
                    )}
                  >
                    {String(c.nome)
                      .split(" ")
                      .map((n: string) => n[0])
                      .slice(0, 2)
                      .join("")}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-[12.5px] font-semibold">{c.nome}</span>
                      {c.principal && (
                        <Badge
                          variant="outline"
                          className="border-amber-200 bg-amber-50 text-amber-700 text-[10px]"
                        >
                          Principal
                        </Badge>
                      )}
                    </div>
                    <div className="truncate text-[11px] text-muted-foreground">
                      {c.cargo ?? "—"}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-1.5">
                    {tel && (
                      <a
                        href={`tel:${tel.replace(/\s+/g, "")}`}
                        className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground"
                      >
                        <Phone className="h-3 w-3" /> {tel}
                      </a>
                    )}
                    {c.email && (
                      <a
                        href={`mailto:${c.email}`}
                        className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground"
                      >
                        <Mail className="h-3 w-3" /> {c.email}
                      </a>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const res = (r.result as string) || "";
      resolve(res.includes(",") ? res.split(",", 2)[1] : res);
    };
    r.onerror = () => reject(new Error("Falha ao ler arquivo"));
    r.readAsDataURL(file);
  });
}

function formatBytes(n: number | null | undefined) {
  if (!n) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

function DocumentosTab({ clienteId }: { clienteId: string }) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery(clienteDocumentosQueryOptions(clienteId));
  const [categoria, setCategoria] = useState<(typeof CLIENTE_DOC_CATEGORIAS)[number]>("outro");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [catFilter, setCatFilter] = useState<"todos" | (typeof CLIENTE_DOC_CATEGORIAS)[number]>(
    "todos",
  );
  const [query, setQuery] = useState("");
  const [confirmDoc, setConfirmDoc] = useState<{ id: string; nome: string } | null>(null);

  const uploadMut = useMutation({
    mutationFn: async (file: File) => {
      const b64 = await fileToBase64(file);
      const chosen = file.name.replace(/\.[^.]+$/, "").slice(0, 100) || "arquivo";
      return uploadClienteDocumento({
        data: {
          cliente_id: clienteId,
          filename: file.name,
          mime_type: file.type || "application/octet-stream",
          size_bytes: file.size,
          data_base64: b64,
          chosen_name: chosen,
          categoria,
        },
      });
    },
    onMutate: () => setUploading(true),
    onSettled: () => setUploading(false),
    onSuccess: () => {
      toast.success("Documento enviado para o Drive");
      qc.invalidateQueries({ queryKey: ["clientes", clienteId, "documentos"] });
      qc.invalidateQueries({ queryKey: ["clientes", clienteId, "timeline"] });
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => removerClienteDocumento({ data: { id } }),
    onSuccess: (_r, _id) => {
      toast.success(`"${confirmDoc?.nome ?? "Documento"}" removido`);
      setConfirmDoc(null);
      qc.invalidateQueries({ queryKey: ["clientes", clienteId, "documentos"] });
      qc.invalidateQueries({ queryKey: ["clientes", clienteId, "timeline"] });
    },
    onError: (e: Error) => toast.error(e.message ?? "Falha ao remover documento"),
  });

  const docs = data ?? [];
  const totalSize = docs.reduce((s, d) => s + Number(d.size_bytes ?? 0), 0);
  const ultimo = docs.reduce<string | null>((acc, d) => {
    const t = d.created_at;
    if (!acc) return t;
    return new Date(t) > new Date(acc) ? t : acc;
  }, null);
  const catCounts: Record<string, number> = { todos: docs.length };
  for (const c of CLIENTE_DOC_CATEGORIAS) catCounts[c] = 0;
  for (const d of docs) catCounts[d.categoria] = (catCounts[d.categoria] ?? 0) + 1;
  const qstr = query.trim().toLowerCase();
  const filtered = docs
    .filter((d) => {
      if (catFilter !== "todos" && d.categoria !== catFilter) return false;
      if (!qstr) return true;
      return (
        String(d.nome_final ?? "")
          .toLowerCase()
          .includes(qstr) ||
        String(d.nome_original ?? "")
          .toLowerCase()
          .includes(qstr)
      );
    })
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-3">
        <MiniKpi
          label="Arquivos"
          value={String(docs.length)}
          sub={ultimo ? `último em ${fmtDate(ultimo)}` : "—"}
          icon={FileText}
          color="blue"
        />
        <MiniKpi
          label="Tamanho total"
          value={formatBytes(totalSize)}
          sub="somatório no Drive"
          icon={Upload}
          color="violet"
        />
        <MiniKpi
          label="Categorias"
          value={String(CLIENTE_DOC_CATEGORIAS.filter((c) => (catCounts[c] ?? 0) > 0).length)}
          sub={`de ${CLIENTE_DOC_CATEGORIAS.length} possíveis`}
          icon={Filter}
          color="emerald"
        />
        <MiniKpi
          label="Em filtro"
          value={String(filtered.length)}
          sub={
            catFilter === "todos" ? "todas as categorias" : CLIENTE_DOC_CATEGORIA_LABEL[catFilter]
          }
          icon={Filter}
          color="amber"
        />
      </div>

      <SectionCard
        title={`Documentos (${filtered.length}/${docs.length})`}
        action={
          <div className="flex items-center gap-2">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar nome…"
              className="h-8 w-44 text-[12px]"
            />
            <Select value={categoria} onValueChange={(v) => setCategoria(v as typeof categoria)}>
              <SelectTrigger className="h-8 w-[180px] text-[12px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CLIENTE_DOC_CATEGORIAS.map((c) => (
                  <SelectItem key={c} value={c} className="text-[12.5px]">
                    {CLIENTE_DOC_CATEGORIA_LABEL[c]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.zip,application/pdf,image/jpeg,image/png,application/zip"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) uploadMut.mutate(f);
              }}
            />
            <Button size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
              <Upload className="h-3.5 w-3.5" />
              {uploading ? "Enviando…" : "Enviar"}
            </Button>
          </div>
        }
      >
        <div className="flex flex-wrap items-center gap-1.5 border-b border-border bg-muted/20 px-5 py-2.5">
          {(["todos", ...CLIENTE_DOC_CATEGORIAS] as const).map((c) => {
            const active = catFilter === c;
            const label = c === "todos" ? "Todas" : CLIENTE_DOC_CATEGORIA_LABEL[c];
            return (
              <button
                key={c}
                type="button"
                onClick={() => setCatFilter(c)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] transition-colors",
                  active
                    ? "border-[var(--brand-blue,#1e40af)] bg-[var(--brand-blue,#1e40af)]/10 text-[var(--brand-blue,#1e40af)]"
                    : "border-border bg-card text-muted-foreground hover:text-foreground",
                )}
              >
                {label}
                <span
                  className={cn(
                    "rounded px-1 text-[10px] tabular-nums",
                    active ? "bg-[var(--brand-blue,#1e40af)]/15" : "bg-muted",
                  )}
                >
                  {catCounts[c] ?? 0}
                </span>
              </button>
            );
          })}
        </div>
        {isLoading ? (
          <div className="p-5 text-[12px] text-muted-foreground">Carregando…</div>
        ) : docs.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="Sem documentos"
            hint="Selecione a categoria e clique em Enviar. Aceitos: PDF, JPG, PNG (≤25MB) e ZIP (≤50MB)."
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Filter}
            title="Nenhum documento no filtro"
            hint="Ajuste a busca ou a categoria acima."
          />
        ) : (
          <ul className="divide-y divide-border">
            {filtered.map((d) => (
              <li key={d.id} className="flex items-center gap-3 px-5 py-2.5 text-[12.5px]">
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-blue-50 text-blue-600">
                  <FileText className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{d.nome_final}</div>
                  <div className="text-[10.5px] text-muted-foreground">
                    {CLIENTE_DOC_CATEGORIA_LABEL[d.categoria] ?? d.categoria} ·{" "}
                    {formatBytes(d.size_bytes)} · {d.user_nome ?? "—"} · {fmtDate(d.created_at)}
                  </div>
                </div>
                {d.drive_view_url && (
                  <a
                    href={d.drive_view_url}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                    title="Abrir no Drive"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => setConfirmDoc({ id: d.id, nome: d.nome_final })}
                  className="rounded-md p-1.5 text-muted-foreground hover:bg-rose-50 hover:text-rose-600"
                  title="Remover"
                  disabled={delMut.isPending}
                >
                  {delMut.isPending && confirmDoc?.id === d.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" />
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <AlertDialog
        open={!!confirmDoc}
        onOpenChange={(o) => {
          if (!o && !delMut.isPending) setConfirmDoc(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover documento</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover{" "}
              <span className="font-medium text-foreground">{confirmDoc?.nome}</span>? A ação é
              registrada na timeline e auditoria do cliente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={delMut.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                if (confirmDoc) delMut.mutate(confirmDoc.id);
              }}
              disabled={delMut.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {delMut.isPending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Removendo…
                </>
              ) : (
                "Remover"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function TimelineTab({ clienteId }: { clienteId: string }) {
  const { data, isLoading } = useQuery(clienteTimelineQueryOptions(clienteId));
  const qc = useQueryClient();
  const [tipo, setTipo] = useState<"nota" | "ligacao" | "reuniao" | "email" | "visita">("nota");
  const [descricao, setDescricao] = useState("");
  const [filter, setFilter] = useState<TimelineFilter>("todos");
  const mut = useMutation({
    mutationFn: () =>
      addClienteInteracao({ data: { clienteId, tipo, descricao: descricao.trim() } }),
    onSuccess: () => {
      setDescricao("");
      toast.success("Interação registrada");
      qc.invalidateQueries({ queryKey: ["clientes", clienteId, "timeline"] });
      qc.invalidateQueries({ queryKey: ["clientes", "detail-codigo"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Falha ao registrar"),
  });

  const items = data ?? [];
  const counts = items.reduce<Record<TimelineFilter, number>>(
    (acc, t) => {
      const bucket = bucketFor(t.tipo);
      acc.todos += 1;
      acc[bucket] += 1;
      return acc;
    },
    { todos: 0, manuais: 0, oportunidades: 0, processos: 0, sistema: 0 },
  );
  const filtered = filter === "todos" ? items : items.filter((t) => bucketFor(t.tipo) === filter);

  return (
    <div className="grid grid-cols-12 gap-4">
      <div className="col-span-12 lg:col-span-8">
        <SectionCard
          title="Timeline"
          action={
            <div className="flex flex-wrap items-center gap-1">
              <Filter className="h-3 w-3 text-muted-foreground" />
              {(
                ["todos", "manuais", "oportunidades", "processos", "sistema"] as TimelineFilter[]
              ).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFilter(f)}
                  className={cn(
                    "rounded-full border px-2 py-0.5 text-[10.5px] capitalize transition-colors",
                    filter === f
                      ? "border-[var(--brand-blue,#1e40af)] bg-blue-50 text-[var(--brand-blue,#1e40af)]"
                      : "border-border bg-card text-muted-foreground hover:text-foreground",
                  )}
                >
                  {TIMELINE_FILTER_LABEL[f]} <span className="opacity-60">({counts[f]})</span>
                </button>
              ))}
            </div>
          }
        >
          {isLoading ? (
            <div className="p-5 text-[12px] text-muted-foreground">Carregando…</div>
          ) : items.length === 0 ? (
            <EmptyState
              icon={Inbox}
              title="Sem atividades"
              hint="Registre a primeira interação ao lado."
            />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={Inbox}
              title="Nada neste filtro"
              hint="Troque o filtro acima para ver mais eventos."
            />
          ) : (
            <ol className="relative ml-5 border-l border-border py-4 pl-6 pr-5 space-y-5">
              {filtered.map((t) => (
                <li key={t.id} className="relative">
                  <span className="absolute -left-[33px] grid h-6 w-6 place-items-center rounded-full bg-blue-100 text-blue-700 ring-4 ring-white">
                    <MessageSquare className="h-3 w-3" />
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[13px] font-semibold">{t.titulo}</span>
                    <Badge variant="outline" className="text-[10px] capitalize">
                      {t.tipo.replace("_", " ")}
                    </Badge>
                    <span className="ml-auto text-[11px] text-muted-foreground">
                      {fmtDateTime(t.ts)}
                    </span>
                  </div>
                  {t.descricao && (
                    <p className="mt-0.5 text-[12px] text-muted-foreground">{t.descricao}</p>
                  )}
                  {t.user_nome && (
                    <p className="mt-0.5 text-[10.5px] text-muted-foreground">por {t.user_nome}</p>
                  )}
                </li>
              ))}
            </ol>
          )}
        </SectionCard>
      </div>
      <div className="col-span-12 lg:col-span-4">
        <SectionCard title="Registrar interação">
          <div className="space-y-3 p-5">
            <div>
              <label className="text-[11px] font-medium text-muted-foreground">Tipo</label>
              <Select value={tipo} onValueChange={(v) => setTipo(v as typeof tipo)}>
                <SelectTrigger className="mt-1 h-9 text-[12.5px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nota">Nota</SelectItem>
                  <SelectItem value="ligacao">Ligação</SelectItem>
                  <SelectItem value="reuniao">Reunião</SelectItem>
                  <SelectItem value="email">E-mail</SelectItem>
                  <SelectItem value="visita">Visita</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-[11px] font-medium text-muted-foreground">Descrição</label>
              <Textarea
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                rows={4}
                placeholder="O que aconteceu?"
                className="mt-1 text-[12.5px]"
              />
            </div>
            <Button
              size="sm"
              disabled={!descricao.trim() || mut.isPending}
              onClick={() => mut.mutate()}
              className="w-full"
            >
              {mut.isPending ? "Salvando…" : "Registrar"}
            </Button>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
function SociosTab({
  clienteId,
  socios,
  codigo,
}: {
  clienteId: string;
  socios: any[];
  codigo: string;
}) {
  const qc = useQueryClient();
  const [nome, setNome] = useState("");
  const [qualificacao, setQualificacao] = useState("");
  const [desde, setDesde] = useState("");
  const [filter, setFilter] = useState("");
  const [errors, setErrors] = useState<{ nome?: string; desde?: string; form?: string }>({});
  const [confirmTarget, setConfirmTarget] = useState<{ id: string; nome: string } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["clientes", "detail-codigo", codigo] });
    qc.invalidateQueries({ queryKey: ["clientes", clienteId, "timeline"] });
  };

  function validate(): boolean {
    const next: typeof errors = {};
    const n = nome.trim();
    if (n.length < 2) next.nome = "Informe o nome (mínimo 2 caracteres).";
    else if (n.length > 180) next.nome = "Máximo 180 caracteres.";
    else {
      const dup = socios.find((s) => (s.nome ?? "").trim().toLowerCase() === n.toLowerCase());
      if (dup) next.nome = `Já existe um sócio "${dup.nome}" neste cliente.`;
    }
    const d = desde.trim();
    if (d) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) {
        next.desde = "Use o formato AAAA-MM-DD.";
      } else {
        const [y, m, day] = d.split("-").map(Number);
        const dt = new Date(Date.UTC(y, m - 1, day));
        const valid =
          dt.getUTCFullYear() === y && dt.getUTCMonth() + 1 === m && dt.getUTCDate() === day;
        if (!valid) next.desde = "Data inexistente.";
        else if (dt.getTime() > Date.now()) next.desde = "Data não pode ser futura.";
      }
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  const addMut = useMutation({
    mutationFn: () =>
      addClienteSocio({
        data: {
          clienteId,
          nome: nome.trim(),
          qualificacao: qualificacao.trim() || null,
          desde: desde.trim() || null,
        },
      }),
    onSuccess: () => {
      toast.success(`Sócio "${nome.trim()}" adicionado com sucesso.`);
      setNome("");
      setQualificacao("");
      setDesde("");
      setErrors({});
      invalidate();
    },
    onError: (e: any) => {
      const msg = e?.message ?? "Falha ao adicionar sócio.";
      setErrors((prev) => ({ ...prev, form: msg }));
      toast.error(msg);
    },
  });
  const delMut = useMutation({
    mutationFn: (id: string) => removerClienteSocio({ data: { id } }),
    onMutate: (id) => setDeletingId(id),
    onSuccess: (_d, _v, _ctx) => {
      const nm = confirmTarget?.nome ?? "Sócio";
      toast.success(`${nm} removido com sucesso.`);
      setConfirmTarget(null);
      invalidate();
    },
    onError: (e: any) => toast.error(e?.message ?? "Falha ao remover sócio."),
    onSettled: () => setDeletingId(null),
  });

  const f = filter.trim().toLowerCase();
  const filtered = f
    ? socios.filter(
        (s) =>
          (s.nome ?? "").toLowerCase().includes(f) ||
          (s.qualificacao ?? "").toLowerCase().includes(f),
      )
    : socios;
  const canAdd = nome.trim().length >= 2 && !addMut.isPending;

  function handleSubmit() {
    setErrors((prev) => ({ ...prev, form: undefined }));
    if (!validate()) return;
    addMut.mutate();
  }

  return (
    <div className="grid grid-cols-12 gap-4">
      <div className="col-span-12 lg:col-span-8">
        <SectionCard
          title={`Sócios (${socios.length})`}
          action={
            <Input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Buscar por nome ou qualificação"
              className="h-8 w-[240px] text-[12px]"
            />
          }
        >
          {socios.length === 0 ? (
            <EmptyState
              icon={Users}
              title="Sem sócios cadastrados"
              hint="Use o formulário ao lado para adicionar o primeiro."
            />
          ) : filtered.length === 0 ? (
            <EmptyState icon={Users} title="Nenhum sócio bate com a busca" />
          ) : (
            <ul className="divide-y divide-border">
              {filtered.map((s) => (
                <li key={s.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-slate-700 to-slate-900 text-[11px] font-bold text-white">
                    {(s.nome ?? "?")
                      .split(" ")
                      .map((n: string) => n[0])
                      .slice(0, 2)
                      .join("")}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[12.5px] font-semibold">{s.nome}</div>
                    <div className="truncate text-[11px] text-muted-foreground">
                      {s.qualificacao ?? "—"}
                      {s.desde ? ` · desde ${fmtDate(s.desde)}` : ""}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setConfirmTarget({ id: s.id, nome: s.nome ?? "Sócio" })}
                    className="rounded-md p-1.5 text-muted-foreground hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
                    title="Remover sócio"
                    aria-label={`Remover sócio ${s.nome ?? ""}`}
                    disabled={delMut.isPending && deletingId === s.id}
                  >
                    {delMut.isPending && deletingId === s.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>
      <div className="col-span-12 lg:col-span-4">
        <SectionCard title="Adicionar sócio">
          <div className="space-y-3 p-5">
            <div>
              <label className="text-[11px] font-medium text-muted-foreground">Nome *</label>
              <Input
                value={nome}
                onChange={(e) => {
                  setNome(e.target.value);
                  if (errors.nome) setErrors((p) => ({ ...p, nome: undefined }));
                }}
                maxLength={180}
                className={cn(
                  "mt-1 h-9 text-[12.5px]",
                  errors.nome && "border-destructive focus-visible:ring-destructive",
                )}
                placeholder="Nome completo"
                aria-invalid={!!errors.nome}
                aria-describedby={errors.nome ? "socio-nome-err" : undefined}
              />
              {errors.nome && (
                <p id="socio-nome-err" className="mt-1 text-[11px] text-destructive">
                  {errors.nome}
                </p>
              )}
            </div>
            <div>
              <label className="text-[11px] font-medium text-muted-foreground">Qualificação</label>
              <Input
                value={qualificacao}
                onChange={(e) => setQualificacao(e.target.value)}
                maxLength={120}
                className="mt-1 h-9 text-[12.5px]"
                placeholder="Ex.: Sócio-administrador"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-muted-foreground">
                Desde (AAAA-MM-DD)
              </label>
              <Input
                value={desde}
                onChange={(e) => {
                  setDesde(e.target.value);
                  if (errors.desde) setErrors((p) => ({ ...p, desde: undefined }));
                }}
                maxLength={10}
                className={cn(
                  "mt-1 h-9 text-[12.5px]",
                  errors.desde && "border-destructive focus-visible:ring-destructive",
                )}
                placeholder="2024-01-15"
                inputMode="numeric"
                aria-invalid={!!errors.desde}
                aria-describedby={errors.desde ? "socio-desde-err" : undefined}
              />
              {errors.desde && (
                <p id="socio-desde-err" className="mt-1 text-[11px] text-destructive">
                  {errors.desde}
                </p>
              )}
            </div>
            {errors.form && (
              <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-2 text-[11px] text-destructive">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>{errors.form}</span>
              </div>
            )}
            <Button size="sm" disabled={!canAdd} onClick={handleSubmit}>
              {addMut.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Plus className="h-3.5 w-3.5" />
              )}
              {addMut.isPending ? "Adicionando…" : "Adicionar"}
            </Button>
          </div>
        </SectionCard>
      </div>

      <AlertDialog
        open={!!confirmTarget}
        onOpenChange={(o) => {
          if (!o && !delMut.isPending) setConfirmTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover sócio?</AlertDialogTitle>
            <AlertDialogDescription>
              Você está prestes a remover <strong>{confirmTarget?.nome}</strong> deste cliente. A
              ação será registrada na timeline e poderá ser auditada, mas o sócio não aparecerá mais
              na lista.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={delMut.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                if (confirmTarget) delMut.mutate(confirmTarget.id);
              }}
              disabled={delMut.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {delMut.isPending ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Removendo…
                </>
              ) : (
                "Remover"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
