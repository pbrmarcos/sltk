/* eslint-disable @typescript-eslint/no-explicit-any */
import { createServerFn } from "@tanstack/react-start";
import { friendlyDbError } from "@/lib/db-errors";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const BUCKET = "orcamento-imagens";
const MAX_BYTES = 8 * 1024 * 1024; // 8 MB
const ALLOWED = new Set(["image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif"]);

function slugify(s: string): string {
  return (s || "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "item";
}

function extFromMime(mime: string): string {
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "image/gif") return "gif";
  return "jpg";
}

/** Faz upload de uma imagem de equipamento de orçamento para o bucket privado. */
export const uploadOrcamentoImagem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    cliente_id: string;
    titulo?: string | null;
    equipamento_nome?: string | null;
    /** dados base64 (sem prefixo data:) */
    base64: string;
    content_type: string;
  }) => d)
  .handler(async ({ data, context }) => {
    if (!ALLOWED.has(data.content_type)) {
      throw new Error("Formato não suportado. Use PNG, JPG, WEBP ou GIF.");
    }
    const bytes = Uint8Array.from(atob(data.base64), (c) => c.charCodeAt(0));
    if (bytes.byteLength === 0) throw new Error("Arquivo vazio.");
    if (bytes.byteLength > MAX_BYTES) throw new Error("Imagem acima de 8 MB.");

    const { data: cli, error: cErr } = await context.supabase
      .from("clientes").select("id, codigo").eq("id", data.cliente_id).maybeSingle();
    if (cErr) throw friendlyDbError(cErr);
    if (!cli) throw new Error("Cliente não encontrado.");

    const cliFolder = cli.codigo || cli.id;
    const tituloSlug = slugify(data.titulo || "orcamento");
    const equipSlug = slugify(data.equipamento_nome || "equipamento");
    const ext = extFromMime(data.content_type);
    const path = `${cliFolder}/${tituloSlug}/${equipSlug}-${Date.now()}.${ext}`;

    const { error: uErr } = await context.supabase.storage
      .from(BUCKET)
      .upload(path, bytes, { contentType: data.content_type, upsert: false });
    if (uErr) throw friendlyDbError(uErr);

    return { path, bucket: BUCKET };
  });

/** Gera uma URL assinada para visualizar a imagem em prévia (UI). */
export const signOrcamentoImagem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { path: string }) => d)
  .handler(async ({ data, context }) => {
    const { data: r, error } = await context.supabase.storage
      .from(BUCKET)
      .createSignedUrl(data.path, 3600);
    if (error) throw friendlyDbError(error);
    return { url: r.signedUrl as string };
  });
