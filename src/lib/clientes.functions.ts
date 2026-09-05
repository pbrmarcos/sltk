import { createServerFn } from "@tanstack/react-start";
import { friendlyDbError } from "@/lib/db-errors";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { logAuditServer } from "@/lib/audit.server";
import { hasAnyRole, type AppRoleName } from "@/lib/admin-guard";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { validarDocumentoFiscal } from "@/lib/documentos-fiscais";

import {
  clienteInputSchema,
  contatoInputSchema,
  socioInputSchema,
  normalizeDocumento,
  CLIENTE_STATUS,
} from "@/lib/clientes.shared";

const ALLOWED_ROLES = ["admin", "manager", "sales"] as const;
const DELETE_ROLES = ["admin", "manager"] as const;
type Role = (typeof ALLOWED_ROLES)[number];

async function assertRole(
  admin: SupabaseClient<Database>,
  userId: string,
  allowed: readonly string[],
): Promise<SupabaseClient<Database>> {
  const ok = await hasAnyRole(admin, userId, allowed as AppRoleName[]);
  if (!ok) throw new Error("Acesso restrito.");
  return admin;
}

/* ===================== listPaises ===================== */

export const listPaises = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("paises_config")
      .select("*")
      .order("nome", { ascending: true });
    if (error) throw friendlyDbError(error);
    return data ?? [];
  });

/* ===================== listClientes ===================== */

const listInput = z.object({
  q: z.string().max(120).optional().default(""),
  status: z
    .enum(["todos", ...CLIENTE_STATUS])
    .optional()
    .default("todos"),
  lifecycle: z
    .enum(["todos", "suspect", "prospect", "cliente", "inativo"])
    .optional()
    .default("todos"),
  pais: z.string().length(2).or(z.literal("todos")).optional().default("todos"),
  page: z.number().int().min(1).max(10_000).optional().default(1),
  pageSize: z
    .union([z.literal(25), z.literal(50), z.literal(100)])
    .optional()
    .default(25),
});

export const listClientes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => listInput.parse(input ?? {}))
  .handler(async ({ data, context }) => {
    let q = context.supabase
      .from("clientes")
      .select(
        "id, codigo, razao_social, nome_fantasia, pais, documento_fiscal_numero, status, lifecycle_stage, key_account, segmento, endereco_cidade, endereco_estado, moeda, created_at",
        { count: "exact" },
      )
      .is("deleted_at", null);

    if (data.status !== "todos") q = q.eq("status", data.status);
    if (data.lifecycle !== "todos") q = q.eq("lifecycle_stage", data.lifecycle);
    if (data.pais !== "todos") q = q.eq("pais", data.pais);

    if (data.q.trim()) {
      const s = data.q.trim().replace(/[%,()]/g, "");
      q = q.or(
        [
          `razao_social.ilike.%${s}%`,
          `nome_fantasia.ilike.%${s}%`,
          `codigo.ilike.%${s}%`,
          `documento_fiscal_numero.ilike.%${s.toUpperCase()}%`,
          `endereco_cidade.ilike.%${s}%`,
        ].join(","),
      );
    }

    const from = (data.page - 1) * data.pageSize;
    const to = from + data.pageSize - 1;
    const {
      data: rows,
      count,
      error,
    } = await q.order("codigo", { ascending: true }).range(from, to);
    if (error) throw friendlyDbError(error);
    return { rows: rows ?? [], total: count ?? 0 };
  });

export type ClienteListRow = NonNullable<Awaited<ReturnType<typeof listClientes>>>["rows"][number];

/* ===================== getCliente ===================== */

const idInput = z.object({ id: z.string().uuid() });
const codigoInput = z.object({ codigo: z.string().trim().min(1).max(40) });

export const getCliente = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => idInput.parse(input))
  .handler(async ({ data, context }) => {
    const { data: cliente, error } = await context.supabase
      .from("clientes")
      .select("*")
      .eq("id", data.id)
      .is("deleted_at", null)
      .maybeSingle();
    if (error) throw friendlyDbError(error);
    if (!cliente) throw new Error("Cliente não encontrado");

    const { data: contatos, error: cErr } = await context.supabase
      .from("cliente_contatos")
      .select("*")
      .eq("cliente_id", data.id)
      .is("deleted_at", null)
      .order("principal", { ascending: false })
      .order("nome", { ascending: true });
    if (cErr) throw friendlyDbError(cErr);

    const { data: socios } = await context.supabase
      .from("cliente_socios")
      .select("*")
      .eq("cliente_id", data.id)
      .is("deleted_at", null)
      .order("nome", { ascending: true });

    return { cliente, contatos: contatos ?? [], socios: socios ?? [] };
  });

