/* eslint-disable @typescript-eslint/no-explicit-any */
// Server functions do atendimento interno de chamados.
// Restritas a admin/manager/engineer via has_role. As mutações passam pelas
// políticas RLS acima + trigger de auditoria, então tudo cai em audit_log.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ROLES = ["admin", "manager", "engineer"] as const;

async function assertRole(sb: any, uid: string) {
  for (const r of ROLES) {
    const { data } = await sb.rpc("has_role", { _user_id: uid, _role: r });
    if (data === true) return;
  }
  throw new Error("Sem permissão para acessar Chamados de Pós-venda.");
}

async function meuNome(sb: any, uid: string): Promise<string> {
  const { data } = await sb.from("profiles").select("full_name, email").eq("id", uid).maybeSingle();
  return (data?.full_name as string) || (data?.email as string) || "Atendente";
}

const listSchema = z.object({
  status: z.string().optional().nullable(),
  origem: z.string().optional().nullable(),
  prioridade: z.string().optional().nullable(),
  escopo: z.enum(["todos", "meus", "sem_atendente"]).default("todos"),
  sla_estourado: z.boolean().optional().default(false),
  q: z.string().max(120).optional().nullable(),
  mensagem_q: z.string().max(120).optional().nullable(),
  cliente_q: z.string().max(120).optional().nullable(),
  cnpj: z.string().max(20).optional().nullable(),
  date_from: z.string().optional().nullable(),
  date_to: z.string().optional().nullable(),
  page: z.number().int().min(1).default(1),
  page_size: z.number().int().min(1).max(100).default(25),
});

export const listChamados = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => listSchema.parse(i ?? {}))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    await assertRole(sb, context.userId);

    // Filtro por cliente (nome/fantasia/CNPJ) resolvido para lista de ids.
    let clienteIds: string[] | null = null;
    if (data.cliente_q?.trim() || data.cnpj?.trim()) {
      let cq = sb.from("clientes").select("id").limit(500);
      if (data.cliente_q?.trim()) {
        const term = `%${data.cliente_q.trim()}%`;
        cq = cq.or(`razao_social.ilike.${term},nome_fantasia.ilike.${term}`);
      }
      if (data.cnpj?.trim()) {
        const digits = data.cnpj.replace(/\D/g, "");
        if (digits) cq = cq.ilike("cnpj", `%${digits}%`);
      }
      const { data: cs } = await cq;
      const ids: string[] = (cs ?? []).map((c: any) => c.id as string);
      if (ids.length === 0) return { rows: [], total: 0 };
      clienteIds = ids;
    }

    // Busca por texto no conteúdo das mensagens.
    let chamadoIdsFromMsg: string[] | null = null;
    if (data.mensagem_q?.trim()) {
      const { data: ms } = await sb
        .from("chamado_mensagens")
        .select("chamado_id")
        .ilike("conteudo", `%${data.mensagem_q.trim()}%`)
        .limit(2000);
      chamadoIdsFromMsg = Array.from(new Set((ms ?? []).map((m: any) => m.chamado_id as string)));
      if (chamadoIdsFromMsg.length === 0) return { rows: [], total: 0 };
    }

    let q = sb
      .from("chamados")
      .select(
        "id, codigo, status, origem, prioridade, visitante_nome, visitante_email, assunto, numero_serie, atendente_id, atendente_nome, cliente_id, sla_resposta_at, sla_resolucao_at, first_response_at, resolvido_em, ultima_mensagem_em, ultima_mensagem_por, created_at",
        { count: "exact" },
      )
      .order("ultima_mensagem_em", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false });

    if (data.status && data.status !== "todos") q = q.eq("status", data.status);
    if (data.origem && data.origem !== "todas") q = q.eq("origem", data.origem);
    if (data.prioridade && data.prioridade !== "todas") q = q.eq("prioridade", data.prioridade);
    if (data.escopo === "meus") q = q.eq("atendente_id", context.userId);
    if (data.escopo === "sem_atendente") q = q.is("atendente_id", null);
    if (data.sla_estourado) {
      q = q.lt("sla_resposta_at", new Date().toISOString()).is("first_response_at", null);
    }
    if (clienteIds) q = q.in("cliente_id", clienteIds);
    if (chamadoIdsFromMsg) q = q.in("id", chamadoIdsFromMsg);
    if (data.date_from) q = q.gte("created_at", data.date_from);
    if (data.date_to) q = q.lte("created_at", data.date_to);
    if (data.q?.trim()) {
      const term = `%${data.q.trim()}%`;
      q = q.or(
        `codigo.ilike.${term},visitante_nome.ilike.${term},visitante_email.ilike.${term},numero_serie.ilike.${term},assunto.ilike.${term}`,
      );
    }

    const from = (data.page - 1) * data.page_size;
    const to = from + data.page_size - 1;
    q = q.range(from, to);

    const { data: rows, error, count } = await q;
    if (error) throw new Error(error.message);
    return { rows: rows ?? [], total: count ?? 0 };
  });

