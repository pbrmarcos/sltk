/* eslint-disable @typescript-eslint/no-explicit-any */
import { createServerFn } from "@tanstack/react-start";
import { friendlyDbError } from "@/lib/db-errors";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Bloco, DocumentoLayoutConfig } from "./types";
import {
  extractPlaceholders,
  getUserDisplayName,
  snapshotBloco,
  translateText,
} from "./admin-docs.server";
import { logAuditServer } from "@/lib/audit.server";

export const listBlocos = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { tipo: string }) => d)
  .handler(async ({ data, context }) => {
    const { data: blocos, error } = await (context.supabase as any)
      .from("documento_blocos")
      .select("*")
      .eq("tipo_codigo", data.tipo)
      .order("ordem_padrao", { ascending: true });
    if (error) throw friendlyDbError(error);
    return (blocos || []) as unknown as Bloco[];
  });

export const getLayoutConfig = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { tipo: string }) => d)
  .handler(async ({ data, context }) => {
    const { data: layout, error } = await (context.supabase as any)
      .from("documento_layout_config")
      .select("*")
      .eq("tipo_codigo", data.tipo)
      .maybeSingle();
    if (error) throw friendlyDbError(error);
    return (layout ?? null) as unknown as DocumentoLayoutConfig | null;
  });

export const updateLayoutConfig = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: Partial<DocumentoLayoutConfig> & { tipo_codigo: string }) => d)
  .handler(async ({ data }) => {
    const { getCriticalClient } = await import("@/lib/supabase-client.server");
    const supabaseAdmin = await getCriticalClient();
    const { error } = await (supabaseAdmin as any)
      .from("documento_layout_config")
      .upsert({ ...data, updated_at: new Date().toISOString() }, { onConflict: "tipo_codigo" });
    if (error) throw friendlyDbError(error);
    return { ok: true };
  });

export const listDocumentoTipos = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await (context.supabase as any)
      .from("documento_tipos")
      .select("codigo, nome, prefixo_codigo, ativo")
      .eq("ativo", true)
      .order("nome");
    if (error) throw friendlyDbError(error);
    return (data || []) as Array<{ codigo: string; nome: string; prefixo_codigo: string; ativo: boolean }>;
  });

export const updateBloco = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    id: string;
    conteudo_pt?: any;
    conteudo_es?: any;
    conteudo_en?: any;
    obrigatorio?: boolean;
    ordem_padrao?: number;
    ativo?: boolean;
    largura?: 50 | 100;
    comentario?: string;
  }) => d)
  .handler(async ({ data, context }) => {
    const [{ data: isAdmin }, { data: isMgr }] = await Promise.all([
      context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" }),
      context.supabase.rpc("has_role", { _user_id: context.userId, _role: "manager" }),
    ]);
    if (!isAdmin && !isMgr) throw new Error("Acesso restrito.");


    const { id, comentario, ...patch } = data;
    const { getCriticalClient } = await import("@/lib/supabase-client.server");
    const supabaseAdmin = await getCriticalClient();
    const userNome = await getUserDisplayName(supabaseAdmin, context.userId);
    await snapshotBloco(supabaseAdmin, id, context.userId, userNome, "editado", comentario ?? null, null);

    const { error } = await (supabaseAdmin as any)
      .from("documento_blocos")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw friendlyDbError(error);
    return { ok: true };
  });

export const listBlocoHistorico = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { bloco_id: string }) => d)
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await (context.supabase as any)
      .from("documento_bloco_versoes")
      .select("*")
      .eq("bloco_id", data.bloco_id)
      .order("versao_seq", { ascending: false });
    if (error) throw friendlyDbError(error);
    return (rows || []) as Array<any>;
  });

