import { useEffect, useState } from "react";
import { CheckCircle2, Clock, Copy, Eye, Loader2, MailCheck, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Idioma } from "@/lib/checklist.shared";

type Etapa = "rascunho" | "recebido" | "em_analise" | "atendido";
type StatusResp = {
  ok: boolean;
  etapa?: Etapa;
  criado_em?: string;
  preenchido_em?: string | null;
  lida_em?: string | null;
  anexos?: number;
  oportunidade?: boolean;
  error?: string;
};

const T: Record<
  Idioma,
  {
    titulo: string;
    subtitulo: string;
    protocolo: string;
    copiado: string;
    atualizar: string;
    atualizado: string;
    etapa: Record<Etapa, { label: string; hint: string }>;
    anexos: string;
    recebidoEm: string;
    lidoEm: string;
    erro: string;
  }
> = {
  pt: {
    titulo: "Status da sua submissão",
    subtitulo: "Acompanhe aqui pelo protocolo. Atualiza automaticamente.",
    protocolo: "Protocolo",
    copiado: "Protocolo copiado",
    atualizar: "Atualizar agora",
    atualizado: "Atualizado",
    etapa: {
      rascunho: { label: "Rascunho", hint: "Envie o formulário para gerar o protocolo." },
      recebido: { label: "Recebido", hint: "Sua submissão chegou e entrou na fila." },
      em_analise: { label: "Em análise", hint: "Nossa equipe está avaliando as informações." },
      atendido: {
        label: "Atendido",
        hint: "Uma oportunidade foi criada e sua solicitação avançou.",
      },
    },
    anexos: "anexo(s)",
    recebidoEm: "Recebido em",
    lidoEm: "Visto em",
    erro: "Não conseguimos consultar o status agora.",
  },
  es: {
    titulo: "Estado de tu envío",
    subtitulo: "Consulta aquí con el protocolo. Se actualiza solo.",
    protocolo: "Protocolo",
    copiado: "Protocolo copiado",
    atualizar: "Actualizar",
    atualizado: "Actualizado",
    etapa: {
      rascunho: { label: "Borrador", hint: "Envía el formulario para generar el protocolo." },
      recebido: { label: "Recibido", hint: "Tu envío llegó y está en la fila." },
      em_analise: { label: "En análisis", hint: "Nuestro equipo está evaluando la información." },
      atendido: { label: "Atendido", hint: "Se creó una oportunidad y tu solicitud avanzó." },
    },
    anexos: "adjunto(s)",
    recebidoEm: "Recibido el",
    lidoEm: "Visto el",
    erro: "No pudimos consultar el estado ahora.",
  },
  en: {
    titulo: "Submission status",
    subtitulo: "Track it here with your reference. Refreshes automatically.",
    protocolo: "Reference",
    copiado: "Reference copied",
    atualizar: "Refresh",
    atualizado: "Updated",
    etapa: {
      rascunho: { label: "Draft", hint: "Submit the form to generate a reference." },
      recebido: { label: "Received", hint: "Your submission arrived and is queued." },
      em_analise: { label: "Under review", hint: "Our team is reviewing the information." },
      atendido: { label: "Handled", hint: "An opportunity has been created for your request." },
    },
    anexos: "attachment(s)",
    recebidoEm: "Received on",
    lidoEm: "Seen on",
    erro: "We couldn't fetch the status right now.",
  },
};

const ORDER: Etapa[] = ["recebido", "em_analise", "atendido"];

function formatDT(iso?: string | null, idioma: Idioma = "pt"): string {
  if (!iso) return "—";
  try {
    const loc = idioma === "pt" ? "pt-BR" : idioma === "es" ? "es-ES" : "en-US";
    return new Date(iso).toLocaleString(loc, { dateStyle: "short", timeStyle: "short" });
  } catch {
    return iso;
  }
}

type Props = {
  slug: string;
  protocolo: string;
  idioma: Idioma;
};

