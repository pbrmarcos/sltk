import type { EnrichedCliente } from "./types";
import { firecrawlScrapeJson } from "./firecrawl.server";

/**
 * Argentina — consulta pública de CUIT no CUIT Online via Firecrawl.
 */
export async function enrichCuitOnlineAr(cuit: string): Promise<EnrichedCliente | null> {
  // A página /detalle/<cuit> retorna 404; a busca exibe os dados inline.
  const url = `https://www.cuitonline.com/search.php?q=${encodeURIComponent(cuit)}`;

  const r = await firecrawlScrapeJson<{
    razao_social?: string;
    tipo_persona?: string;
    situacao?: string;
    actividad?: string;
    endereco?: string;
    provincia?: string;
  }>({
    url,
    country: "AR",
    languages: ["es"],
    waitFor: 1500,
    prompt:
      "Extrair os dados do contribuinte de CUIT do CUIT Online: " +
      "razao_social (Nombre/Razón Social), tipo_persona (Persona Física / Jurídica), " +
      "situacao (Estado AFIP — Activo, Inactivo, etc.), actividad (descrição da atividade econômica primária), " +
      "endereco (Domicilio Fiscal), provincia (Provincia). " +
      "Retornar null nos campos não encontrados.",
  });

  if (!r.ok) throw new Error(`CUIT Online: ${r.error}`);
  const d = r.data;
  if (!d || !d.razao_social) return null;

  return {
    razao_social: d.razao_social || undefined,
    situacao_cadastral: d.situacao || undefined,
    natureza_juridica_descricao: d.tipo_persona || undefined,
    cnae_principal: d.actividad || undefined,
    endereco_logradouro: d.endereco || undefined,
    endereco_estado: d.provincia || undefined,
    _source: "cuitonline_ar",
  };
}