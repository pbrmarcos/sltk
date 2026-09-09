import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Criação de eventos reais de agenda a partir de ações interativas da
 * plataforma (Agendar entrevista, Agendar kickoff, ...), via a Service
 * Account com Domain-Wide Delegation já usada pelo disparo de e-mails
 * transacionais. Nunca lança para o chamador — qualquer falha (e-mail
 * Google não configurado, service account ausente, chamada à API
 * falhando) vira status estruturado no retorno, mesmo espírito
 * não-bloqueante do dispatch de e-mail.
 */

export const AGENDA_CATEGORIAS = ["entrevista", "kickoff"] as const;
export type AgendaCategoria = (typeof AGENDA_CATEGORIAS)[number];

export type AgendaEventStatus = "not_attempted" | "ok" | "failed" | "provider_not_configured";
export type AgendaMirrorStatus = AgendaEventStatus | "disabled";

export type AgendarEventoRealResult = {
  organizerEvent: { status: AgendaEventStatus; detail?: string };
  mirrorEvent: { status: AgendaMirrorStatus; detail?: string };
};

const agendarInput = z.object({
  categoria: z.enum(AGENDA_CATEGORIAS),
  summary: z.string().trim().min(1).max(300),
  description: z.string().trim().max(4000).optional().default(""),
  startISO: z.string().min(10),
  durationMin: z.number().int().min(5).max(480),
  attendees: z.array(z.string().email()).max(30).optional().default([]),
  entityTable: z.string().max(60).optional().nullable(),
  entityId: z.string().max(100).optional().nullable(),
});

export const agendarEventoReal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => agendarInput.parse(input))
  .handler(async ({ data, context }): Promise<AgendarEventoRealResult> => {
    const sb = context.supabase as any;
    const userId = context.userId;

    let organizerEvent: { status: AgendaEventStatus; detail?: string } = {
      status: "not_attempted",
    };
    let mirrorEvent: { status: AgendaMirrorStatus; detail?: string } = { status: "not_attempted" };
    let organizerEventId: string | null = null;
    let mirrorEventId: string | null = null;
    let organizerEmail: string | null = null;
    let organizerName: string | null = null;

    try {
      const { calendarConfigured, insertCalendarEvent } =
        await import("@/lib/email/provider.server");

      const { data: me } = await sb
        .from("profiles")
        .select("agenda_google_email, full_name, email")
        .eq("id", userId)
        .maybeSingle();
      organizerEmail = me?.email ?? null;
      organizerName = me?.full_name ?? organizerEmail ?? "Usuário";
      const googleEmail = me?.agenda_google_email as string | null | undefined;

      if (!googleEmail) {
        organizerEvent = {
          status: "provider_not_configured",
          detail: "Sem e-mail Google Workspace configurado para este usuário.",
        };
      } else if (!(await calendarConfigured())) {
        organizerEvent = {
          status: "provider_not_configured",
          detail: "Service account do Google não configurada.",
        };
      } else {
        const r = await insertCalendarEvent({
          attendee: googleEmail,
          summary: data.summary,
          description: data.description,
          startISO: data.startISO,
          durationMin: data.durationMin,
          attendees: data.attendees,
        });
        if (r.ok) {
          organizerEvent = { status: "ok" };
          organizerEventId = r.eventId;
        } else {
          organizerEvent = { status: "failed", detail: r.reason };
        }
      }

      try {
        const [{ data: categoria }, { data: settings }] = await Promise.all([
          sb
            .from("calendar_mirror_categories")
            .select("mirror_enabled")
            .eq("categoria", data.categoria)
            .maybeSingle(),
          sb
            .from("calendar_mirror_settings")
            .select("mirror_admin_user_id")
            .eq("singleton", true)
            .maybeSingle(),
        ]);

        if (!categoria?.mirror_enabled || !settings?.mirror_admin_user_id) {
          mirrorEvent = { status: "disabled" };
        } else {
          const { getCriticalClient } = await import("@/lib/supabase-client.server");
          const admin = await getCriticalClient();
          const { data: mirrorProfile } = await admin
            .from("profiles")
            .select("agenda_google_email")
            .eq("id", settings.mirror_admin_user_id)
            .maybeSingle();
          const mirrorEmail = mirrorProfile?.agenda_google_email as string | null | undefined;

          if (!mirrorEmail) {
            mirrorEvent = {
              status: "provider_not_configured",
              detail: "Administrador designado não tem e-mail Google Workspace configurado.",
            };
          } else if (!(await calendarConfigured())) {
            mirrorEvent = { status: "provider_not_configured" };
          } else {
            const r2 = await insertCalendarEvent({
              attendee: mirrorEmail,
              summary: data.summary,
              description: `Agendado por ${organizerName}.\n\n${data.description}`,
              startISO: data.startISO,
              durationMin: data.durationMin,
            });
            if (r2.ok) {
              mirrorEvent = { status: "ok" };
              mirrorEventId = r2.eventId;
            } else {
              mirrorEvent = { status: "failed", detail: r2.reason };
            }
          }
        }
      } catch (e) {
        mirrorEvent = {
          status: "failed",
          detail: e instanceof Error ? e.message : "Falha ao espelhar na agenda do administrador.",
        };
      }
    } catch (e) {
      console.error("[calendar/agendarEventoReal] erro inesperado", e);
      if (organizerEvent.status === "not_attempted") {
        organizerEvent = {
          status: "failed",
          detail: e instanceof Error ? e.message : "Erro inesperado.",
        };
      }
    }

    try {
      await sb.from("calendar_event_log").insert({
        categoria: data.categoria,
        organizer_id: userId,
        organizer_email: organizerEmail,
        summary: data.summary,
        start_at: data.startISO,
        duration_min: data.durationMin,
        attendees: data.attendees,
        entity_table: data.entityTable ?? null,
        entity_id: data.entityId ?? null,
        organizer_event_id: organizerEventId,
        organizer_event_status: organizerEvent.status,
        organizer_event_error: organizerEvent.detail ?? null,
        mirror_event_id: mirrorEventId,
        mirror_event_status: mirrorEvent.status,
        mirror_event_error: mirrorEvent.detail ?? null,
      } as never);
    } catch (e) {
      console.error("[calendar/agendarEventoReal] falha ao gravar log", e);
    }

    return { organizerEvent, mirrorEvent };
  });
