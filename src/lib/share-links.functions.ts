import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  signShareToken,
  verifyShareTokenSignature,
  peekShareTokenPayload,
  hashToken,
  newJti,
  type ShareTipo,
  type ShareScope,
} from "./share-token.server";
import {
  generateFatDocumentInternal,
  generateSatDocumentInternal,
} from "./docs/docs.functions";


/**
 * Links públicos persistidos para preenchimento em campo de FAT/SAT.
 * - Geração: requer login.
 * - Endpoints públicos: validam HMAC + revogação/expiração no banco antes de qualquer operação.
 * - Cada operação pública grava um registro em relatorio_share_submissoes (auditoria).
 *
 * Requer as tabelas public.relatorio_share_links e public.relatorio_share_submissoes
 * (ver SQL fornecido na conversa).
 */

// ============================================================
// MINT — gera o link assinado e persiste no banco
// ============================================================
const createInput = z.object({
  tipo: z.enum(["fat", "sat"]),
  relatorio_id: z.string().uuid(),
  ttl_hours: z.number().int().min(1).max(24 * 30).default(72),
  scope: z
    .array(z.enum(["checklist", "assinatura", "identificacao", "medicoes"]))
    .min(1)
    .default(["checklist", "assinatura", "identificacao", "medicoes"]),
  rotulo: z.string().max(120).optional(),
});

export const createShareLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => createInput.parse(input))
  .handler(async ({ data, context }) => {
    const table = data.tipo === "fat" ? "fat_relatorios" : "sat_relatorio";
    const { data: row, error } = await (context.supabase as any)
      .from(table).select("id").eq("id", data.relatorio_id).maybeSingle();
    if (error || !row) throw new Error("Relatório não encontrado ou sem acesso.");

    const now = Math.floor(Date.now() / 1000);
    const exp = now + data.ttl_hours * 3600;
    const jti = newJti();
    const token = signShareToken({
      jti,
      tipo: data.tipo as ShareTipo,
      rid: data.relatorio_id,
      iat: now,
      exp,
      iss: context.userId,
      scope: data.scope as ShareScope[],
    });

    const { getCriticalClient } = await import("@/lib/supabase-client.server");
    const supabaseAdmin = await getCriticalClient();
    const { error: insErr } = await (supabaseAdmin as any).from("relatorio_share_links").insert({
      id: jti,
      tipo: data.tipo,
      relatorio_id: data.relatorio_id,
      token_hash: hashToken(token),
      scope: data.scope,
      rotulo: data.rotulo ?? null,
      created_by: context.userId,
      expires_at: new Date(exp * 1000).toISOString(),
    });
    if (insErr) throw new Error(`Não foi possível registrar o link: ${insErr.message}`);

    return { token, expires_at: new Date(exp * 1000).toISOString(), jti };
  });

// ============================================================
// Authorization helper — confirm caller can access the report
// ============================================================
async function assertCanAccessRelatorio(
  ctxSupabase: any,
  userId: string,
  tipo: "fat" | "sat",
  relatorio_id: string,
): Promise<void> {
  const [{ data: isAdmin }, { data: isManager }] = await Promise.all([
    ctxSupabase.rpc("has_role", { _user_id: userId, _role: "admin" }),
    ctxSupabase.rpc("has_role", { _user_id: userId, _role: "manager" }),
  ]);
  if (isAdmin || isManager) return;
  const table = tipo === "fat" ? "fat_relatorios" : "sat_relatorio";
  const { data: row, error } = await ctxSupabase
    .from(table)
    .select("id")
    .eq("id", relatorio_id)
    .maybeSingle();
  if (error || !row) throw new Error("Acesso negado a este relatório.");
}

// ============================================================
// LISTAR (auth) — links emitidos por relatório
// ============================================================
export const listShareLinks = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ tipo: z.enum(["fat", "sat"]), relatorio_id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertCanAccessRelatorio(context.supabase, context.userId, data.tipo, data.relatorio_id);
    const { getCriticalClient } = await import("@/lib/supabase-client.server");
    const supabaseAdmin = await getCriticalClient();
    const { data: links, error } = await (supabaseAdmin as any)
      .from("relatorio_share_links")
      .select("id, rotulo, scope, created_by, created_at, expires_at, revoked_at, revoked_by, last_used_at, use_count")
      .eq("tipo", data.tipo)
      .eq("relatorio_id", data.relatorio_id)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    const userIds = Array.from(
      new Set(
        (links ?? []).flatMap((l: any) => [l.created_by, l.revoked_by].filter(Boolean)),
      ),
    );
    let nameMap = new Map<string, string>();
    if (userIds.length > 0) {
      const { data: profs } = await (supabaseAdmin as any)
        .from("profiles").select("id, full_name, email").in("id", userIds);
      nameMap = new Map(
        (profs ?? []).map((p: any) => [p.id as string, (p.full_name as string) || (p.email as string) || p.id]),
      );
    }
    return (links ?? []).map((l: any) => ({
      ...l,
      created_by_nome: nameMap.get(l.created_by) ?? null,
      revoked_by_nome: l.revoked_by ? nameMap.get(l.revoked_by) ?? null : null,
    }));
  });

