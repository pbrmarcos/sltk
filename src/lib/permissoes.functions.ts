import { createServerFn } from "@tanstack/react-start";
import { friendlyDbError } from "@/lib/db-errors";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const APP_MODULES = [
  "dashboard",
  "processos",
  "clientes",
  "comercial",
  "engenharia",
  "producao",
  "qualidade",
  "logistica",
  "pos_vendas",
  "know_how",
  "fornecedores",
  "compras",
  "admin",
  "changelog",
] as const;
export type AppModule = (typeof APP_MODULES)[number];

export const MODULE_LABEL: Record<AppModule, string> = {
  dashboard: "Dashboard",
  processos: "Processos / Pipeline",
  clientes: "Clientes",
  comercial: "Comercial (Orçamentos, OC)",
  engenharia: "Engenharia (ETP, Gantt, Projetos)",
  producao: "Produção & Montagem",
  qualidade: "Qualidade (Revisões, FAT)",
  logistica: "Logística & Embarque",
  pos_vendas: "Pós-venda (Chamados, NPS)",
  know_how: "Know-how & Treinamentos",
  fornecedores: "Fornecedores (Cadastro)",
  compras: "Compras (Checklist, OC)",
  admin: "Administração",
  changelog: "Changelog & Ajuda",
};

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
export type AppRoleName = (typeof ROLES)[number];

export type RoleModulePermissionRow = {
  role: AppRoleName;
  module: AppModule;
  enabled: boolean;
};

export const listRoleModulePermissions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // Defesa em profundidade: além das policies do banco, o servidor exige admin.
    await assertAdmin(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("role_module_permissions")
      .select("role, module, enabled");
    if (error) throw friendlyDbError(error);
    return (data ?? []) as RoleModulePermissionRow[];
  });

export const getMyModules = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: roleRows, error: rErr } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    if (rErr) throw friendlyDbError(rErr);
    const roles = (roleRows ?? []).map((r) => r.role as AppRoleName);
    if (roles.includes("admin")) return APP_MODULES as readonly AppModule[];
    if (roles.length === 0) return [] as AppModule[];
    const { data, error } = await supabase
      .from("role_module_permissions")
      .select("module, enabled, role")
      .in("role", roles)
      .eq("enabled", true);
    if (error) throw friendlyDbError(error);
    const set = new Set<AppModule>();
    for (const r of data ?? []) set.add(r.module as AppModule);
    return Array.from(set);
  });

const bulkSchema = z.object({
  role: z.enum(ROLES),
  modules: z.record(z.enum(APP_MODULES), z.boolean()),
});

/**
 * Regras centralizadas de combinação de módulos.
 * Cada regra explica seu motivo e indica quais módulos estão envolvidos,
 * para que a UI possa destacar a célula específica e oferecer auto-fix.
 */
export type RuleViolation = {
  ruleId: string;
  role: AppRoleName;
  modulesInvolved: AppModule[];
  message: string;
  hint: string;
  /**
   * Sugestão mínima de correção ("alternativa válida mais próxima").
   * A UI usa para mostrar e/ou aplicar a correção com um clique.
   */
  suggestion: {
    action: "enable" | "disable";
    module: AppModule;
    label: string;
  };
};

export type PermissionRule = {
  id: string;
  description: string;
  check: (
    role: AppRoleName,
    modules: Partial<Record<AppModule, boolean>>,
  ) => Omit<RuleViolation, "ruleId" | "role"> | null;
};

function requires(trigger: AppModule, dep: AppModule, motivo: string) {
  return (_role: AppRoleName, m: Partial<Record<AppModule, boolean>>) => {
    if (m[trigger] && !m[dep]) {
      return {
        modulesInvolved: [trigger, dep],
        message: `'${MODULE_LABEL[trigger]}' requer '${MODULE_LABEL[dep]}' habilitado.`,
        hint: motivo,
        suggestion: {
          action: "enable" as const,
          module: dep,
          label: `Habilitar '${MODULE_LABEL[dep]}'`,
        },
      };
    }
    return null;
  };
}

