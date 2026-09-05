/* eslint-disable @typescript-eslint/no-explicit-any */
import { MOEDA_PADRAO, toMoedaISO, type MoedaISO } from "@/lib/moedas";
import { createServerFn } from "@tanstack/react-start";
import { friendlyDbError } from "@/lib/db-errors";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import { OrcamentoPdf } from "./pdf-document";
import { FatPdf, type FatPdfPayload } from "./fat-pdf";
import { SatPdf, type SatPdfPayload, type SatItemTipo } from "./sat-pdf";
import { logAuditServer } from "@/lib/audit.server";
import type {
  Bloco,
  DocumentoLayoutConfig,
  Idioma,
  OrcamentoPayload,
} from "./types";
import { bumpVersion } from "./formatters";
import { translatePtTo as translateText } from "@/lib/ai-gateway.server";

/** Moeda do documento: sempre o código ISO do cadastro do cliente (fallback BRL). */
async function moedaDoCliente(db: any, clienteId: string | null | undefined): Promise<MoedaISO> {
  if (!clienteId) return MOEDA_PADRAO;
  const { data } = await db.from("clientes").select("moeda").eq("id", clienteId).maybeSingle();
  return toMoedaISO(data?.moeda, MOEDA_PADRAO);
}


// ============================================================
// Listar documentos
// ============================================================
export const listDocumentos = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { tipo?: string; cliente_id?: string; q?: string } | undefined) => d ?? {})
  .handler(async ({ data, context }) => {
    let q = (context.supabase as any)
      .from("documentos")
      .select("id, codigo, tipo_codigo, titulo, status, versao, idiomas_gerados, cliente_id, oportunidade_id, responsavel_id, created_at, updated_at")
      .order("created_at", { ascending: false })
      .limit(500);
    if (data.tipo) q = q.eq("tipo_codigo", data.tipo);
    if (data.cliente_id) q = q.eq("cliente_id", data.cliente_id);
    if (data.q) q = q.ilike("codigo", `%${data.q}%`);
    const { data: docs, error } = await q;
    if (error) throw friendlyDbError(error);

    // Hydrate cliente codes / razao
    const clienteIds = Array.from(new Set((docs || []).map((d: any) => d.cliente_id).filter(Boolean)));
    let clientesMap: Record<string, { codigo: string; razao_social: string }> = {};
    if (clienteIds.length > 0) {
      const { data: cli } = await (context.supabase as any)
        .from("clientes")
        .select("id, codigo, razao_social")
        .in("id", clienteIds);
      clientesMap = Object.fromEntries((cli || []).map((c: any) => [c.id, c]));
    }
    return (docs || []).map((d: any) => ({
      ...d,
      cliente_codigo: clientesMap[d.cliente_id]?.codigo,
      cliente_razao: clientesMap[d.cliente_id]?.razao_social,
    }));
  });

// ============================================================
// Orçamentos de uma oportunidade
// ============================================================
export const listOrcamentosDaOportunidade = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { oportunidade_id: string }) => d)
  .handler(async ({ data, context }) => {
    const { data: docs, error } = await (context.supabase as any)
      .from("documentos")
      .select("id, codigo, titulo, status, versao, idiomas_gerados, created_at, updated_at")
      .eq("tipo_codigo", "orcamento")
      .eq("oportunidade_id", data.oportunidade_id)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw friendlyDbError(error);
    return (docs || []) as Array<{
      id: string;
      codigo: string;
      titulo: string | null;
      status: string;
      versao: string;
      idiomas_gerados: string[] | null;
      created_at: string;
      updated_at: string;
    }>;
  });


// ============================================================
// Listar blocos por tipo
// ============================================================
export const listBlocos = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { tipo: string }) => d)
  .handler(async ({ data, context }) => {
    const { data: blocos, error } = await (context.supabase as any)
      .from("documento_blocos")
      .select("*")
      .eq("tipo_codigo", data.tipo)
      .eq("ativo", true)
      .order("ordem_padrao", { ascending: true });
    if (error) throw friendlyDbError(error);
    return (blocos || []) as unknown as Bloco[];
  });

// ============================================================
// Layout config por tipo
// ============================================================
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
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Acesso restrito a administradores.");
    const { getCriticalClient } = await import("@/lib/supabase-client.server");
    const supabaseAdmin = await getCriticalClient();
    const { error } = await (supabaseAdmin as any)
      .from("documento_layout_config")
      .upsert({ ...data, updated_at: new Date().toISOString() }, { onConflict: "tipo_codigo" });
    if (error) throw friendlyDbError(error);
    return { ok: true };
  });

// ============================================================
// Listar tipos de documento ativos
// ============================================================
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

// ============================================================
// Snapshot helper — grava versão atual antes de alterar bloco
// ============================================================
async function snapshotBloco(
  supabaseAdmin: any,
  blocoId: string,
  userId: string,
  userNome: string | null,
  acao: "editado" | "restaurado" | "traduzido_auto" | "criado",
  comentario: string | null,
  restauradoDe: string | null,
): Promise<void> {
  const { data: cur } = await supabaseAdmin
    .from("documento_blocos").select("*").eq("id", blocoId).maybeSingle();
  if (!cur) return;
  const { data: last } = await supabaseAdmin
    .from("documento_bloco_versoes")
    .select("versao_seq")
    .eq("bloco_id", blocoId)
    .order("versao_seq", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextSeq = ((last?.versao_seq as number | undefined) ?? 0) + 1;
  await supabaseAdmin.from("documento_bloco_versoes").insert({
    bloco_id: blocoId,
    tipo_codigo: cur.tipo_codigo,
    versao_seq: nextSeq,
    conteudo_pt: cur.conteudo_pt ?? {},
    conteudo_es: cur.conteudo_es ?? {},
    conteudo_en: cur.conteudo_en ?? {},
    obrigatorio: !!cur.obrigatorio,
    ordem_padrao: cur.ordem_padrao ?? 0,
    alterado_por: userId,
    alterado_por_nome: userNome,
    comentario,
    acao,
    restaurado_de: restauradoDe,
  });
}

async function getUserDisplayName(supabase: any, userId: string): Promise<string | null> {
  const { data } = await supabase
    .from("profiles").select("full_name, email").eq("id", userId).maybeSingle();
  return (data?.full_name as string | null) || (data?.email as string | null) || null;
}

export const updateBloco = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    id: string;
    conteudo_pt?: any; conteudo_es?: any; conteudo_en?: any;
    obrigatorio?: boolean; ordem_padrao?: number;
    comentario?: string;
  }) => d)
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Acesso restrito a administradores.");
    const { id, comentario, ...patch } = data;
    const { getCriticalClient } = await import("@/lib/supabase-client.server");
    const supabaseAdmin = await getCriticalClient();
    const userNome = await getUserDisplayName(supabaseAdmin, context.userId);
    // 1) snapshot do estado anterior
    await snapshotBloco(supabaseAdmin, id, context.userId, userNome, "editado", comentario ?? null, null);
    // 2) aplica alteração
    const { error } = await (supabaseAdmin as any)
      .from("documento_blocos")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw friendlyDbError(error);
    return { ok: true };
  });

// ============================================================
// Histórico de blocos
// ============================================================
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

// Extrai placeholders {{var.path}} de uma string.
function extractPlaceholders(s: string): string[] {
  const re = /\{\{\s*([\w.]+)\s*\}\}/g;
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(s || "")) !== null) out.push(m[1]);
  return out;
}

