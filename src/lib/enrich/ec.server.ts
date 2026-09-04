import type { EnrichedCliente } from "./types";

/**
 * Equador — Servicio de Rentas Internas (SRI).
 * API pública sem chave.
 */
export async function enrichSriEc(ruc: string): Promise<EnrichedCliente | null> {
  const url =
    `https://srienlinea.sri.gob.ec/sri-catastro-sujeto-servicio/rest/ConsolidadoContribuyente/obtenerPorNumerosRuc?&ruc=${encodeURIComponent(ruc)}`;
  const res = await fetch(url, { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`SRI EC HTTP ${res.status}`);
  const arr = (await res.json()) as Array<{
    numeroRuc?: string;
    razonSocial?: string;
    nombreComercial?: string;
    estadoContribuyenteRuc?: string;
    actividadEconomicaPrincipal?: string;
    tipoContribuyente?: string;
    regimen?: string;
    categoria?: string;
    obligadoLlevarContabilidad?: string;
    informacionFechasContribuyente?: {
      fechaInicioActividades?: string;
      fechaActualizacion?: string;
      fechaCese?: string;
    };
    contribuyenteFantasma?: string;
    informacionDomicilioFiscal?: {
      provincia?: string;
      canton?: string;
      parroquia?: string;
      direccionCompleta?: string;
    };
  }>;
  const c = Array.isArray(arr) ? arr[0] : null;
  if (!c?.razonSocial) return null;

  return {
    razao_social: c.razonSocial,
    nome_fantasia: c.nombreComercial,
    situacao_cadastral: c.estadoContribuyenteRuc,
    data_abertura: c.informacionFechasContribuyente?.fechaInicioActividades?.slice(0, 10),
    data_situacao: c.informacionFechasContribuyente?.fechaActualizacion?.slice(0, 10),
    cnae_principal: c.actividadEconomicaPrincipal,
    natureza_juridica_descricao: c.tipoContribuyente,
    porte: c.regimen,
    endereco_logradouro: c.informacionDomicilioFiscal?.direccionCompleta,
    endereco_cidade: c.informacionDomicilioFiscal?.canton,
    endereco_estado: c.informacionDomicilioFiscal?.provincia,
    _source: "sri_ec",
  };
}