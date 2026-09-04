/**
 * Server functions da tela /admin/emails.
 *
 * Segurança: só admin edita config/matriz; admin/manager lêem tudo.
 * Toda mutação registra auditoria em `audit_log`.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { logAuditServer } from "@/lib/audit.server";

async function requireAdmin(userId: string) {
  const { getCriticalClient } = await import("@/lib/supabase-client.server");
    const supabaseAdmin = await getCriticalClient();
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Acesso restrito a administradores.");
  return supabaseAdmin;
}

async function requireAdminOrManager(userId: string) {
  const { getCriticalClient } = await import("@/lib/supabase-client.server");
    const supabaseAdmin = await getCriticalClient();
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .in("role", ["admin", "manager"]);
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) throw new Error("Acesso restrito.");
  return supabaseAdmin;
}

export type EmailEventRow = {
  event_key: string;
  module: string;
  label: string;
  description: string | null;
  enabled: boolean;
  subject_template: string;
  body_template: string;
  create_calendar_event: boolean;
  calendar_duration_min: number | null;
  required_vars: string[];
};
export type EmailRecipientRow = { event_key: string; role: string; mode: string };

export type LastSendInfo = { at: string; status: string; to: string[] };

export const listEmailEvents = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{
    events: EmailEventRow[];
    recipients: EmailRecipientRow[];
    lastSends: Record<string, LastSendInfo>;
  }> => {
    const admin = await requireAdminOrManager(context.userId);
    const { data: events, error } = await admin
      .from("email_event_config")
      .select("*")
      .order("module")
      .order("event_key");
    if (error) throw new Error(error.message);
    const { data: recs, error: rErr } = await admin
      .from("email_event_recipients")
      .select("event_key, role, mode");
    if (rErr) throw new Error(rErr.message);

    // Último envio por event_key. Pega os 500 mais recentes (janela grande
    // o suficiente para cobrir todos os eventos ativos) e reduz no JS.
    const { data: logs } = await admin
      .from("email_send_log")
      .select("event_key, created_at, status, to_addresses")
      .order("created_at", { ascending: false })
      .limit(500);
    const lastSends: Record<string, LastSendInfo> = {};
    for (const l of (logs ?? []) as Array<{
      event_key: string; created_at: string; status: string; to_addresses: string[] | null;
    }>) {
      if (!lastSends[l.event_key]) {
        lastSends[l.event_key] = {
          at: l.created_at,
          status: l.status,
          to: l.to_addresses ?? [],
        };
      }
    }

    return {
      events: ((events ?? []) as unknown as EmailEventRow[]).map((e) => ({
        ...e,
        required_vars: e.required_vars ?? [],
      })),
      recipients: (recs ?? []) as EmailRecipientRow[],
      lastSends,
    };
  });



const toggleInput = z.object({ event_key: z.string(), enabled: z.boolean() });
export const toggleEmailEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => toggleInput.parse(i))
  .handler(async ({ data, context }) => {
    const admin = await requireAdmin(context.userId);
    const { data: before } = await admin
      .from("email_event_config")
      .select("enabled")
      .eq("event_key", data.event_key)
      .maybeSingle();
    const { error } = await admin
      .from("email_event_config")
      .update({ enabled: data.enabled })
      .eq("event_key", data.event_key);
    if (error) throw new Error(error.message);
    await logAuditServer(admin, context.userId, {
      table_name: "email_event_config",
      record_id: data.event_key,
      action: "UPDATE",
      field_changed: "enabled",
      old_value: before?.enabled ?? null,
      new_value: data.enabled,
    });
    return { ok: true };
  });

const templateInput = z.object({
  event_key: z.string(),
  subject_template: z.string().min(1).max(300),
  body_template: z.string().min(1).max(10_000),
  create_calendar_event: z.boolean(),
  calendar_duration_min: z.number().int().min(5).max(720).nullable(),
  required_vars: z.array(z.string().regex(/^[a-zA-Z0-9_]+$/)).max(30).default([]),
});
export const updateEmailTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => templateInput.parse(i))
  .handler(async ({ data, context }) => {
    const admin = await requireAdmin(context.userId);
    const { data: before } = await admin
      .from("email_event_config")
      .select("subject_template, body_template, create_calendar_event, calendar_duration_min")
      .eq("event_key", data.event_key)
      .maybeSingle();
    const updateTable = admin.from("email_event_config") as unknown as {
      update: (patch: Record<string, unknown>) => { eq: (col: string, val: string) => Promise<{ error: { message: string } | null }> };
    };
    const { error } = await updateTable
      .update({
        subject_template: data.subject_template,
        body_template: data.body_template,
        create_calendar_event: data.create_calendar_event,
        calendar_duration_min: data.create_calendar_event ? data.calendar_duration_min : null,
        required_vars: data.required_vars,
      })
      .eq("event_key", data.event_key);
    if (error) throw new Error(error.message);
    await logAuditServer(admin, context.userId, {
      table_name: "email_event_config",
      record_id: data.event_key,
      action: "UPDATE",
      field_changed: "template",
      old_value: before,
      new_value: data,
    });
    return { ok: true };
  });


const APP_ROLES = ["admin","manager","engineer","production","purchasing","assembly","field","sales"] as const;
const recipientsInput = z.object({
  event_key: z.string(),
  recipients: z.array(z.object({
    role: z.enum(APP_ROLES),
    mode: z.enum(["to","cc"]),
  })).max(APP_ROLES.length * 2),
});
export const updateEmailRecipients = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => recipientsInput.parse(i))
  .handler(async ({ data, context }) => {
    const admin = await requireAdmin(context.userId);
    const { data: before } = await admin
      .from("email_event_recipients")
      .select("role, mode")
      .eq("event_key", data.event_key);
    const { error: delErr } = await admin
      .from("email_event_recipients")
      .delete()
      .eq("event_key", data.event_key);
    if (delErr) throw new Error(delErr.message);
    if (data.recipients.length > 0) {
      const { error: insErr } = await admin.from("email_event_recipients").insert(
        data.recipients.map((r) => ({
          event_key: data.event_key,
          role: r.role,
          mode: r.mode,
        })),
      );
      if (insErr) throw new Error(insErr.message);
    }
    await logAuditServer(admin, context.userId, {
      table_name: "email_event_recipients",
      record_id: data.event_key,
      action: "UPDATE",
      field_changed: "matrix",
      old_value: before ?? [],
      new_value: data.recipients,
    });
    return { ok: true };
  });

export type EmailLogRow = {
  id: string;
  created_at: string;
  event_key: string;
  triggered_by: string | null;
  triggered_by_kind: string;
  entity_table: string | null;
  entity_id: string | null;
  to_addresses: string[];
  cc_addresses: string[];
  subject: string;
  status: string;
  gmail_message_id: string | null;
  calendar_event_ids: Record<string, string> | null;
  error: string | null;
  vars_used: Record<string, string | number | boolean | null> | null;
  template_snapshot: { subject_template: string; body_template: string } | null;
  required_missing: string[] | null;

};

const logsInput = z.object({
  event_key: z.string().nullable().optional(),
  status: z.string().nullable().optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(50),
});
export const listEmailLogs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => logsInput.parse(i))
  .handler(async ({ data, context }): Promise<{ rows: EmailLogRow[]; total: number }> => {
    const admin = await requireAdminOrManager(context.userId);
    let q = admin
      .from("email_send_log")
      .select("*", { count: "exact" });
    if (data.event_key) q = q.eq("event_key", data.event_key);
    if (data.status) q = q.eq("status", data.status);
    const from = (data.page - 1) * data.pageSize;
    const to = from + data.pageSize - 1;
    const { data: rows, count, error } = await q
      .order("created_at", { ascending: false })
      .range(from, to);
    if (error) throw new Error(error.message);
    return { rows: (rows ?? []) as unknown as EmailLogRow[], total: count ?? 0 };
  });

const testInput = z.object({
  event_key: z.string(),
  recipient: z.string().trim().email().max(255).optional().nullable(),
  overrides: z.record(z.string(), z.string().max(500)).optional(),
});
export const sendTestEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => testInput.parse(i))
  .handler(async ({ data, context }) => {
    const admin = await requireAdmin(context.userId);
    const { dispatchEmail } = await import("./dispatch.server");
    let recipient = data.recipient?.trim() || null;
    if (!recipient) {
      const { data: prof } = await admin
        .from("profiles").select("email").eq("id", context.userId).maybeSingle();
      recipient = prof?.email ?? null;
    }
    if (!recipient) throw new Error("Informe um destinatário ou cadastre e-mail no seu perfil.");

    const { SAMPLE_VARS } = await import("./sample-vars");
    const vars: Record<string, string> = {
      ...SAMPLE_VARS,
      destinatario_nome: "Teste",
      data: new Date().toLocaleString("pt-BR"),
      ...(data.overrides ?? {}),
    };
    await dispatchEmail(admin, {
      eventKey: data.event_key,
      triggeredBy: context.userId,
      triggeredByKind: "test",
      entityTable: "email_event_config",
      entityId: data.event_key,
      vars,
      extraTo: [recipient],
    });
    return { ok: true, recipient };
  });


export const emailProviderStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdminOrManager(context.userId);
    const emailConfigured =
      !!process.env.LOVABLE_API_KEY && !!process.env.RESEND_API_KEY;
    const calendarConfigured =
      !!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
      !!process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
    return {
      configured: emailConfigured,
      calendarConfigured,
      sender: "system@sltkamericas.com",
      provider: "resend" as const,
    };
  });

const previewInput = z.object({
  subject_template: z.string().min(1).max(300),
  body_template: z.string().min(1).max(10_000),
  event_key: z.string().optional().nullable(),
});
/**
 * Renderiza assunto+corpo do template com variáveis-exemplo e aplica o layout
 * padrão. Retorna também problemas de validação: variáveis não reconhecidas,
 * tags não fechadas, tamanho suspeito, ausência de {{link}} etc. Puramente
 * síncrono: não envia e-mail nem grava log.
 */
