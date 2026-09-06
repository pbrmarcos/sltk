import { createServerFn } from "@tanstack/react-start";
import { friendlyDbError } from "@/lib/db-errors";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertCanAccessModule } from "@/lib/admin-guard";

/**
 * Server functions do módulo FAT (Factory Acceptance Test).
 * RLS já restringe leitura/escrita a admin/manager/qualidade — aqui apenas
 * encapsulamos as queries e regras de negócio (autosave, RNC automática,
 * homologação).
 */

export const FAT_SECOES = [
  { id: "inspecao_visual", label: "Inspeção visual e dimensional" },
  { id: "documentacao", label: "Documentação e manuais" },
  { id: "seguranca", label: "Segurança" },
  { id: "ensaios_eletricos", label: "Ensaios elétricos" },
  { id: "funcional", label: "Funcional / automação" },
  { id: "treinamento", label: "Educação e treinamento" },
  { id: "envio", label: "Envio e recebimento" },
  { id: "qualidade_produto", label: "Qualidade do produto" },
] as const;
export type FatSecaoId = (typeof FAT_SECOES)[number]["id"];

export const FAT_STATUS_LABEL: Record<string, string> = {
  rascunho: "Rascunho",
  em_execucao: "Em execução",
  aguardando_homologacao: "Aguardando homologação",
  homologado: "Homologado",
  reprovado: "Reprovado",
};

export const MOTIVOS_VIAGEM = [
  "cortesia",
  "fora_garantia",
  "preventiva",
  "montagem",
  "treinamento",
  "corretiva",
  "instrucao_op",
  "garantia",
] as const;

// ============================================================
// LIST
// ============================================================
export const listFats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { q?: string; status?: string; page?: number } | undefined) => input ?? {},
  )
  .handler(async ({ data, context }) => {
    const page = Math.max(1, data.page ?? 1);
    const from = (page - 1) * 50;
    const to = from + 49;
    let q = context.supabase
      .from("fat_relatorios")
      .select(
        "id, codigo, processo_id, cliente_id, tag_equipamento, status, progresso, ok_count, nok_count, na_count, data_ensaio, created_at",
        { count: "exact" },
      )
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .range(from, to);
    if (data.status && data.status !== "todos") q = q.eq("status", data.status as never);
    if (data.q) q = q.or(`codigo.ilike.%${data.q}%,tag_equipamento.ilike.%${data.q}%`);
    const { data: rows, error, count } = await q;
    if (error) throw friendlyDbError(error);

    // enrich cliente/processo nomes
    const clienteIds = Array.from(new Set((rows ?? []).map((r) => r.cliente_id)));
    const processoIds = Array.from(new Set((rows ?? []).map((r) => r.processo_id)));
    const [{ data: cli }, { data: proc }] = await Promise.all([
      clienteIds.length
        ? context.supabase
            .from("clientes")
            .select("id, razao_social, nome_fantasia")
            .in("id", clienteIds)
        : Promise.resolve({
            data: [] as Array<{
              id: string;
              razao_social: string | null;
              nome_fantasia: string | null;
            }>,
          }),
      processoIds.length
        ? context.supabase.from("processos").select("id, codigo, titulo").in("id", processoIds)
        : Promise.resolve({ data: [] as Array<{ id: string; codigo: string; titulo: string }> }),
    ]);
    const cliMap = new Map(
      (cli ?? []).map((c) => [c.id, c.nome_fantasia || c.razao_social || "—"]),
    );
    const procMap = new Map((proc ?? []).map((p) => [p.id, `${p.codigo} · ${p.titulo}`]));
    return {
      total: count ?? 0,
      page,
      rows: (rows ?? []).map((r) => ({
        ...r,
        cliente_nome: cliMap.get(r.cliente_id) ?? "—",
        processo_nome: procMap.get(r.processo_id) ?? "—",
      })),
    };
  });

// ============================================================
// CREATE
// ============================================================
export const createFat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { processo_id: string }) =>
    z.object({ processo_id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertCanAccessModule(context.supabase, context.userId, "qualidade");
    // Pega cliente do processo
    const { data: proc, error: pErr } = await context.supabase
      .from("processos")
      .select("id, cliente_id, titulo")
      .eq("id", data.processo_id)
      .single();
    if (pErr || !proc) throw new Error("Processo não encontrado.");

    const { data: fat, error } = await context.supabase
      .from("fat_relatorios")
      .insert({
        processo_id: proc.id,
        cliente_id: proc.cliente_id,
        status: "rascunho",
        inspetor_id: context.userId,
      })
      .select("id")
      .single();
    if (error) throw friendlyDbError(error);
    return { id: fat!.id };
  });

