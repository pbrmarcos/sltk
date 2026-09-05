import { createServerFn } from "@tanstack/react-start";
import { friendlyDbError } from "@/lib/db-errors";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { COTACAO_STATUS } from "@/lib/cotacoes.shared";

type SB = { from: (t: string) => any }; // eslint-disable-line @typescript-eslint/no-explicit-any

async function isPurchasing(supabase: any, uid: string): Promise<boolean> {
  // eslint-disable-line @typescript-eslint/no-explicit-any
  const roles = ["admin", "manager", "purchasing"] as const;
  for (const r of roles) {
    const { data } = await supabase.rpc("has_role", { _user_id: uid, _role: r });
    if (data === true) return true;
  }
  return false;
}

/* ============ LIST ============ */
export const listCotacoes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        status: z.enum(["todos", ...COTACAO_STATUS]).optional().default("todos"),
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
    const { data: rows, count, error } = await q
      .order("created_at", { ascending: false })
      .range(from, from + data.per_page - 1);
    if (error) throw friendlyDbError(error);

    // Para cada RFQ, conta convites/respostas
    const ids = (rows ?? []).map((r: { id: string }) => r.id);
    let counts: Record<string, { convites: number; respondidos: number }> = {};
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
    if (!(await isPurchasing(sb, context.userId))) throw new Error("Sem permissão");

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
      const rows = (insumos as Array<{
        id: string;
        descricao: string;
        especificacao_tecnica: string | null;
        part_number: string | null;
        unidade: string;
        quantidade: number;
      }>).map((i) => ({
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
      detalhes: { titulo: data.titulo, insumos: data.insumo_ids.length, fornecedores: data.fornecedor_ids.length },
    });

    if (data.abrir) {
      await sb.from("cotacoes").update({ status: "aberta" }).eq("id", cot.id);
      await sb.from("cotacao_historico").insert({
        cotacao_id: cot.id,
        evento: "aberta",
        ator: context.userId,
      });
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
    if (!(await isPurchasing(sb, context.userId))) throw new Error("Sem permissão");
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
    if (!(await isPurchasing(sb, context.userId))) throw new Error("Sem permissão");
    const { error } = await sb.from("cotacoes").update({ status: data.status }).eq("id", data.id);
    if (error) throw friendlyDbError(error);
    await sb.from("cotacao_historico").insert({
      cotacao_id: data.id,
      evento: `status_${data.status}`,
      ator: context.userId,
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
    if (!(await isPurchasing(sb, context.userId))) throw new Error("Sem permissão");
    const { error } = await sb
      .from("cotacao_escolhas")
      .upsert(
        {
          cotacao_item_id: data.cotacao_item_id,
          proposta_item_id: data.proposta_item_id,
          escolhido_por: context.userId,
          escolhido_em: new Date().toISOString(),
          justificativa: data.justificativa,
        },
        { onConflict: "cotacao_item_id" },
      );
    if (error) throw friendlyDbError(error);
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
export const listInsumosParaRFQ = createServerFn({ method: "POST" })
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

/* ============ COTAÇÕES DO PROJETO (B.O.M. → RFQs) ============ */
export const listCotacoesDoProjeto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ projeto_id: z.string().uuid() }).parse(i),
  )
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
    let counts: Record<string, number> = {};
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
      .select("id, codigo, titulo, descricao, status, prazo_resposta, incoterm, moeda, condicoes_pagamento, observacoes")
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

    const rows = data.itens.map((it) => ({
      proposta_id: propostaId,
      cotacao_item_id: it.cotacao_item_id,
      preco_unitario: it.preco_unitario,
      prazo_entrega_dias: it.prazo_entrega_dias,
      observacao: it.observacao,
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

    return { ok: true as const, total };
  });
