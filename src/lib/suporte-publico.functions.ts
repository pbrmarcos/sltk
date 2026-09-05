/* eslint-disable @typescript-eslint/no-explicit-any */
// Server functions PÚBLICAS do módulo de suporte/chamados.
// Não usam middleware — o gate é o token HMAC ou o par (codigo + email).
// Usamos supabaseAdmin (RLS bypass) porque não há sessão do visitante;
// toda validação/rate-limit fica aqui.

import { createServerFn } from "@tanstack/react-start";
import { friendlyDbError } from "@/lib/db-errors";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";

const abrirSchema = z.object({
  nome: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(255),
  telefone: z.string().trim().max(40).optional().nullable(),
  numero_serie: z.string().trim().min(1).max(80),
  assunto: z.string().trim().max(200).optional().nullable(),
  descricao: z.string().trim().min(3).max(4000),
  aceite: z.literal(true, { message: "É preciso aceitar os termos." }),
});

const enviarSchema = z.object({
  token: z.string().min(10).max(200),
  conteudo: z.string().trim().min(1).max(4000),
});

const acaoSchema = z.object({
  token: z.string().min(10).max(200),
  acao: z.enum(["resolver", "reabrir"]),
});

const resolverCodigoSchema = z.object({
  codigo: z.string().trim().min(1).max(40),
  email: z.string().trim().email().max(255),
});

const getSchema = z.object({ token: z.string().min(10).max(200) });

function clientIp(): string | null {
  try {
    const req = getRequest();
    const h = req?.headers;
    if (!h) return null;
    const xff = h.get("x-forwarded-for");
    if (xff) return xff.split(",")[0]!.trim();
    return h.get("cf-connecting-ip") ?? h.get("x-real-ip") ?? null;
  } catch {
    return null;
  }
}
function clientUA(): string | null {
  try {
    return getRequest()?.headers.get("user-agent") ?? null;
  } catch {
    return null;
  }
}

/** DTO seguro devolvido ao visitante — nunca vazamos e-mail interno / user ids. */
function publicMensagemDTO(m: any) {
  return {
    id: m.id as string,
    autor_tipo: m.autor_tipo as "visitante" | "atendente" | "sistema",
    autor_nome: (m.autor_nome as string) ?? "Atendente",
    conteudo: m.conteudo as string,
    created_at: m.created_at as string,
  };
}
function publicChamadoDTO(c: any) {
  return {
    id: c.id as string,
    codigo: c.codigo as string,
    status: c.status as string,
    visitante_nome: c.visitante_nome as string,
    assunto: (c.assunto as string) ?? null,
    numero_serie: c.numero_serie as string,
    created_at: c.created_at as string,
    resolvido_em: (c.resolvido_em as string) ?? null,
  };
}

