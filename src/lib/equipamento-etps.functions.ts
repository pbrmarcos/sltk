import { createServerFn } from "@tanstack/react-start";
import { friendlyDbError } from "@/lib/db-errors";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { ETP_STATUS } from "@/lib/engenharia.shared";
import { hasRole, assertAdminOrManager } from "@/lib/admin-guard";

/* ============= LIST: por equipamento ============= */

export const listEquipamentoEtps = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ equipamento_id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("equipamento_etps")
      .select(
        "id, equipamento_id, cliente_id, versao, status, escopo, premissas, requisitos_funcionais, requisitos_tecnicos, criterios_aceite, riscos, aprovado_por, aprovado_em, drive_file_id, drive_view_url, observacoes, created_at, updated_at",
      )
      .eq("equipamento_id", data.equipamento_id)
      .is("deleted_at", null)
      .order("versao", { ascending: false });
    if (error) throw friendlyDbError(error);
    return rows ?? [];
  });

/* ============= LIST GLOBAL (página /engenharia/etp) ============= */

const listAllInput = z.object({
  q: z.string().optional(),
  status: z.enum(["todos", ...ETP_STATUS]).optional().default("todos"),
  page: z.number().int().min(1).optional().default(1),
  per_page: z.number().int().min(1).max(100).optional().default(50),
});

export const listAllEtps = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => listAllInput.parse(input ?? {}))
  .handler(async ({ data, context }) => {
    const from = (data.page - 1) * data.per_page;
    const to = from + data.per_page - 1;
    let q = context.supabase
      .from("equipamento_etps")
      .select(
        "id, equipamento_id, cliente_id, versao, status, aprovado_em, updated_at, cliente_equipamentos!inner(codigo,modelo), clientes!inner(codigo,razao_social)",
        { count: "exact" },
      )
      .is("deleted_at", null);
    if (data.status && data.status !== "todos") q = q.eq("status", data.status as never);
    if (data.q && data.q.trim()) {
      const term = `%${data.q.trim()}%`;
      q = q.or(
        `cliente_equipamentos.modelo.ilike.${term},cliente_equipamentos.codigo.ilike.${term},clientes.razao_social.ilike.${term}`,
      );
    }
    const { data: rows, count, error } = await q.order("updated_at", { ascending: false }).range(from, to);
    if (error) throw friendlyDbError(error);
    return { rows: rows ?? [], total: count ?? 0 };
  });

/* ============= CREATE ============= */

export const createEtp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ equipamento_id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: eqp, error: eqpErr } = await context.supabase
      .from("cliente_equipamentos")
      .select("id, cliente_id")
      .eq("id", data.equipamento_id)
      .single();
    if (eqpErr || !eqp) throw new Error("Equipamento não encontrado.");

    const { data: existing } = await context.supabase
      .from("equipamento_etps")
      .select("versao")
      .eq("equipamento_id", data.equipamento_id)
      .is("deleted_at", null)
      .order("versao", { ascending: false })
      .limit(1);
    const nextVersao = (existing?.[0]?.versao ?? 0) + 1;

    const { data: row, error } = await context.supabase
      .from("equipamento_etps")
      .insert({
        equipamento_id: data.equipamento_id,
        cliente_id: eqp.cliente_id,
        versao: nextVersao,
        status: "rascunho",
        created_by: context.userId,
      })
      .select("id")
      .single();
    if (error) throw friendlyDbError(error);
    return row;
  });

/* ============= GET por id ============= */

export const getEtp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("equipamento_etps")
      .select(
        "id, equipamento_id, cliente_id, versao, status, escopo, premissas, requisitos_funcionais, requisitos_tecnicos, criterios_aceite, riscos, aprovado_por, aprovado_em, observacoes, created_at, updated_at, cliente_equipamentos(codigo,modelo), clientes(codigo,razao_social)",
      )
      .eq("id", data.id)
      .is("deleted_at", null)
      .single();
    if (error) throw friendlyDbError(error);
    let aprovado_por_nome: string | null = null;
    if (row?.aprovado_por) {
      const { data: prof } = await context.supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", row.aprovado_por)
        .maybeSingle();
      aprovado_por_nome =
        (prof?.full_name as string | undefined) ??
        (prof?.email as string | undefined) ??
        null;
    }
    return { ...row, aprovado_por_nome };
  });

/* ============= UPDATE ============= */

const updateInput = z.object({
  id: z.string().uuid(),
  escopo: z.string().max(20000).nullable().optional(),
  premissas: z.string().max(20000).nullable().optional(),
  requisitos_funcionais: z.string().max(20000).nullable().optional(),
  requisitos_tecnicos: z.string().max(20000).nullable().optional(),
  criterios_aceite: z.string().max(20000).nullable().optional(),
  riscos: z.string().max(20000).nullable().optional(),
  observacoes: z.string().max(5000).nullable().optional(),
  status: z.enum(["rascunho", "em_revisao"]).optional(),
});

