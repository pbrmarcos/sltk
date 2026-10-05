// Análise de leads da mineração com o motor de qualificação (Gemini).
// A análise roda em segundo plano no servidor (fire-and-forget): a busca na
// Penta retorna na hora e os leads vão ganhando grade A/B/C conforme a fila
// anda; a UI acompanha por refetch. Se o servidor reiniciar no meio, os leads
// ficam "pendente" e podem ser reanalisados pelo botão.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type LeadRow = {
  id: string;
  empresa: string;
  documento: string | null;
  pais: string | null;
  contraparte: string | null;
  operacoes: number | null;
  valor_total: number | null;
  rubros: string[] | null;
};

/** Fila global simples: evita duas análises simultâneas estourarem rate limit. */
let filaAtiva = false;
const filaPendente: Array<{ ids: string[]; userId: string | null }> = [];

async function processarFila(): Promise<void> {
  if (filaAtiva) return;
  filaAtiva = true;
  try {
    while (filaPendente.length > 0) {
      const lote = filaPendente.shift()!;
      await analisarLote(lote.ids, lote.userId);
    }
  } finally {
    filaAtiva = false;
  }
}

async function analisarLote(ids: string[], userId: string | null): Promise<void> {
  const { getCriticalClient } = await import("@/lib/supabase-client.server");
  const { qualificarLead } = await import("@/lib/lead-qualify.server");
  const admin = (await getCriticalClient()) as unknown as {
    from: (t: string) => {
      select: (c: string) => {
        in: (c: string, v: string[]) => Promise<{ data: LeadRow[] | null }>;
      };
      update: (p: object) => { eq: (c: string, v: string) => Promise<{ error: unknown }> };
    };
  };

  const { data: leads } = await admin
    .from("mineracao_resultados")
    .select("id, empresa, documento, pais, contraparte, operacoes, valor_total, rubros")
    .in("id", ids);

  for (const lead of leads ?? []) {
    try {
      const extras = [
        lead.rubros?.length ? `NCMs/rubros: ${lead.rubros.slice(0, 8).join(", ")}` : null,
        lead.operacoes != null ? `${lead.operacoes} operações de comércio exterior` : null,
        lead.valor_total != null
          ? `valor total movimentado ~USD ${Math.round(lead.valor_total).toLocaleString("en-US")}`
          : null,
        lead.contraparte ? `contraparte no exterior: ${lead.contraparte}` : null,
      ]
        .filter(Boolean)
        .join("; ");

      const r = await qualificarLead({
        empresa: lead.empresa,
        pais: lead.pais,
        documento: lead.documento,
        segmento: lead.rubros?.join(" ") ?? null,
        origem: "penta",
        extras,
        userId,
      });

      await admin
        .from("mineracao_resultados")
        .update({
          analise_ia: {
            motivo: r.motivo,
            abordagem_sugerida: r.abordagem_sugerida ?? null,
            produtos_sltk: r.produtos_sltk ?? [],
            ja_cliente: r.ja_cliente ?? null,
            dados: r.dados,
            etapas: r.etapas,
          },
          analise_grade: r.grade,
          analise_status: "ok",
          analisado_em: new Date().toISOString(),
        })
        .eq("id", lead.id);
    } catch (err) {
      await admin
        .from("mineracao_resultados")
        .update({
          analise_ia: { erro: err instanceof Error ? err.message : "Falha na análise." },
          analise_status: "erro",
          analisado_em: new Date().toISOString(),
        })
        .eq("id", lead.id)
        .then(
          () => undefined,
          () => undefined,
        );
    }
  }
}

/** Enfileira a análise em segundo plano. Chamado pela busca da Penta e pelo botão Reanalisar. */
export function dispararAnaliseLeads(ids: string[], userId: string | null): void {
  if (ids.length === 0) return;
  filaPendente.push({ ids, userId });
  void processarFila().catch((e) => console.error("[mineracao-analise] fila falhou", e));
}

const reanalisarInput = z.object({ ids: z.array(z.string().uuid()).min(1).max(100) });

export const reanalisarLeads = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof reanalisarInput>) => reanalisarInput.parse(d))
  .handler(async ({ data, context }) => {
    const { assertCanAccessModule } = await import("@/lib/admin-guard");
    await assertCanAccessModule(
      context.supabase,
      context.userId,
      "comercial",
      "Acesso restrito ao time comercial.",
    );
    const { getCriticalClient } = await import("@/lib/supabase-client.server");
    const admin = (await getCriticalClient()) as unknown as {
      from: (t: string) => {
        update: (p: object) => {
          in: (c: string, v: string[]) => Promise<{ error: { message: string } | null }>;
        };
      };
    };
    const { error } = await admin
      .from("mineracao_resultados")
      .update({ analise_status: "pendente", analise_grade: null, analise_ia: null })
      .in("id", data.ids);
    if (error) throw new Error(error.message);

    dispararAnaliseLeads(data.ids, context.userId);
    return { ok: true as const, enfileirados: data.ids.length };
  });
