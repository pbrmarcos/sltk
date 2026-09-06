/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

// Endpoint público para receber submissões de Checklist.
// Aceita JSON com { link_id, respostas, preenchido_por_{nome,email,telefone} }.
// Usa cliente supabase com chave publishable (RLS + policies TO anon).
const submitSchema = z.object({
  slug: z.string().min(3).max(64),
  respostas: z.record(z.string(), z.any()).default({}),
  preenchido_por_nome: z.string().max(200).nullish(),
  preenchido_por_email: z.string().email().max(200).nullish(),
  preenchido_por_telefone: z.string().max(80).nullish(),
});

async function getAdmin() {
  const { getCriticalClient } = await import("@/lib/supabase-client.server");
  const supabaseAdmin = await getCriticalClient();
  return supabaseAdmin as any;
}

export const Route = createFileRoute("/api/public/checklist/submit")({
  server: {
    handlers: {
      OPTIONS: async () =>
        new Response(null, {
          status: 204,
          headers: {
            "access-control-allow-origin": "*",
            "access-control-allow-methods": "POST, OPTIONS",
            "access-control-allow-headers": "content-type",
          },
        }),
      POST: async ({ request }) => {
        try {
          const body = await request.json().catch(() => ({}));
          const parsed = submitSchema.safeParse(body);
          if (!parsed.success) {
            return Response.json({ ok: false, error: "Dados inválidos." }, { status: 400 });
          }
          const supa: any = await getAdmin();

          // 1. Localiza link aberto pelo slug.
          const { data: link, error: eLink } = await supa
            .from("checklist_formulario_link")
            .select("id, cliente_id, tipo_id, idioma, status, expira_em, submissao_id")
            .eq("slug", parsed.data.slug)
            .maybeSingle();
          if (eLink) throw eLink;
          if (!link) {
            return Response.json(
              { ok: false, error: "Formulário não encontrado." },
              { status: 404 },
            );
          }
          if (link.status !== "aberto") {
            return Response.json({ ok: false, error: "Formulário indisponível." }, { status: 410 });
          }
          if (link.expira_em && new Date(link.expira_em).getTime() < Date.now()) {
            return Response.json({ ok: false, error: "Formulário expirado." }, { status: 410 });
          }

          const ua = request.headers.get("user-agent") || null;
          const payload = {
            respostas: parsed.data.respostas ?? {},
            preenchido_por_nome: parsed.data.preenchido_por_nome ?? null,
            preenchido_por_email: parsed.data.preenchido_por_email ?? null,
            preenchido_por_telefone: parsed.data.preenchido_por_telefone ?? null,
            user_agent: ua,
          };

          // 2. Reaproveita submissão-rascunho quando existir (anexos já podem
          //    ter sido enviados). Caso contrário, cria a submissão agora.
          let submissaoId: string | null = link.submissao_id ?? null;
          if (submissaoId) {
            const { error: eUpd } = await supa
              .from("checklist_submissao")
              .update(payload)
              .eq("id", submissaoId);
            if (eUpd) throw eUpd;
          } else {
            const { data: sub, error: eSub } = await supa
              .from("checklist_submissao")
              .insert({
                link_id: link.id,
                cliente_id: link.cliente_id,
                tipo_id: link.tipo_id,
                idioma: link.idioma,
                ...payload,
              })
              .select("id")
              .single();
            if (eSub) throw eSub;
            submissaoId = sub.id as string;
          }

          // 3. Atualiza link.
          await supa
            .from("checklist_formulario_link")
            .update({
              status: "preenchido",
              preenchido_em: new Date().toISOString(),
              submissao_id: submissaoId,
            })
            .eq("id", link.id);

          // 4. Alerta opcional por e-mail (in-app é feito por trigger).
          try {
            const { safeDispatch, appUrl } = await import("@/lib/email/safe-dispatch.server");
            const { data: cli } = await supa
              .from("clientes")
              .select("razao_social, nome_fantasia")
              .eq("id", link.cliente_id)
              .maybeSingle();
            const { data: tipo } = await supa
              .from("checklist_formulario_tipo")
              .select("nome_pt")
              .eq("id", link.tipo_id)
              .maybeSingle();
            await safeDispatch({
              eventKey: "form.checklist.recebida",
              triggeredBy: null,
              triggeredByKind: "automation",
              entityTable: "checklist_submissao",
              entityId: submissaoId,
              vars: {
                cliente: (cli?.razao_social as string) || (cli?.nome_fantasia as string) || "—",
                nome: parsed.data.preenchido_por_nome ?? "—",
                email: parsed.data.preenchido_por_email ?? "—",
                tipo: (tipo?.nome_pt as string) ?? "—",
                link: appUrl("/admin/formularios-recebidos"),
              },
            });
          } catch {
            /* noop */
          }

          return Response.json(
            { ok: true, submissao_id: submissaoId },
            { headers: { "access-control-allow-origin": "*" } },
          );
        } catch (err) {
          const unavailable = err instanceof Error && err.name === "ServiceRoleUnavailableError";
          const msg = unavailable
            ? "Este formulário está temporariamente indisponível. Tente novamente em alguns instantes."
            : err instanceof Error
              ? err.message
              : "Erro interno.";
          return Response.json({ ok: false, error: msg }, { status: 500 });
        }
      },
    },
  },
});
