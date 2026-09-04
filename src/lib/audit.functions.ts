import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

type AuditInsert = Database["public"]["Tables"]["audit_log"]["Insert"];

const entrySchema = z.object({
  table_name: z.string().min(1).max(63),
  record_id: z.string().min(1).max(255),
  action: z.enum(["INSERT", "UPDATE", "DELETE"]),
  field_changed: z.string().max(63).nullish(),
  old_value: z.unknown().nullish(),
  new_value: z.unknown().nullish(),
});

const inputSchema = z.object({
  entries: z.array(entrySchema).min(1).max(50),
});

export const logAuditFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => inputSchema.parse(input))
  .handler(async ({ data, context }) => {
    try {
      const { getCriticalClient } = await import("@/lib/supabase-client.server");
    const supabaseAdmin = await getCriticalClient();
      const rows: AuditInsert[] = data.entries.map((e) => ({
        user_id: context.userId,
        table_name: e.table_name,
        record_id: e.record_id,
        action: e.action,
        field_changed: e.field_changed ?? null,
        old_value: (e.old_value ?? null) as AuditInsert["old_value"],
        new_value: (e.new_value ?? null) as AuditInsert["new_value"],
      }));
      const { error } = await supabaseAdmin.from("audit_log").insert(rows);
      if (error) {
        console.error("[audit] insert failed", error);
        return { ok: false as const };
      }
      return { ok: true as const };
    } catch (err) {
      console.error("[audit] unexpected failure", err);
      return { ok: false as const };
    }
  });