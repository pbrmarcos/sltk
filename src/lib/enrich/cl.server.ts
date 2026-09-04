import type { EnrichedCliente } from "./types";
import { firecrawlSearchEnrich } from "./firecrawl.server";

/**
 * Chile — o portal do SII exige captcha; usamos busca web (Firecrawl Search)
 * com validação do RUT no conteúdo para evitar dados de outra empresa.
 */
export async function enrichSiiCl(rut: string): Promise<EnrichedCliente | null> {
  const digits = rut.replace(/[^0-9Kk]/g, "").toUpperCase();
  const body = digits.slice(0, -1);
  const dv = digits.slice(-1);
  const r = await firecrawlSearchEnrich<{
    razao_social?: string;
    atividade?: string;
    situacao?: string;
    endereco?: string;
    cidade?: string;
  }>({
    query: `"${body}-${dv}" OR "${body}" RUT Chile razón social empresa`,
    doc: body,
    prompt:
      `Esta página pode conter dados da empresa chilena com RUT ${body}-${dv}. ` +
      "Extrair SOMENTE se o RUT corresponder: razao_social (Razón Social), " +
      "atividade (giro/actividad económica), situacao (estado), endereco (dirección), cidade. " +
      "Usar null quando não encontrado. Não inventar.",
  });
  if (!r.ok) throw new Error(`SII CL: ${r.error}`);
  const d = r.data;
  if (!d?.razao_social) return null;
  return {
    razao_social: d.razao_social,
    cnae_principal: d.atividade,
    situacao_cadastral: d.situacao,
    endereco_logradouro: d.endereco,
    endereco_cidade: d.cidade,
    _source: "busca_web_cl",
  };
}