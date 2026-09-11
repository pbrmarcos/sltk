import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { logAuditServer } from "@/lib/audit.server";
import { assertAdmin } from "@/lib/admin-guard";

// Ordem filho -> pai: garante que nada é apagado antes de quem depende dele.
const DELETE_ORDER = [
  "montagem_etapa_evidencias",
  "montagem_etapa_checklist_resposta",
  "equipamento_montagem_etapas",
  "equipamento_montagens",
  "checklist_submissao",
  "checklist_formulario_link",
  "logistica_embarques",
  "chamados",
  "sat_relatorio",
  "fat_relatorios",
  "equipamento_revisoes",
  "equipamento_projetos",
  "equipamento_etps",
  "cliente_equipamentos",
  "processos",
  "oportunidades",
  "cliente_contatos",
  "clientes",
];

export const getDemoSeedSummary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { getCriticalClient } = await import("@/lib/supabase-client.server");
    const supabaseAdmin = await getCriticalClient();
    const { data, error } = await (
      supabaseAdmin as unknown as {
        from: (t: string) => {
          select: (c: string) => Promise<{
            data: Array<{ table_name: string }> | null;
            error: { message: string } | null;
          }>;
        };
      }
    )
      .from("demo_seed_registry")
      .select("table_name");
    if (error) throw new Error(error.message);

    const counts = new Map<string, number>();
    for (const row of data ?? []) {
      counts.set(row.table_name, (counts.get(row.table_name) ?? 0) + 1);
    }
    const byTable = [...counts.entries()]
      .map(([table_name, count]) => ({ table_name, count }))
      .sort((a, b) => b.count - a.count);
    const total = byTable.reduce((sum, t) => sum + t.count, 0);
    return { total, byTable };
  });

export const deleteDemoSeedContent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { getCriticalClient } = await import("@/lib/supabase-client.server");
    const supabaseAdmin = await getCriticalClient();

    type Row = { table_name: string; record_id: string };
    const { data: rows, error: readErr } = await (
      supabaseAdmin as unknown as {
        from: (t: string) => {
          select: (c: string) => Promise<{ data: Row[] | null; error: { message: string } | null }>;
        };
      }
    )
      .from("demo_seed_registry")
      .select("table_name, record_id");
    if (readErr) throw new Error(readErr.message);
    if (!rows || rows.length === 0) return { ok: true as const, deleted: 0 };

    const byTable = new Map<string, string[]>();
    for (const r of rows) {
      if (!byTable.has(r.table_name)) byTable.set(r.table_name, []);
      byTable.get(r.table_name)!.push(r.record_id);
    }

    const client = supabaseAdmin as unknown as {
      from: (t: string) => {
        select: (c: string) => {
          in: (
            c: string,
            v: string[],
          ) => Promise<{ data: Array<{ id: string; storage_path: string | null }> | null }>;
        };
        delete: () => {
          in: (c: string, v: string[]) => Promise<{ error: { message: string } | null }>;
        };
      };
      storage: { from: (bucket: string) => { remove: (paths: string[]) => Promise<unknown> } };
    };

    if (byTable.has("montagem_etapa_evidencias")) {
      const ids = byTable.get("montagem_etapa_evidencias")!;
      const { data: evid } = await client
        .from("montagem_etapa_evidencias")
        .select("id, storage_path")
        .in("id", ids);
      const paths = (evid ?? []).map((e) => e.storage_path).filter((p): p is string => !!p);
      if (paths.length > 0) {
        await client.storage.from("montagem-evidencias").remove(paths);
      }
    }

    const tables = [
      ...DELETE_ORDER.filter((t) => byTable.has(t)),
      ...[...byTable.keys()].filter((t) => !DELETE_ORDER.includes(t)),
    ];

    let deleted = 0;
    for (const table of tables) {
      const ids = byTable.get(table)!;
      const { error: delErr } = await client.from(table).delete().in("id", ids);
      if (delErr) throw new Error(`Falha ao excluir ${table}: ${delErr.message}`);
      deleted += ids.length;
    }

    const { error: clearErr } = await (
      supabaseAdmin as unknown as {
        from: (t: string) => {
          delete: () => {
            neq: (c: string, v: string) => Promise<{ error: { message: string } | null }>;
          };
        };
      }
    )
      .from("demo_seed_registry")
      .delete()
      .neq("table_name", "");
    if (clearErr) throw new Error(clearErr.message);

    await logAuditServer(supabaseAdmin, context.userId, {
      table_name: "demo_seed_registry",
      record_id: "bulk-delete",
      action: "DELETE",
      field_changed: "demo_content",
      new_value: { deleted, tables },
    });

    return { ok: true as const, deleted };
  });
