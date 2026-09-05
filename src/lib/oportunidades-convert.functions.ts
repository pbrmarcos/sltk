import { createServerFn } from "@tanstack/react-start";
import { assertCanAccessModule } from "@/lib/admin-guard";
import { friendlyDbError } from "@/lib/db-errors";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Conversão em lote: a partir de uma empresa (lead OU cliente já cadastrado),
 * lista todas as oportunidades ativas vinculadas e permite, no mesmo passo,
 * marcar cada uma como ganha (criando processo, opcionalmente aplicando
 * template), manter no pipeline ou marcar perdida.
 *
 * Pré-requisito: o cliente já deve existir (mode "existing"). Quando o
 * usuário cria um cliente novo pelo wizard, o front faz a chamada a
 * `createCliente` antes e só depois invoca esta função com o `cliente_id`
 * resultante.
 */

/* -------- listOportunidadesByEmpresa -------- */

export type EmpresaOpp = {
  id: string;
  codigo: string;
  titulo: string;
  cliente_id: string | null;
  empresa_lead: string | null;
  pipeline_stage: string;
  valor_estimado: number | null;
  probabilidade: number;
  responsavel_id: string;
  stage_entered_at: string;
  processo_id: string | null;
};

export const listOportunidadesByEmpresa = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: { cliente_id?: string | null; empresa_lead?: string | null; source_id?: string }) =>
      z
        .object({
          cliente_id: z.string().uuid().nullable().optional(),
          empresa_lead: z.string().max(200).nullable().optional(),
          source_id: z.string().uuid().optional(),
        })
        .parse(data ?? {}),
  )
  .handler(async ({ data, context }): Promise<EmpresaOpp[]> => {
    let q = context.supabase
      .from("oportunidades")
      .select(
        "id, codigo, titulo, cliente_id, empresa_lead, pipeline_stage, valor_estimado, probabilidade, responsavel_id, stage_entered_at, processo_id",
      )
      .is("deleted_at", null)
      .neq("pipeline_stage", "perdido");

    if (data.cliente_id) {
      q = q.eq("cliente_id", data.cliente_id);
    } else if (data.empresa_lead && data.empresa_lead.trim()) {
      // sem cliente vinculado, agrupa por nome do lead (case-insensitive, sem fragmentos perigosos)
      const safe = data.empresa_lead.trim().replace(/[%,()]/g, "");
      q = q.is("cliente_id", null).ilike("empresa_lead", `%${safe}%`);
    } else if (data.source_id) {
      q = q.eq("id", data.source_id);
    } else {
      return [];
    }

    const { data: rows, error } = await q
      .order("stage_entered_at", { ascending: false })
      .limit(100);
    if (error) throw friendlyDbError(error);
    return (rows ?? []).map((r) => ({
      id: r.id,
      codigo: r.codigo ?? "",
      titulo: r.titulo,
      cliente_id: r.cliente_id,
      empresa_lead: r.empresa_lead,
      pipeline_stage: r.pipeline_stage,
      valor_estimado: r.valor_estimado === null ? null : Number(r.valor_estimado),
      probabilidade: r.probabilidade,
      responsavel_id: r.responsavel_id,
      stage_entered_at: r.stage_entered_at,
      processo_id: r.processo_id,
    }));
  });

/* -------- convertOportunidadesToCliente -------- */

const convertInput = z.object({
  cliente_id: z.string().uuid(),
  source_oportunidade_id: z.string().uuid(),
  oportunidades: z
    .array(
      z.object({
        id: z.string().uuid(),
        action: z.enum(["win", "keep", "lose"]),
        lost_reason: z.string().trim().min(10).max(500).optional(),
        template_id: z.string().uuid().optional(),
      }),
    )
    .min(1)
    .max(50),
});

