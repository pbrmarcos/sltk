/* eslint-disable @typescript-eslint/no-explicit-any */
// Fluxo de aprovação de emissão de Ordem de Compra a partir de um insumo.
// - Qualquer usuário do time (purchasing/engineer/manager/admin) pode SOLICITAR;
// - Somente engineer / manager / admin podem DECIDIR (aprovar ou recusar);
// - Compras (purchasing) só consegue emitir a OC via `createOrdemDeInsumo`
//   quando existir uma aprovação vigente (aprovada e não usada) para o insumo.

import { createServerFn } from "@tanstack/react-start";
import { friendlyDbError } from "@/lib/db-errors";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ROLES_DECISORES = ["admin", "manager", "engineer"] as const;
const ROLES_SOLICITANTES = ["admin", "manager", "engineer", "purchasing"] as const;

async function hasAnyRole(supabase: any, uid: string, roles: readonly string[]): Promise<boolean> {
  for (const r of roles) {
    const { data } = await supabase.rpc("has_role", { _user_id: uid, _role: r });
    if (data === true) return true;
  }
  return false;
}

export const solicitarAprovacaoOC = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        insumo_id: z.string().uuid(),
        fornecedor_id_sugerido: z.string().uuid().nullish(),
        nota: z.string().max(2000).optional().nullable(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const uid = context.userId;
    if (!(await hasAnyRole(sb, uid, ROLES_SOLICITANTES))) throw new Error("Sem permissão");

    // Impede pendentes duplicadas
    const { data: pend } = await sb
      .from("insumo_aprovacoes_oc")
      .select("id")
      .eq("insumo_id", data.insumo_id)
      .is("decidido_em", null)
      .maybeSingle();
    if (pend?.id) return { id: pend.id as string, already_pending: true };

    const { data: row, error } = await sb
      .from("insumo_aprovacoes_oc")
      .insert({
        insumo_id: data.insumo_id,
        solicitado_por: uid,
        solicitacao_nota: data.nota ?? null,
        fornecedor_id_sugerido: data.fornecedor_id_sugerido ?? null,
      })
      .select("id")
      .single();
    if (error) throw friendlyDbError(error);

    // Mover status do insumo para "pronto_aprovacao" se ainda estava em cotação/cotado
    await sb
      .from("projeto_insumos")
      .update({ status: "pronto_aprovacao", updated_by: uid })
      .eq("id", data.insumo_id)
      .in("status", ["em_cotacao", "cotado", "aprovado"]);

    try {
      const { safeDispatch, appUrl } = await import("@/lib/email/safe-dispatch.server");
      const { data: insumo } = await sb
        .from("projeto_insumos")
        .select("descricao")
        .eq("id", data.insumo_id)
        .maybeSingle();
      const { data: prof } = await sb
        .from("profiles")
        .select("full_name, email")
        .eq("id", uid)
        .maybeSingle();
      await safeDispatch({
        eventKey: "insumo.aprovacao_solicitada",
        triggeredBy: uid,
        entityTable: "insumo_aprovacoes_oc",
        entityId: row.id,
        vars: {
          insumo: insumo?.descricao ?? "",
          solicitante: prof?.full_name ?? prof?.email ?? "Compras",
          nota: data.nota ?? "",
          link: appUrl("/compras/solicitacao"),
        },
      });
    } catch (e) {
      console.error("[insumo-aprovacoes/solicitarAprovacaoOC] email dispatch failed", e);
    }

    return { id: row.id as string, already_pending: false };
  });

