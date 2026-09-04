import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowRight,
  CheckCircle2,
  Cpu,
  Cog,
  Factory,
  Globe2,
  MessageCircle,
  Phone,
  Sparkles,
} from "lucide-react";
import { useLandingI18n } from "@/lib/landing-i18n";
import { PublicSiteShell } from "@/components/site/PublicSiteShell";
import { listPaginasPublicadas } from "@/lib/equipamento-pagina.functions";

const fachadaUrl = "/site-images/solutek-fachada.jpg";
const aboutRoboticaUrl = "/site-images/solutek-robotica.webp";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "SLTK Americas — Engenharia de Packaging e Automação Industrial" },
      {
        name: "description",
        content:
          "A Solutek projeta, fabrica e implanta linhas completas de envase, paletização e automação industrial nas Américas. 15+ anos, 35+ países.",
      },
      { property: "og:title", content: "SLTK Americas — Engenharia de Packaging" },
      {
        property: "og:description",
        content: "Soluções turn-key de packaging e automação industrial para as Américas.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://sltkamericas.com/" },
      { property: "og:image", content: `https://sltkamericas.com${fachadaUrl}` },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: `https://sltkamericas.com${fachadaUrl}` },
    ],
    links: [{ rel: "canonical", href: "https://sltkamericas.com/" }],
  }),
  component: () => (
    <PublicSiteShell variant="overlay">
      <LandingPage />
    </PublicSiteShell>
  ),
});

function LandingPage() {
  return (
    <>
      <Hero />
      <Services />
      <About />
      <Stats />
      <Equipment />
      <CtaBanner />
    </>
  );
}


/* ============================ Hero ============================ */