export const previewEmailTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => previewInput.parse(i))
  .handler(async ({ data, context }) => {
    const admin = await requireAdminOrManager(context.userId);
    const { renderTemplate } = await import("./template");
    const { wrapEmailHtml } = await import("./layout");
    const { SAMPLE_VARS, extractTemplateVars } = await import("./sample-vars");

    let moduleLabel: string | null = null;
    if (data.event_key) {
      const { data: cfg } = await admin
        .from("email_event_config")
        .select("module")
        .eq("event_key", data.event_key)
        .maybeSingle();
      moduleLabel = cfg?.module ?? null;
    }

    const subject = renderTemplate(data.subject_template, SAMPLE_VARS);
    const bodyRendered = renderTemplate(data.body_template, SAMPLE_VARS);
    const html = wrapEmailHtml({
      subject,
      bodyHtml: bodyRendered,
      moduleLabel,
      ctaUrl: typeof SAMPLE_VARS.link === "string" ? SAMPLE_VARS.link : null,
      ctaLabel: "Abrir no Solutek Hub",
      footerNote: `Prévia com dados fictícios • ${new Date().toLocaleString("pt-BR")}`,
    });

    const subjectVars = extractTemplateVars(data.subject_template);
    const bodyVars = extractTemplateVars(data.body_template);
    const allVars = Array.from(new Set([...subjectVars, ...bodyVars]));
    const knownVars = new Set(Object.keys(SAMPLE_VARS));
    const unknownVars = allVars.filter((v) => !knownVars.has(v));

    const warnings: string[] = [];
    if (subject.length > 120) warnings.push(`Assunto tem ${subject.length} caracteres (>120 pode ser cortado por Gmail/Outlook).`);
    if (!data.body_template.includes("{{link}}")) warnings.push('O corpo não usa {{link}} — o botão de CTA aparece só quando o dispatch fornece link.');
    if (/<\/(script|style)>/i.test(data.body_template)) warnings.push("Template contém <script> ou <style>; a maioria dos clientes de e-mail bloqueia.");
    if (unknownVars.length > 0) warnings.push(`Variáveis sem valor-exemplo: ${unknownVars.join(", ")}.`);
    // Verifica balanceamento simples de tags {{ e }}
    const openTags = (data.body_template.match(/\{\{/g) || []).length;
    const closeTags = (data.body_template.match(/\}\}/g) || []).length;
    if (openTags !== closeTags) warnings.push(`Chaves desbalanceadas: ${openTags} "{{" x ${closeTags} "}}".`);

    return {
      subject,
      html,
      vars_used: allVars,
      unknown_vars: unknownVars,
      warnings,
    };
  });
