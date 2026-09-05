import { describe, it, expect, vi } from "vitest";
import {
  PERMISSION_RULES,
  validatePermissionMatrix,
  applyBulkSetRolePermissions,
  assertAdmin,
  APP_MODULES,
  type AppModule,
  type AppRoleName,
} from "./permissoes.functions";

/* -------------------------------------------------------------------------- */
/* Mock Supabase client                                                       */
/* -------------------------------------------------------------------------- */

type UpsertCall = { rows: unknown[]; opts: unknown };

function makeSupabase(opts: {
  isAdmin: boolean;
  upsertError?: { message: string } | null;
  selectError?: { message: string } | null;
}) {
  const upsertCalls: UpsertCall[] = [];
  const client = {
    from(table: string) {
      if (table === "user_roles") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: opts.isAdmin ? { role: "admin" } : null,
                  error: opts.selectError ?? null,
                }),
              }),
            }),
          }),
        };
      }
      if (table === "role_module_permissions") {
        return {
          upsert: async (rows: unknown[], o: unknown) => {
            upsertCalls.push({ rows, opts: o });
            return { error: opts.upsertError ?? null };
          },
        };
      }
      throw new Error(`Unexpected table ${table}`);
    },
  };
  return { client, upsertCalls };
}

const allOn = (): Record<AppModule, boolean> => {
  const o = {} as Record<AppModule, boolean>;
  for (const m of APP_MODULES) o[m] = true;
  return o;
};
const allOff = (): Record<AppModule, boolean> => {
  const o = {} as Record<AppModule, boolean>;
  for (const m of APP_MODULES) o[m] = false;
  return o;
};

/* -------------------------------------------------------------------------- */
/* Pure rules                                                                 */
/* -------------------------------------------------------------------------- */