// ============================================================
// REVOGAR (auth) — admin/manager ou o emissor original
// ============================================================
export const revokeShareLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { getCriticalClient } = await import("@/lib/supabase-client.server");
    const supabaseAdmin = await getCriticalClient();
    const { data: link, error: lErr } = await (supabaseAdmin as any)
      .from("relatorio_share_links")
      .select("created_by")
      .eq("id", data.id)
      .maybeSingle();
    if (lErr) throw new Error(lErr.message);
    if (!link) throw new Error("Link não encontrado.");
    const [{ data: isAdmin }, { data: isManager }] = await Promise.all([
      context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" }),
      context.supabase.rpc("has_role", { _user_id: context.userId, _role: "manager" }),
    ]);
    if (!isAdmin && !isManager && link.created_by !== context.userId) {
      throw new Error("Acesso negado.");
    }
    const { error } = await (supabaseAdmin as any)
      .from("relatorio_share_links")
      .update({ revoked_at: new Date().toISOString(), revoked_by: context.userId })
      .eq("id", data.id)
      .is("revoked_at", null);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============================================================
// HISTÓRICO DE SUBMISSÕES (auth) — versões feitas via link público
// ============================================================
export const listShareSubmissoes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ tipo: z.enum(["fat", "sat"]), relatorio_id: z.string().uuid(), limit: z.number().int().min(1).max(200).default(50) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertCanAccessRelatorio(context.supabase, context.userId, data.tipo, data.relatorio_id);
    const { getCriticalClient } = await import("@/lib/supabase-client.server");
    const supabaseAdmin = await getCriticalClient();
    const { data: rows, error } = await (supabaseAdmin as any)
      .from("relatorio_share_submissoes")
      .select("id, share_link_id, acao, alvo_id, payload, signatario_nome, signatario_cargo, ip, user_agent, status, created_at")
      .eq("tipo", data.tipo)
      .eq("relatorio_id", data.relatorio_id)
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

// ============================================================
// Helpers internos — verificação + auditoria
// ============================================================
function shareErr(code: "invalid" | "expired" | "revoked" | "notfound" | "tampered" | "mismatch", msg: string): Error {
  const e: any = new Error(`[${code}] ${msg}`);
  e.code = code;
  return e;
}

function readRequestMeta(): { ip: string | null; user_agent: string | null } {
  try {
    const ua = getRequestHeader("user-agent") ?? null;
    const xff = getRequestHeader("x-forwarded-for");
    const ip = xff?.split(",")[0]?.trim() || getRequestHeader("cf-connecting-ip") || getRequestHeader("x-real-ip") || null;
    return { ip: ip ?? null, user_agent: ua };
  } catch {
    return { ip: null, user_agent: null };
  }
}

async function loadActiveLink(token: string) {
  const payload = verifyShareTokenSignature(token); // already throws [invalid] / [expired]
  const { getCriticalClient } = await import("@/lib/supabase-client.server");
    const supabaseAdmin = await getCriticalClient();
  const { data: link, error } = await (supabaseAdmin as any)
    .from("relatorio_share_links")
    .select("id, tipo, relatorio_id, token_hash, scope, created_by, expires_at, revoked_at")
    .eq("id", payload.jti)
    .maybeSingle();
  if (error) throw shareErr("invalid", error.message);
  if (!link) throw shareErr("notfound", "Link não encontrado ou já removido.");
  if (link.token_hash !== hashToken(token)) throw shareErr("tampered", "Token corrompido.");
  if (link.revoked_at) throw shareErr("revoked", "Este link foi revogado.");
  if (new Date(link.expires_at as string).getTime() < Date.now()) {
    throw shareErr("expired", "Link expirado.");
  }
  if (link.tipo !== payload.tipo || link.relatorio_id !== payload.rid) {
    throw shareErr("mismatch", "Token não corresponde ao link registrado.");
  }
  return { payload, link };
}

