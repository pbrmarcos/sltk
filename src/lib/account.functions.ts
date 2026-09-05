import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const profileInput = z.object({
  full_name: z.string().trim().min(1).max(120),
  avatar_url: z.string().url().max(2000).nullable().optional(),
});

async function auditSafe(db: any, entries: Array<Record<string, unknown>>) {
  if (entries.length === 0) return;
  try {
    await db.from("audit_log").insert(entries as never);
  } catch (error) {
    console.error("[account] audit_log insert failed:", error);
  }
}

export const updateMyProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => profileInput.parse(input))
  .handler(async ({ data, context }) => {
    const { getDbClient } = await import("@/lib/supabase-optional-admin.server");
    const db: any = await getDbClient(context.supabase);

    const { data: before, error: befErr } = await db
      .from("profiles")
      .select("full_name, avatar_url")
      .eq("id", context.userId)
      .maybeSingle();
    if (befErr) throw new Error(befErr.message);

    const update: { full_name: string; avatar_url?: string | null } = {
      full_name: data.full_name,
    };
    if (data.avatar_url !== undefined) update.avatar_url = data.avatar_url;

    const { error: upErr } = await db
      .from("profiles")
      .update(update)
      .eq("id", context.userId);
    if (upErr) throw new Error(upErr.message);

    const entries: Array<Record<string, unknown>> = [];
    if (before?.full_name !== data.full_name) {
      entries.push({
        user_id: context.userId,
        table_name: "profiles",
        record_id: context.userId,
        action: "UPDATE",
        field_changed: "full_name",
        old_value: before?.full_name ?? null,
        new_value: data.full_name,
      });
    }
    if (data.avatar_url !== undefined && before?.avatar_url !== data.avatar_url) {
      entries.push({
        user_id: context.userId,
        table_name: "profiles",
        record_id: context.userId,
        action: "UPDATE",
        field_changed: "avatar_url",
        old_value: before?.avatar_url ?? null,
        new_value: data.avatar_url ?? null,
      });
    }
    await auditSafe(db, entries);
    return { ok: true };
  });

export const removeMyAvatar = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { getDbClient } = await import("@/lib/supabase-optional-admin.server");
    const db: any = await getDbClient(context.supabase);

    const { data: before, error: befErr } = await db
      .from("profiles")
      .select("avatar_url")
      .eq("id", context.userId)
      .maybeSingle();
    if (befErr) throw new Error(befErr.message);

    if (before?.avatar_url) {
      try {
        const url = new URL(before.avatar_url);
        const pathMatch = url.pathname.match(/\/avatars\/(.*)/);
        if (pathMatch?.[1]) {
          await db.storage.from("avatars").remove([decodeURIComponent(pathMatch[1])]);
        }
      } catch (e) {
        console.warn("[account] falha ao remover avatar antigo do storage", e);
      }
    }

    const { error: upErr } = await db
      .from("profiles")
      .update({ avatar_url: null })
      .eq("id", context.userId);
    if (upErr) throw new Error(upErr.message);

    if (before?.avatar_url !== null) {
      await auditSafe(db, [
        {
          user_id: context.userId,
          table_name: "profiles",
          record_id: context.userId,
          action: "UPDATE",
          field_changed: "avatar_url",
          old_value: before?.avatar_url ?? null,
          new_value: null,
        },
      ]);
    }

    return { ok: true };
  });

const passwordInput = z.object({
  current_password: z.string().min(1).max(72),
  new_password: z.string().min(12).max(72),
});