describe("PERMISSION_RULES", () => {
  it("tem ids únicos", () => {
    const ids = PERMISSION_RULES.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("toda violação devolve uma 'suggestion' coerente (alternativa válida mais próxima)", () => {
    const cases: Array<{
      role: AppRoleName;
      modules: Partial<Record<AppModule, boolean>>;
      expectAction: "enable" | "disable";
      expectModule: AppModule;
    }> = [
      {
        role: "sales",
        modules: { processos: true },
        expectAction: "enable",
        expectModule: "dashboard",
      },
      {
        role: "engineer",
        modules: { dashboard: true, qualidade: true },
        expectAction: "enable",
        expectModule: "processos",
      },
      {
        role: "sales",
        modules: { dashboard: true, comercial: true },
        expectAction: "enable",
        expectModule: "clientes",
      },
      {
        role: "sales",
        modules: { dashboard: true, pos_vendas: true },
        expectAction: "enable",
        expectModule: "clientes",
      },
      {
        role: "sales",
        modules: { dashboard: true, admin: true },
        expectAction: "disable",
        expectModule: "admin",
      },
    ];
    for (const c of cases) {
      const v = validatePermissionMatrix(c.role, c.modules);
      expect(v.length, JSON.stringify(c)).toBeGreaterThan(0);
      const hit = v.find((x) => x.suggestion.module === c.expectModule);
      expect(hit, `sem suggestion p/ ${c.expectModule} em ${JSON.stringify(c)}`).toBeDefined();
      expect(hit?.suggestion.action).toBe(c.expectAction);
      expect(hit?.suggestion.label.length ?? 0).toBeGreaterThan(0);
    }
  });

  it("matriz vazia (tudo off) é válida para qualquer role", () => {
    const roles: AppRoleName[] = ["manager", "sales", "engineer", "field"];
    for (const r of roles) {
      expect(validatePermissionMatrix(r, allOff())).toEqual([]);
    }
  });

  it("matriz com módulos ativos sem Dashboard falha", () => {
    const m = { ...allOff(), processos: true, dashboard: false } as Record<AppModule, boolean>;
    const v = validatePermissionMatrix("sales", m);
    expect(v.some((x) => x.ruleId === "dashboard-required")).toBe(true);
  });

  it("Qualidade ativa sem Processos falha e identifica células envolvidas", () => {
    const m = { ...allOff(), dashboard: true, qualidade: true } as Record<AppModule, boolean>;
    const v = validatePermissionMatrix("engineer", m);
    const rule = v.find((x) => x.ruleId === "qualidade-requires-processos");
    expect(rule).toBeDefined();
    expect(rule?.modulesInvolved).toEqual(["qualidade", "processos"]);
    expect(rule?.hint).toMatch(/FAT|revis/i);
  });

  it("Comercial e Pós-venda exigem Clientes", () => {
    const m = { ...allOff(), dashboard: true, comercial: true, pos_vendas: true } as Record<
      AppModule,
      boolean
    >;
    const v = validatePermissionMatrix("sales", m);
    expect(v.some((x) => x.ruleId === "comercial-requires-clientes")).toBe(true);
    expect(v.some((x) => x.ruleId === "pos_vendas-requires-clientes")).toBe(true);
  });

  it("Módulo Administração só é permitido para manager", () => {
    const m = { ...allOff(), dashboard: true, admin: true } as Record<AppModule, boolean>;
    expect(
      validatePermissionMatrix("sales", m).some((x) => x.ruleId === "admin-only-manager"),
    ).toBe(true);
    expect(
      validatePermissionMatrix("manager", m).some((x) => x.ruleId === "admin-only-manager"),
    ).toBe(false);
  });

  it("matriz totalmente válida para manager passa", () => {
    const m = { ...allOn() };
    expect(validatePermissionMatrix("manager", m)).toEqual([]);
  });
});

/* -------------------------------------------------------------------------- */
/* Integração: RLS admin-only + validações server-side                        */
/* -------------------------------------------------------------------------- */

describe("applyBulkSetRolePermissions (integração)", () => {
  it("rejeita quando o usuário não é admin (simula RLS admin-only)", async () => {
    const { client, upsertCalls } = makeSupabase({ isAdmin: false });
    await expect(
      applyBulkSetRolePermissions(client, "user-1", {
        role: "sales",
        modules: { dashboard: true },
      }),
    ).rejects.toThrow(/Acesso restrito a administradores/);
    expect(upsertCalls).toHaveLength(0);
  });

  it("rejeita tentativa de alterar a role 'admin'", async () => {
    const { client, upsertCalls } = makeSupabase({ isAdmin: true });
    await expect(
      applyBulkSetRolePermissions(client, "admin-1", {
        role: "admin",
        modules: { dashboard: false },
      }),
    ).rejects.toThrow(/admin' tem acesso total/);
    expect(upsertCalls).toHaveLength(0);
  });

  it("rejeita combinação inválida e expõe o hint da regra na mensagem", async () => {
    const { client, upsertCalls } = makeSupabase({ isAdmin: true });
    await expect(
      applyBulkSetRolePermissions(client, "admin-1", {
        role: "sales",
        modules: {
          dashboard: true,
          qualidade: true,
          processos: false,
        },
      }),
    ).rejects.toThrow(/Qualidade.*requer.*Processos/);
    expect(upsertCalls).toHaveLength(0);
  });

  it("persiste quando admin e regras passam", async () => {
    const { client, upsertCalls } = makeSupabase({ isAdmin: true });
    const res = await applyBulkSetRolePermissions(client, "admin-1", {
      role: "sales",
      modules: {
        dashboard: true,
        clientes: true,
        comercial: true,
        pos_vendas: true,
        processos: true,
        qualidade: true,
      },
    });
    expect(res.ok).toBe(true);
    expect(upsertCalls).toHaveLength(1);
    expect(upsertCalls[0].opts).toEqual({ onConflict: "role,module" });
    expect(Array.isArray(upsertCalls[0].rows)).toBe(true);
    expect((upsertCalls[0].rows as Array<{ updated_by: string }>)[0].updated_by).toBe("admin-1");
  });

  it("propaga erro do supabase no upsert", async () => {
    const { client } = makeSupabase({
      isAdmin: true,
      upsertError: { message: "boom" },
    });
    await expect(
      applyBulkSetRolePermissions(client, "admin-1", {
        role: "sales",
        modules: { dashboard: true },
      }),
    ).rejects.toThrow("boom");
  });
});

describe("assertAdmin", () => {
  it("não lança quando user tem role admin", async () => {
    const { client } = makeSupabase({ isAdmin: true });
    await expect(assertAdmin(client, "u1")).resolves.toBeUndefined();
  });

  it("propaga erro do supabase", async () => {
    const { client } = makeSupabase({
      isAdmin: false,
      selectError: { message: "db down" },
    });
    await expect(assertAdmin(client, "u1")).rejects.toThrow("db down");
  });

  it("rejeita non-admin antes de qualquer outra operação", async () => {
    const { client } = makeSupabase({ isAdmin: false });
    await expect(assertAdmin(client, "user-x")).rejects.toThrow(
      /Acesso restrito a administradores/,
    );
  });
});

// Evita warning de import não usado quando algumas variantes do mock são removidas
void vi;
