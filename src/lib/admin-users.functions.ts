import { createServerFn } from "@tanstack/react-start";
import { friendlyDbError } from "@/lib/db-errors";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertCanActOn, assertAdmin as assertAdminRole } from "@/lib/admin-guard";
import { logAuditServer } from "@/lib/audit.server";
import type { AuditEntry } from "@/lib/audit";

const ROLES = [
  "admin",
  "manager",
  "engineer",
  "production",
  "purchasing",
  "assembly",
  "field",
  "sales",
] as const;
const roleEnum = z.enum(ROLES);

export type AdminUserRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  roles: typeof ROLES[number][];
  deleted_at: string | null;
  created_at: string;
};

async function assertAdmin(userId: string) {
  const { getCriticalClient } = await import("@/lib/supabase-client.server");
  const supabaseAdmin = await getCriticalClient();
  await assertAdminRole(supabaseAdmin, userId);
  return supabaseAdmin;
}

const listInput = z.object({
  search: z.string().max(120).optional().default(""),
  role: z.union([roleEnum, z.literal("all")]).optional().default("all"),
  status: z.enum(["active", "inactive", "all"]).optional().default("active"),
  page: z.number().int().min(1).max(10_000).optional().default(1),
  pageSize: z.number().int().min(1).max(50).optional().default(50),
});

export const listAdminUsers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => listInput.parse(input))
  .handler(async ({ data, context }) => {
    // Listing does not require service-role privileges. Using the authenticated
    // request client keeps this screen available in self-hosted deployments;
    // RLS grants admins access to all profiles and roles.
    const { data: adminRole, error: adminRoleError } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();
    if (adminRoleError) throw friendlyDbError(adminRoleError);
    if (!adminRole) throw new Error("Acesso restrito a administradores.");
    const admin = context.supabase;

    let q = admin
      .from("profiles")
      .select("id, email, full_name, deleted_at, created_at", { count: "exact" });

    if (data.status === "active") q = q.is("deleted_at", null);
    else if (data.status === "inactive") q = q.not("deleted_at", "is", null);

    if (data.search.trim()) {
      const s = data.search.trim().replace(/[%,]/g, "");
      q = q.or(`full_name.ilike.%${s}%,email.ilike.%${s}%`);
    }

    // If filtering by role, restrict to user ids that have that role.
    if (data.role !== "all") {
      const { data: ids, error: rErr } = await admin
        .from("user_roles")
        .select("user_id")
        .eq("role", data.role);
      if (rErr) throw friendlyDbError(rErr);
      const list = (ids ?? []).map((r) => r.user_id);
      if (list.length === 0) {
        return { rows: [] as AdminUserRow[], total: 0 };
      }
      q = q.in("id", list);
    }

    const from = (data.page - 1) * data.pageSize;
    const to = from + data.pageSize - 1;
    const { data: profiles, count, error } = await q
      .order("created_at", { ascending: false })
      .range(from, to);
    if (error) throw friendlyDbError(error);

    const ids = (profiles ?? []).map((p) => p.id);
    let rolesByUser = new Map<string, typeof ROLES[number][]>();
    if (ids.length > 0) {
      const { data: roleRows, error: rrErr } = await admin
        .from("user_roles")
        .select("user_id, role")
        .in("user_id", ids);
      if (rrErr) throw friendlyDbError(rrErr);
      for (const r of roleRows ?? []) {
        const arr = rolesByUser.get(r.user_id) ?? [];
        arr.push(r.role as typeof ROLES[number]);
        rolesByUser.set(r.user_id, arr);
      }
    }

    const rows: AdminUserRow[] = (profiles ?? []).map((p) => ({
      id: p.id,
      email: p.email,
      full_name: p.full_name,
      roles: rolesByUser.get(p.id) ?? [],
      deleted_at: p.deleted_at,
      created_at: p.created_at,
    }));
    return { rows, total: count ?? 0 };
  });

const createInput = z.object({
  full_name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(255),
  password: z.string().min(12).max(72),
  roles: z.array(roleEnum).min(1).max(8),
});

