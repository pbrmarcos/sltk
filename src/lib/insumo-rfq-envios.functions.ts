import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const listInput = z.object({
  insumo_id: z.string().uuid(),
});

const registrarInput = z.object({
  insumo_id: z.string().uuid(),
  fornecedor_id: z.string().uuid(),
  canal: z
    .enum(["email", "whatsapp", "wechat", "telefone", "portal", "outro"])
    .default("email"),
  data_envio: z.string().optional(),
  notas: z.string().max(1000).optional().default(""),
});

const updateInput = z.object({
  id: z.string().uuid(),
  status: z.enum(["enviado", "respondido", "nao_respondeu", "descartado"]),
  notas: z.string().max(1000).optional(),
  data_envio: z.string().optional(),
  data_resposta: z.string().optional().nullable(),
});

const deleteInput = z.object({
  id: z.string().uuid(),
});

export type InsumoRfqEnvio = {
  id: string;
  insumo_id: string;
  fornecedor_id: string;
  canal: string;
  status: string;
  data_envio: string;
  data_resposta: string | null;
  responsavel_id: string | null;
  notas: string | null;
  created_at: string;
  updated_at: string;
  fornecedores?: {
    id: string;
    codigo: string;
    nome: string;
    nome_fantasia: string | null;
    pais: string | null;
  } | null;
};

export const listInsumoRfqEnvios = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => listInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: rows, error } = await supabase
      .from("insumo_rfq_envios")
      .select(
        "id, insumo_id, fornecedor_id, canal, status, data_envio, data_resposta, responsavel_id, notas, created_at, updated_at, fornecedores: fornecedor_id ( id, codigo, nome, nome_fantasia, pais )",
      )
      .eq("insumo_id", data.insumo_id)
      .order("data_envio", { ascending: false });

    if (error) throw new Error(error.message);
    return (rows ?? []) as InsumoRfqEnvio[];
  });

export const registrarRfqEnvio = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => registrarInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("insumo_rfq_envios")
      .insert({
        insumo_id: data.insumo_id,
        fornecedor_id: data.fornecedor_id,
        canal: data.canal,
        data_envio: data.data_envio ? new Date(data.data_envio).toISOString() : new Date().toISOString(),
        notas: data.notas || null,
        responsavel_id: userId,
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);

    await supabase.from("insumo_atividades").insert({
      insumo_id: data.insumo_id,
      tipo: "rfq_enviado",
      descricao: `Checklist registrado como enviado ao fornecedor (canal: ${data.canal}).`,
      actor_id: userId,
      actor_nome: "Compras",
    } as never);

    return row as { id: string };
  });

export const updateRfqEnvioStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => updateInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const update: {
      status: string;
      updated_at: string;
      notas?: string | null;
      data_envio?: string;
      data_resposta?: string | null;
    } = {
      status: data.status,
      updated_at: new Date().toISOString(),
    };
    if (data.notas !== undefined) update.notas = data.notas || null;
    if (data.data_envio) update.data_envio = new Date(data.data_envio).toISOString();
    if (data.data_resposta === null) {
      update.data_resposta = null;
    } else if (data.data_resposta) {
      update.data_resposta = new Date(data.data_resposta).toISOString();
    }

    const { data: row, error } = await supabase
      .from("insumo_rfq_envios")
      .update(update as never)
      .eq("id", data.id)
      .select("insumo_id, status")
      .single();

    if (error) throw new Error(error.message);

    await supabase.from("insumo_atividades").insert({
      insumo_id: row.insumo_id,
      tipo: "rfq_status_alterado",
      descricao: `Status do envio de Checklist atualizado para: ${row.status}.`,
      actor_id: userId,
      actor_nome: "Compras",
    } as never);

    return row;
  });

export const deleteRfqEnvio = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => deleteInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error: fetchErr } = await supabase
      .from("insumo_rfq_envios")
      .select("insumo_id, fornecedor_id")
      .eq("id", data.id)
      .single();
    if (fetchErr) throw new Error(fetchErr.message);

    const { error } = await supabase.from("insumo_rfq_envios").delete().eq("id", data.id);
    if (error) throw new Error(error.message);

    await supabase.from("insumo_atividades").insert({
      insumo_id: row.insumo_id,
      tipo: "rfq_envio_removido",
      descricao: `Registro de envio de Checklist removido.`,
      actor_id: userId,
      actor_nome: "Compras",
    } as never);

    return { ok: true };
  });