export const restoreBlocoVersao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { versao_id: string; comentario?: string }) => d)
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Acesso restrito a administradores.");
    const { getCriticalClient } = await import("@/lib/supabase-client.server");
    const supabaseAdmin = await getCriticalClient();
    const { data: ver, error: vErr } = await (supabaseAdmin as any)
      .from("documento_bloco_versoes").select("*").eq("id", data.versao_id).maybeSingle();
    if (vErr) throw friendlyDbError(vErr);
    if (!ver) throw new Error("Versão não encontrada.");
    // Buscar conteúdo atual para calcular impacto
    const { data: atual } = await (supabaseAdmin as any)
      .from("documento_blocos").select("*").eq("id", ver.bloco_id).maybeSingle();
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
    // snapshot atual antes de restaurar
    await snapshotBloco(
      supabaseAdmin, ver.bloco_id, context.userId, userNome,
      "restaurado", data.comentario ?? `Restaurado a partir da v${ver.versao_seq}`, ver.id,
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
    // Audit log: registra a tentativa/execução de restauração com impacto detalhado
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


// ============================================================
// Tradução automática PT → ES / EN — ver src/lib/ai-gateway.server.ts
// (prefere GEMINI_API_KEY direto; cai para o AI Gateway da Lovable
// só se a chave direta não estiver configurada)
// ============================================================

export const translateBloco = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    bloco_id: string;
    alvo: "es" | "en" | "both";
    sobrescrever?: boolean;
  }) => d)
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    const { data: isMgr } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "manager" });
    if (!isAdmin && !isMgr) throw new Error("Acesso restrito.");
    const { getCriticalClient } = await import("@/lib/supabase-client.server");
    const supabaseAdmin = await getCriticalClient();
    const { data: bloco, error } = await (supabaseAdmin as any)
      .from("documento_blocos").select("*").eq("id", data.bloco_id).maybeSingle();
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

// ============================================================
// Próximo código (sequencial por tipo)
// ============================================================
async function nextCodigo(supabase: any, tipo: string, prefixo: string): Promise<string> {
  const year = new Date().getFullYear();
  const { data, error } = await supabase
    .from("documentos")
    .select("codigo")
    .eq("tipo_codigo", tipo)
    .ilike("codigo", `${prefixo}-${year}-%`)
    .order("codigo", { ascending: false })
    .limit(1);
  if (error) throw friendlyDbError(error);
  let next = 1;
  const last = data?.[0]?.codigo as string | undefined;
  if (last) {
    const m = last.match(/-(\d+)$/);
    if (m) next = parseInt(m[1], 10) + 1;
  }
  return `${prefixo}-${year}-${String(next).padStart(4, "0")}`;
}

// ============================================================
// Validação de variáveis obrigatórias
// ============================================================
function getVarValue(payload: OrcamentoPayload, path: string): unknown {
  // 'cliente.razao_social', 'equipamentos', 'pagamento.forma'
  const parts = path.split(".");
  let cur: any = payload;
  for (const p of parts) {
    if (cur == null) return null;
    cur = cur[p];
  }
  return cur;
}

export function validatePayload(blocos: Bloco[], selected: string[], payload: OrcamentoPayload): string[] {
  const errors: string[] = [];
  for (const codigo of selected) {
    const b = blocos.find((x) => x.codigo === codigo);
    if (!b) continue;
    for (const v of b.variaveis_obrigatorias || []) {
      const val = getVarValue(payload, v);
      if (val == null || (Array.isArray(val) && val.length === 0) || val === "") {
        errors.push(`[${b.nome}] variável obrigatória ausente: ${v}`);
      }
    }
  }
  return errors;
}