export const createAdminUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => createInput.parse(input))
  .handler(async ({ data, context }) => {
    // A autorização deve usar a sessão do solicitante. Não use assertAdmin()
    // aqui: ele instancia o client de service role antes de podermos aplicar o
    // fallback necessário em instalações self-hosted (ex.: Coolify).
    const { data: adminRole, error: adminRoleError } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();
    if (adminRoleError) throw friendlyDbError(adminRoleError);
    if (!adminRole) throw new Error("Acesso restrito a administradores.");

    let newId: string;
    let privilegedClient: Awaited<ReturnType<typeof assertAdmin>> | null = null;

    try {
      // Caminho preferencial: cria já confirmado quando a credencial
      // administrativa está disponível no runtime.
      const { getCriticalClient } = await import("@/lib/supabase-client.server");
      const supabaseAdmin = await getCriticalClient();
      const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
        email: data.email,
        password: data.password,
        email_confirm: true,
        user_metadata: { full_name: data.full_name },
      });
      if (error || !created.user) {
        throw new Error(error?.message ?? "Falha ao criar usuário");
      }
      newId = created.user.id;
      privilegedClient = supabaseAdmin;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const unavailable =
        error instanceof Error && error.name === "ServiceRoleUnavailableError";
      if (!unavailable) {
        throw new Error(message);
      }

      // Fallback sem service role: usa um cliente de autenticação isolado.
      // Assim o signUp não substitui a sessão do administrador que fez a ação.
      const [{ createClient }, { STATIC_SUPABASE_PUBLISHABLE_KEY, STATIC_SUPABASE_URL }] =
        await Promise.all([
          import("@supabase/supabase-js"),
          import("@/integrations/supabase/config"),
        ]);
      const url = process.env.SUPABASE_URL || STATIC_SUPABASE_URL;
      const key = process.env.SUPABASE_PUBLISHABLE_KEY || STATIC_SUPABASE_PUBLISHABLE_KEY;
      const signupClient = createClient(url, key, {
        auth: {
          storage: undefined,
          persistSession: false,
          autoRefreshToken: false,
        },
      });
      const { data: signedUp, error: signupError } = await signupClient.auth.signUp({
        email: data.email,
        password: data.password,
        options: { data: { full_name: data.full_name } },
      });
      if (signupError || !signedUp.user) {
        throw new Error(signupError?.message ?? "Falha ao criar usuário");
      }
      if (signedUp.user.identities?.length === 0) {
        throw new Error("Já existe um usuário cadastrado com este e-mail.");
      }
      newId = signedUp.user.id;
    }

    const uniqueRoles = Array.from(new Set(data.roles));
    if (privilegedClient) {
      // Trigger handle_new_user inserts profile; ensure full_name is set.
      const { error: profileError } = await privilegedClient
        .from("profiles")
        .upsert(
          { id: newId, email: data.email, full_name: data.full_name },
          { onConflict: "id" },
        );
      if (profileError) throw friendlyDbError(profileError);

      const { error: rolesError } = await privilegedClient
        .from("user_roles")
        .insert(uniqueRoles.map((role) => ({ user_id: newId, role })));
      if (rolesError) throw friendlyDbError(rolesError);
    } else {
      // O RPC revalida auth.uid() como admin e executa perfil + roles
      // atomicamente, sem expor privilégios de escrita no cliente.
      const { error: finalizeError } = await (context.supabase.rpc as unknown as (
        fn: string,
        args: Record<string, unknown>,
      ) => Promise<{ error: { message: string } | null }>)('admin_finalize_new_user', {
        _user_id: newId,
        _email: data.email,
        _full_name: data.full_name,
        _roles: uniqueRoles,
      });
      if (finalizeError) throw friendlyDbError(finalizeError);
    }

    // audit_log é append-only para usuários autenticados; no fallback, os
    // triggers das tabelas registram as alterações. Com service role mantemos
    // também o evento agregado de criação.
    if (privilegedClient) {
      await logAuditServer(privilegedClient, context.userId, [
        {
          table_name: "profiles",
          record_id: newId,
          action: "INSERT",
          new_value: { email: data.email, full_name: data.full_name, roles: uniqueRoles },
        },
      ]);
    }

    return { id: newId };
  });

