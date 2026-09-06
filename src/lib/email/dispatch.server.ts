/**
 * Orquestrador central de disparos. Chamado pelos handlers de negócio
 * (aprovar OC, homologar FAT, etc.) e por crons.
 *
 * Fluxo:
 *   1. Carrega config do evento (subject/body/toggles).
 *   2. Resolve destinatários por papel + modo (to/cc).
 *   3. Renderiza templates.
 *   4. Chama provider (Gmail) e opcionalmente Calendar.
 *   5. Registra log — SEMPRE, mesmo em skip/failure.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { renderTemplate } from "./template";
import { wrapEmailHtml } from "./layout";
import { sendMail, insertCalendarEvent, providerConfigured } from "./provider.server";

type Admin = SupabaseClient<Database>;

export interface DispatchInput {
  eventKey: string;
  triggeredBy: string | null;
  triggeredByKind: "user" | "automation" | "cron" | "test";
  entityTable?: string | null;
  entityId?: string | null;
  vars: Record<string, string | number | null | undefined>;
  /** Datas ISO para eventos de agenda (quando o evento tem create_calendar_event=true). */
  calendarStartISO?: string | null;
  /** Destinatários extras — normalmente vazio; útil para incluir cliente/fornecedor externo em To. */
  extraTo?: string[];
  extraCc?: string[];
}