// ============================================================
// Render + salvar documento (cria ou nova versão)
// ============================================================
export async function generateOrcamentoImpl(
  supabase: any,
  userId: string,
  data: {
    documento_id?: string;
    payload: OrcamentoPayload;
    titulo?: string;
    bump?: "major" | "minor" | "patch";
    motivo?: string;
    bump_changes?: string[];
  },
): Promise<{ ok: true; documento_id: string; codigo: string; versao: string; arquivos: Record<string, string>; drive_synced: boolean; drive_error: string | null }> {
  const context = { userId } as { userId: string };
  {
    const tipo = "orcamento";

    // Carregar blocos + layout
    const [{ data: blocos, error: bErr }, { data: layout, error: lErr }, { data: tipoRow, error: tErr }] =
      await Promise.all([
        supabase.from("documento_blocos").select("*").eq("tipo_codigo", tipo).eq("ativo", true).order("ordem_padrao"),
        supabase.from("documento_layout_config").select("*").eq("tipo_codigo", tipo).maybeSingle(),
        supabase.from("documento_tipos").select("*").eq("codigo", tipo).maybeSingle(),
      ]);
    if (bErr) throw friendlyDbError(bErr);
    if (lErr) throw friendlyDbError(lErr);
    if (tErr) throw friendlyDbError(tErr);
    if (!layout) throw new Error("Layout do tipo 'orcamento' não configurado.");

    const blocosList = (blocos || []) as Bloco[];
    const layoutCfg = layout as DocumentoLayoutConfig;

    // Validação
    const selected = data.payload.blocos_selecionados.length > 0
      ? data.payload.blocos_selecionados
      : blocosList.map((b) => b.codigo);
    const errors = validatePayload(blocosList, selected, data.payload);
    if (errors.length > 0) {
      throw new Error("Faltam dados obrigatórios:\n- " + errors.join("\n- "));
    }

    // Documento existente ou novo
    let docId = data.documento_id ?? null;
    let codigo = "";
    let versao = "1.0.0";

    if (docId) {
      const { data: existing, error: eErr } = await supabase
        .from("documentos")
        .select("id, codigo, versao")
        .eq("id", docId)
        .maybeSingle();
      if (eErr) throw friendlyDbError(eErr);
      if (!existing) throw new Error("Documento não encontrado.");
      codigo = existing.codigo;
      versao = bumpVersion(existing.versao || "1.0.0", data.bump || "minor");
    } else {
      codigo = await nextCodigo(supabase, tipo, tipoRow?.prefixo_codigo || "ORC");
    }

    // Render 3 idiomas
    const idiomas: Idioma[] = ["pt", "es", "en"];
    const data_emissao = new Date();
    const arquivos: Record<string, string> = {};

    // pasta: cliente/AAAAMM/tipo/
    const yyyymm = `${data_emissao.getFullYear()}${String(data_emissao.getMonth() + 1).padStart(2, "0")}`;
    const { data: cli } = await supabase
      .from("clientes").select("codigo").eq("id", data.payload.cliente.id).maybeSingle();
    const clienteCod = cli?.codigo || data.payload.cliente.codigo || data.payload.cliente.id;

    // Resolver imagens dos equipamentos (storage privado → data URL) antes do render.
    const imagensCache = new Map<string, { dataUrl: string; bytes: Uint8Array; mime: string; ext: string }>();
    const resolveImage = async (raw: string): Promise<string> => {
      if (!raw) return raw;
      if (/^https?:\/\//i.test(raw) || raw.startsWith("data:")) return raw;
      const cached = imagensCache.get(raw);
      if (cached) return cached.dataUrl;
      const { data: blob, error: dErr } = await supabase.storage
        .from("orcamento-imagens").download(raw);
      if (dErr || !blob) return raw;
      const ab = await (blob as Blob).arrayBuffer();
      const bytes = new Uint8Array(ab);
      const mime = (blob as Blob).type || "image/jpeg";
      const ext = mime.split("/")[1] || "jpg";
      let bin = ""; for (let i = 0; i < bytes.byteLength; i++) bin += String.fromCharCode(bytes[i]);
      const b64 = btoa(bin);
      const dataUrl = `data:${mime};base64,${b64}`;
      imagensCache.set(raw, { dataUrl, bytes, mime, ext });
      return dataUrl;
    };
    const equipamentosResolvidos = await Promise.all(
      (data.payload.equipamentos || []).map(async (eq) => ({
        ...eq,
        imagem_url: eq.imagem_url ? await resolveImage(eq.imagem_url) : eq.imagem_url,
      })),
    );
    const payloadParaRender = { ...data.payload, equipamentos: equipamentosResolvidos };

    for (const idioma of idiomas) {
      const buffer = await renderToBuffer(
        React.createElement(OrcamentoPdf, {
          codigo,
          versao,
          idioma,
          data: data_emissao,
          payload: payloadParaRender,
          blocos: blocosList,
          layout: layoutCfg,
        }) as any,
      );
      const path = `${clienteCod}/${yyyymm}/${tipo}/${codigo}-v${versao}-${idioma}.pdf`;
      const { error: uErr } = await supabase.storage
        .from("documentos")
        .upload(path, buffer, { contentType: "application/pdf", upsert: true });
      if (uErr) throw new Error(`Upload ${idioma} falhou: ${uErr.message}`);
      arquivos[idioma] = path;
    }


    const titulo = data.titulo || `Orçamento ${data.payload.cliente.razao_social}`;

    // Gerar/regerar reseta o documento para rascunho (nova versão exige nova revisão).
    if (docId) {
      const { error: upErr } = await supabase
        .from("documentos")
        .update({
          versao,
          status: "rascunho",
          payload: data.payload,
          blocos: selected.map((c, i) => ({ codigo: c, ordem: i })),
          idiomas_gerados: idiomas,
          titulo,
          updated_at: new Date().toISOString(),
        })
        .eq("id", docId);
      if (upErr) throw friendlyDbError(upErr);
    } else {
      const { data: ins, error: iErr } = await supabase
        .from("documentos")
        .insert({
          codigo,
          tipo_codigo: tipo,
          cliente_id: data.payload.cliente.id,
          oportunidade_id: data.payload.oportunidade_id || null,
          titulo,
          status: "rascunho",
          idioma_principal: "pt",
          moeda: data.payload.moeda,
          versao,
          responsavel_id: data.payload.responsavel.id,
          payload: data.payload,
          blocos: selected.map((c, i) => ({ codigo: c, ordem: i })),
          idiomas_gerados: idiomas,
          created_by: context.userId,
        })
        .select("id")
        .single();
      if (iErr) throw friendlyDbError(iErr);
      docId = ins.id;
    }

    const revisaoMeta = data.documento_id
      ? {
          kind: data.bump || "minor",
          motivo: data.motivo || null,
          changes: data.bump_changes || [],
          at: new Date().toISOString(),
          by: context.userId,
        }
      : null;
    const versionPayload = revisaoMeta ? { ...data.payload, _revisao_meta: revisaoMeta } : data.payload;

    const { error: vErr } = await supabase.from("documento_versoes").insert({
      documento_id: docId,
      versao,
      arquivos,
      payload: versionPayload,
      gerado_por: context.userId,
    });
    if (vErr) throw friendlyDbError(vErr);

    // Auto-sync para Google Drive (não falha a geração se Drive estiver indisponível)
    let drive_synced = false;
    let drive_error: string | null = null;
    try {
      const nome = await getUserDisplayName(supabase, context.userId) || "Sistema";
      await uploadAndSignImpl(supabase, docId as string, context.userId, nome);
      // Imagens dos equipamentos → "Clientes/<cliente>/Imagens de Orçamentos/<codigo>/"
      try {
        if (imagensCache.size > 0) {
          const { ensurePath, uploadFile } = await import("./drive.server");
          const { data: cliFull } = await supabase
            .from("clientes").select("codigo, razao_social").eq("id", data.payload.cliente.id).maybeSingle();
          const clienteFolder = `${cliFull?.codigo || clienteCod} - ${(cliFull?.razao_social || "").slice(0, 80)}`.trim();
          const imgFolder = await ensurePath(["Clientes", clienteFolder, "Imagens de Orçamentos", codigo]);
          const slug = (s: string) => (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
            .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "equipamento";
          await Promise.all((data.payload.equipamentos || []).map(async (eq, i) => {
            const raw = eq.imagem_url;
            if (!raw) return;
            const cached = imagensCache.get(raw);
            if (!cached) return;
            const name = `${codigo}-v${versao}-${String(i + 1).padStart(2, "0")}-${slug(eq.nome_pt || eq.nome_en || "equipamento")}.${cached.ext}`;
            await uploadFile({ name, parentId: imgFolder, bytes: cached.bytes, mimeType: cached.mime });
          }));
        }
      } catch (e) {
        console.warn("[generateOrcamento drive imagens]", e);
      }
      drive_synced = true;
    } catch (e) {
      drive_error = (e as Error).message;
      console.error("[generateOrcamento drive sync]", e);
      await supabase
        .from("documentos")
        .update({ drive_sync_error: drive_error })
        .eq("id", docId);
    }


    return { ok: true as const, documento_id: docId as string, codigo, versao, arquivos, drive_synced, drive_error };
  }
}

export const generateOrcamento = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: {
      documento_id?: string;
      payload: OrcamentoPayload;
      titulo?: string;
      bump?: "major" | "minor" | "patch";
      motivo?: string;
      bump_changes?: string[];
    }) => d,
  )
  .handler(async ({ data, context }) => generateOrcamentoImpl(context.supabase, context.userId, data));


// ============================================================
// Signed URL para download
// ============================================================
export const getSignedUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { path: string; expiresIn?: number }) => d)
  .handler(async ({ data, context }) => {
    const { data: signed, error } = await context.supabase.storage
      .from("documentos")
      .createSignedUrl(data.path, data.expiresIn ?? 600);
    if (error) throw friendlyDbError(error);

    // Auditoria de acesso a documento restrito — só metadados, nunca o conteúdo do arquivo.
    const { getCriticalClient } = await import("@/lib/supabase-client.server");
    const supabaseAdmin = await getCriticalClient();
    await logAuditServer(supabaseAdmin, context.userId, {
      table_name: "documentos",
      record_id: data.path,
      action: "ACCESS",
      new_value: { expiresIn: data.expiresIn ?? 600 },
    });

    return { url: signed?.signedUrl as string };
  });

// ============================================================
// Get documento detalhado (com versões)
// ============================================================
export const getDocumento = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const { data: doc, error } = await (context.supabase as any)
      .from("documentos")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw friendlyDbError(error);
    if (!doc) return { documento: null, versoes: [], aprovacoes: [], notFound: true as const };
    const [{ data: versoes }, { data: aprovacoes }] = await Promise.all([
      (context.supabase as any)
        .from("documento_versoes")
        .select("*")
        .eq("documento_id", data.id)
        .order("gerado_em", { ascending: false }),
      (context.supabase as any)
        .from("documento_aprovacoes")
        .select("*")
        .eq("documento_id", data.id)
        .order("created_at", { ascending: false }),
    ]);
    return { documento: doc, versoes: versoes || [], aprovacoes: aprovacoes || [], notFound: false as const };
  });


// ============================================================
// Fluxo de revisão e aprovação
// ============================================================
type AprovAcao = "submeter" | "aprovar" | "rejeitar" | "publicar" | "arquivar" | "reabrir";
type DocStatus = "rascunho" | "em_revisao" | "aprovado" | "publicado" | "arquivado" | "emitido";

