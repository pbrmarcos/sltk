import { createServerFn } from "@tanstack/react-start";
import { friendlyDbError } from "@/lib/db-errors";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertCanAccessModule } from "@/lib/admin-guard";
import { logAuditServer } from "@/lib/audit.server";
import { COTACAO_STATUS } from "@/lib/cotacoes.shared";

type SB = { from: (t: string) => any }; // eslint-disable-line @typescript-eslint/no-explicit-any

/**
 * Dispara o e-mail de convite pro fornecedor de verdade (link público da
 * cotação, extraTo com o e-mail dele) além do aviso interno pro papel
 * purchasing — reutilizado por createCotacao (quando já cria convidando) e
 * inviteFornecedores (convite avulso depois).
 */
async function dispatchCotacaoInviteEmails(
  sb: SB,
  cotacaoId: string,
  fornecedorIds: string[],
  userId: string,
): Promise<void> {
  try {
    const { safeDispatch, appUrl } = await import("@/lib/email/safe-dispatch.server");
    const { data: cot } = await sb
      .from("cotacoes")
      .select("codigo, titulo, prazo_resposta")
      .eq("id", cotacaoId)
      .maybeSingle();
    const { data: convites } = await sb
      .from("cotacao_fornecedores")
      .select("token, fornecedor_id, fornecedores(nome_fantasia, razao_social, email_geral)")
      .eq("cotacao_id", cotacaoId)
      .in("fornecedor_id", fornecedorIds);
    const { data: prof } = await sb
      .from("profiles")
      .select("full_name, email")
      .eq("id", userId)
      .maybeSingle();
    const usuario = (prof as any)?.full_name ?? (prof as any)?.email ?? "Compras"; // eslint-disable-line @typescript-eslint/no-explicit-any
    const prazo = (cot as any)?.prazo_resposta // eslint-disable-line @typescript-eslint/no-explicit-any
      ? new Date((cot as any).prazo_resposta).toLocaleDateString("pt-BR") // eslint-disable-line @typescript-eslint/no-explicit-any
      : "";
    for (const conv of (convites ?? []) as Array<{
      token: string;
      fornecedor_id: string;
      fornecedores: {
        nome_fantasia: string | null;
        razao_social: string | null;
        email_geral: string | null;
      } | null;
    }>) {
      const f = conv.fornecedores;
      await safeDispatch({
        eventKey: "cotacao.enviada_fornecedor",
        triggeredBy: userId,
        entityTable: "cotacoes",
        entityId: cotacaoId,
        vars: {
          codigo: (cot as any)?.codigo ?? "", // eslint-disable-line @typescript-eslint/no-explicit-any
          item: (cot as any)?.titulo ?? "", // eslint-disable-line @typescript-eslint/no-explicit-any
          fornecedor: f?.nome_fantasia || f?.razao_social || "",
          destinatario_nome: f?.nome_fantasia || f?.razao_social || "",
          prazo,
          usuario,
          link: appUrl(`/p/cotacao/${conv.token}`),
        },
        extraTo: f?.email_geral ? [f.email_geral] : [],
      });
    }
  } catch (e) {
    console.error("[cotacoes] invite email dispatch failed", e);
  }
}

