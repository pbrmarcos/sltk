import { createServerFn } from "@tanstack/react-start";
import { assertCanAccessModule } from "@/lib/admin-guard";
import { friendlyDbError } from "@/lib/db-errors";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Types are not in supabase types.ts (external project); cast where needed.
type AnySupabase = any;

export const listPlanejamentoTemplates = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as AnySupabase;
    const { data, error } = await sb
      .from("equipamento_planejamento_templates")
      .select("id, slug, nome, familia, descricao, publicado")
      .eq("publicado", true)
      .order("nome", { ascending: true });
    if (error) throw friendlyDbError(error);
    return (data ?? []) as Array<{
      id: string;
      slug: string;
      nome: string;
      familia: string | null;
      descricao: string | null;
      publicado: boolean;
    }>;
  });

const templateSlugInput = z.object({ slug: z.string().min(1) });

export const getPlanejamentoTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => templateSlugInput.parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as AnySupabase;
    const { data: tpl, error } = await sb
      .from("equipamento_planejamento_templates")
      .select("id, slug, nome, familia, descricao")
      .eq("slug", data.slug)
      .maybeSingle();
    if (error) throw friendlyDbError(error);
    if (!tpl) return null;
    const { data: secoes, error: e2 } = await sb
      .from("equipamento_planejamento_secoes")
      .select("id, ordem, titulo, area")
      .eq("template_id", tpl.id)
      .order("ordem", { ascending: true });
    if (e2) throw friendlyDbError(e2);
    const secIds = (secoes ?? []).map((s: any) => s.id);
    const { data: itens, error: e3 } = secIds.length
      ? await sb
          .from("equipamento_planejamento_itens")
          .select("id, secao_id, ordem, tipo, titulo, descricao, obrigatorio")
          .in("secao_id", secIds)
          .order("ordem", { ascending: true })
      : { data: [], error: null };
    if (e3) throw friendlyDbError(e3);
    return { ...tpl, secoes: secoes ?? [], itens: itens ?? [] };
  });

const equipamentoIdInput = z.object({ equipamentoId: z.string().uuid() });

export const getEquipamentoPlanejamento = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => equipamentoIdInput.parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as AnySupabase;
    // Fetch equipamento to get template slug
    const { data: eq, error: eqErr } = await sb
      .from("cliente_equipamentos")
      .select("id, planejamento_template_slug")
      .eq("id", data.equipamentoId)
      .maybeSingle();
    if (eqErr) throw friendlyDbError(eqErr);
    const slug = eq?.planejamento_template_slug;
    if (!slug) return null;
    const { data: tpl } = await sb
      .from("equipamento_planejamento_templates")
      .select("id, slug, nome, descricao")
      .eq("slug", slug)
      .maybeSingle();
    if (!tpl) return null;
    const { data: secoes } = await sb
      .from("equipamento_planejamento_secoes")
      .select("id, ordem, titulo, area")
      .eq("template_id", tpl.id)
      .order("ordem", { ascending: true });
    const secIds = (secoes ?? []).map((s: any) => s.id);
    const { data: itens } = secIds.length
      ? await sb
          .from("equipamento_planejamento_itens")
          .select("id, secao_id, ordem, tipo, titulo, descricao, obrigatorio")
          .in("secao_id", secIds)
          .order("ordem", { ascending: true })
      : { data: [] };
    const { data: status } = await sb
      .from("equipamento_planejamento_status")
      .select("item_id, done, valor, done_at, done_by_nome")
      .eq("equipamento_id", data.equipamentoId);
    return {
      template: tpl,
      secoes: secoes ?? [],
      itens: itens ?? [],
      status: status ?? [],
    };
  });

const toggleItemInput = z.object({
  equipamento_id: z.string().uuid(),
  item_id: z.string().uuid(),
  done: z.boolean(),
});

