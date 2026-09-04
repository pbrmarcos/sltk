import type { EnrichedCliente } from "./types";

/**
 * Costa Rica — Ministerio de Hacienda.
 * API REST pública e gratuita, sem chave.
 * Doc: https://api.hacienda.go.cr/fe/ae?identificacion=XXXXXXXXXX
 */
export async function enrichHaciendaCr(cedula: string): Promise<EnrichedCliente | null> {
  const url = `https://api.hacienda.go.cr/fe/ae?identificacion=${encodeURIComponent(cedula)}`;
  const res = await fetch(url, {
    headers: { accept: "application/json", "user-agent": "curl/8.5.0" },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Hacienda CR HTTP ${res.status}`);
  const j = (await res.json()) as {
    nombre?: string;
    tipoIdentificacion?: string;
    regimen?: { codigo?: number; descripcion?: string };
    situacion?: {
      estado?: string;
      moroso?: string;
      omiso?: string;
      administracionTributaria?: string;
    };
    actividades?: Array<{ codigo?: string; estado?: string; descripcion?: string }>;
  };
  if (!j?.nombre) return null;

  const principal = (j.actividades ?? []).find((a) => a.estado === "A") ?? j.actividades?.[0];
  const secundarios = (j.actividades ?? [])
    .filter((a) => a !== principal && a.codigo)
    .map((a) => `${a.codigo} — ${a.descripcion ?? ""}`.trim());

  return {
    razao_social: j.nombre,
    situacao_cadastral: j.situacion?.estado,
    cnae_principal: principal?.codigo
      ? `${principal.codigo} — ${principal.descripcion ?? ""}`.trim()
      : undefined,
    cnaes_secundarios: secundarios.length ? secundarios : undefined,
    natureza_juridica_descricao: j.regimen?.descripcion,
    natureza_juridica_codigo: j.regimen?.codigo ? String(j.regimen.codigo) : undefined,
    endereco_estado: j.situacion?.administracionTributaria,
    _source: "hacienda_cr",
  };
}