import { createFileRoute, Link, notFound, Outlet } from "@tanstack/react-router";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { getCategory } from "@/content/docs/types";
import { getArticlesByCategory, getFaqsByCategory } from "@/content/docs/loader";

export const Route = createFileRoute("/_authenticated/ajuda/documentacao/$categoria")({
  loader: ({ params }) => {
    const cat = getCategory(params.categoria);
    if (!cat) throw notFound();
    return {
      cat,
      articles: getArticlesByCategory(cat.id),
      faqs: getFaqsByCategory(cat.id),
    };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: loaderData ? `${loaderData.cat.label} — Documentação` : "Categoria" },
      { name: "description", content: loaderData?.cat.description ?? "" },
      { name: "robots", content: "noindex" },
    ],
  }),
  notFoundComponent: () => (
    <PageContainer>
      <PageHeader
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Central de ajuda", href: "/ajuda" },
          { label: "Documentação", href: "/ajuda/documentacao" },
        ]}
        title="Categoria não encontrada"
      />
      <p className="text-sm text-[var(--text-muted)]">
        <Link to="/ajuda/documentacao" className="text-[var(--info)] underline">
          Voltar para categorias
        </Link>
      </p>
    </PageContainer>
  ),
  component: () => <Outlet />,
});
