import type { EnrichedCliente } from "./types";
import { firecrawlSearchEnrich } from "./firecrawl.server";

/**
 * Panamá — a consulta pública da DGI/MEF é uma SPA que o scraper não consegue
 * extrair diretamente. Caímos em busca web validada pelo RUC (igual PY).
 */
export async function enrichDgiPa(ruc: string): Promise<EnrichedCliente | null> {
  type PaData = {
    razao_social?: string;
    nome_fantasia?: string;
    situacao?: string;
    endereco?: string;
    provincia?: string;
    distrito?: string;
    atividade?: string;
  };
  const prompt =
    `Esta página pode conter dados do contribuinte panamenho com RUC ${ruc}. ` +
    "Extrair SOMENTE se o RUC corresponder exatamente: razao_social (Razón Social/Nombre), " +
    "nome_fantasia (Nombre Comercial), situacao (Estado/Situación), endereco (dirección), " +
    "provincia, distrito, atividade (Actividad Económica). Usar null quando não encontrado. " +
    "Não inventar dados.";
  const queries = [
    `"${ruc}" RUC Panamá razón social contribuyente DGI`,
    `"${ruc}" Panamá empresa contribuyente`,
    `${ruc} site:panamaemprende.gob.pa OR site:dgi.mef.gob.pa OR site:opencorporates.com`,
  ];
  let r: Awaited<ReturnType<typeof firecrawlSearchEnrich<PaData>>> | null = null;
  for (const q of queries) {
    r = await firecrawlSearchEnrich<PaData>({ query: q, doc: ruc, logLabel: "pa", prompt });
    if (r.ok) break;
    console.log(`[enrich:pa] fallback query miss: ${q}`);
  }
  if (!r || !r.ok) throw new Error(`DGI PA: ${r?.ok === false ? r.error : "sem resposta"}`);
  const d = r.data;
  if (!d || (!d.razao_social && !d.nome_fantasia)) return null;
  return {
    razao_social: d.razao_social || undefined,
    nome_fantasia: d.nome_fantasia || undefined,
    situacao_cadastral: d.situacao || undefined,
    cnae_principal: d.atividade || undefined,
    endereco_logradouro: d.endereco || undefined,
    endereco_cidade: d.distrito || undefined,
    endereco_estado: d.provincia || undefined,
    _source: "busca_web_pa",
  };
}
