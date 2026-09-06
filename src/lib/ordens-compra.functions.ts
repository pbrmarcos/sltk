import { createServerFn } from "@tanstack/react-start";
import { friendlyDbError } from "@/lib/db-errors";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertCanAccessModule } from "@/lib/admin-guard";
import {
  OC_REQUIRED_FIELDS,
  OC_STATUS,
  type OcStatus,
  exigeValidacaoWizard,
  patchParaStatusOc,
} from "@/lib/ordens-compra.shared";

type SB = { from: (t: string) => any; rpc: (n: string, p?: any) => any }; // eslint-disable-line @typescript-eslint/no-explicit-any

async function getUserName(supabase: any, uid: string): Promise<string> {
  const { data } = await supabase
    .from("profiles")
    .select("nome, email")
    .eq("id", uid)
    .maybeSingle();
  return data?.nome || data?.email || "Usuário";
}

async function logHistorico(
  supabase: any,
  ocId: string,
  uid: string,
  acao: string,
  extra: {
    status_anterior?: string;
    status_novo?: string;
    detalhes?: Record<string, unknown>;
  } = {},
) {
  const nome = await getUserName(supabase, uid);
  await supabase.from("ordem_compra_historico").insert({
    ordem_compra_id: ocId,
    usuario_id: uid,
    usuario_nome: nome,
    acao,
    status_anterior: extra.status_anterior ?? null,
    status_novo: extra.status_novo ?? null,
    detalhes: extra.detalhes ?? null,
  });
}

/* ============ LIST ============ */
export const listOrdensCompra = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        status: z
          .enum(["todos", ...OC_STATUS])
          .optional()
          .default("todos"),
        q: z.string().optional(),
        tipo: z.enum(["todos", "normal", "terceiros"]).optional().default("todos"),
        page: z.number().int().min(1).optional().default(1),
        per_page: z.number().int().min(1).max(200).optional().default(50),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as SB;
    let q = sb
      .from("ordens_compra")
      .select(
        "id, numero, status, tipo, moeda, emissao_em, entrega_prevista, valor_total, fornecedor_id, fornecedor_razao_social, fornecedor_nome_fantasia, cotacao_id, projeto_id, created_at",
        { count: "exact" },
      )
      .is("deleted_at", null);

    if (data.status !== "todos") q = q.eq("status", data.status);
    if (data.tipo !== "todos") q = q.eq("tipo", data.tipo);
    if (data.q?.trim()) {
      const t = `%${data.q.trim()}%`;
      q = q.or(
        `numero.ilike.${t},fornecedor_razao_social.ilike.${t},fornecedor_nome_fantasia.ilike.${t}`,
      );
    }
    const from = (data.page - 1) * data.per_page;
    const {
      data: rows,
      count,
      error,
    } = await q.order("created_at", { ascending: false }).range(from, from + data.per_page - 1);
    if (error) throw friendlyDbError(error);
    return { rows: rows ?? [], total: count ?? 0 };
  });

/* ============ KPIs ============ */
export const getOrdensCompraKpis = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as unknown as SB;
    const { data } = await sb
      .from("ordens_compra")
      .select("status, valor_total")
      .is("deleted_at", null);
    const rows = (data ?? []) as Array<{ status: string; valor_total: number | null }>;
    const kpis = {
      total: rows.length,
      rascunho: 0,
      aguardando: 0,
      aprovadas: 0,
      enviadas: 0,
      recebidas: 0,
      valor_aberto: 0,
      valor_total: 0,
    };
    for (const r of rows) {
      const v = Number(r.valor_total ?? 0);
      kpis.valor_total += v;
      if (r.status === "rascunho") kpis.rascunho++;
      if (r.status === "aguardando_aprovacao") {
        kpis.aguardando++;
        kpis.valor_aberto += v;
      }
      if (r.status === "aprovada" || r.status === "enviada") {
        kpis.valor_aberto += v;
        if (r.status === "aprovada") kpis.aprovadas++;
        if (r.status === "enviada") kpis.enviadas++;
      }
      if (r.status === "recebida" || r.status === "recebida_parcial") kpis.recebidas++;
    }
    return kpis;
  });