async function touchLink(jti: string) {
  const { getCriticalClient } = await import("@/lib/supabase-client.server");
    const supabaseAdmin = await getCriticalClient();
  await (supabaseAdmin as any)
    .from("relatorio_share_links")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", jti);
  const { data: cur } = await (supabaseAdmin as any)
    .from("relatorio_share_links").select("use_count").eq("id", jti).maybeSingle();
  if (cur) {
    await (supabaseAdmin as any)
      .from("relatorio_share_links")
      .update({ use_count: ((cur.use_count as number) ?? 0) + 1 })
      .eq("id", jti);
  }
}

async function logSubmissao(args: {
  share_link_id: string;
  tipo: string;
  relatorio_id: string;
  acao: string;
  alvo_id?: string | null;
  payload?: Record<string, unknown>;
  signatario_nome?: string | null;
  signatario_cargo?: string | null;
  status?: "aplicada" | "rejeitada";
  ip?: string | null;
  user_agent?: string | null;
}) {
  const { getCriticalClient } = await import("@/lib/supabase-client.server");
    const supabaseAdmin = await getCriticalClient();
  await (supabaseAdmin as any).from("relatorio_share_submissoes").insert({
    share_link_id: args.share_link_id,
    tipo: args.tipo,
    relatorio_id: args.relatorio_id,
    acao: args.acao,
    alvo_id: args.alvo_id ?? null,
    payload: args.payload ?? null,
    signatario_nome: args.signatario_nome ?? null,
    signatario_cargo: args.signatario_cargo ?? null,
    status: args.status ?? "aplicada",
    ip: args.ip ?? null,
    user_agent: args.user_agent ?? null,
  });
}

/**
 * Tenta registrar a visualização (mesmo quando o link está expirado/revogado).
 * Não consegue gravar quando a assinatura é inválida (não temos jti confiável).
 */
async function logVisualizacaoSeguro(
  token: string,
  status: "aplicada" | "rejeitada",
  motivo: string | null,
  meta: { ip: string | null; user_agent: string | null },
) {
  try {
    const payload = peekShareTokenPayload(token); // só assinatura
    await logSubmissao({
      share_link_id: payload.jti,
      tipo: payload.tipo,
      relatorio_id: payload.rid,
      acao: "visualizacao",
      status,
      payload: motivo ? { motivo } : undefined,
      ip: meta.ip,
      user_agent: meta.user_agent,
    });
  } catch {
    // assinatura inválida → não há link a referenciar; ignora silenciosamente
  }
}