// ============================================================
// GET DETALHE
// ============================================================
export const getFat = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: fat, error } = await context.supabase
      .from("fat_relatorios")
      .select("*")
      .eq("id", data.id)
      .is("deleted_at", null)
      .single();
    if (error || !fat) throw new Error("FAT não encontrado.");

    const [
      { data: tpl },
      { data: resp },
      { data: meds },
      { data: rncs },
      { data: ass },
      { data: cli },
      { data: proc },
    ] = await Promise.all([
      context.supabase
        .from("fat_checklist_template")
        .select("id, secao, ordem, titulo, descricao, requer_foto_nok")
        .eq("ativo", true)
        .order("secao")
        .order("ordem"),
      context.supabase
        .from("fat_checklist_resposta")
        .select("id, template_id, status, comentario, foto_path")
        .eq("fat_id", data.id),
      context.supabase.from("fat_medicoes").select("*").eq("fat_id", data.id).order("ordem"),
      context.supabase.from("fat_rnc").select("*").eq("fat_id", data.id).order("created_at"),
      context.supabase.from("fat_assinaturas").select("*").eq("fat_id", data.id),
      context.supabase
        .from("clientes")
        .select("id, razao_social, nome_fantasia")
        .eq("id", fat.cliente_id)
        .single(),
      context.supabase
        .from("processos")
        .select("id, codigo, titulo")
        .eq("id", fat.processo_id)
        .single(),
    ]);

    return {
      fat,
      template: tpl ?? [],
      respostas: resp ?? [],
      medicoes: meds ?? [],
      rncs: rncs ?? [],
      assinaturas: ass ?? [],
      cliente: cli ?? null,
      processo: proc ?? null,
    };
  });

// ============================================================
// UPDATE identificação (autosave)
// ============================================================
const identSchema = z.object({
  id: z.string().uuid(),
  patch: z.object({
    os_codigo: z.string().max(120).nullish(),
    tag_equipamento: z.string().max(120).nullish(),
    data_ensaio: z.string().nullish(),
    hora_inicio: z.string().nullish(),
    testemunha_nome: z.string().max(200).nullish(),
    local_ensaio: z.string().max(200).nullish(),
    temperatura_c: z.number().nullish(),
    umidade_rel: z.number().nullish(),
    tensao_alimentacao: z.string().max(60).nullish(),
    motivos_viagem: z.array(z.string()).max(20).optional(),
    periodo_de: z.string().nullish(),
    periodo_ate: z.string().nullish(),
    tecnicos: z.string().max(500).nullish(),
    observacoes_gerais: z.string().max(4000).nullish(),
  }),
});

export const updateFatIdentificacao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: z.infer<typeof identSchema>) => identSchema.parse(i))
  .handler(async ({ data, context }) => {
    await assertCanAccessModule(context.supabase, context.userId, "qualidade");
    const { error } = await context.supabase
      .from("fat_relatorios")
      .update({ ...data.patch, status: "em_execucao" as const })
      .eq("id", data.id);
    if (error) throw friendlyDbError(error);
    return { ok: true };
  });

// ============================================================
// CHECKLIST resposta + RNC automática + recalculo contadores
// ============================================================
const respSchema = z.object({
  fat_id: z.string().uuid(),
  template_id: z.string().uuid(),
  status: z.enum(["pendente", "ok", "nok", "na"]),
  comentario: z.string().max(2000).nullish(),
  foto_path: z.string().max(500).nullish(),
});

