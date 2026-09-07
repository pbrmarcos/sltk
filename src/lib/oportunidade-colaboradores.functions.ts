import { createServerFn } from "@tanstack/react-start";
import { friendlyDbError } from "@/lib/db-errors";
import { logAuditServer } from "@/lib/audit.server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Colaboradores convidados numa oportunidade específica. O dono
 * (responsavel_id) ou admin/manager pode convidar outro "pilar" pra
 * ver/comentar aquela oportunidade sem abrir mão da privacidade padrão
 * (dono único) — reversível (revogar) e auditável.
 */

export type OportunidadeColaborador = {
  id: string;
  oportunidade_id: string;
  user_id: string;
  user_nome: string | null;
  user_email: string | null;
  convidado_por: string | null;
  convidado_em: string;
  revogado_em: string | null;
  revogado_por: string | null;
};

async function assertPodeGerenciar(sb: any, userId: string, oportunidadeId: string) {
  const { data: opp } = await sb
    .from("oportunidades")
    .select("id, responsavel_id")
    .eq("id", oportunidadeId)
    .maybeSingle();
  if (!opp) throw new Error("Oportunidade não encontrada.");
  if (opp.responsavel_id === userId) return;
  const [{ data: isAdmin }, { data: isManager }] = await Promise.all([
    sb.rpc("has_role", { _user_id: userId, _role: "admin" }),
    sb.rpc("has_role", { _user_id: userId, _role: "manager" }),
  ]);
  if (!isAdmin && !isManager) {
    throw new Error("Só o dono da oportunidade (ou admin/manager) pode gerenciar colaboradores.");
  }
}

export const listOportunidadeColaboradores = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ oportunidade_id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }): Promise<OportunidadeColaborador[]> => {
    const sb = context.supabase as any;
    const { data: rows, error } = await sb
      .from("oportunidade_colaboradores")
      .select(
        "id, oportunidade_id, user_id, convidado_por, convidado_em, revogado_em, revogado_por",
      )
      .eq("oportunidade_id", data.oportunidade_id)
      .order("convidado_em", { ascending: false });
    if (error) throw friendlyDbError(error);
    if ((rows ?? []).length === 0) return [];

    const { getCriticalClient } = await import("@/lib/supabase-client.server");
    const supabaseAdmin = await getCriticalClient();
    const ids: string[] = Array.from(new Set((rows ?? []).map((r: any) => r.user_id as string)));
    const { data: profs } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, email")
      .in("id", ids);
    const byId = new Map((profs ?? []).map((p: any) => [p.id, p]));
    return (rows ?? []).map((r: any) => ({
      ...r,
      user_nome: byId.get(r.user_id)?.full_name ?? null,
      user_email: byId.get(r.user_id)?.email ?? null,
    }));
  });

export const convidarColaborador = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        oportunidade_id: z.string().uuid(),
        user_id: z.string().uuid(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    await assertPodeGerenciar(sb, context.userId, data.oportunidade_id);

    const { data: existente } = await sb
      .from("oportunidade_colaboradores")
      .select("id")
      .eq("oportunidade_id", data.oportunidade_id)
      .eq("user_id", data.user_id)
      .maybeSingle();
    if (existente) {
      const { error } = await sb
        .from("oportunidade_colaboradores")
        .update({
          revogado_em: null,
          revogado_por: null,
          convidado_por: context.userId,
          convidado_em: new Date().toISOString(),
        })
        .eq("id", existente.id);
      if (error) throw friendlyDbError(error);
      await logAuditServer(sb, context.userId, {
        table_name: "oportunidade_colaboradores",
        record_id: existente.id,
        action: "UPDATE",
        field_changed: "revogado_em",
        new_value: null,
      });
      return { ok: true as const, id: existente.id };
    }

    const { data: inserted, error } = await sb
      .from("oportunidade_colaboradores")
      .insert({
        oportunidade_id: data.oportunidade_id,
        user_id: data.user_id,
        convidado_por: context.userId,
      })
      .select("id")
      .single();
    if (error) throw friendlyDbError(error);
    await logAuditServer(sb, context.userId, {
      table_name: "oportunidade_colaboradores",
      record_id: inserted.id,
      action: "INSERT",
      new_value: { oportunidade_id: data.oportunidade_id, user_id: data.user_id },
    });
    return { ok: true as const, id: inserted.id };
  });

export const revogarColaborador = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const { data: colab } = await sb
      .from("oportunidade_colaboradores")
      .select("id, oportunidade_id")
      .eq("id", data.id)
      .maybeSingle();
    if (!colab) throw new Error("Convite não encontrado.");
    await assertPodeGerenciar(sb, context.userId, colab.oportunidade_id);

    const { error } = await sb
      .from("oportunidade_colaboradores")
      .update({ revogado_em: new Date().toISOString(), revogado_por: context.userId })
      .eq("id", data.id);
    if (error) throw friendlyDbError(error);
    await logAuditServer(sb, context.userId, {
      table_name: "oportunidade_colaboradores",
      record_id: data.id,
      action: "UPDATE",
      field_changed: "revogado_em",
      new_value: new Date().toISOString(),
    });
    return { ok: true as const };
  });
