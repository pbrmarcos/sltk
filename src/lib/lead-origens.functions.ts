import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { titleCasePtBR } from "@/lib/text-case";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const ALLOWED_ROLES = ["admin", "manager", "sales"] as const;
const ADMIN_ROLES = ["admin", "manager"] as const;

export type LeadOrigemRow = {
  id: string;
  nome: string;
  ativo: boolean;
  ordem: number;
};

/** Normaliza para comparação: sem acentos, caixa baixa, espaços colapsados. */
export function normalizeOrigem(nome: string) {
  return nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/\s+/g, " ")
    .trim();
}

async function assertRole(supabase: SupabaseClient<Database>, userId: string, allowed: readonly string[]) {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
  const roles = (data ?? []).map((r) => r.role as string);
  if (!roles.some((r) => allowed.includes(r))) throw new Error("Acesso restrito.");
  return supabase;
}

export const listLeadOrigens = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("lead_origens")
      .select("id, nome, ativo, ordem")
      .is("deleted_at", null)
      .eq("ativo", true)
      .order("ordem", { ascending: true })
      .order("nome", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as LeadOrigemRow[];
  });

/** Lista completa (inclui inativas) para a tela de gestão. */
export const listLeadOrigensAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertRole(context.supabase, context.userId, ADMIN_ROLES);
    const { data, error } = await context.supabase
      .from("lead_origens")
      .select("id, nome, ativo, ordem")
      .is("deleted_at", null)
      .order("ordem", { ascending: true })
      .order("nome", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as LeadOrigemRow[];
  });

const createInput = z.object({ nome: z.string().trim().min(2).max(120) });

export const createLeadOrigem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => createInput.parse(input))
  .handler(async ({ data, context }) => {
    const db = await assertRole(context.supabase, context.userId, ALLOWED_ROLES);
    const nome = titleCasePtBR(data.nome);
    const alvo = normalizeOrigem(nome);

    // Deduplicação case/acento-insensível feita em memória (lista pequena).
    const { data: todas, error: listErr } = await db
      .from("lead_origens")
      .select("id, nome, ativo, ordem")
      .is("deleted_at", null);
    if (listErr) throw new Error(listErr.message);
    const existente = ((todas ?? []) as unknown as LeadOrigemRow[]).find(
      (o) => normalizeOrigem(o.nome) === alvo,
    );
    if (existente) {
      if (!existente.ativo) {
        await db.from("lead_origens").update({ ativo: true, updated_by: context.userId }).eq("id", existente.id);
      }
      return { id: existente.id, nome: existente.nome };
    }

    const maxOrdem = ((todas ?? []) as unknown as LeadOrigemRow[]).reduce(
      (acc, o) => Math.max(acc, o.ordem ?? 0),
      0,
    );
    const { data: inserted, error } = await db
      .from("lead_origens")
      .insert({
        nome,
        ativo: true,
        ordem: maxOrdem + 10,
        created_by: context.userId,
        updated_by: context.userId,
      } as never)
      .select("id, nome")
      .single();
    if (error) throw new Error(error.message);
    return inserted as { id: string; nome: string };
  });

const renameInput = z.object({ id: z.string().uuid(), nome: z.string().trim().min(2).max(120) });

export const renameLeadOrigem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => renameInput.parse(input))
  .handler(async ({ data, context }) => {
    const db = await assertRole(context.supabase, context.userId, ADMIN_ROLES);
    const nome = titleCasePtBR(data.nome);
    const alvo = normalizeOrigem(nome);
    const { data: todas, error: listErr } = await db
      .from("lead_origens")
      .select("id, nome")
      .is("deleted_at", null);
    if (listErr) throw new Error(listErr.message);
    const conflito = ((todas ?? []) as { id: string; nome: string }[]).find(
      (o) => o.id !== data.id && normalizeOrigem(o.nome) === alvo,
    );
    if (conflito) throw new Error(`Já existe uma origem chamada "${conflito.nome}".`);
    const { error } = await db
      .from("lead_origens")
      .update({ nome, updated_by: context.userId })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { id: data.id, nome };
  });

const toggleInput = z.object({ id: z.string().uuid(), ativo: z.boolean() });

/** Origens nunca são excluídas — apenas desativadas, preservando histórico. */
export const toggleLeadOrigem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => toggleInput.parse(input))
  .handler(async ({ data, context }) => {
    const db = await assertRole(context.supabase, context.userId, ADMIN_ROLES);
    const { error } = await db
      .from("lead_origens")
      .update({ ativo: data.ativo, updated_by: context.userId })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const reorderInput = z.object({ ids: z.array(z.string().uuid()).min(1).max(500) });

export const reorderLeadOrigens = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => reorderInput.parse(input))
  .handler(async ({ data, context }) => {
    const db = await assertRole(context.supabase, context.userId, ADMIN_ROLES);
    let i = 0;
    for (const id of data.ids) {
      i += 10;
      const { error } = await db
        .from("lead_origens")
        .update({ ordem: i, updated_by: context.userId } as never)
        .eq("id", id);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });
