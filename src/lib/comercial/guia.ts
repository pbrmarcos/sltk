import type { PipelineStage } from "@/lib/oportunidades.functions";

export type GuiaEtapa = {
  id: string;
  titulo: string;
  resumo: string;
  antes: string[];
  doc?: { categoria: string; slug: string };
};

const DOC = (categoria: string, slug: string) => ({ categoria, slug });

/** Trilha completa do processo comercial: do suspect ao cliente ativo. */
export const FLUXO_COMERCIAL: GuiaEtapa[] = [
  {
    id: "suspect",
    titulo: "Suspect (lead)",
    resumo: "Empresa identificada, ainda sem necessidade confirmada.",
    antes: [
      "Origem do lead registrada (mineração, indicação, formulário do site).",
      "Empresa e um contato com e-mail ou telefone.",
    ],
    doc: DOC("comercial", "pipeline-de-oportunidades"),
  },
  {
    id: "oportunidade",
    titulo: "Oportunidade",
    resumo: "O suspect vira card no pipeline com escopo e valor estimado.",
    antes: [
      "Use + Nova oportunidade, converta um lead da Mineração ou receba pelo formulário público.",
      "Título curto com o escopo (ex.: “Linha de envase — Aurora Foods”).",
    ],
    doc: DOC("comercial", "pipeline-de-oportunidades"),
  },
  {
    id: "entrevista",
    titulo: "Entrevista",
    resumo: "Conversa estruturada para entender processo, produto e volumes.",
    antes: ["Contato confirmado.", "Agenda definida em Minha conta (Google/Teams)."],
    doc: DOC("comercial", "entrevistas"),
  },
  {
    id: "checklist",
    titulo: "Checklist técnico",
    resumo: "Formulário público enviado ao cliente para levantar requisitos.",
    antes: ["Entrevista realizada.", "Tipo de checklist escolhido para o equipamento."],
    doc: DOC("comercial", "checklist-publico-e-formularios"),
  },
  {
    id: "proposta",
    titulo: "Proposta / Orçamento",
    resumo: "Orçamento gerado a partir do escopo levantado.",
    antes: ["Checklist respondido.", "Valor estimado e prazo preenchidos no card."],
    doc: DOC("comercial", "novo-orcamento"),
  },
  {
    id: "negociacao",
    titulo: "Negociação",
    resumo: "Ajustes finais de preço, prazo e condições.",
    antes: ["Proposta enviada e registrada nas anotações da oportunidade."],
    doc: DOC("comercial", "pipeline-de-oportunidades"),
  },
  {
    id: "ganho",
    titulo: "Ganho → Cliente ativo",
    resumo: "Conversão em cliente ativo e abertura do processo de engenharia/produção.",
    antes: [
      "Cliente cadastrado (não apenas lead) e vinculado à oportunidade.",
      "Template de processo definido para gerar as etapas.",
    ],
    doc: DOC("comercial", "fechar-oportunidade"),
  },
];

/** Dica objetiva por coluna do Kanban: o que garantir antes de avançar. */
export const STAGE_GUIA: Record<PipelineStage, { antes: string[]; proximo: string }> = {
  novo: {
    antes: ["Empresa e contato preenchidos", "Origem do lead identificada"],
    proximo: "Qualifique: confirme a necessidade e agende a entrevista.",
  },
  qualificado: {
    antes: ["Entrevista realizada ou agendada", "Necessidade e escopo mínimo confirmados"],
    proximo: "Envie o checklist técnico e monte a proposta.",
  },
  proposta: {
    antes: ["Checklist técnico respondido", "Valor estimado preenchido"],
    proximo: "Envie o orçamento e registre o retorno do cliente.",
  },
  negociacao: {
    antes: ["Proposta enviada", "Prazo e condições comerciais registrados"],
    proximo: "Feche como Ganho (converte em cliente) ou registre a perda com motivo.",
  },
  ganho: {
    antes: ["Cliente vinculado (não apenas lead)", "Template de processo escolhido"],
    proximo: "Gere o orçamento final e acompanhe o processo de engenharia.",
  },
  perdido: {
    antes: ["Motivo da perda com pelo menos 10 caracteres"],
    proximo: "Reabra pela aba Perdidas quando o cliente voltar a decidir.",
  },
};

/** Avisos suaves quando o card é movido sem os dados esperados. */
export function avisoMover(
  stage: PipelineStage,
  opp: { cliente_id: string | null; empresa_lead: string | null; valor_estimado: number | null },
): string | null {
  if (stage === "ganho" && !opp.cliente_id) {
    return "Esta oportunidade ainda não tem cliente cadastrado — o assistente vai pedir para criar ou vincular um.";
  }
  if (stage === "qualificado" && !opp.empresa_lead && !opp.cliente_id) {
    return "Sem empresa informada. Preencha a empresa antes de qualificar.";
  }
  if ((stage === "proposta" || stage === "negociacao") && !opp.valor_estimado) {
    return "Sem valor estimado: a previsão do pipeline fica distorcida.";
  }
  return null;
}
