import { createFileRoute } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2, Gauge, Settings2, ShieldCheck, Wrench, Zap } from "lucide-react";
import { PublicSiteShell } from "@/components/site/PublicSiteShell";


const heroImg = "/site-images/envasadora-hero.webp";
const close01 = "/site-images/envasadora-close-01.webp";
const close03 = "/site-images/envasadora-close-03.webp";
const closeFinal = "/site-images/envasadora-close-final.webp";
const mesaImg = "/site-images/envasadora-mesa.webp";

export const Route = createFileRoute("/equipamentos/envasadora")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Envasadora Rotativa 100 FLEX — Solutek" },
      {
        name: "description",
        content:
          "Linha de envase rotativo Solutek 100 FLEX: enchimento volumétrico de líquidos, cremes e produtos viscosos com troca rápida de formato, mesa giratória e tampagem integrada.",
      },
      { property: "og:title", content: "Envasadora Rotativa 100 FLEX — Solutek" },
      { property: "og:description", content: "Envase rotativo turn-key para líquidos, cremes e viscosos." },
      { property: "og:url", content: "https://sltkamericas.com/equipamentos/envasadora" },
      { property: "og:image", content: `https://sltkamericas.com${heroImg}` },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: `https://sltkamericas.com${heroImg}` },
    ],
    links: [{ rel: "canonical", href: "https://sltkamericas.com/equipamentos/envasadora" }],
  }),
  component: EnvasadoraPage,
});

const specs: { label: string; value: string }[] = [
  { label: "Cadência", value: "até 60 frascos/min" },
  { label: "Formato", value: "Ø 30 – 120 mm · 50 – 280 mm alt." },
  { label: "Volume", value: "30 – 1.000 ml" },
  { label: "Bicos de envase", value: "4, 6 ou 8 bicos rotativos" },
  { label: "Precisão", value: "±0,5% por dose" },
  { label: "Tampagem", value: "rosca, pressão ou recravação" },
  { label: "Construção", value: "AISI 304 / 316L sanitário" },
  { label: "Controle", value: "CLP + IHM 7\" · Indústria 4.0 ready" },
];

const highlights = [
  {
    icon: Gauge,
    title: "Alta precisão volumétrica",
    desc: "Sistema servo-acionado mantém dose estável mesmo em produtos com viscosidade variável.",
  },
  {
    icon: Settings2,
    title: "Troca rápida de formato",
    desc: "Set-up mecânico sem ferramentas; mudança de frasco em minutos para reduzir downtime.",
  },
  {
    icon: ShieldCheck,
    title: "Padrão sanitário",
    desc: "Construção em inox AISI 304/316L, design CIP-friendly e atende GMP para farma, cosmético e alimentos.",
  },
  {
    icon: Zap,
    title: "Pronta para integração",
    desc: "CLP aberto (Siemens/Allen-Bradley), conectividade OPC-UA e dashboards de OEE em tempo real.",
  },
];

const applications = [
  "Líquidos finos — água, sucos, álcool, soluções químicas",
  "Cremes e géis — cosméticos, dermocosméticos, farma tópica",
  "Produtos viscosos — molhos, mel, óleos lubrificantes",
  "Detergentes e químicos domissanitários",
];

function EnvasadoraPage() {
  return (
    <PublicSiteShell variant="solid">
      <Hero />
      <Intro />
      <Specs />
      <Highlights />
      <Gallery />
      <Applications />
      <CTA />
    </PublicSiteShell>
  );
}


function Hero() {
  return (
    <section className="relative isolate overflow-hidden bg-slate-950 text-white">
      <div
        aria-hidden
        className="absolute inset-0 -z-10 opacity-70"
        style={{
          background:
            "radial-gradient(60% 80% at 20% 30%, rgba(59,130,246,0.35) 0%, transparent 60%), linear-gradient(135deg, #0f172a 0%, #1e3a8a 60%, #312e81 100%)",
        }}
      />
      <div className="mx-auto grid max-w-[1280px] items-center gap-10 px-5 py-20 md:grid-cols-2 md:gap-14 md:px-10 md:py-28">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-blue-300">
            ENVASADORA · SÉRIE 100 FLEX
          </span>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight md:text-5xl">
            Envase rotativo de alta precisão para indústrias que não param.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-300">
            A 100 FLEX é a plataforma turn-key da Solutek para envase de líquidos, cremes e produtos viscosos —
            mesa giratória de alimentação, enchimento volumétrico servo-acionado e tampagem integrada em
            uma única célula compacta.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="/contato"
              className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-900/40 hover:bg-blue-500"
            >
              Solicitar cotação <ArrowRight className="h-4 w-4" />
            </a>
            <a
              href="#especificacoes"
              className="inline-flex items-center gap-2 rounded-full border border-white/20 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/10"
            >
              Ver especificações
            </a>
          </div>
        </div>
        <div className="relative">
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5 shadow-2xl">
            <img src={heroImg} alt="Envasadora Rotativa 100 FLEX" className="h-full w-full object-contain" />
          </div>
        </div>
      </div>
    </section>
  );
}

