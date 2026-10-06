/**
 * "Cadastro N% completo" do fornecedor: o que faz diferença para cotar e
 * comprar. O cadastro rápido (ou o scan por IA) cobre parte; o resto se
 * completa no "Editar" da ficha.
 */
type FornecedorCompletudeInput = {
  nome?: string | null;
  tax_id?: string | null;
  pais?: string | null;
  email_corporativo?: string | null;
  telefone_numero?: string | null;
  site?: string | null;
  cidade?: string | null;
  endereco?: string | null;
  moeda_padrao?: string | null;
  payment_terms?: string | null;
};

const vazio = (v: string | null | undefined) => !v || !String(v).trim();

export function completudeFornecedor(
  f: FornecedorCompletudeInput,
  extras: { categorias: number; contatos: number },
) {
  const itens = [
    { label: "Nome", ok: !vazio(f.nome) },
    { label: "Documento fiscal", ok: !vazio(f.tax_id) },
    { label: "País", ok: !vazio(f.pais) },
    { label: "E-mail ou telefone", ok: !vazio(f.email_corporativo) || !vazio(f.telefone_numero) },
    { label: "Site", ok: !vazio(f.site) },
    { label: "Cidade e endereço", ok: !vazio(f.cidade) && !vazio(f.endereco) },
    { label: "Categoria", ok: extras.categorias > 0 },
    { label: "Contato", ok: extras.contatos > 0 },
    { label: "Moeda padrão", ok: !vazio(f.moeda_padrao) },
    { label: "Condição de pagamento", ok: !vazio(f.payment_terms) },
  ];
  const ok = itens.filter((i) => i.ok).length;
  return {
    pct: Math.round((ok / itens.length) * 100),
    faltantes: itens.filter((i) => !i.ok).map((i) => i.label),
  };
}