async function applyTemplateInline(
  supabase: any,
  processo_id: string,
  template_id: string,
  processo_tipo: string,
  pilar_id: string | null,
) {
  const { data: t } = await supabase
    .from("processo_templates")
    .select("id, nome, tipo")
    .eq("id", template_id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!t) return { tarefas: 0, eventos: 0 };
  if (t.tipo !== processo_tipo) return { tarefas: 0, eventos: 0 };

  const [{ data: tarefas }, { data: eventos }] = await Promise.all([
    supabase
      .from("processo_template_tarefas")
      .select("*")
      .eq("template_id", template_id)
      .order("ordem", { ascending: true }),
    supabase
      .from("processo_template_eventos")
      .select("*")
      .eq("template_id", template_id)
      .order("ordem", { ascending: true }),
  ]);

  const hoje = new Date();
  const addDias = (d: number) => {
    const dt = new Date(hoje);
    dt.setDate(dt.getDate() + d);
    return dt.toISOString().slice(0, 10);
  };

  let tCount = 0;
  if (tarefas && tarefas.length > 0) {
    const rows = tarefas.map((tt: any) => ({
      processo_id,
      titulo: tt.titulo,
      prazo: addDias(tt.dias_apos_inicio),
      pilar_id,
      status: "aberta" as const,
    }));
    const { error } = await supabase.from("processo_tarefas").insert(rows);
    if (error) throw friendlyDbError(error);
    tCount = rows.length;
  }

  let eCount = 0;
  if (eventos && eventos.length > 0) {
    const rows = eventos.map((e: any) => ({
      processo_id,
      kind: "note" as const,
      text: `[${e.tipo}] ${e.titulo} (D+${e.dias_apos_inicio})`,
    }));
    const { error } = await supabase.from("processo_eventos").insert(rows);
    if (error) throw friendlyDbError(error);
    eCount = rows.length;
  }

  await supabase.from("processo_eventos").insert({
    processo_id,
    kind: "note",
    text: `Template "${t.nome}" aplicado: ${tCount} tarefas, ${eCount} eventos.`,
  });

  return { tarefas: tCount, eventos: eCount };
}

export const convertOportunidadesToCliente = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => convertInput.parse(data))
  .handler(async ({ data, context }) => {
    await assertCanAccessModule(context.supabase, context.userId, "comercial");
    // Valida cliente
    const { data: cli, error: cliErr } = await context.supabase
      .from("clientes")
      .select("id, codigo, status")
      .eq("id", data.cliente_id)
      .is("deleted_at", null)
      .maybeSingle();
    if (cliErr) throw friendlyDbError(cliErr);
    if (!cli) throw new Error("Cliente não encontrado.");

    // Promove para ativo, se ainda não estiver
    if (cli.status !== "ativo") {
      const { error } = await context.supabase
        .from("clientes")
        .update({ status: "ativo", updated_by: context.userId })
        .eq("id", data.cliente_id);
      if (error) throw friendlyDbError(error);
    }

    const created: Array<{
      oportunidade_id: string;
      processo_id: string;
      processo_codigo: string;
      template_aplicado: boolean;
    }> = [];

    for (const item of data.oportunidades) {
      const { data: opp, error: oppErr } = await context.supabase
        .from("oportunidades")
        .select("*")
        .eq("id", item.id)
        .is("deleted_at", null)
        .maybeSingle();
      if (oppErr) throw friendlyDbError(oppErr);
      if (!opp) continue;

      if (item.action === "win") {
        if (opp.processo_id) {
          // já tem processo: apenas garante vínculo do cliente
          await context.supabase
            .from("oportunidades")
            .update({ cliente_id: data.cliente_id })
            .eq("id", opp.id);
          continue;
        }
        const { data: proc, error: procErr } = await context.supabase
          .from("processos")
          .insert({
            codigo: "",
            titulo: opp.titulo,
            cliente_id: data.cliente_id,
            pilar_id: opp.responsavel_id,
            tipo: "projeto",
            stage: "Lead",
            valor: opp.valor_estimado,
          })
          .select("id, codigo")
          .single();
        if (procErr || !proc) throw new Error(procErr?.message ?? "Falha ao criar processo");

        let aplicado = false;
        if (item.template_id) {
          try {
            await applyTemplateInline(
              context.supabase,
              proc.id,
              item.template_id,
              "projeto",
              opp.responsavel_id,
            );
            aplicado = true;
          } catch {
            // ignora erro de template, processo já está criado
          }
        }

        const { error: updErr } = await context.supabase
          .from("oportunidades")
          .update({
            pipeline_stage: "ganho",
            cliente_id: data.cliente_id,
            processo_id: proc.id,
          })
          .eq("id", opp.id);
        if (updErr) throw friendlyDbError(updErr);

        created.push({
          oportunidade_id: opp.id,
          processo_id: proc.id,
          processo_codigo: proc.codigo ?? "",
          template_aplicado: aplicado,
        });
      } else if (item.action === "lose") {
        const { error } = await context.supabase
          .from("oportunidades")
          .update({
            pipeline_stage: "perdido",
            cliente_id: data.cliente_id,
            lost_reason: item.lost_reason ?? "Convertida em outra oportunidade da mesma empresa.",
          })
          .eq("id", opp.id);
        if (error) throw friendlyDbError(error);
      } else {
        // keep: apenas vincula o cliente
        if (opp.cliente_id !== data.cliente_id) {
          const { error } = await context.supabase
            .from("oportunidades")
            .update({ cliente_id: data.cliente_id })
            .eq("id", opp.id);
          if (error) throw friendlyDbError(error);
        }
      }
    }

    return {
      cliente_id: cli.id,
      cliente_codigo: cli.codigo,
      processos: created,
    };
  });
