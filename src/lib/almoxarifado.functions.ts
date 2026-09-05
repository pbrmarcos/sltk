import { createServerFn } from "@tanstack/react-start";
import { assertCanAccessModule } from "@/lib/admin-guard";
import { friendlyDbError } from "@/lib/db-errors";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/* eslint-disable @typescript-eslint/no-explicit-any */

const uuid = z.string().uuid();

/* ------------------------------------------------------------------ */
/* Cadastros auxiliares                                                */
/* ------------------------------------------------------------------ */

export const listAlmoxCadastros = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as any;
    const [un, loc] = await Promise.all([
      sb.from("almox_unidades").select("codigo, descricao, casas_decimais").eq("ativo", true).order("codigo"),
      sb.from("almox_locais").select("id, codigo, descricao, padrao, ativo").eq("ativo", true).order("codigo"),
    ]);
    if (un.error) throw new Error(un.error.message);
    if (loc.error) throw new Error(loc.error.message);
    return { unidades: un.data ?? [], locais: loc.data ?? [] };
  });

/* ------------------------------------------------------------------ */
/* Catálogo + saldo                                                    */
/* ------------------------------------------------------------------ */

export const listAlmoxEstoque = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        q: z.string().optional(),
        somente_abaixo_minimo: z.boolean().optional().default(false),
        somente_com_saldo: z.boolean().optional().default(false),
        page: z.number().int().min(1).optional().default(1),
        per_page: z.number().int().min(1).max(200).optional().default(50),
      })
      .parse(i ?? {}),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    let q = sb.from("almox_saldo_item").select("*", { count: "exact" }).eq("ativo", true);
    if (data.q?.trim()) {
      const t = `%${data.q.trim()}%`;
      q = q.or(`codigo.ilike.${t},descricao.ilike.${t}`);
    }
    if (data.somente_abaixo_minimo) q = q.eq("abaixo_minimo", true);
    if (data.somente_com_saldo) q = q.gt("total", 0);
    const from = (data.page - 1) * data.per_page;
    const { data: rows, count, error } = await q
      .order("codigo", { ascending: true })
      .range(from, from + data.per_page - 1);
    if (error) throw friendlyDbError(error);

    const { data: kpi } = await sb.from("almox_saldo_item").select("total, valor_total, abaixo_minimo, ativo");
    const ativos = ((kpi ?? []) as any[]).filter((r) => r.ativo);
    return {
      rows: rows ?? [],
      total: count ?? 0,
      kpis: {
        itens: ativos.length,
        valor: ativos.reduce((s, r) => s + Number(r.valor_total || 0), 0),
        abaixo_minimo: ativos.filter((r) => r.abaixo_minimo).length,
        com_saldo: ativos.filter((r) => Number(r.total) > 0).length,
      },
    };
  });

export const buscarItensSemelhantes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ descricao: z.string().min(2), part_number: z.string().optional().nullable() }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const termo = data.descricao.trim().slice(0, 60);
    const { data: rows } = await sb
      .from("almox_itens")
      .select("id, codigo, descricao, unidade_estoque, part_number")
      .or(
        [
          `descricao.ilike.%${termo}%`,
          data.part_number?.trim() ? `part_number.ilike.%${data.part_number.trim()}%` : null,
        ]
          .filter(Boolean)
          .join(","),
      )
      .limit(8);
    return rows ?? [];
  });

const itemSchema = z.object({
  id: uuid.optional(),
  descricao: z.string().min(3, "Descreva o item."),
  unidade_estoque: z.string().min(1, "Selecione a unidade."),
  categoria: z.string().optional().nullable(),
  part_number: z.string().optional().nullable(),
  codigo_fabricante: z.string().optional().nullable(),
  fabricante: z.string().optional().nullable(),
  estoque_minimo: z.number().min(0).optional().default(0),
  observacoes: z.string().optional().nullable(),
  ativo: z.boolean().optional().default(true),
});

