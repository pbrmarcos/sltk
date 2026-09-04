import { createFileRoute } from "@tanstack/react-router";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { FaqAccordion } from "@/components/ajuda/FaqAccordion";
import { FAQS } from "@/content/docs/loader";

export const Route = createFileRoute("/_authenticated/ajuda/faq")({
  head: () => ({
    meta: [
      { title: "FAQ — Solutek Hub" },
      { name: "description", content: "Perguntas frequentes sobre o Solutek Hub." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: FaqPage,
});

function FaqPage() {
  return (
    <PageContainer>
      <PageHeader
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Central de ajuda", href: "/ajuda" },
          { label: "FAQ" },
        ]}
        title="Perguntas frequentes"
        subtitle="Respostas rápidas para as dúvidas mais comuns do dia a dia."
      />
      <FaqAccordion items={FAQS} />
    </PageContainer>
  );
}
