import { assetUrl } from "@/lib/asset-url";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getChecklistPublicoPorSlug } from "@/lib/checklist.functions";
import { ChecklistFormRenderer } from "@/components/checklist/ChecklistFormRenderer";
import { ChecklistStatusPanel } from "@/components/checklist/ChecklistStatusPanel";
import type { Idioma } from "@/lib/checklist.shared";
import { pickLabel } from "@/lib/checklist.shared";
import { CheckCircle2, AlertTriangle, Clock, ShieldCheck } from "lucide-react";
import solutekLogo from "@/assets/favicon.png.asset.json";

export const Route = createFileRoute("/checklist/$slug")({
  component: PublicChecklistPage,
  head: () => ({
    meta: [
      { title: "Check-list técnico — Solutek" },
      {
        name: "description",
        content: "Preencha o check-list técnico para dimensionamento do equipamento.",
      },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

const HEADER: Record<
  Idioma,
  { kicker: string; subtitulo: string; expira: string; seguro: string }
> = {
  pt: {
    kicker: "Check-list técnico",
    subtitulo: "Preencha para dimensionarmos sua solução. Leva cerca de 5 minutos.",
    expira: "Expira em",
    seguro: "Dados protegidos · uso interno Solutek",
  },
  es: {
    kicker: "Check-list técnico",
    subtitulo: "Complétalo para dimensionar tu solución. Toma unos 5 minutos.",
    expira: "Vence en",
    seguro: "Datos protegidos · uso interno Solutek",
  },
  en: {
    kicker: "Technical check-list",
    subtitulo: "Fill it out so we can size the right solution. Takes about 5 minutes.",
    expira: "Expires in",
    seguro: "Secure form · Solutek internal use",
  },
};

const OBRIGADO: Record<Idioma, { titulo: string; texto: string; protocolo: string }> = {
  pt: {
    titulo: "Formulário enviado!",
    texto: "Recebemos suas informações. Nossa equipe entrará em contato em breve.",
    protocolo: "Protocolo",
  },
  es: {
    titulo: "¡Formulario enviado!",
    texto: "Recibimos tus datos. Nuestro equipo se pondrá en contacto en breve.",
    protocolo: "Protocolo",
  },
  en: {
    titulo: "Form submitted!",
    texto: "We have received your information. Our team will contact you shortly.",
    protocolo: "Reference",
  },
};

const INDISPONIVEL: Record<Idioma, Record<string, string>> = {
  pt: {
    nao_encontrado: "Este link de formulário não foi encontrado.",
    expirado: "Este formulário está expirado. Solicite um novo link ao seu contato comercial.",
    fechado: "Este formulário já foi respondido ou está indisponível.",
  },
  es: {
    nao_encontrado: "Este enlace de formulario no fue encontrado.",
    expirado: "Este formulario está expirado. Solicite un nuevo enlace a su contacto comercial.",
    fechado: "Este formulario ya fue respondido o no está disponible.",
  },
  en: {
    nao_encontrado: "This form link was not found.",
    expirado: "This form has expired. Please request a new link from your sales contact.",
    fechado: "This form has already been submitted or is not available.",
  },
};

function diasAte(iso: string | null): number | null {
  if (!iso) return null;
  const d = Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
  return d < 0 ? 0 : d;
}

function PublicChecklistPage() {
  const { slug } = Route.useParams();
  const [enviado, setEnviado] = useState(false);
  const [protocolo, setProtocolo] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [submissaoId, setSubmissaoId] = useState<string | null>(null);

  const q = useQuery({
    queryKey: ["checklist-public", slug],
    queryFn: () => getChecklistPublicoPorSlug({ data: { slug } }),
  });

  // Se houver campos de anexo, cria submissão-rascunho já ao carregar.
  const temAnexo = useMemo(() => {
    if (!q.data || !q.data.ok) return false;
    return q.data.tipo.campos_schema.secoes.some((s) =>
      s.campos.some((c) => c.tipo === "anexo_multiplo"),
    );
  }, [q.data]);

  useEffect(() => {
    if (!temAnexo || submissaoId) return;
    void ensureSubmissao();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [temAnexo]);

  async function ensureSubmissao(): Promise<string | null> {
    if (submissaoId) return submissaoId;
    try {
      const res = await fetch("/api/public/checklist/staging", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ slug }),
      });
      const json = (await res.json().catch(() => ({}))) as { ok?: boolean; submissao_id?: string };
      if (json.ok && json.submissao_id) {
        setSubmissaoId(json.submissao_id);
        return json.submissao_id;
      }
    } catch {
      /* noop */
    }
    return null;
  }

  if (q.isLoading) {
    return (
      <div className="grid min-h-screen place-items-center bg-muted/30 text-sm text-muted-foreground">
        Carregando…
      </div>
    );
  }
  if (q.isError || !q.data) {
    return (
      <div className="grid min-h-screen place-items-center bg-muted/30">
        <p className="text-sm text-red-600">Erro ao carregar formulário.</p>
      </div>
    );
  }

  const data = q.data;

  if (!data.ok) {
    const idioma: Idioma = "pt";
    const msg = INDISPONIVEL[idioma][data.motivo];
    return (
      <div className="grid min-h-screen place-items-center bg-muted/30 px-4">
        <div className="max-w-md rounded-xl border border-border bg-card p-8 text-center shadow-sm">
          <AlertTriangle className="mx-auto mb-3 h-10 w-10 text-amber-500" />
          <h1 className="text-lg font-semibold">Formulário indisponível</h1>
          <p className="mt-2 text-sm text-muted-foreground">{msg}</p>
        </div>
      </div>
    );
  }

  const idioma = data.link.idioma;
  const h = HEADER[idioma];
  const nome = pickLabel(
    {
      pt: data.tipo.nome_pt,
      es: data.tipo.nome_es || undefined,
      en: data.tipo.nome_en || undefined,
    },
    idioma,
  );
  const dias = diasAte(data.link.expira_em);

  if (enviado) {
    const tt = OBRIGADO[idioma];
    return (
      <div className="min-h-screen bg-muted/30 px-4 py-10">
        <div className="mx-auto flex max-w-2xl flex-col gap-6">
          <div className="rounded-xl border border-border bg-card p-8 text-center shadow-sm">
            <CheckCircle2 className="mx-auto mb-4 h-12 w-12 text-emerald-500" />
            <h1 className="text-xl font-semibold">{tt.titulo}</h1>
            <p className="mt-2 text-sm text-muted-foreground">{tt.texto}</p>
          </div>
          {protocolo && <ChecklistStatusPanel slug={slug} protocolo={protocolo} idioma={idioma} />}
        </div>
      </div>
    );
  }

  const submitLabel =
    idioma === "pt" ? "Enviar formulário" : idioma === "es" ? "Enviar formulario" : "Submit form";

  return (
    <div className="min-h-screen bg-gradient-to-b from-muted/40 via-background to-background">
      <header className="border-b border-border bg-card/70 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-start gap-4 px-4 py-6">
          <img
            src={assetUrl(solutekLogo.url)}
            alt="Solutek"
            className="h-10 w-10 shrink-0 rounded-md"
          />
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-primary">
              {h.kicker} · Solutek
            </div>
            <h1 className="mt-0.5 truncate text-2xl font-bold tracking-tight">{nome}</h1>
            {data.link.titulo && (
              <p className="mt-1 text-sm text-muted-foreground">{data.link.titulo}</p>
            )}
            <p className="mt-2 text-sm text-muted-foreground">{h.subtitulo}</p>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              {dias !== null && (
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {h.expira} {dias}{" "}
                  {idioma === "en" ? "day(s)" : idioma === "es" ? "día(s)" : "dia(s)"}
                </span>
              )}
              <span className="inline-flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5" />
                {h.seguro}
              </span>
            </div>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-6">
        {erro && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {erro}
          </div>
        )}
        <ChecklistFormRenderer
          schema={data.tipo.campos_schema}
          idioma={idioma}
          slug={slug}
          submissaoId={submissaoId}
          onEnsureSubmissao={ensureSubmissao}
          submitting={enviando}
          submitLabel={submitLabel}
          onSubmit={async (payload) => {
            setEnviando(true);
            setErro(null);
            try {
              const res = await fetch("/api/public/checklist/submit", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ slug, ...payload }),
              });
              const json = (await res.json().catch(() => ({}))) as {
                ok?: boolean;
                error?: string;
                submissao_id?: string;
              };
              if (!res.ok || !json.ok) {
                setErro(json.error || "Erro ao enviar.");
              } else {
                setProtocolo(json.submissao_id || null);
                setEnviado(true);
              }
            } catch {
              setErro("Erro de rede.");
            } finally {
              setEnviando(false);
            }
          }}
        />
      </main>
    </div>
  );
}