// Quem pode executar cada ação
async function assertCanAct(
  supabase: any,
  userId: string,
  acao: AprovAcao,
  doc: { created_by: string | null; responsavel_id: string | null },
): Promise<void> {
  const [{ data: isAdmin }, { data: isManager }] = await Promise.all([
    supabase.rpc("has_role", { _user_id: userId, _role: "admin" }),
    supabase.rpc("has_role", { _user_id: userId, _role: "manager" }),
  ]);
  const isOwner = doc.created_by === userId || doc.responsavel_id === userId;
  switch (acao) {
    case "submeter":
      if (!(isOwner || isAdmin || isManager)) throw new Error("Apenas o autor, manager ou admin podem submeter para revisão.");
      return;
    case "aprovar":
    case "rejeitar":
    case "publicar":
    case "arquivar":
      if (!(isAdmin || isManager)) throw new Error("Apenas manager ou admin podem executar esta ação.");
      return;
    case "reabrir":
      if (!isAdmin) throw new Error("Apenas administradores podem reabrir um documento publicado.");
      return;
  }
}

// Transições permitidas
const TRANSITIONS: Record<AprovAcao, { from: DocStatus[]; to: DocStatus }> = {
  submeter:  { from: ["rascunho", "emitido"],          to: "em_revisao" },
  aprovar:   { from: ["rascunho", "emitido", "em_revisao"], to: "aprovado" },
  rejeitar:  { from: ["em_revisao"],                   to: "rascunho" },
  publicar:  { from: ["aprovado"],                     to: "publicado" },
  arquivar:  { from: ["rascunho", "em_revisao", "aprovado", "publicado", "emitido"], to: "arquivado" },
  reabrir:   { from: ["publicado", "arquivado"],       to: "rascunho" },
};

async function executeApprovalAction(
  context: any,
  documento_id: string,
  acao: AprovAcao,
  comentario?: string,
) {
  const { getCriticalClient } = await import("@/lib/supabase-client.server");
    const supabaseAdmin = await getCriticalClient();
  const { data: doc, error: dErr } = await (supabaseAdmin as any)
    .from("documentos")
    .select("id, status, versao, created_by, responsavel_id")
    .eq("id", documento_id)
    .maybeSingle();
  if (dErr) throw friendlyDbError(dErr);
  if (!doc) throw new Error("Documento não encontrado.");

  await assertCanAct(context.supabase, context.userId, acao, doc);

  const rule = TRANSITIONS[acao];
  if (!rule.from.includes(doc.status as DocStatus)) {
    throw new Error(`Não é possível ${acao} um documento no status "${doc.status}".`);
  }

  const { data: prof } = await (context.supabase as any)
    .from("profiles").select("full_name, email").eq("id", context.userId).maybeSingle();
  const actorNome = prof?.full_name || prof?.email || "Usuário";

  const { error: insErr } = await (supabaseAdmin as any).from("documento_aprovacoes").insert({
    documento_id,
    versao: doc.versao,
    acao,
    status_anterior: doc.status,
    status_novo: rule.to,
    comentario: comentario || null,
    actor_user_id: context.userId,
    actor_nome: actorNome,
  });
  if (insErr) throw friendlyDbError(insErr);

  const { error: updErr } = await (supabaseAdmin as any)
    .from("documentos")
    .update({ status: rule.to, updated_at: new Date().toISOString() })
    .eq("id", documento_id);
  if (updErr) throw friendlyDbError(updErr);

  // Auto-trigger Drive upload + HMAC signature on publish
  if (rule.to === "publicado") {
    try {
      await uploadAndSignImpl(supabaseAdmin, documento_id, context.userId, actorNome);
    } catch (e) {
      console.error("[publish side-effects]", e);
      await (supabaseAdmin as any)
        .from("documentos")
        .update({ drive_sync_error: (e as Error).message })
        .eq("id", documento_id);
    }
  }

  // Auto-create Equipamento do Cliente quando orçamento é aprovado (idempotente)
  if (rule.to === "aprovado" && acao === "aprovar") {
    try {
      await autoCreateEquipamentoFromOrcamento(supabaseAdmin, documento_id, context.userId, actorNome);
    } catch (e) {
      console.error("[aprovar orcamento → equipamento]", e);
    }
  }

  return { ok: true, status: rule.to };
}

// Cria um cliente_equipamentos para cada equipamento do payload do orçamento aprovado.
// Idempotente via marcador em observacoes ("[auto:orc:<documento_id>]").
export async function autoCreateEquipamentoFromOrcamento(
  supabaseAdmin: any,
  documento_id: string,
  userId: string,
  actorNome: string,
): Promise<void> {
  const { data: doc } = await supabaseAdmin
    .from("documentos")
    .select("id, codigo, tipo_codigo, cliente_id, oportunidade_id, payload")
    .eq("id", documento_id)
    .maybeSingle();
  if (!doc || doc.tipo_codigo !== "orcamento" || !doc.cliente_id) return;

  const marker = `[auto:orc:${documento_id}]`;

  // Idempotência: se já existe equipamento com esse marker, não recria.
  const { data: existente } = await supabaseAdmin
    .from("cliente_equipamentos")
    .select("id")
    .eq("cliente_id", doc.cliente_id)
    .ilike("observacoes", `${marker}%`)
    .limit(1);
  if (existente && existente.length > 0) return;

  // Última versão para pegar payload atualizado
  const { data: lastVersion } = await supabaseAdmin
    .from("documento_versoes")
    .select("payload")
    .eq("documento_id", documento_id)
    .order("gerado_em", { ascending: false })
    .limit(1)
    .maybeSingle();
  const payload = (lastVersion?.payload ?? doc.payload) as OrcamentoPayload | null;
  if (!payload) return;

  const equipamentos = Array.isArray(payload.equipamentos) ? payload.equipamentos : [];
  if (equipamentos.length === 0) return;

  for (const eq of equipamentos) {
    const modelo = (eq.nome_pt || eq.nome_en || eq.nome_es || "Equipamento").trim().slice(0, 200);
    const valorTotal = Number(eq.valor_unitario ?? 0) * Number(eq.quantidade ?? 1);
    const observacoes =
      `${marker} Criado automaticamente a partir do orçamento ${doc.codigo} (aprovado por ${actorNome}).` +
      (eq.descricao_pt ? `\n\n${eq.descricao_pt}` : "");

    // Deriva template_slug + familia a partir do payload ou do nome
    const modeloLower = modelo.toLowerCase();
    let templateSlug: string | null = (eq as any).template_slug ?? null;
    let templateFamilia: string | null = null;
    let categoria: string = "outro";
    if (!templateSlug) {
      const { data: match } = await supabaseAdmin
        .from("equipamento_planejamento_templates")
        .select("slug, familia")
        .ilike("nome", `%${modelo.slice(0, 40)}%`)
        .limit(1)
        .maybeSingle();
      if (match?.slug) templateSlug = match.slug as string;
      if (match?.familia) templateFamilia = String(match.familia).toLowerCase();
    }
    if (!templateSlug) templateSlug = "desenvolvimento-modelo";

    // Prefer familia do template (fonte da verdade) sobre regex do modelo
    if (templateFamilia === "empacotamento") {
      categoria = modeloLower.match(/envas|dosad|filler/) ? "envase" : "embalagem_secundaria";
    } else if (templateFamilia === "rotulagem") categoria = "rotulagem";
    else if (templateFamilia === "paletizacao") categoria = "paletizacao";
    else if (templateFamilia === "codificacao") categoria = "automacao";
    else if (templateFamilia === "inspecao") categoria = "automacao";
    else if (modeloLower.match(/envas|dosad|filler/)) categoria = "envase";
    else if (modeloLower.match(/rotul|etiquet/)) categoria = "rotulagem";
    else if (modeloLower.match(/palet/)) categoria = "paletizacao";
    else if (modeloLower.match(/transport|esteira/)) categoria = "transporte";
    else if (modeloLower.match(/robot|robô|automa/)) categoria = "automacao";
    else if (modeloLower.match(/sache|pouch|termo|encart|encaix|empacot/)) categoria = "embalagem_secundaria";

    const { data: novoEq } = await supabaseAdmin.from("cliente_equipamentos").insert({
      cliente_id: doc.cliente_id,
      oportunidade_id: doc.oportunidade_id ?? null,
      modelo,
      fabricante: "Solutek",
      categoria,
      status: "planejamento",
      valor_venda: Number.isFinite(valorTotal) ? valorTotal : null,
      observacoes,
      resumo: eq.descricao_pt || null,
      planejamento_template_slug: templateSlug,
    }).select("id").single();

    // Importa etapas do template publicado (fallback para seed antiga se não houver template)
    if (novoEq?.id) {
      try {
        await supabaseAdmin.rpc("import_etapas_do_template", { _eq_id: novoEq.id, _tipo_slug: templateSlug });
      } catch (err) {
        console.warn("[autoCreate] falha import_etapas_do_template", err);
      }

      // Cria revisão inicial dos projetos Mecânico e Elétrico (rev 00, em elaboração)
      try {
        await supabaseAdmin.from("equipamento_projetos").insert([
          {
            equipamento_id: novoEq.id,
            cliente_id: doc.cliente_id,
            oportunidade_id: doc.oportunidade_id ?? null,
            disciplina: "mecanico",
            revisao: "00",
            status: "em_elaboracao",
            fase: "engenharia",
            progresso: 0,
            hh_consumida: 0,
            observacoes: `${marker} Revisão inicial gerada a partir do orçamento ${doc.codigo}.`,
          },
          {
            equipamento_id: novoEq.id,
            cliente_id: doc.cliente_id,
            oportunidade_id: doc.oportunidade_id ?? null,
            disciplina: "eletrico",
            revisao: "00",
            status: "em_elaboracao",
            fase: "engenharia",
            progresso: 0,
            hh_consumida: 0,
            observacoes: `${marker} Revisão inicial gerada a partir do orçamento ${doc.codigo}.`,
          },
        ]);
      } catch (err) {
        console.warn("[autoCreate] falha criar equipamento_projetos", err);
      }
    }
  }


  // Nota na oportunidade (best-effort)
  if (doc.oportunidade_id) {
    await supabaseAdmin
      .from("oportunidade_notas")
      .insert({
        oportunidade_id: doc.oportunidade_id,
        texto: `Orçamento ${doc.codigo} aprovado — ${equipamentos.length} equipamento(s) criado(s) automaticamente na ficha do cliente.`,
        user_id: userId,
      })
      .then(
        () => null,
        () => null,
      );
  }
}