export const getClienteByCodigo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => codigoInput.parse(input))
  .handler(async ({ data, context }) => {
    const { data: cliente, error } = await context.supabase
      .from("clientes")
      .select("*")
      .eq("codigo", data.codigo)
      .is("deleted_at", null)
      .maybeSingle();
    if (error) throw friendlyDbError(error);
    if (!cliente) throw new Error("Cliente não encontrado");

    const { data: contatos } = await context.supabase
      .from("cliente_contatos")
      .select("*")
      .eq("cliente_id", cliente.id)
      .is("deleted_at", null)
      .order("principal", { ascending: false })
      .order("nome", { ascending: true });
    const { data: socios } = await context.supabase
      .from("cliente_socios")
      .select("*")
      .eq("cliente_id", cliente.id)
      .is("deleted_at", null)
      .order("nome", { ascending: true });
    return { cliente, contatos: contatos ?? [], socios: socios ?? [] };
  });

/* ===================== createCliente ===================== */

async function loadPais(admin: SupabaseClient<Database>, codigo: string) {
  const { data, error } = await admin
    .from("paises_config")
    .select("codigo, documento_nome, documento_regex")
    .eq("codigo", codigo)
    .maybeSingle();
  if (error) throw friendlyDbError(error);
  if (!data) {
    const err = new Error("País inválido.");
    (err as any).code = "pais_inexistente";
    (err as any).field = "pais";
    throw err;
  }
  return data;
}