export const salvarAlmoxItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => itemSchema.parse(i))
  .handler(async ({ data, context }) => {
    await assertCanAccessModule(context.supabase, context.userId, "compras");
    const sb = context.supabase as any;
    const clean = (v?: string | null) => (v && v.trim() ? v.trim() : null);
    const payload = {
      descricao: data.descricao.trim(),
      unidade_estoque: data.unidade_estoque,
      categoria: clean(data.categoria),
      part_number: clean(data.part_number),
      codigo_fabricante: clean(data.codigo_fabricante),
      fabricante: clean(data.fabricante),
      estoque_minimo: data.estoque_minimo ?? 0,
      observacoes: clean(data.observacoes),
      ativo: data.ativo ?? true,
      updated_by: context.userId,
    };
    if (data.id) {
      const { error } = await sb.from("almox_itens").update(payload).eq("id", data.id);
      if (error) throw new Error(traduzErro(error.message));
      return { id: data.id };
    }
    const { data: row, error } = await sb
      .from("almox_itens")
      .insert({ ...payload, created_by: context.userId })
      .select("id, codigo")
      .single();
    if (error) throw new Error(traduzErro(error.message));
    return row;
  });

function traduzErro(msg: string) {
  if (/almox_itens_part_number_unq/.test(msg))
    return "Já existe um item com esse part number (comparação ignora acentos e maiúsculas).";
  if (/almox_itens_codigo_fab_unq/.test(msg))
    return "Já existe um item com esse código de fabricante.";
  if (/Saldo insuficiente|Disponível insuficiente|reserva/i.test(msg)) return msg;
  return msg;
}

/* ------------------------------------------------------------------ */
/* Detalhe do item                                                     */
/* ------------------------------------------------------------------ */

export const getAlmoxItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: uuid }).parse(i))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const { data: item, error } = await sb.from("almox_itens").select("*").eq("id", data.id).maybeSingle();
    if (error) throw friendlyDbError(error);
    if (!item) throw new Error("Item não encontrado.");

    const [saldo, porLocal, movs, reservas, locais] = await Promise.all([
      sb.from("almox_saldo_item").select("*").eq("item_id", data.id).maybeSingle(),
      sb.from("almox_saldo_item_local").select("*").eq("item_id", data.id),
      sb
        .from("almox_movimentos")
        .select(
          "id, seq, tipo, quantidade, custo_unitario, custo_medio_apos, local_id, projeto_id, justificativa, observacao, created_at, created_by",
        )
        .eq("item_id", data.id)
        .order("seq", { ascending: false })
        .limit(200),
      sb
        .from("almox_reservas")
        .select("id, projeto_id, quantidade, quantidade_retirada, status, expira_em, observacao, created_at")
        .eq("item_id", data.id)
        .order("created_at", { ascending: false }),
      sb.from("almox_locais").select("id, codigo, descricao").eq("ativo", true),
    ]);

    const locMap = new Map((locais.data ?? []).map((l: any) => [l.id, l.codigo]));
    const autores = [...new Set(((movs.data ?? []) as any[]).map((m) => m.created_by).filter(Boolean))];
    let nomes = new Map<string, string>();
    if (autores.length) {
      const { data: profs } = await sb.from("profiles").select("id, full_name").in("id", autores);
      nomes = new Map(((profs ?? []) as any[]).map((p) => [p.id, p.full_name]));
    }
    const projIds = [
      ...new Set(
        [
          ...((movs.data ?? []) as any[]).map((m) => m.projeto_id),
          ...((reservas.data ?? []) as any[]).map((r) => r.projeto_id),
        ].filter(Boolean),
      ),
    ];
    let projetos = new Map<string, string>();
    if (projIds.length) {
      const { data: ps } = await sb
        .from("equipamento_projetos")
        .select("id, disciplina, revisao")
        .in("id", projIds);
      projetos = new Map(((ps ?? []) as any[]).map((p) => [p.id, `${p.disciplina} rev ${p.revisao}`]));
    }

    return {
      item,
      saldo: saldo.data ?? null,
      por_local: ((porLocal.data ?? []) as any[]).map((r) => ({
        ...r,
        local_codigo: locMap.get(r.local_id) ?? "—",
      })),
      movimentos: ((movs.data ?? []) as any[]).map((m) => ({
        ...m,
        local_codigo: locMap.get(m.local_id) ?? "—",
        autor: m.created_by ? (nomes.get(m.created_by) ?? "—") : "—",
        projeto_codigo: m.projeto_id ? (projetos.get(m.projeto_id) ?? "—") : null,
      })),
      reservas: ((reservas.data ?? []) as any[]).map((r) => ({
        ...r,
        projeto_codigo: projetos.get(r.projeto_id) ?? "—",
      })),
    };
  });

