import type { EnrichedCliente } from "./types";
import { onlyDigits } from "./types";

function toIsoDate(br: string): string | undefined {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(br);
  if (!m) return undefined;
  return `${m[3]}-${m[2]}-${m[1]}`;
}

export async function enrichBrasilApi(cnpj: string): Promise<EnrichedCliente | null> {
  const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`, {
    headers: { accept: "application/json" },
  });
  if (!res.ok) return null;
  const j: any = await res.json();
  if (!j?.cnpj) return null;
  return {
    razao_social: j.razao_social ?? undefined,
    nome_fantasia: j.nome_fantasia || undefined,
    email_corporativo: j.email || undefined,
    telefone_corporativo_ddi: j.ddd_telefone_1 ? "+55" : undefined,
    telefone_corporativo_numero: j.ddd_telefone_1 || undefined,
    data_abertura: j.data_inicio_atividade || undefined,
    situacao_cadastral: j.descricao_situacao_cadastral || undefined,
    data_situacao: j.data_situacao_cadastral || undefined,
    motivo_situacao: j.descricao_motivo_situacao_cadastral || undefined,
    capital_social:
      typeof j.capital_social === "number"
        ? j.capital_social
        : j.capital_social
        ? Number(j.capital_social)
        : undefined,
    porte: j.porte || undefined,
    cnae_principal: j.cnae_fiscal
      ? `${j.cnae_fiscal} — ${j.cnae_fiscal_descricao ?? ""}`.trim()
      : undefined,
    cnaes_secundarios: Array.isArray(j.cnaes_secundarios)
      ? j.cnaes_secundarios
          .map((c: any) => (c?.codigo ? `${c.codigo} — ${c.descricao ?? ""}`.trim() : null))
          .filter(Boolean)
      : undefined,
    natureza_juridica_codigo: j.codigo_natureza_juridica?.toString() || undefined,
    natureza_juridica_descricao: j.natureza_juridica || undefined,
    endereco_logradouro: j.logradouro || undefined,
    endereco_numero: j.numero || undefined,
    endereco_complemento: j.complemento || undefined,
    endereco_bairro: j.bairro || undefined,
    endereco_cidade: j.municipio || undefined,
    endereco_estado: j.uf || undefined,
    endereco_codigo_postal: j.cep ? onlyDigits(j.cep) : undefined,
    socios: Array.isArray(j.qsa)
      ? j.qsa.map((s: any) => ({
          nome: s.nome_socio ?? "",
          qualificacao: s.qualificacao_socio || undefined,
          desde: s.data_entrada_sociedade || undefined,
        }))
      : undefined,
    _source: "brasilapi",
  };
}

export async function enrichReceitaWs(cnpj: string): Promise<EnrichedCliente | null> {
  const res = await fetch(`https://receitaws.com.br/v1/cnpj/${cnpj}`, {
    headers: { accept: "application/json" },
  });
  if (!res.ok) return null;
  const j: any = await res.json();
  if (j?.status === "ERROR" || !j?.cnpj) return null;
  return {
    razao_social: j.nome || undefined,
    nome_fantasia: j.fantasia || undefined,
    email_corporativo: j.email || undefined,
    telefone_corporativo_numero: j.telefone || undefined,
    telefone_corporativo_ddi: j.telefone ? "+55" : undefined,
    data_abertura: j.abertura ? toIsoDate(j.abertura) : undefined,
    situacao_cadastral: j.situacao || undefined,
    porte: j.porte || undefined,
    cnae_principal: j.atividade_principal?.[0]?.text || undefined,
    cnaes_secundarios: Array.isArray(j.atividades_secundarias)
      ? j.atividades_secundarias.map((a: any) => a.text).filter(Boolean)
      : undefined,
    natureza_juridica_descricao: j.natureza_juridica || undefined,
    capital_social: j.capital_social
      ? Number(String(j.capital_social).replace(/[^0-9.,-]/g, "").replace(",", "."))
      : undefined,
    endereco_logradouro: j.logradouro || undefined,
    endereco_numero: j.numero || undefined,
    endereco_complemento: j.complemento || undefined,
    endereco_bairro: j.bairro || undefined,
    endereco_cidade: j.municipio || undefined,
    endereco_estado: j.uf || undefined,
    endereco_codigo_postal: j.cep ? onlyDigits(j.cep) : undefined,
    socios: Array.isArray(j.qsa)
      ? j.qsa.map((s: any) => ({ nome: s.nome ?? "", qualificacao: s.qual || undefined }))
      : undefined,
    _source: "receitaws",
  };
}