/* ============ LIST ============ */
export const listCotacoes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        status: z
          .enum(["todos", ...COTACAO_STATUS])
          .optional()
          .default("todos"),
        q: z.string().optional(),
        page: z.number().int().min(1).optional().default(1),
        per_page: z.number().int().min(1).max(100).optional().default(50),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as SB;
    let q = sb
      .from("cotacoes")
      .select(
        "id, codigo, titulo, status, prazo_resposta, moeda, incoterm, created_at, updated_at, responsavel_compras",
        { count: "exact" },
      )
      .is("deleted_at", null);
    if (data.status !== "todos") q = q.eq("status", data.status);
    if (data.q && data.q.trim()) {
      const t = `%${data.q.trim()}%`;
      q = q.or(`codigo.ilike.${t},titulo.ilike.${t}`);
    }
    const from = (data.page - 1) * data.per_page;
    const {
      data: rows,
      count,
      error,
    } = await q.order("created_at", { ascending: false }).range(from, from + data.per_page - 1);
    if (error) throw friendlyDbError(error);

    // Para cada Cotação, conta convites/respostas
    const ids = (rows ?? []).map((r: { id: string }) => r.id);
    const counts: Record<string, { convites: number; respondidos: number }> = {};
    if (ids.length) {
      const { data: cf } = await sb
        .from("cotacao_fornecedores")
        .select("cotacao_id, status")
        .in("cotacao_id", ids);
      for (const r of (cf ?? []) as Array<{ cotacao_id: string; status: string }>) {
        const c = (counts[r.cotacao_id] ??= { convites: 0, respondidos: 0 });
        c.convites += 1;
        if (r.status === "respondido") c.respondidos += 1;
      }
    }
    return {
      rows: (rows ?? []).map((r: { id: string }) => ({
        ...r,
        convites: counts[r.id]?.convites ?? 0,
        respondidos: counts[r.id]?.respondidos ?? 0,
      })),
      total: count ?? 0,
    };
  });

/* ============ GET ============ */
export const getCotacao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as SB;
    const { data: cot, error } = await sb.from("cotacoes").select("*").eq("id", data.id).single();
    if (error || !cot) throw new Error(error?.message ?? "Cotação não encontrada");
    const { data: itens } = await sb
      .from("cotacao_itens")
      .select("*")
      .eq("cotacao_id", data.id)
      .order("created_at");
    const { data: convites } = await sb
      .from("cotacao_fornecedores")
      .select("*, fornecedores(id, codigo, nome_fantasia, razao_social, pais)")
      .eq("cotacao_id", data.id);
    const conviteIds = (convites ?? []).map((c: { id: string }) => c.id);
    let propostas: any[] = []; // eslint-disable-line @typescript-eslint/no-explicit-any
    let propostaItens: any[] = []; // eslint-disable-line @typescript-eslint/no-explicit-any
    if (conviteIds.length) {
      const { data: p } = await sb
        .from("cotacao_propostas")
        .select("*")
        .in("convite_id", conviteIds);
      propostas = p ?? [];
      const propIds = propostas.map((p) => p.id);
      if (propIds.length) {
        const { data: pi } = await sb
          .from("cotacao_proposta_itens")
          .select("*")
          .in("proposta_id", propIds);
        propostaItens = pi ?? [];
      }
    }
    const { data: escolhas } = await sb
      .from("cotacao_escolhas")
      .select("*")
      .in(
        "cotacao_item_id",
        (itens ?? []).map((i: { id: string }) => i.id),
      );
    return {
      cotacao: cot,
      itens: itens ?? [],
      convites: convites ?? [],
      propostas,
      proposta_itens: propostaItens,
      escolhas: escolhas ?? [],
    };
  });