/* ============ GET ============ */
export const getOrdemCompra = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as SB;
    const { data: oc, error } = await sb
      .from("ordens_compra")
      .select("*")
      .eq("id", data.id)
      .is("deleted_at", null)
      .single();
    if (error) throw friendlyDbError(error);

    const { data: itens } = await sb
      .from("ordem_compra_itens")
      .select("*")
      .eq("ordem_compra_id", data.id)
      .order("ordem", { ascending: true });

    const { data: hist } = await sb
      .from("ordem_compra_historico")
      .select("*")
      .eq("ordem_compra_id", data.id)
      .order("created_at", { ascending: false })
      .limit(50);

    // Campos faltantes para o wizard
    const faltantes = OC_REQUIRED_FIELDS.filter((f) => {
      const v = (oc as Record<string, unknown>)[f.key];
      return v === null || v === undefined || (typeof v === "string" && !v.trim());
    });
    if (!itens || itens.length === 0) {
      faltantes.push({ key: "itens", label: "Pelo menos um item", group: "itens" });
    }
    return { oc, itens: itens ?? [], historico: hist ?? [], faltantes };
  });

/* ============ CREATE blank ============ */
export const createOrdemCompra = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        fornecedor_id: z.string().uuid(),
        cotacao_id: z.string().uuid().nullish(),
        projeto_id: z.string().uuid().nullish(),
        tipo: z.enum(["normal", "terceiros"]).default("normal"),
        cliente_id: z.string().uuid().nullish(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as SB;
    const uid = context.userId;
    await assertCanAccessModule(context.supabase, uid, "compras");

    // Snapshot fornecedor
    const { data: f } = await sb
      .from("fornecedores")
      .select(
        "codigo, nome, nome_fantasia, tax_id, inscricao_estadual, endereco, cidade, endereco_estado_provincia, endereco_cep, pais, telefone_ddi, telefone_numero, email_corporativo",
      )
      .eq("id", data.fornecedor_id)
      .maybeSingle();

    // Snapshot comprador (brand_settings + ENV)
    const { data: brand } = await sb
      .from("brand_settings")
      .select("system_name, support_email, logo_url")
      .eq("singleton", true)
      .maybeSingle();

    const insert: Record<string, unknown> = {
      fornecedor_id: data.fornecedor_id,
      cotacao_id: data.cotacao_id ?? null,
      projeto_id: data.projeto_id ?? null,
      cliente_id: data.cliente_id ?? null,
      tipo: data.tipo,
      criado_por: uid,
      comprador_razao_social: brand?.system_name ?? "",
      comprador_email: brand?.support_email ?? "",
      comprador_logo_url: brand?.logo_url ?? null,
      fornecedor_codigo: f?.codigo ?? null,
      fornecedor_razao_social: f?.nome ?? "",
      fornecedor_nome_fantasia: f?.nome_fantasia ?? null,
      fornecedor_cnpj: f?.tax_id ?? null,
      fornecedor_ie: f?.inscricao_estadual ?? null,
      fornecedor_endereco: f?.endereco ?? null,
      fornecedor_cidade: f?.cidade ?? null,
      fornecedor_uf: f?.endereco_estado_provincia ?? null,
      fornecedor_cep: f?.endereco_cep ?? null,
      fornecedor_pais: f?.pais ?? null,
      fornecedor_telefone:
        f?.telefone_ddi && f?.telefone_numero ? `+${f.telefone_ddi} ${f.telefone_numero}` : null,
      fornecedor_email: f?.email_corporativo ?? null,
    };

    const { data: oc, error } = await sb
      .from("ordens_compra")
      .insert(insert)
      .select("id, numero")
      .single();
    if (error) throw friendlyDbError(error);

    await logHistorico(sb, oc.id, uid, "OC criada", { status_novo: "rascunho" });
    return oc;
  });