export const createCliente = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => clienteInputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const admin = await assertRole(context.supabase, context.userId, ALLOWED_ROLES);
    const pais = await loadPais(admin, data.pais);

    const documento = normalizeDocumento(data.documento_fiscal_numero);
    const check = validarDocumentoFiscal(data.pais, documento);
    if (!check.ok) {
      const err = new Error(check.mensagem ?? `${pais.documento_nome} inválido.`);
      (err as any).code = "documento_invalido";
      (err as any).field = "documento_fiscal_numero";
      throw err;
    }

    const { data: dup } = await admin
      .from("clientes")
      .select("id, codigo")
      .eq("pais", data.pais)
      .eq("documento_fiscal_numero", documento)
      .is("deleted_at", null)
      .maybeSingle();
    if (dup) {
      const err = new Error(
        `Já existe um cliente com este ${pais.documento_nome} (${dup.codigo}).`,
      );
      (err as any).code = "documento_duplicado";
      (err as any).field = "documento_fiscal_numero";
      throw err;
    }

    // Garante que exatamente um contato é principal (o primeiro se nenhum marcado)
    let contatos = data.contatos.map((c) => ({ ...c }));
    if (!contatos.some((c) => c.principal)) contatos[0].principal = true;
    let foundPrincipal = false;
    contatos = contatos.map((c) => {
      if (c.principal && !foundPrincipal) {
        foundPrincipal = true;
        return c;
      }
      return { ...c, principal: false };
    });

    // Constrói payload com todos os campos opcionais (somente os definidos)
    const insertPayload: Record<string, unknown> = {
      razao_social: data.razao_social,
      nome_fantasia: data.nome_fantasia ?? null,
      apelido: data.apelido ?? null,
      pais: data.pais,
      documento_fiscal_tipo: pais.documento_nome,
      documento_fiscal_numero: documento,
      inscricao_estadual: data.inscricao_estadual ?? null,
      moeda: data.moeda,
      idioma: data.idioma,
      status: data.status,
      segmento_id: data.segmento_id ?? null,
      lead_origem_id: data.lead_origem_id ?? null,
      key_account: data.key_account,
      observacoes: data.observacoes ?? null,
      site: data.site ?? null,
      email_corporativo: data.email_corporativo ?? null,
      telefone_corporativo_ddi: data.telefone_corporativo_ddi ?? null,
      telefone_corporativo_numero: data.telefone_corporativo_numero ?? null,
      ramal: data.ramal ?? null,
      matriz_filial: data.matriz_filial ?? null,
      endereco_logradouro: data.endereco_logradouro ?? null,
      endereco_numero: data.endereco_numero ?? null,
      endereco_complemento: data.endereco_complemento ?? null,
      endereco_bairro: data.endereco_bairro ?? null,
      endereco_cidade: data.endereco_cidade ?? null,
      endereco_estado: data.endereco_estado ?? null,
      endereco_codigo_postal: data.endereco_codigo_postal ?? null,
      latitude: data.latitude ?? null,
      longitude: data.longitude ?? null,
      regime_tributario: data.regime_tributario ?? null,
      cnae_principal: data.cnae_principal ?? null,
      cnaes_secundarios: data.cnaes_secundarios ?? null,
      natureza_juridica_codigo: data.natureza_juridica_codigo ?? null,
      natureza_juridica_descricao: data.natureza_juridica_descricao ?? null,
      situacao_cadastral: data.situacao_cadastral ?? null,
      data_situacao: data.data_situacao ?? null,
      motivo_situacao: data.motivo_situacao ?? null,
      data_abertura: data.data_abertura ?? null,
      capital_social: data.capital_social ?? null,
      porte: data.porte ?? null,
      social_linkedin: data.social_linkedin ?? null,
      social_instagram: data.social_instagram ?? null,
      social_facebook: data.social_facebook ?? null,
      social_twitter: data.social_twitter ?? null,
      social_whatsapp: data.social_whatsapp ?? null,
      social_skype: data.social_skype ?? null,
      created_by: context.userId,
      updated_by: context.userId,
    };

    const { data: inserted, error: insErr } = await admin
      .from("clientes")
      .insert(insertPayload as never)
      .select("id, codigo")
      .single();
    if (insErr) throw friendlyDbError(insErr);

    const { error: cErr } = await admin.from("cliente_contatos").insert(
      contatos.map((c) => ({
        cliente_id: inserted.id,
        nome: c.nome,
        cargo: c.cargo ?? null,
        email: c.email ?? null,
        telefone_ddi: c.telefone_ddi ?? null,
        telefone_numero: c.telefone_numero ?? null,
        principal: c.principal,
      })),
    );
    if (cErr) throw friendlyDbError(cErr);

    if (data.socios && data.socios.length > 0) {
      const { error: sErr } = await admin.from("cliente_socios").insert(
        data.socios.map((s) => ({
          cliente_id: inserted.id,
          nome: s.nome,
          qualificacao: s.qualificacao ?? null,
          desde: s.desde ?? null,
          created_by: context.userId,
          updated_by: context.userId,
        })),
      );
      if (sErr) throw friendlyDbError(sErr);
    }

    await logAuditServer(admin, context.userId, {
      table_name: "clientes",
      record_id: inserted.id,
      action: "INSERT",
      new_value: { codigo: inserted.codigo, razao_social: data.razao_social, pais: data.pais },
    });

    return { id: inserted.id, codigo: inserted.codigo };
  });

/* ===================== updateCliente ===================== */

const updateInput = z.object({
  id: z.string().uuid(),
  patch: clienteInputSchema.partial().omit({ contatos: true }),
  contatos: z.array(contatoInputSchema).min(1).max(20).optional(),
});

