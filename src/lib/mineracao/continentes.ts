/** Continente de cada país (código ISO-2 usado pelas bases da Penta). */
const MAPA: Record<string, string> = {
  // América do Sul
  AR: "América do Sul",
  BO: "América do Sul",
  BR: "América do Sul",
  CL: "América do Sul",
  CO: "América do Sul",
  EC: "América do Sul",
  PY: "América do Sul",
  PE: "América do Sul",
  UY: "América do Sul",
  VE: "América do Sul",
  GY: "América do Sul",
  SR: "América do Sul",
  // América do Norte e Central
  US: "América do Norte e Central",
  CA: "América do Norte e Central",
  MX: "América do Norte e Central",
  CR: "América do Norte e Central",
  DO: "América do Norte e Central",
  GT: "América do Norte e Central",
  HN: "América do Norte e Central",
  NI: "América do Norte e Central",
  PA: "América do Norte e Central",
  PR: "América do Norte e Central",
  SV: "América do Norte e Central",
  CU: "América do Norte e Central",
  JM: "América do Norte e Central",
  TT: "América do Norte e Central",
  BZ: "América do Norte e Central",
  // Europa
  AT: "Europa",
  BE: "Europa",
  BG: "Europa",
  CY: "Europa",
  CZ: "Europa",
  DE: "Europa",
  DK: "Europa",
  EE: "Europa",
  ES: "Europa",
  FI: "Europa",
  FR: "Europa",
  GB: "Europa",
  GR: "Europa",
  HR: "Europa",
  HU: "Europa",
  IE: "Europa",
  IT: "Europa",
  LT: "Europa",
  LU: "Europa",
  LV: "Europa",
  MT: "Europa",
  NL: "Europa",
  NO: "Europa",
  PL: "Europa",
  PT: "Europa",
  RO: "Europa",
  RS: "Europa",
  RU: "Europa",
  SE: "Europa",
  SI: "Europa",
  SK: "Europa",
  CH: "Europa",
  UA: "Europa",
  // Ásia
  BD: "Ásia",
  CN: "Ásia",
  ID: "Ásia",
  IL: "Ásia",
  IN: "Ásia",
  JP: "Ásia",
  KR: "Ásia",
  KZ: "Ásia",
  LK: "Ásia",
  MY: "Ásia",
  PH: "Ásia",
  PK: "Ásia",
  SA: "Ásia",
  SG: "Ásia",
  TH: "Ásia",
  TR: "Ásia",
  TW: "Ásia",
  UZ: "Ásia",
  VN: "Ásia",
  AE: "Ásia",
  QA: "Ásia",
  JO: "Ásia",
  // África
  EG: "África",
  ET: "África",
  KE: "África",
  LS: "África",
  MA: "África",
  NG: "África",
  UG: "África",
  ZA: "África",
  ZW: "África",
  TN: "África",
  GH: "África",
  TZ: "África",
  CI: "África",
  // Oceania
  AU: "Oceania",
  NZ: "Oceania",
  FJ: "Oceania",
  PG: "Oceania",
};

/** Ordem de exibição dos continentes (mais relevantes primeiro para o comercial). */
export const ORDEM_CONTINENTES = [
  "América do Sul",
  "América do Norte e Central",
  "Europa",
  "Ásia",
  "África",
  "Oceania",
  "Outros",
];

export function continenteDe(keyCountry: string): string {
  return MAPA[(keyCountry || "").toUpperCase()] ?? "Outros";
}

export function ordemContinente(nome: string): number {
  const i = ORDEM_CONTINENTES.indexOf(nome);
  return i < 0 ? ORDEM_CONTINENTES.length : i;
}

