/**
 * Provider de envio via Resend, direto na API oficial (sem depender do
 * connector gateway da Lovable). Remetente padrão: system@sltkamericas.com
 * — o domínio precisa estar verificado no Resend.
 *
 * Calendar continua opcional via Google Service Account (Domain-Wide
 * Delegation). Se as env vars do Google não estiverem configuradas,
 * insertCalendarEvent retorna `provider_not_configured` e o dispatcher
 * apenas registra no log sem quebrar o envio de e-mail.
 */

const SENDER_EMAIL = "system@sltkamericas.com";
const SENDER_NAME = "Solutek";
const RESEND_API_URL = "https://api.resend.com/emails";

function readResendCreds() {
  const resend = process.env.RESEND_API_KEY;
  if (!resend) return null;
  return { resend };
}

function readGoogleCreds() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const keyRaw = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  if (!email || !keyRaw) return null;
  return { email, key: keyRaw.replace(/\\n/g, "\n") };
}

export function providerConfigured(): boolean {
  return readResendCreds() != null;
}

export function calendarConfigured(): boolean {
  return readGoogleCreds() != null;
}

export interface SendMailInput {
  to: string[];
  cc?: string[];
  subject: string;
  html: string;
}

export type SendResult =
  | { ok: true; messageId: string }
  | { ok: false; reason: "provider_not_configured" | "auth_failed" | "send_failed"; detail?: string };

export async function sendMail(input: SendMailInput): Promise<SendResult> {
  const creds = readResendCreds();
  if (!creds) return { ok: false, reason: "provider_not_configured" };

  const res = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${creds.resend}`,
    },
    body: JSON.stringify({
      from: `${SENDER_NAME} <${SENDER_EMAIL}>`,
      to: input.to,
      cc: input.cc && input.cc.length ? input.cc : undefined,
      subject: input.subject,
      html: input.html,
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    console.error("[email/provider] resend send failed", res.status, detail);
    if (res.status === 401 || res.status === 403) {
      return { ok: false, reason: "auth_failed", detail };
    }
    return { ok: false, reason: "send_failed", detail };
  }
  const j = (await res.json()) as { id?: string };
  return { ok: true, messageId: j.id ?? "" };
}

export interface CalendarEventInput {
  attendee: string;
  summary: string;
  description: string;
  startISO: string;
  durationMin: number;
}

/**
 * Google Calendar via Service Account (DWD). Só executa se as env vars
 * do Google estiverem configuradas — caso contrário retorna
 * `provider_not_configured` para o dispatcher.
 */
export async function insertCalendarEvent(
  input: CalendarEventInput,
): Promise<{ ok: true; eventId: string } | { ok: false; reason: string }> {
  const creds = readGoogleCreds();
  if (!creds) return { ok: false, reason: "provider_not_configured" };

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claim = {
    iss: creds.email,
    sub: input.attendee,
    scope: "https://www.googleapis.com/auth/calendar.events",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };
  const b64url = (buf: Buffer | string) =>
    (typeof buf === "string" ? Buffer.from(buf) : buf)
      .toString("base64")
      .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const enc = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(claim))}`;
  const { createSign } = await import("node:crypto");
  const sig = createSign("RSA-SHA256").update(enc).sign(creds.key);
  const jwt = `${enc}.${b64url(sig)}`;

  const tokRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  if (!tokRes.ok) {
    return { ok: false, reason: `token_exchange_failed: ${await tokRes.text()}` };
  }
  const { access_token } = (await tokRes.json()) as { access_token?: string };
  if (!access_token) return { ok: false, reason: "no_access_token" };

  const end = new Date(new Date(input.startISO).getTime() + input.durationMin * 60_000).toISOString();
  const res = await fetch(
    "https://www.googleapis.com/calendar/v3/calendars/primary/events?sendUpdates=none",
    {
      method: "POST",
      headers: { Authorization: `Bearer ${access_token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        summary: input.summary,
        description: input.description,
        start: { dateTime: input.startISO },
        end: { dateTime: end },
      }),
    },
  );
  if (!res.ok) {
    const detail = await res.text();
    console.error("[email/provider] calendar insert failed", res.status, detail);
    return { ok: false, reason: detail };
  }
  const j = (await res.json()) as { id?: string };
  return { ok: true, eventId: j.id ?? "" };
}