export const publicAbrirChamado = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => abrirSchema.parse(i))
  .handler(async ({ data }) => {
    const { getCriticalClient } = await import("@/lib/supabase-client.server");
    const supabaseAdmin = await getCriticalClient();
    const { novoCodigoChamado, novoTokenChamado } = await import("@/lib/suporte-token.server");
    const sb = supabaseAdmin as any;

    // Rate-limit por IP: 5 aberturas em 15 min.
    const ip = clientIp();
    if (ip) {
      const desde = new Date(Date.now() - 15 * 60 * 1000).toISOString();
      const { count } = await sb
        .from("chamados")
        .select("id", { count: "exact", head: true })
        .eq("ip_criacao", ip)
        .gte("created_at", desde);
      if ((count ?? 0) >= 5) {
        throw new Error("Muitas aberturas recentes. Aguarde alguns minutos e tente novamente.");
      }
    }
    // Rate-limit por e-mail: 3 aberturas em 1h.
    const desdeH = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count: cEmail } = await sb
      .from("chamados")
      .select("id", { count: "exact", head: true })
      .eq("visitante_email", data.email.toLowerCase())
      .gte("created_at", desdeH);
    if ((cEmail ?? 0) >= 3) {
      throw new Error(
        "Já há chamados abertos recentemente para este e-mail. Use o código para continuar a conversa.",
      );
    }

    // Match automático de equipamento (não falha se não achar).
    let equipamento_id: string | null = null;
    let cliente_id: string | null = null;
    const { data: eq } = await sb
      .from("cliente_equipamentos")
      .select("id, cliente_id")
      .ilike("numero_serie", data.numero_serie.trim())
      .limit(1)
      .maybeSingle();
    if (eq?.id) {
      equipamento_id = eq.id as string;
      cliente_id = (eq.cliente_id as string) ?? null;
    }

    // Gera codigo + token com retry em colisão.
    let codigo = "";
    let tokenRaw = "";
    let tokenHash = "";
    let inserted: any = null;
    for (let i = 0; i < 6; i++) {
      codigo = novoCodigoChamado();
      const t = novoTokenChamado();
      tokenRaw = t.token;
      tokenHash = t.hash;
      const { data: row, error } = await sb
        .from("chamados")
        .insert({
          codigo,
          token_hash: tokenHash,
          origem: "site_publico",
          visitante_nome: data.nome.trim(),
          visitante_email: data.email.trim().toLowerCase(),
          visitante_telefone: data.telefone?.trim() || null,
          numero_serie: data.numero_serie.trim(),
          assunto: data.assunto?.trim() || null,
          descricao_inicial: data.descricao.trim(),
          equipamento_id,
          cliente_id,
          ip_criacao: ip,
          user_agent: clientUA(),
        })
        .select("id, codigo")
        .single();
      if (!error) {
        inserted = row;
        break;
      }
      // 23505 = unique violation → colisão codigo/token: retry.
      if (error.code !== "23505") throw friendlyDbError(error);
    }
    if (!inserted) throw new Error("Não foi possível gerar o código. Tente novamente.");

    // Primeira mensagem = descrição inicial do visitante.
    await sb.from("chamado_mensagens").insert({
      chamado_id: inserted.id,
      autor_tipo: "visitante",
      autor_nome: data.nome.trim(),
      conteudo: data.descricao.trim(),
    });

    // Hook de notificação (por ora só marca evento — e-mail entra depois).
    await sb.from("chamado_eventos").insert({
      chamado_id: inserted.id,
      tipo: "notificacao_pendente",
      autor_nome: "Sistema",
      meta: { canal: "email", destino: data.email.trim().toLowerCase() },
    });

    try {
      const { safeDispatch, appUrl, fmtDate } = await import("@/lib/email/safe-dispatch.server");
      let clienteNome = data.nome.trim();
      if (cliente_id) {
        const { data: cliente } = await sb
          .from("clientes")
          .select("razao_social, nome_fantasia")
          .eq("id", cliente_id)
          .maybeSingle();
        clienteNome = cliente?.nome_fantasia || cliente?.razao_social || clienteNome;
      }
      const { data: chamadoCriado } = await sb
        .from("chamados")
        .select("prioridade")
        .eq("id", inserted.id)
        .maybeSingle();
      await safeDispatch({
        eventKey: "chamado.aberto",
        triggeredBy: null,
        triggeredByKind: "automation",
        entityTable: "chamados",
        entityId: inserted.id,
        vars: {
          numero: inserted.codigo,
          codigo: inserted.codigo,
          titulo: data.assunto?.trim() || "Sem assunto",
          cliente_nome: clienteNome,
          prioridade: chamadoCriado?.prioridade ?? "",
          categoria: "",
          usuario: data.nome.trim(),
          descricao: data.descricao.trim(),
          data: fmtDate(),
          link: appUrl(`/pos-vendas/chamados/${inserted.id}`),
        },
      });
    } catch (e) {
      console.error("[suporte-publico/publicAbrirChamado] email dispatch failed", e);
    }

    return {
      codigo: inserted.codigo as string,
      token: tokenRaw,
      chamado_id: inserted.id as string,
    };
  });

export const publicGetChamado = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => getSchema.parse(i))
  .handler(async ({ data }) => {
    const { getCriticalClient } = await import("@/lib/supabase-client.server");
    const supabaseAdmin = await getCriticalClient();
    const { hashToken } = await import("@/lib/suporte-token.server");
    const sb = supabaseAdmin as any;

    const hash = hashToken(data.token);
    const { data: chamado, error } = await sb
      .from("chamados")
      .select("*")
      .eq("token_hash", hash)
      .maybeSingle();
    if (error) throw friendlyDbError(error);
    if (!chamado) throw new Error("Chamado não encontrado. Verifique o link.");

    const { data: msgs } = await sb
      .from("chamado_mensagens")
      .select("*")
      .eq("chamado_id", chamado.id)
      .order("created_at", { ascending: true });

    return {
      chamado: publicChamadoDTO(chamado),
      mensagens: (msgs ?? []).map(publicMensagemDTO),
    };
  });