export const togglePlanejamentoItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => toggleItemInput.parse(input))
  .handler(async ({ data, context }) => {
    await assertCanAccessModule(context.supabase, context.userId, "engenharia");
    const sb = context.supabase as AnySupabase;
    const uid = context.userId;
    const { data: prof } = await sb
      .from("profiles")
      .select("full_name, email")
      .eq("id", uid)
      .maybeSingle();
    const nome = prof?.full_name ?? prof?.email ?? "Sistema";
    const { error } = await sb.from("equipamento_planejamento_status").upsert(
      {
        equipamento_id: data.equipamento_id,
        item_id: data.item_id,
        done: data.done,
        done_at: data.done ? new Date().toISOString() : null,
        done_by: data.done ? uid : null,
        done_by_nome: data.done ? nome : null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "equipamento_id,item_id" },
    );
    if (error) throw friendlyDbError(error);
    return { ok: true };
  });

const clonesInput = z.object({ modelo: z.string().optional(), categoria: z.string().optional() });

export const listCandidatosClone = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => clonesInput.parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as AnySupabase;
    let q = sb
      .from("cliente_equipamentos")
      .select("id, codigo, modelo, categoria, cliente_id, data_entrega, planejamento_template_slug")
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(50);
    if (data.modelo) q = q.ilike("modelo", `%${data.modelo}%`);
    if (data.categoria) q = q.eq("categoria", data.categoria);
    const { data: rows, error } = await q;
    if (error) throw friendlyDbError(error);
    return rows ?? [];
  });

const criarInput = z.object({
  clienteId: z.string().uuid(),
  oportunidadeId: z.string().uuid().optional().nullable(),
  base: z.enum(["template", "clone"]),
  clonarDeEquipamentoId: z.string().uuid().optional().nullable(),
  templateSlug: z.string().min(1),
  modelo: z.string().min(2).max(200),
  fabricante: z.string().max(120).default("Solutek"),
  numero_serie: z.string().max(120).optional().nullable(),
  tag_cliente: z.string().max(120).optional().nullable(),
  categoria: z.string(),
  data_entrega: z.string().optional().nullable(),
  valor_venda: z.number().nonnegative().optional().nullable(),
  responsavel_engenharia_id: z.string().uuid().optional().nullable(),
  responsavel_automacao_id: z.string().uuid().optional().nullable(),
  observacoes: z.string().optional().nullable(),
});

export const criarEquipamentoDeOrcamento = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => criarInput.parse(input))
  .handler(async ({ data, context }) => {
    await assertCanAccessModule(context.supabase, context.userId, "engenharia");
    const sb = context.supabase as AnySupabase;
    // Fetch template descrição para gravar resumo
    const { data: tpl } = await sb
      .from("equipamento_planejamento_templates")
      .select("descricao, nome")
      .eq("slug", data.templateSlug)
      .maybeSingle();

    const insertPayload: Record<string, unknown> = {
      cliente_id: data.clienteId,
      oportunidade_id: data.oportunidadeId ?? null,
      modelo: data.modelo,
      fabricante: data.fabricante || "Solutek",
      numero_serie: data.numero_serie || null,
      tag_cliente: data.tag_cliente || null,
      categoria: data.categoria || "outro",
      status: "planejamento",
      data_entrega: data.data_entrega || null,
      valor_venda: data.valor_venda ?? null,
      observacoes: data.observacoes || null,
      planejamento_template_slug: data.templateSlug,
      clonado_de_equipamento_id: data.base === "clone" ? data.clonarDeEquipamentoId : null,
      responsavel_engenharia_id: data.responsavel_engenharia_id || null,
      responsavel_automacao_id: data.responsavel_automacao_id || null,
      resumo: tpl?.descricao ?? null,
    };

    const { data: row, error } = await sb
      .from("cliente_equipamentos")
      .insert(insertPayload)
      .select("id")
      .single();
    if (error) throw friendlyDbError(error);

    // Marca oportunidade com processo/equipamento vinculado (audit-friendly via observação)
    if (data.oportunidadeId) {
      await sb
        .from("oportunidade_notas")
        .insert({
          oportunidade_id: data.oportunidadeId,
          texto: `Equipamento criado no cliente: ${data.modelo}${data.base === "clone" ? " (clonado)" : " (do template)"}`,
          user_id: context.userId,
        })
        .then(
          () => null,
          () => null,
        );
    }

    return { id: row.id as string };
  });