export const PERMISSION_RULES: PermissionRule[] = [
  {
    id: "dashboard-required",
    description: "Qualquer módulo ativo exige Dashboard habilitado.",
    check: (_role, m) => {
      const others = Object.entries(m).filter(([k, v]) => v && k !== "dashboard");
      if (others.length > 0 && !m.dashboard) {
        return {
          modulesInvolved: ["dashboard"],
          message: "Habilite 'Dashboard' — o usuário precisa de uma página inicial.",
          hint: "Sem Dashboard a sidebar fica sem ponto de entrada e o usuário cai em tela em branco.",
          suggestion: {
            action: "enable" as const,
            module: "dashboard",
            label: "Habilitar 'Dashboard'",
          },
        };
      }
      return null;
    },
  },
  {
    id: "admin-only-manager",
    description: "Módulo Administração só pode ser habilitado para manager.",
    check: (role, m) => {
      if (m.admin && role !== "manager") {
        return {
          modulesInvolved: ["admin"],
          message: `Módulo 'Administração' não pode ser habilitado para a role '${role}'.`,
          hint: "A role admin já tem acesso total. Para delegar parcialmente, use manager.",
          suggestion: {
            action: "disable" as const,
            module: "admin",
            label: "Desabilitar 'Administração' para esta role",
          },
        };
      }
      return null;
    },
  },
  {
    id: "qualidade-requires-processos",
    description: "Qualidade depende de Processos.",
    check: requires(
      "qualidade",
      "processos",
      "FAT e revisões mecânica/elétrica pertencem sempre a um processo. Sem acesso a Processos o usuário não consegue abrir uma revisão.",
    ),
  },
  {
    id: "pos_vendas-requires-clientes",
    description: "Pós-venda depende de Clientes.",
    check: requires(
      "pos_vendas",
      "clientes",
      "Chamados, base instalada e NPS são sempre escopados por cliente.",
    ),
  },
  {
    id: "comercial-requires-clientes",
    description: "Comercial depende de Clientes.",
    check: requires(
      "comercial",
      "clientes",
      "Orçamentos e ordens de compra só fazem sentido a partir de um cliente cadastrado.",
    ),
  },
];

export function validatePermissionMatrix(
  role: AppRoleName,
  modules: Partial<Record<AppModule, boolean>>,
): RuleViolation[] {
  const out: RuleViolation[] = [];
  for (const rule of PERMISSION_RULES) {
    const res = rule.check(role, modules);
    if (res) out.push({ ruleId: rule.id, role, ...res });
  }
  return out;
}

/**
 * Exportado para permitir testes de integração com client mockado.
 * Lança "Acesso restrito a administradores." se o usuário não tiver role admin.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function assertAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) throw friendlyDbError(error);
  if (!data) throw new Error("Acesso restrito a administradores.");
}

/**
 * Núcleo testável de `bulkSetRolePermissions`. Não depende de TanStack Start.
 */
export async function applyBulkSetRolePermissions(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  userId: string,
  data: { role: AppRoleName; modules: Partial<Record<AppModule, boolean>> },
) {
  await assertAdmin(supabase, userId);
  if (data.role === "admin") {
    throw new Error("A role 'admin' tem acesso total e não pode ser alterada.");
  }
  const violations = validatePermissionMatrix(data.role, data.modules);
  if (violations.length > 0) {
    const detail = violations.map((v) => `${v.message} (${v.hint})`).join(" | ");
    throw new Error(`Combinação inválida para '${data.role}': ${detail}`);
  }
  const rows = Object.entries(data.modules).map(([module, enabled]) => ({
    role: data.role,
    module: module as AppModule,
    enabled: enabled as boolean,
    updated_by: userId,
    updated_at: new Date().toISOString(),
  }));
  const { error } = await supabase
    .from("role_module_permissions")
    .upsert(rows, { onConflict: "role,module" });
  if (error) throw friendlyDbError(error);
  return { ok: true, count: rows.length };
}

export const bulkSetRolePermissions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => bulkSchema.parse(d))
  .handler(async ({ data, context }) => {
    return applyBulkSetRolePermissions(context.supabase, context.userId, data);
  });