/* ============ CREATE FROM COTAÇÃO ============ */
export const createOrdemDeCotacao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ cotacao_id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as SB;
    const uid = context.userId;
    await assertCanAccessModule(context.supabase, uid, "compras");

    // Busca escolhas (vencedores) da cotação
    const { data: cot } = await sb
      .from("cotacoes")
      .select("id, codigo, titulo, moeda, incoterm, condicoes_pagamento, observacoes")
      .eq("id", data.cotacao_id)
      .single();

    const { data: escolhas } = await sb
      .from("cotacao_escolhas")
      .select(
        "cotacao_item_id, proposta_item_id, justificativa, cotacao_proposta_itens(id, proposta_id, preco_unit, prazo_entrega_dias, part_number_oferecido, marca_oferecida, cotacao_propostas(convite_id, cotacao_fornecedores(fornecedor_id)))",
      )
      .eq("cotacao_id", data.cotacao_id);

    if (!escolhas || escolhas.length === 0)
      throw new Error(
        "Esta cotação não tem vencedores escolhidos. Selecione os vencedores primeiro.",
      );

    // Agrupa por fornecedor
    type Row = {
      cotacao_item_id: string;
      proposta_item_id: string;
      preco_unit: number;
      prazo: number | null;
      part_number: string | null;
      fornecedor_id: string;
    };
    const porFornecedor = new Map<string, Row[]>();
    for (const e of escolhas as any[]) {
      const pi = e.cotacao_proposta_itens;
      const forn = pi?.cotacao_propostas?.cotacao_fornecedores?.fornecedor_id;
      if (!forn) continue;
      const row: Row = {
        cotacao_item_id: e.cotacao_item_id,
        proposta_item_id: e.proposta_item_id,
        preco_unit: Number(pi.preco_unit ?? 0),
        prazo: pi.prazo_entrega_dias ?? null,
        part_number: pi.part_number_oferecido ?? null,
        fornecedor_id: forn,
      };
      const arr = porFornecedor.get(forn) ?? [];
      arr.push(row);
      porFornecedor.set(forn, arr);
    }

    const ocsCriadas: { id: string; numero: string; fornecedor_id: string }[] = [];

    for (const [fornecedor_id, rows] of porFornecedor) {
      // Busca itens originais da cotação
      const itensIds = rows.map((r) => r.cotacao_item_id);
      const { data: cotItens } = await sb
        .from("cotacao_itens")
        .select("id, descricao_snapshot, part_number_snapshot, quantidade, unidade, insumo_id")
        .in("id", itensIds);

      const created = await createOrdemCompra({
        data: { fornecedor_id, cotacao_id: data.cotacao_id, tipo: "normal" as const },
      });

      // Inserir itens
      const itensInsert = rows.map((r, idx) => {
        const ci = (cotItens ?? []).find((x: any) => x.id === r.cotacao_item_id);
        return {
          ordem_compra_id: created.id,
          insumo_id: ci?.insumo_id ?? null,
          cotacao_item_id: r.cotacao_item_id,
          proposta_item_id: r.proposta_item_id,
          ordem: idx + 1,
          codigo_produto: r.part_number ?? null,
          descricao: ci?.descricao_snapshot ?? "Item",
          unidade: ci?.unidade ?? "UN",
          quantidade: Number(ci?.quantidade ?? 1),
          valor_unitario: r.preco_unit,
        };
      });

      if (itensInsert.length) await sb.from("ordem_compra_itens").insert(itensInsert);

      // Atualiza header com moeda/incoterm/pagamento da cotação
      await sb
        .from("ordens_compra")
        .update({
          moeda: cot?.moeda ?? "BRL",
          incoterm: cot?.incoterm ?? null,
          condicao_pagamento: cot?.condicoes_pagamento ?? null,
          observacoes: cot ? `O.C. conforme cotação ${cot.codigo}.` : null,
        })
        .eq("id", created.id);

      await logHistorico(sb, created.id, uid, "OC gerada a partir da cotação", {
        detalhes: { cotacao_codigo: cot?.codigo, itens: itensInsert.length },
      });

      ocsCriadas.push({ id: created.id, numero: created.numero, fornecedor_id });
    }

    return { ocs: ocsCriadas };
  });