function Hero() {
  const { t } = useLandingI18n();
  return (
    <section id="inicio" className="relative isolate min-h-[680px] overflow-hidden md:min-h-[760px]">
      {/* Background image */}
      <div className="absolute inset-0 -z-10">
        <img
          src={fachadaUrl}
          alt="Fachada Solutek"
          className="h-full w-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/95 via-slate-950/75 to-slate-950/30" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
      </div>

      <div className="mx-auto flex min-h-[680px] max-w-[1280px] flex-col justify-center px-5 pt-32 pb-20 md:min-h-[760px] md:px-10 md:pt-40">
        <div className="max-w-2xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/80 backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
            {t.hero.kicker}
          </span>

          <h1 className="mt-6 text-[2.5rem] font-semibold leading-[1.05] tracking-tight text-white sm:text-5xl md:text-[4rem]">
            {t.hero.title1}
            <br />
            <span className="bg-gradient-to-br from-white via-sky-100 to-blue-300 bg-clip-text text-transparent">
              {t.hero.title2}
            </span>
          </h1>

          <p className="mt-6 max-w-xl text-[15px] leading-relaxed text-white/75 md:text-base">
            {t.hero.subtitle}
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-3">
            <a
              href="#contato"
              className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/30 transition hover:bg-blue-500"
            >
              {t.hero.ctaPrimary}
              <ArrowRight className="h-4 w-4" />
            </a>
            <a
              href="#equipamentos"
              className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/5 px-6 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/10"
            >
              {t.hero.ctaSecondary}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ============================ Services ============================ */

function Services() {
  const { t } = useLandingI18n();
  const icons = [Cog, Cpu, Sparkles];
  return (
    <section id="servicos" className="bg-white py-24 md:py-32">
      <div className="mx-auto max-w-[1280px] px-5 md:px-10">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-blue-600">
            {t.services.kicker}
          </span>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900 md:text-[2.4rem] md:leading-tight">
            {t.services.title}
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-slate-600">{t.services.subtitle}</p>
        </div>

        <div className="mt-16 grid gap-6 md:grid-cols-3">
          {t.services.items.map((s, i) => {
            const Icon = icons[i] ?? Cog;
            const hrefs = [
              "/solucoes/projetos-industriais-automacao",
              "/solucoes/tecnologia-de-processos",
              "/solucoes/consultoria-implementacao",
            ];
            return (
              <div
                key={s.title}
                className="group relative flex flex-col rounded-2xl border border-slate-200 bg-white p-8 transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_20px_50px_-20px_rgba(15,23,42,0.15)]"
              >
                <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600 ring-1 ring-inset ring-blue-100">
                  <Icon className="h-5 w-5" strokeWidth={1.75} />
                </div>
                <h3 className="text-lg font-semibold tracking-tight text-slate-900">{s.title}</h3>
                <p className="mt-3 flex-1 text-[14px] leading-relaxed text-slate-600">{s.desc}</p>
                <Link
                  to={hrefs[i] ?? "#contato"}
                  className="mt-6 inline-flex items-center gap-1 text-sm font-medium text-blue-600 transition group-hover:gap-2"
                >
                  {t.services.cta}
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ============================ About ============================ */

function About() {
  const { t } = useLandingI18n();
  return (
    <section id="sobre" className="bg-slate-50 py-24 md:py-32">
      <div className="mx-auto max-w-[1280px] px-5 md:px-10">
        <div className="mx-auto max-w-3xl text-center">
          <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-blue-600">
            {t.about.kicker}
          </span>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900 md:text-[2.4rem] md:leading-tight">
            {t.about.title}
          </h2>
        </div>

        <div className="mt-14 grid items-center gap-12 md:grid-cols-2">
          <div className="relative">
            <div className="aspect-[4/3] overflow-hidden rounded-2xl shadow-[0_30px_80px_-30px_rgba(15,23,42,0.35)] ring-1 ring-slate-200">
              <img
                src={aboutRoboticaUrl}
                alt="Célula robótica Solutek"
                loading="lazy"
                className="h-full w-full object-cover"
              />
            </div>
            <div className="absolute -bottom-6 -right-6 hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-xl md:block">
              <div className="flex items-center gap-3">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                  <Globe2 className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xs font-medium uppercase tracking-wider text-slate-500">
                    Global
                  </div>
                  <div className="text-sm font-semibold text-slate-900">35+ países</div>
                </div>
              </div>
            </div>
          </div>

          <div>
            <p className="text-[15px] leading-relaxed text-slate-600 md:text-base">
              {t.about.body}
            </p>
            <ul className="mt-7 space-y-3">
              {t.about.bullets.map((b) => (
                <li key={b} className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 flex-none text-blue-600" strokeWidth={2} />
                  <span className="text-[14.5px] text-slate-700">{b}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ============================ Clients ============================ */

function Clients() {
  const { t } = useLandingI18n();
  const names = ["LIFEGUARD", "LILY'S FLOWERS", "CLIMB THE MOUNTAIN", "IDEABOX", "GOLDEN", "BULLSEYE"];
  return (
    <section className="border-y border-slate-200 bg-white py-14">
      <div className="mx-auto max-w-[1280px] px-5 md:px-10">
        <p className="text-center text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
          {t.clients.kicker}
        </p>
        <div className="mt-8 grid grid-cols-2 items-center gap-x-8 gap-y-6 sm:grid-cols-3 md:grid-cols-6">
          {names.map((n) => (
            <div
              key={n}
              className="text-center text-[12px] font-bold uppercase tracking-[0.18em] text-slate-300 transition hover:text-slate-500"
            >
              {n}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============================ Stats ============================ */

function Stats() {
  const { t } = useLandingI18n();
  return (
    <section className="bg-white py-24 md:py-32">
      <div className="mx-auto max-w-[1280px] px-5 md:px-10">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-blue-600">
            {t.stats.kicker}
          </span>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900 md:text-[2.4rem]">
            {t.stats.title}
          </h2>
        </div>
        <div className="mt-16 grid gap-10 md:grid-cols-3 md:gap-12">
          {t.stats.items.map((s) => (
            <div key={s.label} className="text-left md:text-center">
              <div className="flex items-baseline gap-1 md:justify-center">
                <span className="bg-gradient-to-br from-slate-900 to-slate-500 bg-clip-text text-6xl font-semibold tracking-tight text-transparent md:text-7xl">
                  {s.value.replace(/[+%]/g, "")}
                </span>
                <span className="text-3xl font-semibold text-slate-400 md:text-4xl">
                  {s.value.match(/[+%]/)?.[0]}
                </span>
              </div>
              <div className="mt-3 text-base font-semibold text-slate-900">{s.label}</div>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============================ Equipment ============================ */

function Equipment() {
  const { t } = useLandingI18n();
  const listFn = useServerFn(listPaginasPublicadas);
  const { data, isLoading } = useQuery({
    queryKey: ["home", "equipamentos-publicados"],
    queryFn: () => listFn(),
    staleTime: 5 * 60_000,
  });
  const items = (data ?? []).slice(0, 6);

  return (
    <section id="equipamentos" className="bg-slate-50 py-24 md:py-32">
      <div className="mx-auto max-w-[1280px] px-5 md:px-10">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-blue-600">
            {t.equipment.kicker}
          </span>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900 md:text-[2.4rem]">
            {t.equipment.title}
          </h2>
          <p className="mt-3 text-sm text-slate-500">
            {(data ?? []).length > 0 && `${(data ?? []).length} equipamentos no catálogo`}
          </p>
        </div>

        {isLoading ? (
          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-64 animate-pulse rounded-2xl border border-slate-200 bg-white" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <p className="mt-14 rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
            Nenhum equipamento publicado no momento.
          </p>
        ) : (
          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((e) => (
              <Link
                key={e.id}
                to="/equipamentos/$slug"
                params={{ slug: e.slug }}
                className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-[0_20px_50px_-20px_rgba(15,23,42,0.15)]"
              >
                <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-slate-100 via-slate-50 to-white">
                  {e.og_image_url ? (
                    <img
                      src={e.og_image_url}
                      alt={e.nome_pt}
                      loading="lazy"
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-blue-300">
                      <Factory className="h-16 w-16" />
                    </div>
                  )}
                  <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
                </div>
                <div className="flex flex-1 flex-col p-6">
                  {e.familia && (
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-blue-600">
                      {e.familia}
                    </span>
                  )}
                  <h3 className="mt-1 text-base font-semibold tracking-tight text-slate-900">
                    {e.nome_pt}
                  </h3>
                  {e.seo_description_pt && (
                    <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-slate-600">
                      {e.seo_description_pt}
                    </p>
                  )}
                  <span className="mt-auto inline-flex items-center gap-1 pt-4 text-sm font-medium text-blue-600 transition group-hover:gap-2">
                    {t.equipment.cta}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}

        {items.length > 0 && (
          <div className="mt-10 text-center">
            <Link
              to="/equipamentos"
              className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-6 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              {t.equipment.seeAll} <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}


/* ============================ CTA Banner ============================ */

function CtaBanner() {
  const { t } = useLandingI18n();
  return (
    <section id="contato" className="relative isolate overflow-hidden bg-slate-950 py-20 md:py-28">
      <div
        aria-hidden
        className="absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(60% 80% at 20% 30%, rgba(59,130,246,0.35) 0%, transparent 60%), radial-gradient(70% 80% at 90% 80%, rgba(99,102,241,0.30) 0%, transparent 60%), linear-gradient(135deg, #1e3a8a 0%, #1e40af 40%, #312e81 100%)",
        }}
      />
      <div
        aria-hidden
        className="absolute inset-0 -z-10 opacity-[0.06]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      <div className="mx-auto max-w-[1280px] px-5 text-center md:px-10">
        <h2 className="mx-auto max-w-3xl text-3xl font-semibold leading-tight tracking-tight text-white md:text-[2.6rem]">
          {t.cta.title}
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-[15px] text-white/75">{t.cta.subtitle}</p>
        <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <a
            href="https://wa.me/554796350101"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
          >
            <MessageCircle className="h-4 w-4" />
            {t.cta.primary}
          </a>
          <a
            href="mailto:contato@sltkamercias.com"
            className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20"
          >
            <Phone className="h-4 w-4" />
            {t.cta.secondary}
          </a>
        </div>
      </div>
    </section>
  );
}

