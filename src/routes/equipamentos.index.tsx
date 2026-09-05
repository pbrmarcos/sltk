import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { Factory } from "lucide-react";
import { listPaginasPublicadas } from "@/lib/equipamento-pagina.functions";
import { PublicSiteShell } from "@/components/site/PublicSiteShell";

const opts = queryOptions({
  queryKey: ["equipamentos-index"],
  queryFn: () => listPaginasPublicadas(),
  staleTime: 5 * 60_000,
});

export const Route = createFileRoute("/equipamentos/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(opts),
  head: () => ({
    meta: [
      { title: "Equipamentos industriais — Solutek" },
      {
        name: "description",
        content:
          "Catálogo Solutek de equipamentos industriais: empacotamento, envase, paletização, inspeção, etiquetagem e linhas completas.",
      },
      { property: "og:title", content: "Equipamentos industriais — Solutek" },
      {
        property: "og:description",
        content:
          "Projetos sob medida de engenharia para empacotamento, envase, paletização e mais.",
      },
      { property: "og:url", content: "https://sltkamericas.com/equipamentos" },
    ],
    links: [{ rel: "canonical", href: "https://sltkamericas.com/equipamentos" }],
  }),
  errorComponent: () => (
    <PublicSiteShell variant="solid">
      <div className="mx-auto max-w-2xl px-5 py-24 text-center text-slate-700">
        <h1 className="text-3xl font-semibold text-slate-900">Ocorreu um erro</h1>
      </div>
    </PublicSiteShell>
  ),
  notFoundComponent: () => null,
  component: EquipamentosIndex,
});

function EquipamentosIndex() {
  const { data } = useSuspenseQuery(opts);
  return (
    <PublicSiteShell variant="solid">
      <section className="relative isolate bg-slate-950 py-24 text-white">
        <div
          aria-hidden
          className="absolute inset-0 -z-10 opacity-70"
          style={{
            background:
              "radial-gradient(60% 80% at 20% 30%, rgba(59,130,246,0.35) 0%, transparent 60%), linear-gradient(135deg, #0f172a 0%, #1e3a8a 60%, #312e81 100%)",
          }}
        />
        <div className="mx-auto max-w-[1280px] px-5 md:px-10">
          <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-blue-300">
            CATÁLOGO
          </span>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight md:text-5xl">
            Equipamentos industriais Solutek
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-300">
            Projetos de engenharia dedicados: empacotamento, envase, paletização, inspeção,
            etiquetagem e linhas completas — todos sob medida para a sua produção.
          </p>
        </div>
      </section>
      <section className="bg-slate-50 py-16">
        <div className="mx-auto max-w-[1280px] px-5 md:px-10">
          {data.length === 0 ? (
            <p className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
              Nenhum equipamento publicado no momento.
            </p>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {data.map((e) => (
                <Link
                  key={e.id}
                  to="/equipamentos/$slug"
                  params={{ slug: e.slug }}
                  className="group overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:border-blue-300 hover:shadow-lg"
                >
                  {e.og_image_url ? (
                    <div className="aspect-[4/3] overflow-hidden bg-slate-100">
                      <img
                        src={e.og_image_url}
                        alt={e.nome_pt}
                        className="h-full w-full object-cover transition group-hover:scale-105"
                        loading="lazy"
                      />
                    </div>
                  ) : (
                    <div className="flex aspect-[4/3] items-center justify-center bg-gradient-to-br from-blue-50 to-slate-100 text-blue-400">
                      <Factory className="h-14 w-14" />
                    </div>
                  )}
                  <div className="p-5">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-blue-600">
                      {e.familia || "Equipamento"}
                    </div>
                    <h3 className="mt-1 text-base font-semibold text-slate-900">{e.nome_pt}</h3>
                    {e.seo_description_pt && (
                      <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-slate-600">
                        {e.seo_description_pt}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </PublicSiteShell>
  );
}