export const restoreBlocoVersao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { versao_id: string; comentario?: string }) => d)
  .handler(async ({ data, context }) => {
    const [{ data: isAdmin }, { data: isMgr }] = await Promise.all([
      context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" }),
      context.supabase.rpc("has_role", { _user_id: context.userId, _role: "manager" }),
    ]);
    if (!isAdmin && !isMgr) throw new Error("Acesso restrito.");

    const { getCriticalClient } = await import("@/lib/supabase-client.server");
    const supabaseAdmin = await getCriticalClient();

    const { data: ver, error: vErr } = await (supabaseAdmin as any)
      .from("documento_bloco_versoes")
      .select("*")
      .eq("id", data.versao_id)
      .maybeSingle();
    if (vErr) throw friendlyDbError(vErr);
    if (!ver) throw new Error("Versão não encontrada.");

    const { data: atual } = await (supabaseAdmin as any)
      .from("documento_blocos")
      .select("*")
      .eq("id", ver.bloco_id)
      .maybeSingle();

    const langs: Array<"pt" | "es" | "en"> = ["pt", "es", "en"];
    const impacto = langs.map((l) => {
      const cur = (atual?.[`conteudo_${l}`] as any) || {};
      const v = (ver[`conteudo_${l}`] as any) || {};
      const curStr = `${cur.titulo || ""}\n${cur.texto || ""}`;
      const verStr = `${v.titulo || ""}\n${v.texto || ""}`;
      const curPh = new Set(extractPlaceholders(curStr));
      const verPh = new Set(extractPlaceholders(verStr));
      return {
        idioma: l,
        alterado: curStr.trim() !== verStr.trim(),
        placeholders_removidos: [...curPh].filter((p) => !verPh.has(p)),
        placeholders_reintroduzidos: [...verPh].filter((p) => !curPh.has(p)),
        placeholders_mantidos: [...curPh].filter((p) => verPh.has(p)),
      };
    });

    const userNome = await getUserDisplayName(supabaseAdmin, context.userId);
    await snapshotBloco(
      supabaseAdmin,
      ver.bloco_id,
      context.userId,
      userNome,
      "restaurado",
      data.comentario ?? `Restaurado a partir da v${ver.versao_seq}`,
      ver.id,
    );

    const { error: uErr } = await (supabaseAdmin as any)
      .from("documento_blocos")
      .update({
        conteudo_pt: ver.conteudo_pt,
        conteudo_es: ver.conteudo_es,
        conteudo_en: ver.conteudo_en,
        obrigatorio: ver.obrigatorio,
        ordem_padrao: ver.ordem_padrao,
        updated_at: new Date().toISOString(),
      })
      .eq("id", ver.bloco_id);
    if (uErr) throw friendlyDbError(uErr);

    await logAuditServer(supabaseAdmin, context.userId, {
      table_name: "documento_blocos",
      record_id: ver.bloco_id,
      action: "UPDATE",
      field_changed: "restore",
      old_value: {
        bloco_codigo: atual?.codigo ?? null,
        bloco_nome: atual?.nome ?? null,
        tipo_codigo: atual?.tipo_codigo ?? ver.tipo_codigo,
      },
      new_value: {
        versao_id: ver.id,
        versao_seq: ver.versao_seq,
        restaurado_por_nome: userNome,
        comentario: data.comentario ?? null,
        idiomas_afetados: impacto.filter((i) => i.alterado).map((i) => i.idioma),
        impacto,
      },
    });

    return { ok: true, impacto };
  });

export const translateBloco = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    bloco_id: string;
    alvo: "es" | "en" | "both";
    sobrescrever?: boolean;
  }) => d)
  .handler(async ({ data, context }) => {
    const [{ data: isAdmin }, { data: isMgr }] = await Promise.all([
      context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" }),
      context.supabase.rpc("has_role", { _user_id: context.userId, _role: "manager" }),
    ]);
    if (!isAdmin && !isMgr) throw new Error("Acesso restrito.");

    const { aiConfigured } = await import("@/lib/ai-gateway.server");
    if (!aiConfigured()) throw new Error("Recurso de IA indisponível — a integração não está configurada.");

    const { getCriticalClient } = await import("@/lib/supabase-client.server");
    const supabaseAdmin = await getCriticalClient();
    const { data: bloco, error } = await (supabaseAdmin as any)
      .from("documento_blocos")
      .select("*")
      .eq("id", data.bloco_id)
      .maybeSingle();
    if (error) throw friendlyDbError(error);
    if (!bloco) throw new Error("Bloco não encontrado.");

    const pt = (bloco.conteudo_pt as any) || {};
    const ptTitulo: string = pt.titulo || "";
    const ptTexto: string = pt.texto || "";
    if (!ptTitulo && !ptTexto) throw new Error("Conteúdo PT vazio — nada para traduzir.");

    const alvos: Array<"es" | "en"> = data.alvo === "both" ? ["es", "en"] : [data.alvo];
    const patch: Record<string, any> = {};
    let alterou = false;
    for (const alvo of alvos) {
      const atual = (bloco[`conteudo_${alvo}`] as any) || {};
      const temConteudo = !!(atual.titulo || atual.texto);
      if (temConteudo && !data.sobrescrever) continue;
      const [tTitulo, tTexto] = await Promise.all([
        ptTitulo ? translateText(ptTitulo, alvo) : Promise.resolve(""),
        ptTexto ? translateText(ptTexto, alvo) : Promise.resolve(""),
      ]);
      patch[`conteudo_${alvo}`] = { ...atual, titulo: tTitulo || atual.titulo || "", texto: tTexto };
      alterou = true;
    }

    if (!alterou) return { ok: true, skipped: true };

    const userNome = await getUserDisplayName(supabaseAdmin, context.userId);
    await snapshotBloco(supabaseAdmin, data.bloco_id, context.userId, userNome, "traduzido_auto", `Tradução automática (${alvos.join("/")})`, null);
    const { error: uErr } = await (supabaseAdmin as any)
      .from("documento_blocos")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", data.bloco_id);
    if (uErr) throw friendlyDbError(uErr);
    return { ok: true, alvos };
  });