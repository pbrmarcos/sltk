import { createServerFn } from "@tanstack/react-start";
import { friendlyDbError } from "@/lib/db-errors";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type AnySb = any;

export const listMinhasNotificacoes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ apenas_nao_lidas: z.boolean().optional().default(false), limit: z.number().int().min(1).max(50).optional().default(20) }).parse(i ?? {}),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase as AnySb;
    let q = sb
      .from("notificacoes_usuario")
      .select("id, origem, origem_id, titulo, mensagem, link, lida_em, created_at")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (data.apenas_nao_lidas) q = q.is("lida_em", null);
    const { data: rows, error } = await q;
    if (error) throw friendlyDbError(error);
    const { count } = await sb
      .from("notificacoes_usuario")
      .select("*", { count: "exact", head: true })
      .eq("user_id", context.userId)
      .is("lida_em", null);
    return { rows: rows ?? [], nao_lidas: count ?? 0 };
  });

export const marcarComoLida = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as AnySb;
    const { error } = await sb
      .from("notificacoes_usuario")
      .update({ lida_em: new Date().toISOString() })
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw friendlyDbError(error);
    return { ok: true };
  });

export const marcarTodasLidas = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as AnySb;
    const { error } = await sb
      .from("notificacoes_usuario")
      .update({ lida_em: new Date().toISOString() })
      .eq("user_id", context.userId)
      .is("lida_em", null);
    if (error) throw friendlyDbError(error);
    return { ok: true };
  });