// ============================================================
// PUBLIC GET — leitura do relatório alvo
// ============================================================
export const publicGetRelatorio = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ token: z.string().min(10) }).parse(input))
  .handler(async ({ data }) => {
    const meta = readRequestMeta();
    let loaded;
    try {
      loaded = await loadActiveLink(data.token);
    } catch (e: any) {
      await logVisualizacaoSeguro(data.token, "rejeitada", e?.message ?? "erro", meta);
      throw e;
    }
    const { payload, link } = loaded;
    const { getCriticalClient } = await import("@/lib/supabase-client.server");
    const supabaseAdmin = await getCriticalClient();


    if (payload.tipo === "fat") {
      const [{ data: fat }, { data: tpl }, { data: resp }, { data: ass }, cliRes, procRes] = await Promise.all([
        (supabaseAdmin as any)
          .from("fat_relatorios")
          .select("id, codigo, status, progresso, ok_count, nok_count, na_count, cliente_id, processo_id, tag_equipamento, os_codigo, data_ensaio, local_ensaio, observacoes_gerais")
          .eq("id", payload.rid).maybeSingle(),
        (supabaseAdmin as any)
          .from("fat_checklist_template")
          .select("id, secao, ordem, titulo, descricao, requer_foto_nok")
          .eq("ativo", true).order("secao").order("ordem"),
        (supabaseAdmin as any)
          .from("fat_checklist_resposta")
          .select("id, template_id, status, comentario").eq("fat_id", payload.rid),
        (supabaseAdmin as any).from("fat_assinaturas").select("tipo, nome, assinado_em").eq("fat_id", payload.rid),
        (async () => {
          const f = await (supabaseAdmin as any).from("fat_relatorios").select("cliente_id").eq("id", payload.rid).maybeSingle();
          if (!f.data?.cliente_id) return { data: null };
          return (supabaseAdmin as any).from("clientes").select("razao_social, nome_fantasia").eq("id", f.data.cliente_id).maybeSingle();
        })(),
        (async () => {
          const f = await (supabaseAdmin as any).from("fat_relatorios").select("processo_id").eq("id", payload.rid).maybeSingle();
          if (!f.data?.processo_id) return { data: null };
          return (supabaseAdmin as any).from("processos").select("codigo, titulo").eq("id", f.data.processo_id).maybeSingle();
        })(),
      ]);
      if (!fat) {
        await logVisualizacaoSeguro(data.token, "rejeitada", "fat_inexistente", meta);
        throw shareErr("notfound", "FAT não encontrado.");
      }
      await touchLink(link.id);
      await logSubmissao({
        share_link_id: link.id, tipo: "fat", relatorio_id: payload.rid,
        acao: "visualizacao", status: "aplicada", ip: meta.ip, user_agent: meta.user_agent,
      });
      return {
        tipo: "fat" as const, scope: payload.scope, exp: payload.exp,
        relatorio: fat, template: tpl ?? [], respostas: resp ?? [],
        assinaturas: ass ?? [], cliente: cliRes.data, processo: procRes.data,
        link_id: link.id,
      };
    }


    // SAT
    const [{ data: sat }, { data: secoes }, cliRes2, procRes2] = await Promise.all([
      (supabaseAdmin as any)
        .from("sat_relatorio")
        .select("id, codigo, status, cliente_id, processo_id, periodo_de, periodo_ate, local_endereco, observacoes, dados, tecnicos, assinatura_tecnico, assinatura_cliente, template_id")
        .eq("id", payload.rid).maybeSingle(),
      (async () => {
        const s = await (supabaseAdmin as any).from("sat_relatorio").select("template_id").eq("id", payload.rid).maybeSingle();
        if (!s.data?.template_id) return { data: [] };
        return (supabaseAdmin as any)
          .from("sat_template_secao")
          .select("id, ordem, titulo, descricao, sat_template_item(id, secao_id, ordem, label, tipo, obrigatorio, opcoes, ajuda)")
          .eq("template_id", s.data.template_id)
          .order("ordem");
      })(),
      (async () => {
        const s = await (supabaseAdmin as any).from("sat_relatorio").select("cliente_id").eq("id", payload.rid).maybeSingle();
        if (!s.data?.cliente_id) return { data: null };
        return (supabaseAdmin as any).from("clientes").select("razao_social, nome_fantasia").eq("id", s.data.cliente_id).maybeSingle();
      })(),
      (async () => {
        const s = await (supabaseAdmin as any).from("sat_relatorio").select("processo_id").eq("id", payload.rid).maybeSingle();
        if (!s.data?.processo_id) return { data: null };
        return (supabaseAdmin as any).from("processos").select("codigo, titulo").eq("id", s.data.processo_id).maybeSingle();
      })(),
    ]);
    if (!sat) {
      await logVisualizacaoSeguro(data.token, "rejeitada", "sat_inexistente", meta);
      throw shareErr("notfound", "SAT não encontrado.");
    }
    await touchLink(link.id);
    await logSubmissao({
      share_link_id: link.id, tipo: "sat", relatorio_id: payload.rid,
      acao: "visualizacao", status: "aplicada", ip: meta.ip, user_agent: meta.user_agent,
    });

    return {
      tipo: "sat" as const, scope: payload.scope, exp: payload.exp,
      relatorio: sat,
      template: (secoes ?? []) as Array<{
        id: string; ordem: number; titulo: string; descricao: string | null;
        sat_template_item: Array<{ id: string; secao_id: string; ordem: number; label: string; tipo: string; obrigatorio: boolean; opcoes: string[] | null; ajuda: string | null }>;
      }>,
      respostas: [],
      assinaturas: Array.isArray(sat.tecnicos) ? sat.tecnicos : [],
      cliente: cliRes2.data, processo: procRes2.data,
      link_id: link.id,
    };
  });

// ============================================================
// PUBLIC SET CHECKLIST (FAT)
// ============================================================
const setRespInput = z.object({
  token: z.string().min(10),
  template_id: z.string().uuid(),
  status: z.enum(["pendente", "ok", "nok", "na"]),
  comentario: z.string().max(2000).nullish(),
});

