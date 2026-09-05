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
      .select("id, insumo_id, decidido_em")
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