/* ============ CREATE FROM INSUMO (Cotação direto) ============ */
export const createOrdemDeInsumo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        insumo_id: z.string().uuid(),
        fornecedor_id: z.string().uuid().optional().nullable(),
        tipo: z.enum(["normal", "terceiros"]).optional().default("normal"),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as SB;
    const uid = context.userId;
    await assertCanAccessModule(context.supabase, uid, "compras");

    const { data: insumo, error: e0 } = await sb
      .from("projeto_insumos")
      .select(
        "id, descricao, codigo_interno, part_number, unidade, quantidade, projeto_id, cliente_id, status",
      )
      .eq("id", data.insumo_id)
      .maybeSingle();
    if (e0 || !insumo) throw new Error(e0?.message ?? "Insumo não encontrado");
    if (insumo.status === "cancelado") throw new Error("Insumo cancelado");

    // *** Gate de liberação p/ produção ***
    // Cotação é livre durante o planejamento, mas a OC só pode ser
    // emitida depois que o projeto do equipamento estiver `liberado_producao`.
    if (insumo.projeto_id) {
      const { data: proj } = await sb
        .from("equipamento_projetos")
        .select("status")
        .eq("id", insumo.projeto_id)
        .maybeSingle();
      const projStatus = (proj as { status?: string } | null)?.status;
      if (projStatus && projStatus !== "liberado_producao") {
        throw new Error(
          "Emissão bloqueada: o equipamento ainda não foi liberado para produção. Peça ao gestor para liberar o projeto antes de emitir a OC.",
        );
      }
    }

    // *** Gate de aprovação ***
    // Só é permitido emitir a OC se houver aprovação `aprovado` vigente
    // (a mais recente para o insumo) por um engenheiro / gerente / admin.
    const { data: aprov } = await (sb as any)
      .from("insumo_aprovacoes_oc")
      .select("id, decisao, decidido_em, fornecedor_id_sugerido")
      .eq("insumo_id", data.insumo_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!aprov || aprov.decisao !== "aprovado") {
      throw new Error(
        "Emissão bloqueada: este insumo precisa ser aprovado por um engenheiro, gerente ou admin antes de gerar a OC.",
      );
    }

    // Fornecedor: usa o informado, senão o sugerido na aprovação,
    // senão o último envio respondido, senão o último envio qualquer.
    let fornecedor_id = data.fornecedor_id ?? aprov.fornecedor_id_sugerido ?? null;
    if (!fornecedor_id) {
      const { data: envios } = await sb
        .from("insumo_cotacao_envios")
        .select("fornecedor_id, data_resposta, data_envio, status, created_at")
        .eq("insumo_id", data.insumo_id)
        .order("data_resposta", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false })
        .limit(5);
      const respondido = (envios ?? []).find(
        (e: any) => e.data_resposta || e.status === "respondido",
      );
      fornecedor_id = respondido?.fornecedor_id ?? (envios ?? [])[0]?.fornecedor_id ?? null;
    }
    if (!fornecedor_id)
      throw new Error(
        "Nenhum fornecedor identificado. Informe o fornecedor manualmente ou registre um envio de checklist com resposta.",
      );

    // Preço unitário: se houver orçamento anexado do fornecedor escolhido, usar.
    let valorUnitInicial = 0;
    try {
      const { data: orc } = await (sb as any)
        .from("insumo_anexos")
        .select("valor")
        .eq("insumo_id", insumo.id)
        .eq("kind", "orcamento")
        .eq("fornecedor_id", fornecedor_id)
        .order("criado_em", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (orc?.valor != null) valorUnitInicial = Number(orc.valor) || 0;
    } catch {
      /* opcional */
    }

    const created = await createOrdemCompra({
      data: {
        fornecedor_id,
        projeto_id: insumo.projeto_id ?? null,
        cliente_id: insumo.cliente_id ?? null,
        tipo: data.tipo,
      },
    });

    await sb.from("ordem_compra_itens").insert({
      ordem_compra_id: created.id,
      insumo_id: insumo.id,
      ordem: 1,
      codigo_produto: insumo.codigo_interno ?? insumo.part_number ?? null,
      descricao: insumo.descricao,
      unidade: insumo.unidade,
      quantidade: Number(insumo.quantidade ?? 1),
      valor_unitario: valorUnitInicial,
    });

    await sb
      .from("projeto_insumos")
      .update({ status: "em_compra", updated_by: uid })
      .eq("id", insumo.id);

    await logHistorico(
      sb,
      created.id,
      uid,
      "OC gerada a partir do checklist do insumo (com aprovação)",
      {
        detalhes: { insumo_id: insumo.id, descricao: insumo.descricao, aprovacao_id: aprov.id },
      },
    );

    // Emite PDFs trilíngues e salva no Drive (não bloqueia a criação).
    try {
      const { gerarDocumentoOc } = await import("@/lib/compras-oc-docs.functions");
      await gerarDocumentoOc({ data: { ordem_compra_id: created.id } });
    } catch (e) {
      // Não falhar a criação da OC se o Drive/PDF quebrar
      console.error("Falha gerando PDFs OC:", e);
    }

    return { id: created.id as string, numero: created.numero as string };
  });

