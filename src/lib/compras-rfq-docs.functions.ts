/* eslint-disable @typescript-eslint/no-explicit-any */
// Geração trilíngue (PT/ES/EN) do documento de Solicitação de Cotação (Checklist)
// a partir de um insumo. Renderiza PDF real usando o MESMO pipeline oficial
// do Central de Documentos (@react-pdf/renderer + blocos + layout config),
// upload no Google Drive e histórico em `insumo_documentos_gerados`.

import { createServerFn } from "@tanstack/react-start";
import { friendlyDbError } from "@/lib/db-errors";
import { z } from "zod";
import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { RfqPdf } from "@/lib/docs/pdf-rfq";
import type { Bloco, DocumentoLayoutConfig, Idioma } from "@/lib/docs/types";

const IDIOMAS = ["pt", "es", "en"] as const;

async function isPurchasing(supabase: any, uid: string): Promise<boolean> {
  const roles = ["admin", "manager", "purchasing"] as const;
  for (const r of roles) {
    const { data } = await supabase.rpc("has_role", { _user_id: uid, _role: r });
    if (data === true) return true;
  }
  return false;
}

/** Gera documento PDF em PT/ES/EN e salva no Google Drive.
 *  Estrutura: Compras / Solicitacoes / {cliente_codigo} / {projeto_codigo} / {tag}
 */
