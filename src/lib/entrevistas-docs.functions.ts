/* eslint-disable @typescript-eslint/no-explicit-any */
import { assertCanAccessModule } from "@/lib/admin-guard";
// Geração do PDF da Entrevista Técnica (PT/ES/EN) com backup no bucket
// "documentos" e organização no Google Drive:
//   Comercial / Entrevistas / {segmento} / ENT-{codigo}
// O histórico fica em `entrevista_documentos_gerados` e é exibido na
// Central de Documentos (aba Entrevistas).

import { createServerFn } from "@tanstack/react-start";
import { friendlyDbError } from "@/lib/db-errors";
import { z } from "zod";
import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { EntrevistaPdf } from "@/lib/docs/pdf-entrevista";
import type { DocumentoLayoutConfig, Idioma } from "@/lib/docs/types";

const IDIOMAS = ["pt", "es", "en"] as const;

function slugify(s: string): string {
  return (
    (s || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "sem-segmento"
  );
}

async function loadLayout(sb: any): Promise<DocumentoLayoutConfig> {
  const { data: l } = await sb
    .from("documento_layout_config")
    .select("*")
    .in("tipo_codigo", ["entrevista", "orcamento"])
    .order("tipo_codigo", { ascending: true });
  const rows = (l ?? []) as any[];
  const found = rows.find((r) => r.tipo_codigo === "entrevista") || rows[0];
  return (
    (found as DocumentoLayoutConfig) ?? {
      tipo_codigo: "entrevista",
      accent_color: "#0B3D91",
      logo_url: null,
      empresa_nome: "SLTK Americas",
      empresa_endereco: null,
      empresa_contato: null,
      rodape_extra: null,
    }
  );
}

export const gerarDocumentoEntrevista = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        entrevista_id: z.string().uuid(),
        idiomas: z.array(z.enum(IDIOMAS)).min(1).default(["pt"]),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertCanAccessModule(context.supabase, context.userId, "comercial");
    const sb = context.supabase as any;
    const uid = context.userId;

    const { data: e, error } = await sb
      .from("entrevistas")
      .select(
        "id, codigo, segmento_id, criado_por, lead_nome, lead_email, lead_empresa, status, respondida_em, created_at",
      )
      .eq("id", data.entrevista_id)
      .maybeSingle();
    if (error) throw friendlyDbError(error);
    if (!e) throw new Error("Entrevista não encontrada.");

    const [{ data: seg }, { data: criador }, { data: me }] = await Promise.all([
      sb.from("entrevista_segmentos").select("nome_pt").eq("id", e.segmento_id).maybeSingle(),
      sb.from("profiles").select("full_name, email").eq("id", e.criado_por).maybeSingle(),
      sb.from("profiles").select("full_name, email").eq("id", uid).maybeSingle(),
    ]);

    // Respostas em português canônico
    const { data: resps } = await sb
      .from("entrevista_respostas")
      .select("pergunta_id, valor_text, valor_options, descricao_extra")
      .eq("entrevista_id", e.id);
    const pIds = (resps ?? []).map((r: any) => r.pergunta_id);
    let pMap = new Map<string, { numero: number; enunciado: string }>();
    if (pIds.length) {
      const { data: perg } = await sb
        .from("entrevista_perguntas")
        .select("id, numero, enunciado_pt")
        .in("id", pIds);
      pMap = new Map(
        (perg ?? []).map((p: any) => [p.id, { numero: p.numero, enunciado: p.enunciado_pt }]),
      );
    }
    const respostas = (resps ?? [])
      .map((r: any) => ({
        numero: pMap.get(r.pergunta_id)?.numero ?? 0,
        enunciado: pMap.get(r.pergunta_id)?.enunciado ?? "",
        valor_text: r.valor_text ?? null,
        valor_options: r.valor_options,
        descricao_extra: r.descricao_extra ?? null,
      }))
      .sort((a: any, b: any) => a.numero - b.numero);

    const layout = await loadLayout(sb);
    const segNome = seg?.nome_pt ?? "Sem segmento";
    const codigoDoc = `ENT-${e.codigo}`;

    // Drive
    let folderId: string | null = null;
    let folderUrl: string | null = null;
    let driveOk = true;
    let driveError: string | null = null;
    try {
      const { ensurePath, getFolderUrl } = await import("@/lib/docs/drive.server");
      folderId = await ensurePath(["Comercial", "Entrevistas", slugify(segNome), codigoDoc]);
      folderUrl = await getFolderUrl(folderId);
    } catch (err) {
      driveOk = false;
      driveError = err instanceof Error ? err.message : "Falha no Drive";
    }

    const { getCriticalClient } = await import("@/lib/supabase-client.server");
    const supabaseAdmin = await getCriticalClient();
    const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const results: Array<{
      idioma: Idioma;
      file_name: string;
      drive_view_url: string | null;
      error?: string;
    }> = [];

    for (const idioma of data.idiomas as Idioma[]) {
      const buffer = await renderToBuffer(
        React.createElement(EntrevistaPdf, {
          idioma,
          layout,
          codigo: e.codigo,
          segmento_nome: segNome,
          lead_nome: e.lead_nome ?? null,
          lead_empresa: e.lead_empresa ?? null,
          lead_email: e.lead_email ?? null,
          criador_nome: criador?.full_name || criador?.email || null,
          criada_em: e.created_at,
          respondida_em: e.respondida_em ?? null,
          responsavel: me?.full_name || me?.email || "Comercial",
          respostas,
        }) as any,
      );

      const fileName = `${codigoDoc}_${idioma}_${stamp}.pdf`;
      const storagePath = `entrevistas/${slugify(segNome)}/${codigoDoc}/${fileName}`;
      try {
        await (supabaseAdmin as any).storage
          .from("documentos")
          .upload(storagePath, buffer, { contentType: "application/pdf", upsert: true });
      } catch {
        /* backup não bloqueia */
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
        } catch (err) {
          driveError = err instanceof Error ? err.message : "Falha no upload ao Drive";
        }
      }

      await (supabaseAdmin as any).from("entrevista_documentos_gerados").insert({
        entrevista_id: e.id,
        idioma,
        file_name: fileName,
        storage_path: storagePath,
        drive_file_id: driveFileId,
        drive_view_url: driveViewUrl,
        drive_folder_id: folderId,
        drive_folder_url: folderUrl,
        gerado_por: uid,
      });

      results.push({ idioma, file_name: fileName, drive_view_url: driveViewUrl });
    }

    return {
      ok: true as const,
      drive_ok: driveOk && !driveError,
      drive_error: driveError,
      folder_url: folderUrl,
      documentos: results,
    };
  });

