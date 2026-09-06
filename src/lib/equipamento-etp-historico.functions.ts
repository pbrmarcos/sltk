import { createServerFn } from "@tanstack/react-start";
import { friendlyDbError } from "@/lib/db-errors";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertCanAccessModule } from "@/lib/admin-guard";

const TABLE = "equipamento_etp_historico" as never;

export type EtpHistoricoRow = {
  id: string;
  etp_id: string;
  tipo: "alteracao" | "nota" | "aprovacao" | "status" | "anexo" | "reabertura";
  campo: string | null;
  valor_anterior: string | null;
  valor_novo: string | null;
  mensagem: string | null;
  created_by: string | null;
  created_by_nome: string | null;
  created_at: string;
};

/* ============= LIST ============= */

export const listEtpHistorico = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ etp_id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await (context.supabase as any)
      .from(TABLE)
      .select(
        "id, etp_id, tipo, campo, valor_anterior, valor_novo, mensagem, created_by, created_by_nome, created_at",
      )
      .eq("etp_id", data.etp_id)
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw friendlyDbError(error);
    return (rows ?? []) as EtpHistoricoRow[];
  });

/* ============= ADD NOTA ============= */

export const addEtpHistoricoNota = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        etp_id: z.string().uuid(),
        mensagem: z.string().trim().min(1).max(2000),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertCanAccessModule(context.supabase, context.userId, "engenharia");

    const { data: prof } = await context.supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", context.userId)
      .maybeSingle();
    const nome = (prof as any)?.full_name ?? (prof as any)?.email ?? "Usuário";

    const { error } = await (context.supabase as any).from(TABLE).insert({
      etp_id: data.etp_id,
      tipo: "nota",
      mensagem: data.mensagem,
      created_by: context.userId,
      created_by_nome: nome,
    });
    if (error) throw friendlyDbError(error);
    return { ok: true };
  });
