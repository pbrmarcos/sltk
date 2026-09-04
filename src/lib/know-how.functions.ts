import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const KH_TIPOS = ["artigo", "video", "pdf", "checklist"] as const;
export type KhTipo = (typeof KH_TIPOS)[number];

export const KH_STATUS = ["rascunho", "em_revisao", "publicado", "arquivado"] as const;
export type KhStatus = (typeof KH_STATUS)[number];

export const KH_MEDIA_BUCKET = "know-how-media";

// Gera signed URL para um objeto armazenado no bucket privado.
export const getMediaSignedUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ path: z.string().min(1), expiresIn: z.number().int().positive().max(60 * 60 * 24).optional() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: res, error } = await (context.supabase as any).storage
      .from(KH_MEDIA_BUCKET)
      .createSignedUrl(data.path, data.expiresIn ?? 60 * 60);
    if (error) throw new Error(error.message);
    return { url: (res as { signedUrl: string }).signedUrl };
  });

export type KhColecao = {
  id: string;
  slug: string;
  nome: string;
  descricao: string | null;
  cor: string | null;
  ordem: number;
  ativo: boolean;
};

export type KhItem = {
  id: string;
  colecao_id: string;
  slug: string;
  tipo: KhTipo;
  titulo: string;
  resumo: string | null;
  corpo: string | null;
  midia_url: string | null;
  status: KhStatus;
  versao: number;
  papeis_alvo: string[];
  tags: string[];
  created_by: string | null;
  revisor_id: string | null;
  aprovado_em: string | null;
  aprovado_por: string | null;
  created_at: string;
  atualizado_em: string;
};

function slugify(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "item";
}

// ---------- Coleções ----------
export const listColecoes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await (context.supabase as any).from("kh_colecoes")
      .select("id, slug, nome, descricao, cor, ordem, ativo")
      .eq("ativo", true)
      .order("ordem", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as KhColecao[];
  });

// ---------- Itens: listar ----------
const listInput = z
  .object({
    q: z.string().trim().optional(),
    colecaoId: z.string().uuid().optional(),
    status: z.enum(KH_STATUS).optional(),
    onlyMine: z.boolean().optional(),
    tags: z.array(z.string()).optional(),
    papel: z.string().optional(),
  })
  .optional();

export const listItens = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => (input ? listInput.parse(input) : undefined))
  .handler(async ({ data, context }) => {
    let query = (context.supabase as any).from("kh_itens")
      .select(
        "id, colecao_id, slug, tipo, titulo, resumo, corpo, midia_url, status, versao, papeis_alvo, tags, created_by, created_at, atualizado_em",
      )
      .order("atualizado_em", { ascending: false })
      .limit(200);

    if (data?.colecaoId) query = query.eq("colecao_id", data.colecaoId);
    if (data?.status) query = query.eq("status", data.status);
    if (data?.onlyMine) query = query.eq("created_by", context.userId);
    if (data?.tags && data.tags.length > 0) query = query.overlaps("tags", data.tags);
    if (data?.papel) query = query.contains("papeis_alvo", [data.papel]);
    if (data?.q && data.q.length >= 2) {
      const like = `%${data.q}%`;
      query = query.or(`titulo.ilike.${like},resumo.ilike.${like},corpo.ilike.${like}`);
    }

    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    return (rows ?? []) as Array<Omit<KhItem, "revisor_id" | "aprovado_em" | "aprovado_por">>;
  });

// ---------- Favoritos ----------
export const listFavoritos = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await (context.supabase as any).from("kh_favoritos")
      .select("item_id")
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return ((data ?? []) as Array<{ item_id: string }>).map((r) => r.item_id);
  });

export const toggleFavorito = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ itemId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: existing } = await (context.supabase as any).from("kh_favoritos")
      .select("id")
      .eq("item_id", data.itemId)
      .eq("user_id", context.userId)
      .maybeSingle();

    if (existing) {
      const { error } = await (context.supabase as any).from("kh_favoritos")
        .delete()
        .eq("id", (existing as { id: string }).id);
      if (error) throw new Error(error.message);
      return { favorito: false };
    }

    const { error } = await (context.supabase as any).from("kh_favoritos")
      .insert({ item_id: data.itemId, user_id: context.userId });
    if (error) throw new Error(error.message);
    return { favorito: true };
  });

