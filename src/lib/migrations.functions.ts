import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Carrega todos os .sql em supabase/pending-migrations/ como texto no bundle do server.
const migrationsGlob = import.meta.glob("/supabase/pending-migrations/*.sql", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

function migrationsFromDisk() {
  return Object.entries(migrationsGlob)
    .map(([path, sql]) => {
      const name = path.split("/").pop()!;
      return { name, path, sql };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

async function assertAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Acesso restrito: apenas administradores.");
}

async function runSql(sql: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const token = process.env.SB_MANAGEMENT_ACCESS_TOKEN;
  const projectRef = process.env.VITE_SUPABASE_PROJECT_ID || process.env.SUPABASE_PROJECT_ID;
  if (!token) return { ok: false, error: "Acesso administrativo ao provedor do banco não configurado neste ambiente." };
  if (!projectRef) return { ok: false, error: "Project ref do Supabase não encontrado." };

  const res = await fetch(
    `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: sql }),
    },
  );
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return { ok: false, error: `HTTP ${res.status}: ${text.slice(0, 800)}` };
  }
  return { ok: true };
}

async function ensureTrackingTable() {
  const result = await runSql(`
    CREATE TABLE IF NOT EXISTS public._migrations_applied (
      filename text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    );
    GRANT ALL ON public._migrations_applied TO service_role;
    ALTER TABLE public._migrations_applied ENABLE ROW LEVEL SECURITY;
  `);
  if (!result.ok) throw new Error(result.error);
}

export const listarMigrations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const files = migrationsFromDisk();
    await ensureTrackingTable();
    const { getCriticalClient } = await import("@/lib/supabase-client.server");
    const supabaseAdmin = await getCriticalClient();
    const { data, error } = await (supabaseAdmin as unknown as {
      from: (t: string) => { select: (c: string) => Promise<{ data: Array<{ filename: string; applied_at: string }> | null; error: { code?: string; message: string } | null }> };
    })
      .from("_migrations_applied")
      .select("filename, applied_at");
    if (error && error.code !== "42P01") {
      throw new Error(error.message);
    }
    const appliedMap = new Map<string, string>();
    for (const row of data ?? []) appliedMap.set(row.filename, row.applied_at);
    return files.map((f) => ({
      name: f.name,
      sql: f.sql,
      applied_at: appliedMap.get(f.name) ?? null,
    }));
  });

export const aplicarMigration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { name: string }) => z.object({ name: z.string().min(1) }).parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const file = migrationsFromDisk().find((f) => f.name === data.name);
    if (!file) throw new Error(`Migration não encontrada: ${data.name}`);

    await ensureTrackingTable();

    // Verifica se já foi aplicada (via service-role para contornar RLS)
    const { getCriticalClient } = await import("@/lib/supabase-client.server");
    const supabaseAdmin = await getCriticalClient();
    const { data: existing } = await (supabaseAdmin as unknown as {
      from: (t: string) => {
        select: (c: string) => {
          eq: (c: string, v: string) => { maybeSingle: () => Promise<{ data: { filename: string } | null }> };
        };
      };
    })
      .from("_migrations_applied")
      .select("filename")
      .eq("filename", data.name)
      .maybeSingle();
    if (existing) {
      return { ok: false as const, error: "Migration já aplicada." };
    }

    const result = await runSql(file.sql);
    if (!result.ok) return result;

    await runSql(
      `INSERT INTO public._migrations_applied(filename) VALUES (${sqlLiteral(file.name)}) ON CONFLICT DO NOTHING;`,
    );
    return { ok: true as const };
  });

function sqlLiteral(v: string) {
  return `'${v.replace(/'/g, "''")}'`;
}