/* ============ CREATE ============ */
export const createCotacao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        titulo: z.string().min(3).max(200),
        descricao: z.string().max(2000).optional().nullable(),
        prazo_resposta: z.string().optional().nullable(),
        incoterm: z.string().max(20).optional().nullable(),
        moeda: z.string().min(3).max(5).default("BRL"),
        condicoes_pagamento: z.string().max(500).optional().nullable(),
        observacoes: z.string().max(2000).optional().nullable(),
        insumo_ids: z.array(z.string().uuid()).min(1),
        fornecedor_ids: z.array(z.string().uuid()).optional().default([]),
        abrir: z.boolean().optional().default(false),
        origem: z.enum(["manual", "bom"]).optional().nullable(),
        projeto_id: z.string().uuid().optional().nullable(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as SB;
    await assertCanAccessModule(context.supabase, context.userId, "compras");

    const { data: cot, error: e1 } = await sb
      .from("cotacoes")
      .insert({
        titulo: data.titulo,
        descricao: data.descricao,
        prazo_resposta: data.prazo_resposta,
        incoterm: data.incoterm,
        moeda: data.moeda,
        condicoes_pagamento: data.condicoes_pagamento,
        observacoes: data.observacoes,
        criado_por: context.userId,
        responsavel_compras: context.userId,
        origem: data.origem ?? "manual",
        projeto_id: data.projeto_id ?? null,
      })
      .select("id, codigo")
      .single();
    if (e1 || !cot) throw new Error(e1?.message ?? "Falha ao criar cotação");

    // Snapshot dos itens
    const { data: insumos } = await sb
      .from("projeto_insumos")
      .select("id, descricao, especificacao_tecnica, part_number, unidade, quantidade")
      .in("id", data.insumo_ids);
    if (insumos && insumos.length) {
      const rows = (
        insumos as Array<{
          id: string;
          descricao: string;
          especificacao_tecnica: string | null;
          part_number: string | null;
          unidade: string;
          quantidade: number;
        }>
      ).map((i) => ({
        cotacao_id: cot.id,
        insumo_id: i.id,
        quantidade: i.quantidade,
        unidade: i.unidade,
        descricao_snapshot: i.descricao,
        spec_snapshot: i.especificacao_tecnica,
        part_number_snapshot: i.part_number,
      }));
      const { error: e2 } = await sb.from("cotacao_itens").insert(rows);
      if (e2) throw friendlyDbError(e2);
    }

    // Convites
    if (data.fornecedor_ids.length) {
      const rows = data.fornecedor_ids.map((fid) => ({
        cotacao_id: cot.id,
        fornecedor_id: fid,
      }));
      const { error: e3 } = await sb.from("cotacao_fornecedores").insert(rows);
      if (e3) throw friendlyDbError(e3);
    }

    await sb.from("cotacao_historico").insert({
      cotacao_id: cot.id,
      evento: "criada",
      ator: context.userId,
      detalhes: {
        titulo: data.titulo,
        insumos: data.insumo_ids.length,
        fornecedores: data.fornecedor_ids.length,
      },
    });

    if (data.abrir) {
      await sb.from("cotacoes").update({ status: "aberta" }).eq("id", cot.id);
      await sb.from("cotacao_historico").insert({
        cotacao_id: cot.id,
        evento: "aberta",
        ator: context.userId,
      });
    }

    if (data.fornecedor_ids.length) {
      await dispatchCotacaoInviteEmails(sb, cot.id, data.fornecedor_ids, context.userId);
    }

    return { id: cot.id as string, codigo: cot.codigo as string };
  });

/* ============ INVITE EXTRA FORNECEDORES ============ */
export const inviteFornecedores = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        cotacao_id: z.string().uuid(),
        fornecedor_ids: z.array(z.string().uuid()).min(1),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as SB;
    await assertCanAccessModule(context.supabase, context.userId, "compras");
    const rows = data.fornecedor_ids.map((fid) => ({
      cotacao_id: data.cotacao_id,
      fornecedor_id: fid,
    }));
    const { error } = await sb
      .from("cotacao_fornecedores")
      .upsert(rows, { onConflict: "cotacao_id,fornecedor_id", ignoreDuplicates: true });
    if (error) throw friendlyDbError(error);
    await sb.from("cotacao_historico").insert({
      cotacao_id: data.cotacao_id,
      evento: "fornecedores_convidados",
      ator: context.userId,
      detalhes: { count: data.fornecedor_ids.length },
    });

    await dispatchCotacaoInviteEmails(sb, data.cotacao_id, data.fornecedor_ids, context.userId);

    return { ok: true as const };
  });

/* ============ SET STATUS ============ */
export const setCotacaoStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ id: z.string().uuid(), status: z.enum(COTACAO_STATUS) }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as SB;
    await assertCanAccessModule(context.supabase, context.userId, "compras");
    const { error } = await sb.from("cotacoes").update({ status: data.status }).eq("id", data.id);
    if (error) throw friendlyDbError(error);
    await sb.from("cotacao_historico").insert({
      cotacao_id: data.id,
      evento: `status_${data.status}`,
      ator: context.userId,
    });
    await logAuditServer(context.supabase as any, context.userId, {
      table_name: "cotacoes",
      record_id: data.id,
      action: "UPDATE",
      field_changed: "status",
      new_value: data.status,
    });
    return { ok: true as const };
  });

