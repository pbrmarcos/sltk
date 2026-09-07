import { createServerFn } from "@tanstack/react-start";
import { friendlyDbError } from "@/lib/db-errors";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { DISCIPLINAS } from "@/lib/equipamento-disciplina-etapas.functions";
import { assertAdminOrManager } from "@/lib/admin-guard";

// Leituras do BOM do equipamento (drawer Cliente → Equipamento). A escrita/aprovação
// dos insumos vive só em projeto-insumos.functions.ts / ProjetoInsumosPanel — ver
// getProjetoParaEquipamento abaixo, usado pra levar o usuário até lá.

type AnySb = any;

const listInput = z.object({
  equipamento_id: z.string().uuid(),
  disciplina: z.enum(DISCIPLINAS).optional(),
});

export const listEquipamentoBom = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => listInput.parse(i))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as AnySb;
    let q = sb
      .from("projeto_insumos")
      .select(
        "id, cliente_id, equipamento_id, equipamento_disciplina, disciplina, descricao, quantidade, unidade, criticidade, status, custo_estimado_unit, fornecedor_sugerido_id, observacoes, created_at, updated_at" +
          ", ordem_compra_itens!ordem_compra_itens_insumo_id_fkey(id, ordem_compra_id, ordens_compra(id, numero, status))",
      )
      .eq("equipamento_id", data.equipamento_id)
      .is("deleted_at", null)
      .order("created_at", { ascending: true });
    if (data.disciplina) q = q.eq("equipamento_disciplina", data.disciplina);
    const { data: rows, error } = await q;
    if (error) throw friendlyDbError(error);
    return (rows ?? []).map((r: any) => {
      const ocItens: any[] = Array.isArray(r.ordem_compra_itens) ? r.ordem_compra_itens : [];
      const oc = ocItens
        .map((oi) => oi?.ordens_compra)
        .find(
          (o) =>
            o && (o.status === "concluida" || o.status === "recebido" || o.status === "recebida"),
        );
      return {
        ...r,
        custo_unitario_estimado: r.custo_estimado_unit ?? null,
        custo_total_estimado:
          r.custo_estimado_unit == null
            ? null
            : Number(r.custo_estimado_unit) * Number(r.quantidade ?? 1),
        ordem_compra: oc ? { id: oc.id, numero: oc.numero, status: oc.status } : null,
      };
    });
  });

// Resolve o projeto de Engenharia (equipamento_projetos) dono do BOM desse
// equipamento+disciplina, pra linkar direto pro ProjetoInsumosPanel — só leitura,
// nunca cria linha (diferente da antiga ensureProjetoForBom).
const getProjetoInput = z.object({
  equipamento_id: z.string().uuid(),
  equipamento_disciplina: z.enum(DISCIPLINAS),
});
export const getProjetoParaEquipamento = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => getProjetoInput.parse(i))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as AnySb;
    const projetoDisciplina = data.equipamento_disciplina === "producao" ? "eletrico" : "mecanico";
    const { data: row, error } = await sb
      .from("equipamento_projetos")
      .select("id")
      .eq("equipamento_id", data.equipamento_id)
      .eq("disciplina", projetoDisciplina)
      .eq("revisao", "R00")
      .maybeSingle();
    if (error) throw friendlyDbError(error);
    return {
      projeto_id: (row?.id as string | undefined) ?? null,
      projeto_disciplina: projetoDisciplina,
    };
  });

// Resumo BOM para card Visão
export const getEquipamentoBomResumo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ equipamento_id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as AnySb;
    const { data: rows, error } = await sb
      .from("projeto_insumos")
      .select("equipamento_disciplina, status, quantidade, custo_estimado_unit")
      .eq("equipamento_id", data.equipamento_id)
      .is("deleted_at", null);
    if (error) throw friendlyDbError(error);
    const buckets: Record<
      string,
      { total: number; aprovados: number; pendentes: number; custo: number }
    > = {};
    let totalItens = 0;
    let custoTotal = 0;
    for (const r of rows ?? []) {
      totalItens += 1;
      const custo = Number(r.custo_estimado_unit ?? 0) * Number(r.quantidade ?? 1);
      custoTotal += isFinite(custo) ? custo : 0;
      const key = r.equipamento_disciplina ?? "outros";
      const b = (buckets[key] ??= { total: 0, aprovados: 0, pendentes: 0, custo: 0 });
      b.total += 1;
      b.custo += isFinite(custo) ? custo : 0;
      if (
        r.status === "aprovado" ||
        r.status === "em_cotacao" ||
        r.status === "cotado" ||
        r.status === "em_compra" ||
        r.status === "recebido"
      ) {
        b.aprovados += 1;
      } else if (r.status === "rascunho" || r.status === "pronto_aprovacao") {
        b.pendentes += 1;
      }
    }
    return { totalItens, custoTotal, buckets };
  });

// Aplica o seed de disciplinas/BOM para um equipamento (idempotente).
// Manager/admin only. Se etapas ainda não existirem, popula base + família.
export const runSeedEquipamento = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ equipamento_id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as AnySb;
    await assertAdminOrManager(sb, context.userId).catch(() => {
      throw new Error("Apenas manager/admin pode rodar o seed.");
    });
    // Primeiro tenta importar do template publicado (fallback interno chama seed_equipamento_disciplinas).
    const { data: eqRow } = await sb
      .from("cliente_equipamentos")
      .select("planejamento_template_slug")
      .eq("id", data.equipamento_id)
      .maybeSingle();
    const { error } = await sb.rpc("import_etapas_do_template", {
      _eq_id: data.equipamento_id,
      _tipo_slug: eqRow?.planejamento_template_slug ?? null,
    });
    if (error) throw friendlyDbError(error);
    return { ok: true };
  });