export const changeMyPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => passwordInput.parse(input))
  .handler(async ({ data, context }) => {
    const { createClient } = await import("@supabase/supabase-js");
    const { getSupabasePublicConfig } = await import("@/integrations/supabase/config");
    const { getOptionalAdminClient } = await import("@/lib/supabase-optional-admin.server");
    const admin: any = await getOptionalAdminClient();
    const db: any = admin ?? context.supabase;

    // Look up user email to verify current password.
    const { data: profile, error: pErr } = await db
      .from("profiles")
      .select("email")
      .eq("id", context.userId)
      .maybeSingle();
    if (pErr) throw new Error(pErr.message);
    if (!profile?.email) throw new Error("Email do usuário não encontrado.");

    // Verify current password by attempting sign-in on a throwaway client.
    const { url: supabaseUrl, publishableKey: supabasePublishableKey } = getSupabasePublicConfig();
    const verify = createClient(
      supabaseUrl,
      supabasePublishableKey,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    const { data: signed, error: signErr } = await verify.auth.signInWithPassword({
      email: profile.email,
      password: data.current_password,
    });
    if (signErr) throw new Error("Senha atual incorreta.");

    if (admin) {
      const { error: upErr } = await admin.auth.admin.updateUserById(context.userId, {
        password: data.new_password,
      });
      if (upErr) throw new Error(upErr.message);
    } else {
      // No service role available: update through the freshly signed-in session.
      if (!signed?.session) throw new Error("Não foi possível validar a sessão para trocar a senha.");
      const { error: upErr } = await verify.auth.updateUser({ password: data.new_password });
      if (upErr) throw new Error(upErr.message);
    }

    await auditSafe(db, [
      {
        user_id: context.userId,
        table_name: "auth.users",
        record_id: context.userId,
        action: "UPDATE",
        field_changed: "password",
        new_value: "changed_by_user",
      },
    ]);

    return { ok: true };
  });

/* ------------------------------------------------------------------ */
/* Preferências de agendamento (Google Workspace / Microsoft Teams)     */
/* ------------------------------------------------------------------ */

const AGENDA_FIELDS =
  "agenda_provider, agenda_google_email, agenda_teams_email, agenda_teams_tenant, agenda_sala_padrao, agenda_convidados_padrao, agenda_duracao_min, agenda_fuso";

export type AgendaPrefs = {
  agenda_provider: "google" | "teams" | "ambos";
  agenda_google_email: string | null;
  agenda_teams_email: string | null;
  agenda_teams_tenant: string | null;
  agenda_sala_padrao: string | null;
  agenda_convidados_padrao: string | null;
  agenda_duracao_min: number;
  agenda_fuso: string;
};

export const getMyAgendaPrefs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AgendaPrefs> => {
    const { data, error } = await context.supabase
      .from("profiles")
      .select(AGENDA_FIELDS)
      .eq("id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    const row = (data ?? {}) as Partial<AgendaPrefs>;
    return {
      agenda_provider: (row.agenda_provider ?? "google") as AgendaPrefs["agenda_provider"],
      agenda_google_email: row.agenda_google_email ?? null,
      agenda_teams_email: row.agenda_teams_email ?? null,
      agenda_teams_tenant: row.agenda_teams_tenant ?? null,
      agenda_sala_padrao: row.agenda_sala_padrao ?? null,
      agenda_convidados_padrao: row.agenda_convidados_padrao ?? null,
      agenda_duracao_min: row.agenda_duracao_min ?? 60,
      agenda_fuso: row.agenda_fuso ?? "America/Sao_Paulo",
    };
  });

const emailOrNull = z
  .string()
  .trim()
  .max(160)
  .optional()
  .nullable()
  .transform((v) => (v ? v : null))
  .refine((v) => v === null || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v), "E-mail inválido.");

const agendaInput = z.object({
  agenda_provider: z.enum(["google", "teams", "ambos"]),
  agenda_google_email: emailOrNull,
  agenda_teams_email: emailOrNull,
  agenda_teams_tenant: z.string().trim().max(160).optional().nullable().transform((v) => (v ? v : null)),
  agenda_sala_padrao: z.string().trim().max(500).optional().nullable().transform((v) => (v ? v : null)),
  agenda_convidados_padrao: z
    .string()
    .trim()
    .max(1000)
    .optional()
    .nullable()
    .transform((v) => (v ? v : null)),
  agenda_duracao_min: z.number().int().min(15).max(480),
  agenda_fuso: z.string().trim().min(1).max(80),
});

export const updateMyAgendaPrefs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => agendaInput.parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("profiles")
      .update(data as never)
      .eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