export const publicSetChecklistResposta = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => setRespInput.parse(input))
  .handler(async ({ data }) => {
    const meta = readRequestMeta();
    const { payload, link } = await loadActiveLink(data.token);
    if (payload.tipo !== "fat") throw new Error("Token não é de um relatório FAT.");
    if (!payload.scope.includes("checklist")) throw new Error("Link sem permissão de checklist.");
    const { getCriticalClient } = await import("@/lib/supabase-client.server");
    const supabaseAdmin = await getCriticalClient();

    const { error } = await (supabaseAdmin as any)
      .from("fat_checklist_resposta")
      .upsert(
        {
          fat_id: payload.rid,
          template_id: data.template_id,
          status: data.status,
          comentario: data.comentario ?? null,
        },
        { onConflict: "fat_id,template_id" },
      );
    if (error) throw new Error(error.message);

    // recalcula contadores
    const { count: totalCount } = await (supabaseAdmin as any)
      .from("fat_checklist_template").select("id", { count: "exact", head: true }).eq("ativo", true);
    const { data: rs } = await (supabaseAdmin as any)
      .from("fat_checklist_resposta").select("status").eq("fat_id", payload.rid);
    const ok = (rs ?? []).filter((r: { status: string }) => r.status === "ok").length;
    const nok = (rs ?? []).filter((r: { status: string }) => r.status === "nok").length;
    const na = (rs ?? []).filter((r: { status: string }) => r.status === "na").length;
    const respondidos = ok + nok + na;
    const progresso = totalCount ? Math.round((respondidos / totalCount) * 100) : 0;
    await (supabaseAdmin as any)
      .from("fat_relatorios")
      .update({ ok_count: ok, nok_count: nok, na_count: na, progresso, status: "em_execucao" })
      .eq("id", payload.rid);

    await touchLink(link.id);
    await logSubmissao({
      share_link_id: link.id, tipo: "fat", relatorio_id: payload.rid,
      acao: "checklist_resposta", alvo_id: data.template_id,
      payload: { status: data.status, comentario: data.comentario ?? null, progresso },
      ip: meta.ip, user_agent: meta.user_agent
    });
    return { ok: true, progresso };
  });

// ============================================================
// PUBLIC SET CHECKLIST (SAT) — grava em sat_relatorio.dados (jsonb)
// ============================================================
const setSatRespInput = z.object({
  token: z.string().min(10),
  item_id: z.string().uuid(),
  valor: z.union([z.string(), z.number(), z.boolean(), z.null()]).optional(),
  comentario: z.string().max(2000).nullish(),
});

export const publicSetSatResposta = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => setSatRespInput.parse(input))
  .handler(async ({ data }) => {
    const meta = readRequestMeta();
    const { payload, link } = await loadActiveLink(data.token);
    if (payload.tipo !== "sat") throw new Error("Token não é de um relatório SAT.");
    if (!payload.scope.includes("checklist")) throw new Error("Link sem permissão de checklist.");
    const { getCriticalClient } = await import("@/lib/supabase-client.server");
    const supabaseAdmin = await getCriticalClient();

    const { data: sat } = await (supabaseAdmin as any)
      .from("sat_relatorio").select("dados").eq("id", payload.rid).maybeSingle();
    const dados = ((sat?.dados as Record<string, any>) ?? {}) as Record<string, any>;
    dados[data.item_id] = {
      valor: data.valor ?? null,
      comentario: data.comentario ?? null,
      updated_at: new Date().toISOString(),
    };
    const { error } = await (supabaseAdmin as any)
      .from("sat_relatorio")
      .update({ dados, status: "preenchendo" })
      .eq("id", payload.rid);
    if (error) throw new Error(error.message);

    await touchLink(link.id);
    await logSubmissao({
      share_link_id: link.id, tipo: "sat", relatorio_id: payload.rid,
      acao: "checklist_resposta", alvo_id: data.item_id,
      payload: { valor: data.valor ?? null, comentario: data.comentario ?? null },
      ip: meta.ip, user_agent: meta.user_agent
    });
    return { ok: true };
  });

// ============================================================
// PUBLIC ASSINATURA — FAT (fat_assinaturas) e SAT (sat_relatorio.tecnicos)
// ============================================================
const assInput = z.object({
  token: z.string().min(10),
  tipo: z.enum(["inspetor", "testemunha", "tecnico", "cliente"]).default("testemunha"),
  nome: z.string().min(1).max(200),
  cargo: z.string().max(200).nullish(),
  assinatura_svg: z.string().min(20).max(512_000),
});

