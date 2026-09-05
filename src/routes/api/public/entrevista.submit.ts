/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { getSupabasePublicConfig } from "@/integrations/supabase/config";
import type { Database } from "@/integrations/supabase/types";

function getPublicSupabase() {
  const { url, publishableKey } = getSupabasePublicConfig();
  return createClient<Database>(url, publishableKey, {
    auth: {
      storage: undefined,
      persistSession: false,
      autoRefreshToken: false,
    },
  }) as any;
}

const cors = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "POST, OPTIONS",
  "access-control-allow-headers": "content-type",
};

const submitSchema = z.object({
  codigo: z.string().min(4).max(12),
  idioma: z.enum(["pt", "es", "en"]).optional(),
  user_agent: z.string().max(500).nullable().optional(),
  contato: z
    .object({
      nome: z.string().max(200).nullable().optional(),
      email: z.string().max(200).nullable().optional(),
      whatsapp: z.string().max(80).nullable().optional(),
      cargo: z.string().max(120).nullable().optional(),
    })
    .optional(),
  respostas: z
    .array(
      z.object({
        pergunta_id: z.string().uuid(),
        valor_text: z.string().max(4000).nullable().optional(),
        valor_options: z.array(z.string().max(500)).nullable().optional(),
        descricao_extra: z.string().max(2000).nullable().optional(),
      }),
    )
    .max(1000),
});

export const Route = createFileRoute("/api/public/entrevista/submit")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: cors }),
      POST: async ({ request }) => {
        try {
          const body = await request.json().catch(() => ({}));
          const parsed = submitSchema.safeParse(body);
          if (!parsed.success)
            return Response.json({ ok: false, error: "invalid" }, { status: 400, headers: cors });

          const sb = getPublicSupabase();
          const codigo = parsed.data.codigo.toUpperCase();
          const { data: result, error } = await sb.rpc("submit_public_entrevista", {
            _codigo: codigo,
            _idioma: parsed.data.idioma ?? "pt",
            _contato: parsed.data.contato ?? {},
            _respostas: parsed.data.respostas,
          });
          if (error) throw error;

          if (!result?.ok) {
            const status =
              result?.error === "not_found" ? 404 : result?.error === "invalid" ? 400 : 410;
            return Response.json(result ?? { ok: false, error: "erro" }, { status, headers: cors });
          }

          // e-mail para criador + cc manager/admin (event_recipients)
          try {
            const { getCriticalClient } = await import("@/lib/supabase-client.server");
            const supabaseAdmin = await getCriticalClient();
            const { safeDispatch } = await import("@/lib/email/safe-dispatch.server");
            const { data: ent } = await supabaseAdmin
              .from("entrevistas")
              .select("id, codigo, segmento_id, criado_por, lead_nome")
              .eq("codigo", codigo)
              .maybeSingle();
            if (!ent) throw new Error("entrevista_not_found_after_submit");
            const [{ data: seg }, { data: prof }] = await Promise.all([
              supabaseAdmin
                .from("entrevista_segmentos")
                .select("nome_pt")
                .eq("id", ent.segmento_id)
                .maybeSingle(),
              supabaseAdmin.from("profiles").select("email").eq("id", ent.criado_por).maybeSingle(),
            ]);
            const base = process.env.PUBLIC_APP_URL || "https://sltkamericas.com";
            await safeDispatch({
              eventKey: "entrevista.respondida",
              triggeredBy: null,
              triggeredByKind: "automation",
              entityTable: "entrevistas",
              entityId: ent.id,
              vars: {
                codigo: ent.codigo,
                segmento: seg?.nome_pt ?? "—",
                lead_nome: ent.lead_nome ?? "",
                link_detalhe: `${base}/comercial/entrevistas/${ent.id}`,
                link: `${base}/comercial/entrevistas/${ent.id}`,
              },
              extraTo: prof?.email ? [prof.email] : [],
            });
          } catch {
            /* noop */
          }

          return Response.json({ ok: true }, { headers: cors });
        } catch (e) {
          const msg = e instanceof Error ? e.message : "erro";
          return Response.json({ ok: false, error: msg }, { status: 500, headers: cors });
        }
      },
    },
  },
});