// ============================================================
// Drive upload + HMAC signature
// ============================================================
async function readPdfBytes(supabase: any, path: string): Promise<Uint8Array> {
  const { data, error } = await supabase.storage.from("documentos").download(path);
  if (error) throw new Error(`Storage download falhou (${path}): ${error.message}`);
  const ab = await (data as Blob).arrayBuffer();
  return new Uint8Array(ab);
}

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer);
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function hmacSha256Hex(key: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw", enc.encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, enc.encode(message));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function uploadAndSignImpl(supabase: any, documento_id: string, userId: string, userNome: string) {
  const { ensurePath, uploadFile, getFolderUrl } = await import("./drive.server");

  const { data: doc, error: dErr } = await supabase
    .from("documentos")
    .select("id, codigo, tipo_codigo, versao, cliente_id, titulo")
    .eq("id", documento_id)
    .maybeSingle();
  if (dErr) throw friendlyDbError(dErr);
  if (!doc) throw new Error("Documento não encontrado.");

  const { data: ver } = await supabase
    .from("documento_versoes")
    .select("id, versao, arquivos")
    .eq("documento_id", documento_id)
    .eq("versao", doc.versao)
    .order("gerado_em", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!ver?.arquivos) throw new Error("Versão atual não possui arquivos no Storage.");

  const { data: cli } = await supabase
    .from("clientes").select("codigo, razao_social").eq("id", doc.cliente_id).maybeSingle();
  const now = new Date();
  const yyyymm = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
  const clienteFolder = `${cli?.codigo || doc.cliente_id} - ${(cli?.razao_social || "").slice(0, 80)}`.trim();
  const folderId = await ensurePath(["Clientes", clienteFolder, yyyymm, doc.tipo_codigo, `v${doc.versao}`]);
  const folderUrl = await getFolderUrl(folderId);

  const signingKey = process.env.DOC_SIGNING_KEY;
  if (!signingKey) throw new Error("Emissão de links públicos indisponível — a assinatura de documentos não está configurada.");

  const arquivos = ver.arquivos as Record<string, string>;
  const fileIds: Record<string, string> = {};

  for (const idioma of Object.keys(arquivos)) {
    const path = arquivos[idioma];
    const bytes = await readPdfBytes(supabase, path);
    const sha = await sha256Hex(bytes);
    const ts = new Date().toISOString();
    const payload = { sha256: sha, documento_id, versao: doc.versao, idioma, signed_by: userId, signed_at: ts };
    const hmac = await hmacSha256Hex(signingKey, JSON.stringify(payload));

    await supabase.from("documento_assinaturas").insert({
      documento_id, versao: doc.versao, idioma, storage_path: path,
      sha256: sha, hmac, payload, signed_by: userId, signed_by_nome: userNome, signed_at: ts,
    });

    const fileName = `${doc.codigo}-v${doc.versao}-${idioma}.pdf`;
    const up = await uploadFile({ name: fileName, parentId: folderId, bytes });
    fileIds[idioma] = up.id;
  }

  await supabase
    .from("documentos")
    .update({
      drive_folder_id: folderId,
      drive_file_ids: fileIds,
      drive_url: folderUrl,
      drive_synced_at: new Date().toISOString(),
      drive_sync_error: null,
    })
    .eq("id", documento_id);

  return { folderId, folderUrl, fileIds };
}

// Manual: re-sync / re-sign a documento (admin/manager only)
export const syncDocumentoToDrive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { documento_id: string }) => d)
  .handler(async ({ data, context }) => {
    const [{ data: isAdmin }, { data: isManager }] = await Promise.all([
      context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" }),
      context.supabase.rpc("has_role", { _user_id: context.userId, _role: "manager" }),
    ]);
    if (!isAdmin && !isManager) throw new Error("Apenas manager ou admin podem sincronizar.");
    const { data: prof } = await (context.supabase as any)
      .from("profiles").select("full_name, email").eq("id", context.userId).maybeSingle();
    const nome = prof?.full_name || prof?.email || "Usuário";
    const { getCriticalClient } = await import("@/lib/supabase-client.server");
    const supabaseAdmin = await getCriticalClient();
    const result = await uploadAndSignImpl(supabaseAdmin, data.documento_id, context.userId, nome);
    return { ok: true, ...result };
  });

// Listar assinaturas
export const listAssinaturas = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { documento_id: string }) => d)
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await (context.supabase as any)
      .from("documento_assinaturas")
      .select("*")
      .eq("documento_id", data.documento_id)
      .order("signed_at", { ascending: false });
    if (error) throw friendlyDbError(error);
    return rows || [];
  });

