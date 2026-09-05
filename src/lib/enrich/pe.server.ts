import type { EnrichedCliente } from "./types";

/**
 * apis.net.pe — gateway gratuito para consultas de RUC (SUNAT).
 * Requer token (gratuito após registro). Retorna razão social, endereço,
 * estado/condição e atividade econômica.
 */
export async function enrichApisNetPe(ruc: string): Promise<EnrichedCliente | null> {
  const token = process.env.APIS_NET_PE_TOKEN;
  if (!token)
    throw new Error("Consulta de RUC do Peru indisponível — a integração não está configurada.");

  const res = await fetch(`https://api.apis.net.pe/v2/sunat/ruc?numero=${ruc}`, {
    headers: { accept: "application/json", authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    if (res.status === 404) return null;
    throw new Error(`apis.net.pe ${res.status}`);
  }
  const j: any = await res.json();
  if (!j || !(j.numeroDocumento || j.ruc)) return null;

  const direccion: string | undefined = j.direccion || j.domicilioFiscal;
  return {
    razao_social: j.razonSocial || j.nombre || undefined,
    nome_fantasia: j.nombreComercial || undefined,
    situacao_cadastral: j.estado || undefined,
    motivo_situacao: j.condicion || undefined,
    data_abertura: j.fechaInscripcion || undefined,
    cnae_principal: j.actividadEconomica || j.ciiu || undefined,
    endereco_logradouro: direccion || undefined,
    endereco_cidade: j.distrito || j.provincia || undefined,
    endereco_estado: j.departamento || undefined,
    endereco_codigo_postal: j.ubigeo || undefined,
    _source: "apis.net.pe",
  };
}
