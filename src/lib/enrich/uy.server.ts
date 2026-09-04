import type { EnrichedCliente } from "./types";
import { firecrawlSearchEnrich } from "./firecrawl.server";

/**
 * Uruguai — a consulta pública de RUT da DGI é uma SPA com formulário que o
 * scraper não consegue submeter. Caímos em busca web validada pelo RUT.
 */
export async function enrichDgiUy(rut: string): Promise<EnrichedCliente | null> {
  type UyData = {
    razao_social?: string;
    nome_fantasia?: string;
    situacao?: string;
    endereco?: string;
    cidade?: string;
    departamento?: string;
    data_inscricao?: string;
  };
  const prompt =
    `Esta página pode conter dados do contribuinte uruguaio com RUT ${rut}. ` +
    "Extrair SOMENTE se o RUT corresponder exatamente: razao_social (Denominación / Razón Social), " +
    "nome_fantasia (Nombre de Fantasía), situacao (Estado / Situación), endereco (Domicilio Fiscal), " +
    "cidade (Localidad), departamento (Departamento), data_inscricao (Fecha de Inicio de Actividades). " +
    "Usar null quando não encontrado. Não inventar dados.";
  const queries = [
    `"${rut}" RUT Uruguay razón social denominación contribuyente`,
    `"${rut}" Uruguay empresa`,
    `${rut} site:opencorporates.com OR site:guiauruguay.com.uy OR site:dgi.gub.uy`,
  ];
  let r: Awaited<ReturnType<typeof firecrawlSearchEnrich<UyData>>> | null = null;
  for (const q of queries) {
    r = await firecrawlSearchEnrich<UyData>({ query: q, doc: rut, logLabel: "uy", prompt });
    if (r.ok) break;
    console.log(`[enrich:uy] fallback query miss: ${q}`);
  }
  if (!r || !r.ok) throw new Error(`DGI UY: ${r?.ok === false ? r.error : "sem resposta"}`);
  const d = r.data;
  if (!d || (!d.razao_social && !d.nome_fantasia)) return null;

  return {
    razao_social: d.razao_social || undefined,
    nome_fantasia: d.nome_fantasia || undefined,
    situacao_cadastral: d.situacao || undefined,
    endereco_logradouro: d.endereco || undefined,
    endereco_cidade: d.cidade || undefined,
    endereco_estado: d.departamento || undefined,
    data_abertura: d.data_inscricao || undefined,
    _source: "busca_web_uy",
  };
}