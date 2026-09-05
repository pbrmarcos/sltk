import { createServerFn } from "@tanstack/react-start";
import { friendlyDbError } from "@/lib/db-errors";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const listInput = z
  .object({
    pais: z.string().length(2).optional(),
    success: z.boolean().optional(),
    limit: z.number().int().min(1).max(200).optional(),
  })
  .optional();

export type EnrichLogRow = {
  id: string;
  user_id: string | null;
  user_email: string | null;
  pais: string;
  documento: string;
  provider: string | null;
  success: boolean;
  cached: boolean;
  source: string | null;
  error: string | null;
  created_at: string;
};

export const listEnrichLogs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => listInput.parse(raw) ?? {})
  .handler(async ({ data, context }) => {
    const { getCriticalClient } = await import("@/lib/supabase-client.server");
    const supabaseAdmin = await getCriticalClient();

    // Autoriza apenas admin/manager.
    const { data: roles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    const allowed = (roles ?? []).some((r) => r.role === "admin" || r.role === "manager");
    if (!allowed) throw new Error("Acesso restrito.");

    let q = supabaseAdmin
      .from("enrich_log")
      .select("id, user_id, pais, documento, provider, success, cached, source, error, created_at")
      .order("created_at", { ascending: false })
      .limit(data.limit ?? 100);
    if (data.pais) q = q.eq("pais", data.pais.toUpperCase());
    if (typeof data.success === "boolean") q = q.eq("success", data.success);

    const { data: rows, error } = await q;
    if (error) throw friendlyDbError(error);

    // Resolve e-mail dos usuários em lote.
    const ids = Array.from(
      new Set((rows ?? []).map((r) => r.user_id).filter((v): v is string => !!v)),
    );
    const emailById = new Map<string, string>();
    if (ids.length > 0) {
      const { data: profiles } = await supabaseAdmin
        .from("profiles")
        .select("id, email")
        .in("id", ids);
      for (const p of profiles ?? []) emailById.set(p.id, p.email ?? "");
    }

    return (rows ?? []).map<EnrichLogRow>((r) => ({
      id: r.id,
      user_id: r.user_id,
      user_email: r.user_id ? (emailById.get(r.user_id) ?? null) : null,
      pais: r.pais,
      documento: r.documento,
      provider: r.provider,
      success: r.success,
      cached: r.cached,
      source: r.source,
      error: r.error,
      created_at: r.created_at,
    }));
  });