export const updateCliente = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => updateInput.parse(input))
  .handler(async ({ data, context }) => {
    const admin = await assertRole(context.supabase, context.userId, ALLOWED_ROLES);

    const { data: before, error: befErr } = await admin
      .from("clientes")
      .select("*")
      .eq("id", data.id)
      .is("deleted_at", null)
      .maybeSingle();
    if (befErr) throw friendlyDbError(befErr);
    if (!before) throw new Error("Cliente não encontrado");

    const patch: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(data.patch)) {
      if (v === undefined) continue;
      patch[k] = v;
    }

    if (patch.pais || patch.documento_fiscal_numero) {
      const paisCodigo = (patch.pais as string) ?? before.pais;
      const pais = await loadPais(admin, paisCodigo);
      const doc = normalizeDocumento(
        (patch.documento_fiscal_numero as string) ?? before.documento_fiscal_numero,
      );
      const check = validarDocumentoFiscal(paisCodigo, doc);
      if (!check.ok) {
        const err = new Error(check.mensagem ?? `${pais.documento_nome} inválido.`);
        (err as any).code = "documento_invalido";
        (err as any).field = "documento_fiscal_numero";
        throw err;
      }
      const { data: dup } = await admin
        .from("clientes")
        .select("id, codigo")
        .eq("pais", paisCodigo)
        .eq("documento_fiscal_numero", doc)
        .is("deleted_at", null)
        .neq("id", data.id)
        .maybeSingle();
      if (dup) {
        const err = new Error(
          `Já existe um cliente com este ${pais.documento_nome} (${dup.codigo}).`,
        );
        (err as any).code = "documento_duplicado";
        (err as any).field = "documento_fiscal_numero";
        throw err;
      }
      patch.documento_fiscal_numero = doc;
      patch.documento_fiscal_tipo = pais.documento_nome;
    }

    patch.updated_by = context.userId;

    const { error: upErr } = await admin
      .from("clientes")
      .update(patch as never)
      .eq("id", data.id);
    if (upErr) throw friendlyDbError(upErr);

    // Diff por campo
    const diff: Array<{
      table_name: string;
      record_id: string;
      action: "UPDATE";
      field_changed: string;
      old_value: unknown;
      new_value: unknown;
    }> = [];
    for (const [k, v] of Object.entries(patch)) {
      if (k === "updated_by") continue;
      const oldV = (before as Record<string, unknown>)[k];
      if (JSON.stringify(oldV) === JSON.stringify(v)) continue;
      diff.push({
        table_name: "clientes",
        record_id: data.id,
        action: "UPDATE",
        field_changed: k,
        old_value: oldV ?? null,
        new_value: v ?? null,
      });
    }

    if (data.contatos) {
      // Substituição total dos contatos (soft delete dos antigos + insert)
      await admin
        .from("cliente_contatos")
        .update({ deleted_at: new Date().toISOString() })
        .eq("cliente_id", data.id)
        .is("deleted_at", null);
      let contatos = data.contatos.map((c) => ({ ...c }));
      if (!contatos.some((c) => c.principal)) contatos[0].principal = true;
      let found = false;
      contatos = contatos.map((c) => {
        if (c.principal && !found) {
          found = true;
          return c;
        }
        return { ...c, principal: false };
      });
      const { error: cErr } = await admin.from("cliente_contatos").insert(
        contatos.map((c) => ({
          cliente_id: data.id,
          nome: c.nome,
          cargo: c.cargo ?? null,
          email: c.email ?? null,
          telefone_ddi: c.telefone_ddi ?? null,
          telefone_numero: c.telefone_numero ?? null,
          principal: c.principal,
        })),
      );
      if (cErr) throw friendlyDbError(cErr);
      diff.push({
        table_name: "cliente_contatos",
        record_id: data.id,
        action: "UPDATE",
        field_changed: "contatos",
        old_value: null,
        new_value: contatos.length,
      });
    }

    if (diff.length > 0) await logAuditServer(admin, context.userId, diff);
    return { ok: true };
  });

/* ===================== deleteCliente (soft) ===================== */

export const deleteCliente = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => idInput.parse(input))
  .handler(async ({ data, context }) => {
    const admin = await assertRole(context.supabase, context.userId, DELETE_ROLES);
    const now = new Date().toISOString();
    const { error } = await admin
      .from("clientes")
      .update({ deleted_at: now, updated_by: context.userId })
      .eq("id", data.id);
    if (error) throw friendlyDbError(error);
    await logAuditServer(admin, context.userId, {
      table_name: "clientes",
      record_id: data.id,
      action: "DELETE",
      field_changed: "deleted_at",
      new_value: now,
    });
    return { ok: true };
  });

/* ===================== Ficha 360º — listagens por cliente ===================== */

const clienteIdInput = z.object({ clienteId: z.string().uuid() });

export const listClienteOportunidades = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => clienteIdInput.parse(input))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("oportunidades")
      .select(
        "id, codigo, titulo, pipeline_stage, lifecycle_stage, valor_estimado, probabilidade, expected_close_date, responsavel_id, created_at, updated_at, lost_at, lost_reason",
      )
      .eq("cliente_id", data.clienteId)
      .is("deleted_at", null)
      .order("updated_at", { ascending: false });
    if (error) throw friendlyDbError(error);
    return rows ?? [];
  });