// Verificar integridade (recomputa SHA-256 do PDF no Storage e HMAC)
export const verifyAssinatura = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { assinatura_id: string }) => d)
  .handler(async ({ data, context }) => {
    const { data: a, error } = await (context.supabase as any)
      .from("documento_assinaturas").select("*").eq("id", data.assinatura_id).maybeSingle();
    if (error) throw friendlyDbError(error);
    if (!a) throw new Error("Assinatura não encontrada.");
    const { getCriticalClient } = await import("@/lib/supabase-client.server");
    const supabaseAdmin = await getCriticalClient();
    const bytes = await readPdfBytes(supabaseAdmin, a.storage_path);
    const sha = await sha256Hex(bytes);
    const signingKey = process.env.DOC_SIGNING_KEY;
    if (!signingKey) throw new Error("Emissão de links públicos indisponível — a assinatura de documentos não está configurada.");
    const expectedHmac = await hmacSha256Hex(signingKey, JSON.stringify(a.payload));
    return {
      ok: sha === a.sha256 && expectedHmac === a.hmac,
      sha256_atual: sha,
      sha256_esperado: a.sha256,
      hmac_ok: expectedHmac === a.hmac,
    };
  });

const aprovacaoInput = (d: { documento_id: string; comentario?: string }) => d;

export const submitForReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth]).inputValidator(aprovacaoInput)
  .handler(({ data, context }) => executeApprovalAction(context, data.documento_id, "submeter", data.comentario));

export const approveDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth]).inputValidator(aprovacaoInput)
  .handler(({ data, context }) => executeApprovalAction(context, data.documento_id, "aprovar", data.comentario));

export const rejectDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth]).inputValidator(aprovacaoInput)
  .handler(({ data, context }) => executeApprovalAction(context, data.documento_id, "rejeitar", data.comentario));

export const publishDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth]).inputValidator(aprovacaoInput)
  .handler(({ data, context }) => executeApprovalAction(context, data.documento_id, "publicar", data.comentario));

export const archiveDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth]).inputValidator(aprovacaoInput)
  .handler(({ data, context }) => executeApprovalAction(context, data.documento_id, "arquivar", data.comentario));

export const reopenDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth]).inputValidator(aprovacaoInput)
  .handler(({ data, context }) => executeApprovalAction(context, data.documento_id, "reabrir", data.comentario));

// ============================================================
// FAT — gerar documento (PDF PT/ES/EN) reaproveitando fat_relatorios
// ============================================================
async function ensureFatLayout(supabaseAdmin: any): Promise<DocumentoLayoutConfig> {
  const { data: existing } = await supabaseAdmin
    .from("documento_layout_config").select("*").eq("tipo_codigo", "fat_report").maybeSingle();
  if (existing) return existing as DocumentoLayoutConfig;
  // herdar do orçamento se disponível
  const { data: orc } = await supabaseAdmin
    .from("documento_layout_config").select("*").eq("tipo_codigo", "orcamento").maybeSingle();
  const base = orc
    ? { ...orc, tipo_codigo: "fat_report" }
    : { tipo_codigo: "fat_report", accent_color: "#0F172A", empresa_nome: "SLTK", logo_url: null, empresa_endereco: null, empresa_contato: null, rodape_extra: null };
  await supabaseAdmin.from("documento_layout_config").insert(base);
  return base as DocumentoLayoutConfig;
}

async function ensureFatTipo(supabaseAdmin: any) {
  const { data } = await supabaseAdmin
    .from("documento_tipos").select("codigo, prefixo_codigo").eq("codigo", "fat_report").maybeSingle();
  if (data) return data;
  await supabaseAdmin.from("documento_tipos").insert({
    codigo: "fat_report", nome: "Relatório FAT", prefixo_codigo: "FAT", ativo: true,
  });
  return { codigo: "fat_report", prefixo_codigo: "FAT" };
}

export async function generateFatDocumentInternal(args: {
  fat_id: string;
  documento_id?: string;
  bump?: "minor" | "patch";
  actor_id: string;
}) {
  const { getCriticalClient } = await import("@/lib/supabase-client.server");
    const supabaseAdmin = await getCriticalClient();
  const data = { fat_id: args.fat_id, documento_id: args.documento_id, bump: args.bump };
  const actorId = args.actor_id;

  // Fetch FAT + dependências
  const { data: fat, error: fErr } = await (supabaseAdmin as any)
    .from("fat_relatorios").select("*").eq("id", data.fat_id).maybeSingle();
  if (fErr) throw friendlyDbError(fErr);
  if (!fat) throw new Error("FAT não encontrado.");

  const [{ data: cli }, { data: proc }, { data: insp }, { data: hom }, { data: meds }, { data: rncs }] = await Promise.all([
    (supabaseAdmin as any).from("clientes").select("id, codigo, razao_social").eq("id", fat.cliente_id).maybeSingle(),
    fat.processo_id
      ? (supabaseAdmin as any).from("processos").select("codigo, titulo").eq("id", fat.processo_id).maybeSingle()
      : Promise.resolve({ data: null }),
    fat.inspetor_id
      ? (supabaseAdmin as any).from("profiles").select("full_name, email").eq("id", fat.inspetor_id).maybeSingle()
      : Promise.resolve({ data: null }),
    fat.homologado_por
      ? (supabaseAdmin as any).from("profiles").select("full_name, email").eq("id", fat.homologado_por).maybeSingle()
      : Promise.resolve({ data: null }),
    (supabaseAdmin as any).from("fat_medicoes").select("*").eq("fat_id", data.fat_id).order("ordem"),
    (supabaseAdmin as any).from("fat_rnc").select("*").eq("fat_id", data.fat_id).order("created_at"),
  ]);
  if (!cli) throw new Error("Cliente do FAT não encontrado.");

  const layout = await ensureFatLayout(supabaseAdmin);
  const tipoRow = await ensureFatTipo(supabaseAdmin);

  let docId = data.documento_id ?? null;
  let codigo = "";
  let versao = "1.0.0";
  if (!docId) {
    const { data: prev } = await (supabaseAdmin as any)
      .from("documentos")
      .select("id, codigo, versao")
      .eq("tipo_codigo", "fat_report")
      .contains("payload", { fat_id: data.fat_id })
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (prev) {
      docId = prev.id;
      codigo = prev.codigo;
      versao = bumpVersion(prev.versao || "1.0.0", data.bump || "minor");
    }
  } else {
    const { data: existing } = await (supabaseAdmin as any)
      .from("documentos").select("id, codigo, versao").eq("id", docId).maybeSingle();
    if (!existing) throw new Error("Documento não encontrado.");
    codigo = existing.codigo;
    versao = bumpVersion(existing.versao || "1.0.0", data.bump || "minor");
  }
  if (!codigo) {
    codigo = await nextCodigo(supabaseAdmin, "fat_report", tipoRow.prefixo_codigo || "FAT");
  }

  const fatPayload: FatPdfPayload = {
    cliente: { codigo: cli.codigo, razao_social: cli.razao_social },
    processo: proc ? { codigo: proc.codigo, titulo: proc.titulo } : null,
    fat: {
      codigo: fat.codigo, os_codigo: fat.os_codigo, tag_equipamento: fat.tag_equipamento,
      data_ensaio: fat.data_ensaio, hora_inicio: fat.hora_inicio, local_ensaio: fat.local_ensaio,
      temperatura_c: fat.temperatura_c, umidade_rel: fat.umidade_rel,
      tensao_alimentacao: fat.tensao_alimentacao, motivos_viagem: fat.motivos_viagem,
      periodo_de: fat.periodo_de, periodo_ate: fat.periodo_ate, tecnicos: fat.tecnicos,
      testemunha_nome: fat.testemunha_nome, observacoes_gerais: fat.observacoes_gerais,
      homologado_em: fat.homologado_em, status: fat.status,
    },
    inspetor: { nome: insp?.full_name || insp?.email || "—", email: insp?.email || null },
    homologador: { nome: hom?.full_name || hom?.email || null },
    medicoes: (meds || []).map((m: any) => ({
      ordem: m.ordem, parametro: m.parametro, unidade: m.unidade,
      nominal: m.nominal, tolerancia: m.tolerancia, medido: m.medido, status_auto: m.status_auto,
    })),
    rncs: (rncs || []).map((r: any) => ({
      codigo: r.codigo, titulo: r.titulo, descricao: r.descricao,
      plano_acao: r.plano_acao, prazo: r.prazo, status: r.status,
    })),
  };

  const idiomas: Idioma[] = ["pt", "es", "en"];
  const data_emissao = new Date();
  const yyyymm = `${data_emissao.getFullYear()}${String(data_emissao.getMonth() + 1).padStart(2, "0")}`;
  const arquivos: Record<string, string> = {};
  for (const idioma of idiomas) {
    const buffer = await renderToBuffer(
      React.createElement(FatPdf, {
        codigo, versao, idioma, data: data_emissao, payload: fatPayload, layout,
      }) as any,
    );
    const path = `${cli.codigo}/${yyyymm}/fat_report/${codigo}-v${versao}-${idioma}.pdf`;
    const { error: uErr } = await (supabaseAdmin as any).storage
      .from("documentos")
      .upload(path, buffer, { contentType: "application/pdf", upsert: true });
    if (uErr) throw new Error(`Upload ${idioma} falhou: ${uErr.message}`);
    arquivos[idioma] = path;
  }

  const titulo = `FAT ${fat.codigo} — ${cli.razao_social}`;
  const payloadSnapshot = { fat_id: data.fat_id, fat: fatPayload };

  if (docId) {
    const { error: upErr } = await (supabaseAdmin as any).from("documentos").update({
      versao, status: "rascunho", payload: payloadSnapshot,
      idiomas_gerados: idiomas, titulo,
      updated_at: new Date().toISOString(),
    }).eq("id", docId);
    if (upErr) throw friendlyDbError(upErr);
  } else {
    const { data: ins, error: iErr } = await (supabaseAdmin as any).from("documentos").insert({
      codigo, tipo_codigo: "fat_report",
      cliente_id: fat.cliente_id, oportunidade_id: null,
      titulo, status: "rascunho", idioma_principal: "pt",
      moeda: await moedaDoCliente(supabaseAdmin, fat.cliente_id),
      versao, responsavel_id: fat.inspetor_id || actorId,
      payload: payloadSnapshot, blocos: [],
      idiomas_gerados: idiomas, created_by: actorId,
    }).select("id").single();
    if (iErr) throw friendlyDbError(iErr);
    docId = ins.id;
  }

  const { error: vErr } = await (supabaseAdmin as any).from("documento_versoes").insert({
    documento_id: docId, versao, arquivos, payload: payloadSnapshot, gerado_por: actorId,
  });
  if (vErr) throw friendlyDbError(vErr);

  return { ok: true, documento_id: docId as string, codigo, versao, arquivos };
}