/* ============ ESCOLHER VENCEDOR ============ */
export const escolherVencedor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        cotacao_item_id: z.string().uuid(),
        proposta_item_id: z.string().uuid(),
        justificativa: z.string().max(1000).optional().nullable(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as SB;
    await assertCanAccessModule(context.supabase, context.userId, "compras");

    // Dados do item cotado (qual insumo) e da proposta escolhida.
    const { data: item } = await sb
      .from("cotacao_itens")
      .select("id, insumo_id, cotacao_id")
      .eq("id", data.cotacao_item_id)
      .maybeSingle();
    if (!item) throw new Error("Item da cotação não encontrado.");

    const { data: propostaItem } = await sb
      .from("cotacao_proposta_itens")
      .select("id, proposta_id, preco_unit, prazo_entrega_dias, valor_total")
      .eq("id", data.proposta_item_id)
      .maybeSingle();
    if (!propostaItem) throw new Error("Item da proposta não encontrado.");

    const { data: proposta } = await sb
      .from("cotacao_propostas")
      .select("id, convite_id")
      .eq("id", propostaItem.proposta_id)
      .maybeSingle();
    const { data: convite } = await sb
      .from("cotacao_fornecedores")
      .select("id, fornecedor_id")
      .eq("id", proposta?.convite_id ?? "")
      .maybeSingle();
    const { data: cotacao } = await sb
      .from("cotacoes")
      .select("codigo, moeda, condicoes_pagamento")
      .eq("id", item.cotacao_id)
      .maybeSingle();
    const { data: prof } = await sb
      .from("profiles")
      .select("full_name, email")
      .eq("id", context.userId)
      .maybeSingle();

    // Escolha atual do item, se houver — pra atualizar o mesmo anexo em vez
    // de duplicar quando o comprador troca de vencedor.
    const { data: escolhaAtual } = await sb
      .from("cotacao_escolhas")
      .select("id, insumo_anexo_id")
      .eq("cotacao_item_id", data.cotacao_item_id)
      .maybeSingle();

    // Ponte pra aprovação de OC: decidirAprovacaoOC só sabe ler
    // insumo_anexos (kind='orcamento' + fornecedor_id) — sem isso, escolher
    // vencedor pelo portal não servia pra aprovar a compra.
    const anexoPayload = {
      insumo_id: item.insumo_id,
      kind: "orcamento" as const,
      fornecedor_id: convite?.fornecedor_id ?? null,
      valor: propostaItem.valor_total ?? propostaItem.preco_unit,
      moeda: cotacao?.moeda ?? "BRL",
      condicao_pagamento: cotacao?.condicoes_pagamento ?? null,
      lead_time_dias: propostaItem.prazo_entrega_dias ?? null,
      file_name: `Proposta - Cotação ${cotacao?.codigo ?? ""}`.trim(),
      uploaded_by: context.userId,
      uploaded_by_nome: prof?.full_name ?? prof?.email ?? "Usuário",
    };

    let anexoId: string | null = escolhaAtual?.insumo_anexo_id ?? null;
    if (anexoId) {
      const { error: eUpd } = await sb.from("insumo_anexos").update(anexoPayload).eq("id", anexoId);
      if (eUpd) throw friendlyDbError(eUpd);
    } else {
      const { data: novoAnexo, error: eIns } = await sb
        .from("insumo_anexos")
        .insert(anexoPayload)
        .select("id")
        .single();
      if (eIns) throw friendlyDbError(eIns);
      anexoId = novoAnexo.id as string;
    }

    const { error } = await sb.from("cotacao_escolhas").upsert(
      {
        cotacao_item_id: data.cotacao_item_id,
        proposta_item_id: data.proposta_item_id,
        escolhido_por: context.userId,
        escolhido_em: new Date().toISOString(),
        justificativa: data.justificativa,
        insumo_anexo_id: anexoId,
      },
      { onConflict: "cotacao_item_id" },
    );
    if (error) throw friendlyDbError(error);

    await logAuditServer(context.supabase as any, context.userId, {
      table_name: "cotacao_escolhas",
      record_id: data.cotacao_item_id,
      action: "INSERT",
      new_value: {
        proposta_item_id: data.proposta_item_id,
        insumo_anexo_id: anexoId,
        fornecedor_id: convite?.fornecedor_id ?? null,
      },
    });

    return { ok: true as const };
  });

