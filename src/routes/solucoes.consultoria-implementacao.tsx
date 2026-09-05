import { assetUrl } from "@/lib/asset-url";
import { createFileRoute } from "@tanstack/react-router";
import {
  LineChart,
  Compass,
  FlaskConical,
  GraduationCap,
  Search,
  Map,
  TrendingUp,
  TestTube,
} from "lucide-react";
import { PublicSiteShell } from "@/components/site/PublicSiteShell";
import { SolucaoPageTemplate } from "@/components/site/SolucaoPageTemplate";
import heroAsset from "@/assets/solucoes/20240525-182910-0.webp.asset.json";
import gRobot from "@/assets/solucoes/20231114-151233.webp.asset.json";
import gMont from "@/assets/solucoes/20250317-102758.webp.asset.json";

const CANONICAL = "https://sltkamericas.com/solucoes/consultoria-implementacao";
const HERO_ABS = assetUrl(heroAsset.url);

export const Route = createFileRoute("/solucoes/consultoria-implementacao")({
  head: () => ({
    meta: [
      { title: "Consultoria e Implementação Industrial — Solutek" },
      {
        name: "description",
        content:
          "Diagnóstico OEE, roadmap Indústria 4.0 e implementação assistida. Consultoria Solutek para modernizar sua operação com previsibilidade.",
      },
      { property: "og:title", content: "Consultoria e Implementação — Solutek" },
      {
        property: "og:description",
        content:
          "Diagnóstico, roadmap e implementação assistida para transformar sua operação industrial.",
      },
      { property: "og:type", content: "article" },
      { property: "og:url", content: CANONICAL },
      { property: "og:image", content: HERO_ABS },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: HERO_ABS },
    ],
    links: [{ rel: "canonical", href: CANONICAL }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Service",
          name: "Consultoria e Implementação Industrial",
          serviceType: "Consultoria em manufatura e automação",
          provider: {
            "@type": "Organization",
            name: "Solutek Américas",
            url: "https://sltkamericas.com",
          },
          areaServed: "Américas",
          description: "Diagnóstico OEE, roadmap Indústria 4.0 e implementação assistida.",
        }),
      },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <PublicSiteShell variant="solid">
      <SolucaoPageTemplate
        eyebrow="Soluções Solutek"
        title="Consultoria e implementação para indústria 4.0."
        subtitle="Antes de comprar máquina, é preciso entender o gargalo. Nossa consultoria diagnostica sua operação, propõe o roadmap certo e acompanha a execução até o resultado medido no chão de fábrica."
        heroImage={assetUrl(heroAsset.url)}
        heroAlt="Showroom Solutek com equipamentos e painéis institucionais"
        ctaAssunto="Consultoria & Implementação"
        intro={
          <>
            <p>
              A consultoria Solutek combina engenheiros com experiência de linha e especialistas em
              dados. Fazemos o diagnóstico de OEE, identificamos as três principais perdas de
              disponibilidade, performance e qualidade e priorizamos as intervenções por retorno.
            </p>
            <p className="mt-4">
              Do plano ao piloto, do piloto à escala: assumimos o compromisso com o número — não
              apenas com o entregável.
            </p>
          </>
        }
        pills={["Diagnóstico em 3 semanas", "Roadmap priorizado", "Resultado medido"]}
        features={[
          {
            icon: LineChart,
            title: "Diagnóstico OEE",
            description: "Levantamento de perdas, mapeamento de fluxo e baseline mensurado.",
          },
          {
            icon: Compass,
            title: "Roadmap Indústria 4.0",
            description: "Plano priorizado por payback, integrando automação, dados e pessoas.",
          },
          {
            icon: FlaskConical,
            title: "PoC & piloto",
            description: "Prova de conceito em célula isolada antes de escalar o investimento.",
          },
          {
            icon: GraduationCap,
            title: "Treinamento operacional",
            description:
              "Capacitação de operadores, líderes e manutenção com trilhas certificadas.",
          },
        ]}
        benefits={[
          {
            icon: Search,
            title: "Diagnóstico em 3 semanas",
            description: "Mapeamento rápido de perdas e baseline mensurado da operação.",
          },
          {
            icon: Map,
            title: "Roadmap por ROI",
            description: "Plano priorizado por payback, integrando automação, dados e pessoas.",
          },
          {
            icon: TrendingUp,
            title: "Resultado medido",
            description: "Compromisso com indicadores: OEE, disponibilidade e performance.",
          },
          {
            icon: TestTube,
            title: "Piloto antes da escala",
            description: "PoC em célula isolada para validar o investimento antes de escalar.",
          },
        ]}
        gallery={[
          {
            src: assetUrl(heroAsset.url),
            alt: "Showroom Solutek com mapa mundial",
            caption: "Solutek Américas — engenharia e implementação sob o mesmo teto.",
          },
          {
            src: assetUrl(gRobot.url),
            alt: "Célula robótica Solutek com robô antropomórfico azul",
            caption: "Célula robótica piloto — PoC antes da escala.",
          },
          {
            src: assetUrl(gMont.url),
            alt: "Estrutura Solutek em fase de comissionamento",
            caption: "Comissionamento assistido em campo, com equipe do cliente.",
          },
        ]}
        steps={[
          {
            title: "Descoberta",
            description:
              "Entrevistas com liderança, chão de fábrica e coleta de dados de produção.",
          },
          {
            title: "Projeto",
            description: "Diagnóstico, roadmap com casos de negócio e priorização por payback.",
          },
          {
            title: "Execução",
            description: "Coordenação de fornecedores, piloto e escalonamento controlado.",
          },
          {
            title: "Suporte",
            description: "Governança pós-implementação e follow-up de indicadores.",
          },
        ]}
        sectors={[
          "Alimentos",
          "Bebidas",
          "Higiene & Cosméticos",
          "Químico",
          "Pet food",
          "Pescados",
        ]}
        i18n={{
          en: {
            eyebrow: "Solutek Solutions",
            title: "Consulting and implementation for Industry 4.0.",
            subtitle:
              "Before buying a machine, you need to understand the bottleneck. Our consulting diagnoses your operation, proposes the right roadmap and follows execution through to the measured result on the shop floor.",
            heroAlt: "Solutek showroom with equipment and institutional panels",
            intro: (
              <>
                <p>
                  Solutek consulting combines line-experienced engineers with data specialists. We
                  run the OEE diagnosis, identify the top three losses in availability, performance
                  and quality, and prioritize actions by return.
                </p>
                <p className="mt-4">
                  From plan to pilot, from pilot to scale: we commit to the number — not just to the
                  deliverable.
                </p>
              </>
            ),
            pills: ["Diagnosis in 3 weeks", "Prioritized roadmap", "Measured result"],
            featureTexts: [
              {
                title: "OEE diagnosis",
                description: "Loss survey, value-stream mapping and measured baseline.",
              },
              {
                title: "Industry 4.0 roadmap",
                description: "Payback-prioritized plan integrating automation, data and people.",
              },
              {
                title: "PoC & pilot",
                description: "Proof of concept in an isolated cell before scaling the investment.",
              },
              {
                title: "Operational training",
                description: "Certified training tracks for operators, leaders and maintenance.",
              },
            ],
            benefitTexts: [
              {
                title: "Diagnosis in 3 weeks",
                description: "Fast loss mapping and measured operational baseline.",
              },
              {
                title: "ROI-driven roadmap",
                description: "Plan prioritized by payback across automation, data and people.",
              },
              {
                title: "Measured result",
                description: "Committed to indicators: OEE, availability and performance.",
              },
              {
                title: "Pilot before scale",
                description: "PoC in an isolated cell validates the investment before scaling.",
              },
            ],
            galleryTexts: [
              {
                alt: "Solutek showroom with world map",
                caption: "Solutek Américas — engineering and implementation under one roof.",
              },
              {
                alt: "Solutek robotic cell with blue anthropomorphic robot",
                caption: "Robotic pilot cell — PoC before scaling.",
              },
              {
                alt: "Solutek structure in commissioning phase",
                caption: "Assisted commissioning on site, with the customer's team.",
              },
            ],
            steps: [
              {
                title: "Discovery",
                description:
                  "Interviews with leadership and shop floor, plus production data collection.",
              },
              {
                title: "Design",
                description: "Diagnosis, roadmap with business cases and payback prioritization.",
              },
              {
                title: "Execution",
                description: "Supplier coordination, pilot and controlled scale-up.",
              },
              {
                title: "Support",
                description: "Post-implementation governance and indicator follow-up.",
              },
            ],
            sectors: [
              "Food",
              "Beverages",
              "Hygiene & Cosmetics",
              "Chemical",
              "Pet food",
              "Seafood",
            ],
          },
          es: {
            eyebrow: "Soluciones Solutek",
            title: "Consultoría e implementación para industria 4.0.",
            subtitle:
              "Antes de comprar una máquina hay que entender el cuello de botella. Nuestra consultoría diagnostica tu operación, propone el roadmap adecuado y acompaña la ejecución hasta el resultado medido en planta.",
            heroAlt: "Showroom Solutek con equipos y paneles institucionales",
            intro: (
              <>
                <p>
                  La consultoría Solutek combina ingenieros con experiencia de línea y especialistas
                  en datos. Hacemos el diagnóstico de OEE, identificamos las tres principales
                  pérdidas de disponibilidad, desempeño y calidad y priorizamos las intervenciones
                  por retorno.
                </p>
                <p className="mt-4">
                  Del plan al piloto, del piloto a la escala: nos comprometemos con el número — no
                  solo con el entregable.
                </p>
              </>
            ),
            pills: ["Diagnóstico en 3 semanas", "Roadmap priorizado", "Resultado medido"],
            featureTexts: [
              {
                title: "Diagnóstico OEE",
                description: "Relevamiento de pérdidas, mapeo de flujo y baseline medido.",
              },
              {
                title: "Roadmap Industria 4.0",
                description:
                  "Plan priorizado por payback, integrando automatización, datos y personas.",
              },
              {
                title: "PoC y piloto",
                description: "Prueba de concepto en célula aislada antes de escalar la inversión.",
              },
              {
                title: "Capacitación operacional",
                description: "Trayectos certificados para operadores, líderes y mantenimiento.",
              },
            ],
            benefitTexts: [
              {
                title: "Diagnóstico en 3 semanas",
                description: "Mapeo rápido de pérdidas y baseline medido de la operación.",
              },
              {
                title: "Roadmap por ROI",
                description: "Plan priorizado por payback en automatización, datos y personas.",
              },
              {
                title: "Resultado medido",
                description: "Compromiso con indicadores: OEE, disponibilidad y desempeño.",
              },
              {
                title: "Piloto antes de la escala",
                description: "PoC en célula aislada para validar la inversión antes de escalar.",
              },
            ],
            galleryTexts: [
              {
                alt: "Showroom Solutek con mapa mundial",
                caption: "Solutek Américas — ingeniería e implementación bajo el mismo techo.",
              },
              {
                alt: "Célula robótica Solutek con robot antropomórfico azul",
                caption: "Célula robótica piloto — PoC antes de la escala.",
              },
              {
                alt: "Estructura Solutek en fase de comisionamiento",
                caption: "Comisionamiento asistido en campo, con el equipo del cliente.",
              },
            ],
            steps: [
              {
                title: "Descubrimiento",
                description:
                  "Entrevistas con liderazgo, planta y recolección de datos de producción.",
              },
              {
                title: "Diseño",
                description:
                  "Diagnóstico, roadmap con casos de negocio y priorización por payback.",
              },
              {
                title: "Ejecución",
                description: "Coordinación de proveedores, piloto y escalamiento controlado.",
              },
              {
                title: "Soporte",
                description: "Gobernanza pos-implementación y seguimiento de indicadores.",
              },
            ],
            sectors: [
              "Alimentos",
              "Bebidas",
              "Higiene y Cosméticos",
              "Químico",
              "Pet food",
              "Pescados",
            ],
          },
        }}
      />
    </PublicSiteShell>
  );
}
