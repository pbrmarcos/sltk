import { Link } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2, MessageCircle, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { useBrandSettingsOptional } from "@/hooks/use-brand-settings";
import { useLandingI18n, type Lang } from "@/lib/landing-i18n";

export type SolucaoFeature = {
  icon: LucideIcon;
  title: string;
  description: string;
};

export type SolucaoBenefit = {
  icon: LucideIcon;
  title: string;
  description: string;
};

export type SolucaoGalleryItem = {
  src: string;
  alt: string;
  caption: string;
};

export type SolucaoStep = {
  title: string;
  description: string;
};

export type SolucaoLangContent = {
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  heroAlt?: string;
  intro?: ReactNode;
  pills?: string[];
  featureTexts?: { title: string; description: string }[];
  benefitTexts?: { title: string; description: string }[];
  galleryTexts?: { alt: string; caption: string }[];
  steps?: SolucaoStep[];
  sectors?: string[];
};

export type SolucaoPageProps = {
  eyebrow: string;
  title: string;
  subtitle: string;
  heroImage: string;
  heroAlt: string;
  ctaAssunto: string;
  intro: ReactNode;
  pills: string[];
  features: SolucaoFeature[];
  benefits: SolucaoBenefit[];
  gallery: SolucaoGalleryItem[];
  steps: SolucaoStep[];
  sectors: string[];
  /** Optional per-language overrides. `pt` is the fallback from top-level props. */
  i18n?: Partial<Record<Lang, SolucaoLangContent>>;
};