export const generateFatDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { fat_id: string; documento_id?: string; bump?: "minor" | "patch" }) => d)
  .handler(async ({ data, context }) =>
    generateFatDocumentInternal({ ...data, actor_id: context.userId }),
  );


// ============================================================
// SAT — gerar documento (PDF PT/ES/EN) reaproveitando sat_relatorio
// ============================================================
async function ensureSatLayout(supabaseAdmin: any): Promise<DocumentoLayoutConfig> {
  const { data: existing } = await supabaseAdmin
    .from("documento_layout_config").select("*").eq("tipo_codigo", "sat_report").maybeSingle();
  if (existing) return existing as DocumentoLayoutConfig;
  const { data: fat } = await supabaseAdmin
    .from("documento_layout_config").select("*").eq("tipo_codigo", "fat_report").maybeSingle();
  const { data: orc } = fat
    ? { data: fat }
    : await supabaseAdmin.from("documento_layout_config").select("*").eq("tipo_codigo", "orcamento").maybeSingle();
  const base = orc
    ? { ...orc, tipo_codigo: "sat_report" }
    : { tipo_codigo: "sat_report", accent_color: "#0F172A", empresa_nome: "SLTK", logo_url: null, empresa_endereco: null, empresa_contato: null, rodape_extra: null };
  await supabaseAdmin.from("documento_layout_config").insert(base);
  return base as DocumentoLayoutConfig;
}

async function ensureSatTipo(supabaseAdmin: any) {
  const { data } = await supabaseAdmin
    .from("documento_tipos").select("codigo, prefixo_codigo").eq("codigo", "sat_report").maybeSingle();
  if (data) return data;
  await supabaseAdmin.from("documento_tipos").insert({
    codigo: "sat_report", nome: "Relatório SAT", prefixo_codigo: "SAT", ativo: true,
  });
  return { codigo: "sat_report", prefixo_codigo: "SAT" };
}

function pickSig(raw: any): { url: string | null; nome: string | null } {
  if (!raw || typeof raw !== "object") return { url: null, nome: null };
  return {
    url: raw.url ?? raw.image_url ?? raw.data_url ?? null,
    nome: raw.nome ?? raw.signed_by ?? raw.name ?? null,
  };
}