export const listClienteProcessos = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => clienteIdInput.parse(input))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("processos")
      .select(
        "id, codigo, titulo, tipo, stage, progresso, risco, valor, previsao, created_at, updated_at, lost_at",
      )
      .eq("cliente_id", data.clienteId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    if (error) throw friendlyDbError(error);
    return rows ?? [];
  });

export const listClienteDocumentos = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => clienteIdInput.parse(input))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("cliente_documentos")
      .select("*")
      .eq("cliente_id", data.clienteId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    if (error) throw friendlyDbError(error);
    return rows ?? [];
  });

export const listClienteTimeline = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => clienteIdInput.parse(input))
  .handler(async ({ data, context }) => {
    const [{ data: interacoes, error: iErr }, { data: opps }, { data: procs }] = await Promise.all([
      context.supabase
        .from("cliente_interacoes")
        .select("*")
        .eq("cliente_id", data.clienteId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(100),
      context.supabase
        .from("oportunidades")
        .select("id, codigo, titulo, pipeline_stage, created_at, updated_at, lost_at")
        .eq("cliente_id", data.clienteId)
        .is("deleted_at", null)
        .order("updated_at", { ascending: false })
        .limit(50),
      context.supabase
        .from("processos")
        .select("id, codigo, titulo, stage, created_at, updated_at, lost_at")
        .eq("cliente_id", data.clienteId)
        .is("deleted_at", null)
        .order("updated_at", { ascending: false })
        .limit(50),
    ]);
    if (iErr) throw friendlyDbError(iErr);

    type Item = {
      id: string;
      tipo: string;
      titulo: string;
      descricao: string | null;
      ts: string;
      user_nome?: string | null;
      ref?: { kind: "oportunidade" | "processo"; codigo: string | null; id: string } | null;
    };
    const items: Item[] = [];
    for (const i of interacoes ?? []) {
      items.push({
        id: `int-${i.id}`,
        tipo: i.tipo,
        titulo: i.descricao,
        descricao: null,
        ts: i.created_at,
        user_nome: i.user_nome,
        ref: null,
      });
    }
    for (const o of opps ?? []) {
      items.push({
        id: `opp-${o.id}`,
        tipo:
          o.pipeline_stage === "ganho"
            ? "oportunidade_ganha"
            : o.pipeline_stage === "perdido"
              ? "oportunidade_perdida"
              : "oportunidade",
        titulo: `Oportunidade ${o.codigo ?? ""} — ${o.titulo}`,
        descricao: `Estágio: ${o.pipeline_stage}`,
        ts: o.updated_at ?? o.created_at,
        ref: { kind: "oportunidade", codigo: o.codigo, id: o.id },
      });
    }
    for (const p of procs ?? []) {
      items.push({
        id: `proc-${p.id}`,
        tipo: p.lost_at ? "processo_arquivado" : "processo",
        titulo: `Processo ${p.codigo} — ${p.titulo}`,
        descricao: `Etapa: ${p.stage}`,
        ts: p.updated_at ?? p.created_at,
        ref: { kind: "processo", codigo: p.codigo, id: p.id },
      });
    }
    items.sort((a, b) => (a.ts < b.ts ? 1 : -1));
    return items.slice(0, 80);
  });

const addInteracaoInput = z.object({
  clienteId: z.string().uuid(),
  tipo: z.enum(["nota", "ligacao", "reuniao", "email", "visita"]).default("nota"),
  descricao: z.string().trim().min(1).max(2000),
});

export const addClienteInteracao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => addInteracaoInput.parse(input))
  .handler(async ({ data, context }) => {
    const admin = context.supabase;
    const { data: prof } = await admin
      .from("profiles")
      .select("full_name, email")
      .eq("id", context.userId)
      .maybeSingle();
    const nome = prof?.full_name ?? prof?.email ?? "Usuário";
    const { error } = await admin.from("cliente_interacoes").insert({
      cliente_id: data.clienteId,
      tipo: data.tipo,
      descricao: data.descricao,
      user_id: context.userId,
      user_nome: nome,
    } as never);
    if (error) throw friendlyDbError(error);
    await admin
      .from("clientes")
      .update({ ultimo_contato_em: new Date().toISOString() } as never)
      .eq("id", data.clienteId);
    return { ok: true };
  });

/* ===================== Helper: timeline event ===================== */

