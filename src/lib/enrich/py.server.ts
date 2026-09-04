import type { EnrichedCliente } from "./types";
import { firecrawlSearchEnrich } from "./firecrawl.server";

/**
 * Paraguai — o servlet antigo da SET foi desativado (404). Usamos busca web
 * (Firecrawl Search) com validação do RUC no conteúdo da página.
 */
export async function enrichSetPy(ruc: string): Promise<EnrichedCliente | null> {
  const r = await firecrawlSearchEnrich<{
    razao_social?: string;
    nome_fantasia?: string;
    situacao?: string;
    endereco?: string;
    cidade?: string;
    departamento?: string;
  }>({
    query: `"${ruc}" RUC Paraguay razón social contribuyente`,
    doc: ruc,
    logLabel: "py",
    prompt:
      `Esta página pode conter dados do contribuinte paraguaio com RUC ${ruc}. ` +
      "Extrair SOMENTE se o RUC corresponder exatamente: razao_social (Razón Social), " +
      "nome_fantasia, situacao (Estado), endereco (dirección), cidade, departamento. " +
      "Usar null quando não encontrado. Não inventar dados.",
  });

  if (!r.ok) throw new Error(`SET PY: ${r.error}`);
  const d = r.data;
  if (!d || (!d.razao_social && !d.nome_fantasia)) return null;

  return {
    razao_social: d.razao_social || undefined,
    nome_fantasia: d.nome_fantasia || undefined,
    situacao_cadastral: d.situacao || undefined,
    endereco_logradouro: d.endereco || undefined,
    endereco_cidade: d.cidade || undefined,
    endereco_estado: d.departamento || undefined,
    _source: "busca_web_py",
  };
}