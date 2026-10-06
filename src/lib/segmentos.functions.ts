import { createServerFn } from "@tanstack/react-start";
import { friendlyDbError } from "@/lib/db-errors";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { titleCasePtBR } from "@/lib/text-case";
import { canAccessModule } from "@/lib/admin-guard";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

/** Segmento nasce no cadastro do cliente ou da oportunidade. */
async function assertPodeCriarSegmento(supabase: SupabaseClient<Database>, userId: string) {
  const ok =
    (await canAccessModule(supabase, userId, "clientes")) ||
    (await canAccessModule(supabase, userId, "comercial"));
  if (!ok) throw new Error("Acesso restrito.");
  return supabase;
}

export const listSegmentos = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("segmentos")
      .select("id, nome, ativo")
      .is("deleted_at", null)
      .eq("ativo", true)
      .order("nome", { ascending: true });
    if (error) throw friendlyDbError(error);
    return data ?? [];
  });

const createInput = z.object({
  nome: z.string().trim().min(2).max(120),
});

export const createSegmento = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => createInput.parse(input))
  .handler(async ({ data, context }) => {
    const admin = await assertPodeCriarSegmento(context.supabase, context.userId);
    const nome = titleCasePtBR(data.nome);
    const { data: existing } = await admin
      .from("segmentos")
      .select("id, nome")
      .ilike("nome", nome)
      .is("deleted_at", null)
      .maybeSingle();
    if (existing) return existing;
    const { data: inserted, error } = await admin
      .from("segmentos")
      .insert({ nome, created_by: context.userId, updated_by: context.userId })
      .select("id, nome")
      .single();
    if (error) throw friendlyDbError(error);
    return inserted;
  });
