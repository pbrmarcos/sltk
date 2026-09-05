/* eslint-disable @typescript-eslint/no-explicit-any */
import { assertCanAccessModule } from "@/lib/admin-guard";
// Gera PDF trilíngue (PT/ES/EN) de Ordem de Compra e salva no Google Drive
// dentro da mesma árvore usada nas Solicitações do insumo:
//   Compras / Solicitacoes / {cliente} / {projeto} / {TAG} / OC / v{N} /

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { OcPdf } from "@/lib/docs/pdf-oc";
import type { DocumentoLayoutConfig, Idioma } from "@/lib/docs/types";

const IDIOMAS: Idioma[] = ["pt", "es", "en"];

async function loadLayout(sb: any): Promise<DocumentoLayoutConfig> {
  const { data: layoutOc } = await sb
    .from("documento_layout_config")
    .select("*")
    .eq("tipo_codigo", "orcamento")
    .maybeSingle();
  if (layoutOc) return layoutOc as any;
  return {
    tipo_codigo: "ordem_compra",
    accent_color: "#0B3D91",
    logo_url: null,
    empresa_nome: "Solutek",
    empresa_endereco: null,
    empresa_contato: null,
    rodape_extra: null,
  } as any;
}

export const gerarDocumentoOc = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ ordem_compra_id: z.string().uuid() }).parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertCanAccessModule(context.supabase, context.userId, "compras");
    const sb = context.supabase as any;
    const uid = context.userId;

    const { data: oc, error } = await sb
      .from("ordens_compra")
      .select("*")
      .eq("id", data.ordem_compra_id)
      .maybeSingle();
    if (error || !oc) throw new Error(error?.message ?? "OC não encontrada");

    const { data: itens } = await sb
      .from("ordem_compra_itens")
      .select("*")
      .eq("ordem_compra_id", oc.id)
      .order("ordem", { ascending: true });

    // Se OC foi gerada a partir de um insumo, associamos ao mesmo folder
    // e usamos a mesma TAG.
    const primeiroItem = (itens ?? [])[0] as any | undefined;
    const insumoId = primeiroItem?.insumo_id ?? null;
    let cliente_codigo = "SEM-CLIENTE";
    let projeto_codigo = "SEM-PROJETO";
    let tag = oc.numero;
    let aprovadorNome: string | null = null;

    if (insumoId) {
      const { data: ins } = await sb
        .from("projeto_insumos")
        .select("id, created_at, clientes(codigo), equipamento_projetos(cliente_equipamentos(codigo))")
        .eq("id", insumoId)
        .maybeSingle();
      if (ins) {
        cliente_codigo = ins.clientes?.codigo ?? cliente_codigo;
        projeto_codigo = ins.equipamento_projetos?.cliente_equipamentos?.codigo ?? projeto_codigo;
        const { itemTag } = await import("@/lib/docs/item-tag");
        tag = itemTag(ins.id, ins.created_at);
      }
      const { data: aprov } = await sb
        .from("insumo_aprovacoes_oc")
        .select("decidido_por, decisao")
        .eq("insumo_id", insumoId)
        .eq("decisao", "aprovado")
        .order("decidido_em", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (aprov?.decidido_por) {
        const { data: p } = await sb
          .from("profiles")
          .select("nome, full_name, email")
          .eq("id", aprov.decidido_por)
          .maybeSingle();
        aprovadorNome = p?.nome || p?.full_name || p?.email || null;
      }
    }

    const layout = await loadLayout(sb);

    const { data: prof } = await sb
      .from("profiles")
      .select("nome, full_name, email")
      .eq("id", uid)
      .maybeSingle();
    const responsavel = prof?.nome || prof?.full_name || prof?.email || "Compras";

    // Versão baseada em documentos anteriores desta OC (bucket documentos)
    const { data: prev } = await sb
      .from("insumo_documentos_gerados")
      .select("file_name")
      .eq("insumo_id", insumoId ?? "00000000-0000-0000-0000-000000000000");
    const maxV = (prev ?? []).reduce((acc: number, r: { file_name: string | null }) => {
      const m = (r.file_name || "").match(/^OC-[^_]+_v(\d+)_/);
      const n = m ? parseInt(m[1], 10) : 0;
      return n > acc ? n : acc;
    }, 0);
    const versao = String(maxV + 1);

    // Drive folder
    let folderId: string | null = null;
    let folderUrl: string | null = null;
    let driveOk = true;
    try {
      const { ensurePath, getFolderUrl } = await import("@/lib/docs/drive.server");
      folderId = await ensurePath([
        "Compras",
        "Solicitacoes",
        cliente_codigo,
        projeto_codigo,
        tag,
        "OC",
        `v${versao}`,
      ]);
      folderUrl = await getFolderUrl(folderId);
    } catch {
      driveOk = false;
    }

    const codigoDoc = `OC-${oc.numero}`;
    const emissao = oc.emissao_em ? new Date(oc.emissao_em) : new Date();

    const fornecedor = {
      razao_social: oc.fornecedor_razao_social || "",
      nome_fantasia: oc.fornecedor_nome_fantasia,
      tax_id: oc.fornecedor_cnpj,
      endereco: oc.fornecedor_endereco,
      cidade: oc.fornecedor_cidade,
      uf: oc.fornecedor_uf,
      pais: oc.fornecedor_pais,
      telefone: oc.fornecedor_telefone,
      email: oc.fornecedor_email,
      contato: oc.fornecedor_contato,
    };

    const itensPdf = (itens ?? []).map((it: any) => ({
      codigo: it.codigo_produto,
      descricao: it.descricao,
      unidade: it.unidade || "UN",
      quantidade: Number(it.quantidade ?? 0),
      valor_unitario: Number(it.valor_unitario ?? 0),
    }));

    const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const { getCriticalClient } = await import("@/lib/supabase-client.server");
    const supabaseAdmin = await getCriticalClient();
    const results: Array<{ idioma: Idioma; drive_view_url?: string | null; file_name?: string; error?: string }> = [];

    for (const idioma of IDIOMAS) {
      const buffer = await renderToBuffer(
        React.createElement(OcPdf, {
          idioma,
          layout,
          codigo: codigoDoc,
          versao,
          tag,
          emissao,
          fornecedor,
          moeda: oc.moeda || "BRL",
          incoterm: oc.incoterm,
          condicao_pagamento: oc.condicao_pagamento,
          entrega_prevista: oc.entrega_prevista
            ? new Date(oc.entrega_prevista).toLocaleDateString(
                idioma === "pt" ? "pt-BR" : idioma === "es" ? "es-ES" : "en-US",
              )
            : null,
          observacoes: oc.observacoes,
          responsavel,
          aprovador: aprovadorNome,
          itens: itensPdf,
          valor_frete: Number(oc.valor_frete ?? 0),
        }) as any,
      );

      const fileName = `${codigoDoc}_v${versao}_${idioma}_${stamp}.pdf`;

      try {
        const bucketPath = `${cliente_codigo}/ordens-compra/${projeto_codigo}/${fileName}`;
        await (supabaseAdmin as any).storage
          .from("documentos")
          .upload(bucketPath, buffer, { contentType: "application/pdf", upsert: true });
      } catch {
        /* backup opcional */
      }

      if (driveOk && folderId) {
        try {
          const { uploadFile } = await import("@/lib/docs/drive.server");
          const up = await uploadFile({
            name: fileName,
            parentId: folderId,
            bytes: new Uint8Array(buffer),
            mimeType: "application/pdf",
          });
          if (insumoId) {
            await (supabaseAdmin as any).from("insumo_documentos_gerados").insert({
              insumo_id: insumoId,
              idioma,
              drive_file_id: up.id,
              drive_view_url: up.webViewLink,
              drive_folder_id: folderId,
              drive_folder_url: folderUrl,
              file_name: fileName,
              gerado_por: uid,
            });
          }
          results.push({ idioma, drive_view_url: up.webViewLink, file_name: fileName });
        } catch (e) {
          results.push({ idioma, error: e instanceof Error ? e.message : "Falha upload Drive" });
        }
      } else {
        results.push({ idioma, file_name: fileName });
      }
    }

    return { drive_ok: driveOk, folder_url: folderUrl, documentos: results, versao };
  });