/* ============ INSUMOS APROVADOS (para wizard) ============ */
export const listInsumosAprovados = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as unknown as SB;
    const { data, error } = await sb
      .from("projeto_insumos")
      .select(
        "id, descricao, especificacao_tecnica, part_number, unidade, quantidade, criticidade, necessidade_em, categoria_slug, projeto_id, status, equipamento_projetos(disciplina, cliente_equipamentos(codigo, modelo)), clientes(codigo, razao_social), fornecedor_categorias_catalog(nome_pt)",
      )
      .eq("status", "aprovado")
      .is("deleted_at", null)
      .order("necessidade_em", { ascending: true, nullsFirst: false })
      .limit(500);
    if (error) throw friendlyDbError(error);
    return (data ?? []) as any[];
  });

/* ============ INSUMOS POR IDS (pré-seleção vinda da B.O.M.) ============ */
export const listInsumosParaCotacao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ ids: z.array(z.string().uuid()).min(1).max(200) }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as SB;
    const { data: rows, error } = await sb
      .from("projeto_insumos")
      .select(
        "id, descricao, especificacao_tecnica, part_number, unidade, quantidade, criticidade, necessidade_em, categoria_slug, projeto_id, status, equipamento_projetos(disciplina, cliente_equipamentos(codigo, modelo)), clientes(codigo, razao_social), fornecedor_categorias_catalog(nome_pt)",
      )
      .in("id", data.ids)
      .is("deleted_at", null);
    if (error) throw friendlyDbError(error);
    return (rows ?? []) as any[];
  });

/* ============ COTAÇÕES DO PROJETO (B.O.M. → Cotações) ============ */
export const listCotacoesDoProjeto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ projeto_id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as SB;
    const { data: rows, error } = await sb
      .from("cotacoes")
      .select("id, codigo, titulo, status, moeda, prazo_resposta, created_at")
      .eq("projeto_id", data.projeto_id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw friendlyDbError(error);
    const ids = (rows ?? []).map((r: { id: string }) => r.id);
    const counts: Record<string, number> = {};
    if (ids.length) {
      const { data: ci } = await sb
        .from("cotacao_itens")
        .select("cotacao_id")
        .in("cotacao_id", ids);
      for (const r of (ci ?? []) as Array<{ cotacao_id: string }>) {
        counts[r.cotacao_id] = (counts[r.cotacao_id] ?? 0) + 1;
      }
    }
    return (rows ?? []).map((r: { id: string }) => ({
      ...r,
      itens: counts[r.id] ?? 0,
    }));
  });

/* ============ FORNECEDORES (para wizard) ============ */
export const listFornecedoresParaCotacao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ categoria_slugs: z.array(z.string()).optional().default([]) }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as SB;
    let q = sb
      .from("fornecedores")
      .select(
        "id, codigo, nome_fantasia, razao_social, pais, email_geral, fornecedor_categoria_link!inner(categoria_slug)",
      )
      .is("deleted_at", null)
      .limit(300);
    if (data.categoria_slugs.length) {
      q = q.in("fornecedor_categoria_link.categoria_slug", data.categoria_slugs);
    }
    const { data: rows, error } = await q;
    if (error) {
      // fallback sem filtro de categoria se a join falhar
      const { data: r2, error: e2 } = await sb
        .from("fornecedores")
        .select("id, codigo, nome_fantasia, razao_social, pais, email_geral")
        .is("deleted_at", null)
        .order("nome_fantasia", { ascending: true })
        .limit(300);
      if (e2) throw friendlyDbError(e2);
      return (r2 ?? []) as any[];
    }
    return (rows ?? []) as any[];
  });

