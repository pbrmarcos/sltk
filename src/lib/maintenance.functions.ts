// Modo manutenção: leitura pública do estado (a página renderiza antes do
// login) e escrita restrita a admin. Os checks de módulo (estilo status page)
// rodam no servidor com timeout curto — nunca derrubam a resposta.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAdmin } from "@/lib/admin-guard";
import { logAuditServer } from "@/lib/audit.server";
import { getSupabasePublicConfig } from "@/integrations/supabase/config";

export type MaintenanceConfig = {
  enabled: boolean;
  message: string | null;
  ends_at: string | null;
  updated_at: string | null;
};

export type ModuleStatus = {
  key: string;
  label: string;
  ok: boolean;
  latency_ms: number | null;
  detail?: string;
};

async function readConfig(): Promise<MaintenanceConfig> {
  const { getCriticalClient } = await import("@/lib/supabase-client.server");
  const admin = await getCriticalClient();
  const { data, error } = await (
    admin as unknown as {
      from: (t: string) => {
        select: (c: string) => {
          eq: (
            c: string,
            v: number,
          ) => {
            maybeSingle: () => Promise<{
              data: MaintenanceConfig | null;
              error: { message: string } | null;
            }>;
          };
        };
      };
    }
  )
    .from("maintenance_config")
    .select("enabled, message, ends_at, updated_at")
    .eq("id", 1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ?? { enabled: false, message: null, ends_at: null, updated_at: null };
}

async function timedCheck(
  key: string,
  label: string,
  fn: () => Promise<{ ok: boolean; detail?: string }>,
): Promise<ModuleStatus> {
  const start = Date.now();
  try {
    const result = await Promise.race([
      fn(),
      new Promise<{ ok: boolean; detail?: string }>((resolve) =>
        setTimeout(() => resolve({ ok: false, detail: "timeout" }), 4000),
      ),
    ]);
    return { key, label, ok: result.ok, latency_ms: Date.now() - start, detail: result.detail };
  } catch (e) {
    return {
      key,
      label,
      ok: false,
      latency_ms: Date.now() - start,
      detail: e instanceof Error ? e.message.slice(0, 120) : "erro",
    };
  }
}

async function checkModules(): Promise<ModuleStatus[]> {
  const { url } = getSupabasePublicConfig();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

  return Promise.all([
    timedCheck("app", "Aplicação", async () => ({ ok: true })),
    timedCheck("db", "Banco de dados", async () => {
      const { getCriticalClient } = await import("@/lib/supabase-client.server");
      const admin = await getCriticalClient();
      const { error } = await (
        admin as unknown as {
          from: (t: string) => {
            select: (c: string) => { limit: (n: number) => Promise<{ error: unknown }> };
          };
        }
      )
        .from("maintenance_config")
        .select("id")
        .limit(1);
      return { ok: !error };
    }),
    timedCheck("auth", "Autenticação", async () => {
      const anonKey = getSupabasePublicConfig().publishableKey;
      const res = await fetch(`${url}/auth/v1/health`, {
        headers: { apikey: anonKey },
        signal: AbortSignal.timeout(3500),
      });
      return { ok: res.ok };
    }),
    timedCheck("storage", "Arquivos (Storage)", async () => {
      const res = await fetch(`${url}/storage/v1/bucket`, {
        headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
        signal: AbortSignal.timeout(3500),
      });
      return { ok: res.ok };
    }),
    timedCheck("realtime", "API de dados", async () => {
      const anonKey = getSupabasePublicConfig().publishableKey;
      const res = await fetch(`${url}/rest/v1/maintenance_config?select=id&limit=1`, {
        headers: { apikey: anonKey },
        signal: AbortSignal.timeout(3500),
      });
      return { ok: res.ok };
    }),
  ]);
}

/** Leitura leve pro gate — só a configuração, sem pings. Pública. */
export const getMaintenanceGate = createServerFn({ method: "GET" }).handler(async () => {
  try {
    return await readConfig();
  } catch {
    // Nunca derruba o site por falha na leitura do flag.
    return { enabled: false, message: null, ends_at: null, updated_at: null };
  }
});

/** Estado completo pra página de manutenção e painel admin. Pública. */
export const getMaintenanceStatus = createServerFn({ method: "GET" }).handler(async () => {
  const [config, modules] = await Promise.all([
    getMaintenanceGate(),
    checkModules().catch(() => [] as ModuleStatus[]),
  ]);
  return { ...config, modules, checked_at: new Date().toISOString() };
});

const setSchema = z.object({
  enabled: z.boolean(),
  message: z.string().trim().max(500).nullable().optional(),
  ends_at: z.string().datetime({ offset: true }).nullable().optional(),
});

export const setMaintenanceConfig = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: z.infer<typeof setSchema>) => setSchema.parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { getCriticalClient } = await import("@/lib/supabase-client.server");
    const admin = await getCriticalClient();
    const patch = {
      enabled: data.enabled,
      message: data.message ?? null,
      ends_at: data.ends_at ?? null,
      updated_at: new Date().toISOString(),
      updated_by: context.userId,
    };
    const { error } = await (
      admin as unknown as {
        from: (t: string) => {
          update: (p: object) => {
            eq: (c: string, v: number) => Promise<{ error: { message: string } | null }>;
          };
        };
      }
    )
      .from("maintenance_config")
      .update(patch)
      .eq("id", 1);
    if (error) throw new Error(error.message);

    await logAuditServer(admin, context.userId, {
      table_name: "maintenance_config",
      record_id: "1",
      action: "UPDATE",
      field_changed: "enabled",
      new_value: patch,
    });
    return { ok: true as const };
  });
