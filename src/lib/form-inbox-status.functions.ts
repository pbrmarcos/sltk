/**
 * Server fns para marcar formulários (contato/entrevista/rfq) como
 * "pendente" | "lido" e listar o mapa de status.
 */
import { createServerFn } from "@tanstack/react-start";
import { friendlyDbError } from "@/lib/db-errors";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ENTITY = z.enum(["contato", "entrevista", "rfq"]);
const STATUS = z.enum(["pendente", "lido"]);

async function requireAdminOrManager(userId: string) {
  const { getCriticalClient } = await import("@/lib/supabase-client.server");
    const supabaseAdmin = await getCriticalClient();
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .in("role", ["admin", "manager"]);
  if (error) throw friendlyDbError(error);
  if (!data || data.length === 0) throw new Error("Acesso restrito.");
  return supabaseAdmin;
}

export type FormInboxStatusRow = {
  entity_type: "contato" | "entrevista" | "rfq";
  entity_id: string;
  status: "pendente" | "lido";
  updated_at: string;
};

export const listFormInboxStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ entity_type: ENTITY }).parse(i),
  )
  .handler(async ({ data, context }): Promise<FormInboxStatusRow[]> => {
    const admin = (await requireAdminOrManager(context.userId)) as unknown as {
      from: (t: string) => {
        select: (c: string) => { eq: (col: string, val: string) => Promise<{ data: FormInboxStatusRow[] | null; error: { message: string } | null }> };
        upsert: (row: Record<string, unknown>, opts?: { onConflict?: string }) => Promise<{ error: { message: string } | null }>;
      };
    };
    const { data: rows, error } = await admin
      .from("form_inbox_status")
      .select("entity_type, entity_id, status, updated_at")
      .eq("entity_type", data.entity_type);
    if (error) throw friendlyDbError(error);
    return rows ?? [];
  });

export const setFormInboxStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        entity_type: ENTITY,
        entity_id: z.string().uuid(),
        status: STATUS,
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const admin = (await requireAdminOrManager(context.userId)) as unknown as {
      from: (t: string) => {
        upsert: (row: Record<string, unknown>, opts?: { onConflict?: string }) => Promise<{ error: { message: string } | null }>;
      };
    };
    const { error } = await admin.from("form_inbox_status").upsert(
      {
        entity_type: data.entity_type,
        entity_id: data.entity_id,
        status: data.status,
        updated_by: context.userId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "entity_type,entity_id" },
    );
    if (error) throw friendlyDbError(error);
    return { ok: true as const };
  });