const prioridadeSchema = z.object({
  chamado_id: z.string().uuid(),
  prioridade: z.enum(["baixa", "media", "alta", "critica"]),
  motivo: z.string().trim().max(500).optional().nullable(),
});

export const setPrioridadeChamado = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => prioridadeSchema.parse(i))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    await assertRole(sb, context.userId);
    const nome = await meuNome(sb, context.userId);
    const { data: atual } = await sb.from("chamados").select("prioridade").eq("id", data.chamado_id).maybeSingle();
    const anterior = atual?.prioridade ?? null;
    if (anterior === data.prioridade) return { ok: true };
    const { error } = await sb.from("chamados").update({ prioridade: data.prioridade }).eq("id", data.chamado_id);
    if (error) throw new Error(error.message);
    await sb.from("chamado_eventos").insert({
      chamado_id: data.chamado_id,
      tipo: "prioridade_change",
      autor_id: context.userId,
      autor_nome: nome,
      meta: { de: anterior, para: data.prioridade, motivo: data.motivo?.trim() || null },
    });
    return { ok: true };
  });

const reatribuirSchema = z.object({
  chamado_id: z.string().uuid(),
  atendente_id: z.string().uuid().nullable(),
  motivo: z.string().trim().max(500).optional().nullable(),
});

export const reatribuirChamado = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => reatribuirSchema.parse(i))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    await assertRole(sb, context.userId);
    const nome = await meuNome(sb, context.userId);

    const { data: atual } = await sb
      .from("chamados")
      .select("atendente_id, atendente_nome")
      .eq("id", data.chamado_id)
      .maybeSingle();

    let atendente_nome: string | null = null;
    if (data.atendente_id) {
      const { data: p } = await sb.from("profiles").select("full_name, email").eq("id", data.atendente_id).maybeSingle();
      atendente_nome = (p?.full_name as string) || (p?.email as string) || "Atendente";
    }
    const { error } = await sb
      .from("chamados")
      .update({ atendente_id: data.atendente_id, atendente_nome })
      .eq("id", data.chamado_id);
    if (error) throw new Error(error.message);
    await sb.from("chamado_eventos").insert({
      chamado_id: data.chamado_id,
      tipo: "atendente_change",
      autor_id: context.userId,
      autor_nome: nome,
      meta: {
        de_id: atual?.atendente_id ?? null,
        de_nome: atual?.atendente_nome ?? null,
        para_id: data.atendente_id,
        para_nome: atendente_nome,
        motivo: data.motivo?.trim() || null,
      },
    });

    if (data.atendente_id) {
      const { safeDispatch, appUrl, fmtDate } = await import("./email/safe-dispatch.server");
      const { data: ch } = await sb
        .from("chamados")
        .select("codigo, assunto")
        .eq("id", data.chamado_id)
        .maybeSingle();
      const { data: destProf } = await sb
        .from("profiles").select("full_name, email").eq("id", data.atendente_id).maybeSingle();
      await safeDispatch({
        eventKey: "chamado.atribuido",
        triggeredBy: context.userId,
        entityTable: "chamados",
        entityId: data.chamado_id,
        vars: {
          codigo: ch?.codigo ?? "",
          chamado_codigo: ch?.codigo ?? "",
          assunto: ch?.assunto ?? "",
          titulo: ch?.assunto ?? "",
          atendente: atendente_nome ?? "",
          destinatario_nome: destProf?.full_name ?? destProf?.email ?? atendente_nome ?? "Atendente",
          usuario: nome,
          motivo: data.motivo?.trim() ?? "",
          data: fmtDate(),
          link: appUrl(`/pos-vendas/chamados/${data.chamado_id}`),
        },
        extraTo: destProf?.email ? [destProf.email as string] : undefined,
      });
    }

    return { ok: true };
  });