/* ============ UPDATE header ============ */
export const updateOrdemCompra = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        patch: z
          .object({
            entrega_prevista: z.string().nullish(),
            incoterm: z.string().nullish(),
            moeda: z.string().nullish(),
            condicao_pagamento: z.string().nullish(),
            transportadora: z.string().nullish(),
            observacoes: z.string().nullish(),
            observacoes_internas: z.string().nullish(),
            valor_frete: z.number().nullish(),
            comprador_razao_social: z.string().nullish(),
            comprador_cnpj: z.string().nullish(),
            comprador_ie: z.string().nullish(),
            comprador_endereco: z.string().nullish(),
            comprador_cidade: z.string().nullish(),
            comprador_uf: z.string().nullish(),
            comprador_cep: z.string().nullish(),
            comprador_telefone: z.string().nullish(),
            comprador_email: z.string().nullish(),
            fornecedor_razao_social: z.string().nullish(),
            fornecedor_cnpj: z.string().nullish(),
            fornecedor_ie: z.string().nullish(),
            fornecedor_endereco: z.string().nullish(),
            fornecedor_cidade: z.string().nullish(),
            fornecedor_uf: z.string().nullish(),
            fornecedor_cep: z.string().nullish(),
            fornecedor_telefone: z.string().nullish(),
            fornecedor_email: z.string().nullish(),
            fornecedor_contato: z.string().nullish(),
            markup_pct: z.number().nullish(),
            valor_repasse: z.number().nullish(),
            cliente_final_razao_social: z.string().nullish(),
            cliente_final_cnpj: z.string().nullish(),
            cliente_id: z.string().uuid().nullish(),
            oportunidade_id: z.string().uuid().nullish(),
            projeto_id: z.string().uuid().nullish(),
          })
          .partial(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as SB;
    const uid = context.userId;
    await assertCanAccessModule(context.supabase, uid, "compras");

    const { data: cur } = await sb
      .from("ordens_compra")
      .select("status")
      .eq("id", data.id)
      .single();
    if (cur && ["aprovada", "enviada", "recebida", "recebida_parcial"].includes(cur.status)) {
      throw new Error("OC já aprovada/enviada não pode ser editada. Cancele ou crie revisão.");
    }

    const { error } = await sb.from("ordens_compra").update(data.patch).eq("id", data.id);
    if (error) throw friendlyDbError(error);

    if (data.patch.valor_frete !== undefined) {
      await sb.rpc("oc_recalc_totais", { oc_id: data.id });
    }
    await logHistorico(sb, data.id, uid, "Cabeçalho atualizado", {
      detalhes: data.patch as Record<string, unknown>,
    });
    return { ok: true };
  });

/* ============ ITENS CRUD ============ */
export const upsertItemOc = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        id: z.string().uuid().nullish(),
        ordem_compra_id: z.string().uuid(),
        codigo_produto: z.string().nullish(),
        descricao: z.string().min(1),
        unidade: z.string().min(1).default("UN"),
        quantidade: z.number().positive(),
        valor_unitario: z.number().min(0),
        valor_desconto: z.number().min(0).default(0),
        valor_ipi: z.number().min(0).default(0),
        valor_icms_st: z.number().min(0).default(0),
        markup_pct: z.number().min(0).nullish(),
        valor_repasse_unit: z.number().min(0).nullish(),
        data_entrega: z.string().nullish(),
        observacoes: z.string().nullish(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as SB;
    const uid = context.userId;
    await assertCanAccessModule(context.supabase, uid, "compras");

    const { id, ...rest } = data;
    if (id) {
      const { error } = await sb.from("ordem_compra_itens").update(rest).eq("id", id);
      if (error) throw friendlyDbError(error);
    } else {
      const { error } = await sb.from("ordem_compra_itens").insert(rest);
      if (error) throw friendlyDbError(error);
    }
    return { ok: true };
  });

export const removeItemOc = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as SB;
    const uid = context.userId;
    await assertCanAccessModule(context.supabase, uid, "compras");
    const { error } = await sb.from("ordem_compra_itens").delete().eq("id", data.id);
    if (error) throw friendlyDbError(error);
    return { ok: true };
  });