export const decidirAprovacaoOC = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        aprovacao_id: z.string().uuid(),
        decisao: z.enum(["aprovado", "recusado"]),
        anexo_id: z.string().uuid().optional().nullable(),
        nota: z.string().max(2000).optional().nullable(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const uid = context.userId;
    if (!(await hasAnyRole(sb, uid, ROLES_DECISORES)))
      throw new Error("Somente engenheiro, gerente ou admin podem decidir a aprovação.");

    const { data: cur, error: e0 } = await sb
      .from("insumo_aprovacoes_oc")
      .select("id, insumo_id, decidido_em, solicitado_por")
      .eq("id", data.aprovacao_id)
      .maybeSingle();
    if (e0 || !cur) throw new Error(e0?.message ?? "Aprovação não encontrada");
    if (cur.decidido_em) throw new Error("Esta aprovação já foi decidida.");

    // Ao aprovar exige um orçamento vencedor (fornecedor + valor).
    let fornecedor_id_sugerido: string | null = null;
    if (data.decisao === "aprovado") {
      if (!data.anexo_id) {
        throw new Error("Selecione qual orçamento venceu antes de aprovar.");
      }
      const { data: anexo, error: eA } = await sb
        .from("insumo_anexos")
        .select("id, insumo_id, kind, fornecedor_id")
        .eq("id", data.anexo_id)
        .maybeSingle();
      if (eA || !anexo) throw new Error(eA?.message ?? "Orçamento não encontrado");
      if (anexo.insumo_id !== cur.insumo_id)
        throw new Error("Orçamento não pertence a este insumo.");
      if (anexo.kind !== "orcamento") throw new Error("O anexo selecionado não é um orçamento.");
      if (!anexo.fornecedor_id)
        throw new Error(
          "Este orçamento não tem fornecedor vinculado — edite o orçamento antes de aprovar.",
        );
      fornecedor_id_sugerido = anexo.fornecedor_id;
    }

    const { error } = await sb
      .from("insumo_aprovacoes_oc")
      .update({
        decisao: data.decisao,
        decisao_nota: data.nota ?? null,
        decidido_por: uid,
        decidido_em: new Date().toISOString(),
        ...(fornecedor_id_sugerido ? { fornecedor_id_sugerido } : {}),
      })
      .eq("id", data.aprovacao_id);
    if (error) throw friendlyDbError(error);

    // Se aprovado, insumo volta a "cotado" (pronto p/ emissão).
    if (data.decisao === "aprovado") {
      await sb
        .from("projeto_insumos")
        .update({ status: "cotado", updated_by: uid })
        .eq("id", cur.insumo_id);
    }

    try {
      const { safeDispatch, appUrl } = await import("@/lib/email/safe-dispatch.server");
      const { getCriticalClient } = await import("@/lib/supabase-client.server");
      const supabaseAdmin = await getCriticalClient();
      const [{ data: insumo }, { data: solicitante }] = await Promise.all([
        sb.from("projeto_insumos").select("descricao").eq("id", cur.insumo_id).maybeSingle(),
        cur.solicitado_por
          ? supabaseAdmin
              .from("profiles")
              .select("email")
              .eq("id", cur.solicitado_por)
              .maybeSingle()
          : Promise.resolve({ data: null }),
      ]);
      await safeDispatch({
        eventKey: "insumo.aprovacao_decidida",
        triggeredBy: uid,
        entityTable: "insumo_aprovacoes_oc",
        entityId: data.aprovacao_id,
        vars: {
          insumo: insumo?.descricao ?? "",
          decisao: data.decisao === "aprovado" ? "Aprovada" : "Recusada",
          nota: data.nota ?? "",
          link: appUrl("/compras/solicitacao"),
        },
        extraTo: (solicitante as { email?: string | null } | null)?.email
          ? [(solicitante as { email: string }).email]
          : [],
      });
    } catch (e) {
      console.error("[insumo-aprovacoes/decidirAprovacaoOC] email dispatch failed", e);
    }

    return { ok: true };
  });

/** Retorna a aprovação vigente (última) do insumo, se houver. */
export const getAprovacaoAtualOC = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ insumo_id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const { data: rows } = await sb
      .from("insumo_aprovacoes_oc")
      .select("*")
      .eq("insumo_id", data.insumo_id)
      .order("created_at", { ascending: false })
      .limit(5);
    const list = (rows ?? []) as Array<{
      id: string;
      decidido_em: string | null;
      decisao: "aprovado" | "recusado" | null;
      solicitado_por: string;
      solicitacao_nota: string | null;
      decisao_nota: string | null;
      decidido_por: string | null;
      created_at: string;
      fornecedor_id_sugerido: string | null;
    }>;
    return {
      atual: list[0] ?? null,
      historico: list,
    };
  });

/**
 * Lista todas as aprovações de OC pendentes (decidido_em is null) cruzando
 * projetos — hoje só dava pra ver uma por vez dentro do dialog do insumo,
 * sem lista/fila cruzando projetos.
 */
export const listAprovacoesPendentes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as any;
    const uid = context.userId;
    if (!(await hasAnyRole(sb, uid, ROLES_DECISORES))) {
      throw new Error("Acesso restrito a quem pode decidir aprovações.");
    }
    const { data: rows, error } = await sb
      .from("insumo_aprovacoes_oc")
      .select("id, insumo_id, solicitado_por, solicitacao_nota, created_at")
      .is("decidido_em", null)
      .order("created_at", { ascending: true })
      .limit(100);
    if (error) throw friendlyDbError(error);
    const list = (rows ?? []) as Array<{
      id: string;
      insumo_id: string;
      solicitado_por: string;
      solicitacao_nota: string | null;
      created_at: string;
    }>;
    if (list.length === 0) return [];

    const insumoIds = Array.from(new Set(list.map((r) => r.insumo_id)));
    const solicitanteIds = Array.from(new Set(list.map((r) => r.solicitado_por)));
    const [{ data: insumos }, { data: profs }] = await Promise.all([
      sb.from("projeto_insumos").select("id, descricao, projeto_id").in("id", insumoIds),
      sb.from("profiles").select("id, full_name, email").in("id", solicitanteIds),
    ]);
    const insumoMap = new Map(
      ((insumos ?? []) as Array<{ id: string; descricao: string; projeto_id: string | null }>).map(
        (i) => [i.id, i],
      ),
    );
    const profMap = new Map(
      ((profs ?? []) as Array<{ id: string; full_name: string | null; email: string | null }>).map(
        (p) => [p.id, p],
      ),
    );

    return list.map((r) => ({
      id: r.id,
      insumo_id: r.insumo_id,
      insumo_descricao: insumoMap.get(r.insumo_id)?.descricao ?? "—",
      solicitante_nome:
        profMap.get(r.solicitado_por)?.full_name ?? profMap.get(r.solicitado_por)?.email ?? "—",
      solicitacao_nota: r.solicitacao_nota,
      created_at: r.created_at,
    }));
  });
