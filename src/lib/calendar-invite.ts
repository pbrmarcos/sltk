/**
 * Geração de convites de calendário (Google Agenda, Outlook e arquivo .ics).
 * Tudo client-side: usa a conta que o usuário já tem logada no navegador.
 */

export type CalendarEvent = {
  title: string;
  description?: string;
  location?: string;
  /** Início em horário local (Date). */
  start: Date;
  /** Duração em minutos. */
  durationMin: number;
  /** E-mails dos convidados. */
  attendees?: string[];
  organizerEmail?: string;
};

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** UTC no formato compacto exigido por Google/Outlook/iCalendar: 20260813T210000Z */
export function toUtcStamp(d: Date): string {
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  );
}

export function eventEnd(ev: CalendarEvent): Date {
  return new Date(ev.start.getTime() + Math.max(5, ev.durationMin) * 60_000);
}

export function buildGoogleCalendarUrl(ev: CalendarEvent): string {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: ev.title,
    dates: `${toUtcStamp(ev.start)}/${toUtcStamp(eventEnd(ev))}`,
  });
  if (ev.description) params.set("details", ev.description);
  if (ev.location) params.set("location", ev.location);
  for (const a of ev.attendees ?? []) params.append("add", a);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function buildOutlookUrl(ev: CalendarEvent, variant: "web" | "office" = "web"): string {
  const base =
    variant === "office"
      ? "https://outlook.office.com/calendar/0/deeplink/compose"
      : "https://outlook.live.com/calendar/0/deeplink/compose";
  const params = new URLSearchParams({
    path: "/calendar/action/compose",
    rru: "addevent",
    subject: ev.title,
    startdt: ev.start.toISOString(),
    enddt: eventEnd(ev).toISOString(),
  });
  if (ev.description) params.set("body", ev.description);
  if (ev.location) params.set("location", ev.location);
  if (ev.attendees?.length) params.set("to", ev.attendees.join(";"));
  return `${base}?${params.toString()}`;
}

function escapeIcs(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

export function buildIcs(ev: CalendarEvent): string {
  const uid = `${toUtcStamp(ev.start)}-${Math.random().toString(36).slice(2, 10)}@sltkamericas.com`;
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//SLTK Americas//Solutek Hub//PT-BR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${toUtcStamp(new Date())}`,
    `DTSTART:${toUtcStamp(ev.start)}`,
    `DTEND:${toUtcStamp(eventEnd(ev))}`,
    `SUMMARY:${escapeIcs(ev.title)}`,
  ];
  if (ev.description) lines.push(`DESCRIPTION:${escapeIcs(ev.description)}`);
  if (ev.location) lines.push(`LOCATION:${escapeIcs(ev.location)}`);
  if (ev.organizerEmail) lines.push(`ORGANIZER:mailto:${ev.organizerEmail}`);
  for (const a of ev.attendees ?? []) {
    lines.push(`ATTENDEE;ROLE=REQ-PARTICIPANT;RSVP=TRUE:mailto:${a}`);
  }
  lines.push("STATUS:CONFIRMED", "END:VEVENT", "END:VCALENDAR");
  return lines.join("\r\n");
}

export function downloadIcs(ev: CalendarEvent, filename = "entrevista.ics"): void {
  const blob = new Blob([buildIcs(ev)], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/** Converte "2026-08-20" + "14:30" em Date local. Retorna null se inválido. */
export function parseLocalDateTime(date: string, time: string): Date | null {
  if (!date || !time) return null;
  const d = new Date(`${date}T${time}:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function splitEmails(raw: string): string[] {
  return raw
    .split(/[,;\s]+/)
    .map((s) => s.trim())
    .filter((s) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s));
}