export const publicEnviarMensagem = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => enviarSchema.parse(i))
  .handler(async ({ data }) => {
    const { getCriticalClient } = await import("@/lib/supabase-client.server");
    const supabaseAdmin = await getCriticalClient();
    const { hashToken } = await import("@/lib/suporte-token.server");
    const sb = supabaseAdmin as any;

    const { data: chamado } = await sb
      .from("chamados")
      .select("id, visitante_nome, status")
      .eq("token_hash", hashToken(data.token))
      .maybeSingle();
    if (!chamado) throw new Error("Chamado não encontrado.");
    if (chamado.status === "arquivado") throw new Error("Este chamado foi arquivado.");

    // Rate-limit: 30 mensagens do visitante nesta última hora.
    const desde = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count } = await sb
      .from("chamado_mensagens")
      .select("id", { count: "exact", head: true })
      .eq("chamado_id", chamado.id)
      .eq("autor_tipo", "visitante")
      .gte("created_at", desde);
    if ((count ?? 0) >= 30)
      throw new Error("Muitas mensagens no último período. Aguarde alguns minutos.");

    const { error } = await sb.from("chamado_mensagens").insert({
      chamado_id: chamado.id,
      autor_tipo: "visitante",
      autor_nome: chamado.visitante_nome,
      conteudo: data.conteudo.trim(),
    });
    if (error) throw friendlyDbError(error);

    try {
      const { safeDispatch, appUrl, fmtDate } = await import("@/lib/email/safe-dispatch.server");
      const { data: ch } = await sb
        .from("chamados")
        .select("codigo, assunto")
        .eq("id", chamado.id)
        .maybeSingle();
      await safeDispatch({
        eventKey: "chamado.resposta",
        triggeredBy: null,
        triggeredByKind: "automation",
        entityTable: "chamados",
        entityId: chamado.id,
        vars: {
          numero: ch?.codigo ?? "",
          codigo: ch?.codigo ?? "",
          titulo: ch?.assunto ?? "",
          usuario: chamado.visitante_nome,
          mensagem: data.conteudo.trim(),
          data: fmtDate(),
          link: appUrl(`/pos-vendas/chamados/${chamado.id}`),
        },
      });
    } catch (e) {
      console.error("[suporte-publico/publicEnviarMensagem] email dispatch failed", e);
    }

    return { ok: true };
  });

export const publicAcaoChamado = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => acaoSchema.parse(i))
  .handler(async ({ data }) => {
    const { getCriticalClient } = await import("@/lib/supabase-client.server");
    const supabaseAdmin = await getCriticalClient();
    const { hashToken } = await import("@/lib/suporte-token.server");
    const sb = supabaseAdmin as any;

    const { data: chamado } = await sb
      .from("chamados")
      .select("id, status")
      .eq("token_hash", hashToken(data.token))
      .maybeSingle();
    if (!chamado) throw new Error("Chamado não encontrado.");

    if (data.acao === "resolver") {
      const { error } = await sb
        .from("chamados")
        .update({ status: "resolvido", resolvido_em: new Date().toISOString() })
        .eq("id", chamado.id);
      if (error) throw friendlyDbError(error);
    } else {
      const { error } = await sb
        .from("chamados")
        .update({ status: "reaberto", reaberto_em: new Date().toISOString(), resolvido_em: null })
        .eq("id", chamado.id);
      if (error) throw friendlyDbError(error);
    }
    return { ok: true };
  });

/** Fluxo "perdi o link": recupera o token via (codigo + email). */
export const publicResolverCodigo = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => resolverCodigoSchema.parse(i))
  .handler(async ({ data }) => {
    const { getCriticalClient } = await import("@/lib/supabase-client.server");
    const supabaseAdmin = await getCriticalClient();
    const { normalizarCodigo } = await import("@/lib/suporte-token.server");
    const sb = supabaseAdmin as any;

    const codigo = normalizarCodigo(data.codigo);
    if (!codigo) throw new Error("Código inválido.");

    // NÃO devolvemos o token — só um sinal para renavegar; o cliente teria
    // que ter guardado o token na abertura. Aqui devolvemos apenas confirmação
    // e o e-mail cadastrado (mascarado) para o operador orientar por telefone.
    // O visitante que perdeu o link deve pedir um novo pelo suporte interno.
    const { data: chamado } = await sb
      .from("chamados")
      .select("id, visitante_email, status")
      .eq("codigo", codigo)
      .maybeSingle();
    if (!chamado) throw new Error("Código não encontrado.");
    if ((chamado.visitante_email as string).toLowerCase() !== data.email.trim().toLowerCase()) {
      throw new Error("Código e e-mail não coincidem.");
    }
    return { ok: true, status: chamado.status as string };
  });
