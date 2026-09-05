/**
 * Server functions do balcão de suporte técnico (role `engineer` ou superior).
 *
 * Todas as operações respeitam a hierarquia de roles: um ator só age sobre
 * alvos com rank estritamente inferior ao seu (`assertCanActOn`).
 *
 * NÃO reutiliza `admin-users.functions.ts` porque aquele exige role `admin`
 * na entrada; aqui a porta é `engineer`.
 */
import { createServerFn } from "@tanstack/react-start";
import { friendlyDbError } from "@/lib/db-errors";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  ROLE_RANK,
  assertActiveUser,
  assertCanActOn,
  assertEngineerOrHigher,
  getMaxRoleRank,
  type AppRoleName,
} from "@/lib/admin-guard";
import { logAuditServer } from "@/lib/audit.server";

export type SupportUserRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  roles: AppRoleName[];
  max_rank: number;
  disabled: boolean;
  created_at: string;
};

const listInput = z.object({
  search: z.string().max(120).optional().default(""),
  page: z.number().int().min(1).max(10_000).optional().default(1),
  pageSize: z.number().int().min(1).max(50).optional().default(25),
});

/**
 * Lista usuários que o ator pode atender: rank estritamente inferior ao seu.
 * `engineer` vê production/purchasing/assembly/field/sales.
 * `manager` vê tudo abaixo de manager.
 * `admin` vê todos exceto ele mesmo.
 */
export const listSupportUsers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => listInput.parse(input))
  .handler(async ({ data, context }) => {
    await assertActiveUser(context.supabase, context.userId);
    await assertEngineerOrHigher(context.supabase, context.userId);

    const { getCriticalClient } = await import("@/lib/supabase-client.server");
    const supabaseAdmin = await getCriticalClient();

    const actorRank = await getMaxRoleRank(supabaseAdmin, context.userId);

    let q = supabaseAdmin
      .from("profiles")
      .select("id, email, full_name, disabled, created_at", { count: "exact" })
      .neq("id", context.userId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    const term = data.search.trim();
    if (term) {
      q = q.or(`email.ilike.%${term}%,full_name.ilike.%${term}%`);
    }

    const from = (data.page - 1) * data.pageSize;
    const to = from + data.pageSize - 1;
    const { data: profiles, error, count } = await q.range(from, to);
    if (error) throw friendlyDbError(error);

    const ids = (profiles ?? []).map((p) => p.id);
    let rolesByUser = new Map<string, AppRoleName[]>();
    if (ids.length > 0) {
      const { data: roles, error: rErr } = await supabaseAdmin
        .from("user_roles")
        .select("user_id, role")
        .in("user_id", ids);
      if (rErr) throw friendlyDbError(rErr);
      rolesByUser = (roles ?? []).reduce((acc, r) => {
        const arr = acc.get(r.user_id) ?? [];
        arr.push(r.role as AppRoleName);
        acc.set(r.user_id, arr);
        return acc;
      }, new Map<string, AppRoleName[]>());
    }

    const rows: SupportUserRow[] = (profiles ?? [])
      .map((p) => {
        const roles = rolesByUser.get(p.id) ?? [];
        const maxRank = roles.reduce((m, r) => Math.max(m, ROLE_RANK[r] ?? 0), 0);
        return {
          id: p.id,
          email: p.email,
          full_name: p.full_name,
          roles,
          max_rank: maxRank,
          disabled: Boolean(p.disabled),
          created_at: p.created_at,
        };
      })
      // Filtra fora quem tem rank igual/superior ao ator — não é target válido.
      .filter((r) => r.max_rank < actorRank);

    return { rows, total: count ?? rows.length, actor_rank: actorRank };
  });

const resetInput = z.object({
  id: z.string().uuid(),
  password: z.string().min(12).max(72),
});

/**
 * Reset de senha via balcão de suporte.
 * Hierarquia é enforçada por `assertCanActOn`: engineer não reseta engineer/manager/admin.
 */
export const supportResetPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => resetInput.parse(input))
  .handler(async ({ data, context }) => {
    await assertActiveUser(context.supabase, context.userId);
    await assertEngineerOrHigher(context.supabase, context.userId);

    const { getCriticalClient } = await import("@/lib/supabase-client.server");
    const supabaseAdmin = await getCriticalClient();

    await assertCanActOn(supabaseAdmin, context.userId, data.id, "password_reset");

    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.id, {
      password: data.password,
    });
    if (error) throw friendlyDbError(error);

    await logAuditServer(supabaseAdmin, context.userId, {
      table_name: "auth.users",
      record_id: data.id,
      action: "UPDATE",
      field_changed: "password",
      new_value: "reset_by_support",
    });

    return { ok: true };
  });

const recoveryInput = z.object({ id: z.string().uuid() });

/**
 * Envia magic link de recuperação de senha ao email do alvo.
 * Alternativa a `supportResetPassword` quando não queremos gerar senha
 * temporária. Hierarquia é enforçada.
 */
export const supportSendPasswordRecovery = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => recoveryInput.parse(input))
  .handler(async ({ data, context }) => {
    await assertActiveUser(context.supabase, context.userId);
    await assertEngineerOrHigher(context.supabase, context.userId);

    const { getCriticalClient } = await import("@/lib/supabase-client.server");
    const supabaseAdmin = await getCriticalClient();

    await assertCanActOn(supabaseAdmin, context.userId, data.id, "password_reset");

    // Precisamos do email do alvo para gerar o link.
    const { data: prof, error: pErr } = await supabaseAdmin
      .from("profiles")
      .select("email")
      .eq("id", data.id)
      .maybeSingle();
    if (pErr) throw friendlyDbError(pErr);
    if (!prof?.email) {
      throw new Error("Usuário sem email cadastrado; use reset de senha.");
    }

    const { error } = await supabaseAdmin.auth.admin.generateLink({
      type: "recovery",
      email: prof.email,
    });
    if (error) throw friendlyDbError(error);

    await logAuditServer(supabaseAdmin, context.userId, {
      table_name: "auth.users",
      record_id: data.id,
      action: "UPDATE",
      field_changed: "password_recovery_link",
      new_value: "sent_by_support",
    });

    return { ok: true };
  });