async function assertCanEditEtp(context: {
  supabase: any;
  userId: string;
}): Promise<{ isAdmin: boolean; isManager: boolean; isEngineer: boolean }> {
  const [isAdmin, isManager, isEngineer] = await Promise.all([
    hasRole(context.supabase, context.userId, "admin"),
    hasRole(context.supabase, context.userId, "manager"),
    hasRole(context.supabase, context.userId, "engineer"),
  ]);
  if (!isAdmin && !isManager && !isEngineer) {
    throw new Error("Sem permissão: apenas admin, gestores e engenheiros podem editar ETPs.");
  }
  return { isAdmin, isManager, isEngineer };
}

export const updateEtp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => updateInput.parse(input))
  .handler(async ({ data, context }) => {
    await assertCanEditEtp(context);
    const { id, ...patch } = data;

    // Bloquear edição se o ETP estiver aprovado/obsoleto
    const { data: cur, error: curErr } = await context.supabase
      .from("equipamento_etps")
      .select("status")
      .eq("id", id)
      .is("deleted_at", null)
      .single();
    if (curErr) throw friendlyDbError(curErr);
    if (
      cur?.status === "aprovado" ||
      cur?.status === "obsoleto" ||
      (cur?.status as string) === "rejeitado"
    ) {
      throw new Error(
        "ETP está congelado (aprovado, rejeitado ou obsoleto) e não pode ser alterado. Reabra/retome para editar.",
      );
    }

    const { error } = await context.supabase
      .from("equipamento_etps")
      .update({ ...patch, updated_by: context.userId })
      .eq("id", id);
    if (error) throw friendlyDbError(error);
    return { ok: true };
  });

/* ============= APROVAR ============= */

export const aprovarEtp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    // Verificar role: somente admin/manager podem aprovar
    await assertAdminOrManager(context.supabase, context.userId).catch(() => {
      throw new Error("Somente administradores ou gestores podem aprovar um ETP.");
    });
    const anterior = await statusAtual(context as EtpCtx, data.id);
    if (anterior !== "rascunho" && anterior !== "em_revisao") {
      throw new Error("Apenas ETPs em rascunho ou em revisão podem ser aprovados.");
    }
    const { error } = await context.supabase
      .from("equipamento_etps")
      .update({ status: "aprovado", updated_by: context.userId })
      .eq("id", data.id);
    if (error) throw friendlyDbError(error);
    await logStatus(
      context as EtpCtx,
      data.id,
      anterior,
      "aprovado",
      "ETP aprovado.",
      "aprovacao",
    );
    return { ok: true };
  });

/* ============= REABRIR (volta de aprovado para em_revisao) ============= */

export const reabrirEtp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        justificativa: z
          .string()
          .trim()
          .min(10, "Justificativa muito curta (mínimo 10 caracteres).")
          .max(2000),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdminOrManager(context.supabase, context.userId).catch(() => {
      throw new Error("Somente administradores ou gestores podem reabrir um ETP aprovado.");
    });

    const { data: cur, error: curErr } = await context.supabase
      .from("equipamento_etps")
      .select("status")
      .eq("id", data.id)
      .is("deleted_at", null)
      .single();
    if (curErr) throw friendlyDbError(curErr);
    if (cur?.status !== "aprovado") {
      throw new Error("Apenas ETPs aprovados podem ser reabertos.");
    }

    const { error } = await context.supabase
      .from("equipamento_etps")
      .update({
        status: "em_revisao",
        aprovado_em: null,
        aprovado_por: null,
        updated_by: context.userId,
      })
      .eq("id", data.id);
    if (error) throw friendlyDbError(error);

    const { data: prof } = await context.supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", context.userId)
      .maybeSingle();
    const nome =
      (prof as { full_name?: string; email?: string } | null)?.full_name ??
      (prof as { full_name?: string; email?: string } | null)?.email ??
      "Usuário";

    await (context.supabase as unknown as {
      from: (t: string) => {
        insert: (v: Record<string, unknown>) => Promise<{ error: { message: string } | null }>;
      };
    })
      .from("equipamento_etp_historico")
      .insert({
        etp_id: data.id,
        tipo: "reabertura",
        campo: "status",
        valor_anterior: "aprovado",
        valor_novo: "em_revisao",
        mensagem: data.justificativa,
        created_by: context.userId,
        created_by_nome: nome,
      });

    return { ok: true };
  });

export const removerEtp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertCanEditEtp(context);
    const { error } = await context.supabase
      .from("equipamento_etps")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw friendlyDbError(error);
    return { ok: true };
  });
/* ============= BUSCA DE ETP (para vincular a um equipamento) ============= */

