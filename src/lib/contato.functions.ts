/* eslint-disable @typescript-eslint/no-explicit-any */
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

import { z } from "zod";

const contactSchema = z.object({
  nome: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(255),
  telefone: z.string().trim().max(40).nullable().optional(),
  assunto: z.string().trim().max(200).nullable().optional(),
  mensagem: z.string().trim().min(5).max(4000),
  aceite: z.literal(true),
  // Honeypot: must be empty
  website: z.string().max(0).optional().default(""),
});

// Rate-limit por IP em memória (best-effort — dev/worker).
const RATE: Map<string, { count: number; resetAt: number }> = new Map();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_PER_WINDOW = 5;

function checkRate(ip: string) {
  const now = Date.now();
  const entry = RATE.get(ip);
  if (!entry || entry.resetAt < now) {
    RATE.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return;
  }
  entry.count += 1;
  if (entry.count > MAX_PER_WINDOW) {
    throw new Error("Muitas mensagens recentes deste IP. Aguarde alguns minutos.");
  }
}

export const enviarContato = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => contactSchema.parse(data))
  .handler(async ({ data }) => {
    // Honeypot
    if (data.website && data.website.length > 0) {
      return { ok: true } as const;
    }

    const req = getRequest();
    const headers = req?.headers;
    const ip =
      headers?.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      headers?.get("cf-connecting-ip") ||
      "unknown";
    checkRate(ip);
    const userAgent = headers?.get("user-agent") ?? null;

    const { getCriticalClient } = await import("@/lib/supabase-client.server");
    const supabaseAdmin = await getCriticalClient();
    const { novoCodigoChamado, novoTokenChamado } = await import("@/lib/suporte-token.server");
    const sb = supabaseAdmin as any;

    // Rate-limit por e-mail em 1h (3 aberturas).
    const desdeH = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count: cEmail } = await sb
      .from("chamados")
      .select("id", { count: "exact", head: true })
      .eq("visitante_email", data.email.trim().toLowerCase())
      .gte("created_at", desdeH);
    if ((cEmail ?? 0) >= 3) {
      throw new Error(
        "Já enviamos várias mensagens deste e-mail recentemente. Aguarde nossa resposta.",
      );
    }

    // Gera codigo + token com retry em colisão.
    let inserted: any = null;
    for (let i = 0; i < 6; i++) {
      const codigo = novoCodigoChamado();
      const t = novoTokenChamado();
      const { data: row, error } = await sb
        .from("chamados")
        .insert({
          codigo,
          token_hash: t.hash,
          origem: "contato_site",
          prioridade: "media",
          visitante_nome: data.nome.trim(),
          visitante_email: data.email.trim().toLowerCase(),
          visitante_telefone: data.telefone?.trim() || null,
          numero_serie: null,
          assunto: data.assunto?.trim() || null,
          descricao_inicial: data.mensagem.trim(),
          ip_criacao: ip !== "unknown" ? ip : null,
          user_agent: userAgent,
        })
        .select("id")
        .single();
      if (!error) {
        inserted = row;
        break;
      }
      if (error.code !== "23505") {
        throw new Error("Não foi possível enviar sua mensagem agora. Tente novamente.");
      }
    }
    if (!inserted) throw new Error("Não foi possível registrar a mensagem. Tente novamente.");

    // Primeira mensagem = corpo enviado pelo visitante.
    await sb.from("chamado_mensagens").insert({
      chamado_id: inserted.id,
      autor_tipo: "visitante",
      autor_nome: data.nome.trim(),
      conteudo: data.mensagem.trim(),
    });

    // Alerta opcional por e-mail (in-app é feito por trigger).
    try {
      const { safeDispatch, appUrl } = await import("@/lib/email/safe-dispatch.server");
      await safeDispatch({
        eventKey: "form.contato.recebido",
        triggeredBy: null,
        triggeredByKind: "automation",
        entityTable: "chamados",
        entityId: inserted.id,
        vars: {
          nome: data.nome.trim(),
          email: data.email.trim().toLowerCase(),
          assunto: data.assunto?.trim() || "—",
          link: appUrl("/admin/formularios-recebidos"),
        },
      });
    } catch {
      /* noop */
    }

    return { ok: true } as const;
  });
