import { assetUrl } from "@/lib/asset-url";
import { createFileRoute } from "@tanstack/react-router";
import { Package, Boxes, Droplets, ScanLine, Timer, Sparkles, Gauge, Headphones } from "lucide-react";
import { PublicSiteShell } from "@/components/site/PublicSiteShell";
import { SolucaoPageTemplate } from "@/components/site/SolucaoPageTemplate";
import heroAsset from "@/assets/solucoes/flowpack-101.7.webp.asset.json";
import gRondo from "@/assets/solucoes/flowpack-100-rondofish.18.webp.asset.json";
import gVerde from "@/assets/solucoes/verde-valle-100.39.webp.asset.json";
import gClose from "@/assets/solucoes/close-final-01.webp.asset.json";

const CANONICAL = "https://sltkamericas.com/solucoes/tecnologia-de-processos";
const HERO_ABS = assetUrl(heroAsset.url);

export const Route = createFileRoute("/solucoes/tecnologia-de-processos")({
  head: () => ({
    meta: [
      { title: "Tecnologia de Processos de Embalagem — Solutek" },
      {
        name: "description",
        content:
          "Flowpack, case-packing, envase e codificação com tecnologia Solutek. Máquinas e linhas completas para alimentos, bebidas, químicos e cosméticos.",
      },
      { property: "og:title", content: "Tecnologia de Processos — Solutek" },
      {
        property: "og:description",
        content:
          "Flowpack, case-packing, envase líquido e codificação: tecnologia Solutek para linhas industriais de alta performance.",
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
          name: "Tecnologia de Processos de Embalagem",
          serviceType: "Máquinas e linhas de embalagem",
          provider: { "@type": "Organization", name: "Solutek Américas", url: "https://sltkamericas.com" },
          areaServed: "Américas",
          description:
            "Flowpack, case-packing, envase líquido e codificação com tecnologia Solutek.",
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
        title="Tecnologia de processos para embalagem industrial."
        subtitle="Máquinas e linhas de flowpack, case-packing, envase e codificação desenvolvidas com engenharia proprietária Solutek — desempenho, higiene e trocas rápidas por design."
        heroImage={assetUrl(heroAsset.url)}
        heroAlt="Case-packer Solutek em operação, com esteira de saída"
        ctaAssunto="Tecnologia de Processos"
        intro={
          <>
            <p>
              Cada equipamento Solutek nasce de um problema real de linha. Desenvolvemos e
              fabricamos flowpacks horizontais, encaixotadoras, envasadoras rotativas, doseadoras
              e sistemas de codificação prontos para operar 24/7 em ambientes exigentes.
            </p>
            <p className="mt-4">
              Estruturas em aço inox 304/316L, servo-acionamento nos eixos críticos, IHM em
              português e receitas parametrizáveis para trocas de formato em minutos — não em
              horas.
            </p>
          </>
        }
        pills={["Servo-acionamento", "Inox 304/316L", "Trocas rápidas"]}
        features={[
          { icon: Package, title: "Flowpack & VFFS", description: "Empacotamento horizontal e vertical com formadores de saco intercambiáveis." },
          { icon: Boxes, title: "Case-packing", description: "Encaixotadoras wraparound e top-load para embalagens primárias e secundárias." },
          { icon: Droplets, title: "Envase líquido", description: "Envasadoras rotativas e lineares para produtos viscosos, alimentícios e químicos." },
          { icon: ScanLine, title: "Codificação & inspeção", description: "Datadores, visão artificial e check-weighers integrados à linha." },
        ]}
        benefits={[
          { icon: Timer, title: "Trocas rápidas", description: "Receitas parametrizáveis reduzem o changeover de horas para minutos." },
          { icon: Sparkles, title: "Higiene sanitária", description: "Estruturas em aço inox 304/316L, fáceis de limpar e inspecionar." },
          { icon: Gauge, title: "Servo-acionamento", description: "Precisão, velocidade e repetibilidade nos eixos críticos da linha." },
          { icon: Headphones, title: "Suporte local", description: "Peças de reposição, assistência técnica e treinamento no Brasil." },
        ]}
        gallery={[
          { src: assetUrl(heroAsset.url), alt: "Case-packer Solutek em vista frontal", caption: "Case-packer Solutek — encaixotamento automático de embalagens primárias." },
          { src: assetUrl(gRondo.url), alt: "Flowpack Solutek em aço inox", caption: "Flowpack inox para linhas de pescado e proteína." },
          { src: assetUrl(gVerde.url), alt: "Linha Solutek com esteira longa e wrapping", caption: "Linha completa com esteira de acumulação e wrapper." },
          { src: assetUrl(gClose.url), alt: "Detalhe da envasadora rotativa Solutek", caption: "Detalhe: tanque de alimentação e envase rotativo." },
        ]}
        steps={[
          { title: "Descoberta", description: "Análise do produto, embalagem, cadência e restrições sanitárias." },
          { title: "Projeto", description: "Seleção da tecnologia, dimensionamento e simulação de OEE." },
          { title: "Execução", description: "Fabricação em série curta, FAT com o cliente e transporte especializado." },
          { title: "Suporte", description: "Instalação, treinamento e peças de reposição com estoque local." },
        ]}
        sectors={["Alimentos", "Bebidas", "Higiene & Cosméticos", "Químico", "Pet food", "Pescados"]}
        i18n={{
          en: {
            eyebrow: "Solutek Solutions",
            title: "Process technology for industrial packaging.",
            subtitle: "Flowpack, case-packing, filling and coding machines and lines engineered by Solutek — performance, hygiene and fast changeovers by design.",
            heroAlt: "Solutek case-packer running with outfeed conveyor",
            intro: (
              <>
                <p>Every Solutek machine is born from a real line problem. We design and build horizontal flowpacks, case-packers, rotary fillers, dosers and coding systems ready to run 24/7 in demanding environments.</p>
                <p className="mt-4">304/316L stainless-steel frames, servo drives on critical axes, HMIs in your local language and parametric recipes for format changes in minutes — not hours.</p>
              </>
            ),
            pills: ["Servo drives", "Stainless 304/316L", "Fast changeovers"],
            featureTexts: [
              { title: "Flowpack & VFFS", description: "Horizontal and vertical wrapping with interchangeable formers." },
              { title: "Case-packing", description: "Wraparound and top-load case-packers for primary and secondary packs." },
              { title: "Liquid filling", description: "Rotary and inline fillers for viscous, food and chemical products." },
              { title: "Coding & inspection", description: "Coders, machine vision and checkweighers integrated in-line." },
            ],
            benefitTexts: [
              { title: "Fast changeovers", description: "Parametric recipes cut changeover from hours to minutes." },
              { title: "Sanitary hygiene", description: "304/316L stainless frames, easy to clean and inspect." },
              { title: "Servo-driven", description: "Precision, speed and repeatability on the critical axes." },
              { title: "Local support", description: "Spare parts, technical assistance and training in the region." },
            ],
            galleryTexts: [
              { alt: "Solutek case-packer front view", caption: "Solutek case-packer — automatic case packing for primary packs." },
              { alt: "Stainless Solutek flowpack", caption: "Stainless flowpack for seafood and protein lines." },
              { alt: "Solutek line with long conveyor and wrapper", caption: "Full line with accumulation conveyor and wrapper." },
              { alt: "Detail of Solutek rotary filler", caption: "Detail: feed tank and rotary filling head." },
            ],
            steps: [
              { title: "Discovery", description: "Product, package, throughput and sanitary constraint analysis." },
              { title: "Design", description: "Technology selection, sizing and OEE simulation." },
              { title: "Execution", description: "Short-run manufacturing, FAT with the customer and specialized shipping." },
              { title: "Support", description: "Installation, training and local spare-parts stock." },
            ],
            sectors: ["Food", "Beverages", "Hygiene & Cosmetics", "Chemical", "Pet food", "Seafood"],
          },
          es: {
            eyebrow: "Soluciones Solutek",
            title: "Tecnología de procesos para envasado industrial.",
            subtitle: "Máquinas y líneas de flowpack, case-packing, envasado y codificación con ingeniería propia Solutek — rendimiento, higiene y cambios rápidos de formato.",
            heroAlt: "Case-packer Solutek en operación con cinta de salida",
            intro: (
              <>
                <p>Cada equipo Solutek nace de un problema real de línea. Diseñamos y fabricamos flowpacks horizontales, encajonadoras, envasadoras rotativas, dosificadoras y sistemas de codificación listos para operar 24/7 en entornos exigentes.</p>
                <p className="mt-4">Estructuras en acero inox 304/316L, servo-accionamiento en los ejes críticos, HMI en tu idioma y recetas paramétricas para cambios de formato en minutos, no en horas.</p>
              </>
            ),
            pills: ["Servo-accionamiento", "Inox 304/316L", "Cambios rápidos"],
            featureTexts: [
              { title: "Flowpack y VFFS", description: "Envasado horizontal y vertical con formadores intercambiables." },
              { title: "Case-packing", description: "Encajonadoras wraparound y top-load para envases primarios y secundarios." },
              { title: "Envasado líquido", description: "Envasadoras rotativas y lineales para productos viscosos, alimentarios y químicos." },
              { title: "Codificación e inspección", description: "Codificadores, visión artificial y checkweighers integrados en línea." },
            ],
            benefitTexts: [
              { title: "Cambios rápidos", description: "Recetas paramétricas reducen el changeover de horas a minutos." },
              { title: "Higiene sanitaria", description: "Estructuras en inox 304/316L, fáciles de limpiar e inspeccionar." },
              { title: "Servo-accionamiento", description: "Precisión, velocidad y repetibilidad en los ejes críticos." },
              { title: "Soporte local", description: "Repuestos, asistencia técnica y capacitación en la región." },
            ],
            galleryTexts: [
              { alt: "Case-packer Solutek vista frontal", caption: "Case-packer Solutek — encajonado automático de envases primarios." },
              { alt: "Flowpack Solutek en inox", caption: "Flowpack inox para líneas de pescado y proteína." },
              { alt: "Línea Solutek con cinta larga y wrapper", caption: "Línea completa con cinta de acumulación y wrapper." },
              { alt: "Detalle de la envasadora rotativa Solutek", caption: "Detalle: tanque de alimentación y envasado rotativo." },
            ],
            steps: [
              { title: "Descubrimiento", description: "Análisis de producto, envase, cadencia y restricciones sanitarias." },
              { title: "Diseño", description: "Selección de tecnología, dimensionamiento y simulación de OEE." },
              { title: "Ejecución", description: "Fabricación en serie corta, FAT con el cliente y transporte especializado." },
              { title: "Soporte", description: "Instalación, capacitación y repuestos con stock local." },
            ],
            sectors: ["Alimentos", "Bebidas", "Higiene y Cosméticos", "Químico", "Pet food", "Pescados"],
          },
        }}
      />
    </PublicSiteShell>
  );
}