export const buscarEtpsParaVincular = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        q: z.string().trim().max(120).optional().default(""),
        excluir_equipamento_id: z.string().uuid().optional(),
      })
      .parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    let query = context.supabase
      .from("equipamento_etps")
      .select(
        "id, equipamento_id, cliente_id, versao, status, updated_at, cliente_equipamentos(codigo,modelo), clientes(codigo,razao_social)",
      )
      .is("deleted_at", null)
      .order("updated_at", { ascending: false })
      .limit(30);
    if (data.excluir_equipamento_id) {
      query = query.neq("equipamento_id", data.excluir_equipamento_id);
    }
    const { data: rows, error } = await query;
    if (error) throw friendlyDbError(error);

    const term = data.q.toLowerCase();
    const list = (rows ?? []).filter((r) => {
      if (!term) return true;
      const eqp = (r as { cliente_equipamentos?: { codigo?: string; modelo?: string } })
        .cliente_equipamentos;
      const cli = (r as { clientes?: { codigo?: string; razao_social?: string } }).clientes;
      const hay = [
        eqp?.codigo,
        eqp?.modelo,
        cli?.codigo,
        cli?.razao_social,
        `v${(r as { versao?: number }).versao ?? ""}`,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(term);
    });
    return list;
  });

/* ============= VINCULAR ETP EXISTENTE A UM EQUIPAMENTO ============= */

export const vincularEtpAoEquipamento = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({ etp_id: z.string().uuid(), equipamento_id: z.string().uuid() })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertCanEditEtp(context);

    const { data: eqp, error: eqpErr } = await context.supabase
      .from("cliente_equipamentos")
      .select("id, codigo, cliente_id")
      .eq("id", data.equipamento_id)
      .single();
    if (eqpErr || !eqp) throw new Error("Equipamento não encontrado.");

    const { data: etp, error: etpErr } = await context.supabase
      .from("equipamento_etps")
      .select("id, equipamento_id, versao")
      .eq("id", data.etp_id)
      .is("deleted_at", null)
      .single();
    if (etpErr || !etp) throw new Error("ETP não encontrado.");
    if (etp.equipamento_id === data.equipamento_id) {
      throw new Error("Este ETP já está vinculado a este equipamento.");
    }

    const { data: maiorVersao } = await context.supabase
      .from("equipamento_etps")
      .select("versao")
      .eq("equipamento_id", data.equipamento_id)
      .is("deleted_at", null)
      .order("versao", { ascending: false })
      .limit(1);
    const novaVersao = ((maiorVersao?.[0]?.versao as number | undefined) ?? 0) + 1;

    const { error } = await context.supabase
      .from("equipamento_etps")
      .update({
        equipamento_id: data.equipamento_id,
        cliente_id: eqp.cliente_id,
        versao: novaVersao,
        updated_by: context.userId,
      })
      .eq("id", data.etp_id);
    if (error) throw friendlyDbError(error);

    const { data: prof } = await context.supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", context.userId)
      .maybeSingle();
    const nome =
      (prof as { full_name?: string; email?: string } | null)?.full_name ??
      (prof as { full_name?: string; email?: string } | null)?.email ??
      "Usuário";

    await (context.supabase as unknown as {
      from: (t: string) => {
        insert: (v: Record<string, unknown>) => Promise<{ error: { message: string } | null }>;
      };
    })
      .from("equipamento_etp_historico")
      .insert({
        etp_id: data.etp_id,
        tipo: "alteracao",
        campo: "equipamento_id",
        valor_anterior: etp.equipamento_id,
        valor_novo: data.equipamento_id,
        mensagem: `ETP vinculado ao equipamento ${eqp.codigo ?? data.equipamento_id} (v${novaVersao}).`,
        created_by: context.userId,
        created_by_nome: nome,
      });

    return { ok: true, versao: novaVersao };
  });

/* ============= WORKFLOW DE STATUS ============= */

type EtpCtx = { supabase: any; userId: string };

async function nomeDoUsuario(context: EtpCtx): Promise<string> {
  const { data: prof } = await context.supabase
    .from("profiles")
    .select("full_name, email")
    .eq("id", context.userId)
    .maybeSingle();
  return (
    (prof as { full_name?: string; email?: string } | null)?.full_name ??
    (prof as { full_name?: string; email?: string } | null)?.email ??
    "Usuário"
  );
}

async function logStatus(
  context: EtpCtx,
  etpId: string,
  de: string,
  para: string,
  mensagem: string,
  tipo: "status" | "aprovacao" | "reabertura" = "status",
) {
  const nome = await nomeDoUsuario(context);
  await (context.supabase as unknown as {
    from: (t: string) => {
      insert: (v: Record<string, unknown>) => Promise<{ error: { message: string } | null }>;
    };
  })
    .from("equipamento_etp_historico")
    .insert({
      etp_id: etpId,
      tipo,
      campo: "status",
      valor_anterior: de,
      valor_novo: para,
      mensagem,
      created_by: context.userId,
      created_by_nome: nome,
    });
}