/* ============ PUBLIC PORTAL (sem auth) ============ */
export const publicGetCotacao = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({ token: z.string().min(8) }).parse(i))
  .handler(async ({ data }) => {
    const { getCriticalClient } = await import("@/lib/supabase-client.server");
    const supabaseAdmin = await getCriticalClient();
    const sb = supabaseAdmin as unknown as SB;
    const { data: convite, error } = await sb
      .from("cotacao_fornecedores")
      .select("*, fornecedores(id, codigo, nome_fantasia, razao_social, pais)")
      .eq("token", data.token)
      .maybeSingle();
    if (error || !convite) throw new Error("Convite inválido");
    const c = convite as { id: string; cotacao_id: string; fornecedor_id: string; status: string };
    const { data: cot } = await sb
      .from("cotacoes")
      .select(
        "id, codigo, titulo, descricao, status, prazo_resposta, incoterm, moeda, condicoes_pagamento, observacoes",
      )
      .eq("id", c.cotacao_id)
      .single();
    const { data: itens } = await sb
      .from("cotacao_itens")
      .select("id, descricao_snapshot, spec_snapshot, part_number_snapshot, unidade, quantidade")
      .eq("cotacao_id", c.cotacao_id)
      .order("created_at");
    const { data: proposta } = await sb
      .from("cotacao_propostas")
      .select("*")
      .eq("convite_id", c.id)
      .maybeSingle();
    let propostaItens: any[] = []; // eslint-disable-line @typescript-eslint/no-explicit-any
    if (proposta) {
      const { data: pi } = await sb
        .from("cotacao_proposta_itens")
        .select("*")
        .eq("proposta_id", (proposta as { id: string }).id);
      propostaItens = pi ?? [];
    }
    return {
      convite,
      cotacao: cot,
      itens: itens ?? [],
      proposta,
      proposta_itens: propostaItens,
    };
  });

