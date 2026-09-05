import { assetUrl } from "@/lib/asset-url";
import { createFileRoute } from "@tanstack/react-router";
import { Cpu, Cog, Network, Wrench, Zap, ShieldCheck, BarChart3, Rocket } from "lucide-react";
import { PublicSiteShell } from "@/components/site/PublicSiteShell";
import { SolucaoPageTemplate } from "@/components/site/SolucaoPageTemplate";
import heroAsset from "@/assets/solucoes/20250317-102758.webp.asset.json";
import gAliace from "@/assets/solucoes/aliace-com-adesivos-01.10.webp.asset.json";
import gFachada from "@/assets/solucoes/20240525-182910-0.webp.asset.json";

const CANONICAL = "https://sltkamericas.com/solucoes/projetos-industriais-automacao";
const HERO_ABS = assetUrl(heroAsset.url);

export const Route = createFileRoute("/solucoes/projetos-industriais-automacao")({
  head: () => ({
    meta: [
      { title: "Projetos Industriais e Automação — Solutek" },
      {
        name: "description",
        content:
          "Projetos turn-key de linhas industriais com automação PLC, robótica e integração MES/ERP. Engenharia Solutek dedicada da concepção ao comissionamento.",
      },
      { property: "og:title", content: "Projetos Industriais e Automação — Solutek" },
      {
        property: "og:description",
        content:
          "Projetos turn-key de linhas industriais com automação PLC, robótica e integração MES/ERP.",
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
          name: "Projetos Industriais e Automação",
          serviceType: "Engenharia de linhas industriais e automação",
          provider: {
            "@type": "Organization",
            name: "Solutek Américas",
            url: "https://sltkamericas.com",
          },
          areaServed: "Américas",
          description:
            "Projetos turn-key de linhas industriais com automação PLC, robótica e integração MES/ERP.",
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
        title="Projetos industriais e automação turn-key."
        subtitle="Da concepção do layout ao start-up assistido. Engenharia mecânica, elétrica, automação e integração de dados, entregues por um único time responsável pelo desempenho da linha."
        heroImage={assetUrl(heroAsset.url)}
        heroAlt="Montagem de estrutura Solutek em campo, com técnicos operando"
        ctaAssunto="Projeto Industrial & Automação"
        intro={
          <>
            <p>
              A Solutek projeta linhas completas para indústrias que precisam de repetibilidade,
              rastreabilidade e OEE alto — não apenas máquinas isoladas. Nosso time interno de
              mecânica, elétrica, automação e software entrega o projeto do zero e assume o
              comissionamento junto com o cliente.
            </p>
            <p className="mt-4">
              Trabalhamos com PLCs Siemens, Rockwell e Schneider, robôs colaborativos e
              antropomórficos, além de integração nativa com MES e ERP para telemetria de produção
              em tempo real.
            </p>
          </>
        }
        pills={["Turn-key", "Engenharia interna", "Start-up assistido"]}
        features={[
          {
            icon: Cog,
            title: "Engenharia de linha",
            description: "Layout, balanceamento de capacidade e detalhamento mecânico.",
          },
          {
            icon: Cpu,
            title: "Automação PLC & robótica",
            description: "Programação, IHM, safety e integração de robôs paletizadores.",
          },
          {
            icon: Network,
            title: "Integração MES/ERP",
            description: "Coleta OEE, apontamento de produção e ordens direto do ERP.",
          },
          {
            icon: Wrench,
            title: "Comissionamento",
            description: "FAT/SAT, treinamento de operação e garantia de performance.",
          },
        ]}
        benefits={[
          {
            icon: Zap,
            title: "Start-up rápido",
            description:
              "FAT, SAT e treinamento integrados reduzem o tempo de entrada em operação.",
          },
          {
            icon: ShieldCheck,
            title: "Responsabilidade única",
            description: "Um único time turn-key: menos interfaces, mais previsibilidade.",
          },
          {
            icon: BarChart3,
            title: "Rastreabilidade real",
            description: "Integração nativa com MES/ERP para dados de produção em tempo real.",
          },
          {
            icon: Rocket,
            title: "Performance garantida",
            description: "Compromisso com OEE, com suporte pós-start-up e peças no Brasil.",
          },
        ]}
        gallery={[
          {
            src: assetUrl(gAliace.url),
            alt: "Linha completa de envase de bombonas com automação Solutek",
            caption: "Linha automatizada de envase e rotulagem — projeto turn-key.",
          },
          {
            src: assetUrl(gFachada.url),
            alt: "Fábrica Solutek com backdrop institucional",
            caption: "Fábrica Solutek — engenharia e integração sob o mesmo teto.",
          },
        ]}
        steps={[
          {
            title: "Descoberta",
            description:
              "Visita técnica, coleta de dados de produto e mapeamento do processo atual.",
          },
          {
            title: "Projeto",
            description:
              "Layout, memorial descritivo, especificação de componentes e simulação de capacidade.",
          },
          {
            title: "Execução",
            description:
              "Fabricação em nossa unidade, FAT com o cliente e logística de instalação.",
          },
          {
            title: "Suporte",
            description: "Comissionamento, treinamento e contrato de manutenção preventiva.",
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
            title: "Turn-key industrial projects and automation.",
            subtitle:
              "From layout design to assisted start-up. Mechanical, electrical, automation and data engineering delivered by a single team accountable for line performance.",
            heroAlt: "Solutek structure being assembled on site by technicians",
            intro: (
              <>
                <p>
                  Solutek designs complete lines for industries that need repeatability,
                  traceability and high OEE — not just isolated machines. Our in-house mechanical,
                  electrical, automation and software team delivers the project from scratch and
                  takes on commissioning together with the customer.
                </p>
                <p className="mt-4">
                  We work with Siemens, Rockwell and Schneider PLCs, collaborative and
                  anthropomorphic robots, plus native MES/ERP integration for real-time production
                  telemetry.
                </p>
              </>
            ),
            pills: ["Turn-key", "In-house engineering", "Assisted start-up"],
            featureTexts: [
              {
                title: "Line engineering",
                description: "Layout, capacity balancing and mechanical detailing.",
              },
              {
                title: "PLC & robotics",
                description: "Programming, HMI, safety and integration of palletizing robots.",
              },
              {
                title: "MES/ERP integration",
                description: "OEE capture, production reporting and orders straight from the ERP.",
              },
              {
                title: "Commissioning",
                description: "FAT/SAT, operator training and performance guarantee.",
              },
            ],
            benefitTexts: [
              {
                title: "Fast start-up",
                description: "Integrated FAT, SAT and training shorten ramp-up.",
              },
              {
                title: "Single accountability",
                description: "One turn-key team: fewer interfaces, more predictability.",
              },
              {
                title: "Real traceability",
                description: "Native MES/ERP integration for real-time production data.",
              },
              {
                title: "Guaranteed performance",
                description: "OEE commitment with post-start-up support and local parts.",
              },
            ],
            galleryTexts: [
              {
                alt: "Full drum filling and labeling line with Solutek automation",
                caption: "Automated filling and labeling line — turn-key project.",
              },
              {
                alt: "Solutek factory with institutional backdrop",
                caption: "Solutek factory — engineering and integration under one roof.",
              },
            ],
            steps: [
              {
                title: "Discovery",
                description: "Site visit, product data gathering and current process mapping.",
              },
              {
                title: "Design",
                description: "Layout, specification memo, component spec and capacity simulation.",
              },
              {
                title: "Execution",
                description:
                  "In-house manufacturing, FAT with the customer and installation logistics.",
              },
              {
                title: "Support",
                description: "Commissioning, training and preventive-maintenance contract.",
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
            title: "Proyectos industriales y automatización llave en mano.",
            subtitle:
              "Del diseño del layout al start-up asistido. Ingeniería mecánica, eléctrica, automatización e integración de datos, entregadas por un único equipo responsable del desempeño de la línea.",
            heroAlt: "Montaje de estructura Solutek en campo con técnicos operando",
            intro: (
              <>
                <p>
                  Solutek diseña líneas completas para industrias que necesitan repetibilidad,
                  trazabilidad y OEE alto — no solo máquinas aisladas. Nuestro equipo interno de
                  mecánica, eléctrica, automatización y software entrega el proyecto desde cero y
                  asume el comisionamiento junto al cliente.
                </p>
                <p className="mt-4">
                  Trabajamos con PLCs Siemens, Rockwell y Schneider, robots colaborativos y
                  antropomórficos, además de integración nativa con MES y ERP para telemetría de
                  producción en tiempo real.
                </p>
              </>
            ),
            pills: ["Llave en mano", "Ingeniería interna", "Start-up asistido"],
            featureTexts: [
              {
                title: "Ingeniería de línea",
                description: "Layout, balanceo de capacidad y detalle mecánico.",
              },
              {
                title: "PLC y robótica",
                description: "Programación, HMI, seguridad e integración de robots paletizadores.",
              },
              {
                title: "Integración MES/ERP",
                description: "Captura de OEE, apuntamiento de producción y órdenes desde el ERP.",
              },
              {
                title: "Comisionamiento",
                description: "FAT/SAT, capacitación de operación y garantía de desempeño.",
              },
            ],
            benefitTexts: [
              {
                title: "Start-up rápido",
                description: "FAT, SAT y capacitación integrados reducen la puesta en marcha.",
              },
              {
                title: "Responsabilidad única",
                description: "Un único equipo llave en mano: menos interfaces, más previsibilidad.",
              },
              {
                title: "Trazabilidad real",
                description: "Integración nativa MES/ERP para datos de producción en tiempo real.",
              },
              {
                title: "Desempeño garantizado",
                description: "Compromiso con OEE, con soporte pos start-up y repuestos locales.",
              },
            ],
            galleryTexts: [
              {
                alt: "Línea completa de envasado de bidones con automatización Solutek",
                caption: "Línea automatizada de envasado y etiquetado — proyecto llave en mano.",
              },
              {
                alt: "Fábrica Solutek con backdrop institucional",
                caption: "Fábrica Solutek — ingeniería e integración bajo el mismo techo.",
              },
            ],
            steps: [
              {
                title: "Descubrimiento",
                description:
                  "Visita técnica, recolección de datos de producto y mapeo del proceso actual.",
              },
              {
                title: "Diseño",
                description:
                  "Layout, memorial descriptivo, especificación de componentes y simulación de capacidad.",
              },
              {
                title: "Ejecución",
                description:
                  "Fabricación en nuestra planta, FAT con el cliente y logística de instalación.",
              },
              {
                title: "Soporte",
                description:
                  "Comisionamiento, capacitación y contrato de mantenimiento preventivo.",
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
