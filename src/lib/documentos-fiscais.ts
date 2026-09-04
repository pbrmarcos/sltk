/**
 * Camada única de validação de documentos fiscais (um validador por país).
 *
 * Princípios:
 * 1. Um único módulo, um validador por país, com suíte de testes própria
 *    (`src/lib/documentos-fiscais.test.ts`).
 * 2. A entrada é normalizada antes de validar (pontos, traços, barras,
 *    espaços e caracteres invisíveis são removidos).
 * 3. Nunca bloqueante: países sem algoritmo oficial implementado passam por
 *    validação apenas de formato/tamanho; o cadastro segue normalmente.
 * 4. Mensagens específicas: quantidade de dígitos, dígito verificador,
 *    código de província inexistente, prefixo de tipo inválido, etc.
 */

export type MotivoInvalido =
  | "vazio"
  | "tamanho"
  | "formato"
  | "digito_verificador"
  | "provincia"
  | "tipo"
  | "estabelecimento";

export type NivelValidacao = "checksum" | "formato" | "nenhum";

export type ResultadoDocumento = {
  ok: boolean;
  /** Documento normalizado (sem separadores, maiúsculas). */
  normalizado: string;
  /** Grau de verificação aplicado ao país. */
  nivel: NivelValidacao;
  motivo?: MotivoInvalido;
  /** Mensagem específica e acionável em português. */
  mensagem?: string;
};

/** Nome oficial do documento por país (fallback quando o banco não informa). */
export const DOCUMENTO_NOME: Record<string, string> = {
  AR: "CUIT",
  BO: "NIT",
  BR: "CNPJ",
  CL: "RUT",
  CN: "USCC",
  CO: "NIT",
  CR: "Cédula Jurídica",
  EC: "RUC",
  GT: "NIT",
  HN: "RTN",
  MX: "RFC",
  NI: "RUC",
  PA: "RUC",
  PE: "RUC",
  PY: "RUC",
  SV: "NIT",
  US: "EIN",
  UY: "RUT",
  VE: "RIF",
};

/**
 * Normaliza: maiúsculas, remove pontos, traços, barras, espaços e qualquer
 * caractere que não seja letra/dígito. Mantém Ñ e & (RFC mexicano).
 */
export function normalizarDocumento(raw: string): string {
  return (raw ?? "")
    .toUpperCase()
    .normalize("NFKC")
    .replace(/[^A-Z0-9Ñ&]/g, "");
}

const ok = (normalizado: string, nivel: NivelValidacao): ResultadoDocumento => ({
  ok: true,
  normalizado,
  nivel,
});

const erro = (
  normalizado: string,
  nivel: NivelValidacao,
  motivo: MotivoInvalido,
  mensagem: string,
): ResultadoDocumento => ({ ok: false, normalizado, nivel, motivo, mensagem });

const tamanhoMsg = (nome: string, esperado: string, atual: number) =>
  `${nome} deve ter ${esperado} — o valor informado tem ${atual}.`;

/* ==========================================================================
 * Brasil — CNPJ (numérico e alfanumérico, regra vigente desde julho/2026)
 * 12 caracteres alfanuméricos de base + 2 dígitos verificadores numéricos.
 * Peso de cada caractere = código ASCII − 48 (assim '0'=0 … 'A'=17).
 * ========================================================================== */
function validarBR(doc: string): ResultadoDocumento {
  if (doc.length !== 14) {
    return erro(doc, "checksum", "tamanho", tamanhoMsg("O CNPJ", "14 caracteres", doc.length));
  }
  if (!/^[A-Z0-9]{12}[0-9]{2}$/.test(doc)) {
    return erro(
      doc,
      "checksum",
      "formato",
      "CNPJ inválido: os 12 primeiros caracteres podem ser letras ou números e os 2 últimos (verificadores) precisam ser numéricos.",
    );
  }
  if (/^(\d)\1{13}$/.test(doc)) {
    return erro(doc, "checksum", "formato", "CNPJ inválido: sequência de dígitos repetidos.");
  }
  const vals = [...doc].map((c) => c.charCodeAt(0) - 48);
  const calc = (qtd: number) => {
    const pesos = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2].slice(-qtd);
    const soma = pesos.reduce((acc, p, i) => acc + p * vals[i]!, 0);
    const r = soma % 11;
    return r < 2 ? 0 : 11 - r;
  };
  if (calc(12) !== vals[12] || calc(13) !== vals[13]) {
    return erro(
      doc,
      "checksum",
      "digito_verificador",
      "CNPJ inválido: os dois dígitos verificadores não conferem com a base informada.",
    );
  }
  return ok(doc, "checksum");
}