/* ------------------------------------------------------------------ */
/* Movimentos                                                          */
/* ------------------------------------------------------------------ */

export const registrarMovimento = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        item_id: uuid,
        local_id: uuid,
        tipo: z.enum(["entrada_avulsa", "saida_projeto", "devolucao", "ajuste"]),
        quantidade: z.number().positive("Informe uma quantidade maior que zero."),
        custo_unitario: z.number().min(0).optional().default(0),
        projeto_id: uuid.optional().nullable(),
        justificativa: z.string().optional().nullable(),
        observacao: z.string().optional().nullable(),
        negativo: z.boolean().optional().default(false),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertCanAccessModule(context.supabase, context.userId, "compras");
    const sb = context.supabase as any;
    // saída e ajuste negativo entram com quantidade negativa (movimento é append-only)
    const sinal = data.tipo === "saida_projeto" || (data.tipo === "ajuste" && data.negativo) ? -1 : 1;
    if (data.tipo === "saida_projeto" && !data.projeto_id)
      throw new Error("Selecione o projeto que vai receber o material.");
    if (data.tipo === "ajuste" && !data.justificativa?.trim())
      throw new Error("Ajuste de inventário exige justificativa.");

    const { error } = await sb.from("almox_movimentos").insert({
      item_id: data.item_id,
      local_id: data.local_id,
      tipo: data.tipo,
      quantidade: sinal * data.quantidade,
      custo_unitario: data.custo_unitario ?? 0,
      projeto_id: data.projeto_id ?? null,
      justificativa: data.justificativa?.trim() || null,
      observacao: data.observacao?.trim() || null,
      created_by: context.userId,
    });
    if (error) throw new Error(traduzErro(error.message));
    return { ok: true };
  });

/* ------------------------------------------------------------------ */
/* Reservas                                                            */
/* ------------------------------------------------------------------ */

export const reservarEstoque = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        item_id: uuid,
        projeto_id: uuid,
        quantidade: z.number().positive(),
        observacao: z.string().optional().nullable(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const { data: id, error } = await sb.rpc("almox_reservar", {
      _item_id: data.item_id,
      _projeto_id: data.projeto_id,
      _quantidade: data.quantidade,
      _expira_em: null,
      _observacao: data.observacao ?? null,
    });
    if (error) throw new Error(traduzErro(error.message));
    return { id };
  });

export const cancelarReserva = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ reserva_id: uuid, motivo: z.string().optional() }).parse(i))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const { error } = await sb.rpc("almox_cancelar_reserva", {
      _reserva_id: data.reserva_id,
      _motivo: data.motivo ?? null,
    });
    if (error) throw new Error(traduzErro(error.message));
    return { ok: true };
  });

/* ------------------------------------------------------------------ */
/* Recebimento por ordem de compra                                     */
/* ------------------------------------------------------------------ */