export const setChecklistResposta = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: z.infer<typeof respSchema>) => respSchema.parse(i))
  .handler(async ({ data, context }) => {
    await assertCanAccessModule(context.supabase, context.userId, "qualidade");
    // upsert pela única (fat_id, template_id)
    const { error } = await context.supabase.from("fat_checklist_resposta").upsert(
      {
        fat_id: data.fat_id,
        template_id: data.template_id,
        status: data.status,
        comentario: data.comentario ?? null,
        foto_path: data.foto_path ?? null,
        updated_by: context.userId,
      },
      { onConflict: "fat_id,template_id" },
    );
    if (error) throw friendlyDbError(error);

    // Cria RNC automática se NOK e ainda não existe
    if (data.status === "nok") {
      const { data: tpl } = await context.supabase
        .from("fat_checklist_template")
        .select("titulo")
        .eq("id", data.template_id)
        .single();
      const { data: respRow } = await context.supabase
        .from("fat_checklist_resposta")
        .select("id")
        .eq("fat_id", data.fat_id)
        .eq("template_id", data.template_id)
        .single();
      if (respRow && tpl) {
        const { data: existing } = await context.supabase
          .from("fat_rnc")
          .select("id")
          .eq("origem_resposta_id", respRow.id)
          .maybeSingle();
        if (!existing) {
          await context.supabase.from("fat_rnc").insert({
            fat_id: data.fat_id,
            origem_resposta_id: respRow.id,
            titulo: tpl.titulo,
            descricao: data.comentario ?? null,
            status: "aberta",
          });
        }
      }
    }

    // Recalcula contadores
    await recalcContadores(context.supabase, data.fat_id);
    return { ok: true };
  });

async function recalcContadores(supabase: any, fatId: string) {
  const { data: total } = await supabase
    .from("fat_checklist_template")
    .select("id", { count: "exact", head: true })
    .eq("ativo", true);
  void total;
  const { count: totalCount } = await supabase
    .from("fat_checklist_template")
    .select("id", { count: "exact", head: true })
    .eq("ativo", true);
  const { data: rs } = await supabase
    .from("fat_checklist_resposta")
    .select("status")
    .eq("fat_id", fatId);
  const ok = (rs ?? []).filter((r: any) => r.status === "ok").length;
  const nok = (rs ?? []).filter((r: any) => r.status === "nok").length;
  const na = (rs ?? []).filter((r: any) => r.status === "na").length;
  const respondidos = ok + nok + na;
  const progresso = totalCount ? Math.round((respondidos / totalCount) * 100) : 0;
  await supabase
    .from("fat_relatorios")
    .update({ ok_count: ok, nok_count: nok, na_count: na, progresso })
    .eq("id", fatId);
}

// ============================================================
// MEDIÇÕES
// ============================================================
const medSchema = z.object({
  id: z.string().uuid().nullish(),
  fat_id: z.string().uuid(),
  ordem: z.number().int().min(0).default(0),
  parametro: z.string().min(1).max(200),
  unidade: z.string().max(40).nullish(),
  nominal: z.number().nullish(),
  tolerancia: z.string().max(60).nullish(),
  medido: z.number().nullish(),
});
function computeStatus(
  nominal: number | null | undefined,
  tol: string | null | undefined,
  med: number | null | undefined,
) {
  if (med == null || nominal == null) return null;
  if (!tol) return med === nominal ? "Aprovado" : "Reprovado";
  const m = tol.replace(/\s/g, "");
  let lo = nominal,
    hi = nominal;
  const pct = m.match(/^[±+-]?(\d+(?:[.,]\d+)?)%$/);
  const abs = m.match(/^[±+-]?(\d+(?:[.,]\d+)?)$/);
  if (pct) {
    const p = parseFloat(pct[1].replace(",", ".")) / 100;
    lo = nominal * (1 - p);
    hi = nominal * (1 + p);
  } else if (abs) {
    const a = parseFloat(abs[1].replace(",", "."));
    lo = nominal - a;
    hi = nominal + a;
  }
  return med >= lo && med <= hi ? "Aprovado" : "Reprovado";
}

export const upsertMedicao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: z.infer<typeof medSchema>) => medSchema.parse(i))
  .handler(async ({ data, context }) => {
    await assertCanAccessModule(context.supabase, context.userId, "qualidade");
    const status_auto = computeStatus(data.nominal, data.tolerancia, data.medido);
    const row = {
      fat_id: data.fat_id,
      ordem: data.ordem,
      parametro: data.parametro,
      unidade: data.unidade ?? null,
      nominal: data.nominal ?? null,
      tolerancia: data.tolerancia ?? null,
      medido: data.medido ?? null,
      status_auto,
    };
    if (data.id) {
      const { error } = await context.supabase.from("fat_medicoes").update(row).eq("id", data.id);
      if (error) throw friendlyDbError(error);
      return { id: data.id };
    }
    const { data: ins, error } = await context.supabase
      .from("fat_medicoes")
      .insert(row)
      .select("id")
      .single();
    if (error) throw friendlyDbError(error);
    return { id: ins!.id };
  });

