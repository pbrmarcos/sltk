/**
 * Guards server-side de acesso ao painel administrativo.
 *
 * Regras centrais:
 * - `assertActiveUser`: garante que o usuário não está desabilitado nem soft-deleted.
 *   Deve ser chamado no início de qualquer server function autenticada sensível.
 * - `assertAdmin` / `assertAdminOrManager` / `assertEngineerOrHigher`:
 *   verificação de role.
 * - `assertCanActOn`: aplica a hierarquia de roles impedindo escalação de
 *   privilégio via balcão de suporte / gestão de usuários.
 *
 * Todas as funções lançam `Error` com mensagem em pt-BR quando negam acesso.
 * Nunca confie apenas na UI — chamar aqui é obrigatório em toda operação
 * sensível.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

type Client = SupabaseClient<Database>;

export type AppRoleName =
  | "admin"
  | "manager"
  | "engineer"
  | "production"
  | "purchasing"
  | "assembly"
  | "field"
  | "sales";

export const ROLE_RANK: Record<AppRoleName, number> = {
  admin: 400,
  manager: 300,
  engineer: 200,
  production: 100,
  purchasing: 100,
  assembly: 100,
  field: 100,
  sales: 100,
};

export class AdminGuardError extends Error {
  status: number;
  code: string;
  constructor(code: string, message: string, status = 403) {
    super(message);
    this.name = "AdminGuardError";
    this.code = code;
    this.status = status;
  }
}

/** Retorna todas as roles do usuário. */
export async function getUserRoles(supabase: Client, userId: string): Promise<AppRoleName[]> {
  const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => r.role as AppRoleName);
}

/** Maior rank entre as roles do usuário (0 se nenhuma). */
export async function getMaxRoleRank(supabase: Client, userId: string): Promise<number> {
  const roles = await getUserRoles(supabase, userId);
  return roles.reduce((max, r) => Math.max(max, ROLE_RANK[r] ?? 0), 0);
}

/**
 * Rejeita usuários desabilitados/soft-deleted. Fecha a janela em que um JWT
 * ainda válido continuaria operando após um disable.
 */
export async function assertActiveUser(supabase: Client, userId: string): Promise<void> {
  // RPC recém-criada; types.ts é regenerado automaticamente pela integração.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.rpc as any)("is_user_active", {
    _user_id: userId,
  });
  if (error) throw new Error(error.message);
  if (!data) {
    throw new AdminGuardError(
      "user_disabled",
      "Sua conta foi desativada. Contate um administrador.",
      401,
    );
  }
}

export async function hasRole(
  supabase: Client,
  userId: string,
  role: AppRoleName,
): Promise<boolean> {
  const { data, error } = await supabase.rpc("has_role", {
    _user_id: userId,
    _role: role,
  });
  if (error) throw new Error(error.message);
  return Boolean(data);
}

export async function hasAnyRole(
  supabase: Client,
  userId: string,
  roles: AppRoleName[],
): Promise<boolean> {
  const userRoles = await getUserRoles(supabase, userId);
  const set = new Set(userRoles);
  return roles.some((r) => set.has(r));
}

export async function assertAdmin(supabase: Client, userId: string): Promise<void> {
  if (!(await hasRole(supabase, userId, "admin"))) {
    throw new AdminGuardError("not_admin", "Acesso restrito a administradores.");
  }
}

export async function assertAdminOrManager(supabase: Client, userId: string): Promise<void> {
  if (!(await hasAnyRole(supabase, userId, ["admin", "manager"]))) {
    throw new AdminGuardError("not_admin_or_manager", "Acesso restrito a administração / gestão.");
  }
}

export async function assertEngineerOrHigher(supabase: Client, userId: string): Promise<void> {
  if (!(await hasAnyRole(supabase, userId, ["admin", "manager", "engineer"]))) {
    throw new AdminGuardError(
      "not_admin_manager_engineer",
      "Acesso restrito ao painel administrativo.",
    );
  }
}

/**
 * Espelha a RPC `can_access_module` usada pelas policies de RLS de vários
 * módulos (ex.: Qualidade, Fornecedores) — consulta a matriz dinâmica
 * `role_module_permissions` (configurável em Usuários & Permissões), não uma
 * lista fixa de papéis. Sempre prefira isto a uma lista de papéis hardcoded
 * quando o módulo já usa essa RPC na RLS, para não divergir do que o banco
 * realmente permite.
 */
export async function canAccessModule(
  supabase: Client,
  userId: string,
  module: string,
): Promise<boolean> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.rpc as any)("can_access_module", {
    _user: userId,
    _module: module,
  });
  if (error) throw new Error(error.message);
  return Boolean(data);
}

export async function assertCanAccessModule(
  supabase: Client,
  userId: string,
  module: string,
  message = "Acesso restrito a este módulo.",
): Promise<void> {
  if (!(await canAccessModule(supabase, userId, module))) {
    throw new AdminGuardError("module_not_allowed", message);
  }
}

/** Número de admins ativos (via RPC SECURITY DEFINER). */
export async function countActiveAdmins(supabase: Client): Promise<number> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.rpc as any)("count_active_admins");
  if (error) throw new Error(error.message);
  return Number(data ?? 0);
}

export type SensitiveAction =
  | "password_reset"
  | "invite_resend"
  | "role_change"
  | "disable"
  | "delete"
  | "reprocess_job";

/**
 * Aplica a hierarquia de roles ao operar sobre outro usuário.
 *
 * Regras:
 * - Um ator só pode agir sobre alvos com rank estritamente inferior ao seu.
 * - Ações sobre admin exigem que o ator seja admin.
 * - Ações de disable / delete / rebaixamento do último admin são bloqueadas
 *   (verificação de `count_active_admins`).
 * - Ninguém pode agir sobre si mesmo através desta API (use fluxos de conta).
 *
 * NÃO substitui o `assertAdmin/Manager/Engineer` da rota — aquele valida o
 * acesso à tela; este valida o alvo específico.
 */
export async function assertCanActOn(
  supabase: Client,
  actorId: string,
  targetId: string,
  action: SensitiveAction,
): Promise<void> {
  if (actorId === targetId) {
    throw new AdminGuardError(
      "self_action_forbidden",
      "Você não pode executar essa ação sobre a própria conta por aqui.",
    );
  }

  const [actorRank, targetRank, actorIsAdmin] = await Promise.all([
    getMaxRoleRank(supabase, actorId),
    getMaxRoleRank(supabase, targetId),
    hasRole(supabase, actorId, "admin"),
  ]);

  // Ator deve ter mais poder que o alvo.
  if (actorRank <= targetRank) {
    throw new AdminGuardError(
      "target_rank_too_high",
      "Você não tem permissão para agir sobre um usuário com nível igual ou superior ao seu.",
    );
  }

  // Só admin pode agir sobre admin (ainda que o rank permita — proteção extra).
  const targetIsAdmin = targetRank >= ROLE_RANK.admin;
  if (targetIsAdmin && !actorIsAdmin) {
    throw new AdminGuardError(
      "admin_target_requires_admin",
      "Apenas administradores podem executar ações sobre outros administradores.",
    );
  }

  // Proteção do último admin em ações que removem privilégios.
  if (targetIsAdmin && (action === "role_change" || action === "disable" || action === "delete")) {
    const active = await countActiveAdmins(supabase);
    if (active <= 1) {
      throw new AdminGuardError(
        "last_admin",
        "Operação bloqueada: este é o único administrador ativo do sistema.",
      );
    }
  }
}