export const listOcsParaReceber = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as any;
    const { data: ocs, error } = await sb
      .from("ordens_compra")
      .select("id, numero, status, fornecedor_razao_social, emissao_em, entrega_prevista")
      .in("status", ["aprovada", "enviada", "recebida_parcial"])
      .is("deleted_at", null)
      .order("emissao_em", { ascending: false })
      .limit(100);
    if (error) throw friendlyDbError(error);
    const ids = ((ocs ?? []) as any[]).map((o) => o.id);
    let pend = new Map<string, number>();
    if (ids.length) {
      const { data: r } = await sb.from("almox_recebimento_oc").select("*").in("ordem_compra_id", ids);
      pend = new Map(((r ?? []) as any[]).map((x) => [x.ordem_compra_id, Number(x.quantidade_pendente || 0)]));
    }
    return ((ocs ?? []) as any[]).map((o) => ({ ...o, quantidade_pendente: pend.get(o.id) ?? 0 }));
  });

export const getOcRecebimento = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ ordem_compra_id: uuid }).parse(i))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const [oc, itens, recv] = await Promise.all([
      sb
        .from("ordens_compra")
        .select("id, numero, status, fornecedor_razao_social, moeda")
        .eq("id", data.ordem_compra_id)
        .maybeSingle(),
      sb
        .from("ordem_compra_itens")
        .select("id, descricao, unidade, quantidade, valor_unitario, codigo_produto, ordem")
        .eq("ordem_compra_id", data.ordem_compra_id)
        .order("ordem"),
      sb.from("almox_recebimento_oc_item").select("*").eq("ordem_compra_id", data.ordem_compra_id),
    ]);
    const rec = new Map(((recv.data ?? []) as any[]).map((r) => [r.ordem_compra_item_id, r]));
    return {
      oc: oc.data ?? null,
      itens: ((itens.data ?? []) as any[]).map((it) => ({
        ...it,
        quantidade_recebida: Number(rec.get(it.id)?.quantidade_recebida ?? 0),
        quantidade_pendente: Number(rec.get(it.id)?.quantidade_pendente ?? it.quantidade),
      })),
    };
  });

export const registrarRecebimento = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        ordem_compra_id: uuid,
        evento_key: z.string().min(6),
        nota_fiscal: z.string().optional().nullable(),
        observacao: z.string().optional().nullable(),
        linhas: z
          .array(
            z.object({
              ordem_compra_item_id: uuid,
              item_id: uuid,
              local_id: uuid,
              quantidade: z.number().positive(),
              fator_conversao: z.number().positive().optional().default(1),
              custo_unitario: z.number().min(0).optional().default(0),
            }),
          )
          .min(1, "Informe ao menos uma linha recebida."),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertCanAccessModule(context.supabase, context.userId, "compras");
    const sb = context.supabase as any;
    // idempotência: evento_key único por OC
    const { data: existente } = await sb
      .from("almox_recebimentos")
      .select("id")
      .eq("ordem_compra_id", data.ordem_compra_id)
      .eq("evento_key", data.evento_key)
      .maybeSingle();
    if (existente) return { id: existente.id, repetido: true };

    const { data: receb, error: e1 } = await sb
      .from("almox_recebimentos")
      .insert({
        ordem_compra_id: data.ordem_compra_id,
        evento_key: data.evento_key,
        nota_fiscal: data.nota_fiscal?.trim() || null,
        observacao: data.observacao?.trim() || null,
        recebido_por: context.userId,
      })
      .select("id")
      .single();
    if (e1) throw new Error(traduzErro(e1.message));

    const rows = data.linhas.map((l) => ({
      item_id: l.item_id,
      local_id: l.local_id,
      tipo: "entrada_oc",
      quantidade: l.quantidade * (l.fator_conversao ?? 1),
      fator_conversao: l.fator_conversao ?? 1,
      custo_unitario: (l.custo_unitario ?? 0) / (l.fator_conversao ?? 1),
      ordem_compra_item_id: l.ordem_compra_item_id,
      recebimento_id: receb.id,
      created_by: context.userId,
    }));
    const { error: e2 } = await sb.from("almox_movimentos").insert(rows);
    if (e2) throw new Error(traduzErro(e2.message));
    return { id: receb.id, repetido: false };
  });