/**
 * Registra um evento "sistema" (não-manual) na timeline do cliente.
 * Usado por upload/remover documentos, sócios, geocoding etc.
 * Tipos comuns: documento_anexado, documento_removido,
 * socio_adicionado, socio_removido, geocoded.
 */
export async function recordClienteEvent(
  admin: SupabaseClient<Database>,
  opts: { clienteId: string; tipo: string; descricao: string; userId: string },
) {
  const { data: prof } = await admin
    .from("profiles")
    .select("full_name, email")
    .eq("id", opts.userId)
    .maybeSingle();
  const nome = prof?.full_name ?? prof?.email ?? "Sistema";
  await admin.from("cliente_interacoes").insert({
    cliente_id: opts.clienteId,
    tipo: opts.tipo,
    descricao: opts.descricao,
    user_id: opts.userId,
    user_nome: nome,
  } as never);
}

/* ===================== Sócios (CRUD individual) ===================== */

const socioCreateInput = z.object({
  clienteId: z.string().uuid(),
  nome: z.string().trim().min(2).max(180),
  qualificacao: z
    .string()
    .trim()
    .max(120)
    .optional()
    .nullable()
    .or(z.literal("").transform(() => null)),
  desde: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida (use AAAA-MM-DD).")
    .refine((v) => {
      const d = new Date(v + "T00:00:00Z");
      if (Number.isNaN(d.getTime())) return false;
      const [y, m, day] = v.split("-").map(Number);
      return d.getUTCFullYear() === y && d.getUTCMonth() + 1 === m && d.getUTCDate() === day;
    }, "Data inexistente.")
    .refine((v) => new Date(v + "T00:00:00Z").getTime() <= Date.now(), "Data não pode ser futura.")
    .optional()
    .nullable()
    .or(z.literal("").transform(() => null)),
});

export const addClienteSocio = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => socioCreateInput.parse(input))
  .handler(async ({ data, context }) => {
    const admin = await assertRole(context.supabase, context.userId, ALLOWED_ROLES);
    // Duplicate prevention: same nome (case-insensitive) no mesmo cliente, não removido.
    const { data: dup } = await admin
      .from("cliente_socios")
      .select("id, nome")
      .eq("cliente_id", data.clienteId)
      .is("deleted_at", null)
      .ilike("nome", data.nome)
      .maybeSingle();
    if (dup) {
      throw new Error(`Já existe um sócio com o nome "${dup.nome}" neste cliente.`);
    }
    const { data: row, error } = await admin
      .from("cliente_socios")
      .insert({
        cliente_id: data.clienteId,
        nome: data.nome,
        qualificacao: data.qualificacao ?? null,
        desde: data.desde ?? null,
        created_by: context.userId,
        updated_by: context.userId,
      } as never)
      .select("id, nome, qualificacao, desde")
      .single();
    if (error) throw friendlyDbError(error);
    await recordClienteEvent(admin, {
      clienteId: data.clienteId,
      tipo: "socio_adicionado",
      descricao: `Sócio adicionado: ${data.nome}${data.qualificacao ? ` (${data.qualificacao})` : ""}`,
      userId: context.userId,
    });
    return row;
  });

export const removerClienteSocio = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const admin = await assertRole(context.supabase, context.userId, ALLOWED_ROLES);
    const { data: row, error: gErr } = await admin
      .from("cliente_socios")
      .select("id, cliente_id, nome")
      .eq("id", data.id)
      .maybeSingle();
    if (gErr) throw friendlyDbError(gErr);
    if (!row) throw new Error("Sócio não encontrado.");
    const { error } = await admin
      .from("cliente_socios")
      .update({
        deleted_at: new Date().toISOString(),
        updated_by: context.userId,
      } as never)
      .eq("id", data.id);
    if (error) throw friendlyDbError(error);
    await recordClienteEvent(admin, {
      clienteId: row.cliente_id,
      tipo: "socio_removido",
      descricao: `Sócio removido: ${row.nome}`,
      userId: context.userId,
    });
    return { ok: true };
  });

/* ===================== geocodeCliente (Nominatim + cache) ===================== */

const geocodeInput = z.object({ clienteId: z.string().uuid() });

type NominatimHit = { lat: string; lon: string; display_name?: string };

/** Chave estável usada como `enrich_cache.documento` para geocoding (<=240 chars). */
function geocodeCacheKey(query: string): string {
  return query
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 240);
}

