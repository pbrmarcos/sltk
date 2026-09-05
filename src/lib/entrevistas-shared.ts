export type Idioma = "pt" | "es" | "en";

export const I18N: Record<
  Idioma,
  {
    next: string;
    back: string;
    submit: string;
    sending: string;
    progress: string;
    required: string;
    describe: string;
    language: string;
    success_title: string;
    success_body: string;
    select_country: string;
    not_found: string;
    expired: string;
    optional_text: string;
    number_placeholder: string;
    review_title: string;
    review_subtitle: string;
    edit: string;
    no_answer: string;
    invalid_email: string;
    invalid_whatsapp: string;
    resume_notice: string;
    resume_clear: string;
    contact_step_label: string;
    retrying: string;
    sent_partial: string;
    unsaved_warn: string;
  }
> = {
  pt: {
    next: "Avançar",
    back: "Voltar",
    submit: "Enviar respostas",
    sending: "Enviando…",
    progress: "de",
    required: "Obrigatório",
    describe: "Descreva",
    language: "Idioma",
    success_title: "Recebemos suas respostas!",
    success_body: "Obrigado. Nossa equipe entrará em contato em breve.",
    select_country: "Selecione o país",
    not_found: "Entrevista não encontrada ou expirada.",
    expired: "Este link expirou.",
    optional_text: "Sua resposta",
    number_placeholder: "Digite um número",
    review_title: "Revise antes de enviar",
    review_subtitle: "Confira suas respostas. Você pode editar qualquer item.",
    edit: "Editar",
    no_answer: "— sem resposta —",
    invalid_email: "E-mail inválido.",
    invalid_whatsapp: "WhatsApp inválido (inclua DDI, ex.: +55).",
    resume_notice: "Retomamos do ponto em que você parou.",
    resume_clear: "Recomeçar",
    contact_step_label: "Contato",
    retrying: "Tentando novamente…",
    sent_partial: "Falha ao enviar. Tentando novamente…",
    unsaved_warn: "Você tem respostas não enviadas. Deseja realmente sair?",
  },
  es: {
    next: "Siguiente",
    back: "Volver",
    submit: "Enviar respuestas",
    sending: "Enviando…",
    progress: "de",
    required: "Obligatorio",
    describe: "Describa",
    language: "Idioma",
    success_title: "¡Recibimos tus respuestas!",
    success_body: "Gracias. Nuestro equipo se pondrá en contacto en breve.",
    select_country: "Selecciona el país",
    not_found: "Entrevista no encontrada o vencida.",
    expired: "Este enlace ha expirado.",
    optional_text: "Tu respuesta",
    number_placeholder: "Escribe un número",
    review_title: "Revisa antes de enviar",
    review_subtitle: "Verifica tus respuestas. Puedes editar cualquier ítem.",
    edit: "Editar",
    no_answer: "— sin respuesta —",
    invalid_email: "Correo inválido.",
    invalid_whatsapp: "WhatsApp inválido (incluye el código de país, ej.: +54).",
    resume_notice: "Retomamos donde lo dejaste.",
    resume_clear: "Reiniciar",
    contact_step_label: "Contacto",
    retrying: "Reintentando…",
    sent_partial: "Fallo al enviar. Reintentando…",
    unsaved_warn: "Tienes respuestas sin enviar. ¿Seguro que quieres salir?",
  },
  en: {
    next: "Next",
    back: "Back",
    submit: "Submit answers",
    sending: "Sending…",
    progress: "of",
    required: "Required",
    describe: "Describe",
    language: "Language",
    success_title: "We received your answers!",
    success_body: "Thanks. Our team will reach out shortly.",
    select_country: "Select country",
    not_found: "Interview not found or expired.",
    expired: "This link has expired.",
    optional_text: "Your answer",
    number_placeholder: "Enter a number",
    review_title: "Review before sending",
    review_subtitle: "Check your answers. You can edit any item.",
    edit: "Edit",
    no_answer: "— no answer —",
    invalid_email: "Invalid e-mail.",
    invalid_whatsapp: "Invalid WhatsApp (include country code, e.g. +1).",
    resume_notice: "We resumed from where you left off.",
    resume_clear: "Start over",
    contact_step_label: "Contact",
    retrying: "Retrying…",
    sent_partial: "Send failed. Retrying…",
    unsaved_warn: "You have unsent answers. Are you sure you want to leave?",
  },
};

export function pickLang<
  T extends { nome_pt: string; nome_es?: string | null; nome_en?: string | null },
>(obj: T | null | undefined, lang: Idioma): string {
  if (!obj) return "";
  if (lang === "es") return obj.nome_es || obj.nome_en || obj.nome_pt;
  if (lang === "en") return obj.nome_en || obj.nome_es || obj.nome_pt;
  return obj.nome_pt || obj.nome_es || obj.nome_en || "";
}

export function pickText(
  pt: string,
  es: string | null | undefined,
  en: string | null | undefined,
  lang: Idioma,
): string {
  const PT = pt ?? "";
  const ES = es ?? "";
  const EN = en ?? "";
  if (lang === "es") return ES || EN || PT;
  if (lang === "en") return EN || ES || PT;
  return PT || ES || EN;
}

/** Normalized detector: returns "yes" | "no" | null based on the label prefix in any language. */
export function detectYesNo(label: string): "yes" | "no" | null {
  const s = (label || "").trim().toLowerCase();
  if (!s) return null;
  if (/^(s[íi]|sim|yes)\b/.test(s) || /^(s[íi]|sim|yes)[\s,.:;\-–—]/.test(s)) return "yes";
  if (/^(n[ãa]o|no)\b/.test(s) || /^(n[ãa]o|no)[\s,.:;\-–—]/.test(s)) return "no";
  return null;
}

/** Lightweight international WhatsApp mask: keeps a leading +, groups digits softly. */
export function maskWhatsapp(raw: string): string {
  const s = (raw || "").replace(/[^\d+]/g, "");
  const plus = s.startsWith("+") ? "+" : "";
  const digits = s.replace(/\D/g, "").slice(0, 15);
  if (!digits) return plus;
  // Group as +CC (AAA) BBBB-CCCC when possible; otherwise soft grouping.
  if (digits.length <= 4) return `${plus}${digits}`;
  if (digits.length <= 7) return `${plus}${digits.slice(0, digits.length - 4)} ${digits.slice(-4)}`;
  const cc = digits.slice(
    0,
    digits.length > 11 ? digits.length - 10 : Math.max(1, digits.length - 10),
  );
  const rest = digits.slice(cc.length);
  const a = rest.slice(0, rest.length > 8 ? 3 : 2);
  const b = rest.slice(a.length, rest.length - 4);
  const c = rest.slice(-4);
  return `${plus}${cc}${a ? ` (${a})` : ""}${b ? ` ${b}` : ""}${c ? `-${c}` : ""}`.trim();
}

export function isValidWhatsapp(raw: string): boolean {
  const digits = (raw || "").replace(/\D/g, "");
  return digits.length >= 8 && digits.length <= 15;
}

export function isValidEmail(raw: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test((raw || "").trim());
}

/** ISO2 → 🇺🇸 emoji flag. */
export function flagEmoji(iso2: string): string {
  if (!iso2 || iso2.length !== 2) return "🏳️";
  const base = 0x1f1e6;
  const A = "A".charCodeAt(0);
  return (
    String.fromCodePoint(base + iso2.toUpperCase().charCodeAt(0) - A) +
    String.fromCodePoint(base + iso2.toUpperCase().charCodeAt(1) - A)
  );
}

export const COUNTRIES: Array<{ iso2: string; pt: string; es: string; en: string }> = [
  { iso2: "BR", pt: "Brasil", es: "Brasil", en: "Brazil" },
  { iso2: "AR", pt: "Argentina", es: "Argentina", en: "Argentina" },
  { iso2: "CL", pt: "Chile", es: "Chile", en: "Chile" },
  { iso2: "CO", pt: "Colômbia", es: "Colombia", en: "Colombia" },
  { iso2: "PE", pt: "Peru", es: "Perú", en: "Peru" },
  { iso2: "UY", pt: "Uruguai", es: "Uruguay", en: "Uruguay" },
  { iso2: "PY", pt: "Paraguai", es: "Paraguay", en: "Paraguay" },
  { iso2: "BO", pt: "Bolívia", es: "Bolivia", en: "Bolivia" },
  { iso2: "EC", pt: "Equador", es: "Ecuador", en: "Ecuador" },
  { iso2: "VE", pt: "Venezuela", es: "Venezuela", en: "Venezuela" },
  { iso2: "MX", pt: "México", es: "México", en: "Mexico" },
  { iso2: "US", pt: "Estados Unidos", es: "Estados Unidos", en: "United States" },
  { iso2: "CA", pt: "Canadá", es: "Canadá", en: "Canada" },
  { iso2: "PT", pt: "Portugal", es: "Portugal", en: "Portugal" },
  { iso2: "ES", pt: "Espanha", es: "España", en: "Spain" },
  { iso2: "IT", pt: "Itália", es: "Italia", en: "Italy" },
  { iso2: "FR", pt: "França", es: "Francia", en: "France" },
  { iso2: "DE", pt: "Alemanha", es: "Alemania", en: "Germany" },
  { iso2: "GB", pt: "Reino Unido", es: "Reino Unido", en: "United Kingdom" },
  { iso2: "CN", pt: "China", es: "China", en: "China" },
  { iso2: "JP", pt: "Japão", es: "Japón", en: "Japan" },
  { iso2: "IN", pt: "Índia", es: "India", en: "India" },
];

export function shareMessage(codigo: string, lang: Idioma, baseUrl: string): string {
  const link = `${baseUrl}/entrevista/${codigo}`;
  const m = {
    pt: `Sua entrevista está pronta. Para responder, clique neste link: ${link}`,
    es: `Tu entrevista está lista. Para responder, haz clic en este enlace: ${link}`,
    en: `Your interview is ready. To answer, click this link: ${link}`,
  };
  return m[lang];
}

// ---------- Contact-matrix detection ----------
export type OpcaoLite = {
  id: string;
  ordem: number;
  label_pt: string;
  label_es: string | null;
  label_en: string | null;
  tem_descricao: boolean;
};

const RE_NAME =
  /(nome\s+do\s+respons|nombre\s+del?\s+respons|responsible.*name|name\s*of\s*respons)/i;
const RE_EMAIL = /(^|\b)(e-?mail|correo|email)\b/i;
const RE_WHATS = /whats?app|whatsapp/i;

function isNameLabel(o: OpcaoLite) {
  return (
    RE_NAME.test(o.label_pt) || RE_NAME.test(o.label_es || "") || RE_NAME.test(o.label_en || "")
  );
}
function isEmailLabel(o: OpcaoLite) {
  return (
    RE_EMAIL.test(o.label_pt) || RE_EMAIL.test(o.label_es || "") || RE_EMAIL.test(o.label_en || "")
  );
}
function isWhatsLabel(o: OpcaoLite) {
  return (
    RE_WHATS.test(o.label_pt) || RE_WHATS.test(o.label_es || "") || RE_WHATS.test(o.label_en || "")
  );
}
function isFieldLabel(o: OpcaoLite) {
  return isNameLabel(o) || isEmailLabel(o) || isWhatsLabel(o);
}

export type ContactMatrixGroup<T extends OpcaoLite = OpcaoLite> = {
  role: T;
  nome?: T;
  email?: T;
  whatsapp?: T;
};

/** Detects role+Nome+E-mail+Whatsapp option groups. Returns null when the list isn't a matrix. */
export function groupContactMatrix<T extends OpcaoLite>(
  opcoes: T[],
): ContactMatrixGroup<T>[] | null {
  if (!opcoes || opcoes.length < 4) return null;
  const sorted = [...opcoes].sort((a, b) => a.ordem - b.ordem);
  const groups: ContactMatrixGroup<T>[] = [];
  let i = 0;
  while (i < sorted.length) {
    const role = sorted[i];
    if (isFieldLabel(role)) return null;
    const g: ContactMatrixGroup<T> = { role };
    let j = i + 1;
    while (j < sorted.length && isFieldLabel(sorted[j])) {
      const o = sorted[j];
      if (isNameLabel(o)) g.nome = o;
      else if (isEmailLabel(o)) g.email = o;
      else if (isWhatsLabel(o)) g.whatsapp = o;
      j++;
    }
    if (!g.nome && !g.email && !g.whatsapp) return null;
    groups.push(g);
    i = j;
  }
  return groups.length >= 2 ? groups : null;
}
