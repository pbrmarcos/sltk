// Tipos compartilhados de formulário RFQ.
export type Idioma = "pt" | "es" | "en";

export type CampoTipo =
  | "text"
  | "long_text"
  | "numero"
  | "boolean"
  | "select"
  | "multi_select"
  | "anexo_multiplo";

export type Rotulo = { pt: string; es?: string; en?: string };

export type CampoSchema = {
  id: string;
  tipo: CampoTipo;
  label: Rotulo;
  opcoes?: string[];
  obrigatorio?: boolean;
  ajuda?: Rotulo;
};

export type SecaoSchema = {
  id: string;
  titulo: Rotulo;
  campos: CampoSchema[];
};

export type FormularioSchema = {
  secoes: SecaoSchema[];
};

export function pickLabel(r: Rotulo | undefined, idioma: Idioma): string {
  if (!r) return "";
  return (r[idioma] || r.pt || "").toString();
}

export type RfqTipo = {
  id: string;
  codigo: string;
  nome_pt: string;
  nome_es: string | null;
  nome_en: string | null;
  familia: string | null;
  descricao: string | null;
  campos_schema: FormularioSchema;
};

export type RfqLink = {
  id: string;
  tipo_id: string;
  cliente_id: string;
  sales_id: string;
  idioma: Idioma;
  slug: string;
  status: "aberto" | "preenchido" | "expirado" | "arquivado";
  titulo: string | null;
  expira_em: string | null;
  criado_em: string;
  preenchido_em: string | null;
  submissao_id: string | null;
};

export type RfqSubmissao = {
  id: string;
  link_id: string;
  cliente_id: string;
  tipo_id: string;
  idioma: Idioma;
  respostas: Record<string, unknown>;
  preenchido_por_nome: string | null;
  preenchido_por_email: string | null;
  preenchido_por_telefone: string | null;
  criado_em: string;
  lida_em: string | null;
};

export const IDIOMA_LABEL: Record<Idioma, string> = {
  pt: "Português",
  es: "Español",
  en: "English",
};