export function SolucaoPageTemplate(p: SolucaoPageProps) {
  const { settings } = useBrandSettingsOptional();
  const { lang, t } = useLandingI18n();
  const s = t.solucao;

  const override: SolucaoLangContent = (lang !== "pt" && p.i18n?.[lang]) || {};

  const eyebrow = override.eyebrow ?? p.eyebrow;
  const title = override.title ?? p.title;
  const subtitle = override.subtitle ?? p.subtitle;
  const heroAlt = override.heroAlt ?? p.heroAlt;
  const intro = override.intro ?? p.intro;
  const pills = override.pills ?? p.pills;
  const sectors = override.sectors ?? p.sectors;
  const steps = override.steps ?? p.steps;

  const features: SolucaoFeature[] = p.features.map((f, i) => {
    const tx = override.featureTexts?.[i];
    return tx ? { ...f, title: tx.title, description: tx.description } : f;
  });
  const benefits: SolucaoBenefit[] = p.benefits.map((b, i) => {
    const tx = override.benefitTexts?.[i];
    return tx ? { ...b, title: tx.title, description: tx.description } : b;
  });
  const gallery: SolucaoGalleryItem[] = p.gallery.map((g, i) => {
    const tx = override.galleryTexts?.[i];
    return tx ? { ...g, alt: tx.alt, caption: tx.caption } : g;
  });

  const ctaHref = `/contato?assunto=${encodeURIComponent(p.ctaAssunto)}`;
  const waDigits = (settings?.contact_whatsapp || "").replace(/\D/g, "");
  const waMsg = encodeURIComponent(`${s.waMsgPrefix} ${p.ctaAssunto}.`);
  const waHref = waDigits ? `https://wa.me/${waDigits}?text=${waMsg}` : null;

  return (
    <div className="bg-white text-slate-900">
      {/* HERO */}
      <section className="relative isolate overflow-hidden bg-slate-950 text-white">
        <img
          src={p.heroImage}
          alt={heroAlt}
          loading="eager"
          decoding="async"
          fetchPriority="high"
          sizes="100vw"
          className="absolute inset-0 h-full w-full object-cover opacity-45"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/70 via-slate-950/60 to-slate-950/90" />
        <div className="relative mx-auto flex min-h-[70vh] max-w-[1180px] flex-col justify-end px-5 py-24 md:min-h-[80vh] md:px-10 md:py-32">
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/80 backdrop-blur">
            {eyebrow}
          </span>
          <h1 className="mt-5 max-w-3xl text-3xl font-black leading-[1.05] tracking-tight md:text-5xl lg:text-6xl">
            {title}
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-white/80 md:text-lg">
            {subtitle}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to={ctaHref as any}
              className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-900/40 transition hover:bg-blue-500"
            >
              {s.requestDiagnosis}
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/equipamentos"
              className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-6 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/10"
            >
              {s.viewEquipment}
            </Link>
          </div>
        </div>
      </section>

      {/* INTRO */}
      <section className="mx-auto max-w-[1180px] px-5 py-16 md:px-10 md:py-24">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr] md:gap-16">
          <div className="text-base leading-relaxed text-slate-700 md:text-lg">{intro}</div>
          <div className="flex flex-wrap gap-2 self-start">
            {pills.map((pill) => (
              <span
                key={pill}
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700"
              >
                <CheckCircle2 className="h-3.5 w-3.5 text-blue-600" />
                {pill}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="border-y border-slate-200 bg-slate-50 py-16 md:py-24">
        <div className="mx-auto max-w-[1180px] px-5 md:px-10">
          <div className="max-w-2xl">
            <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-blue-600">
              {s.whatWeDeliverKicker}
            </span>
            <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-900 md:text-4xl">
              {s.whatWeDeliverTitle}
            </h2>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f) => (
              <div
                key={f.title}
                className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md"
              >
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 ring-1 ring-blue-100">
                  <f.icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 text-base font-bold text-slate-900">{f.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* GALLERY */}
      <section className="bg-slate-50 py-16 md:py-24">
        <div className="mx-auto max-w-[1180px] px-5 md:px-10">
          <div className="mb-10 max-w-2xl">
            <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-blue-600">
              {s.portfolioKicker}
            </span>
            <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-900 md:text-4xl">
              {s.portfolioTitle}
            </h2>
          </div>

          {gallery.length > 0 && (
            <figure className="group relative overflow-hidden rounded-3xl bg-slate-900 shadow-xl">
              <div className="aspect-[16/9] w-full sm:aspect-[21/9]">
                <img
                  src={gallery[0].src}
                  alt={gallery[0].alt}
                  loading="lazy"
                  decoding="async"
                  width={1600}
                  height={900}
                  sizes="(min-width: 1200px) 1120px, 100vw"
                  className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.02]"
                />
              </div>
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-black/90 via-black/60 to-transparent sm:h-1/2" />
              <figcaption className="absolute inset-x-0 bottom-0 px-5 py-5 text-sm font-medium leading-snug text-white drop-shadow sm:px-6 md:px-8 md:py-6 md:text-base">
                {gallery[0].caption}
              </figcaption>
            </figure>
          )}

          {gallery.length > 1 && (
            <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {gallery.slice(1).map((g, i) => (
                <figure
                  key={i}
                  className="group relative overflow-hidden rounded-2xl bg-slate-900 shadow-md ring-1 ring-slate-200"
                >
                  <div className="aspect-[4/3] w-full">
                    <img
                      src={g.src}
                      alt={g.alt}
                      loading="lazy"
                      decoding="async"
                      width={800}
                      height={600}
                      sizes="(min-width: 1024px) 360px, (min-width: 640px) 50vw, 100vw"
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                    />
                  </div>
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-black/90 via-black/60 to-transparent sm:h-1/2" />
                  <figcaption className="absolute inset-x-0 bottom-0 px-4 py-3 text-xs font-medium leading-snug text-white drop-shadow sm:text-sm">
                    {g.caption}
                  </figcaption>
                </figure>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* BENEFITS */}
      <section className="border-y border-slate-200 bg-white py-16 md:py-24">
        <div className="mx-auto max-w-[1180px] px-5 md:px-10">
          <div className="max-w-2xl">
            <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-blue-600">
              {s.whyKicker}
            </span>
            <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-900 md:text-4xl">
              {s.whyTitle}
            </h2>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {benefits.map((b) => (
              <div
                key={b.title}
                className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md"
              >
                <div className="absolute inset-x-0 top-0 h-1 bg-blue-600" />
                <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 ring-1 ring-blue-100">
                  <b.icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 text-base font-bold text-slate-900">{b.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{b.description}</p>
              </div>
            ))}
          </div>

          {/* MID CTA */}
          <div className="mt-12 flex flex-col items-start gap-4 rounded-2xl border border-blue-100 bg-blue-50/60 p-6 sm:flex-row sm:items-center sm:justify-between md:p-8">
            <div className="max-w-xl">
              <h3 className="text-lg font-bold text-slate-900 md:text-xl">{s.midCtaTitle}</h3>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">{s.midCtaBody}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                to={ctaHref as any}
                className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-900/20 transition hover:bg-blue-500"
              >
                {s.midCtaPrimary}
                <ArrowRight className="h-4 w-4" />
              </Link>
              {waHref && (
                <a
                  href={waHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border border-emerald-600 bg-white px-5 py-2.5 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50"
                >
                  <MessageCircle className="h-4 w-4" />
                  {s.whatsapp}
                </a>
              )}
            </div>
          </div>
        </div>
      </section>


      {/* PROCESS */}
      <section className="border-y border-slate-200 bg-slate-900 py-16 text-white md:py-24">
        <div className="mx-auto max-w-[1180px] px-5 md:px-10">
          <div className="max-w-2xl">
            <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-blue-300">
              {s.howKicker}
            </span>
            <h2 className="mt-3 text-2xl font-black tracking-tight text-white md:text-4xl">
              {s.howTitle}
            </h2>
          </div>
          <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step, i) => (
              <li
                key={step.title}
                className="relative rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur"
              >
                <span className="text-[11px] font-mono uppercase tracking-[0.22em] text-blue-300">
                  {s.step} {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="mt-3 text-lg font-bold">{step.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-white/70">{step.description}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* SECTORS */}
      <section className="mx-auto max-w-[1180px] px-5 py-16 md:px-10 md:py-20">
        <div className="flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
          <div className="max-w-xl">
            <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-blue-600">
              {s.sectorsKicker}
            </span>
            <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-900 md:text-3xl">
              {s.sectorsTitle}
            </h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {sectors.map((sec) => (
              <span
                key={sec}
                className="rounded-full border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700"
              >
                {sec}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="bg-gradient-to-br from-blue-700 via-blue-800 to-slate-900 py-16 text-white md:py-20">
        <div className="mx-auto flex max-w-[1180px] flex-col items-start gap-6 px-5 md:flex-row md:items-center md:justify-between md:px-10">
          <div className="max-w-2xl">
            <h2 className="text-2xl font-black tracking-tight md:text-3xl">{s.finalCtaTitle}</h2>
            <p className="mt-2 text-white/80">{s.finalCtaBody}</p>
          </div>
          <Link
            to={ctaHref as any}
            className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-slate-900 shadow-lg transition hover:bg-slate-100"
          >
            {s.finalCtaBtn}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
