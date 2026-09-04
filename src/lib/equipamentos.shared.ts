export const EQUIPAMENTO_CATEGORIAS = [
  "envase",
  "rotulagem",
  "embalagem_secundaria",
  "paletizacao",
  "transporte",
  "automacao",
  "outro",
] as const;
export type EquipamentoCategoria = (typeof EQUIPAMENTO_CATEGORIAS)[number];

export const EQUIPAMENTO_CATEGORIA_LABEL: Record<EquipamentoCategoria, string> = {
  envase: "Envase",
  rotulagem: "Rotulagem",
  embalagem_secundaria: "Embalagem secundária",
  paletizacao: "Paletização",
  transporte: "Transporte",
  automacao: "Automação",
  outro: "Outro",
};

/**
 * Ciclo de vida do equipamento — da engenharia ao pós-venda.
 * A ordem reflete o fluxo natural: planejamento → operacional → descomissionado.
 */
export const EQUIPAMENTO_STATUS = [
  "planejamento",
  "em_fabricacao",
  "em_qualidade",
  "pronto_entrega",
  "em_transporte",
  "em_instalacao",
  "operacional",
  "manutencao",
  "parado",
  "descomissionado",
] as const;
export type EquipamentoStatus = (typeof EQUIPAMENTO_STATUS)[number];

export const EQUIPAMENTO_STATUS_LABEL: Record<EquipamentoStatus, string> = {
  planejamento: "Planejamento",
  em_fabricacao: "Em fabricação",
  em_qualidade: "Em qualidade",
  pronto_entrega: "Pronto p/ entrega",
  em_transporte: "Em transporte",
  em_instalacao: "Em instalação",
  operacional: "Operacional",
  manutencao: "Em manutenção",
  parado: "Parado",
  descomissionado: "Descomissionado",
};

export const EQUIPAMENTO_STATUS_COLOR: Record<EquipamentoStatus, string> = {
  planejamento: "border-sky-200 bg-sky-50 text-sky-700",
  em_fabricacao: "border-blue-200 bg-blue-50 text-blue-700",
  em_qualidade: "border-violet-200 bg-violet-50 text-violet-700",
  pronto_entrega: "border-indigo-200 bg-indigo-50 text-indigo-700",
  em_transporte: "border-cyan-200 bg-cyan-50 text-cyan-700",
  em_instalacao: "border-teal-200 bg-teal-50 text-teal-700",
  operacional: "border-emerald-200 bg-emerald-50 text-emerald-700",
  manutencao: "border-amber-200 bg-amber-50 text-amber-700",
  parado: "border-rose-200 bg-rose-50 text-rose-700",
  descomissionado: "border-zinc-200 bg-zinc-50 text-zinc-600",
};

/**
 * Fase agrupa status por área funcional (Engenharia → Pós-venda).
 * Usada para filtros e badges agregadas na lista de equipamentos.
 */
export const EQUIPAMENTO_FASES = [
  "engenharia",
  "producao",
  "qualidade",
  "logistica",
  "operacao",
  "fim_vida",
] as const;
export type EquipamentoFase = (typeof EQUIPAMENTO_FASES)[number];

export const EQUIPAMENTO_FASE_LABEL: Record<EquipamentoFase, string> = {
  engenharia: "Engenharia",
  producao: "Automação",
  qualidade: "Qualidade",
  logistica: "Logística",
  operacao: "Operação",
  fim_vida: "Fim de vida",
};

export const EQUIPAMENTO_STATUS_FASE: Record<EquipamentoStatus, EquipamentoFase> = {
  planejamento: "engenharia",
  em_fabricacao: "producao",
  em_qualidade: "qualidade",
  pronto_entrega: "logistica",
  em_transporte: "logistica",
  em_instalacao: "logistica",
  operacional: "operacao",
  manutencao: "operacao",
  parado: "operacao",
  descomissionado: "fim_vida",
};

/* ============= Documentos do equipamento ============= */

export const EQUIPAMENTO_DOC_CATEGORIAS = [
  "etp",
  "manual_mecanico",
  "manual_eletrico",
  "ficha_tecnica",
  "fat",
  "montagem",
  "desenho",
  "lista_pecas",
  "certificado",
  "esquema_eletrico",
  "outro",
] as const;
export type EquipamentoDocCategoria = (typeof EQUIPAMENTO_DOC_CATEGORIAS)[number];

export const EQUIPAMENTO_DOC_CATEGORIA_LABEL: Record<EquipamentoDocCategoria, string> = {
  etp: "ETP",
  manual_mecanico: "Manual mecânico",
  manual_eletrico: "Manual elétrico",
  ficha_tecnica: "Ficha técnica",
  fat: "FAT",
  montagem: "Montagem",
  desenho: "Desenho",
  lista_pecas: "Lista de peças",
  certificado: "Certificado",
  esquema_eletrico: "Esquema elétrico",
  outro: "Outro",
};

/** Área funcional que consome o documento (drives a aba do drawer). */
export const EQUIPAMENTO_DOC_AREA: Record<
  EquipamentoDocCategoria,
  "engenharia" | "producao" | "qualidade" | "pos_venda"
> = {
  etp: "engenharia",
  desenho: "engenharia",
  lista_pecas: "engenharia",
  esquema_eletrico: "engenharia",
  manual_mecanico: "producao",
  manual_eletrico: "producao",
  montagem: "producao",
  fat: "qualidade",
  certificado: "qualidade",
  ficha_tecnica: "qualidade",
  outro: "pos_venda",
};

export function garantiaStatus(dataFim: string | null | undefined): "ativa" | "expirando" | "expirada" | "sem" {
  if (!dataFim) return "sem";
  const fim = new Date(dataFim).getTime();
  const hoje = Date.now();
  const diasRestantes = Math.floor((fim - hoje) / (1000 * 60 * 60 * 24));
  if (diasRestantes < 0) return "expirada";
  if (diasRestantes <= 60) return "expirando";
  return "ativa";
}