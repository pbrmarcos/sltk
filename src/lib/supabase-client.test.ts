import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  getServiceRoleStatus,
  resetServiceRoleCache,
} from "./service-role-health.server";
import {
  getAdminClient,
  getDataClient,
  getCriticalClient,
  withCriticalServiceRole,
  toFriendlyServiceRoleError,
  ServiceRoleUnavailableError,
  SERVICE_ROLE_FALLBACK_MESSAGE,
} from "./supabase-client.server";

/* -------------------------------------------------------------------------- */
/* Ambiente simulado                                                          */
/* -------------------------------------------------------------------------- */

const ENV_KEYS = [
  "SUPABASE_URL",
  "VITE_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
] as const;

let saved: Record<string, string | undefined> = {};

const VALID_JWT = `header.${"p".repeat(80)}.signature`;

/** Client RLS falso, representando a sessão do usuário autenticado. */
function makeRlsClient(tag = "rls") {
  return {
    tag,
    from: (table: string) => ({
      select: async () => ({ data: [{ table, via: tag }], error: null }),
    }),
  };
}

function setEnv(vars: Partial<Record<(typeof ENV_KEYS)[number], string | undefined>>) {
  for (const key of ENV_KEYS) delete process.env[key];
  for (const [k, v] of Object.entries(vars)) {
    if (v !== undefined) process.env[k] = v;
  }
  resetServiceRoleCache();
}

beforeEach(() => {
  saved = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  for (const key of ENV_KEYS) {
    const value = saved[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  resetServiceRoleCache();
  vi.restoreAllMocks();
});

/* -------------------------------------------------------------------------- */
/* Diagnóstico da chave                                                       */
/* -------------------------------------------------------------------------- */

describe("service role health", () => {
  it("detecta chave ausente sem lançar erro", async () => {
    setEnv({ SUPABASE_URL: "https://demo.supabase.co" });
    const status = await getServiceRoleStatus();
    expect(status.ok).toBe(false);
    if (!status.ok) expect(status.reason).toBe("missing");
  });

  it("detecta chave malformada (ex.: publishable key colada por engano)", async () => {
    setEnv({ SUPABASE_URL: "https://demo.supabase.co", SUPABASE_SERVICE_ROLE_KEY: "not-a-key" });
    const status = await getServiceRoleStatus();
    expect(status.ok).toBe(false);
    if (!status.ok) expect(status.reason).toBe("malformed");
  });

  it("detecta chave rejeitada pelo Supabase (401)", async () => {
    setEnv({ SUPABASE_URL: "https://demo.supabase.co", SUPABASE_SERVICE_ROLE_KEY: VALID_JWT });
    vi.stubGlobal("fetch", vi.fn(async () => new Response("", { status: 401 })));
    const status = await getServiceRoleStatus();
    expect(status.ok).toBe(false);
    if (!status.ok) expect(status.reason).toBe("invalid");
  });

  it("aceita chave válida", async () => {
    setEnv({ SUPABASE_URL: "https://demo.supabase.co", SUPABASE_SERVICE_ROLE_KEY: VALID_JWT });
    vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 200 })));
    const status = await getServiceRoleStatus();
    expect(status.ok).toBe(true);
  });

  it("valida privilégio no Auth Admin em vez de aceitar qualquer resposta pública", async () => {
    setEnv({ SUPABASE_URL: "https://demo.supabase.co", SUPABASE_SERVICE_ROLE_KEY: VALID_JWT });
    const fetchMock = vi.fn(async () => new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await getServiceRoleStatus();
    expect(fetchMock).toHaveBeenCalledWith(
      "https://demo.supabase.co/auth/v1/admin/users?page=1&per_page=1",
      expect.any(Object),
    );
  });
});

/* -------------------------------------------------------------------------- */
/* Rotas não críticas continuam funcionando com RLS                           */
/* -------------------------------------------------------------------------- */

describe("ações não críticas com service role ausente/inválida", () => {
  it("getAdminClient retorna null em vez de lançar quando a chave falta", async () => {
    setEnv({ SUPABASE_URL: "https://demo.supabase.co" });
    await expect(getAdminClient()).resolves.toBeNull();
  });

  it("getDataClient cai no client RLS do usuário quando a chave falta", async () => {
    setEnv({ SUPABASE_URL: "https://demo.supabase.co" });
    const rls = makeRlsClient();
    const client = await getDataClient(rls);
    expect(client).toBe(rls);
    const { data } = await client.from("equipamentos").select();
    expect(data?.[0]?.via).toBe("rls");
  });

  it("getDataClient cai no client RLS quando a chave é inválida (401)", async () => {
    setEnv({ SUPABASE_URL: "https://demo.supabase.co", SUPABASE_SERVICE_ROLE_KEY: VALID_JWT });
    vi.stubGlobal("fetch", vi.fn(async () => new Response("", { status: 401 })));
    const rls = makeRlsClient();
    expect(await getDataClient(rls)).toBe(rls);
  });

  it("getDataClient cai no client RLS quando a chave é malformada", async () => {
    setEnv({ SUPABASE_URL: "https://demo.supabase.co", SUPABASE_SERVICE_ROLE_KEY: "sb_publishable_x" });
    const rls = makeRlsClient();
    expect(await getDataClient(rls)).toBe(rls);
  });
});

/* -------------------------------------------------------------------------- */
/* Ações críticas bloqueiam com mensagem segura                               */
/* -------------------------------------------------------------------------- */

describe("ações críticas com service role ausente/inválida", () => {
  it("getCriticalClient lança ServiceRoleUnavailableError (não erro técnico de env)", async () => {
    setEnv({ SUPABASE_URL: "https://demo.supabase.co" });
    await expect(getCriticalClient()).rejects.toBeInstanceOf(ServiceRoleUnavailableError);
    await expect(getCriticalClient()).rejects.not.toThrow(/SUPABASE_SERVICE_ROLE_KEY/);
  });

  it("withCriticalServiceRole devolve mensagem amigável e não executa a ação", async () => {
    setEnv({ SUPABASE_URL: "https://demo.supabase.co" });
    const run = vi.fn();
    const result = await withCriticalServiceRole("criar-usuario", run);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe(SERVICE_ROLE_FALLBACK_MESSAGE);
      expect(result.error).not.toMatch(/SUPABASE_SERVICE_ROLE_KEY/);
      expect(result.reason).toBe("missing");
    }
    expect(run).not.toHaveBeenCalled();
  });

  it("withCriticalServiceRole bloqueia também com chave inválida", async () => {
    setEnv({ SUPABASE_URL: "https://demo.supabase.co", SUPABASE_SERVICE_ROLE_KEY: VALID_JWT });
    vi.stubGlobal("fetch", vi.fn(async () => new Response("", { status: 403 })));
    const result = await withCriticalServiceRole("sync-drive", vi.fn());
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("invalid");
  });

  it("toFriendlyServiceRoleError troca o erro técnico por mensagem segura", () => {
    const technical = new Error(
      "Missing Supabase environment variable(s): SUPABASE_SERVICE_ROLE_KEY. Connect Supabase in Lovable Cloud.",
    );
    expect(toFriendlyServiceRoleError(technical).message).toBe(SERVICE_ROLE_FALLBACK_MESSAGE);
  });

  it("toFriendlyServiceRoleError preserva erros de negócio", () => {
    const business = new Error("Cliente não encontrado");
    expect(toFriendlyServiceRoleError(business).message).toBe("Cliente não encontrado");
  });
});