export const listEquipamentoTimeline = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => equipamentoIdInput.parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as AnySupabase;
    const events: Array<{
      at: string;
      kind: string;
      titulo: string;
      detalhe: string | null;
      autor: string | null;
    }> = [];

    // audit_log da tabela cliente_equipamentos
    const { data: audits } = await sb
      .from("audit_log")
      .select("action, field_changed, old_value, new_value, created_at, user_id")
      .eq("table_name", "cliente_equipamentos")
      .eq("record_id", data.equipamentoId)
      .order("created_at", { ascending: false })
      .limit(200);
    for (const a of audits ?? []) {
      events.push({
        at: a.created_at,
        kind: `audit_${a.action}`.toLowerCase(),
        titulo:
          a.action === "INSERT"
            ? "Equipamento criado"
            : a.action === "DELETE"
              ? "Equipamento removido"
              : `Alteração em ${a.field_changed ?? "campo"}`,
        detalhe: a.action === "UPDATE" ? `${a.old_value ?? "—"} → ${a.new_value ?? "—"}` : null,
        autor: null,
      });
    }

    // ETP historico
    const { data: etps } = await sb
      .from("equipamento_etps")
      .select("id")
      .eq("equipamento_id", data.equipamentoId);
    const etpIds = (etps ?? []).map((e: any) => e.id);
    if (etpIds.length) {
      const { data: hist } = await sb
        .from("equipamento_etp_historico")
        .select("tipo, campo, mensagem, valor_novo, valor_anterior, created_at, created_by_nome")
        .in("etp_id", etpIds)
        .order("created_at", { ascending: false })
        .limit(200);
      for (const h of hist ?? []) {
        events.push({
          at: h.created_at,
          kind: `etp_${h.tipo}`,
          titulo: h.mensagem ?? `ETP · ${h.campo ?? h.tipo}`,
          detalhe:
            h.valor_anterior || h.valor_novo
              ? `${h.valor_anterior ?? "—"} → ${h.valor_novo ?? "—"}`
              : null,
          autor: h.created_by_nome ?? null,
        });
      }
    }

    // Planejamento status (marcações)
    const { data: st } = await sb
      .from("equipamento_planejamento_status")
      .select("done, done_at, done_by_nome, item_id, updated_at")
      .eq("equipamento_id", data.equipamentoId)
      .order("updated_at", { ascending: false })
      .limit(200);
    const itemIds = (st ?? []).map((s: any) => s.item_id);
    let itemMap: Record<string, string> = {};
    if (itemIds.length) {
      const { data: its } = await sb
        .from("equipamento_planejamento_itens")
        .select("id, titulo")
        .in("id", itemIds);
      itemMap = Object.fromEntries((its ?? []).map((i: any) => [i.id, i.titulo]));
    }
    for (const s of st ?? []) {
      if (!s.done_at) continue;
      events.push({
        at: s.done_at,
        kind: s.done ? "planej_ok" : "planej_undo",
        titulo: s.done
          ? `Concluído: ${itemMap[s.item_id] ?? "item de planejamento"}`
          : `Reaberto: ${itemMap[s.item_id] ?? "item"}`,
        detalhe: null,
        autor: s.done_by_nome ?? null,
      });
    }

    events.sort((a, b) => (a.at < b.at ? 1 : -1));
    return events.slice(0, 300);
  });

export const listUsuariosParaDelegar = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as AnySupabase;
    const { data, error } = await sb
      .from("profiles")
      .select("id, full_name, email")
      .is("deleted_at", null)
      .order("full_name", { ascending: true })
      .limit(200);
    if (error) throw friendlyDbError(error);
    return (data ?? []) as Array<{ id: string; full_name: string | null; email: string | null }>;
  });