/* ==========================================================================
 * Argentina — CUIT/CUIL: 11 dígitos, módulo 11 com pesos 5,4,3,2,7,6,5,4,3,2.
 * ========================================================================== */
const CUIT_PREFIXOS = new Set(["20", "23", "24", "25", "26", "27", "30", "33", "34"]);
function validarAR(doc: string): ResultadoDocumento {
  if (!/^\d+$/.test(doc)) {
    return erro(doc, "checksum", "formato", "CUIT inválido: use apenas dígitos.");
  }
  if (doc.length !== 11) {
    return erro(doc, "checksum", "tamanho", tamanhoMsg("O CUIT", "11 dígitos", doc.length));
  }
  if (!CUIT_PREFIXOS.has(doc.slice(0, 2))) {
    return erro(
      doc,
      "checksum",
      "tipo",
      `CUIT inválido: o prefixo "${doc.slice(0, 2)}" não é um tipo válido (20, 23, 24, 25, 26, 27, 30, 33 ou 34).`,
    );
  }
  const pesos = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  const soma = pesos.reduce((acc, p, i) => acc + p * Number(doc[i]), 0);
  const r = 11 - (soma % 11);
  const dv = r === 11 ? 0 : r === 10 ? 9 : r;
  if (dv !== Number(doc[10])) {
    return erro(
      doc,
      "checksum",
      "digito_verificador",
      `CUIT inválido: o dígito verificador deveria ser ${dv} e foi informado ${doc[10]}.`,
    );
  }
  return ok(doc, "checksum");
}

/* ==========================================================================
 * Chile — RUT: corpo de 7 a 8 dígitos + verificador (0-9 ou K), módulo 11
 * com série cíclica 2,3,4,5,6,7.
 * ========================================================================== */
function validarCL(doc: string): ResultadoDocumento {
  if (!/^[0-9]{7,8}[0-9K]$/.test(doc)) {
    return erro(
      doc,
      "checksum",
      doc.replace(/[^0-9K]/g, "").length === doc.length ? "tamanho" : "formato",
      `RUT inválido: são esperados 7 ou 8 dígitos seguidos do verificador (0-9 ou K) — o valor informado tem ${doc.length} caracteres.`,
    );
  }
  const corpo = doc.slice(0, -1);
  const dvInformado = doc.slice(-1);
  let soma = 0;
  let mult = 2;
  for (let i = corpo.length - 1; i >= 0; i--) {
    soma += Number(corpo[i]) * mult;
    mult = mult === 7 ? 2 : mult + 1;
  }
  const r = 11 - (soma % 11);
  const dv = r === 11 ? "0" : r === 10 ? "K" : String(r);
  if (dv !== dvInformado) {
    return erro(
      doc,
      "checksum",
      "digito_verificador",
      `RUT inválido: o dígito verificador deveria ser ${dv} e foi informado ${dvInformado}.`,
    );
  }
  return ok(doc, "checksum");
}

/* ==========================================================================
 * Colômbia — NIT: 9 dígitos de base + verificador, módulo 11 com pesos
 * 41,37,29,23,19,17,13,7,3.
 * ========================================================================== */
function validarCO(doc: string): ResultadoDocumento {
  if (!/^\d+$/.test(doc)) {
    return erro(doc, "checksum", "formato", "NIT inválido: use apenas dígitos.");
  }
  if (doc.length < 9 || doc.length > 10) {
    return erro(doc, "checksum", "tamanho", tamanhoMsg("O NIT", "9 ou 10 dígitos", doc.length));
  }
  // Com 9 dígitos não há verificador informado: valida apenas o formato.
  if (doc.length === 9) return ok(doc, "formato");
  const base = doc.slice(0, 9);
  const pesos = [41, 37, 29, 23, 19, 17, 13, 7, 3];
  const soma = pesos.reduce((acc, p, i) => acc + p * Number(base[i]), 0);
  const r = soma % 11;
  const dv = r < 2 ? r : 11 - r;
  if (dv !== Number(doc[9])) {
    return erro(
      doc,
      "checksum",
      "digito_verificador",
      `NIT inválido: o dígito verificador deveria ser ${dv} e foi informado ${doc[9]}.`,
    );
  }
  return ok(doc, "checksum");
}

/* ==========================================================================
 * Equador — RUC (SRI): 13 dígitos.
 * 1-2 província (01-24 ou 30 = exterior); 3º dígito define o tipo;
 * 11-13 estabelecimento.
 *  - pessoa natural (3º < 6): módulo 10, coef 2,1,2,1,2,1,2,1,2 nos 9
 *    primeiros dígitos, 10º é o verificador;
 *  - sociedade privada (3º = 9): módulo 11, coef 4,3,2,7,6,5,4,3,2 nos 9
 *    primeiros dígitos, 10º é o verificador;
 *  - setor público (3º = 6): módulo 11, coef 3,2,7,6,5,4,3,2 nos 8 primeiros
 *    dígitos, 9º é o verificador e o estabelecimento é "0001".
 * ========================================================================== */
