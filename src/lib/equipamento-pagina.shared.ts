// Tipos compartilhados do CMS "Páginas dos Equipamentos".
import { z } from "zod";

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

export function defaultBlocoConteudo(
  tipo: BlocoTipo,
  nomeTipo = "Equipamento",
): Record<string, unknown> {
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
        descricao_pt:
          "Personalizamos cada projeto de acordo com o seu produto, formato e cadência.",
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
          {
            icone: "Gauge",
            titulo_pt: "Alta performance",
            texto_pt: "Cadência estável mesmo em produtos com variabilidade.",
          },
          {
            icone: "Settings2",
            titulo_pt: "Setup rápido",
            texto_pt: "Troca de formato em minutos, reduzindo downtime.",
          },
          {
            icone: "ShieldCheck",
            titulo_pt: "Padrão sanitário",
            texto_pt: "Design CIP-friendly conforme GMP.",
          },
          {
            icone: "Zap",
            titulo_pt: "Pronta para integração",
            texto_pt: "CLP aberto, OPC-UA e dashboards em tempo real.",
          },
        ],
      };
    case "casos_uso":
      return {
        eyebrow_pt: "APLICAÇÕES",
        titulo_pt: "Para o seu segmento, do seu jeito.",
        descricao_pt: "Entregamos cada projeto com receita validada para o seu produto.",
        itens: [
          {
            titulo_pt: "Farmacêutico",
            texto_pt: "Formatos e processos que atendem GMP.",
            imagem_url: "",
          },
          {
            titulo_pt: "Alimentício",
            texto_pt: "Materiais sanitários e limpeza CIP.",
            imagem_url: "",
          },
          { titulo_pt: "Químico", texto_pt: "Ambientes ATEX quando aplicável.", imagem_url: "" },
        ],
      };
    case "galeria":
      return { titulo_pt: "Galeria", imagens: [] as Array<{ url: string; alt_pt?: string }> };
    case "faq":
      return {
        titulo_pt: "Perguntas frequentes",
        itens: [
          {
            pergunta_pt: "Qual o prazo médio de entrega?",
            resposta_pt:
              "Depende do projeto, mas costuma variar de 90 a 180 dias após a validação técnica.",
          },
          {
            pergunta_pt: "Vocês fazem testes com o meu produto?",
            resposta_pt: "Sim. Testes com sua amostra são feitos antes do FAT.",
          },
          {
            pergunta_pt: "Qual o suporte pós-venda?",
            resposta_pt:
              "Contrato de manutenção e assistência técnica dedicada, presencial e remota.",
          },
        ],
      };
    case "video":
      return { titulo_pt: "Veja em operação", url: "" };
    case "cta_orcamento":
      return {
        titulo_pt: "Pronto para automatizar a sua linha?",
        subtitulo_pt:
          "Fale com nosso time e receba um projeto sob medida — do dimensionamento ao FAT.",
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

// ============================================================
// Ícones do bloco "benefícios" — fonte única usada tanto pelo
// renderer público (Blocos.tsx) quanto pelo seletor de ícone do
// formulário admin.
// ============================================================
export const BLOCO_ICONES = [
  "Gauge",
  "Settings2",
  "ShieldCheck",
  "Zap",
  "Wrench",
  "Beaker",
  "Factory",
  "LineChart",
  "Sparkles",
] as const;
export type IconeNome = (typeof BLOCO_ICONES)[number];

// ============================================================
// Schemas Zod por tipo de bloco — validam o "shape" de conteudo_json
// antes de salvar (adminUpdateBloco), pra trocar "JSON sintaticamente
// válido mas semanticamente quebrado" por um erro explícito. Campos
// `_pt` são obrigatórios só onde o renderer depende deles como
// fallback; `_es`/`_en` sempre opcionais (nem toda página está 100%
// traduzida).
// ============================================================
function campoIdiomas(base: string, ptObrigatorio: boolean) {
  return {
    [`${base}_pt`]: ptObrigatorio ? z.string().min(1, "obrigatório") : z.string().optional(),
    [`${base}_es`]: z.string().optional(),
    [`${base}_en`]: z.string().optional(),
  };
}

function campoListaIdiomas(base: string) {
  return {
    [`${base}_pt`]: z.array(z.string()).optional(),
    [`${base}_es`]: z.array(z.string()).optional(),
    [`${base}_en`]: z.array(z.string()).optional(),
  };
}

const especificacaoItemSchema = z.object({
  ...campoIdiomas("label", true),
  ...campoIdiomas("valor", true),
});

const beneficioItemSchema = z.object({
  icone: z.enum(BLOCO_ICONES).optional(),
  ...campoIdiomas("titulo", true),
  ...campoIdiomas("texto", true),
});

const casoUsoItemSchema = z.object({
  ...campoIdiomas("titulo", true),
  ...campoIdiomas("texto", true),
  imagem_url: z.string().optional(),
});

const imagemGaleriaSchema = z.object({
  url: z.string().min(1, "obrigatório"),
  alt_pt: z.string().optional(),
});

const faqItemSchema = z.object({
  ...campoIdiomas("pergunta", true),
  ...campoIdiomas("resposta", true),
});

export const BLOCO_SCHEMAS: Record<BlocoTipo, z.ZodTypeAny> = {
  hero: z.object({
    ...campoIdiomas("eyebrow", false),
    ...campoIdiomas("titulo", true),
    ...campoIdiomas("subtitulo", false),
    ...campoIdiomas("cta_label", false),
    imagem_url: z.string().optional(),
  }),
  descricao: z.object({
    ...campoIdiomas("eyebrow", false),
    ...campoIdiomas("titulo", true),
    ...campoIdiomas("texto", false),
    ...campoListaIdiomas("bullets"),
    imagem_url: z.string().optional(),
  }),
  especificacoes: z.object({
    ...campoIdiomas("eyebrow", false),
    ...campoIdiomas("titulo", true),
    ...campoIdiomas("descricao", false),
    itens: z.array(especificacaoItemSchema).optional(),
  }),
  beneficios: z.object({
    ...campoIdiomas("eyebrow", false),
    ...campoIdiomas("titulo", true),
    ...campoIdiomas("descricao", false),
    itens: z.array(beneficioItemSchema).optional(),
  }),
  casos_uso: z.object({
    ...campoIdiomas("eyebrow", false),
    ...campoIdiomas("titulo", true),
    ...campoIdiomas("descricao", false),
    itens: z.array(casoUsoItemSchema).optional(),
  }),
  galeria: z.object({
    ...campoIdiomas("titulo", false),
    imagens: z.array(imagemGaleriaSchema).optional(),
  }),
  faq: z.object({
    ...campoIdiomas("titulo", false),
    itens: z.array(faqItemSchema).optional(),
  }),
  video: z.object({
    ...campoIdiomas("titulo", false),
    url: z.string().optional(),
  }),
  cta_orcamento: z.object({
    ...campoIdiomas("titulo", true),
    ...campoIdiomas("subtitulo", false),
    ...campoIdiomas("cta_label", false),
  }),
};