// ---------- Histórico de leitura ----------
export const listHistorico = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await (context.supabase as any).from("kh_visualizacoes")
      .select("item_id, viewed_at")
      .eq("user_id", context.userId)
      .order("viewed_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    const seen = new Map<string, string>();
    for (const r of (data ?? []) as Array<{ item_id: string; viewed_at: string }>) {
      if (!seen.has(r.item_id)) seen.set(r.item_id, r.viewed_at);
    }
    return Array.from(seen.entries()).map(([item_id, viewed_at]) => ({ item_id, viewed_at }));
  });


// ---------- Itens: obter por slug ----------
export const getItemBySlug = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ slug: z.string() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: item, error } = await (context.supabase as any).from("kh_itens")
      .select("*")
      .eq("slug", data.slug)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!item) throw new Error("Item não encontrado.");

    // Registrar visualização (não bloqueia)
    void (context.supabase as any).from("kh_visualizacoes").insert({
      item_id: (item as KhItem).id,
      user_id: context.userId,
    });

    return item as KhItem;
  });

// ---------- Criar item (rascunho) ----------
const createInput = z.object({
  colecao_id: z.string().uuid(),
  tipo: z.enum(KH_TIPOS),
  titulo: z.string().trim().min(3).max(200),
  resumo: z.string().trim().max(500).optional().nullable(),
  corpo: z.string().trim().max(50000).optional().nullable(),
  midia_url: z.string().trim().min(1).max(2048).optional().nullable(),
  tags: z.array(z.string().trim().min(1).max(30)).max(10).optional(),
  papeis_alvo: z.array(z.string()).optional(),
});

export const createItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => createInput.parse(input))
  .handler(async ({ data, context }) => {
    const base = slugify(data.titulo);
    const suffix = Math.random().toString(36).slice(2, 6);
    const slug = `${base}-${suffix}`;

    const { data: row, error } = await (context.supabase as any).from("kh_itens")
      .insert({
        colecao_id: data.colecao_id,
        slug,
        tipo: data.tipo,
        titulo: data.titulo,
        resumo: data.resumo ?? null,
        corpo: data.corpo ?? null,
        midia_url: data.midia_url ?? null,
        tags: data.tags ?? [],
        papeis_alvo: data.papeis_alvo ?? [],
        status: "rascunho",
        created_by: context.userId,
      })
      .select("id, slug")
      .single();

    if (error) throw new Error(error.message);
    return row as { id: string; slug: string };
  });

// ---------- Atualizar item ----------
const updateInput = z.object({
  id: z.string().uuid(),
  titulo: z.string().trim().min(3).max(200).optional(),
  resumo: z.string().trim().max(500).nullable().optional(),
  corpo: z.string().trim().max(50000).nullable().optional(),
  midia_url: z.string().trim().min(1).max(2048).nullable().optional(),
  tags: z.array(z.string().trim().min(1).max(30)).max(10).optional(),
  papeis_alvo: z.array(z.string()).optional(),
});

export const updateItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => updateInput.parse(input))
  .handler(async ({ data, context }) => {
    const patch: Record<string, unknown> = {};
    for (const k of ["titulo", "resumo", "corpo", "midia_url", "tags", "papeis_alvo"] as const) {
      if (data[k] !== undefined) patch[k] = data[k];
    }
    const { error } = await (context.supabase as any).from("kh_itens").update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Enviar para revisão ----------
export const enviarParaRevisao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await (context.supabase as any).from("kh_itens")
      .update({ status: "em_revisao" })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Listar itens em revisão ----------
export const listRevisao = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await (context.supabase as any).from("kh_itens")
      .select(
        "id, slug, titulo, resumo, tipo, status, colecao_id, versao, tags, created_by, atualizado_em",
      )
      .eq("status", "em_revisao")
      .order("atualizado_em", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

// ---------- Aprovar / publicar ----------
export const aprovarItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    // Registrar versão atual antes de publicar
    const { data: cur } = await (context.supabase as any).from("kh_itens")
      .select("versao, titulo, resumo, corpo, midia_url")
      .eq("id", data.id)
      .maybeSingle();
    if (cur) {
      await (context.supabase as any).from("kh_item_versoes").insert({
        item_id: data.id,
        versao: (cur as any).versao,
        titulo: (cur as any).titulo,
        resumo: (cur as any).resumo,
        corpo: (cur as any).corpo,
        midia_url: (cur as any).midia_url,
        created_by: context.userId,
      });
    }

    const { error } = await (context.supabase as any).from("kh_itens")
      .update({
        status: "publicado",
        aprovado_em: new Date().toISOString(),
        aprovado_por: context.userId,
        revisor_id: context.userId,
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Solicitar ajuste ----------
export const solicitarAjuste = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await (context.supabase as any).from("kh_itens")
      .update({ status: "rascunho", revisor_id: context.userId })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