function validarEC(doc: string): ResultadoDocumento {
  if (!/^\d+$/.test(doc)) {
    return erro(doc, "checksum", "formato", "RUC inválido: use apenas dígitos.");
  }
  if (doc.length !== 13) {
    return erro(doc, "checksum", "tamanho", tamanhoMsg("O RUC do Equador", "13 dígitos", doc.length));
  }
  const provincia = Number(doc.slice(0, 2));
  if (!((provincia >= 1 && provincia <= 24) || provincia === 30)) {
    return erro(
      doc,
      "checksum",
      "provincia",
      `RUC inválido: "${doc.slice(0, 2)}" não é um código de província do Equador (01 a 24, ou 30 para o exterior).`,
    );
  }
  const tipo = Number(doc[2]);
  const d = [...doc].map(Number);

  const mod11 = (coef: number[], qtd: number) => {
    const soma = coef.reduce((acc, c, i) => acc + c * d[i]!, 0);
    const r = soma % 11;
    const dv = r === 0 ? 0 : 11 - r;
    return { dv: dv === 11 ? 0 : dv, informado: d[qtd]! };
  };

  if (tipo >= 0 && tipo <= 5) {
    // Pessoa natural — módulo 10.
    const coef = [2, 1, 2, 1, 2, 1, 2, 1, 2];
    let soma = 0;
    for (let i = 0; i < 9; i++) {
      let p = d[i]! * coef[i]!;
      if (p > 9) p -= 9;
      soma += p;
    }
    const r = soma % 10;
    const dv = r === 0 ? 0 : 10 - r;
    if (dv !== d[9]) {
      return erro(
        doc,
        "checksum",
        "digito_verificador",
        `RUC de pessoa natural inválido: o 10º dígito (verificador) deveria ser ${dv} e foi informado ${d[9]}.`,
      );
    }
  } else if (tipo === 9) {
    // Sociedade privada — módulo 11.
    const { dv, informado } = mod11([4, 3, 2, 7, 6, 5, 4, 3, 2], 9);
    if (dv !== informado) {
      return erro(
        doc,
        "checksum",
        "digito_verificador",
        `RUC de sociedade privada inválido: o 10º dígito (verificador) deveria ser ${dv} e foi informado ${informado}.`,
      );
    }
  } else if (tipo === 6) {
    // Setor público — módulo 11 sobre 8 dígitos, verificador na 9ª posição.
    const { dv, informado } = mod11([3, 2, 7, 6, 5, 4, 3, 2], 8);
    if (dv !== informado) {
      return erro(
        doc,
        "checksum",
        "digito_verificador",
        `RUC do setor público inválido: o 9º dígito (verificador) deveria ser ${dv} e foi informado ${informado}.`,
      );
    }
    if (doc.slice(9) !== "0001") {
      return erro(
        doc,
        "checksum",
        "estabelecimento",
        `RUC do setor público inválido: o código de estabelecimento deve ser "0001" e foi informado "${doc.slice(9)}".`,
      );
    }
    return ok(doc, "checksum");
  } else {
    return erro(
      doc,
      "checksum",
      "tipo",
      `RUC inválido: o 3º dígito "${doc[2]}" não corresponde a um tipo de contribuinte (0-5 pessoa natural, 6 setor público, 9 sociedade privada).`,
    );
  }

  const estabelecimento = doc.slice(10);
  if (estabelecimento === "000") {
    return erro(
      doc,
      "checksum",
      "estabelecimento",
      'RUC inválido: o código de estabelecimento (3 últimos dígitos) não pode ser "000" — normalmente é "001".',
    );
  }
  return ok(doc, "checksum");
}

/* ==========================================================================
 * Peru — RUC: 11 dígitos, prefixo de tipo + módulo 11 (pesos 5,4,3,2,7,6,5,4,3,2).
 * ========================================================================== */
const RUC_PE_PREFIXOS = ["10", "15", "16", "17", "20"];
function validarPE(doc: string): ResultadoDocumento {
  if (!/^\d+$/.test(doc)) {
    return erro(doc, "checksum", "formato", "RUC inválido: use apenas dígitos.");
  }
  if (doc.length !== 11) {
    return erro(doc, "checksum", "tamanho", tamanhoMsg("O RUC do Peru", "11 dígitos", doc.length));
  }
  if (!RUC_PE_PREFIXOS.includes(doc.slice(0, 2))) {
    return erro(
      doc,
      "checksum",
      "tipo",
      `RUC inválido: o prefixo "${doc.slice(0, 2)}" não é um tipo de contribuinte da SUNAT (${RUC_PE_PREFIXOS.join(", ")}).`,
    );
  }
  const pesos = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  const soma = pesos.reduce((acc, p, i) => acc + p * Number(doc[i]), 0);
  const r = 11 - (soma % 11);
  const dv = r >= 10 ? r - 10 : r;
  if (dv !== Number(doc[10])) {
    return erro(
      doc,
      "checksum",
      "digito_verificador",
      `RUC inválido: o dígito verificador deveria ser ${dv} e foi informado ${doc[10]}.`,
    );
  }
  return ok(doc, "checksum");
}