export const gerarDocumentoRfqInsumo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        insumo_id: z.string().uuid(),
        idiomas: z
          .array(z.enum(IDIOMAS))
          .min(1)
          .default([...IDIOMAS]),
        fornecedor_id: z.string().uuid().nullish(),
        nota_compras: z.string().max(2000).optional().nullable(),
      })
      .parse(i),
  )

  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const uid = context.userId;
    if (!(await isPurchasing(sb, uid))) throw new Error("Sem permissão");

    // Carrega insumo + relacionamentos mínimos (cliente/projeto usados APENAS
    // para organizar a pasta no Drive — não aparecem no PDF).
    const { data: ins, error: eIns } = await sb
      .from("projeto_insumos")
      .select(
        "id, descricao, especificacao_tecnica, codigo_interno, fabricante_sugerido, part_number, unidade, quantidade, criticidade, lead_time_desejado_dias, necessidade_em, observacoes, projeto_id, created_at, clientes(codigo, razao_social), equipamento_projetos(revisao, cliente_equipamentos(codigo))",
      )
      .eq("id", data.insumo_id)
      .maybeSingle();
    if (eIns) throw friendlyDbError(eIns);
    if (!ins) throw new Error("Insumo não encontrado.");

    // Blocos configurados na Central de Documentos
    const { data: blocosRaw } = await sb
      .from("documento_blocos")
      .select("*")
      .eq("tipo_codigo", "solicitacao_cotacao")
      .eq("ativo", true)
      .order("ordem_padrao", { ascending: true });
    const blocos = (blocosRaw ?? []) as Bloco[];

    // Layout config (accent/logo/empresa/rodapé) — fallback ao Orçamento e depois default
    const { data: layoutSol } = await sb
      .from("documento_layout_config")
      .select("*")
      .eq("tipo_codigo", "solicitacao_cotacao")
      .maybeSingle();
    let layout: DocumentoLayoutConfig = layoutSol as any;
    if (!layout) {
      const { data: layoutOrc } = await sb
        .from("documento_layout_config")
        .select("*")
        .eq("tipo_codigo", "orcamento")
        .maybeSingle();
      layout = (layoutOrc as any) ?? null;
    }
    if (!layout) {
      layout = {
        tipo_codigo: "solicitacao_cotacao",
        accent_color: "#0B3D91",
        logo_url: null,
        empresa_nome: "Solutek",
        empresa_endereco: null,
        empresa_contato: null,
        rodape_extra: null,
      };
    }

    // Nome do responsável
    const { data: prof } = await sb
      .from("profiles")
      .select("full_name, email")
      .eq("id", uid)
      .maybeSingle();
    const responsavel = prof?.full_name || prof?.email || "Compras";

    // TAG interna do item (aparece no PDF no lugar de cliente/projeto).
    const { itemTag } = await import("@/lib/docs/item-tag");
    const tag = itemTag(ins.id, ins.created_at);

    // Organização interna do Drive continua usando cliente/projeto — não vaza no PDF.
    const cliente_codigo = ins.clientes?.codigo ?? "SEM-CLIENTE";
    const projeto_codigo = ins.equipamento_projetos?.cliente_equipamentos?.codigo ?? "SEM-PROJETO";

    // Código do documento passa a usar a TAG (documento externo sem referência ao projeto).
    const codigoDoc = `Checklist-${tag}`;

    // Versão: extrai o maior v{N} do histórico deste insumo e incrementa.
    const { data: docsPrev } = await sb
      .from("insumo_documentos_gerados")
      .select("file_name")
      .eq("insumo_id", data.insumo_id);
    const maxVer = (docsPrev ?? []).reduce((acc: number, r: { file_name: string | null }) => {
      const m = (r.file_name || "").match(/_v(\d+)_/);
      const n = m ? parseInt(m[1], 10) : 0;
      return n > acc ? n : acc;
    }, 0);
    const versao = String(maxVer + 1);

    // Drive: pasta destino (mesma organização do restante do sistema)
    let folderId: string | null = null;
    let folderUrl: string | null = null;
    let driveOk = true;
    try {
      const { ensurePath, getFolderUrl } = await import("@/lib/docs/drive.server");
      folderId = await ensurePath(["Compras", "Solicitacoes", cliente_codigo, projeto_codigo, tag]);
      folderUrl = await getFolderUrl(folderId);
    } catch {
      driveOk = false;
      folderId = null;
      folderUrl = null;
    }

    const necessidadeEm = ins.necessidade_em
      ? new Date(ins.necessidade_em).toLocaleDateString("pt-BR")
      : "";

    const item = {
      descricao: ins.descricao ?? "",
      especificacao: ins.especificacao_tecnica ?? "",
      fabricante: ins.fabricante_sugerido ?? "",
      part_number: ins.part_number ?? "",
      codigo_interno: ins.codigo_interno ?? "",
      quantidade: String(ins.quantidade ?? ""),
      unidade: ins.unidade ?? "",
      lead_time: ins.lead_time_desejado_dias?.toString() ?? "",
      necessidade_em: necessidadeEm,
      criticidade: String(ins.criticidade ?? ""),
      observacoes: ins.observacoes ?? "",
      tag,
    };

    const results: Array<{
      idioma: Idioma;
      drive_file_id?: string | null;
      drive_view_url?: string | null;
      drive_folder_url?: string | null;
      file_name?: string;
      error?: string;
    }> = [];

    const { getCriticalClient } = await import("@/lib/supabase-client.server");
    const supabaseAdmin = await getCriticalClient();
    const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);

    for (const idioma of data.idiomas as Idioma[]) {
      const buffer = await renderToBuffer(
        React.createElement(RfqPdf, {
          codigo: codigoDoc,
          versao,
          idioma,
          data: new Date(),
          layout,
          blocos,
          item,
          responsavel,
          nota_compras: data.nota_compras ?? null,
        }) as any,
      );

      const fileName = `${codigoDoc}_v${versao}_${idioma}_${stamp}.pdf`;

      // Backup no bucket "documentos" (mesmo bucket usado pelo Orçamento/FAT/SAT)
      try {
        const bucketPath = `${cliente_codigo}/solicitacoes/${projeto_codigo}/${fileName}`;
        await (supabaseAdmin as any).storage
          .from("documentos")
          .upload(bucketPath, buffer, { contentType: "application/pdf", upsert: true });
      } catch {
        // não bloqueia o fluxo do Drive
      }

      let driveFileId: string | null = null;
      let driveViewUrl: string | null = null;

      if (driveOk && folderId) {
        try {
          const { uploadFile } = await import("@/lib/docs/drive.server");
          const up = await uploadFile({
            name: fileName,
            parentId: folderId,
            bytes: new Uint8Array(buffer),
            mimeType: "application/pdf",
          });
          driveFileId = up.id;
          driveViewUrl = up.webViewLink;

          await (supabaseAdmin as any).from("insumo_documentos_gerados").insert({
            insumo_id: data.insumo_id,
            idioma,
            drive_file_id: driveFileId,
            drive_view_url: driveViewUrl,
            drive_folder_id: folderId,
            drive_folder_url: folderUrl,
            file_name: fileName,
            fornecedor_id: data.fornecedor_id ?? null,
            gerado_por: uid,
          });
        } catch (e) {
          results.push({
            idioma,
            error: e instanceof Error ? e.message : "Falha no upload ao Drive",
          });
          continue;
        }
      }

      results.push({
        idioma,
        drive_file_id: driveFileId,
        drive_view_url: driveViewUrl,
        drive_folder_url: folderUrl,
        file_name: fileName,
      });
    }

    return {
      drive_ok: driveOk,
      folder_url: folderUrl,
      documentos: results,
    };
  });

