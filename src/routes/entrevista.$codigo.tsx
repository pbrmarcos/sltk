import { assetUrl } from "@/lib/asset-url";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Loader2,
  ShieldCheck,
  UserRound,
  ClipboardCheck,
  RotateCcw,
  Mail,
  MessageCircle,
  BadgeCheck,
  Info,
} from "lucide-react";
import {
  I18N,
  COUNTRIES,
  flagEmoji,
  pickText,
  detectYesNo,
  groupContactMatrix,
  maskWhatsapp,
  isValidWhatsapp,
  isValidEmail,
  type Idioma,
} from "@/lib/entrevistas-shared";
import fallbackLogoAsset from "@/assets/brand-logo-dark.svg.asset.json";

const FALLBACK_LOGO_URL: string = assetUrl(fallbackLogoAsset.url);

export const Route = createFileRoute("/entrevista/$codigo")({
  component: PublicInterviewPage,
  head: () => ({
    meta: [
      { title: "Entrevista Técnica — SLTK Americas" },
      { name: "description", content: "Responda a entrevista técnica para orientar seu projeto." },
      { property: "og:title", content: "Entrevista Técnica — SLTK Americas" },
      {
        property: "og:description",
        content: "Responda a entrevista técnica para orientar seu projeto.",
      },
      { property: "og:type", content: "website" },
      { name: "robots", content: "noindex,nofollow" },
      { name: "theme-color", content: "#0b1a3a" },
    ],
  }),
});

type Pergunta = {
  id: string;
  numero: number;
  ordem: number;
  formato: "text" | "textarea" | "single_choice" | "multi_choice" | "number" | "country";
  enunciado_pt: string;
  enunciado_es: string | null;
  enunciado_en: string | null;
  obrigatoria: boolean;
  opcoes: Array<{
    id: string;
    ordem: number;
    label_pt: string;
    label_es: string | null;
    label_en: string | null;
    tem_descricao: boolean;
  }>;
};

type Brand = { logo: string | null; logo_collapsed?: string | null; nome: string };

type LoadState =
  | { status: "loading" }
  | { status: "not_found" | "expired" | "respondida" | "error"; detail?: string }
  | {
      status: "ok";
      segmento: { nome_pt: string; nome_es: string | null; nome_en: string | null };
      idioma_default: Idioma;
      codigo: string;
      lead_nome: string | null;
      perguntas: Pergunta[];
      brand: Brand;
    };

type Resposta = { valor_text?: string; valor_options?: string[]; descricao_extra?: string };
type ContatoState = { nome: string; email: string; whatsapp: string; cargo: string };

const CONTACT_I18N: Record<
  Idioma,
  {
    step_title: string;
    step_subtitle: string;
    nome: string;
    nome_ph: string;
    cargo: string;
    cargo_ph: string;
    email: string;
    email_ph: string;
    whatsapp: string;
    whatsapp_ph: string;
    required_hint: string;
  }
> = {
  pt: {
    step_title: "Dados de contato — Gerente de Produção",
    step_subtitle:
      "Quem é o responsável pela produção? Este contato será usado exclusivamente para dar sequência ao seu projeto.",
    nome: "Nome completo",
    nome_ph: "Ex.: João da Silva",
    cargo: "Cargo / Função",
    cargo_ph: "Gerente de Produção",
    email: "E-mail profissional",
    email_ph: "nome@empresa.com",
    whatsapp: "WhatsApp (com DDI)",
    whatsapp_ph: "+55 (11) 90000-0000",
    required_hint: "Nome, e-mail e WhatsApp são obrigatórios.",
  },
  es: {
    step_title: "Datos de contacto — Gerente de Producción",
    step_subtitle:
      "¿Quién es el responsable de producción? Este contacto se usará únicamente para dar seguimiento al proyecto.",
    nome: "Nombre completo",
    nome_ph: "Ej.: Juan Pérez",
    cargo: "Cargo / Función",
    cargo_ph: "Gerente de Producción",
    email: "Correo profesional",
    email_ph: "nombre@empresa.com",
    whatsapp: "WhatsApp (con código de país)",
    whatsapp_ph: "+54 (11) 90000-0000",
    required_hint: "Nombre, correo y WhatsApp son obligatorios.",
  },
  en: {
    step_title: "Contact information — Production Manager",
    step_subtitle:
      "Who is the production manager? This contact will be used only to follow up on your project.",
    nome: "Full name",
    nome_ph: "e.g. John Smith",
    cargo: "Role / Position",
    cargo_ph: "Production Manager",
    email: "Work e-mail",
    email_ph: "name@company.com",
    whatsapp: "WhatsApp (with country code)",
    whatsapp_ph: "+1 (555) 000-0000",
    required_hint: "Name, e-mail and WhatsApp are required.",
  },
};

const LANG_STORAGE_KEY = "entrevista.lang";
const STORAGE_PREFIX = "entrevista.draft.";
const MAX_TEXT = 4000;