const updateInput = z.object({
  id: z.string().uuid(),
  full_name: z.string().trim().min(1).max(120),
  roles: z.array(roleEnum).min(0).max(8),
});

export const updateAdminUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => updateInput.parse(input))
  .handler(async ({ data, context }) => {
    const admin = await assertAdmin(context.userId);

    const { data: before, error: befErr } = await admin
      .from("profiles")
      .select("full_name")
      .eq("id", data.id)
      .maybeSingle();
    if (befErr) throw friendlyDbError(befErr);
    if (!before) throw new Error("Usuário não encontrado");

    const { data: existingRoles, error: erErr } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", data.id);
    if (erErr) throw friendlyDbError(erErr);
    const oldRoles = (existingRoles ?? []).map((r) => r.role as typeof ROLES[number]);
    const newRoles = Array.from(new Set(data.roles));

    const toAdd = newRoles.filter((r) => !oldRoles.includes(r));
    const toRemove = oldRoles.filter((r) => !newRoles.includes(r));

    // Se alguma role muda, aplicamos hierarquia (não permite rebaixar o
    // último admin, nem mexer em usuários acima ou iguais em nível).
    if (toAdd.length > 0 || toRemove.length > 0) {
      await assertCanActOn(admin, context.userId, data.id, "role_change");
    }

    const entries: AuditEntry[] = [];

    if (before.full_name !== data.full_name) {
      const { error: upErr } = await admin
        .from("profiles")
        .update({ full_name: data.full_name })
        .eq("id", data.id);
      if (upErr) throw friendlyDbError(upErr);
      entries.push({
        table_name: "profiles",
        record_id: data.id,
        action: "UPDATE",
        field_changed: "full_name",
        old_value: before.full_name,
        new_value: data.full_name,
      });
    }

    if (toAdd.length > 0) {
      const { error: addErr } = await admin
        .from("user_roles")
        .insert(toAdd.map((role) => ({ user_id: data.id, role })));
      if (addErr) throw friendlyDbError(addErr);
    }
    if (toRemove.length > 0) {
      const { error: rmErr } = await admin
        .from("user_roles")
        .delete()
        .eq("user_id", data.id)
        .in("role", toRemove);
      if (rmErr) throw friendlyDbError(rmErr);
    }
    if (toAdd.length > 0 || toRemove.length > 0) {
      entries.push({
        table_name: "user_roles",
        record_id: data.id,
        action: "UPDATE",
        field_changed: "roles",
        old_value: oldRoles,
        new_value: newRoles,
      });
      // Sessão viva: JWT antigo ainda pode ter roles anteriores. Forçamos
      // reautenticação para que o próximo request use o novo conjunto.
      try {
        await admin.auth.admin.signOut(data.id, "global");
      } catch (e) {
        console.warn("[admin] signOut após role change falhou", e);
      }
    }

    await logAuditServer(admin, context.userId, entries);
    return { ok: true };
  });

const idInput = z.object({ id: z.string().uuid() });

