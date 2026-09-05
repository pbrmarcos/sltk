import { createServerFn } from "@tanstack/react-start";
import { assertCanAccessModule } from "@/lib/admin-guard";
import { friendlyDbError } from "@/lib/db-errors";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type OportunidadeNota = {
  id: string;
  oportunidade_id: string;
  texto: string;
  user_id: string | null;
  user_nome: string | null;
  created_at: string;
  updated_at: string;
};

export const listOportunidadeNotas = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ oportunidade_id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }): Promise<OportunidadeNota[]> => {
    const { data: rows, error } = await context.supabase
      .from("oportunidade_notas" as never)
      .select("id, oportunidade_id, texto, user_id, user_nome, created_at, updated_at")
      .eq("oportunidade_id", data.oportunidade_id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    if (error) throw friendlyDbError(error);
    return (rows ?? []) as never;
  });

export const addOportunidadeNota = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({
      oportunidade_id: z.string().uuid(),
      texto: z.string().trim().min(1).max(4000),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertCanAccessModule(context.supabase, context.userId, "comercial");
    const { data: profile } = await context.supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", context.userId)
      .maybeSingle();
    const user_nome = profile?.full_name ?? profile?.email ?? "Sistema";
    const { data: ins, error } = await context.supabase
      .from("oportunidade_notas" as never)
      .insert({
        oportunidade_id: data.oportunidade_id,
        texto: data.texto,
        user_id: context.userId,
        user_nome,
      } as never)
      .select("id")
      .single();
    if (error) throw friendlyDbError(error);
    return { id: (ins as { id: string }).id };
  });

export const removerOportunidadeNota = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertCanAccessModule(context.supabase, context.userId, "comercial");
    const { error } = await context.supabase
      .from("oportunidade_notas" as never)
      .update({ deleted_at: new Date().toISOString(), deleted_by: context.userId } as never)
      .eq("id", data.id);
    if (error) throw friendlyDbError(error);
    return { ok: true };
  });