import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

type Json = string | number | boolean | null | Json[] | { [key: string]: Json };

export type AuditLogRow = {
  id: string;
  created_at: string;
  user_id: string | null;
  user_email: string | null;
  user_name: string | null;
  table_name: string;
  record_id: string;
  action: "INSERT" | "UPDATE" | "DELETE";
  field_changed: string | null;
  old_value: Json | null;
  new_value: Json | null;
};

const ACTIONS = ["INSERT", "UPDATE", "DELETE"] as const;

const listInput = z.object({
  search: z.string().max(120).optional().default(""),
  user_id: z.string().uuid().nullable().optional().default(null),
  action: z.union([z.enum(ACTIONS), z.literal("all")]).optional().default("all"),
  table_name: z.string().max(120).optional().default(""),
  from: z.string().datetime().nullable().optional().default(null),
  to: z.string().datetime().nullable().optional().default(null),
  page: z.number().int().min(1).max(10_000).optional().default(1),
  pageSize: z.number().int().min(1).max(50).optional().default(50),
});

async function assertAdminOrManager(supabase: SupabaseClient<Database>, userId: string) {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .in("role", ["admin", "manager"]);
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) throw new Error("Acesso restrito.");
  return supabase;
}

export const listAuditLog = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => listInput.parse(input))
  .handler(async ({ data, context }) => {
    const admin = await assertAdminOrManager(context.supabase, context.userId);

    let q = admin
      .from("audit_log")
      .select(
        "id, created_at, user_id, table_name, record_id, action, field_changed, old_value, new_value",
        { count: "exact" },
      );

    if (data.user_id) q = q.eq("user_id", data.user_id);
    if (data.action !== "all") q = q.eq("action", data.action);
    if (data.table_name.trim()) q = q.ilike("table_name", `%${data.table_name.trim()}%`);
    if (data.from) q = q.gte("created_at", data.from);
    if (data.to) q = q.lte("created_at", data.to);
    if (data.search.trim()) {
      const s = data.search.trim().replace(/[%,]/g, "");
      q = q.or(
        `table_name.ilike.%${s}%,record_id.ilike.%${s}%,field_changed.ilike.%${s}%`,
      );
    }

    const from = (data.page - 1) * data.pageSize;
    const to = from + data.pageSize - 1;
    const { data: rows, count, error } = await q
      .order("created_at", { ascending: false })
      .range(from, to);
    if (error) throw new Error(error.message);

    const userIds = Array.from(
      new Set((rows ?? []).map((r) => r.user_id).filter((v): v is string => !!v)),
    );
    const userMap = new Map<string, { email: string | null; full_name: string | null }>();
    if (userIds.length > 0) {
      const { data: profs, error: pErr } = await admin
        .from("profiles")
        .select("id, email, full_name")
        .in("id", userIds);
      if (pErr) throw new Error(pErr.message);
      for (const p of profs ?? []) {
        userMap.set(p.id, { email: p.email ?? null, full_name: p.full_name ?? null });
      }
    }

    const out: AuditLogRow[] = (rows ?? []).map((r) => {
      const info = r.user_id ? userMap.get(r.user_id) : undefined;
      return {
        id: r.id,
        created_at: r.created_at,
        user_id: r.user_id,
        user_email: info?.email ?? null,
        user_name: info?.full_name ?? null,
        table_name: r.table_name,
        record_id: r.record_id,
        action: r.action as AuditLogRow["action"],
        field_changed: r.field_changed,
        old_value: (r.old_value ?? null) as Json | null,
        new_value: (r.new_value ?? null) as Json | null,
      };
    });

    return { rows: out, total: count ?? 0 };
  });

const userSearchInput = z.object({ search: z.string().trim().max(120).optional().default("") });

export const searchAuditUsers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => userSearchInput.parse(input))
  .handler(async ({ data, context }) => {
    const admin = await assertAdminOrManager(context.supabase, context.userId);
    let q = admin.from("profiles").select("id, email, full_name").limit(20);
    if (data.search) {
      const s = data.search.replace(/[%,]/g, "");
      q = q.or(`full_name.ilike.%${s}%,email.ilike.%${s}%`);
    } else {
      q = q.order("full_name", { ascending: true });
    }
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return (rows ?? []).map((r) => ({
      id: r.id,
      email: r.email ?? null,
      full_name: r.full_name ?? null,
    }));
  });
const exportInput = listInput.omit({ page: true, pageSize: true }).extend({
  limit: z.number().int().min(1).max(5000).optional().default(5000),
});

export type AuditExportRow = {
  created_at: string;
  autor: string;
  user_id: string | null;
  table_name: string;
  record_id: string;
  action: string;
  field_changed: string | null;
  old_value: string;
  new_value: string;
};

/**
 * Exporta a trilha aplicando os MESMOS filtros da tela (não só a página atual).
 * A própria exportação é registrada no audit_log.
 */
export const exportAuditLog = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => exportInput.parse(input))
  .handler(async ({ data, context }) => {
    const admin = await assertAdminOrManager(context.supabase, context.userId);

    let q = admin
      .from("audit_log")
      .select(
        "id, created_at, user_id, table_name, record_id, action, field_changed, old_value, new_value",
      );

    if (data.user_id) q = q.eq("user_id", data.user_id);
    if (data.action !== "all") q = q.eq("action", data.action);
    if (data.table_name.trim()) q = q.ilike("table_name", `%${data.table_name.trim()}%`);
    if (data.from) q = q.gte("created_at", data.from);
    if (data.to) q = q.lte("created_at", data.to);
    if (data.search.trim()) {
      const s = data.search.trim().replace(/[%,]/g, "");
      q = q.or(`table_name.ilike.%${s}%,record_id.ilike.%${s}%,field_changed.ilike.%${s}%`);
    }

    const { data: rows, error } = await q
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (error) throw new Error(error.message);

    const userIds = Array.from(
      new Set((rows ?? []).map((r) => r.user_id).filter((v): v is string => !!v)),
    );
    const userMap = new Map<string, string>();
    if (userIds.length > 0) {
      const { data: profs } = await admin
        .from("profiles")
        .select("id, email, full_name")
        .in("id", userIds);
      for (const p of profs ?? []) {
        userMap.set(p.id, p.full_name ?? p.email ?? p.id);
      }
    }

    const out: AuditExportRow[] = (rows ?? []).map((r) => ({
      created_at: r.created_at,
      autor: r.user_id ? (userMap.get(r.user_id) ?? r.user_id) : "Sistema",
      user_id: r.user_id,
      table_name: r.table_name,
      record_id: r.record_id,
      action: r.action as string,
      field_changed: r.field_changed,
      old_value: r.old_value == null ? "" : JSON.stringify(r.old_value),
      new_value: r.new_value == null ? "" : JSON.stringify(r.new_value),
    }));

    // A exportação também é auditada.
    await admin.from("audit_log").insert({
      user_id: context.userId,
      table_name: "audit_log",
      record_id: "export",
      action: "INSERT",
      field_changed: "export_csv",
      new_value: {
        registros: out.length,
        filtros: {
          search: data.search || null,
          user_id: data.user_id,
          action: data.action,
          table_name: data.table_name || null,
          from: data.from,
          to: data.to,
        },
      } as never,
    });

    return { rows: out };
  });
