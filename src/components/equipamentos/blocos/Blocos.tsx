import {
  CheckCircle2,
  ArrowRight,
  Gauge,
  Settings2,
  ShieldCheck,
  Zap,
  Wrench,
  Beaker,
  Factory,
  LineChart,
  Sparkles,
} from "lucide-react";
import type { EquipamentoBloco, IdiomaPagina, IconeNome } from "@/lib/equipamento-pagina.shared";
import { pickTexto } from "@/lib/equipamento-pagina.shared";

const ICONES = {
  Gauge,
  Settings2,
  ShieldCheck,
  Zap,
  Wrench,
  Beaker,
  Factory,
  LineChart,
  Sparkles,
} satisfies Record<IconeNome, unknown>;

function pickList<T>(bloco: Record<string, unknown>, base: string, idioma: IdiomaPagina): T[] {
  const key = `${base}_${idioma}`;
  const fallback = `${base}_pt`;
  return ((bloco[key] as T[]) || (bloco[fallback] as T[]) || []) as T[];
}

function pickListItems<T = Record<string, unknown>>(bloco: Record<string, unknown>): T[] {
  return ((bloco["itens"] as T[]) || (bloco["imagens"] as T[]) || []) as T[];
}

export function BlocoHero({
  bloco,
  idioma,
  ctaHref,
}: {
  bloco: EquipamentoBloco;
  idioma: IdiomaPagina;
  ctaHref: string;
}) {
  const c = bloco.conteudo_json;
  const eyebrow = pickTexto(c, "eyebrow", idioma) || "EQUIPAMENTO INDUSTRIAL";
  const titulo = pickTexto(c, "titulo", idioma);
  const subtitulo = pickTexto(c, "subtitulo", idioma);
  const ctaLabel = pickTexto(c, "cta_label", idioma) || "Solicitar orçamento";
  const imagem = (c["imagem_url"] as string) || "";
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
            {eyebrow}
          </span>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight md:text-5xl">{titulo}</h1>
          {subtitulo && (
            <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-300">{subtitulo}</p>
          )}
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href={ctaHref}
              className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-900/40 hover:bg-blue-500"
            >
              {ctaLabel} <ArrowRight className="h-4 w-4" />
            </a>
            <a
              href="#especificacoes"
              className="inline-flex items-center gap-2 rounded-full border border-white/20 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/10"
            >
              Ver especificações
            </a>
          </div>
        </div>
        {imagem && (
          <div className="relative">
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5 shadow-2xl">
              <img src={imagem} alt={titulo} className="h-full w-full object-contain" />
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

export function BlocoDescricao({
  bloco,
  idioma,
}: {
  bloco: EquipamentoBloco;
  idioma: IdiomaPagina;
}) {
  const c = bloco.conteudo_json;
  const eyebrow = pickTexto(c, "eyebrow", idioma) || "APRESENTAÇÃO";
  const titulo = pickTexto(c, "titulo", idioma);
  const texto = pickTexto(c, "texto", idioma);
  const bullets = pickList<string>(c, "bullets", idioma);
  const imagem = (c["imagem_url"] as string) || "";
  return (
    <section className="border-b border-slate-100 bg-white py-20">
      <div className="mx-auto grid max-w-[1280px] gap-12 px-5 md:grid-cols-[1.1fr_1fr] md:px-10">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-blue-600">
            {eyebrow}
          </span>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">{titulo}</h2>
          {texto && <p className="mt-5 text-base leading-relaxed text-slate-600">{texto}</p>}
          {bullets.length > 0 && (
            <ul className="mt-6 space-y-2 text-sm text-slate-700">
              {bullets.map((b) => (
                <li key={b} className="flex gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 flex-none text-blue-600" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        {imagem && (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
            <img src={imagem} alt={titulo} className="h-full w-full object-contain" />
          </div>
        )}
      </div>
    </section>
  );
}

export function BlocoEspecificacoes({
  bloco,
  idioma,
}: {
  bloco: EquipamentoBloco;
  idioma: IdiomaPagina;
}) {
  const c = bloco.conteudo_json;
  const eyebrow = pickTexto(c, "eyebrow", idioma) || "ESPECIFICAÇÕES TÉCNICAS";
  const titulo = pickTexto(c, "titulo", idioma);
  const descricao = pickTexto(c, "descricao", idioma);
  const itens = pickListItems<{
    label_pt?: string;
    label_es?: string;
    label_en?: string;
    valor_pt?: string;
    valor_es?: string;
    valor_en?: string;
  }>(c);
  const l = (it: (typeof itens)[number]) =>
    (it[`label_${idioma}` as const] || it.label_pt || "") as string;
  const v = (it: (typeof itens)[number]) =>
    (it[`valor_${idioma}` as const] || it.valor_pt || "") as string;
  return (
    <section id="especificacoes" className="bg-slate-50 py-20">
      <div className="mx-auto max-w-[1280px] px-5 md:px-10">
        <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-blue-600">
          {eyebrow}
        </span>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">{titulo}</h2>
        {descricao && <p className="mt-3 max-w-2xl text-sm text-slate-600">{descricao}</p>}
        <div className="mt-10 grid gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
          {itens.map((it, i) => (
            <div key={i} className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                {l(it)}
              </div>
              <div className="mt-1 text-sm font-semibold text-slate-900">{v(it)}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function BlocoBeneficios({
  bloco,
  idioma,
}: {
  bloco: EquipamentoBloco;
  idioma: IdiomaPagina;
}) {
  const c = bloco.conteudo_json;
  const eyebrow = pickTexto(c, "eyebrow", idioma) || "DESTAQUES";
  const titulo = pickTexto(c, "titulo", idioma);
  const descricao = pickTexto(c, "descricao", idioma);
  const itens = pickListItems<{
    icone?: string;
    titulo_pt?: string;
    titulo_es?: string;
    titulo_en?: string;
    texto_pt?: string;
    texto_es?: string;
    texto_en?: string;
  }>(c);
  return (
    <section className="bg-white py-20">
      <div className="mx-auto max-w-[1280px] px-5 md:px-10">
        <div className="grid items-start gap-10 md:grid-cols-[1fr_1.1fr]">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-blue-600">
              {eyebrow}
            </span>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">{titulo}</h2>
            {descricao && (
              <p className="mt-4 text-sm leading-relaxed text-slate-600">{descricao}</p>
            )}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {itens.map((h, i) => {
              const Icon = ICONES[(h.icone as IconeNome) || "Sparkles"] || Sparkles;
              const t = (h[`titulo_${idioma}` as const] || h.titulo_pt || "") as string;
              const d = (h[`texto_${idioma}` as const] || h.texto_pt || "") as string;
              return (
                <div key={i} className="rounded-2xl border border-slate-200 bg-white p-5">
                  <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                    <Icon className="h-4 w-4" />
                  </div>
                  <h3 className="mt-3 text-base font-semibold text-slate-900">{t}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{d}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

export function BlocoCasosUso({
  bloco,
  idioma,
}: {
  bloco: EquipamentoBloco;
  idioma: IdiomaPagina;
}) {
  const c = bloco.conteudo_json;
  const eyebrow = pickTexto(c, "eyebrow", idioma) || "APLICAÇÕES";
  const titulo = pickTexto(c, "titulo", idioma);
  const descricao = pickTexto(c, "descricao", idioma);
  const itens = pickListItems<{
    titulo_pt?: string;
    titulo_es?: string;
    titulo_en?: string;
    texto_pt?: string;
    texto_es?: string;
    texto_en?: string;
    imagem_url?: string;
  }>(c);
  return (
    <section className="bg-slate-50 py-20">
      <div className="mx-auto max-w-[1280px] px-5 md:px-10">
        <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-blue-600">
          {eyebrow}
        </span>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">{titulo}</h2>
        {descricao && <p className="mt-3 max-w-2xl text-sm text-slate-600">{descricao}</p>}
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {itens.map((it, i) => (
            <div key={i} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
              {it.imagem_url ? (
                <div className="aspect-[4/3] overflow-hidden bg-slate-100">
                  <img
                    src={it.imagem_url}
                    alt={it.titulo_pt || ""}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                </div>
              ) : (
                <div className="flex aspect-[4/3] items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 text-slate-400">
                  <Factory className="h-10 w-10" />
                </div>
              )}
              <div className="p-5">
                <h3 className="text-base font-semibold text-slate-900">
                  {(it[`titulo_${idioma}` as const] || it.titulo_pt || "") as string}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                  {(it[`texto_${idioma}` as const] || it.texto_pt || "") as string}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function BlocoGaleria({ bloco, idioma }: { bloco: EquipamentoBloco; idioma: IdiomaPagina }) {
  const c = bloco.conteudo_json;
  const titulo = pickTexto(c, "titulo", idioma) || "Galeria";
  const imagens = ((c["imagens"] as Array<{ url: string; alt_pt?: string }>) || []).filter(
    (i) => i.url,
  );
  if (imagens.length === 0) return null;
  return (
    <section className="bg-white py-20">
      <div className="mx-auto max-w-[1280px] px-5 md:px-10">
        <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-blue-600">
          GALERIA
        </span>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">{titulo}</h2>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {imagens.map((im, i) => (
            <figure
              key={i}
              className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
            >
              <div className="aspect-[4/5] overflow-hidden">
                <img
                  src={im.url}
                  alt={im.alt_pt || ""}
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
              </div>
              {im.alt_pt && (
                <figcaption className="px-5 py-3 text-sm font-medium text-slate-700">
                  {im.alt_pt}
                </figcaption>
              )}
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

export function BlocoFaq({ bloco, idioma }: { bloco: EquipamentoBloco; idioma: IdiomaPagina }) {
  const c = bloco.conteudo_json;
  const titulo = pickTexto(c, "titulo", idioma) || "Perguntas frequentes";
  const itens = pickListItems<{
    pergunta_pt?: string;
    pergunta_es?: string;
    pergunta_en?: string;
    resposta_pt?: string;
    resposta_es?: string;
    resposta_en?: string;
  }>(c);
  return (
    <section className="bg-slate-50 py-20">
      <div className="mx-auto max-w-[900px] px-5 md:px-10">
        <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-blue-600">
          FAQ
        </span>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">{titulo}</h2>
        <div className="mt-8 divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white">
          {itens.map((it, i) => (
            <details key={i} className="group px-5 py-4 open:bg-slate-50">
              <summary className="cursor-pointer list-none text-sm font-semibold text-slate-900 marker:content-none">
                <div className="flex items-center justify-between gap-3">
                  <span>
                    {(it[`pergunta_${idioma}` as const] || it.pergunta_pt || "") as string}
                  </span>
                  <ArrowRight className="h-4 w-4 text-blue-600 transition-transform group-open:rotate-90" />
                </div>
              </summary>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                {(it[`resposta_${idioma}` as const] || it.resposta_pt || "") as string}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

export function BlocoVideo({ bloco, idioma }: { bloco: EquipamentoBloco; idioma: IdiomaPagina }) {
  const c = bloco.conteudo_json;
  const titulo = pickTexto(c, "titulo", idioma) || "Veja em operação";
  const url = (c["url"] as string) || "";
  if (!url) return null;
  const embed = toEmbed(url);
  return (
    <section className="bg-white py-20">
      <div className="mx-auto max-w-[1080px] px-5 md:px-10">
        <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-blue-600">
          VÍDEO
        </span>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">{titulo}</h2>
        <div className="mt-8 aspect-video overflow-hidden rounded-2xl border border-slate-200 bg-black">
          <iframe
            src={embed}
            className="h-full w-full"
            allow="autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
          />
        </div>
      </div>
    </section>
  );
}

function toEmbed(url: string): string {
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{6,})/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  const vm = url.match(/vimeo\.com\/(\d+)/);
  if (vm) return `https://player.vimeo.com/video/${vm[1]}`;
  return url;
}

export function BlocoCtaOrcamento({
  bloco,
  idioma,
  ctaHref,
}: {
  bloco: EquipamentoBloco;
  idioma: IdiomaPagina;
  ctaHref: string;
}) {
  const c = bloco.conteudo_json;
  const titulo = pickTexto(c, "titulo", idioma);
  const subtitulo = pickTexto(c, "subtitulo", idioma);
  const label = pickTexto(c, "cta_label", idioma) || "Solicitar orçamento";
  return (
    <section className="relative overflow-hidden bg-slate-950 py-20 text-white">
      <div
        aria-hidden
        className="absolute inset-0 -z-10 opacity-70"
        style={{
          background:
            "radial-gradient(60% 80% at 80% 20%, rgba(59,130,246,0.35) 0%, transparent 60%), linear-gradient(135deg, #0f172a 0%, #1e3a8a 60%, #312e81 100%)",
        }}
      />
      <div className="mx-auto flex max-w-[1100px] flex-col items-center gap-6 px-5 text-center md:px-10">
        <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">{titulo}</h2>
        {subtitulo && (
          <p className="max-w-2xl text-base leading-relaxed text-slate-300">{subtitulo}</p>
        )}
        <a
          href={ctaHref}
          className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-900/40 hover:bg-blue-500"
        >
          {label} <ArrowRight className="h-4 w-4" />
        </a>
      </div>
    </section>
  );
}

export function RenderBloco({
  bloco,
  idioma,
  ctaHref,
}: {
  bloco: EquipamentoBloco;
  idioma: IdiomaPagina;
  ctaHref: string;
}) {
  switch (bloco.tipo_bloco) {
    case "hero":
      return <BlocoHero bloco={bloco} idioma={idioma} ctaHref={ctaHref} />;
    case "descricao":
      return <BlocoDescricao bloco={bloco} idioma={idioma} />;
    case "especificacoes":
      return <BlocoEspecificacoes bloco={bloco} idioma={idioma} />;
    case "beneficios":
      return <BlocoBeneficios bloco={bloco} idioma={idioma} />;
    case "casos_uso":
      return <BlocoCasosUso bloco={bloco} idioma={idioma} />;
    case "galeria":
      return <BlocoGaleria bloco={bloco} idioma={idioma} />;
    case "faq":
      return <BlocoFaq bloco={bloco} idioma={idioma} />;
    case "video":
      return <BlocoVideo bloco={bloco} idioma={idioma} />;
    case "cta_orcamento":
      return <BlocoCtaOrcamento bloco={bloco} idioma={idioma} ctaHref={ctaHref} />;
    default:
      return null;
  }
}