export const deleteMedicao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { id: string }) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertCanAccessModule(context.supabase, context.userId, "qualidade");
    const { error } = await context.supabase.from("fat_medicoes").delete().eq("id", data.id);
    if (error) throw friendlyDbError(error);
    return { ok: true };
  });

// ============================================================
// RNC
// ============================================================
const rncSchema = z.object({
  id: z.string().uuid().nullish(),
  fat_id: z.string().uuid(),
  titulo: z.string().min(1).max(300),
  descricao: z.string().max(4000).nullish(),
  plano_acao: z.string().max(4000).nullish(),
  responsavel_id: z.string().uuid().nullish(),
  prazo: z.string().nullish(),
  status: z.enum(["aberta", "em_tratativa", "fechada", "cancelada"]).default("aberta"),
});

export const upsertRnc = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: z.infer<typeof rncSchema>) => rncSchema.parse(i))
  .handler(async ({ data, context }) => {
    await assertCanAccessModule(context.supabase, context.userId, "qualidade");
    const { id, ...rest } = data;
    if (id) {
      const { error } = await context.supabase.from("fat_rnc").update(rest).eq("id", id);
      if (error) throw friendlyDbError(error);
      return { id };
    }
    const { data: ins, error } = await context.supabase
      .from("fat_rnc")
      .insert(rest)
      .select("id")
      .single();
    if (error) throw friendlyDbError(error);
    return { id: ins!.id };
  });

// ============================================================
// ASSINATURAS
// ============================================================
const assSchema = z.object({
  fat_id: z.string().uuid(),
  tipo: z.enum(["inspetor", "testemunha"]),
  nome: z.string().min(1).max(200),
  cargo: z.string().max(200).nullish(),
  assinatura_svg: z.string().min(1),
});

async function sha256Hex(s: string) {
  const buf = new TextEncoder().encode(s);
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export const submitAssinatura = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: z.infer<typeof assSchema>) => assSchema.parse(i))
  .handler(async ({ data, context }) => {
    await assertCanAccessModule(context.supabase, context.userId, "qualidade");
    const hash = await sha256Hex(`${data.fat_id}|${data.tipo}|${data.nome}|${data.assinatura_svg}`);
    const { error } = await context.supabase.from("fat_assinaturas").upsert(
      {
        fat_id: data.fat_id,
        tipo: data.tipo,
        nome: data.nome,
        cargo: data.cargo ?? null,
        assinatura_svg: data.assinatura_svg,
        hash_sha256: hash,
        assinado_em: new Date().toISOString(),
      },
      { onConflict: "fat_id,tipo" },
    );
    if (error) throw friendlyDbError(error);
    return { hash };
  });

export const removeAssinatura = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { fat_id: string; tipo: "inspetor" | "testemunha" }) =>
    z.object({ fat_id: z.string().uuid(), tipo: z.enum(["inspetor", "testemunha"]) }).parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertCanAccessModule(context.supabase, context.userId, "qualidade");
    const { error } = await context.supabase
      .from("fat_assinaturas")
      .delete()
      .eq("fat_id", data.fat_id)
      .eq("tipo", data.tipo);
    if (error) throw friendlyDbError(error);
    return { ok: true };
  });

// ============================================================
// HOMOLOGAR
// ============================================================
export const homologarFat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { id: string }) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertCanAccessModule(context.supabase, context.userId, "qualidade");
    const { data: fat, error: fErr } = await context.supabase
      .from("fat_relatorios")
      .select("id, progresso, nok_count")
      .eq("id", data.id)
      .single();
    if (fErr || !fat) throw new Error("FAT não encontrado.");
    if ((fat.progresso ?? 0) < 100) throw new Error("Checklist incompleto.");

    const { count: rncAbertas } = await context.supabase
      .from("fat_rnc")
      .select("id", { count: "exact", head: true })
      .eq("fat_id", data.id)
      .in("status", ["aberta", "em_tratativa"]);
    if ((rncAbertas ?? 0) > 0) throw new Error("Existem RNCs em aberto.");

    const { count: assinaturas } = await context.supabase
      .from("fat_assinaturas")
      .select("id", { count: "exact", head: true })
      .eq("fat_id", data.id);
    if ((assinaturas ?? 0) < 2) throw new Error("Faltam assinaturas (inspetor + testemunha).");

    const { error } = await context.supabase
      .from("fat_relatorios")
      .update({
        status: "homologado",
        homologado_em: new Date().toISOString(),
        homologado_por: context.userId,
      })
      .eq("id", data.id);
    if (error) throw friendlyDbError(error);

    const { equipamento, projeto, cliente_nome, usuario } = await fatEmailContext(
      context.supabase,
      data.id,
      context.userId,
    );
    const { safeDispatch, appUrl, fmtDate } = await import("@/lib/email/safe-dispatch.server");
    await safeDispatch({
      eventKey: "fat.homologado",
      triggeredBy: context.userId,
      entityTable: "fat_relatorios",
      entityId: data.id,
      vars: {
        equipamento,
        projeto,
        cliente_nome,
        usuario,
        data: fmtDate(),
        link: appUrl(`/qualidade/fat/${data.id}`),
      },
    });

    return { ok: true };
  });