export async function generateSatDocumentInternal(args: {
  sat_id: string;
  documento_id?: string;
  bump?: "minor" | "patch";
  actor_id: string;
}) {
  const { getCriticalClient } = await import("@/lib/supabase-client.server");
    const supabaseAdmin = await getCriticalClient();
  const data = { sat_id: args.sat_id, documento_id: args.documento_id, bump: args.bump };
  const actorId = args.actor_id;

  const { data: sat, error: sErr } = await (supabaseAdmin as any)
    .from("sat_relatorio").select("*").eq("id", data.sat_id).maybeSingle();
  if (sErr) throw friendlyDbError(sErr);
  if (!sat) throw new Error("SAT não encontrado.");

  const [{ data: cli }, { data: proc }, { data: secoes }, { data: anexos }] = await Promise.all([
    (supabaseAdmin as any).from("clientes").select("id, codigo, razao_social").eq("id", sat.cliente_id).maybeSingle(),
    sat.processo_id
      ? (supabaseAdmin as any).from("processos").select("codigo, titulo").eq("id", sat.processo_id).maybeSingle()
      : Promise.resolve({ data: null }),
    (supabaseAdmin as any)
      .from("sat_template_secao")
      .select("id, titulo, descricao, ordem, sat_template_item(id, label, tipo, ordem, opcoes)")
      .eq("template_id", sat.template_id)
      .order("ordem"),
    (supabaseAdmin as any)
      .from("sat_relatorio_anexo")
      .select("nome_final, nome_original, tipo_anexo, drive_view_url")
      .eq("relatorio_id", data.sat_id)
      .is("deleted_at", null)
      .order("created_at"),
  ]);
  if (!cli) throw new Error("Cliente do SAT não encontrado.");

  let tecnicos: Array<{ nome: string; email?: string | null; cargo?: string | null }> = [];
  if (Array.isArray(sat.tecnicos) && sat.tecnicos.length > 0) {
    tecnicos = (sat.tecnicos as any[]).map((t) => ({
      nome: t?.nome || t?.full_name || t?.email || "—",
      email: t?.email ?? null,
      cargo: t?.cargo ?? null,
    }));
  } else if (Array.isArray(sat.tecnico_ids) && sat.tecnico_ids.length > 0) {
    const { data: profs } = await (supabaseAdmin as any)
      .from("profiles").select("id, full_name, email").in("id", sat.tecnico_ids);
    tecnicos = (profs || []).map((p: any) => ({
      nome: p.full_name || p.email || "—", email: p.email, cargo: null,
    }));
  }

  let equipamentos: Array<{ tag: string | null; descricao: string | null }> = [];
  if (Array.isArray(sat.equipamento_ids) && sat.equipamento_ids.length > 0) {
    const { data: eqs } = await (supabaseAdmin as any)
      .from("cliente_equipamentos")
      .select("tag, descricao, modelo, fabricante")
      .in("id", sat.equipamento_ids);
    equipamentos = (eqs || []).map((e: any) => ({
      tag: e.tag || null,
      descricao: [e.descricao, e.modelo, e.fabricante].filter(Boolean).join(" · ") || null,
    }));
  }

  const dados = (sat.dados as Record<string, any>) || {};
  const secoesPayload = (secoes || [])
    .sort((a: any, b: any) => (a.ordem ?? 0) - (b.ordem ?? 0))
    .map((sec: any) => ({
      id: sec.id, titulo: sec.titulo, descricao: sec.descricao,
      itens: ((sec.sat_template_item as any[]) || [])
        .sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0))
        .map((it) => ({
          id: it.id, label: it.label, tipo: it.tipo as SatItemTipo,
          valor: dados[it.id] ?? null, comentario: null,
        })),
    }));

  const sigTec = pickSig(sat.assinatura_tecnico);
  const sigCli = pickSig(sat.assinatura_cliente);

  const satPayload: SatPdfPayload = {
    cliente: { codigo: cli.codigo, razao_social: cli.razao_social },
    processo: proc ? { codigo: proc.codigo, titulo: proc.titulo } : null,
    sat: {
      codigo: sat.codigo, local_endereco: sat.local_endereco,
      periodo_de: sat.periodo_de, periodo_ate: sat.periodo_ate,
      motivos_viagem: sat.motivos_viagem || [], observacoes: sat.observacoes, status: sat.status,
      assinatura_tecnico_url: sigTec.url, assinatura_cliente_url: sigCli.url,
      assinatura_tecnico_nome: sigTec.nome, assinatura_cliente_nome: sigCli.nome,
    },
    tecnicos, equipamentos, secoes: secoesPayload,
    anexos: (anexos || []).map((a: any) => ({
      nome: a.nome_original || a.nome_final, tipo: a.tipo_anexo || "—", url: a.drive_view_url || "",
    })),
  };

  const layout = await ensureSatLayout(supabaseAdmin);
  const tipoRow = await ensureSatTipo(supabaseAdmin);

  let docId = data.documento_id ?? null;
  let codigo = "";
  let versao = "1.0.0";
  if (!docId) {
    const { data: prev } = await (supabaseAdmin as any)
      .from("documentos")
      .select("id, codigo, versao")
      .eq("tipo_codigo", "sat_report")
      .contains("payload", { sat_id: data.sat_id })
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (prev) {
      docId = prev.id; codigo = prev.codigo;
      versao = bumpVersion(prev.versao || "1.0.0", data.bump || "minor");
    }
  } else {
    const { data: existing } = await (supabaseAdmin as any)
      .from("documentos").select("id, codigo, versao").eq("id", docId).maybeSingle();
    if (!existing) throw new Error("Documento não encontrado.");
    codigo = existing.codigo;
    versao = bumpVersion(existing.versao || "1.0.0", data.bump || "minor");
  }
  if (!codigo) {
    codigo = await nextCodigo(supabaseAdmin, "sat_report", tipoRow.prefixo_codigo || "SAT");
  }

  const idiomas: Idioma[] = ["pt", "es", "en"];
  const data_emissao = new Date();
  const yyyymm = `${data_emissao.getFullYear()}${String(data_emissao.getMonth() + 1).padStart(2, "0")}`;
  const arquivos: Record<string, string> = {};
  for (const idioma of idiomas) {
    const buffer = await renderToBuffer(
      React.createElement(SatPdf, {
        codigo, versao, idioma, data: data_emissao, payload: satPayload, layout,
      }) as any,
    );
    const path = `${cli.codigo}/${yyyymm}/sat_report/${codigo}-v${versao}-${idioma}.pdf`;
    const { error: uErr } = await (supabaseAdmin as any).storage
      .from("documentos")
      .upload(path, buffer, { contentType: "application/pdf", upsert: true });
    if (uErr) throw new Error(`Upload ${idioma} falhou: ${uErr.message}`);
    arquivos[idioma] = path;
  }

  const titulo = `SAT ${sat.codigo} — ${cli.razao_social}`;
  const payloadSnapshot = { sat_id: data.sat_id, sat: satPayload };

  if (docId) {
    const { error: upErr } = await (supabaseAdmin as any).from("documentos").update({
      versao, status: "rascunho", payload: payloadSnapshot,
      idiomas_gerados: idiomas, titulo,
      updated_at: new Date().toISOString(),
    }).eq("id", docId);
    if (upErr) throw friendlyDbError(upErr);
  } else {
    const { data: ins, error: iErr } = await (supabaseAdmin as any).from("documentos").insert({
      codigo, tipo_codigo: "sat_report",
      cliente_id: sat.cliente_id, oportunidade_id: null,
      titulo, status: "rascunho", idioma_principal: "pt",
      moeda: await moedaDoCliente(supabaseAdmin, sat.cliente_id),
      versao, responsavel_id: sat.created_by || actorId,
      payload: payloadSnapshot, blocos: [],
      idiomas_gerados: idiomas, created_by: actorId,
    }).select("id").single();
    if (iErr) throw friendlyDbError(iErr);
    docId = ins.id;
  }

  const { error: vErr } = await (supabaseAdmin as any).from("documento_versoes").insert({
    documento_id: docId, versao, arquivos, payload: payloadSnapshot, gerado_por: actorId,
  });
  if (vErr) throw friendlyDbError(vErr);

  return { ok: true, documento_id: docId as string, codigo, versao, arquivos };
}

export const generateSatDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { sat_id: string; documento_id?: string; bump?: "minor" | "patch" }) => d)
  .handler(async ({ data, context }) =>
    generateSatDocumentInternal({ ...data, actor_id: context.userId }),
  );

// ============================================================
// getOrcamentoForEdit — carrega o último payload para reabrir o wizard
// ============================================================
export const getOrcamentoForEdit = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { documento_id: string }) => d)
  .handler(async ({ data, context }) => {
    const { data: doc, error } = await (context.supabase as any)
      .from("documentos")
      .select("id, codigo, tipo_codigo, titulo, status, versao, cliente_id, payload")
      .eq("id", data.documento_id)
      .maybeSingle();
    if (error) throw friendlyDbError(error);
    if (!doc) throw new Error("Documento não encontrado.");
    if (doc.tipo_codigo !== "orcamento") throw new Error("Documento não é um orçamento.");

    const { data: lastVersion } = await (context.supabase as any)
      .from("documento_versoes")
      .select("versao, payload, gerado_em")
      .eq("documento_id", data.documento_id)
      .order("gerado_em", { ascending: false })
      .limit(1)
      .maybeSingle();

    const rawPayload = (lastVersion?.payload || doc.payload) as OrcamentoPayload | (OrcamentoPayload & { _revisao_meta?: unknown });
    // Limpa metadado interno antes de devolver ao wizard
    const { _revisao_meta: _drop, ...payload } = (rawPayload as any) || {};
    void _drop;

    return {
      documento_id: doc.id as string,
      codigo: doc.codigo as string,
      titulo: (doc.titulo as string) || "",
      versao_atual: (doc.versao as string) || "1.0.0",
      status: doc.status as string,
      payload: payload as OrcamentoPayload,
    };
  });

