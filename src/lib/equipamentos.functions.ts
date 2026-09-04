import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  EQUIPAMENTO_CATEGORIAS,
  EQUIPAMENTO_STATUS,
} from "@/lib/equipamentos.shared";

const clienteIdInput = z.object({ clienteId: z.string().uuid() });

export const listClienteEquipamentos = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => clienteIdInput.parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const { data: rows, error } = await sb
      .from("cliente_equipamentos")
      .select(
        "id, codigo, modelo, fabricante, numero_serie, tag_cliente, categoria, status, data_entrega, data_instalacao, data_garantia_fim, localizacao, valor_venda, observacoes, processo_id, oportunidade_id, resumo, responsavel_engenharia_id, responsavel_automacao_id, planejamento_template_slug, created_at, updated_at",
      )
      .eq("cliente_id", data.clienteId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (rows ?? []) as any[];
  });

const createInput = z.object({
  clienteId: z.string().uuid(),
  modelo: z.string().min(2).max(160),
  fabricante: z.string().max(120).optional().default("Solutek"),
  numero_serie: z.string().max(80).optional().nullable(),
  tag_cliente: z.string().max(80).optional().nullable(),
  categoria: z.enum(EQUIPAMENTO_CATEGORIAS).default("outro"),
  status: z.enum(EQUIPAMENTO_STATUS).default("planejamento"),
  data_entrega: z.string().optional().nullable(),
  data_instalacao: z.string().optional().nullable(),
  data_garantia_fim: z.string().optional().nullable(),
  localizacao: z.string().max(160).optional().nullable(),
  valor_venda: z.number().nonnegative().optional().nullable(),
  observacoes: z.string().max(2000).optional().nullable(),
});

export const createEquipamento = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => createInput.parse(input))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("cliente_equipamentos")
      .insert({
        cliente_id: data.clienteId,
        modelo: data.modelo,
        fabricante: data.fabricante ?? "Solutek",
        numero_serie: data.numero_serie ?? null,
        tag_cliente: data.tag_cliente ?? null,
        categoria: data.categoria,
        status: data.status,
        data_entrega: data.data_entrega || null,
        data_instalacao: data.data_instalacao || null,
        data_garantia_fim: data.data_garantia_fim || null,
        localizacao: data.localizacao ?? null,
        valor_venda: data.valor_venda ?? null,
        observacoes: data.observacoes ?? null,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

const softDeleteInput = z.object({ id: z.string().uuid() });

export const softDeleteEquipamento = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => softDeleteInput.parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("cliente_equipamentos")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });