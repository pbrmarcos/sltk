/**
 * Utilitários compartilhados para erros de formulário.
 *
 * Regra do sistema: um erro de validação (ou de API) nunca limpa os campos
 * já preenchidos. Apenas mostramos as mensagens e levamos o usuário até o
 * primeiro campo com problema.
 */

/** Nomes de campo (dot-path do react-hook-form) na ordem em que aparecem. */
export function firstErrorName(errors: Record<string, unknown>, prefix = ""): string | null {
  for (const [key, value] of Object.entries(errors ?? {})) {
    if (!value || typeof value !== "object") continue;
    const path = prefix ? `${prefix}.${key}` : key;
    if ("message" in (value as Record<string, unknown>) && (value as { message?: unknown }).message) {
      return path;
    }
    const nested = firstErrorName(value as Record<string, unknown>, path);
    if (nested) return nested;
  }
  return null;
}

/** Rola até um campo específico (por `name`, `id` ou `data-field`) e foca nele. */
export function focusFieldByName(name: string) {
  if (typeof document === "undefined" || !name) return;
  const escaped = name.replace(/"/g, '\\"');
  const el =
    document.querySelector<HTMLElement>(`[name="${escaped}"]`) ??
    document.querySelector<HTMLElement>(`#${CSS.escape(name)}`) ??
    document.querySelector<HTMLElement>(`[data-field="${escaped}"]`);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "center" });
  window.setTimeout(() => {
    try {
      el.focus({ preventScroll: true });
    } catch {
      /* elementos não focáveis são ignorados */
    }
  }, 150);
}

/**
 * Rola até o primeiro campo com erro e coloca o foco nele.
 * Aceita o objeto de erros do react-hook-form ou uma lista de nomes de campo.
 */
export function focusFirstError(errors: Record<string, unknown> | string[]) {
  if (typeof document === "undefined") return;
  const name = Array.isArray(errors) ? (errors[0] ?? null) : firstErrorName(errors);
  if (!name) return;
  focusFieldByName(name);
}

