/**
 * "Cadastro N% completo": 12 itens que fazem diferença para vender e faturar.
 * O cadastro rápido cria o cliente com 3–4 deles; o resto se completa na ficha
 * (seções recolhidas) ou pelo "Minerar dados".
 */

export type ClienteCompletudeInput = {
  razao_social?: string | null;
  documento_fiscal_numero?: string | null;
  pais?: string | null;
  moeda?: string | null;
  idioma?: string | null;
  segmento_id?: string | null;
  lead_origem_id?: string | null;
  email_corporativo?: string | null;
  telefone_corporativo_numero?: string | null;
  endereco_logradouro?: string | null;
  endereco_cidade?: string | null;
  site?: string | null;
  matriz_filial?: string | null;
};

export type CompletudeSecao = "comercial" | "contato" | "endereco" | "fiscal" | "redes" | "pessoas";

export type CompletudeItem = {
  key: string;
  label: string;
  secao: CompletudeSecao;
  ok: boolean;
};

/** Documento gerado pelo cadastro rápido/suspect por foto — não conta como preenchido. */
export function documentoEhPlaceholder(doc: string | null | undefined) {
  return !doc || doc.startsWith("SUSPECT-");
}

const vazio = (v: string | null | undefined) => !v || !String(v).trim();

export function completudeCliente(
  c: ClienteCompletudeInput,
  extras: { contatosComEmail: number; socios: number },
): { pct: number; itens: CompletudeItem[]; faltantes: CompletudeItem[] } {
  const itens: CompletudeItem[] = [
    { key: "razao_social", label: "Razão social", secao: "comercial", ok: !vazio(c.razao_social) },
    {
      key: "documento_fiscal_numero",
      label: "Documento fiscal",
      secao: "fiscal",
      ok: !documentoEhPlaceholder(c.documento_fiscal_numero),
    },
    { key: "pais", label: "País", secao: "comercial", ok: !vazio(c.pais) },
    { key: "moeda", label: "Moeda", secao: "comercial", ok: !vazio(c.moeda) },
    { key: "idioma", label: "Idioma", secao: "comercial", ok: !vazio(c.idioma) },
    { key: "segmento_id", label: "Ramo", secao: "comercial", ok: !vazio(c.segmento_id) },
    {
      key: "lead_origem_id",
      label: "Origem do lead",
      secao: "comercial",
      ok: !vazio(c.lead_origem_id),
    },
    {
      key: "contato_corporativo",
      label: "E-mail ou telefone da empresa",
      secao: "contato",
      ok: !vazio(c.email_corporativo) || !vazio(c.telefone_corporativo_numero),
    },
    {
      key: "endereco",
      label: "Endereço (rua e cidade)",
      secao: "endereco",
      ok: !vazio(c.endereco_logradouro) && !vazio(c.endereco_cidade),
    },
    { key: "site", label: "Site", secao: "contato", ok: !vazio(c.site) },
    {
      key: "contato_email",
      label: "Contato com e-mail",
      secao: "pessoas",
      ok: extras.contatosComEmail > 0,
    },
    {
      key: "socios",
      label: "Sócios ou matriz/filial",
      secao: "pessoas",
      ok: extras.socios > 0 || !vazio(c.matriz_filial),
    },
  ];
  const ok = itens.filter((i) => i.ok).length;
  return {
    pct: Math.round((ok / itens.length) * 100),
    itens,
    faltantes: itens.filter((i) => !i.ok),
  };
}