/* ------------------------------------------------------------------ */
/* Projetos (para saída / reserva)                                     */
/* ------------------------------------------------------------------ */

export const listProjetosAtivos = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as any;
    const { data } = await sb
      .from("equipamento_projetos")
      .select("id, disciplina, revisao, fase, status, equipamento_id")
      .neq("status", "obsoleto")
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(200);
    const rows = (data ?? []) as any[];
    const eqIds = [...new Set(rows.map((r) => r.equipamento_id).filter(Boolean))];
    let eqs = new Map<string, string>();
    if (eqIds.length) {
      const { data: e } = await sb.from("cliente_equipamentos").select("id, codigo, modelo").in("id", eqIds);
      eqs = new Map(((e ?? []) as any[]).map((x) => [x.id, x.codigo ?? x.modelo]));
    }
    return rows.map((r) => ({
      id: r.id,
      label: `${eqs.get(r.equipamento_id) ?? "Projeto"} · ${r.disciplina} · rev ${r.revisao}`,
    }));
  });

/* ------------------------------------------------------------------ */
/* Integração com os insumos do projeto (Engenharia)                   */
/* ------------------------------------------------------------------ */

/** Saldo de almoxarifado das linhas de insumo de um projeto, já convertido
 *  para a unidade da linha através do fator de conversão do vínculo. */
export const getEstoqueDosInsumos = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ projeto_id: uuid }).parse(i))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const { data: linhas } = await sb
      .from("projeto_insumos")
      .select("id, almox_item_id, almox_fator_conversao, quantidade, unidade")
      .eq("projeto_id", data.projeto_id)
      .not("almox_item_id", "is", null)
      .is("deleted_at", null);

    const rows = (linhas ?? []) as any[];
    if (!rows.length) return {} as Record<string, any>;

    const itemIds = [...new Set(rows.map((r) => r.almox_item_id))];
    const [{ data: saldos }, { data: reservas }] = await Promise.all([
      sb.from("almox_saldo_item").select("item_id, codigo, descricao, unidade_estoque, total, reservado, disponivel").in("item_id", itemIds),
      sb
        .from("almox_reservas")
        .select("id, item_id, quantidade, quantidade_retirada, status")
        .eq("projeto_id", data.projeto_id)
        .eq("status", "ativa")
        .in("item_id", itemIds),
    ]);

    const saldoMap = new Map(((saldos ?? []) as any[]).map((s) => [s.item_id, s]));
    const reservaMap = new Map<string, any>();
    for (const r of ((reservas ?? []) as any[])) {
      const cur = reservaMap.get(r.item_id);
      if (cur) cur.quantidade = Number(cur.quantidade) + Number(r.quantidade);
      else reservaMap.set(r.item_id, { ...r });
    }

    const out: Record<string, any> = {};
    for (const l of rows) {
      const s = saldoMap.get(l.almox_item_id);
      if (!s) continue;
      const fator = Number(l.almox_fator_conversao ?? 1) || 1;
      const res = reservaMap.get(l.almox_item_id) ?? null;
      out[l.id] = {
        item_id: l.almox_item_id,
        codigo: s.codigo,
        descricao: s.descricao,
        unidade_estoque: s.unidade_estoque,
        fator,
        // valores na unidade da linha de insumo
        total: Number(s.total ?? 0) / fator,
        disponivel: Number(s.disponivel ?? 0) / fator,
        reservado_projeto: res ? Number(res.quantidade) / fator : 0,
        reserva_id: res?.id ?? null,
      };
    }
    return out;
  });

const norm = (s?: string | null) => (s ?? "").trim().toLowerCase();

/** Vincula uma linha de insumo a um item do catálogo. Se as unidades
 *  divergirem, o fator de conversão é obrigatório. */