async function getRoles(context: EtpCtx) {
  const [isAdmin, isManager, isEngineer] = await Promise.all([
    hasRole(context.supabase, context.userId, "admin"),
    hasRole(context.supabase, context.userId, "manager"),
    hasRole(context.supabase, context.userId, "engineer"),
  ]);
  return { isAdmin, isManager, isEngineer };
}

async function statusAtual(context: EtpCtx, id: string): Promise<string> {
  const { data: cur, error } = await context.supabase
    .from("equipamento_etps")
    .select("status")
    .eq("id", id)
    .is("deleted_at", null)
    .single();
  if (error) throw friendlyDbError(error);
  return cur?.status as string;
}

/** rascunho → em_revisao (engenheiro, gestor ou admin) */
export const enviarEtpParaRevisao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({ id: z.string().uuid(), observacao: z.string().trim().max(2000).optional() })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { isAdmin, isManager, isEngineer } = await getRoles(context as EtpCtx);
    if (!isAdmin && !isManager && !isEngineer) {
      throw new Error("Sem permissão: apenas admin, gestores e engenheiros podem enviar para revisão.");
    }
    const atual = await statusAtual(context as EtpCtx, data.id);
    if (atual !== "rascunho") {
      throw new Error("Apenas ETPs em rascunho podem ser enviados para revisão.");
    }
    const { error } = await context.supabase
      .from("equipamento_etps")
      .update({ status: "em_revisao" as never, updated_by: context.userId })
      .eq("id", data.id);
    if (error) throw friendlyDbError(error);
    await logStatus(
      context as EtpCtx,
      data.id,
      "rascunho",
      "em_revisao",
      data.observacao || "ETP enviado para revisão.",
    );
    return { ok: true };
  });

/** em_revisao → rascunho (devolver para ajustes, sem rejeitar) */
export const voltarEtpParaRascunho = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { isAdmin, isManager, isEngineer } = await getRoles(context as EtpCtx);
    if (!isAdmin && !isManager && !isEngineer) {
      throw new Error("Sem permissão para alterar o status deste ETP.");
    }
    const atual = await statusAtual(context as EtpCtx, data.id);
    if (atual !== "em_revisao") throw new Error("Apenas ETPs em revisão podem voltar para rascunho.");
    const { error } = await context.supabase
      .from("equipamento_etps")
      .update({ status: "rascunho" as never, updated_by: context.userId })
      .eq("id", data.id);
    if (error) throw friendlyDbError(error);
    await logStatus(context as EtpCtx, data.id, "em_revisao", "rascunho", "ETP devolvido para rascunho.");
    return { ok: true };
  });

/** em_revisao → rejeitado (somente admin/gestor, com motivo) */
export const rejeitarEtp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        motivo: z
          .string()
          .trim()
          .min(10, "Descreva o motivo da rejeição (mínimo 10 caracteres).")
          .max(2000),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { isAdmin, isManager } = await getRoles(context as EtpCtx);
    if (!isAdmin && !isManager) {
      throw new Error("Somente administradores ou gestores podem rejeitar um ETP.");
    }
    const atual = await statusAtual(context as EtpCtx, data.id);
    if (atual !== "em_revisao") {
      throw new Error("Apenas ETPs em revisão podem ser rejeitados.");
    }
    const { error } = await context.supabase
      .from("equipamento_etps")
      .update({
        status: "rejeitado" as never,
        aprovado_em: null,
        aprovado_por: null,
        updated_by: context.userId,
      })
      .eq("id", data.id);
    if (error) throw friendlyDbError(error);
    await logStatus(context as EtpCtx, data.id, "em_revisao", "rejeitado", data.motivo, "aprovacao");
    return { ok: true };
  });

/** rejeitado → em_revisao (retomar após correções) */
export const retomarEtpRejeitado = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        observacao: z.string().trim().min(10, "Descreva o que foi tratado.").max(2000),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { isAdmin, isManager, isEngineer } = await getRoles(context as EtpCtx);
    if (!isAdmin && !isManager && !isEngineer) {
      throw new Error("Sem permissão para retomar este ETP.");
    }
    const atual = await statusAtual(context as EtpCtx, data.id);
    if (atual !== "rejeitado") throw new Error("Apenas ETPs rejeitados podem ser retomados.");
    const { error } = await context.supabase
      .from("equipamento_etps")
      .update({ status: "em_revisao" as never, updated_by: context.userId })
      .eq("id", data.id);
    if (error) throw friendlyDbError(error);
    await logStatus(context as EtpCtx, data.id, "rejeitado", "em_revisao", data.observacao);
    return { ok: true };
  });