const comentarioSchema = z.object({
  chamado_id: z.string().uuid(),
  conteudo: z.string().trim().min(1).max(4000),
});

export const addComentarioInterno = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => comentarioSchema.parse(i))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    await assertRole(sb, context.userId);
    const nome = await meuNome(sb, context.userId);
    const { error } = await sb.from("chamado_mensagens").insert({
      chamado_id: data.chamado_id,
      autor_tipo: "atendente",
      autor_id: context.userId,
      autor_nome: nome,
      conteudo: data.conteudo.trim(),
      interno: true,
    });
    if (error) throw new Error(error.message);
    await sb.from("chamado_eventos").insert({
      chamado_id: data.chamado_id,
      tipo: "comentario_interno",
      autor_id: context.userId,
      autor_nome: nome,
    });
    return { ok: true };
  });

export const listAtendentes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as any;
    await assertRole(sb, context.userId);
    const { data: roles } = await sb
      .from("user_roles")
      .select("user_id, role")
      .in("role", ["admin", "manager", "engineer"]);
    const ids = Array.from(new Set((roles ?? []).map((r: any) => r.user_id as string)));
    if (ids.length === 0) return { atendentes: [] as { id: string; nome: string }[] };
    const { data: profs } = await sb
      .from("profiles")
      .select("id, full_name, email")
      .in("id", ids);
    const atendentes = (profs ?? [])
      .map((p: any) => ({ id: p.id as string, nome: (p.full_name as string) || (p.email as string) || "Atendente" }))
      .sort((a: any, b: any) => a.nome.localeCompare(b.nome));
    return { atendentes };
  });

const getSchema = z.object({ id: z.string().uuid() });