function Intro() {
  return (
    <section className="border-b border-slate-100 py-20">
      <div className="mx-auto grid max-w-[1280px] gap-12 px-5 md:grid-cols-[1.1fr_1fr] md:px-10">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-blue-600">
            APRESENTAÇÃO
          </span>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">
            Uma máquina, três etapas, zero gargalo.
          </h2>
          <p className="mt-5 text-base leading-relaxed text-slate-600">
            Projetada para indústrias farmacêuticas, cosméticas, químicas e alimentícias, a 100 FLEX
            executa alimentação, enchimento e tampagem em sincronia, dispensando linhas auxiliares e
            reduzindo footprint. A arquitetura rotativa garante cadência estável e repetibilidade,
            enquanto os bicos modulares permitem trabalhar com produtos de comportamentos reológicos distintos.
          </p>
          <ul className="mt-6 space-y-2 text-sm text-slate-700">
            {[
              "Mesa de acúmulo Ø 800 mm integrada à máquina",
              "Bicos com sopro de retração — sem gotejamento",
              "Receitas armazenadas no CLP por SKU",
              "Sensores de presença frasco-a-frasco",
            ].map((b) => (
              <li key={b} className="flex gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 flex-none text-blue-600" />
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
          <img src={mesaImg} alt="Mesa giratória de alimentação" className="h-full w-full object-contain" />
        </div>
      </div>
    </section>
  );
}

function Specs() {
  return (
    <section id="especificacoes" className="bg-slate-50 py-20">
      <div className="mx-auto max-w-[1280px] px-5 md:px-10">
        <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-blue-600">
          ESPECIFICAÇÕES TÉCNICAS
        </span>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">
          Configuração técnica padrão.
        </h2>
        <p className="mt-3 max-w-2xl text-sm text-slate-600">
          Personalizamos cada projeto de acordo com o seu produto, formato e cadência. Os valores abaixo
          são a base da Série 100 FLEX.
        </p>
        <div className="mt-10 grid gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
          {specs.map((s) => (
            <div key={s.label} className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                {s.label}
              </div>
              <div className="mt-1 text-sm font-semibold text-slate-900">{s.value}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Highlights() {
  return (
    <section className="py-20">
      <div className="mx-auto max-w-[1280px] px-5 md:px-10">
        <div className="grid items-start gap-10 md:grid-cols-[1fr_1.1fr]">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-blue-600">
              DESTAQUES
            </span>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">
              Engenharia que reduz o custo por frasco.
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-slate-600">
              Cada componente foi escolhido para maximizar OEE: servomotores Sew/Lenze, bombas
              dosadoras Mouvex, sensores Sick e CLP padrão de mercado. Sem dependência de fornecedor exclusivo.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {highlights.map((h) => (
              <div key={h.title} className="rounded-2xl border border-slate-200 bg-white p-5">
                <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                  <h.icon className="h-4 w-4" />
                </div>
                <h3 className="mt-3 text-base font-semibold text-slate-900">{h.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{h.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Gallery() {
  const items = [
    { src: close01, label: "Estação de envase" },
    { src: closeFinal, label: "Reservatório e bomba dosadora" },
    { src: close03, label: "Célula compacta com IHM" },
  ];
  return (
    <section className="bg-slate-50 py-20">
      <div className="mx-auto max-w-[1280px] px-5 md:px-10">
        <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-blue-600">
          GALERIA
        </span>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">
          Veja a 100 FLEX por dentro.
        </h2>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {items.map((it) => (
            <figure
              key={it.label}
              className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
            >
              <div className="aspect-[4/5] overflow-hidden">
                <img src={it.src} alt={it.label} loading="lazy" className="h-full w-full object-cover" />
              </div>
              <figcaption className="px-5 py-3 text-sm font-medium text-slate-700">{it.label}</figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

function Applications() {
  return (
    <section className="py-20">
      <div className="mx-auto grid max-w-[1280px] gap-10 px-5 md:grid-cols-2 md:px-10">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-blue-600">
            APLICAÇÕES
          </span>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">
            Para o seu segmento, do seu jeito.
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-slate-600">
            A 100 FLEX é entregue com receita validada para o seu produto. Fazemos testes em fábrica
            com a sua amostra antes do FAT.
          </p>
        </div>
        <ul className="grid gap-3">
          {applications.map((a) => (
            <li
              key={a}
              className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700"
            >
              <Wrench className="mt-0.5 h-4 w-4 flex-none text-blue-600" />
              <span>{a}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section className="bg-slate-950 py-20 text-white">
      <div className="mx-auto max-w-[1280px] px-5 md:px-10">
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
              Pronto para envasar com mais precisão e menos paradas?
            </h2>
            <p className="mt-2 text-sm text-slate-300">
              Receba uma proposta técnica em até 48h com layout, cadência e payback estimado.
            </p>
          </div>
          <a
            href="/contato"
            className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-500"
          >
            Solicitar cotação <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </div>
    </section>
  );
}