export function ChecklistStatusPanel({ slug, protocolo, idioma }: Props) {
  const t = T[idioma];
  const [status, setStatus] = useState<StatusResp | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [copied, setCopied] = useState(false);
  const [lastFetch, setLastFetch] = useState<Date | null>(null);

  async function fetchStatus() {
    setCarregando(true);
    try {
      const url = `/api/public/checklist/status?slug=${encodeURIComponent(slug)}&submissao_id=${encodeURIComponent(
        protocolo,
      )}`;
      const res = await fetch(url, { cache: "no-store" });
      const json = (await res.json().catch(() => ({}))) as StatusResp;
      setStatus(json);
      setLastFetch(new Date());
    } catch {
      setStatus({ ok: false, error: t.erro });
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    void fetchStatus();
    const id = window.setInterval(() => void fetchStatus(), 30000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, protocolo]);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(protocolo);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* noop */
    }
  }

  const etapa: Etapa = status?.ok && status.etapa ? status.etapa : "recebido";
  const currentIdx = ORDER.indexOf(etapa);

  const ICONS: Record<Etapa, typeof Clock> = {
    rascunho: Clock,
    recebido: MailCheck,
    em_analise: Eye,
    atendido: CheckCircle2,
  };

  return (
    <div className="w-full rounded-xl border border-border bg-card p-5 text-left shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-foreground">{t.titulo}</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">{t.subtitulo}</p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={fetchStatus}
          disabled={carregando}
          className="h-8"
        >
          {carregando ? (
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
          )}
          {t.atualizar}
        </Button>
      </div>

      {/* Protocolo */}
      <div className="mt-4 flex items-center justify-between gap-3 rounded-lg border border-dashed border-border bg-muted/40 px-3 py-2">
        <div className="min-w-0">
          <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            {t.protocolo}
          </div>
          <div className="truncate font-mono text-sm font-semibold text-foreground">
            {protocolo.slice(0, 8).toUpperCase()}
            <span className="text-muted-foreground">-{protocolo.slice(-4).toUpperCase()}</span>
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={copiar}
          className="h-8 shrink-0 text-xs"
        >
          <Copy className="mr-1 h-3.5 w-3.5" />
          {copied ? t.copiado : "Copiar"}
        </Button>
      </div>

      {/* Timeline */}
      <ol className="mt-5 space-y-3">
        {ORDER.map((e, idx) => {
          const Icon = ICONS[e];
          const done = idx < currentIdx;
          const active = idx === currentIdx;
          return (
            <li key={e} className="flex items-start gap-3">
              <div
                className={`grid h-8 w-8 shrink-0 place-items-center rounded-full border ${
                  done
                    ? "border-emerald-500 bg-emerald-500 text-white"
                    : active
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-background text-muted-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div
                  className={`text-sm font-medium ${
                    done || active ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {t.etapa[e].label}
                </div>
                <div className="text-xs text-muted-foreground">{t.etapa[e].hint}</div>
              </div>
              {active && (
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
                  {t.etapa[e].label}
                </span>
              )}
            </li>
          );
        })}
      </ol>

      {/* Metadados */}
      <dl className="mt-5 grid grid-cols-2 gap-3 rounded-lg bg-muted/30 p-3 text-xs">
        <div>
          <dt className="text-muted-foreground">{t.recebidoEm}</dt>
          <dd className="font-medium text-foreground">
            {formatDT(status?.preenchido_em ?? status?.criado_em, idioma)}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{t.lidoEm}</dt>
          <dd className="font-medium text-foreground">{formatDT(status?.lida_em, idioma)}</dd>
        </div>
        <div className="col-span-2">
          <dt className="text-muted-foreground">{t.anexos}</dt>
          <dd className="font-medium text-foreground">{status?.anexos ?? 0}</dd>
        </div>
      </dl>

      {lastFetch && (
        <p className="mt-3 text-right text-[10px] text-muted-foreground">
          {t.atualizado}: {formatDT(lastFetch.toISOString(), idioma)}
        </p>
      )}

      {status && !status.ok && (
        <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
          {status.error || t.erro}
        </p>
      )}
    </div>
  );
}
