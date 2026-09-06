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

import {
  getGoogleAccessToken,
  serviceAccountConfigured,
} from "@/lib/google-service-account.server";

const SENDER_EMAIL = "system@sltkamericas.com";
const SENDER_NAME = "Solutek";
const RESEND_API_URL = "https://api.resend.com/emails";
const CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.events";

async function readResendCreds() {
  const { getSecret } = await import("@/lib/secrets.server");
  const resend = await getSecret("RESEND_API_KEY");
  if (!resend) return null;
  return { resend };
}

export async function providerConfigured(): Promise<boolean> {
  return (await readResendCreds()) != null;
}

export async function calendarConfigured(): Promise<boolean> {
  return serviceAccountConfigured();
}

export interface SendMailInput {
  to: string[];
  cc?: string[];
  subject: string;
  html: string;
}

export type SendResult =
  | { ok: true; messageId: string }
  | {
      ok: false;
      reason: "provider_not_configured" | "auth_failed" | "send_failed";
      detail?: string;
    };

export async function sendMail(input: SendMailInput): Promise<SendResult> {
  const creds = await readResendCreds();
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
  let access_token: string | null;
  try {
    access_token = await getGoogleAccessToken(CALENDAR_SCOPE, input.attendee);
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : "token_exchange_failed" };
  }
  if (!access_token) return { ok: false, reason: "provider_not_configured" };

  const end = new Date(
    new Date(input.startISO).getTime() + input.durationMin * 60_000,
  ).toISOString();
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