// ============================================================
// REPROVAR
// ============================================================
export const reprovarFat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { id: string; motivo: string }) =>
    z.object({ id: z.string().uuid(), motivo: z.string().trim().min(5).max(2000) }).parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertCanAccessModule(context.supabase, context.userId, "qualidade");
    const { data: fat, error: fErr } = await context.supabase
      .from("fat_relatorios")
      .select("id, status")
      .eq("id", data.id)
      .single();
    if (fErr || !fat) throw new Error("FAT não encontrado.");
    if (!["em_execucao", "aguardando_homologacao"].includes(fat.status)) {
      throw new Error("Este FAT não está em um status que permita reprovação.");
    }

    // Cast local: reprovado_em/reprovado_por/motivo_reprovacao são novas
    // colunas (migration 20260906120000) que ainda não estão em types.ts
    // gerado.
    const { error } = await (
      context.supabase.from("fat_relatorios") as unknown as {
        update: (row: Record<string, unknown>) => {
          eq: (
            c: string,
            v: string,
          ) => Promise<{ error: { message: string; code?: string | null } | null }>;
        };
      }
    )
      .update({
        status: "reprovado",
        reprovado_em: new Date().toISOString(),
        reprovado_por: context.userId,
        motivo_reprovacao: data.motivo,
      })
      .eq("id", data.id);
    if (error) throw friendlyDbError(error);

    const { equipamento, projeto, cliente_nome, usuario } = await fatEmailContext(
      context.supabase,
      data.id,
      context.userId,
    );
    const { safeDispatch, appUrl, fmtDate } = await import("@/lib/email/safe-dispatch.server");
    await safeDispatch({
      eventKey: "fat.reprovado",
      triggeredBy: context.userId,
      entityTable: "fat_relatorios",
      entityId: data.id,
      vars: {
        equipamento,
        projeto,
        cliente_nome,
        usuario,
        motivo: data.motivo,
        data: fmtDate(),
        link: appUrl(`/qualidade/fat/${data.id}`),
      },
    });

    return { ok: true };
  });

/** Dados comuns aos e-mails de homologação/reprovação de FAT. */
async function fatEmailContext(
  supabase: any, // eslint-disable-line @typescript-eslint/no-explicit-any
  fatId: string,
  userId: string,
): Promise<{ equipamento: string; projeto: string; cliente_nome: string; usuario: string }> {
  const [{ data: full }, { data: prof }] = await Promise.all([
    supabase
      .from("fat_relatorios")
      .select("tag_equipamento, cliente_id, processo_id")
      .eq("id", fatId)
      .maybeSingle(),
    supabase.from("profiles").select("full_name, email").eq("id", userId).maybeSingle(),
  ]);
  const [{ data: cli }, { data: proc }] = await Promise.all([
    full?.cliente_id
      ? supabase
          .from("clientes")
          .select("razao_social, nome_fantasia")
          .eq("id", full.cliente_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    full?.processo_id
      ? supabase.from("processos").select("codigo, titulo").eq("id", full.processo_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  return {
    equipamento: full?.tag_equipamento ?? "",
    projeto: proc ? `${proc.codigo} · ${proc.titulo}` : "",
    cliente_nome: cli?.nome_fantasia || cli?.razao_social || "",
    usuario: prof?.full_name || prof?.email || "Usuário",
  };
}

// ============================================================
// SIGNED URL para evidência (foto)
// ============================================================
export const getFatFotoSignedUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { path: string }) => z.object({ path: z.string().min(1).max(500) }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: signed, error } = await context.supabase.storage
      .from("fat-evidencias")
      .createSignedUrl(data.path, 900);
    if (error) throw friendlyDbError(error);
    return { url: signed.signedUrl };
  });
