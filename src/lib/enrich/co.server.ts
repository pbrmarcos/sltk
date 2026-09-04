import type { EnrichedCliente } from "./types";
import { firecrawlSearchEnrich } from "./firecrawl.server";

/**
 * Colômbia — o portal RUES é uma SPA que não busca via query string (scrape
 * direto retorna vazio). Usamos busca web (Firecrawl Search) com validação
 * do NIT no conteúdo da página.
 */
export async function enrichRuesCo(nit: string): Promise<EnrichedCliente | null> {
  const r = await firecrawlSearchEnrich<{
    razao_social?: string;
    nome_fantasia?: string;
    situacao?: string;
    endereco?: string;
    cidade?: string;
    departamento?: string;
    atividade?: string;
  }>({
    query: `"${nit}" NIT Colombia razón social empresa`,
    doc: nit,
    prompt:
      `Esta página pode conter dados da empresa colombiana com NIT ${nit}. ` +
      "Extrair SOMENTE se o NIT corresponder exatamente: razao_social (Razón Social), " +
      "nome_fantasia (Nombre Comercial), situacao (estado), endereco (dirección), " +
      "cidade (Municipio), departamento, atividade (actividad económica). " +
      "Usar null quando não encontrado. Não inventar dados.",
  });
  if (!r.ok) throw new Error(`RUES CO: ${r.error}`);
  const d = r.data;
  if (!d?.razao_social) return null;
  return {
    razao_social: d.razao_social,
    nome_fantasia: d.nome_fantasia,
    situacao_cadastral: d.situacao,
    cnae_principal: d.atividade,
    endereco_logradouro: d.endereco,
    endereco_cidade: d.cidade,
    endereco_estado: d.departamento,
    _source: "busca_web_co",
  };
}