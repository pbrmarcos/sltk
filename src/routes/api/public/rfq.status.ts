/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

// Endpoint público de status: consulta feita pelo remetente da submissão
// usando o slug + protocolo (submissao_id) devolvido no envio.
// Não expõe dados sensíveis — apenas metadados (recebido, em análise, atendido).
const q = z.object({
  slug: z.string().min(3).max(64),
  submissao_id: z.string().uuid(),
});

export const Route = createFileRoute("/api/public/rfq/status")({
  server: {
    handlers: {
      OPTIONS: async () =>
        new Response(null, {
          status: 204,
          headers: {
            "access-control-allow-origin": "*",
            "access-control-allow-methods": "GET, OPTIONS",
            "access-control-allow-headers": "content-type",
          },
        }),
      GET: async ({ request }) => {
        try {
          const url = new URL(request.url);
          const parsed = q.safeParse({
            slug: url.searchParams.get("slug"),
            submissao_id: url.searchParams.get("submissao_id"),
          });
          if (!parsed.success) {
            return Response.json({ ok: false, error: "Parâmetros inválidos." }, { status: 400 });
          }

          const { getCriticalClient } = await import("@/lib/supabase-client.server");
    const supabaseAdmin = await getCriticalClient();

          const { data: sub, error } = await (supabaseAdmin as any)
            .from("rfq_submissao")
            .select(
              "id, criado_em, lida_em, oportunidade_id, respostas, link_id, rfq_formulario_link:link_id(slug, status, preenchido_em)",
            )
            .eq("id", parsed.data.submissao_id)
            .maybeSingle();

          if (error) throw error;
          if (!sub || sub.rfq_formulario_link?.slug !== parsed.data.slug) {
            return Response.json({ ok: false, error: "Protocolo não encontrado." }, { status: 404 });
          }

          const { count: anexosCount } = await (supabaseAdmin as any)
            .from("rfq_submissao_anexo")
            .select("id", { count: "exact", head: true })
            .eq("submissao_id", sub.id);

          const enviado = sub.rfq_formulario_link?.status === "preenchido";
          let etapa: "rascunho" | "recebido" | "em_analise" | "atendido" = "rascunho";
          if (sub.oportunidade_id) etapa = "atendido";
          else if (sub.lida_em) etapa = "em_analise";
          else if (enviado) etapa = "recebido";

          return Response.json(
            {
              ok: true,
              etapa,
              criado_em: sub.criado_em,
              preenchido_em: sub.rfq_formulario_link?.preenchido_em ?? null,
              lida_em: sub.lida_em,
              anexos: anexosCount ?? 0,
              oportunidade: Boolean(sub.oportunidade_id),
            },
            { headers: { "access-control-allow-origin": "*", "cache-control": "no-store" } },
          );
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Erro interno.";
          return Response.json({ ok: false, error: msg }, { status: 500 });
        }
      },
    },
  },
});