export const publicSubmitAssinatura = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => assInput.parse(input))
  .handler(async ({ data }) => {
    const meta = readRequestMeta();
    const { payload, link } = await loadActiveLink(data.token);
    if (!payload.scope.includes("assinatura")) throw new Error("Link sem permissão de assinatura.");
    const { createHash } = await import("node:crypto");
    const hash = createHash("sha256")
      .update(`${payload.rid}|${data.tipo}|${data.nome}|${data.assinatura_svg}`)
      .digest("hex");
    const { getCriticalClient } = await import("@/lib/supabase-client.server");
    const supabaseAdmin = await getCriticalClient();

    if (payload.tipo === "fat") {
      const fatTipo = data.tipo === "tecnico" ? "inspetor" : data.tipo === "cliente" ? "testemunha" : data.tipo;
      const { error } = await (supabaseAdmin as any)
        .from("fat_assinaturas")
        .upsert(
          {
            fat_id: payload.rid,
            tipo: fatTipo,
            nome: data.nome,
            cargo: data.cargo ?? null,
            assinatura_svg: data.assinatura_svg,
            hash_sha256: hash,
            assinado_em: new Date().toISOString(),
          },
          { onConflict: "fat_id,tipo" },
        );
      if (error) throw new Error(error.message);
    } else {
      // SAT — anexa em sat_relatorio.assinatura_tecnico / assinatura_cliente e em tecnicos[]
      const field = data.tipo === "cliente" ? "assinatura_cliente" : "assinatura_tecnico";
      const sigObj = {
        nome: data.nome, cargo: data.cargo ?? null,
        data_url: `data:image/svg+xml;utf8,${encodeURIComponent(data.assinatura_svg)}`,
        url: `data:image/svg+xml;utf8,${encodeURIComponent(data.assinatura_svg)}`,
        hash_sha256: hash, assinado_em: new Date().toISOString(),
      };
      const { data: sat } = await (supabaseAdmin as any)
        .from("sat_relatorio").select("tecnicos").eq("id", payload.rid).maybeSingle();
      const tecnicos = Array.isArray(sat?.tecnicos) ? [...(sat!.tecnicos as any[])] : [];
      // remove existing same-name to avoid duplicates
      const filtered = tecnicos.filter((t: any) => (t?.nome ?? "") !== data.nome);
      filtered.push({ nome: data.nome, cargo: data.cargo ?? null, tipo: data.tipo, assinado_em: new Date().toISOString() });
      const patch: Record<string, unknown> = { [field]: sigObj, tecnicos: filtered, status: "assinado" };
      const { error } = await (supabaseAdmin as any).from("sat_relatorio").update(patch).eq("id", payload.rid);
      if (error) throw new Error(error.message);
    }

    await touchLink(link.id);
    await logSubmissao({
      share_link_id: link.id, tipo: payload.tipo, relatorio_id: payload.rid,
      acao: "assinatura", alvo_id: data.tipo,
      signatario_nome: data.nome, signatario_cargo: data.cargo ?? null,
      payload: { hash, tipo_assinatura: data.tipo },
      ip: meta.ip, user_agent: meta.user_agent
    });
    return { ok: true, hash };
  });

// ============================================================
// PUBLIC EXPORT PDF — gera o documento (PT/ES/EN) a partir do link
// ============================================================
export const publicExportRelatorioPdf = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ token: z.string().min(10) }).parse(input))
  .handler(async ({ data }) => {
    const meta = readRequestMeta();
    const { payload, link } = await loadActiveLink(data.token);
    const res = payload.tipo === "fat"
      ? await generateFatDocumentInternal({ fat_id: payload.rid, actor_id: link.created_by })
      : await generateSatDocumentInternal({ sat_id: payload.rid, actor_id: link.created_by });

    // gera URLs assinadas (15min) para os PDFs no bucket "documentos"
    const { getCriticalClient } = await import("@/lib/supabase-client.server");
    const supabaseAdmin = await getCriticalClient();
    const urls: Record<string, string> = {};
    for (const [idioma, path] of Object.entries(res.arquivos)) {
      const { data: signed } = await (supabaseAdmin as any).storage
        .from("documentos").createSignedUrl(path as string, 900);
      if (signed?.signedUrl) urls[idioma] = signed.signedUrl;
    }

    await touchLink(link.id);
    await logSubmissao({
      share_link_id: link.id, tipo: payload.tipo, relatorio_id: payload.rid,
      acao: "pdf_export", payload: { documento_id: res.documento_id, codigo: res.codigo, versao: res.versao },
      ip: meta.ip, user_agent: meta.user_agent
    });
    return { documento_id: res.documento_id, codigo: res.codigo, versao: res.versao, urls };
  });
