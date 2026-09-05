/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute } from "@tanstack/react-router";

// Upload público de anexo (PDF/JPG/PNG até 50 MB) para um formulário RFQ.
// Envia ao Google Drive dentro da pasta do cliente e registra em
// rfq_submissao_anexo.

const MAX_BYTES = 50 * 1024 * 1024;
const ALLOWED = new Set(["application/pdf", "image/png", "image/jpeg", "image/jpg"]);
const EXT: Record<string, string> = {
  "application/pdf": "pdf",
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
};

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "POST, OPTIONS",
  "access-control-allow-headers": "content-type",
};

async function getAdmin() {
  const { getCriticalClient } = await import("@/lib/supabase-client.server");
  const supabaseAdmin = await getCriticalClient();
  return supabaseAdmin as any;
}

function safeSeg(s: string, max = 60): string {
  return (s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\\/:*?"<>|]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function stampName(campoId: string | null, mime: string, original: string): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const ts =
    d.getFullYear().toString() +
    pad(d.getMonth() + 1) +
    pad(d.getDate()) +
    "-" +
    pad(d.getHours()) +
    pad(d.getMinutes()) +
    pad(d.getSeconds());
  const ext = EXT[mime] ?? original.split(".").pop() ?? "bin";
  const base = safeSeg(original.replace(/\.[a-zA-Z0-9]+$/, ""), 40) || "anexo";
  const campo = campoId ? safeSeg(campoId, 20) + "_" : "";
  return `${campo}${ts}_${base}.${ext}`;
}

export const Route = createFileRoute("/api/public/rfq/upload")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      POST: async ({ request }) => {
        try {
          const form = await request.formData();
          const slug = String(form.get("slug") || "");
          const submissaoId = String(form.get("submissao_id") || "");
          const campoId = form.get("campo_id") ? String(form.get("campo_id")) : null;
          const file = form.get("file");
          if (!slug || !submissaoId || !(file instanceof File)) {
            return Response.json(
              { ok: false, error: "Requisição inválida." },
              { status: 400, headers: CORS },
            );
          }
          if (!ALLOWED.has(file.type)) {
            return Response.json(
              { ok: false, error: "Formato não permitido (use PDF, JPG ou PNG)." },
              { status: 415, headers: CORS },
            );
          }
          if (file.size > MAX_BYTES) {
            return Response.json(
              { ok: false, error: "Arquivo maior que 50 MB." },
              { status: 413, headers: CORS },
            );
          }

          const supa: any = await getAdmin();
          const { data: link, error: eLink } = await supa
            .from("rfq_formulario_link")
            .select("id, cliente_id, status, expira_em, submissao_id, slug")
            .eq("slug", slug)
            .maybeSingle();
          if (eLink) throw eLink;
          if (!link || link.submissao_id !== submissaoId) {
            return Response.json(
              { ok: false, error: "Formulário não encontrado." },
              { status: 404, headers: CORS },
            );
          }
          if (link.status !== "aberto") {
            return Response.json(
              { ok: false, error: "Formulário indisponível." },
              { status: 410, headers: CORS },
            );
          }
          if (link.expira_em && new Date(link.expira_em).getTime() < Date.now()) {
            return Response.json(
              { ok: false, error: "Formulário expirado." },
              { status: 410, headers: CORS },
            );
          }

          const { data: cli } = await supa
            .from("clientes")
            .select("codigo, razao_social")
            .eq("id", link.cliente_id)
            .maybeSingle();
          const clienteFolder = safeSeg(
            `${cli?.codigo ?? "CLI"} - ${cli?.razao_social ?? "Cliente"}`,
            80,
          );

          const bytes = new Uint8Array(await file.arrayBuffer());
          const originalName = (file as File).name || "anexo";
          const finalName = stampName(campoId, file.type, originalName);

          const { ensurePath, uploadFile } = await import("@/lib/docs/drive.server");
          const folderId = await ensurePath([
            "Solutek",
            "Clientes",
            clienteFolder,
            "RFQ",
            safeSeg(link.slug, 80),
          ]);
          const up = await uploadFile({
            name: finalName,
            parentId: folderId,
            bytes,
            mimeType: file.type,
          });

          const { data: anexo, error: eAnx } = await supa
            .from("rfq_submissao_anexo")
            .insert({
              submissao_id: submissaoId,
              campo_id: campoId,
              nome: finalName,
              nome_original: originalName,
              mime: file.type,
              tamanho_bytes: file.size,
              drive_file_id: up.id,
              drive_view_url: up.webViewLink,
              drive_folder_id: folderId,
            })
            .select("id, nome, nome_original, mime, tamanho_bytes, drive_view_url, campo_id")
            .single();
          if (eAnx) throw eAnx;

          return Response.json({ ok: true, anexo }, { headers: CORS });
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Erro no upload.";
          return Response.json({ ok: false, error: msg }, { status: 500, headers: CORS });
        }
      },
    },
  },
});