export async function dispatchEmail(admin: Admin, input: DispatchInput): Promise<void> {
  const { data: cfgRaw, error: cfgErr } = await admin
    .from("email_event_config")
    .select(
      "event_key, module, enabled, subject_template, body_template, create_calendar_event, calendar_duration_min, required_vars" as "*",
    )
    .eq("event_key", input.eventKey)
    .maybeSingle();

  if (cfgErr || !cfgRaw) {
    console.error("[email/dispatch] config lookup failed", input.eventKey, cfgErr);
    return;
  }
  const cfg = cfgRaw as unknown as {
    event_key: string;
    module: string | null;
    enabled: boolean;
    subject_template: string;
    body_template: string;
    create_calendar_event: boolean;
    calendar_duration_min: number | null;
    required_vars: string[] | null;
  };

  const subject = renderTemplate(cfg.subject_template, input.vars);
  const bodyRendered = renderTemplate(cfg.body_template, input.vars);
  const ctaUrl = typeof input.vars.link === "string" ? input.vars.link : null;
  const footerBits: string[] = [];
  if (input.vars.usuario) footerBits.push(`Disparado por ${String(input.vars.usuario)}`);
  else if (input.triggeredByKind !== "user") footerBits.push(`Origem: ${input.triggeredByKind}`);
  footerBits.push(new Date().toLocaleString("pt-BR"));
  const html = wrapEmailHtml({
    subject,
    bodyHtml: bodyRendered,
    moduleLabel: cfg.module ?? null,
    ctaUrl,
    ctaLabel: "Abrir no Sistema",
    footerNote: footerBits.join(" • "),
  });

  const varsUsed = input.vars as Record<string, unknown>;
  const templateSnapshot = {
    subject_template: cfg.subject_template,
    body_template: cfg.body_template,
  };

  const baseLog = {
    event_key: input.eventKey,
    triggered_by: input.triggeredBy,
    triggered_by_kind: input.triggeredByKind,
    entity_table: input.entityTable ?? null,
    entity_id: input.entityId ?? null,
    subject,
    vars_used: varsUsed,
    template_snapshot: templateSnapshot,
  };
  // Casts localizados: as novas colunas (vars_used, template_snapshot,
  // required_missing) e required_vars ainda não estão em types.ts gerado.
  const logTable = admin.from("email_send_log") as unknown as {
    insert: (row: Record<string, unknown>) => Promise<{ error: unknown }>;
  };

  // Validação de variáveis obrigatórias — bloqueia envio se faltar alguma.
  const required = (cfg.required_vars ?? []) as string[];
  const missing = required.filter(
    (k) =>
      input.vars[k] === null || input.vars[k] === undefined || String(input.vars[k]).trim() === "",
  );
  if (missing.length > 0) {
    await logTable.insert({
      ...baseLog,
      to_addresses: [],
      cc_addresses: [],
      status: "skipped_missing_required",
      required_missing: missing,
      error: `Variáveis obrigatórias ausentes: ${missing.join(", ")}`,
    });
    return;
  }

  if (!cfg.enabled) {
    await logTable.insert({
      ...baseLog,
      to_addresses: [],
      cc_addresses: [],
      status: "skipped_disabled",
    });
    return;
  }

  // Resolve papéis destinatários
  const { data: recs } = await admin
    .from("email_event_recipients")
    .select("role, mode")
    .eq("event_key", input.eventKey);

  const roles = recs ?? [];
  const toRoles = roles.filter((r) => r.mode === "to").map((r) => r.role);
  const ccRoles = roles.filter((r) => r.mode === "cc").map((r) => r.role);

  async function resolveEmails(rs: string[]): Promise<string[]> {
    if (rs.length === 0) return [];
    const { data } = await admin
      .from("user_roles")
      .select("user_id, role")
      .in("role", rs as Database["public"]["Enums"]["app_role"][]);
    const ids = Array.from(new Set((data ?? []).map((r) => r.user_id)));
    if (ids.length === 0) return [];
    const { data: profs } = await admin.from("profiles").select("id, email").in("id", ids);
    return (profs ?? []).map((p) => p.email).filter((e): e is string => !!e && e.includes("@"));
  }

  const to = Array.from(new Set([...(await resolveEmails(toRoles)), ...(input.extraTo ?? [])]));
  const cc = Array.from(new Set([...(await resolveEmails(ccRoles)), ...(input.extraCc ?? [])]));

  if (to.length === 0) {
    await logTable.insert({
      event_key: input.eventKey,
      triggered_by: input.triggeredBy,
      triggered_by_kind: input.triggeredByKind,
      entity_table: input.entityTable ?? null,
      entity_id: input.entityId ?? null,
      to_addresses: [],
      cc_addresses: cc,
      subject,
      status: "skipped_no_recipients",
    });
    return;
  }

  if (!(await providerConfigured())) {
    await logTable.insert({
      event_key: input.eventKey,
      triggered_by: input.triggeredBy,
      triggered_by_kind: input.triggeredByKind,
      entity_table: input.entityTable ?? null,
      entity_id: input.entityId ?? null,
      to_addresses: to,
      cc_addresses: cc,
      subject,
      status: "provider_not_configured",
    });
    return;
  }

  const result = await sendMail({ to, cc, subject, html });

  const calendarIds: Record<string, string> = {};
  if (
    result.ok &&
    cfg.create_calendar_event &&
    input.calendarStartISO &&
    cfg.calendar_duration_min
  ) {
    const attendees = Array.from(new Set([...to, ...cc]));
    for (const email of attendees) {
      const r = await insertCalendarEvent({
        attendee: email,
        summary: subject,
        description: html,
        startISO: input.calendarStartISO,
        durationMin: cfg.calendar_duration_min,
      });
      if (r.ok) calendarIds[email] = r.eventId;
    }
  }

  await logTable.insert({
    event_key: input.eventKey,
    triggered_by: input.triggeredBy,
    triggered_by_kind: input.triggeredByKind,
    entity_table: input.entityTable ?? null,
    entity_id: input.entityId ?? null,
    to_addresses: to,
    cc_addresses: cc,
    subject,
    status: result.ok ? "sent" : "failed",
    gmail_message_id: result.ok ? result.messageId : null,
    calendar_event_ids: Object.keys(calendarIds).length ? calendarIds : null,
    error: result.ok ? null : `${result.reason}${result.detail ? `: ${result.detail}` : ""}`,
  });
}
