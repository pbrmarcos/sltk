/**
 * Resultado normalizado retornado por qualquer provider de enrichment.
 * Campos vazios significam que a fonte não retornou o dado.
 */
export type EnrichedCliente = {
  razao_social?: string;
  nome_fantasia?: string;
  email_corporativo?: string;
  telefone_corporativo_ddi?: string;
  telefone_corporativo_numero?: string;
  data_abertura?: string;
  situacao_cadastral?: string;
  data_situacao?: string;
  motivo_situacao?: string;
  capital_social?: number;
  porte?: string;
  cnae_principal?: string;
  cnaes_secundarios?: string[];
  natureza_juridica_codigo?: string;
  natureza_juridica_descricao?: string;
  endereco_logradouro?: string;
  endereco_numero?: string;
  endereco_complemento?: string;
  endereco_bairro?: string;
  endereco_cidade?: string;
  endereco_estado?: string;
  endereco_codigo_postal?: string;
  socios?: Array<{ nome: string; qualificacao?: string; desde?: string }>;
  _source: string;
};

export function onlyDigits(s: string): string {
  return (s ?? "").replace(/\D/g, "");
}