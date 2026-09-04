/**
 * Layout padrão dos e-mails automáticos.
 *
 * - Header com logo Solutek Hub (imagem hospedada em CDN, URL absoluta).
 * - Corpo do template renderizado dentro de um wrapper limpo.
 * - CTA opcional (botão) quando o dispatch fornece {{link}}.
 * - Rodapé com metadados + disclaimer.
 *
 * Só usamos tables + inline styles — compatível com Gmail, Outlook e Apple Mail.
 * Também exportamos helpers de composição (blocoDados, blocoMotivo, blocoBullets)
 * usados dentro dos templates via variáveis `_html`.
 *
 * Este arquivo é browser-safe: usado no dispatch (server) e na prévia (client).
 */

const BRAND = "SLTK Americas";
const BRAND_URL = "https://solutek-hub.lovable.app";
const SENDER = "system@sltkamericas.com";

export interface EmailLayoutOptions {
  subject: string;
  bodyHtml: string;
  /** Rótulo do módulo mostrado no eyebrow (ex.: "COMERCIAL"). */
  moduleLabel?: string | null;
  /** URL do CTA principal — botão só aparece quando presente. */
  ctaUrl?: string | null;
  /** Rótulo do botão. Default: "Abrir no Solutek Hub". */
  ctaLabel?: string | null;
  /** Texto adicional no rodapé (ex.: "Disparado por Fulano • 21/07/2026 15:04"). */
  footerNote?: string | null;
}

export function wrapEmailHtml(opts: EmailLayoutOptions): string {
  const { subject, bodyHtml, moduleLabel, ctaUrl, ctaLabel, footerNote } = opts;
  const eyebrow = (moduleLabel ?? BRAND).toUpperCase();

  const cta = ctaUrl
    ? `
    <tr>
      <td style="padding:4px 32px 24px 32px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td bgcolor="#0f172a" style="border-radius:6px;">
              <a href="${escapeAttr(ctaUrl)}" target="_blank" rel="noopener"
                style="display:inline-block;padding:11px 20px;font-family:Arial,sans-serif;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:6px;">
                ${escapeText(ctaLabel || "Abrir no Sistema")}
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>`
    : "";

  const footer = footerNote
    ? `<div style="margin-top:6px;color:#64748b;">${escapeText(footerNote)}</div>`
    : "";

  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeText(subject)}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f1f5f9;">
    <tr>
      <td align="center" style="padding:24px 12px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"
          style="max-width:600px;width:100%;background:#ffffff;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;">
          <tr>
            <td align="left" style="padding:18px 32px;background:#0f172a;">
              <div style="font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:700;letter-spacing:0.08em;color:#ffffff;">${escapeText(BRAND)}</div>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 32px 4px 32px;">
              <div style="font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#64748b;">${escapeText(eyebrow)}</div>
              <h1 style="margin:6px 0 0 0;font-size:20px;line-height:1.3;font-weight:700;color:#0f172a;">${escapeText(subject)}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px 8px 32px;font-size:14px;line-height:1.65;color:#0f172a;">
              ${bodyHtml}
            </td>
          </tr>
          ${cta}
          <tr>
            <td style="padding:16px 32px 24px 32px;border-top:1px solid #e2e8f0;font-size:12px;line-height:1.55;color:#64748b;">
              <div>
                Mensagem automática de <strong style="color:#0f172a;">${escapeText(BRAND)}</strong>
                — <a href="${escapeAttr(BRAND_URL)}" style="color:#0f172a;">sltkamericas.com</a>
              </div>
              ${footer}
              <div style="margin-top:6px;">Remetente: <code style="font-family:Menlo,Consolas,monospace;">${escapeText(SENDER)}</code>. Não responda diretamente este e-mail.</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ─── Helpers de composição ──────────────────────────────────────────────────
// Retornam HTML seguro para embutir dentro de {{bloco_html}} variáveis.
// Use dentro do template como {{dados_html}}, {{motivo_html}}, {{bullets_html}}.

/**
 * Tabela chave→valor compacta. Ignora pares com valor vazio/nulo.
 * Ex.: blocoDados([["Código","OC-0451"], ["Cliente","Acme"], ["Valor","R$ 42.850"]])
 */
export function blocoDados(pares: Array<[string, string | number | null | undefined]>): string {
  const rows = pares
    .filter(([, v]) => v !== null && v !== undefined && String(v).trim() !== "")
    .map(([k, v]) => `
      <tr>
        <td style="padding:6px 12px 6px 0;font-size:12px;color:#64748b;white-space:nowrap;vertical-align:top;width:32%;">${escapeText(k)}</td>
        <td style="padding:6px 0;font-size:14px;color:#0f172a;font-weight:500;vertical-align:top;">${escapeText(String(v))}</td>
      </tr>`).join("");
  if (!rows) return "";
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
    style="margin:8px 0 4px 0;border:1px solid #e2e8f0;border-radius:8px;background:#f8fafc;">
    <tr><td style="padding:8px 14px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${rows}</table></td></tr>
  </table>`;
}

/** Bloco de destaque (motivo/observação) com barra lateral. */
export function blocoMotivo(titulo: string, texto: string): string {
  if (!texto || !texto.trim()) return "";
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0;">
    <tr>
      <td style="padding:10px 14px;border-left:3px solid #0f172a;background:#f1f5f9;border-radius:0 6px 6px 0;">
        <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:#334155;">${escapeText(titulo)}</div>
        <div style="margin-top:4px;font-size:14px;color:#0f172a;">${escapeText(texto)}</div>
      </td>
    </tr>
  </table>`;
}

/** Lista de bullets simples (próximos passos, itens de checklist). */
export function blocoBullets(titulo: string | null, itens: string[]): string {
  const lis = itens.filter((s) => s && s.trim()).map((s) => `<li style="margin:2px 0;">${escapeText(s)}</li>`).join("");
  if (!lis) return "";
  const head = titulo ? `<div style="font-size:12px;font-weight:600;color:#334155;margin-bottom:4px;">${escapeText(titulo)}</div>` : "";
  return `<div style="margin:8px 0;">${head}<ul style="margin:0;padding-left:18px;font-size:14px;color:#0f172a;">${lis}</ul></div>`;
}

function escapeText(s: string): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function escapeAttr(s: string): string {
  return escapeText(s);
}