export const publicSubmitProposta = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) =>
    z
      .object({
        token: z.string().min(8),
        moeda: z.string().min(3).max(5).default("BRL"),
        valido_ate: z.string().optional().nullable(),
        observacoes: z.string().max(2000).optional().nullable(),
        condicoes_pagamento: z.string().max(500).optional().nullable(),
        itens: z
          .array(
            z.object({
              cotacao_item_id: z.string().uuid(),
              preco_unitario: z.number().nonnegative(),
              prazo_entrega_dias: z.number().int().nonnegative().optional().nullable(),
              observacao: z.string().max(500).optional().nullable(),
            }),
          )
          .min(1),
      })
      .parse(i),
  )
  .handler(async ({ data }) => {
    const { getCriticalClient } = await import("@/lib/supabase-client.server");
    const supabaseAdmin = await getCriticalClient();
    const sb = supabaseAdmin as unknown as SB;
    const { data: convite, error } = await sb
      .from("cotacao_fornecedores")
      .select("id, cotacao_id, status")
      .eq("token", data.token)
      .maybeSingle();
    if (error || !convite) throw new Error("Convite inválido");
    const c = convite as { id: string; cotacao_id: string; status: string };

    // Bloqueia envio/edição depois que a cotação já saiu do "respondível" —
    // sem isso, um link já fechado (vencedor escolhido/encerrada/cancelada)
    // continuava aceitando alteração de preço indefinidamente.
    const { data: cotAtual } = await sb
      .from("cotacoes")
      .select("status")
      .eq("id", c.cotacao_id)
      .maybeSingle();
    const statusFechado = ["escolhida", "encerrada", "cancelada"];
    if (cotAtual && statusFechado.includes((cotAtual as { status: string }).status)) {
      throw new Error("Esta cotação já foi encerrada e não aceita mais respostas.");
    }

    const total = data.itens.reduce((s, i) => s + Number(i.preco_unitario), 0);

    // Upsert proposta
    const { data: existing } = await sb
      .from("cotacao_propostas")
      .select("id")
      .eq("convite_id", c.id)
      .maybeSingle();
    let propostaId: string;
    if (existing) {
      propostaId = (existing as { id: string }).id;
      await sb
        .from("cotacao_propostas")
        .update({
          moeda: data.moeda,
          valido_ate: data.valido_ate,
          observacoes: data.observacoes,
          condicoes_pagamento: data.condicoes_pagamento,
          total,
          status: "enviada",
          enviada_em: new Date().toISOString(),
        })
        .eq("id", propostaId);
      await sb.from("cotacao_proposta_itens").delete().eq("proposta_id", propostaId);
    } else {
      const { data: prop, error: e2 } = await sb
        .from("cotacao_propostas")
        .insert({
          convite_id: c.id,
          moeda: data.moeda,
          valido_ate: data.valido_ate,
          observacoes: data.observacoes,
          condicoes_pagamento: data.condicoes_pagamento,
          total,
          status: "enviada",
          enviada_em: new Date().toISOString(),
        })
        .select("id")
        .single();
      if (e2 || !prop) throw new Error(e2?.message ?? "Falha");
      propostaId = (prop as { id: string }).id;
    }

    // Quantidade de cada item, pra quantidade_snapshot ficar correta (valor_total
    // é coluna gerada em cima dela — sem isso o cálculo assume quantidade 1).
    const itemIds = data.itens.map((it) => it.cotacao_item_id);
    const { data: itensRef } = await sb
      .from("cotacao_itens")
      .select("id, quantidade")
      .in("id", itemIds);
    const qtyMap = new Map(
      ((itensRef ?? []) as Array<{ id: string; quantidade: number }>).map((i) => [
        i.id,
        i.quantidade,
      ]),
    );

    const rows = data.itens.map((it) => ({
      proposta_id: propostaId,
      cotacao_item_id: it.cotacao_item_id,
      preco_unit: it.preco_unitario,
      quantidade_snapshot: qtyMap.get(it.cotacao_item_id) ?? 1,
      prazo_entrega_dias: it.prazo_entrega_dias,
      observacoes: it.observacao,
    }));
    const { error: e3 } = await sb.from("cotacao_proposta_itens").insert(rows);
    if (e3) throw friendlyDbError(e3);

    await sb
      .from("cotacao_fornecedores")
      .update({ status: "respondido", respondido_em: new Date().toISOString() })
      .eq("id", c.id);

    await sb.from("cotacao_historico").insert({
      cotacao_id: c.cotacao_id,
      evento: "proposta_recebida",
      detalhes: { convite_id: c.id, total },
    });

    // Submissão pública (parte não-autenticada mais sensível do fluxo) —
    // fica auditável mesmo sem um context.userId real por trás.
    await logAuditServer(supabaseAdmin as any, null, {
      table_name: "cotacao_propostas",
      record_id: propostaId,
      action: "INSERT",
      new_value: { convite_id: c.id, cotacao_id: c.cotacao_id, total },
    });

    try {
      const { safeDispatch, appUrl } = await import("@/lib/email/safe-dispatch.server");
      const { data: convite2 } = await sb
        .from("cotacao_fornecedores")
        .select("fornecedor_id, fornecedores(nome_fantasia, razao_social)")
        .eq("id", c.id)
        .maybeSingle();
      const { data: cot } = await sb
        .from("cotacoes")
        .select("codigo")
        .eq("id", c.cotacao_id)
        .maybeSingle();
      const fornecedor = (convite2 as any)?.fornecedores;
      await safeDispatch({
        eventKey: "cotacao.resposta_recebida",
        triggeredBy: null,
        triggeredByKind: "automation",
        entityTable: "cotacoes",
        entityId: c.cotacao_id,
        vars: {
          codigo: (cot as any)?.codigo ?? "",
          fornecedor: fornecedor?.nome_fantasia || fornecedor?.razao_social || "",
          valor: total.toLocaleString("pt-BR", { style: "currency", currency: data.moeda }),
          data: new Date().toLocaleString("pt-BR"),
          link: appUrl(`/compras/cotacoes/${c.cotacao_id}`),
        },
      });
    } catch (e) {
      console.error("[cotacoes/publicSubmitProposta] email dispatch failed", e);
    }

    return { ok: true as const, total };
  });