export type PermissoesAuditEntry = {
  id: string;
  created_at: string;
  user_id: string | null;
  user_email: string | null;
  user_name: string | null;
  action: "INSERT" | "UPDATE" | "DELETE";
  role: AppRoleName | null;
  module: AppModule | null;
  old_enabled: boolean | null;
  new_enabled: boolean | null;
};

export const listPermissoesAuditLog = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("audit_log")
      .select("id, created_at, user_id, action, field_changed, old_value, new_value, record_id")
      .eq("table_name", "role_module_permissions")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw friendlyDbError(error);
    const rows = (data ?? []) as Array<{
      id: string;
      created_at: string;
      user_id: string | null;
      action: "INSERT" | "UPDATE" | "DELETE";
      field_changed: string | null;
      old_value: unknown;
      new_value: unknown;
      record_id: string | null;
    }>;
    // Resolve user names
    const userIds = Array.from(new Set(rows.map((r) => r.user_id).filter(Boolean) as string[]));
    const profileMap = new Map<string, { email: string | null; full_name: string | null }>();
    if (userIds.length > 0) {
      const { data: profs } = await context.supabase
        .from("profiles")
        .select("id, email, full_name")
        .in("id", userIds);
      for (const p of profs ?? []) {
        profileMap.set(p.id as string, {
          email: (p.email as string | null) ?? null,
          full_name: (p.full_name as string | null) ?? null,
        });
      }
    }
    const entries: PermissoesAuditEntry[] = rows.map((r) => {
      // For INSERT/DELETE, role+module live in new_value/old_value as full row JSON
      // For UPDATE on field 'enabled', old_value/new_value are booleans; role+module must come from the row id lookup.
      const newObj =
        r.new_value && typeof r.new_value === "object" && !Array.isArray(r.new_value)
          ? (r.new_value as Record<string, unknown>)
          : null;
      const oldObj =
        r.old_value && typeof r.old_value === "object" && !Array.isArray(r.old_value)
          ? (r.old_value as Record<string, unknown>)
          : null;
      let role: AppRoleName | null = null;
      let module: AppModule | null = null;
      let oldEnabled: boolean | null = null;
      let newEnabled: boolean | null = null;
      if (r.action === "INSERT" && newObj) {
        role = (newObj.role as AppRoleName) ?? null;
        module = (newObj.module as AppModule) ?? null;
        newEnabled = (newObj.enabled as boolean) ?? null;
      } else if (r.action === "DELETE" && oldObj) {
        role = (oldObj.role as AppRoleName) ?? null;
        module = (oldObj.module as AppModule) ?? null;
        oldEnabled = (oldObj.enabled as boolean) ?? null;
      } else if (r.action === "UPDATE" && r.field_changed === "enabled") {
        oldEnabled = typeof r.old_value === "boolean" ? r.old_value : null;
        newEnabled = typeof r.new_value === "boolean" ? r.new_value : null;
      }
      const prof = r.user_id ? profileMap.get(r.user_id) : null;
      return {
        id: r.id,
        created_at: r.created_at,
        user_id: r.user_id,
        user_email: prof?.email ?? null,
        user_name: prof?.full_name ?? null,
        action: r.action,
        role,
        module,
        old_enabled: oldEnabled,
        new_enabled: newEnabled,
      };
    });
    // Resolve role/module for UPDATE rows by looking up record_id
    const updateIds = entries
      .filter((e) => e.role === null && e.module === null)
      .map((e, i) => ({ e, recordId: rows[i].record_id }))
      .filter((x) => x.recordId);
    if (updateIds.length > 0) {
      const ids = Array.from(new Set(updateIds.map((x) => x.recordId as string)));
      const { data: rmps } = await context.supabase
        .from("role_module_permissions")
        .select("id, role, module")
        .in("id", ids);
      const map = new Map<string, { role: AppRoleName; module: AppModule }>();
      for (const r of rmps ?? []) {
        map.set(r.id as string, {
          role: r.role as AppRoleName,
          module: r.module as AppModule,
        });
      }
      for (const { e, recordId } of updateIds) {
        const hit = map.get(recordId as string);
        if (hit) {
          e.role = hit.role;
          e.module = hit.module;
        }
      }
    }
    return entries;
  });