export const vincularInsumoAoItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        insumo_id: uuid,
        item_id: uuid.nullable(),
        fator: z.number().positive().nullable().optional(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertCanAccessModule(context.supabase, context.userId, "compras");
    const sb = context.supabase as any;

    if (!data.item_id) {
      const { error } = await sb
        .from("projeto_insumos")
        .update({ almox_item_id: null, almox_fator_conversao: null, updated_by: context.userId })
        .eq("id", data.insumo_id);
      if (error) throw new Error(traduzErro(error.message));
      return { ok: true, fator: null };
    }

    const [{ data: linha }, { data: item }] = await Promise.all([
      sb.from("projeto_insumos").select("id, unidade, descricao").eq("id", data.insumo_id).maybeSingle(),
      sb.from("almox_itens").select("id, unidade_estoque, descricao").eq("id", data.item_id).maybeSingle(),
    ]);
    if (!linha) throw new Error("Linha de insumo não encontrada.");
    if (!item) throw new Error("Item do almoxarifado não encontrado.");

    const mesmaUnidade = norm(linha.unidade) === norm(item.unidade_estoque);
    const fator = mesmaUnidade ? 1 : Number(data.fator ?? 0);
    if (!mesmaUnidade && !(fator > 0)) {
      throw new Error(
        `A unidade do insumo (${linha.unidade ?? "—"}) é diferente da unidade de estoque (${item.unidade_estoque}). ` +
          "Informe quantas unidades de estoque equivalem a 1 unidade do insumo para concluir o vínculo.",
      );
    }

    const { error } = await sb
      .from("projeto_insumos")
      .update({ almox_item_id: item.id, almox_fator_conversao: fator, updated_by: context.userId })
      .eq("id", data.insumo_id);
    if (error) throw new Error(traduzErro(error.message));
    return { ok: true, fator };
  });

/** Cria um item de catálogo a partir da linha de insumo e já faz o vínculo. */
export const criarItemDeInsumo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        insumo_id: uuid,
        unidade_estoque: z.string().min(1),
        fator: z.number().positive().optional().default(1),
        confirmar_semelhante: z.boolean().optional().default(false),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertCanAccessModule(context.supabase, context.userId, "compras");
    const sb = context.supabase as any;
    const { data: linha } = await sb
      .from("projeto_insumos")
      .select("id, descricao, unidade, part_number, fabricante_sugerido, categoria_slug, almox_item_id")
      .eq("id", data.insumo_id)
      .maybeSingle();
    if (!linha) throw new Error("Linha de insumo não encontrada.");
    if (linha.almox_item_id) throw new Error("Esta linha já está vinculada a um item do almoxarifado.");

    if (!data.confirmar_semelhante) {
      const { data: sim } = await sb
        .from("almox_itens")
        .select("id, codigo, descricao, unidade_estoque")
        .ilike("descricao", `%${String(linha.descricao ?? "").slice(0, 40)}%`)
        .eq("ativo", true)
        .limit(5);
      if ((sim ?? []).length) return { ok: false as const, semelhantes: sim };
    }

    const { data: novo, error } = await sb
      .from("almox_itens")
      .insert({
        descricao: linha.descricao,
        unidade_estoque: data.unidade_estoque,
        part_number: linha.part_number ?? null,
        fabricante: linha.fabricante_sugerido ?? null,
        categoria: linha.categoria_slug ?? null,
        created_by: context.userId,
      })
      .select("id, codigo, descricao, unidade_estoque")
      .single();
    if (error) throw new Error(traduzErro(error.message));

    const mesma = norm(linha.unidade) === norm(data.unidade_estoque);
    await sb
      .from("projeto_insumos")
      .update({
        almox_item_id: novo.id,
        almox_fator_conversao: mesma ? 1 : data.fator,
        updated_by: context.userId,
      })
      .eq("id", data.insumo_id);

    return { ok: true as const, item: novo };
  });