/** Nome do país (pt/es/en, sem acento e em minúsculas) → código ISO-2. */
const NOMES: Record<string, string> = {};
function reg(iso: string, ...nomes: string[]) {
  for (const n of nomes) NOMES[norm(n)] = iso;
}
function norm(s: string): string {
  return (s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

reg("AR", "argentina");
reg("BO", "bolivia");
reg("BR", "brasil", "brazil");
reg("CL", "chile");
reg("CO", "colombia");
reg("EC", "ecuador", "equador");
reg("PY", "paraguai", "paraguay");
reg("PE", "peru");
reg("UY", "uruguai", "uruguay");
reg("VE", "venezuela");
reg("GY", "guiana", "guyana");
reg("SR", "suriname");
reg("US", "estados unidos", "united states", "estados unidos de america", "usa", "eua");
reg("CA", "canada");
reg("MX", "mexico");
reg("CR", "costa rica");
reg("DO", "republica dominicana", "dominican republic");
reg("GT", "guatemala");
reg("HN", "honduras");
reg("NI", "nicaragua");
reg("PA", "panama");
reg("PR", "porto rico", "puerto rico");
reg("SV", "el salvador");
reg("CU", "cuba");
reg("JM", "jamaica");
reg("TT", "trinidad e tobago", "trinidad y tobago", "trinidad and tobago");
reg("BZ", "belize");
reg("AT", "austria");
reg("BE", "belgica", "belgium", "belgique");
reg("BG", "bulgaria");
reg("CY", "chipre", "cyprus");
reg("CZ", "republica checa", "chequia", "czechia");
reg("DE", "alemanha", "alemania", "germany");
reg("DK", "dinamarca", "denmark");
reg("EE", "estonia");
reg("ES", "espanha", "espana", "spain");
reg("FI", "finlandia", "finland");
reg("FR", "franca", "francia", "france");
reg("GB", "reino unido", "united kingdom", "inglaterra", "gran bretana");
reg("GR", "grecia", "greece");
reg("HR", "croacia", "croatia");
reg("HU", "hungria", "hungary");
reg("IE", "irlanda", "ireland");
reg("IT", "italia", "italy");
reg("LT", "lituania");
reg("LU", "luxemburgo", "luxembourg");
reg("LV", "letonia", "latvia");
reg("MT", "malta");
reg("NL", "holanda", "paises bajos", "paises baixos", "netherlands");
reg("NO", "noruega", "norway");
reg("PL", "polonia", "poland");
reg("PT", "portugal");
reg("RO", "romenia", "rumania", "romania");
reg("RS", "servia", "serbia");
reg("RU", "russia", "rusia");
reg("SE", "suecia", "sweden");
reg("SI", "eslovenia", "slovenia");
reg("SK", "eslovaquia", "slovakia");
reg("CH", "suica", "suiza", "switzerland");
reg("UA", "ucrania", "ukraine");
reg("BD", "bangladesh");
reg("CN", "china");
reg("ID", "indonesia");
reg("IL", "israel");
reg("IN", "india");
reg("JP", "japao", "japon", "japan");
reg("KR", "coreia do sul", "corea del sur", "south korea", "korea");
reg("KZ", "cazaquistao", "kazajistan", "kazakhstan");
reg("LK", "sri lanka");
reg("MY", "malasia", "malaysia");
reg("PH", "filipinas", "philippines");
reg("PK", "paquistao", "pakistan");
reg("SA", "arabia saudita", "saudi arabia");
reg("SG", "singapura", "singapur", "singapore");
reg("TH", "tailandia", "thailand");
reg("TR", "turquia", "turkey", "turquia (turkiye)");
reg("TW", "taiwan");
reg("UZ", "uzbequistao", "uzbekistan");
reg("VN", "vietna", "vietnam");
reg("AE", "emirados arabes unidos", "emiratos arabes unidos", "united arab emirates");
reg("QA", "catar", "qatar");
reg("JO", "jordania");
reg("EG", "egito", "egipto", "egypt");
reg("ET", "etiopia", "ethiopia");
reg("KE", "quenia", "kenia", "kenya");
reg("MA", "marrocos", "marruecos", "morocco");
reg("NG", "nigeria");
reg("UG", "uganda");
reg("ZA", "africa do sul", "sudafrica", "south africa");
reg("ZW", "zimbabue", "zimbabwe");
reg("TN", "tunisia", "tunez");
reg("GH", "gana", "ghana");
reg("TZ", "tanzania");
reg("CI", "costa do marfim", "costa de marfil");
reg("AU", "australia");
reg("NZ", "nova zelandia", "nueva zelanda", "new zealand");
reg("FJ", "fiji");
reg("PG", "papua nova guine", "papua new guinea");

/** Continente a partir de código ISO-2 OU nome do país (pt/es/en). */
export function continenteDeQualquer(valor: string): string {
  const v = (valor || "").trim();
  if (!v) return "Outros";
  if (/^[A-Za-z]{2}$/.test(v)) {
    const c = MAPA[v.toUpperCase()];
    if (c) return c;
  }
  const iso = NOMES[norm(v)];
  return iso ? (MAPA[iso] ?? "Outros") : "Outros";
}