export const deactivateAdminUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => idInput.parse(input))
  .handler(async ({ data, context }) => {
    if (data.id === context.userId) {
      throw new Error("Você não pode desativar a própria conta.");
    }
    const admin = await assertAdmin(context.userId);
    // Hierarquia + proteção do último admin.
    await assertCanActOn(admin, context.userId, data.id, "disable");

    // Marca perfil como disabled (defense in depth) + soft delete.
    // Cast: colunas disabled_* recém-adicionadas; types.ts regenera após migration.
    const { error: upErr } = await admin
      .from("profiles")
      .update({
        deleted_at: new Date().toISOString(),
        disabled: true,
        disabled_at: new Date().toISOString(),
        disabled_by: context.userId,
      } as never)
      .eq("id", data.id);
    if (upErr) throw friendlyDbError(upErr);

    const { error: delErr } = await admin
      .from("user_roles")
      .delete()
      .eq("user_id", data.id);
    if (delErr) throw friendlyDbError(delErr);

    // Bane a conta no Auth (revoga refresh tokens).
    const { error: banErr } = await admin.auth.admin.updateUserById(data.id, {
      ban_duration: "876000h",
    });
    if (banErr) throw friendlyDbError(banErr);

    // Derruba sessões ativas — não podemos esperar o JWT expirar (~1h).
    try {
      await admin.auth.admin.signOut(data.id, "global");
    } catch (e) {
      console.warn("[admin] signOut após deactivate falhou", e);
    }

    await logAuditServer(admin, context.userId, [
      {
        table_name: "profiles",
        record_id: data.id,
        action: "UPDATE",
        field_changed: "deleted_at",
        new_value: "deactivated",
      },
    ]);
    return { ok: true };
  });

export const reactivateAdminUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => idInput.parse(input))
  .handler(async ({ data, context }) => {
    const admin = await assertAdmin(context.userId);

    const { error: upErr } = await admin
      .from("profiles")
      .update({
        deleted_at: null,
        disabled: false,
        disabled_at: null,
        disabled_by: null,
        disabled_reason: null,
      } as never)
      .eq("id", data.id);
    if (upErr) throw friendlyDbError(upErr);

    const { error: banErr } = await admin.auth.admin.updateUserById(data.id, {
      ban_duration: "none",
    });
    if (banErr) throw friendlyDbError(banErr);

    await logAuditServer(admin, context.userId, [
      {
        table_name: "profiles",
        record_id: data.id,
        action: "UPDATE",
        field_changed: "deleted_at",
        new_value: "reactivated",
      },
    ]);
    return { ok: true };
  });

// Reset another user's password to a new temporary password (admin only).
const resetInput = z.object({
  id: z.string().uuid(),
  password: z.string().min(12).max(72),
});

export const resetAdminUserPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => resetInput.parse(input))
  .handler(async ({ data, context }) => {
    if (data.id === context.userId) {
      throw new Error("Use a página de conta para alterar sua própria senha.");
    }
    // Verificação de permissão com a sessão do próprio admin (RLS),
    // sem depender da service role — que pode não estar no ambiente.
    const { data: isAdminRow, error: adminErr } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();
    if (adminErr) throw friendlyDbError(adminErr);
    if (!isAdminRow) throw new Error("Acesso restrito a administradores.");

    // Vetor de escalação: um ator só pode resetar alvos com rank inferior.
    await assertCanActOn(context.supabase, context.userId, data.id, "password_reset");

    // Caminho preferencial: definir a senha temporária via Admin API.
    try {
      const { getCriticalClient } = await import("@/lib/supabase-client.server");
      const supabaseAdmin = await getCriticalClient();
      const { error } = await supabaseAdmin.auth.admin.updateUserById(data.id, {
        password: data.password,
      });
      if (error) throw friendlyDbError(error);
      try {
        await logAuditServer(supabaseAdmin, context.userId, [
          {
            table_name: "auth.users",
            record_id: data.id,
            action: "UPDATE",
            field_changed: "password",
            new_value: "reset_by_admin",
          },
        ]);
      } catch {
        /* auditoria não deve bloquear o reset */
      }
      return { ok: true, mode: "password" as const, email: null as string | null };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const unavailable = e instanceof Error && e.name === "ServiceRoleUnavailableError";
      if (!unavailable) throw new Error(msg);
    }

    // Fallback (ambiente sem service role): define a senha via função
    // SECURITY DEFINER no banco, que revalida admin + hierarquia de roles.
    const { error: rpcErr } = await (context.supabase.rpc as unknown as (
      fn: string,
      args: Record<string, unknown>,
    ) => Promise<{ error: { message: string } | null }>)("admin_set_user_password", {
      _user_id: data.id,
      _password: data.password,
    });
    if (rpcErr) throw friendlyDbError(rpcErr);
    return { ok: true, mode: "password" as const, email: null as string | null };


  });