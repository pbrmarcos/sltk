/* eslint-disable @typescript-eslint/no-explicit-any */
// Tipos compartilhados do módulo de Documentos
export type Idioma = "pt" | "es" | "en";
import type { MoedaISO } from "@/lib/moedas";
export type Moeda = MoedaISO;

export type DocumentoTipoCodigo = "orcamento" | "fat_report" | "sat_report" | "etp_doc";

export type Bloco = {
  id: string;
  tipo_codigo: string;
  codigo: string;
  nome: string;
  descricao: string | null;
  obrigatorio: boolean;
  ordem_padrao: number;
  variaveis_obrigatorias: string[];
  conteudo_pt: Record<string, any>;
  conteudo_es: Record<string, any>;
  conteudo_en: Record<string, any>;
  ativo: boolean;
  largura?: 50 | 100;
};

export type EquipamentoOrcamento = {
  id?: string; // referência opcional a cliente_equipamentos
  nome_pt: string;
  nome_es: string;
  nome_en: string;
  descricao_pt: string;
  descricao_es: string;
  descricao_en: string;
  quantidade: number;
  valor_unitario: number;
  imagem_url?: string | null;
  imagem_legenda?: string | null;
  opcional: boolean;
};

export type Parcela = {
  numero: number;
  percentual: number;
  descricao_pt: string;
  descricao_es: string;
  descricao_en: string;
};

export type OrcamentoPayload = {
  cliente: {
    id: string;
    codigo: string;
    razao_social: string;
    nome_fantasia: string | null;
    documento_fiscal_numero: string | null;
    endereco_logradouro: string | null;
    endereco_numero: string | null;
    endereco_bairro: string | null;
    endereco_cidade: string | null;
    endereco_estado: string | null;
    pais: string | null;
    email_corporativo: string | null;
    telefone_corporativo_ddi: string | null;
    telefone_corporativo_numero: string | null;
  };
  responsavel: {
    id: string;
    nome: string;
    email: string | null;
    telefone: string | null;
    cargo: string | null;
  };
  equipamentos: EquipamentoOrcamento[];
  moeda: Moeda;
  pagamento: {
    forma: string;
    parcelas: Parcela[];
  };
  prazo: {
    dias: number;
    texto_extra?: string;
  };
  frete: {
    incoterm: string;
    descricao?: string;
  };
  validade: {
    dias: number;
  };
  // overrides de blocos (texto livre por idioma)
  blocos_overrides: Record<string, { pt?: string; es?: string; en?: string }>;
  blocos_selecionados: string[]; // códigos na ordem desejada
  oportunidade_id?: string | null;
  oportunidade_codigo?: string | null;
};

export type DocumentoLayoutConfig = {
  tipo_codigo: string;
  accent_color: string;
  logo_url: string | null;
  empresa_nome: string;
  empresa_endereco: string | null;
  empresa_contato: string | null;
  rodape_extra: string | null;
};