/* ============ STATUS ============ */
export const setOcStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(OC_STATUS),
        observacao: z.string().nullish(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as SB;
    const uid = context.userId;
    await assertCanAccessModule(context.supabase, uid, "compras");

    const { data: cur } = await sb
      .from("ordens_compra")
      .select("status")
      .eq("id", data.id)
      .single();
    if (!cur) throw new Error("OC não encontrada");

    // Validar wizard ao sair de rascunho
    if (exigeValidacaoWizard(cur.status as OcStatus, data.status)) {
      const got = await getOrdemCompra({ data: { id: data.id } });
      if (got.faltantes.length > 0) {
        throw new Error(
          "Dados obrigatórios faltando: " + got.faltantes.map((f) => f.label).join(", "),
        );
      }
    }

    const patch = patchParaStatusOc(data.status, uid, new Date().toISOString());

    const { error } = await sb.from("ordens_compra").update(patch).eq("id", data.id);
    if (error) throw friendlyDbError(error);

    await logHistorico(sb, data.id, uid, `Status alterado para ${data.status}`, {
      status_anterior: cur.status as OcStatus,
      status_novo: data.status,
      detalhes: data.observacao ? { observacao: data.observacao } : undefined,
    });

    // Disparo de e-mail (assíncrono; falhas não bloqueiam a operação)
    try {
      const eventKey =
        data.status === "aguardando_aprovacao"
          ? "oc.aguardando_aprovacao"
          : data.status === "aprovada"
            ? "oc.aprovada"
            : data.status === "enviada"
              ? "oc.enviada"
              : data.status === "cancelada"
                ? "oc.cancelada"
                : null;
      if (eventKey) {
        const { getCriticalClient } = await import("@/lib/supabase-client.server");
        const supabaseAdmin = await getCriticalClient();
        const { dispatchEmail } = await import("@/lib/email/dispatch.server");
        const { appUrl } = await import("@/lib/email/safe-dispatch.server");
        const { data: oc } = await supabaseAdmin
          .from("ordens_compra")
          .select(
            "numero, valor_total, moeda, fornecedor_id, fornecedor_razao_social, fornecedor_nome_fantasia",
          )
          .eq("id", data.id)
          .maybeSingle();
        const usuario = await getUserName(sb, uid);
        await dispatchEmail(supabaseAdmin, {
          eventKey,
          triggeredBy: uid,
          triggeredByKind: "user",
          entityTable: "ordens_compra",
          entityId: data.id,
          vars: {
            codigo: oc?.numero ?? "",
            titulo: oc?.numero ?? "",
            valor: oc
              ? `${oc.moeda ?? ""} ${Number(oc.valor_total ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
              : "",
            fornecedor: oc?.fornecedor_nome_fantasia || oc?.fornecedor_razao_social || "",
            usuario,
            motivo: data.observacao ?? "",
            data: new Date().toLocaleString("pt-BR"),
            link: appUrl(`/compras/ordens/${data.id}`),
          },
        });
      }
    } catch (e) {
      console.error("[oc/setStatus] email dispatch failed", e);
    }

    return { ok: true };
  });

/* ============ LISTAR FORNECEDORES (para select) ============ */
export const listFornecedoresAtivos = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ q: z.string().optional() }).parse(i))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as SB;
    let q = sb
      .from("fornecedores")
      .select("id, codigo, nome, nome_fantasia, pais, tax_id")
      .is("deleted_at", null)
      .order("nome");
    if (data.q?.trim()) {
      const t = `%${data.q.trim()}%`;
      q = q.or(`nome.ilike.${t},nome_fantasia.ilike.${t},codigo.ilike.${t}`);
    }
    const { data: rows } = await q.limit(50);
    return rows ?? [];
  });

/* ============ COTAÇÕES PRONTAS PARA OC ============ */
export const listCotacoesProntasParaOC = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as unknown as SB;
    const { data } = await sb
      .from("cotacoes")
      .select("id, codigo, titulo, status, moeda, updated_at")
      .in("status", ["escolhida", "encerrada"])
      .is("deleted_at", null)
      .order("updated_at", { ascending: false })
      .limit(50);
    return data ?? [];
  });