/** Histórico global de PDFs de entrevistas — usado na Central de Documentos. */
export const listEntrevistaDocumentosGerados = createServerFn({ method: "GET" })
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
      .from("entrevista_documentos_gerados")
      .select(
        "id, entrevista_id, idioma, file_name, drive_view_url, drive_folder_url, criado_em, entrevistas:entrevista_id(codigo, lead_nome, lead_empresa, status, segmento_id)",
      )
      .order("criado_em", { ascending: false })
      .limit(data.limit);
    if (error) throw friendlyDbError(error);

    const segIds = Array.from(
      new Set((rows ?? []).map((r: any) => r.entrevistas?.segmento_id).filter(Boolean)),
    );
    let segMap = new Map<string, string>();
    if (segIds.length) {
      const { data: segs } = await sb
        .from("entrevista_segmentos")
        .select("id, nome_pt")
        .in("id", segIds);
      segMap = new Map((segs ?? []).map((s: any) => [s.id, s.nome_pt]));
    }

    const q = (data.q || "").trim().toLowerCase();
    type Row = {
      id: string;
      entrevista_id: string;
      idioma: Idioma;
      file_name: string | null;
      drive_view_url: string | null;
      drive_folder_url: string | null;
      criado_em: string;
      codigo: string;
      lead_nome: string | null;
      lead_empresa: string | null;
      segmento: string;
    };
    const mapped: Row[] = (rows ?? []).map((r: any) => ({
      id: r.id as string,
      entrevista_id: r.entrevista_id as string,
      idioma: r.idioma as Idioma,
      file_name: (r.file_name ?? null) as string | null,
      drive_view_url: (r.drive_view_url ?? null) as string | null,
      drive_folder_url: (r.drive_folder_url ?? null) as string | null,
      criado_em: r.criado_em as string,
      codigo: (r.entrevistas?.codigo ?? "—") as string,
      lead_nome: (r.entrevistas?.lead_nome ?? null) as string | null,
      lead_empresa: (r.entrevistas?.lead_empresa ?? null) as string | null,
      segmento: (segMap.get(r.entrevistas?.segmento_id) ?? "—") as string,
    }));

    if (!q) return mapped;
    return mapped.filter((m: Row) =>
      [m.codigo, m.lead_nome, m.lead_empresa, m.segmento, m.file_name]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    );
  });