/* ==========================================================================
 * Validadores de formato (países sem algoritmo público consolidado).
 * Nunca bloqueiam além do formato declarado.
 * ========================================================================== */
function apenasFormato(
  doc: string,
  nome: string,
  regex: RegExp,
  descricao: string,
): ResultadoDocumento {
  if (!regex.test(doc)) {
    return erro(doc, "formato", "formato", `${nome} inválido: ${descricao} (informado: "${doc}").`);
  }
  return ok(doc, "formato");
}

type Validador = (doc: string) => ResultadoDocumento;

export const VALIDADORES: Record<string, Validador> = {
  AR: validarAR,
  BR: validarBR,
  CL: validarCL,
  CO: validarCO,
  EC: validarEC,
  PE: validarPE,
  BO: (d) => apenasFormato(d, "NIT", /^[0-9]{7,12}$/, "são esperados de 7 a 12 dígitos"),
  CN: (d) => apenasFormato(d, "USCC", /^[A-Z0-9]{18}$/, "são esperados 18 caracteres alfanuméricos"),
  CR: (d) =>
    apenasFormato(d, "Cédula Jurídica", /^[0-9]{10}$/, "são esperados 10 dígitos"),
  GT: (d) => apenasFormato(d, "NIT", /^[0-9]{6,8}[0-9K]$/, "são esperados de 7 a 9 caracteres terminados em dígito ou K"),
  HN: (d) => apenasFormato(d, "RTN", /^[0-9]{14}$/, "são esperados 14 dígitos"),
  MX: (d) =>
    apenasFormato(
      d,
      "RFC",
      /^[A-ZÑ&]{3,4}[0-9]{6}[A-Z0-9]{3}$/,
      "são esperadas 3 letras (pessoa moral) ou 4 (pessoa física), data AAMMDD e 3 caracteres de homoclave",
    ),
  NI: (d) => apenasFormato(d, "RUC", /^[A-Z0-9]{14}$/, "são esperados 14 caracteres alfanuméricos"),
  PA: (d) => apenasFormato(d, "RUC", /^[0-9A-Z]{5,20}$/, "são esperados de 5 a 20 caracteres alfanuméricos"),
  PY: (d) => apenasFormato(d, "RUC", /^[0-9]{6,9}$/, "são esperados de 6 a 9 dígitos"),
  SV: (d) => apenasFormato(d, "NIT", /^[0-9]{14}$/, "são esperados 14 dígitos"),
  US: (d) => apenasFormato(d, "EIN", /^[0-9]{9}$/, "são esperados 9 dígitos"),
  UY: (d) => apenasFormato(d, "RUT", /^[0-9]{12}$/, "são esperados 12 dígitos"),
  VE: (d) =>
    apenasFormato(d, "RIF", /^[JGVEP][0-9]{9}$/, "é esperada uma letra (J, G, V, E ou P) seguida de 9 dígitos"),
};

/** Países cuja validação inclui dígito verificador. */
export const PAISES_COM_CHECKSUM = ["AR", "BR", "CL", "CO", "EC", "PE"] as const;

/**
 * Valida o documento fiscal do país. Nunca lança.
 * Países sem validador cadastrado passam com `nivel: "nenhum"` (não bloqueia
 * o cadastro) desde que o valor tenha ao menos 4 caracteres.
 */
export function validarDocumentoFiscal(pais: string, raw: string): ResultadoDocumento {
  const doc = normalizarDocumento(raw);
  const nome = DOCUMENTO_NOME[pais?.toUpperCase()] ?? "Documento fiscal";
  if (!doc) {
    return erro("", "nenhum", "vazio", `Informe o ${nome}.`);
  }
  const validador = VALIDADORES[pais?.toUpperCase()];
  if (!validador) {
    // País sem validador implementado: só formato mínimo, nunca bloqueia.
    if (doc.length < 4) {
      return erro(
        doc,
        "nenhum",
        "tamanho",
        `${nome} muito curto: informe ao menos 4 caracteres.`,
      );
    }
    return ok(doc, "nenhum");
  }
  return validador(doc);
}