const GEOCODE_TTL_DAYS = 90;

export const geocodeCliente = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => geocodeInput.parse(input))
  .handler(async ({ data, context }) => {
    const admin = context.supabase;
    const { data: cli, error: cliErr } = await admin
      .from("clientes")
      .select(
        "id, codigo, endereco_logradouro, endereco_numero, endereco_bairro, endereco_cidade, endereco_estado, endereco_codigo_postal, pais",
      )
      .eq("id", data.clienteId)
      .maybeSingle();
    if (cliErr) throw friendlyDbError(cliErr);
    if (!cli) throw new Error("Cliente não encontrado.");

    const parts = [
      [cli.endereco_logradouro, cli.endereco_numero].filter(Boolean).join(", "),
      cli.endereco_bairro,
      cli.endereco_cidade,
      cli.endereco_estado,
      cli.endereco_codigo_postal,
      cli.pais,
    ]
      .map((p) => (typeof p === "string" ? p.trim() : ""))
      .filter(Boolean);
    if (parts.length < 2) {
      throw new Error("Endereço insuficiente para geocodificar (preencha logradouro/cidade).");
    }
    const query = parts.join(", ");
    const cacheKey = geocodeCacheKey(query);
    const pais = (cli.pais ?? "BR").toUpperCase();

    let lat: number | null = null;
    let lon: number | null = null;
    let displayName: string | null = null;
    let fromCache = false;

    // 1) Cache lookup (TTL 90 dias, provider=nominatim).
    {
      const since = new Date(Date.now() - GEOCODE_TTL_DAYS * 86400 * 1000).toISOString();
      const { data: cached } = await admin
        .from("enrich_cache")
        .select("payload, fetched_at")
        .eq("pais", pais)
        .eq("documento", cacheKey)
        .eq("provider", "nominatim")
        .gte("fetched_at", since)
        .maybeSingle();
      const payload = cached?.payload as
        | { lat?: number; lon?: number; display_name?: string | null }
        | null
        | undefined;
      if (payload && Number.isFinite(payload.lat) && Number.isFinite(payload.lon)) {
        lat = Number(payload.lat);
        lon = Number(payload.lon);
        displayName = payload.display_name ?? null;
        fromCache = true;
      }
    }

    // 2) Miss → Nominatim + upsert no cache.
    if (lat == null || lon == null) {
      const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&addressdetails=0&q=${encodeURIComponent(query)}`;
      const resp = await fetch(url, {
        headers: {
          "User-Agent": "SLTK-App/1.0 (geocoding-light; contato@solutek.com.br)",
          "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.6",
        },
      });
      if (!resp.ok) {
        throw new Error(`Nominatim respondeu ${resp.status}.`);
      }
      const hits = (await resp.json()) as NominatimHit[];
      const hit = hits[0];
      if (!hit) {
        throw new Error("Nenhum resultado para o endereço informado.");
      }
      const hLat = Number(hit.lat);
      const hLon = Number(hit.lon);
      if (!Number.isFinite(hLat) || !Number.isFinite(hLon)) {
        throw new Error("Resposta inválida do geocodificador.");
      }
      lat = hLat;
      lon = hLon;
      displayName = hit.display_name ?? null;
      try {
        await admin.from("enrich_cache").upsert(
          {
            pais,
            documento: cacheKey,
            provider: "nominatim",
            payload: { lat, lon, display_name: displayName, query } as never,
            fetched_at: new Date().toISOString(),
          },
          { onConflict: "pais,documento,provider" },
        );
      } catch {
        /* cache best-effort */
      }
    }

    const geocodedAt = new Date().toISOString();
    const { error: upErr } = await admin
      .from("clientes")
      .update({ latitude: lat, longitude: lon, geocoded_at: geocodedAt } as never)
      .eq("id", data.clienteId);
    if (upErr) throw friendlyDbError(upErr);

    await recordClienteEvent(admin, {
      clienteId: data.clienteId,
      tipo: "geocoded",
      descricao: `Endereço geocodificado${fromCache ? " (cache)" : " via Nominatim"} — ${lat!.toFixed(5)}, ${lon!.toFixed(5)}`,
      userId: context.userId,
    });

    return {
      latitude: lat!,
      longitude: lon!,
      display_name: displayName,
      geocoded_at: geocodedAt,
      cached: fromCache,
    };
  });