export const getChamado = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => getSchema.parse(i))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    await assertRole(sb, context.userId);

    const { data: chamado, error } = await sb
      .from("chamados")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!chamado) throw new Error("Chamado não encontrado.");

    const [{ data: msgs }, { data: eventos }, equip] = await Promise.all([
      sb.from("chamado_mensagens").select("*").eq("chamado_id", data.id).order("created_at", { ascending: true }),
      sb.from("chamado_eventos").select("*").eq("chamado_id", data.id).order("at", { ascending: false }).limit(100),
      chamado.equipamento_id
        ? sb
            .from("cliente_equipamentos")
            .select("id, codigo, modelo, fabricante, numero_serie, cliente_id, clientes(id, razao_social, nome_fantasia)")
            .eq("id", chamado.equipamento_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    return {
      chamado,
      mensagens: msgs ?? [],
      eventos: eventos ?? [],
      equipamento: equip?.data ?? null,
    };
  });

const responderSchema = z.object({
  chamado_id: z.string().uuid(),
  conteudo: z.string().trim().min(1).max(4000),
});

export const responderChamado = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => responderSchema.parse(i))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    await assertRole(sb, context.userId);
    const nome = await meuNome(sb, context.userId);

    // Se ninguém assumiu ainda, este atendente vira dono.
    const { data: atual } = await sb
      .from("chamados")
      .select("atendente_id, status")
      .eq("id", data.chamado_id)
      .maybeSingle();
    if (!atual) throw new Error("Chamado não encontrado.");
    if (atual.status === "arquivado") throw new Error("Chamado arquivado.");

    if (!atual.atendente_id) {
      await sb
        .from("chamados")
        .update({ atendente_id: context.userId, atendente_nome: nome })
        .eq("id", data.chamado_id);
    }

    const { error } = await sb.from("chamado_mensagens").insert({
      chamado_id: data.chamado_id,
      autor_tipo: "atendente",
      autor_id: context.userId,
      autor_nome: nome,
      conteudo: data.conteudo.trim(),
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const statusSchema = z.object({
  chamado_id: z.string().uuid(),
  para: z.enum(["aberto", "em_analise", "aguardando_cliente", "resolvido", "reaberto", "arquivado"]),
});

export const alterarStatusChamado = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => statusSchema.parse(i))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    await assertRole(sb, context.userId);

    const patch: Record<string, unknown> = { status: data.para };
    if (data.para === "resolvido") patch.resolvido_em = new Date().toISOString();
    if (data.para === "reaberto") {
      patch.reaberto_em = new Date().toISOString();
      patch.resolvido_em = null;
    }
    const { error } = await sb.from("chamados").update(patch).eq("id", data.chamado_id);
    if (error) throw new Error(error.message);

    // Dispara e-mail para transições relevantes
    const eventKey =
      data.para === "resolvido" ? "chamado.resolvido"
      : data.para === "reaberto" ? "chamado.reaberto"
      : null;
    if (eventKey) {
      const { safeDispatch, appUrl, fmtDate } = await import("./email/safe-dispatch.server");
      const { data: ch } = await sb
        .from("chamados")
        .select("codigo, assunto, visitante_nome, visitante_email, cliente_id, clientes(razao_social, nome_fantasia)")
        .eq("id", data.chamado_id)
        .maybeSingle();
      const usuario = await meuNome(sb, context.userId);
      const clienteNome =
        (ch?.clientes as any)?.nome_fantasia ||
        (ch?.clientes as any)?.razao_social ||
        ch?.visitante_nome || "Cliente";
      await safeDispatch({
        eventKey,
        triggeredBy: context.userId,
        entityTable: "chamados",
        entityId: data.chamado_id,
        vars: {
          codigo: ch?.codigo ?? "",
          chamado_codigo: ch?.codigo ?? "",
          assunto: ch?.assunto ?? "",
          titulo: ch?.assunto ?? "",
          cliente_nome: clienteNome,
          usuario,
          data: fmtDate(),
          link: appUrl(`/pos-vendas/chamados/${data.chamado_id}`),
        },
        extraTo: ch?.visitante_email ? [ch.visitante_email as string] : undefined,
      });
    }

    return { ok: true };
  });

const assumirSchema = z.object({ chamado_id: z.string().uuid() });

export const assumirChamado = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => assumirSchema.parse(i))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    await assertRole(sb, context.userId);
    const nome = await meuNome(sb, context.userId);

    const { error } = await sb
      .from("chamados")
      .update({ atendente_id: context.userId, atendente_nome: nome })
      .eq("id", data.chamado_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const vincularSchema = z.object({
  chamado_id: z.string().uuid(),
  equipamento_id: z.string().uuid().nullable(),
});

export const vincularEquipamentoChamado = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => vincularSchema.parse(i))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    await assertRole(sb, context.userId);

    let cliente_id: string | null = null;
    if (data.equipamento_id) {
      const { data: eq } = await sb
        .from("cliente_equipamentos")
        .select("cliente_id")
        .eq("id", data.equipamento_id)
        .maybeSingle();
      cliente_id = (eq?.cliente_id as string) ?? null;
    }
    const { error } = await sb
      .from("chamados")
      .update({ equipamento_id: data.equipamento_id, cliente_id })
      .eq("id", data.chamado_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