/** Lista o histórico de documentos Checklist gerados para um insumo. */
export const listInsumoDocumentos = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ insumo_id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const { data: rows, error } = await sb
      .from("insumo_documentos_gerados")
      .select("*")
      .eq("insumo_id", data.insumo_id)
      .order("criado_em", { ascending: false })
      .limit(60);
    if (error) throw friendlyDbError(error);
    return (rows ?? []) as Array<{
      id: string;
      idioma: Idioma;
      drive_view_url: string | null;
      drive_folder_url: string | null;
      file_name: string | null;
      criado_em: string;
    }>;
  });

/** Lista global de documentos Checklist gerados, agrupados por batch (insumo + fornecedor + minuto).
 *  Usado pela Central de Documentos para auditoria. */
export const listRfqDocumentosGerados = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        q: z.string().max(120).optional().default(""),
        limit: z.number().int().min(1).max(500).optional().default(200),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const { data: rows, error } = await sb
      .from("insumo_documentos_gerados")
      .select(
        "id, insumo_id, idioma, drive_view_url, drive_folder_url, file_name, fornecedor_id, criado_em, gerado_por, projeto_insumos:insumo_id(descricao, codigo_interno, projeto_id, equipamento_projetos(cliente_equipamentos(codigo))), fornecedores:fornecedor_id(razao_social, nome_fantasia)",
      )
      .order("criado_em", { ascending: false })
      .limit(data.limit);
    if (error) throw friendlyDbError(error);

    type Row = {
      id: string;
      insumo_id: string;
      idioma: Idioma;
      drive_view_url: string | null;
      drive_folder_url: string | null;
      file_name: string | null;
      fornecedor_id: string | null;
      criado_em: string;
      projeto_insumos?: {
        descricao?: string | null;
        codigo_interno?: string | null;
        equipamento_projetos?: { cliente_equipamentos?: { codigo?: string | null } | null } | null;
      } | null;
      fornecedores?: { razao_social?: string | null; nome_fantasia?: string | null } | null;
    };

    const list = (rows ?? []) as Row[];

    // Agrupa por (insumo_id + fornecedor_id + minuto) para consolidar as 3 gerações PT/ES/EN.
    const groups = new Map<
      string,
      {
        key: string;
        insumo_id: string;
        insumo_descricao: string;
        insumo_codigo: string | null;
        projeto_codigo: string | null;
        fornecedor_id: string | null;
        fornecedor_nome: string | null;
        criado_em: string;
        drive_folder_url: string | null;
        idiomas: Partial<
          Record<Idioma, { url: string | null; file_name: string | null; id: string }>
        >;
      }
    >();

    // Buscar filtro q simples sobre fornecedor/insumo/codigo em memória.
    const q = data.q.trim().toLowerCase();
    const matches = (r: Row) => {
      if (!q) return r;
      const hay = [
        r.projeto_insumos?.descricao,
        r.projeto_insumos?.codigo_interno,
        r.projeto_insumos?.equipamento_projetos?.cliente_equipamentos?.codigo,
        r.fornecedores?.razao_social,
        r.fornecedores?.nome_fantasia,
        r.file_name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q) ? r : null;
    };

    for (const r of list) {
      if (!matches(r)) continue;
      const minuteKey = new Date(r.criado_em).toISOString().slice(0, 16);
      const key = `${r.insumo_id}|${r.fornecedor_id ?? "sem"}|${minuteKey}`;
      const g = groups.get(key) ?? {
        key,
        insumo_id: r.insumo_id,
        insumo_descricao: r.projeto_insumos?.descricao ?? "—",
        insumo_codigo: r.projeto_insumos?.codigo_interno ?? null,
        projeto_codigo:
          r.projeto_insumos?.equipamento_projetos?.cliente_equipamentos?.codigo ?? null,
        fornecedor_id: r.fornecedor_id,
        fornecedor_nome: r.fornecedores?.nome_fantasia ?? r.fornecedores?.razao_social ?? null,
        criado_em: r.criado_em,
        drive_folder_url: r.drive_folder_url,
        idiomas: {},
      };
      g.idiomas[r.idioma] = { url: r.drive_view_url, file_name: r.file_name, id: r.id };
      if (new Date(r.criado_em) > new Date(g.criado_em)) g.criado_em = r.criado_em;
      groups.set(key, g);
    }

    return Array.from(groups.values()).sort(
      (a, b) => new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime(),
    );
  });
