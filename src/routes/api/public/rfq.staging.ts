/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

// Cria (ou reaproveita) uma submissão-rascunho para o slug informado.
// Usada quando o formulário tem campos de anexo — assim os uploads podem
// referenciar um `submissao_id` antes do submit final.
const schema = z.object({ slug: z.string().min(3).max(96) });

async function getAdmin() {
  const { getCriticalClient } = await import("@/lib/supabase-client.server");
    const supabaseAdmin = await getCriticalClient();
  return supabaseAdmin as any;
}

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "POST, OPTIONS",
  "access-control-allow-headers": "content-type",
};

export const Route = createFileRoute("/api/public/rfq/staging")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      POST: async ({ request }) => {
        try {
          const body = await request.json().catch(() => ({}));
          const parsed = schema.safeParse(body);
          if (!parsed.success) {
            return Response.json({ ok: false, error: "Dados inválidos." }, { status: 400, headers: CORS });
          }
          const supa: any = await getAdmin();
          const { data: link, error: eLink } = await supa
            .from("rfq_formulario_link")
            .select("id, cliente_id, tipo_id, idioma, status, expira_em, submissao_id")
            .eq("slug", parsed.data.slug)
            .maybeSingle();
          if (eLink) throw eLink;
          if (!link) return Response.json({ ok: false, error: "Formulário não encontrado." }, { status: 404, headers: CORS });
          if (link.status !== "aberto") return Response.json({ ok: false, error: "Formulário indisponível." }, { status: 410, headers: CORS });
          if (link.expira_em && new Date(link.expira_em).getTime() < Date.now()) {
            return Response.json({ ok: false, error: "Formulário expirado." }, { status: 410, headers: CORS });
          }

          if (link.submissao_id) {
            return Response.json({ ok: true, submissao_id: link.submissao_id }, { headers: CORS });
          }

          const { data: sub, error: eSub } = await supa
            .from("rfq_submissao")
            .insert({
              link_id: link.id,
              cliente_id: link.cliente_id,
              tipo_id: link.tipo_id,
              idioma: link.idioma,
              respostas: {},
            })
            .select("id")
            .single();
          if (eSub) throw eSub;

          await supa
            .from("rfq_formulario_link")
            .update({ submissao_id: sub.id })
            .eq("id", link.id);

          return Response.json({ ok: true, submissao_id: sub.id }, { headers: CORS });
        } catch (err) {
          console.error("[rfq.staging]", err);
          const msg =
            err && typeof err === "object" && "message" in err
              ? String((err as { message: unknown }).message)
              : "Erro interno.";
          return Response.json({ ok: false, error: msg }, { status: 500, headers: CORS });
        }
      },
    },
  },
});
