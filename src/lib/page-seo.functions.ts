import { createServerFn } from "@tanstack/react-start";
import { friendlyDbError } from "@/lib/db-errors";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAdmin } from "@/lib/admin-guard";

export type PageSeoRow = {
  route_path: string;
  title: string | null;
  description: string | null;
  og_title: string | null;
  og_description: string | null;
  og_image: string | null;
  canonical: string | null;
  noindex: boolean;
  last_scanned_at: string | null;
  updated_at: string;
  created_at: string;
};

/** Rotas públicas conhecidas (mapeamento estático de src/routes/). */
const PUBLIC_ROUTES: Array<{ path: string; title: string; description: string }> = [
  {
    path: "/",
    title: "Solutek · Operations Dashboard",
    description:
      "Painel de gestão integrada Solutek — CRM, engenharia, FAT, montagem e pós-vendas em um só lugar.",
  },
  {
    path: "/login",
    title: "Entrar — Solutek",
    description: "Acesse o painel Solutek com seu e-mail corporativo.",
  },
  {
    path: "/forgot-password",
    title: "Recuperar senha — Solutek",
    description: "Recupere o acesso à sua conta Solutek por e-mail.",
  },
  {
    path: "/reset-password",
    title: "Redefinir senha — Solutek",
    description: "Defina uma nova senha para sua conta Solutek.",
  },
  {
    path: "/equipamentos/envasadora",
    title: "Envasadora Rotativa 100 FLEX — Solutek",
    description:
      "Linha de envase rotativo Solutek 100 FLEX: enchimento volumétrico de líquidos, cremes e produtos viscosos.",
  },
];

export const listPageSeo = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<PageSeoRow[]> => {
    await assertAdmin(context.supabase, context.userId);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = context.supabase as any;
    const { data, error } = await sb
      .from("page_seo")
      .select("*")
      .order("route_path", { ascending: true });
    if (error) throw friendlyDbError(error);
    return (data ?? []) as PageSeoRow[];
  });

export const scanPageSeo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const admin = context.supabase;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = admin as any;
    const now = new Date().toISOString();
    const { data: existing, error: exErr } = await sb.from("page_seo").select("route_path");
    if (exErr) throw friendlyDbError(exErr);
    const have = new Set(((existing ?? []) as { route_path: string }[]).map((r) => r.route_path));
    const toInsert = PUBLIC_ROUTES.filter((r) => !have.has(r.path)).map((r) => ({
      route_path: r.path,
      title: r.title,
      description: r.description,
      og_title: r.title,
      og_description: r.description,
      noindex: false,
      last_scanned_at: now,
      updated_at: now,
      updated_by: context.userId,
    }));
    if (toInsert.length) {
      const { error } = await sb.from("page_seo").insert(toInsert);
      if (error) throw friendlyDbError(error);
    }
    if (have.size) {
      const { error } = await sb
        .from("page_seo")
        .update({ last_scanned_at: now })
        .in("route_path", Array.from(have));
      if (error) throw friendlyDbError(error);
    }
    return { inserted: toInsert.length, refreshed: have.size, total: PUBLIC_ROUTES.length };
  });

const upsertInput = z.object({
  route_path: z.string().min(1).max(200),
  title: z.string().max(200).nullable().optional(),
  description: z.string().max(500).nullable().optional(),
  og_title: z.string().max(200).nullable().optional(),
  og_description: z.string().max(500).nullable().optional(),
  og_image: z.string().max(1000).nullable().optional(),
  canonical: z.string().max(1000).nullable().optional(),
  noindex: z.boolean().optional(),
});

export const upsertPageSeo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => upsertInput.parse(raw))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const admin = context.supabase;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = admin as any;
    const { error } = await sb.from("page_seo").upsert(
      {
        ...data,
        updated_at: new Date().toISOString(),
        updated_by: context.userId,
      },
      { onConflict: "route_path" },
    );
    if (error) throw friendlyDbError(error);
    return { ok: true };
  });

const deleteInput = z.object({ route_path: z.string().min(1).max(200) });

export const deletePageSeo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => deleteInput.parse(raw))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const admin = context.supabase;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = admin as any;
    const { error } = await sb.from("page_seo").delete().eq("route_path", data.route_path);
    if (error) throw friendlyDbError(error);
    return { ok: true };
  });