/** Busca no catálogo para o seletor de vínculo. */
export const buscarItensCatalogo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ q: z.string().optional() }).parse(i ?? {}))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    let q = sb.from("almox_saldo_item").select("item_id, codigo, descricao, unidade_estoque, disponivel").eq("ativo", true);
    if (data.q?.trim()) {
      const t = `%${data.q.trim()}%`;
      q = q.or(`codigo.ilike.${t},descricao.ilike.${t}`);
    }
    const { data: rows, error } = await q.order("codigo").limit(30);
    if (error) throw friendlyDbError(error);
    return rows ?? [];
  });

/* ------------------------------------------------------------------ */
/* Painel de ordens de compra (saldo + movimentos em tempo real)       */
/* ------------------------------------------------------------------ */

export const listOcsPainel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        q: z.string().optional(),
        somente_pendentes: z.boolean().optional().default(true),
      })
      .parse(i ?? {}),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    let q = sb
      .from("ordens_compra")
      .select("id, numero, status, fornecedor_razao_social, moeda, emissao_em, entrega_prevista, valor_total")
      .is("deleted_at", null)
      .order("emissao_em", { ascending: false, nullsFirst: false })
      .limit(200);
    if (data.somente_pendentes) q = q.in("status", ["aprovada", "enviada", "recebida_parcial"]);
    if (data.q?.trim()) {
      const t = `%${data.q.trim()}%`;
      q = q.or(`numero.ilike.${t},fornecedor_razao_social.ilike.${t}`);
    }
    const { data: ocs, error } = await q;
    if (error) throw friendlyDbError(error);

    const ids = ((ocs ?? []) as any[]).map((o) => o.id);
    let tot = new Map<string, any>();
    if (ids.length) {
      const { data: r } = await sb.from("almox_recebimento_oc").select("*").in("ordem_compra_id", ids);
      tot = new Map(((r ?? []) as any[]).map((x) => [x.ordem_compra_id, x]));
    }
    const rows = ((ocs ?? []) as any[]).map((o) => {
      const t = tot.get(o.id) ?? {};
      const pedido = Number(t.quantidade_pedida ?? 0);
      const recebido = Number(t.quantidade_recebida ?? 0);
      const falta = Number(t.quantidade_pendente ?? Math.max(pedido - recebido, 0));
      return {
        ...o,
        quantidade_pedida: pedido,
        quantidade_recebida: recebido,
        quantidade_pendente: falta,
        pct_recebido: pedido > 0 ? Math.min(100, (recebido / pedido) * 100) : 0,
      };
    });
    return {
      rows,
      kpis: {
        ocs: rows.length,
        pendentes: rows.filter((r) => r.quantidade_pendente > 0).length,
        completas: rows.filter((r) => r.quantidade_pedida > 0 && r.quantidade_pendente <= 0).length,
        qtd_falta: rows.reduce((s, r) => s + r.quantidade_pendente, 0),
      },
    };
  });

export const getOcPainel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ ordem_compra_id: uuid }).parse(i))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const [oc, itens, recv, locais] = await Promise.all([
      sb
        .from("ordens_compra")
        .select("id, numero, status, fornecedor_razao_social, moeda, emissao_em, entrega_prevista, valor_total")
        .eq("id", data.ordem_compra_id)
        .maybeSingle(),
      sb
        .from("ordem_compra_itens")
        .select("id, descricao, unidade, quantidade, valor_unitario, codigo_produto, ordem")
        .eq("ordem_compra_id", data.ordem_compra_id)
        .order("ordem"),
      sb.from("almox_recebimento_oc_item").select("*").eq("ordem_compra_id", data.ordem_compra_id),
      sb.from("almox_locais").select("id, codigo").eq("ativo", true),
    ]);
    if (!oc.data) throw new Error("Ordem de compra não encontrada.");

    const itensLista = (itens.data ?? []) as any[];
    const ociIds = itensLista.map((i) => i.id);
    let movimentos: any[] = [];
    if (ociIds.length) {
      const { data: m } = await sb
        .from("almox_movimentos")
        .select(
          "id, seq, tipo, quantidade, custo_unitario, custo_medio_apos, item_id, local_id, ordem_compra_item_id, observacao, created_at, created_by",
        )
        .in("ordem_compra_item_id", ociIds)
        .order("seq", { ascending: false })
        .limit(300);
      movimentos = (m ?? []) as any[];
    }

    const itemIds = [...new Set(movimentos.map((m) => m.item_id).filter(Boolean))];
    let catalogo = new Map<string, any>();
    let saldos = new Map<string, any>();
    if (itemIds.length) {
      const [cat, sal] = await Promise.all([
        sb.from("almox_itens").select("id, codigo, descricao, unidade_estoque").in("id", itemIds),
        sb.from("almox_saldo_item").select("item_id, total, reservado, disponivel, custo_medio").in("item_id", itemIds),
      ]);
      catalogo = new Map(((cat.data ?? []) as any[]).map((c) => [c.id, c]));
      saldos = new Map(((sal.data ?? []) as any[]).map((s) => [s.item_id, s]));
    }
    const autores = [...new Set(movimentos.map((m) => m.created_by).filter(Boolean))];
    let nomes = new Map<string, string>();
    if (autores.length) {
      const { data: profs } = await sb.from("profiles").select("id, full_name").in("id", autores);
      nomes = new Map(((profs ?? []) as any[]).map((p) => [p.id, p.full_name]));
    }
    const locMap = new Map(((locais.data ?? []) as any[]).map((l) => [l.id, l.codigo]));
    const rec = new Map(((recv.data ?? []) as any[]).map((r) => [r.ordem_compra_item_id, r]));

    const linhas = itensLista.map((it) => {
      const r = rec.get(it.id) ?? {};
      const recebida = Number(r.quantidade_recebida ?? 0);
      const pedida = Number(it.quantidade ?? 0);
      const movsItem = movimentos.filter((m) => m.ordem_compra_item_id === it.id);
      const itemId = movsItem[0]?.item_id ?? null;
      const cat = itemId ? catalogo.get(itemId) : null;
      const saldo = itemId ? saldos.get(itemId) : null;
      return {
        ...it,
        quantidade_recebida: recebida,
        quantidade_pendente: Math.max(pedida - recebida, 0),
        pct_recebido: pedida > 0 ? Math.min(100, (recebida / pedida) * 100) : 0,
        item_id: itemId,
        item_codigo: cat?.codigo ?? null,
        item_descricao: cat?.descricao ?? null,
        custo_medio: saldo ? Number(saldo.custo_medio ?? 0) : null,
        saldo_total: saldo ? Number(saldo.total ?? 0) : null,
        saldo_disponivel: saldo ? Number(saldo.disponivel ?? 0) : null,
        ultimo_custo: movsItem[0] ? Number(movsItem[0].custo_unitario ?? 0) : null,
      };
    });

    return {
      oc: oc.data,
      totais: {
        pedida: linhas.reduce((s, l) => s + Number(l.quantidade ?? 0), 0),
        recebida: linhas.reduce((s, l) => s + l.quantidade_recebida, 0),
        pendente: linhas.reduce((s, l) => s + l.quantidade_pendente, 0),
        valor_recebido: linhas.reduce(
          (s, l) => s + l.quantidade_recebida * Number(l.valor_unitario ?? 0),
          0,
        ),
      },
      linhas,
      movimentos: movimentos.map((m) => {
        const cat = catalogo.get(m.item_id);
        return {
          ...m,
          item_codigo: cat?.codigo ?? "—",
          item_descricao: cat?.descricao ?? "—",
          local_codigo: locMap.get(m.local_id) ?? "—",
          autor: m.created_by ? (nomes.get(m.created_by) ?? "—") : "—",
        };
      }),
    };
  });