function PublicInterviewPage() {
  const { codigo } = Route.useParams();
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [lang, setLang] = useState<Idioma>(() => {
    if (typeof window === "undefined") return "pt";
    const saved = window.localStorage.getItem(LANG_STORAGE_KEY);
    return saved === "pt" || saved === "es" || saved === "en" ? saved : "pt";
  });
  const [step, setStep] = useState(0);
  const [respostas, setRespostas] = useState<Record<string, Resposta>>({});
  const [contato, setContato] = useState<ContatoState>({
    nome: "",
    email: "",
    whatsapp: "",
    cargo: "Gerente de Produção",
  });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [progress, setProgress] = useState(0);
  const [dataReady, setDataReady] = useState<LoadState | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [reviewMode, setReviewMode] = useState(false);
  const [resumed, setResumed] = useState(false);
  const [langSetByUser, setLangSetByUser] = useState(false);

  // Fast simulated progress that never blocks the reveal
  useEffect(() => {
    if (dataReady) {
      // jump to 100 and reveal immediately
      setProgress(100);
      setState(dataReady);
      if (dataReady.status === "ok" && !langSetByUser) setLang(dataReady.idioma_default);
      const id = setTimeout(() => setRevealed(true), 40);
      return () => clearTimeout(id);
    }
    // while loading, tick up to 85% quickly
    const iv = setInterval(() => {
      setProgress((p) => (p >= 85 ? p : p + Math.max(2, (85 - p) * 0.25)));
    }, 60);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataReady]);

  // Fetch interview data (with automatic retry on transient failures)
  useEffect(() => {
    let cancelled = false;

    const load = async (tries = 0): Promise<void> => {
      try {
        const r = await fetch(
          `/api/public/entrevista/get?codigo=${encodeURIComponent(codigo)}&_=${Date.now()}`,
          {
            headers: { accept: "application/json" },
            cache: "no-store",
          },
        );
        const raw = await r.text();
        let j: any = null;
        try {
          j = JSON.parse(raw);
        } catch {
          /* non-JSON response (proxy/HTML) */
        }
        if (cancelled) return;

        if (!r.ok || !j?.ok) {
          const err = String(j?.error ?? (j ? "" : `http_${r.status}`));
          if (r.status === 404 || err === "not_found") {
            setDataReady({ status: "not_found" });
            return;
          }
          if (err === "respondida") {
            setDataReady({ status: "respondida" });
            return;
          }
          if (err === "expired" || err === "expirada") {
            setDataReady({ status: "expired" });
            return;
          }
          if (tries < 2) {
            await new Promise((res) => setTimeout(res, 800 * (tries + 1)));
            if (!cancelled) await load(tries + 1);
            return;
          }
          setDataReady({ status: "error", detail: err || `http_${r.status}` });
          return;
        }

        setDataReady({
          status: "ok",
          segmento: j.segmento,
          idioma_default: j.entrevista.idioma_default,
          codigo: j.entrevista.codigo,
          lead_nome: j.entrevista.lead_nome,
          perguntas: j.perguntas,
          brand: j.brand ?? { logo: null, nome: "SLTK Americas" },
        });
      } catch (e) {
        if (cancelled) return;
        if (tries < 2) {
          await new Promise((res) => setTimeout(res, 800 * (tries + 1)));
          if (!cancelled) await load(tries + 1);
          return;
        }
        setDataReady({ status: "error", detail: e instanceof Error ? e.message : "network" });
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [codigo]);

  // Autosave (load once when data ready)
  useEffect(() => {
    if (state.status !== "ok") return;
    try {
      const raw = window.localStorage.getItem(STORAGE_PREFIX + codigo);
      if (!raw) return;
      const draft = JSON.parse(raw);
      if (draft && typeof draft === "object") {
        if (draft.respostas) setRespostas(draft.respostas);
        if (draft.contato) setContato((c) => ({ ...c, ...draft.contato }));
        if (typeof draft.step === "number") setStep(Math.min(draft.step, state.perguntas.length));
        setResumed(true);
      }
    } catch {
      /* noop */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.status]);

  // Autosave (save on change)
  useEffect(() => {
    if (state.status !== "ok") return;
    const payload = JSON.stringify({ respostas, contato, step, savedAt: Date.now() });
    try {
      window.localStorage.setItem(STORAGE_PREFIX + codigo, payload);
    } catch {
      /* noop */
    }
  }, [respostas, contato, step, codigo, state.status]);

  // Persist language choice
  useEffect(() => {
    try {
      window.localStorage.setItem(LANG_STORAGE_KEY, lang);
    } catch {
      /* noop */
    }
  }, [lang]);

  // Warn before unload if there are unsent answers
  useEffect(() => {
    if (done || state.status !== "ok") return;
    const hasData =
      Object.keys(respostas).length > 0 || contato.nome || contato.email || contato.whatsapp;
    if (!hasData) return;
    const t = I18N[lang];
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = t.unsaved_warn;
      return t.unsaved_warn;
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [respostas, contato, done, state.status, lang]);

  const t = I18N[lang];
  const ct = CONTACT_I18N[lang];
  const perguntas = state.status === "ok" ? state.perguntas : [];
  const total = perguntas.length + 1; // +1 = contato
  const isContactStep = step === perguntas.length;
  const current = isContactStep ? null : perguntas[step];

  const emailValid = !contato.email || isValidEmail(contato.email);
  const whatsValid = !contato.whatsapp || isValidWhatsapp(contato.whatsapp);
  const contactComplete =
    contato.nome.trim().length > 1 &&
    isValidEmail(contato.email) &&
    isValidWhatsapp(contato.whatsapp);

  const canAdvance = useMemo(() => {
    if (isContactStep) return contactComplete;
    if (!current) return false;
    if (!current.obrigatoria) return true;
    const r = respostas[current.id];
    if (!r) return false;
    if (
      current.formato === "multi_choice" ||
      current.formato === "single_choice" ||
      current.formato === "country"
    ) {
      return (r.valor_options?.length ?? 0) > 0;
    }
    return !!r.valor_text?.trim();
  }, [current, respostas, isContactStep, contactComplete]);

  const setResp = useCallback((pid: string, patch: Partial<Resposta>) => {
    setRespostas((prev) => ({ ...prev, [pid]: { ...prev[pid], ...patch } }));
  }, []);

  async function submit() {
    if (state.status !== "ok") return;
    setSubmitting(true);
    setError(null);
    // Build ID→PT label map so stored answers stay canonical regardless of UI language.
    const optLabelPt = new Map<string, string>();
    const optIsCountry = new Set<string>(); // pergunta ids whose format is 'country'
    for (const p of state.perguntas) {
      if (p.formato === "country") optIsCountry.add(p.id);
      for (const o of p.opcoes) optLabelPt.set(o.id, o.label_pt);
    }
    const resolveOptions = (pid: string, arr: string[] | undefined | null): string[] | null => {
      if (!arr || arr.length === 0) return null;
      if (optIsCountry.has(pid)) {
        return arr.map((iso) => {
          const c = COUNTRIES.find((x) => x.iso2 === iso);
          return c ? `${c.iso2} · ${c.pt}` : iso;
        });
      }
      return arr.map((id) => optLabelPt.get(id) ?? id);
    };

    const payload = {
      codigo,
      idioma: lang,
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 500) : null,
      contato: {
        nome: contato.nome.trim() || null,
        email: contato.email.trim() || null,
        whatsapp: contato.whatsapp.trim() || null,
        cargo: contato.cargo.trim() || null,
      },
      respostas: Object.entries(respostas).map(([pid, r]) => ({
        pergunta_id: pid,
        valor_text: r.valor_text ?? null,
        valor_options: resolveOptions(pid, r.valor_options),
        descricao_extra: r.descricao_extra ?? null,
      })),
    };

    for (let i = 0; i < 3; i++) {
      setAttempt(i);
      try {
        const res = await fetch("/api/public/entrevista/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const j = await res.json();
        if (j.ok) {
          setDone(true);
          try {
            window.localStorage.removeItem(STORAGE_PREFIX + codigo);
          } catch {
            /* noop */
          }
          setSubmitting(false);
          return;
        }
        throw new Error(j.error || `HTTP ${res.status}`);
      } catch (e: any) {
        if (i === 2) {
          setError(e?.message ?? "erro");
          setSubmitting(false);
          return;
        }
        setError(t.sent_partial);
        await new Promise((r) => setTimeout(r, 800 * Math.pow(2, i)));
      }
    }
  }

  const splashBrand: Brand = (dataReady?.status === "ok" ? dataReady.brand : null) ??
    (state.status === "ok" ? state.brand : null) ?? {
      logo: FALLBACK_LOGO_URL,
      logo_collapsed: FALLBACK_LOGO_URL,
      nome: "SLTK Americas",
    };

  if (state.status === "loading" || !revealed) {
    return (
      <SplashScreen
        progress={Math.round(progress)}
        brand={splashBrand}
        playingOut={state.status !== "loading"}
      />
    );
  }
  if (state.status !== "ok") {
    const msg =
      state.status === "expired"
        ? I18N[lang].expired
        : state.status === "error"
          ? lang === "en"
            ? "We couldn't load this interview right now. Please refresh the page and try again."
            : lang === "es"
              ? "No pudimos cargar esta entrevista ahora. Actualice la página e inténtelo de nuevo."
              : "Não conseguimos carregar esta entrevista agora. Atualize a página e tente novamente."
          : I18N[lang].not_found;
    return (
      <Shell>
        <div className="p-6 text-center text-muted-foreground space-y-4">
          <div>{msg}</div>
          {state.status === "error" && (
            <>
              <Button variant="outline" onClick={() => window.location.reload()}>
                {lang === "en" ? "Try again" : lang === "es" ? "Reintentar" : "Tentar novamente"}
              </Button>
              <div className="text-[11px] opacity-60">
                {codigo}
                {state.detail ? ` · ${state.detail}` : ""}
              </div>
            </>
          )}
        </div>
      </Shell>
    );
  }
  if (done) {
    return (
      <Shell
        lang={lang}
        onLang={(l) => {
          setLang(l);
          setLangSetByUser(true);
        }}
        title={pickText(
          state.segmento.nome_pt,
          state.segmento.nome_es,
          state.segmento.nome_en,
          lang,
        )}
        brand={state.brand}
      >
        <Card className="max-w-lg mx-auto">
          <CardContent className="p-8 text-center space-y-4">
            <div className="mx-auto w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center">
              <Check className="w-8 h-8 text-emerald-700" />
            </div>
            <h2 className="text-xl font-semibold">{t.success_title}</h2>
            <p className="text-muted-foreground">{t.success_body}</p>
            <div className="text-xs text-muted-foreground">#{state.codigo}</div>
          </CardContent>
        </Card>
      </Shell>
    );
  }

  const pct = total > 0 ? Math.round(((step + 1) / total) * 100) : 0;
  const stepLabel = isContactStep
    ? t.contact_step_label
    : `${lang === "pt" ? "Pergunta" : lang === "en" ? "Question" : "Pregunta"} ${current?.numero ?? step + 1}`;

  function clearDraft() {
    try {
      window.localStorage.removeItem(STORAGE_PREFIX + codigo);
    } catch {
      /* noop */
    }
    setRespostas({});
    setContato({ nome: "", email: "", whatsapp: "", cargo: "Gerente de Produção" });
    setStep(0);
    setResumed(false);
    setReviewMode(false);
  }

  return (
    <Shell
      lang={lang}
      onLang={(l) => {
        setLang(l);
        setLangSetByUser(true);
      }}
      title={pickText(state.segmento.nome_pt, state.segmento.nome_es, state.segmento.nome_en, lang)}
      brand={state.brand}
    >
      <div className="max-w-2xl mx-auto entrevista-reveal pb-24 sm:pb-6" key={lang}>
        {resumed && !reviewMode && (
          <div className="mb-4 flex items-center justify-between gap-3 rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-900">
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4" /> {t.resume_notice}
            </div>
            <button className="text-xs underline hover:no-underline" onClick={clearDraft}>
              <RotateCcw className="inline h-3 w-3 mr-1" />
              {t.resume_clear}
            </button>
          </div>
        )}

        <div className="mb-4" aria-live="polite">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>
              {stepLabel} · {step + 1} {t.progress} {total}
            </span>
            <span>{pct}%</span>
          </div>
          <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
            <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>

        {reviewMode ? (
          <ReviewStep
            lang={lang}
            perguntas={perguntas}
            respostas={respostas}
            contato={contato}
            onEdit={(idx) => {
              setReviewMode(false);
              setStep(idx);
            }}
          />
        ) : (
          <Card>
            <CardContent className="p-6 space-y-5">
              {current && (
                <>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">
                      {stepLabel}
                      {current.obrigatoria && (
                        <span className="text-destructive ml-2" aria-label={t.required}>
                          *
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg font-semibold leading-snug">
                      {pickText(
                        current.enunciado_pt,
                        current.enunciado_es,
                        current.enunciado_en,
                        lang,
                      )}
                    </h3>
                  </div>

                  <QuestionField
                    p={current}
                    lang={lang}
                    value={respostas[current.id]}
                    onChange={(patch) => setResp(current.id, patch)}
                  />
                </>
              )}

              {isContactStep && (
                <ContactStep
                  lang={lang}
                  value={contato}
                  onChange={setContato}
                  emailValid={emailValid}
                  whatsValid={whatsValid}
                />
              )}

              {error && (
                <div className="text-xs text-destructive" role="alert">
                  {error}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Sticky action bar on mobile, inline on desktop */}
        <div className="fixed sm:static bottom-0 left-0 right-0 z-40 border-t sm:border-0 bg-white/95 sm:bg-transparent backdrop-blur px-4 py-3 sm:py-4 sm:mt-4 flex items-center justify-between gap-2">
          <Button
            variant="outline"
            size="lg"
            className="min-w-32 h-11"
            disabled={step === 0 && !reviewMode}
            onClick={() => (reviewMode ? setReviewMode(false) : setStep((s) => Math.max(0, s - 1)))}
          >
            <ChevronLeft className="h-4 w-4 mr-1" /> {t.back}
          </Button>

          {reviewMode ? (
            <Button
              size="lg"
              className="min-w-40 h-11"
              disabled={!contactComplete || submitting}
              onClick={submit}
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {attempt > 0 ? t.retrying : t.sending}
                </>
              ) : (
                <>
                  {t.submit} <Check className="h-4 w-4 ml-1" />
                </>
              )}
            </Button>
          ) : step < total - 1 ? (
            <Button
              size="lg"
              className="min-w-32 h-11"
              disabled={!canAdvance}
              onClick={() => setStep((s) => Math.min(total - 1, s + 1))}
            >
              {t.next} <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button
              size="lg"
              className="min-w-40 h-11"
              disabled={!canAdvance}
              onClick={() => setReviewMode(true)}
            >
              <ClipboardCheck className="h-4 w-4 mr-1" /> {t.review_title}
            </Button>
          )}
        </div>

        {isContactStep && !contactComplete && !reviewMode && (
          <div className="mt-2 text-xs text-muted-foreground">{ct.required_hint}</div>
        )}

        <div className="mt-6 text-center text-xs text-muted-foreground flex items-center justify-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5" /> {state.brand.nome} · sltkamericas.com
        </div>
      </div>
    </Shell>
  );
}

function ReviewStep({
  lang,
  perguntas,
  respostas,
  contato,
  onEdit,
}: {
  lang: Idioma;
  perguntas: Pergunta[];
  respostas: Record<string, Resposta>;
  contato: ContatoState;
  onEdit: (index: number) => void;
}) {
  const t = I18N[lang];
  const ct = CONTACT_I18N[lang];
  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <div className="flex items-center gap-2">
          <ClipboardCheck className="h-5 w-5 text-primary" />
          <div>
            <h3 className="text-lg font-semibold">{t.review_title}</h3>
            <p className="text-sm text-muted-foreground">{t.review_subtitle}</p>
          </div>
        </div>

        <ul className="divide-y divide-slate-200 border rounded-md">
          {perguntas.map((p, idx) => {
            const r = respostas[p.id];
            // Build id→label map (in current language) for this question's options.
            const idToLabel = new Map<string, string>();
            for (const o of p.opcoes)
              idToLabel.set(o.id, pickText(o.label_pt, o.label_es, o.label_en, lang));
            let answer = "";
            if (r) {
              let matrixText = "";
              if (r.descricao_extra && r.descricao_extra.trim().startsWith("{")) {
                try {
                  const obj = JSON.parse(r.descricao_extra) as Record<
                    string,
                    { nome?: string; email?: string; whatsapp?: string }
                  >;
                  matrixText = Object.entries(obj)
                    .filter(([, v]) => v && (v.nome || v.email || v.whatsapp))
                    .map(([roleId, v]) => {
                      const roleLabel = idToLabel.get(roleId) ?? roleId;
                      return `${roleLabel}: ${[v.nome, v.email, v.whatsapp].filter(Boolean).join(" · ")}`;
                    })
                    .join(" | ");
                } catch {
                  /* fallthrough */
                }
              }
              let optsText = "";
              if (r.valor_options && r.valor_options.length) {
                if (p.formato === "country") {
                  optsText = r.valor_options
                    .map((iso) => {
                      const c = COUNTRIES.find((x) => x.iso2 === iso);
                      if (!c) return iso;
                      return `${flagEmoji(c.iso2)} ${lang === "pt" ? c.pt : lang === "es" ? c.es : c.en}`;
                    })
                    .join(", ");
                } else {
                  optsText = r.valor_options.map((id) => idToLabel.get(id) ?? id).join(", ");
                }
              }
              answer =
                matrixText ||
                [
                  optsText,
                  r.valor_text,
                  r.descricao_extra && !matrixText && `— ${r.descricao_extra}`,
                ]
                  .filter(Boolean)
                  .join("  ");
            }

            return (
              <li key={p.id} className="px-3 py-2.5 flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-muted-foreground">#{p.numero}</div>
                  <div className="text-sm font-medium truncate">
                    {pickText(p.enunciado_pt, p.enunciado_es, p.enunciado_en, lang)}
                  </div>
                  <div
                    className={`text-sm mt-0.5 ${answer ? "text-slate-700" : "text-muted-foreground italic"}`}
                  >
                    {answer || t.no_answer}
                  </div>
                </div>
                <button
                  className="text-xs text-primary hover:underline shrink-0"
                  onClick={() => onEdit(idx)}
                >
                  {t.edit}
                </button>
              </li>
            );
          })}
          <li className="px-3 py-2.5 flex items-start gap-3 bg-slate-50">
            <div className="flex-1 min-w-0">
              <div className="text-xs text-muted-foreground">{ct.step_title}</div>
              <div className="text-sm mt-0.5">
                <span className="font-medium">{contato.nome || "—"}</span>
                <span className="text-muted-foreground"> · {contato.cargo || ct.cargo_ph}</span>
                <div className="text-slate-700">
                  {contato.email} · {contato.whatsapp}
                </div>
              </div>
            </div>
            <button
              className="text-xs text-primary hover:underline shrink-0"
              onClick={() => onEdit(perguntas.length)}
            >
              {t.edit}
            </button>
          </li>
        </ul>
      </CardContent>
    </Card>
  );
}

function ContactStep({
  lang,
  value,
  onChange,
  emailValid,
  whatsValid,
}: {
  lang: Idioma;
  value: ContatoState;
  onChange: (v: ContatoState) => void;
  emailValid: boolean;
  whatsValid: boolean;
}) {
  const ct = CONTACT_I18N[lang];
  const t = I18N[lang];
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <UserRound className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-lg font-semibold">{ct.step_title}</h3>
          <p className="text-sm text-muted-foreground mt-1">{ct.step_subtitle}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2">
          <label htmlFor="c_nome" className="text-xs font-medium text-muted-foreground">
            {ct.nome} <span className="text-destructive">*</span>
          </label>
          <div className="relative">
            <BadgeCheck className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="c_nome"
              className="pl-9"
              autoFocus
              value={value.nome}
              onChange={(e) => onChange({ ...value, nome: e.target.value })}
              placeholder={ct.nome_ph}
              maxLength={200}
              autoComplete="name"
            />
          </div>
        </div>
        <div>
          <label htmlFor="c_cargo" className="text-xs font-medium text-muted-foreground">
            {ct.cargo}
          </label>
          <Input
            id="c_cargo"
            value={value.cargo}
            onChange={(e) => onChange({ ...value, cargo: e.target.value })}
            placeholder={ct.cargo_ph}
            maxLength={120}
            autoComplete="organization-title"
          />
        </div>
        <div>
          <label htmlFor="c_wpp" className="text-xs font-medium text-muted-foreground">
            {ct.whatsapp} <span className="text-destructive">*</span>
          </label>
          <div className="relative">
            <MessageCircle className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="c_wpp"
              className={`pl-9 ${!whatsValid ? "border-destructive" : ""}`}
              value={value.whatsapp}
              onChange={(e) => onChange({ ...value, whatsapp: maskWhatsapp(e.target.value) })}
              placeholder={ct.whatsapp_ph}
              inputMode="tel"
              autoComplete="tel"
              maxLength={30}
            />
          </div>
          {!whatsValid && <div className="text-xs text-destructive mt-1">{t.invalid_whatsapp}</div>}
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="c_email" className="text-xs font-medium text-muted-foreground">
            {ct.email} <span className="text-destructive">*</span>
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="c_email"
              type="email"
              className={`pl-9 ${!emailValid ? "border-destructive" : ""}`}
              value={value.email}
              onChange={(e) => onChange({ ...value, email: e.target.value })}
              placeholder={ct.email_ph}
              inputMode="email"
              autoComplete="email"
              maxLength={200}
            />
          </div>
          {!emailValid && <div className="text-xs text-destructive mt-1">{t.invalid_email}</div>}
        </div>
      </div>
    </div>
  );
}

function QuestionField({
  p,
  lang,
  value,
  onChange,
}: {
  p: Pergunta;
  lang: Idioma;
  value: Resposta | undefined;
  onChange: (patch: Partial<Resposta>) => void;
}) {
  const t = I18N[lang];
  const textLen = (value?.valor_text ?? "").length;

  if (p.formato === "textarea" || p.formato === "text") {
    return (
      <div>
        <Textarea
          rows={p.formato === "textarea" ? 5 : 2}
          placeholder={t.optional_text}
          value={value?.valor_text ?? ""}
          maxLength={MAX_TEXT}
          onChange={(e) => onChange({ valor_text: e.target.value })}
        />
        <div className="text-[11px] text-muted-foreground text-right mt-1">
          {textLen}/{MAX_TEXT}
        </div>
      </div>
    );
  }
  if (p.formato === "number") {
    return (
      <Input
        type="number"
        inputMode="numeric"
        placeholder={t.number_placeholder}
        value={value?.valor_text ?? ""}
        onChange={(e) => onChange({ valor_text: e.target.value })}
      />
    );
  }
  if (p.formato === "country") {
    const sel = value?.valor_options?.[0] ?? "";
    return (
      <div
        className="grid grid-cols-2 md:grid-cols-3 gap-2"
        role="radiogroup"
        aria-label={t.select_country}
      >
        {COUNTRIES.map((c) => {
          const on = sel === c.iso2;
          return (
            <button
              key={c.iso2}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => onChange({ valor_options: [c.iso2] })}
              className={`min-h-11 flex items-center gap-2 border rounded-md px-3 py-2 text-left text-sm hover:border-primary/50 transition ${on ? "border-primary bg-primary/5" : ""}`}
            >
              <span className="text-lg" aria-hidden>
                {flagEmoji(c.iso2)}
              </span>
              <span>{lang === "pt" ? c.pt : lang === "es" ? c.es : c.en}</span>
            </button>
          );
        })}
      </div>
    );
  }

  // single_choice / multi_choice
  const isMulti = p.formato === "multi_choice";

  // ---- Contact matrix (role + Nome/E-mail/WhatsApp columns) ----
  const matrix = isMulti ? groupContactMatrix(p.opcoes) : null;
  if (matrix) {
    let store: Record<string, { nome?: string; email?: string; whatsapp?: string }> = {};
    try {
      store = value?.descricao_extra ? JSON.parse(value.descricao_extra) : {};
    } catch {
      store = {};
    }
    const update = (
      roleId: string,
      patch: Partial<{ nome: string; email: string; whatsapp: string }>,
    ) => {
      const next = { ...store, [roleId]: { ...(store[roleId] ?? {}), ...patch } };
      const selectedIds = Object.entries(next)
        .filter(([, v]) => v?.nome || v?.email || v?.whatsapp)
        .map(([k]) => k);
      onChange({ valor_options: selectedIds, descricao_extra: JSON.stringify(next) });
    };
    const colName = matrix.find((g) => g.nome)?.nome;
    const colEmail = matrix.find((g) => g.email)?.email;
    const colWhats = matrix.find((g) => g.whatsapp)?.whatsapp;
    return (
      <div className="space-y-2">
        <div
          className="hidden md:grid gap-2 px-3 text-xs font-medium text-muted-foreground"
          style={{ gridTemplateColumns: `1.2fr 1.4fr 1.6fr 1.2fr` }}
        >
          <div>{t.contact_step_label}</div>
          <div>
            {colName
              ? pickText(colName.label_pt, colName.label_es, colName.label_en, lang).replace(
                  /:$/,
                  "",
                )
              : "—"}
          </div>
          <div>
            {colEmail
              ? pickText(colEmail.label_pt, colEmail.label_es, colEmail.label_en, lang).replace(
                  /:$/,
                  "",
                )
              : "—"}
          </div>
          <div>
            {colWhats
              ? pickText(colWhats.label_pt, colWhats.label_es, colWhats.label_en, lang).replace(
                  /:$/,
                  "",
                )
              : "—"}
          </div>
        </div>
        <div className="space-y-2">
          {matrix.map((g) => {
            const roleLabel = pickText(g.role.label_pt, g.role.label_es, g.role.label_en, lang);
            const rec = store[g.role.id] ?? {};
            return (
              <div
                key={g.role.id}
                className="border rounded-md p-3 grid gap-2 md:items-center bg-white"
                style={{ gridTemplateColumns: `1.2fr 1.4fr 1.6fr 1.2fr` }}
              >
                <div className="text-sm font-medium">{roleLabel}</div>
                <Input
                  placeholder={
                    colName
                      ? pickText(colName.label_pt, colName.label_es, colName.label_en, lang)
                      : ""
                  }
                  value={rec.nome ?? ""}
                  maxLength={200}
                  onChange={(e) => update(g.role.id, { nome: e.target.value })}
                />
                <Input
                  type="email"
                  placeholder="nome@empresa.com"
                  value={rec.email ?? ""}
                  maxLength={200}
                  inputMode="email"
                  onChange={(e) => update(g.role.id, { email: e.target.value })}
                />
                <Input
                  placeholder="+55 (11) 90000-0000"
                  value={rec.whatsapp ?? ""}
                  maxLength={30}
                  inputMode="tel"
                  onChange={(e) => update(g.role.id, { whatsapp: maskWhatsapp(e.target.value) })}
                />
              </div>
            );
          })}
        </div>
        <div className="text-[11px] text-muted-foreground flex items-center gap-1">
          <Info className="w-3 h-3" /> Preencha apenas os responsáveis aplicáveis.
        </div>
      </div>
    );
  }

  const selected = new Set(value?.valor_options ?? []);
  const selectedOpts = p.opcoes.filter((o) => selected.has(o.id));
  const optHasDesc = selectedOpts.some((o) => o.tem_descricao);
  const selectedTriggersYesNo = selectedOpts.some(
    (o) =>
      detectYesNo(o.label_pt) !== null ||
      detectYesNo(o.label_es || "") !== null ||
      detectYesNo(o.label_en || "") !== null,
  );
  const showDesc = optHasDesc || selectedTriggersYesNo;
  // Smart describe label: if a single triggering option ends with ":" use it verbatim.
  const trigger = selectedOpts.find((o) => o.tem_descricao) ?? selectedOpts[0];
  const triggerLabel = trigger
    ? pickText(trigger.label_pt, trigger.label_es, trigger.label_en, lang)
    : "";
  const describeHeader =
    triggerLabel && /[:：]\s*$/.test(triggerLabel)
      ? triggerLabel.replace(/[:：]\s*$/, "")
      : `${t.describe}${triggerLabel ? ` — ${triggerLabel}` : ""}`;
  const descLen = (value?.descricao_extra ?? "").length;

  return (
    <div className="space-y-2">
      <div
        className="grid grid-cols-1 sm:grid-cols-2 gap-2"
        role={isMulti ? "group" : "radiogroup"}
      >
        {p.opcoes.map((o) => {
          const label = pickText(o.label_pt, o.label_es, o.label_en, lang);
          const on = selected.has(o.id);
          return (
            <button
              key={o.id}
              type="button"
              role={isMulti ? "checkbox" : "radio"}
              aria-checked={on}
              onClick={() => {
                let next: string[];
                if (isMulti) {
                  next = on ? [...selected].filter((x) => x !== o.id) : [...selected, o.id];
                } else {
                  next = on ? [] : [o.id];
                }
                onChange({ valor_options: next });
              }}
              className={`min-h-11 flex items-start gap-2 border rounded-md p-3 text-left text-sm transition hover:border-primary/50 ${on ? "border-primary bg-primary/5" : ""}`}
            >
              <span
                aria-hidden
                className={`mt-0.5 w-4 h-4 rounded ${isMulti ? "" : "rounded-full"} border flex items-center justify-center ${on ? "bg-primary border-primary text-primary-foreground" : "border-slate-300"}`}
              >
                {on && <Check className="w-3 h-3" />}
              </span>
              <span>{label}</span>
            </button>
          );
        })}
      </div>
      {showDesc && (
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1">
            {describeHeader}
          </label>
          <Textarea
            rows={3}
            placeholder={t.describe}
            value={value?.descricao_extra ?? ""}
            maxLength={2000}
            onChange={(e) => onChange({ descricao_extra: e.target.value })}
          />
          <div className="text-[11px] text-muted-foreground text-right mt-1">{descLen}/2000</div>
        </div>
      )}
    </div>
  );
}

function Shell({
  children,
  lang,
  onLang,
  title,
  brand,
}: {
  children: React.ReactNode;
  lang?: Idioma;
  onLang?: (l: Idioma) => void;
  title?: string;
  brand?: Brand;
}) {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-[#0b1a3a] text-white sticky top-0 z-30">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <div className="min-w-0 flex items-center gap-3">
            {brand?.logo ? (
              <img
                src={brand.logo}
                alt={brand?.nome ?? "SLTK Americas"}
                className="h-8 w-auto object-contain shrink-0"
              />
            ) : (
              <div className="text-xs uppercase tracking-widest text-white/60">
                {brand?.nome ?? "SLTK Americas"}
              </div>
            )}
            {title && <div className="font-semibold truncate">{title}</div>}
          </div>
          {onLang && (
            <div className="flex items-center gap-1 bg-white/10 rounded-md p-0.5 text-sm">
              {(["pt", "es", "en"] as const).map((l) => (
                <button
                  key={l}
                  onClick={() => onLang(l)}
                  aria-pressed={lang === l}
                  className={`px-2 py-1 rounded transition ${lang === l ? "bg-white text-[#0b1a3a] font-medium" : "text-white/80 hover:text-white"}`}
                  title={l === "pt" ? "Português" : l === "es" ? "Español" : "English"}
                >
                  <span aria-hidden>{l === "pt" ? "🇧🇷" : l === "es" ? "🇪🇸" : "🇺🇸"}</span>{" "}
                  {l.toUpperCase()}
                </button>
              ))}
            </div>
          )}
        </div>
      </header>
      <main className="px-4 py-8">{children}</main>
    </div>
  );
}

function SplashScreen({
  progress,
  brand,
  playingOut,
}: {
  progress: number;
  brand: Brand | null;
  playingOut: boolean;
}) {
  return (
    <div
      className={`fixed inset-0 z-50 overflow-hidden bg-[#0b1a3a] text-white flex items-center justify-center transition-opacity duration-500 ${playingOut ? "entrevista-splash-out" : ""}`}
      aria-busy={!playingOut}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          background: "radial-gradient(60% 50% at 50% 40%, rgba(59,130,246,0.25), transparent 70%)",
        }}
      />

      <div className="relative flex flex-col items-center gap-8 px-6 w-full max-w-md">
        <div className="flex flex-col items-center gap-4">
          <div className="text-2xl sm:text-3xl font-bold tracking-widest">
            {brand?.nome ?? "SLTK AMERICAS"}
          </div>
        </div>

        <div className="w-full space-y-2">
          <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-sky-400 to-blue-500 transition-[width] duration-150 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-xs text-white/60 tabular-nums">
            <span>Carregando entrevista…</span>
            <span>{progress}%</span>
          </div>
        </div>
      </div>

      <style>{`
        .entrevista-splash-out { animation: entrevistaSplashOut 700ms cubic-bezier(0.65, 0, 0.35, 1) forwards; }
        @keyframes entrevistaSplashOut {
          0% { clip-path: circle(150% at 50% 50%); opacity: 1; }
          70% { opacity: 1; }
          100% { clip-path: circle(0% at 50% 50%); opacity: 0; }
        }
        .entrevista-reveal { animation: entrevistaReveal 650ms cubic-bezier(0.22, 1, 0.36, 1) both; }
        @keyframes entrevistaReveal {
          0% { clip-path: circle(0% at 50% 50%); opacity: 0; }
          100% { clip-path: circle(150% at 50% 50%); opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          .entrevista-splash-out, .entrevista-reveal { animation: none; }
        }
      `}</style>
    </div>
  );
}
