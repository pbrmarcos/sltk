// Tipos compartilhados do CMS "Páginas dos Equipamentos".
export type IdiomaPagina = "pt" | "es" | "en";

export type BlocoTipo =
  | "hero"
  | "descricao"
  | "especificacoes"
  | "beneficios"
  | "casos_uso"
  | "galeria"
  | "faq"
  | "video"
  | "cta_orcamento";

export type EquipamentoPagina = {
  id: string;
  tipo_id: string;
  slug: string;
  seo_title_pt: string | null;
  seo_title_es: string | null;
  seo_title_en: string | null;
  seo_description_pt: string | null;
  seo_description_es: string | null;
  seo_description_en: string | null;
  og_image_url: string | null;
  publicado: boolean;
  nome_pt?: string;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type EquipamentoBloco = {
  id: string;
  pagina_id: string;
  tipo_bloco: BlocoTipo;
  ordem: number;
  visivel: boolean;
  // Using `any` so the type is serializable across the RPC boundary.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  conteudo_json: Record<string, any>;
};

export const BLOCO_LABEL: Record<BlocoTipo, string> = {
  hero: "Hero",
  descricao: "Descrição rica",
  especificacoes: "Especificações técnicas",
  beneficios: "Benefícios",
  casos_uso: "Casos de uso",
  galeria: "Galeria de imagens",
  faq: "Perguntas frequentes",
  video: "Vídeo",
  cta_orcamento: "CTA — Solicitar orçamento",
};

export function defaultBlocoConteudo(tipo: BlocoTipo, nomeTipo = "Equipamento"): Record<string, unknown> {
  switch (tipo) {
    case "hero":
      return {
        eyebrow_pt: "EQUIPAMENTO INDUSTRIAL",
        titulo_pt: nomeTipo,
        subtitulo_pt:
          "Engenharia dedicada para a sua linha. Projeto, fabricação e comissionamento sob medida.",
        cta_label_pt: "Solicitar orçamento",
        imagem_url: "",
      };
    case "descricao":
      return {
        eyebrow_pt: "APRESENTAÇÃO",
        titulo_pt: "Uma máquina, resultados que ficam.",
        texto_pt: `A ${nomeTipo} da Solutek é projetada para atender indústrias exigentes com foco em confiabilidade, cadência estável e integração com sua linha existente.`,
        bullets_pt: [
          "Projeto de engenharia dedicado ao seu produto",
          "Construção sanitária em aço inox AISI 304 / 316L",
          "CLP padrão de mercado, com IHM e Indústria 4.0 ready",
          "Testes com sua amostra antes do FAT",
        ],
        imagem_url: "",
      };
    case "especificacoes":
      return {
        eyebrow_pt: "ESPECIFICAÇÕES TÉCNICAS",
        titulo_pt: "Configuração técnica padrão.",
        descricao_pt: "Personalizamos cada projeto de acordo com o seu produto, formato e cadência.",
        itens: [
          { label_pt: "Cadência", valor_pt: "sob consulta" },
          { label_pt: "Formato", valor_pt: "sob medida" },
          { label_pt: "Tensão", valor_pt: "220 / 380 / 440 V" },
          { label_pt: "Construção", valor_pt: "AISI 304 / 316L" },
          { label_pt: "Controle", valor_pt: 'CLP + IHM 7"' },
          { label_pt: "Certificação", valor_pt: "conforme demanda" },
        ],
      };
    case "beneficios":
      return {
        eyebrow_pt: "DESTAQUES",
        titulo_pt: "Engenharia que reduz o custo por unidade.",
        descricao_pt:
          "Cada componente é escolhido para maximizar OEE — sem dependência de fornecedor exclusivo.",
        itens: [
          { icone: "Gauge", titulo_pt: "Alta performance", texto_pt: "Cadência estável mesmo em produtos com variabilidade." },
          { icone: "Settings2", titulo_pt: "Setup rápido", texto_pt: "Troca de formato em minutos, reduzindo downtime." },
          { icone: "ShieldCheck", titulo_pt: "Padrão sanitário", texto_pt: "Design CIP-friendly conforme GMP." },
          { icone: "Zap", titulo_pt: "Pronta para integração", texto_pt: "CLP aberto, OPC-UA e dashboards em tempo real." },
        ],
      };
    case "casos_uso":
      return {
        eyebrow_pt: "APLICAÇÕES",
        titulo_pt: "Para o seu segmento, do seu jeito.",
        descricao_pt: "Entregamos cada projeto com receita validada para o seu produto.",
        itens: [
          { titulo_pt: "Farmacêutico", texto_pt: "Formatos e processos que atendem GMP.", imagem_url: "" },
          { titulo_pt: "Alimentício", texto_pt: "Materiais sanitários e limpeza CIP.", imagem_url: "" },
          { titulo_pt: "Químico", texto_pt: "Ambientes ATEX quando aplicável.", imagem_url: "" },
        ],
      };
    case "galeria":
      return { titulo_pt: "Galeria", imagens: [] as Array<{ url: string; alt_pt?: string }> };
    case "faq":
      return {
        titulo_pt: "Perguntas frequentes",
        itens: [
          { pergunta_pt: "Qual o prazo médio de entrega?", resposta_pt: "Depende do projeto, mas costuma variar de 90 a 180 dias após a validação técnica." },
          { pergunta_pt: "Vocês fazem testes com o meu produto?", resposta_pt: "Sim. Testes com sua amostra são feitos antes do FAT." },
          { pergunta_pt: "Qual o suporte pós-venda?", resposta_pt: "Contrato de manutenção e assistência técnica dedicada, presencial e remota." },
        ],
      };
    case "video":
      return { titulo_pt: "Veja em operação", url: "" };
    case "cta_orcamento":
      return {
        titulo_pt: "Pronto para automatizar a sua linha?",
        subtitulo_pt: "Fale com nosso time e receba um projeto sob medida — do dimensionamento ao FAT.",
        cta_label_pt: "Solicitar orçamento",
      };
  }
}

export function pickTexto(
  bloco: Record<string, unknown>,
  base: string,
  idioma: IdiomaPagina,
): string {
  const key = `${base}_${idioma}`;
  const fallback = `${base}_pt`;
  const v = (bloco[key] as string) || (bloco[fallback] as string) || "";
  return v;
}
