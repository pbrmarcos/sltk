import { createFileRoute, notFound } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { getPaginaPorSlug } from "@/lib/equipamento-pagina.functions";
import { PublicSiteShell } from "@/components/site/PublicSiteShell";
import { RenderBloco } from "@/components/equipamentos/blocos/Blocos";
import type { IdiomaPagina } from "@/lib/equipamento-pagina.shared";

function paginaOpts(slug: string) {
  return queryOptions({
    queryKey: ["equipamento-pagina", slug],
    queryFn: async () => {
      const data = await getPaginaPorSlug({ data: { slug } });
      if (!data) throw notFound();
      return data;
    },
    staleTime: 5 * 60_000,
  });
}

export const Route = createFileRoute("/equipamentos/$slug")({
  loader: ({ params, context }) => context.queryClient.ensureQueryData(paginaOpts(params.slug)),
  head: ({ loaderData, params }) => {
    const url = `https://sltkamericas.com/equipamentos/${params.slug}`;
    const p = loaderData?.pagina;
    if (!p) {
      return {
        meta: [
          { title: "Equipamento — Solutek" },
          { name: "description", content: "Equipamentos industriais Solutek." },
          { name: "robots", content: "noindex" },
        ],
      };
    }
    const title = p.seo_title_pt || `${p.nome_pt} — Solutek`;
    const description =
      p.seo_description_pt ||
      `Solução Solutek para ${p.nome_pt}. Solicite orçamento personalizado com engenharia dedicada.`;
    const meta: Array<Record<string, string>> = [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "article" },
      { property: "og:url", content: url },
      { name: "twitter:card", content: "summary_large_image" },
    ];
    if (p.og_image_url) {
      meta.push({ property: "og:image", content: p.og_image_url });
      meta.push({ name: "twitter:image", content: p.og_image_url });
    }
    return { meta, links: [{ rel: "canonical", href: url }] };
  },
  errorComponent: () => (
    <PublicSiteShell variant="solid">
      <div className="mx-auto max-w-2xl px-5 py-24 text-center text-slate-700">
        <h1 className="text-3xl font-semibold text-slate-900">Ocorreu um erro</h1>
        <p className="mt-3 text-sm">Não foi possível carregar esta página. Tente novamente em instantes.</p>
      </div>
    </PublicSiteShell>
  ),
  notFoundComponent: () => (
    <PublicSiteShell variant="solid">
      <div className="mx-auto max-w-2xl px-5 py-24 text-center text-slate-700">
        <h1 className="text-3xl font-semibold text-slate-900">Página não encontrada</h1>
        <p className="mt-3 text-sm">O equipamento buscado não foi encontrado ou ainda não foi publicado.</p>
        <a href="/equipamentos" className="mt-6 inline-block rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white">
          Ver todos os equipamentos
        </a>
      </div>
    </PublicSiteShell>
  ),
  component: PaginaEquipamento,
});

function PaginaEquipamento() {
  const { slug } = Route.useParams();
  const { data } = useSuspenseQuery(paginaOpts(slug));
  const url = new URL(typeof window !== "undefined" ? window.location.href : "http://x/");
  const idioma = (url.searchParams.get("lang") as IdiomaPagina) || "pt";
  const ctaHref = `/contato?assunto=Orçamento%20-%20${encodeURIComponent(data.pagina.nome_pt)}`;
  return (
    <PublicSiteShell variant="solid">
      {data.blocos.map((b) => (
        <RenderBloco key={b.id} bloco={b} idioma={idioma} ctaHref={ctaHref} />
      ))}
    </PublicSiteShell>
  );
}
