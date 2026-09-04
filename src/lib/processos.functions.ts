import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Server fns para Processos (CRM pipeline).
 *
 * Cada handler reusa o cliente autenticado (`context.supabase`) para que as
 * policies RLS sejam aplicadas como o usuário logado:
 *  - Pilar enxerga seus próprios processos.
 *  - Admin / manager enxergam todos.
 *  - Inserts/updates validados pelas policies + Zod aqui.
 *
 * O trigger `tg_processos_audit` no banco já grava em `audit_log`, então
 * nenhuma chamada manual a `logAuditServer` é necessária aqui.
 */

export const PIPELINE_BY_TIPO = {
  projeto: [
    "Lead",
    "ETP",
    "Orçamento",
    "OC",
    "Eng. Mecânica",
    "Eng. Elétrica",
    "Montagem",
    "FAT",
    "Embarque",
    "Pós-venda",
  ],
  atendimento: [
    "Solicitação",
    "Análise",
    "Registro",
    "Resolução",
    "Encerrado",
  ],
  instalacao: [
    "Solicitação",
    "Preparação",
    "Agendamento",
    "Arranque",
    "Treinamento",
    "Entrega Técnica",
  ],
} as const;

export type ProcessoTipo = keyof typeof PIPELINE_BY_TIPO;
export const PROCESSO_TIPOS: ProcessoTipo[] = ["projeto", "atendimento", "instalacao"];

/** Compat: pipeline padrão (projeto) — usado por código existente. */
export const PIPELINE_STAGES_DB = PIPELINE_BY_TIPO.projeto;

/** Todos os estágios já existentes no enum (união dos três pipelines). */
export const ALL_STAGES_DB = Array.from(
  new Set([
    ...PIPELINE_BY_TIPO.projeto,
    ...PIPELINE_BY_TIPO.atendimento,
    ...PIPELINE_BY_TIPO.instalacao,
  ]),
) as readonly string[];

export type PipelineStage = (typeof ALL_STAGES_DB)[number];
export type Risco = "Baixo" | "Médio" | "Alto";

export type ProcessoLite = {
  id: string;
  codigo: string;
  titulo: string;
  tipo: ProcessoTipo;
  cliente_id: string;
  cliente_nome: string;
  pilar_id: string;
  pilar_nome: string;
  stage: PipelineStage;
  stage_entered_at: string;
  progresso: number;
  risco: Risco;
  valor: number | null;
  previsao: string | null;
  lost_at: string | null;
  lost_by: string | null;
  lost_by_nome: string | null;
  lost_reason: string | null;
  lost_category: LostCategory | null;
  restored_at: string | null;
  restored_by: string | null;
  restored_by_nome: string | null;
  lost_count: number;
};

const stageSchema = z.enum(ALL_STAGES_DB as unknown as [string, ...string[]]);
const riscoSchema = z.enum(["Baixo", "Médio", "Alto"]);
const tipoSchema = z.enum(["projeto", "atendimento", "instalacao"]);

export const LOST_CATEGORIES = [
  "preco",
  "prazo",
  "concorrente",
  "escopo",
  "cliente_desistiu",
  "tecnico",
  "outro",
] as const;
export type LostCategory = (typeof LOST_CATEGORIES)[number];
export const LOST_CATEGORY_LABEL: Record<LostCategory, string> = {
  preco: "Preço",
  prazo: "Prazo",
  concorrente: "Concorrente",
  escopo: "Escopo / fit técnico",
  cliente_desistiu: "Cliente desistiu",
  tecnico: "Restrição técnica",
  outro: "Outro",
};
const lostCategorySchema = z.enum(LOST_CATEGORIES);

type ProcessoRow = Database["public"]["Tables"]["processos"]["Row"];
type Sb = SupabaseClient<Database>;

async function enrichRows(
  supabase: Sb,
  rows: ProcessoRow[],
): Promise<ProcessoLite[]> {
  if (rows.length === 0) return [];
  const clienteIds = Array.from(new Set(rows.map((r) => r.cliente_id)));
  const pilarIds = Array.from(new Set(rows.map((r) => r.pilar_id)));
  const userIds = Array.from(
    new Set([
      ...pilarIds,
      ...rows.map((r) => r.lost_by).filter((v): v is string => !!v),
      ...rows.map((r) => r.restored_by).filter((v): v is string => !!v),
    ]),
  );

  const [{ data: cli }, { data: pro }] = await Promise.all([
    supabase.from("clientes").select("id, razao_social, nome_fantasia").in("id", clienteIds),
    supabase.from("profiles").select("id, full_name, email").in("id", userIds),
  ]);

  const cliMap = new Map<string, string>(
    (cli ?? []).map((c) => [c.id, c.nome_fantasia ?? c.razao_social]),
  );
  const proMap = new Map<string, string>(
    (pro ?? []).map((p) => [p.id, p.full_name ?? p.email ?? "—"]),
  );

  return rows.map((r) => ({
    id: r.id,
    codigo: r.codigo,
    titulo: r.titulo,
    tipo: ((r as unknown as { tipo?: ProcessoTipo }).tipo ?? "projeto") as ProcessoTipo,
    cliente_id: r.cliente_id,
    cliente_nome: cliMap.get(r.cliente_id) ?? "—",
    pilar_id: r.pilar_id,
    pilar_nome: proMap.get(r.pilar_id) ?? "—",
    stage: r.stage as PipelineStage,
    stage_entered_at: r.stage_entered_at,
    progresso: r.progresso,
    risco: r.risco as Risco,
    valor: r.valor as number | null,
    previsao: r.previsao,
    lost_at: r.lost_at,
    lost_by: r.lost_by,
    lost_by_nome: r.lost_by ? proMap.get(r.lost_by) ?? null : null,
    lost_reason: r.lost_reason,
    lost_category: (r.lost_category as LostCategory | null) ?? null,
    restored_at: r.restored_at,
    restored_by: r.restored_by,
    restored_by_nome: r.restored_by ? proMap.get(r.restored_by) ?? null : null,
    lost_count: r.lost_count ?? 0,
  }));
}

/* ===================== listProcessos ===================== */

const listInput = z.object({
  q: z.string().max(120).optional().default(""),
  stage: z.union([stageSchema, z.literal("todos")]).optional().default("todos"),
  risco: z.union([riscoSchema, z.literal("todos")]).optional().default("todos"),
  pilarId: z.string().uuid().or(z.literal("todos")).optional().default("todos"),
  tipo: z.union([tipoSchema, z.literal("todos")]).optional().default("todos"),
  incluirArquivados: z.boolean().optional().default(false),
  apenasArquivados: z.boolean().optional().default(false),
});

export const listProcessos = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => listInput.parse(input ?? {}))
  .handler(async ({ data, context }) => {
    let q = context.supabase
      .from("processos")
      .select("*")
      .is("deleted_at", null);
    if (data.apenasArquivados) {
      q = q.not("lost_at", "is", null);
    } else if (!data.incluirArquivados) {
      q = q.is("lost_at", null);
    }
    if (data.tipo !== "todos") q = q.eq("tipo", data.tipo as never);
    if (data.stage !== "todos") q = q.eq("stage", data.stage as never);
    if (data.risco !== "todos") q = q.eq("risco", data.risco as Risco);
    if (data.pilarId !== "todos") q = q.eq("pilar_id", data.pilarId);
    if (data.q.trim()) {
      const s = data.q.trim().replace(/[%,()]/g, "");
      q = q.or(
        [`titulo.ilike.%${s}%`, `codigo.ilike.%${s}%`].join(","),
      );
    }
    const { data: rows, error } = await q.order("codigo", { ascending: false }).limit(500);
    if (error) throw new Error(error.message);
    return enrichRows(context.supabase as unknown as Sb, (rows ?? []) as ProcessoRow[]);
  });

/* ===================== getProcessoDetalhe ===================== */

const idInput = z.object({ id: z.string().uuid() });

export const getProcessoDetalhe = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => idInput.parse(input))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("processos")
      .select("*")
      .eq("id", data.id)
      .is("deleted_at", null)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Processo não encontrado");

    const [enriched] = await enrichRows(
      context.supabase as unknown as Sb,
      [row as ProcessoRow],
    );

    const [{ data: eventos }, { data: tarefas }, { data: emails }] = await Promise.all([
      context.supabase
        .from("processo_eventos")
        .select("id, kind, text, at")
        .eq("processo_id", data.id)
        .order("at", { ascending: false })
        .limit(100),
      context.supabase
        .from("processo_tarefas")
        .select("id, titulo, pilar_id, prazo, status, created_at")
        .eq("processo_id", data.id)
        .order("created_at", { ascending: false })
        .limit(100),
      context.supabase
        .from("processo_emails")
        .select("id, to_email, subject, template, at")
        .eq("processo_id", data.id)
        .order("at", { ascending: false })
        .limit(100),
    ]);

    return {
      processo: enriched,
      eventos: eventos ?? [],
      tarefas: tarefas ?? [],
      emails: emails ?? [],
    };
  });

/* ===================== createProcesso ===================== */

const createInput = z.object({
  titulo: z.string().trim().min(1).max(255),
  cliente_id: z.string().uuid(),
  pilar_id: z.string().uuid(),
  tipo: tipoSchema.default("projeto"),
  stage: stageSchema.default("Lead"),
  risco: riscoSchema.default("Médio"),
  valor: z.number().nullable().optional(),
  previsao: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
});

export const createProcesso = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => createInput.parse(input))
  .handler(async ({ data, context }) => {
    const { data: inserted, error } = await context.supabase
      .from("processos")
      .insert({
        titulo: data.titulo,
        cliente_id: data.cliente_id,
        pilar_id: data.pilar_id,
        tipo: data.tipo,
        stage: data.stage,
        risco: data.risco,
        valor: data.valor ?? null,
        previsao: data.previsao ?? null,
        codigo: "", // trigger preenche
      } as never)
      .select("id, codigo")
      .single();
    if (error) throw new Error(error.message);

    await context.supabase.from("processo_eventos").insert({
      processo_id: inserted.id,
      kind: "created",
      text: `Processo criado no estágio ${data.stage}.`,
    } as never);

    return { id: inserted.id, codigo: inserted.codigo };
  });

/* ===================== criarProcessoDeModelo =====================
 * Cria um novo processo clonando tarefas + eventos (marco/entrega/reuniao)
 * de um processo de referência. Não copia mensagens, anexos ou audit log.
 */

const cloneInput = createInput.extend({
  modelo_id: z.string().uuid(),
});

export const criarProcessoDeModelo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => cloneInput.parse(input))
  .handler(async ({ data, context }) => {
    // 1) Cria o processo destino
    const { data: inserted, error } = await context.supabase
      .from("processos")
      .insert({
        titulo: data.titulo,
        cliente_id: data.cliente_id,
        pilar_id: data.pilar_id,
        tipo: data.tipo,
        stage: data.stage,
        risco: data.risco,
        valor: data.valor ?? null,
        previsao: data.previsao ?? null,
        codigo: "",
      } as never)
      .select("id, codigo")
      .single();
    if (error) throw new Error(error.message);
    const novoId = inserted.id as string;

    // 2) Clona tarefas (mantém títulos/prazos relativos, reseta status)
    const { data: tarefas } = await context.supabase
      .from("processo_tarefas")
      .select("titulo, prazo, pilar_id")
      .eq("processo_id", data.modelo_id);
    if (tarefas && tarefas.length) {
      await context.supabase.from("processo_tarefas").insert(
        tarefas.map((t: { titulo: string; prazo: string | null; pilar_id: string | null }) => ({
          processo_id: novoId,
          titulo: t.titulo,
          prazo: t.prazo,
          pilar_id: t.pilar_id,
          status: "aberta",
        })) as never,
      );
    }

    // 3) Não clonamos eventos: mensagens, audit e stage_change são específicos
    //    do processo original. O log de criação abaixo já sinaliza a origem.



    // 4) Log de criação a partir de modelo
    const { data: ref } = await context.supabase
      .from("processos")
      .select("codigo")
      .eq("id", data.modelo_id)
      .maybeSingle();
    await context.supabase.from("processo_eventos").insert({
      processo_id: novoId,
      kind: "created",
      text: `Processo criado a partir do modelo ${ref?.codigo ?? data.modelo_id}.`,
    } as never);

    return { id: novoId, codigo: inserted.codigo };
  });

/* ===================== listarModelosProcesso =====================
 * Lista processos existentes que podem ser usados como modelo (mesmo tipo).
 */

export const listarModelosProcesso = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ tipo: z.enum(["projeto", "atendimento", "instalacao"]) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("processos")
      .select("id, codigo, titulo, stage, cliente_id, clientes(nome_fantasia, razao_social)")
      .eq("tipo", data.tipo)
      .is("lost_at", null)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return (rows ?? []).map((r: {
      id: string;
      codigo: string;
      titulo: string;
      stage: string;
      cliente_id: string;
      clientes: { nome_fantasia: string | null; razao_social: string | null } | null;
    }) => ({
      id: r.id,
      codigo: r.codigo,
      titulo: r.titulo,
      stage: r.stage,
      cliente_nome: r.clientes?.nome_fantasia ?? r.clientes?.razao_social ?? "—",
    }));
  });



/* ===================== moveProcesso ===================== */

const moveInput = z.object({ id: z.string().uuid(), toStage: stageSchema });

export const moveProcesso = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => moveInput.parse(input))
  .handler(async ({ data, context }) => {
    const { data: before } = await context.supabase
      .from("processos")
      .select("stage, tipo")
      .eq("id", data.id)
      .maybeSingle();
    if (!before) throw new Error("Processo não encontrado");
    if (before.stage === data.toStage) return { ok: true, changed: false };

    // Gating por checklist obrigatório do estágio atual.
    const tipo = ((before as { tipo?: ProcessoTipo }).tipo ?? "projeto") as ProcessoTipo;
    const { data: required } = await context.supabase
      .from("processo_checklist_template")
      .select("id, label")
      .eq("tipo", tipo)
      .eq("stage", before.stage as never)
      .eq("obrigatorio", true)
      .eq("ativo", true);
    if (required && required.length > 0) {
      const { data: done } = await context.supabase
        .from("processo_checklist_status")
        .select("template_id, done")
        .eq("processo_id", data.id)
        .eq("done", true);
      const doneSet = new Set((done ?? []).map((d) => d.template_id));
      const pendentes = required.filter((r) => !doneSet.has(r.id));
      if (pendentes.length > 0) {
        throw new Error(
          `Checklist pendente: ${pendentes.map((p) => p.label).join(", ")}`,
        );
      }
    }

    const { error } = await context.supabase
      .from("processos")
      .update({ stage: data.toStage } as never)
      .eq("id", data.id);
    if (error) throw new Error(error.message);

    await context.supabase.from("processo_eventos").insert({
      processo_id: data.id,
      kind: "stage_change",
      text: `Estágio movido de ${before.stage} para ${data.toStage}.`,
    } as never);

    return { ok: true, changed: true };
  });

/* ===================== Checklist ===================== */

export type ChecklistItem = {
  template_id: string;
  label: string;
  descricao: string | null;
  ordem: number;
  obrigatorio: boolean;
  stage: PipelineStage;
  done: boolean;
  done_at: string | null;
  done_by: string | null;
  status_id: string | null;
  last_action_by_nome: string | null;
  last_action_at: string | null;
  last_comentario: string | null;
};

export const listChecklist = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => idInput.parse(input))
  .handler(async ({ data, context }): Promise<ChecklistItem[]> => {
    const { data: proc, error: pErr } = await context.supabase
      .from("processos")
      .select("tipo")
      .eq("id", data.id)
      .maybeSingle();
    if (pErr) throw new Error(pErr.message);
    if (!proc) return [];
    const tipo = ((proc as { tipo?: ProcessoTipo }).tipo ?? "projeto") as ProcessoTipo;
    const stages = PIPELINE_BY_TIPO[tipo] as readonly string[];

    const { data: tpls, error: tErr } = await context.supabase
      .from("processo_checklist_template")
      .select("id, stage, ordem, label, descricao, obrigatorio")
      .eq("tipo", tipo)
      .eq("ativo", true)
      .order("stage")
      .order("ordem");
    if (tErr) throw new Error(tErr.message);

    const { data: sts } = await context.supabase
      .from("processo_checklist_status")
      .select("id, template_id, done, done_at, done_by, last_action_by_nome, last_action_at, last_comentario")
      .eq("processo_id", data.id);
    const stMap = new Map((sts ?? []).map((s) => [s.template_id, s]));

    return (tpls ?? [])
      .slice()
      .sort((a, b) => {
        const ai = stages.indexOf(a.stage as string);
        const bi = stages.indexOf(b.stage as string);
        return ai - bi || a.ordem - b.ordem;
      })
      .map((t) => {
        const s = stMap.get(t.id) as
          | {
              id: string;
              done: boolean;
              done_at: string | null;
              done_by: string | null;
              last_action_by_nome: string | null;
              last_action_at: string | null;
              last_comentario: string | null;
            }
          | undefined;
        return {
          template_id: t.id,
          label: t.label,
          descricao: t.descricao,
          ordem: t.ordem,
          obrigatorio: t.obrigatorio,
          stage: t.stage as PipelineStage,
          done: s?.done ?? false,
          done_at: s?.done_at ?? null,
          done_by: s?.done_by ?? null,
          status_id: s?.id ?? null,
          last_action_by_nome: s?.last_action_by_nome ?? null,
          last_action_at: s?.last_action_at ?? null,
          last_comentario: s?.last_comentario ?? null,
        };
      });
  });

const toggleInput = z.object({
  processo_id: z.string().uuid(),
  template_id: z.string().uuid(),
  done: z.boolean(),
  comentario: z.string().max(2000).optional(),
});

export const toggleChecklistItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => toggleInput.parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("processo_checklist_status")
      .upsert(
        {
          processo_id: data.processo_id,
          template_id: data.template_id,
          done: data.done,
          done_at: data.done ? new Date().toISOString() : null,
          done_by: data.done ? context.userId : null,
          observacao: data.comentario ?? null,
        } as never,
        { onConflict: "processo_id,template_id" },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ===================== concluirTarefa ===================== */

export const concluirTarefa = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => idInput.parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("processo_tarefas")
      .update({ status: "concluida" } as never)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ===================== listPilares ===================== */

export const listPilares = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // Usuários com role sales|manager|admin (qualquer um pode ser Pilar).
    const { data: roles, error } = await context.supabase
      .from("user_roles")
      .select("user_id, role")
      .in("role", ["sales", "manager", "admin"]);
    if (error) throw new Error(error.message);
    const ids = Array.from(new Set((roles ?? []).map((r) => r.user_id)));
    if (ids.length === 0) return [];
    const { data: profs } = await context.supabase
      .from("profiles")
      .select("id, full_name, email")
      .in("id", ids);
    return (profs ?? [])
      .map((p) => ({ id: p.id, nome: p.full_name ?? p.email ?? "—" }))
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  });

/* ===================== runSlaAutomations =====================
 *
 * Varre processos visíveis ao usuário com SLA estourado. Para cada um que
 * ainda não tem tarefa SLA aberta no estágio atual, cria tarefa + e-mail +
 * notificação. Retorna o número de processos tratados.
 */

const STAGE_SLA_DAYS: Record<PipelineStage, number> = {
  Lead: 3,
  ETP: 7,
  "Orçamento": 7,
  OC: 5,
  "Eng. Mecânica": 30,
  "Eng. Elétrica": 30,
  Montagem: 45,
  FAT: 10,
  Embarque: 7,
  "Pós-venda": 30,
};

export const runSlaAutomations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: rows } = await context.supabase
      .from("processos")
      .select("id, codigo, stage, stage_entered_at, pilar_id, cliente_id")
      .is("deleted_at", null);
    const now = Date.now();
    const atrasados = (rows ?? []).filter((p) => {
      const limite = STAGE_SLA_DAYS[p.stage as PipelineStage] ?? 14;
      const dias = Math.floor((now - new Date(p.stage_entered_at).getTime()) / 86_400_000);
      return dias > limite;
    });
    if (atrasados.length === 0) return { tratados: 0 };

    // Quem já tem tarefa SLA aberta no estágio atual? checamos por titulo
    const ids = atrasados.map((p) => p.id);
    const { data: jaTem } = await context.supabase
      .from("processo_tarefas")
      .select("processo_id, titulo, status")
      .in("processo_id", ids)
      .ilike("titulo", "Follow-up SLA%")
      .eq("status", "aberta");
    const jaTemSet = new Set((jaTem ?? []).map((t) => t.processo_id));

    let tratados = 0;
    for (const p of atrasados) {
      if (jaTemSet.has(p.id)) continue;
      const prazo = new Date(now + 86_400_000).toISOString();
      await context.supabase.from("processo_tarefas").insert({
        processo_id: p.id,
        titulo: `Follow-up SLA — ${p.codigo}`,
        pilar_id: p.pilar_id,
        prazo,
      } as never);
      await context.supabase.from("processo_eventos").insert({
        processo_id: p.id,
        kind: "task_created",
        text: `Tarefa SLA gerada automaticamente (estágio ${p.stage}).`,
      } as never);
      await context.supabase.from("processo_emails").insert({
        processo_id: p.id,
        to_email: "pilar@solutek.local",
        subject: `[SLA] ${p.codigo} parado em ${p.stage}`,
        template: "sla_estourado",
      } as never);
      await context.supabase.from("processo_notificacoes").insert({
        user_id: p.pilar_id,
        processo_id: p.id,
        text: `${p.codigo} estourou SLA em ${p.stage}.`,
      } as never);
      tratados++;
    }
    return { tratados };
  });

/* ===================== Lost / Restore ===================== */

async function assertCanArchive(
  context: { supabase: Sb; userId: string },
  processoId: string,
): Promise<void> {
  const [{ data: proc }, { data: roles }] = await Promise.all([
    context.supabase
      .from("processos")
      .select("pilar_id")
      .eq("id", processoId)
      .maybeSingle(),
    context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId),
  ]);
  if (!proc) throw new Error("Processo não encontrado.");
  const isPrivileged = (roles ?? []).some(
    (r) => r.role === "admin" || r.role === "manager",
  );
  if (!isPrivileged && proc.pilar_id !== context.userId) {
    throw new Error("Apenas o pilar, manager ou admin pode arquivar/restaurar.");
  }
}

const marcarPerdidoInput = z.object({
  id: z.string().uuid(),
  reason: z.string().trim().min(10).max(500),
  category: lostCategorySchema,
});

export const marcarComoPerdido = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => marcarPerdidoInput.parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    await assertCanArchive({ supabase: sb, userId: context.userId }, data.id);

    const { data: before, error: bErr } = await sb
      .from("processos")
      .select("lost_at, lost_count, pilar_id, codigo, stage")
      .eq("id", data.id)
      .maybeSingle();
    if (bErr) throw new Error(bErr.message);
    if (!before) throw new Error("Processo não encontrado.");
    if (before.lost_at) throw new Error("Processo já está arquivado.");

    const { error } = await sb
      .from("processos")
      .update({
        lost_at: new Date().toISOString(),
        lost_by: context.userId,
        lost_reason: data.reason,
        lost_category: data.category,
        lost_count: (before.lost_count ?? 0) + 1,
        restored_at: null,
        restored_by: null,
      } as never)
      .eq("id", data.id);
    if (error) throw new Error(error.message);

    await sb.from("processo_eventos").insert({
      processo_id: data.id,
      kind: "lost",
      text: `Processo arquivado como perdido — ${LOST_CATEGORY_LABEL[data.category]}: ${data.reason}`,
    } as never);

    // Notifica pilar (se não foi quem arquivou) e managers
    const notifyIds = new Set<string>();
    if (before.pilar_id && before.pilar_id !== context.userId) notifyIds.add(before.pilar_id);
    const { data: mgrs } = await sb
      .from("user_roles")
      .select("user_id")
      .in("role", ["manager", "admin"] as never);
    for (const m of mgrs ?? []) if (m.user_id !== context.userId) notifyIds.add(m.user_id);
    for (const uid of notifyIds) {
      await sb.from("processo_notificacoes").insert({
        user_id: uid,
        processo_id: data.id,
        text: `${before.codigo} foi arquivado como perdido (${LOST_CATEGORY_LABEL[data.category]}).`,
      } as never);
    }
    return { ok: true };
  });

const restoreInput = z.object({
  id: z.string().uuid(),
  comentario: z.string().trim().max(500).optional().default(""),
});

export const restaurarProcesso = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => restoreInput.parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    await assertCanArchive({ supabase: sb, userId: context.userId }, data.id);

    const { data: before } = await sb
      .from("processos")
      .select("lost_at, pilar_id, codigo, lost_category, lost_reason")
      .eq("id", data.id)
      .maybeSingle();
    if (!before) throw new Error("Processo não encontrado.");
    if (!before.lost_at) throw new Error("Processo não está arquivado.");

    const { error } = await sb
      .from("processos")
      .update({
        lost_at: null,
        lost_by: null,
        lost_reason: null,
        lost_category: null,
        restored_at: new Date().toISOString(),
        restored_by: context.userId,
      } as never)
      .eq("id", data.id);
    if (error) throw new Error(error.message);

    const txt = data.comentario
      ? `Processo restaurado. Comentário: ${data.comentario}`
      : `Processo restaurado.`;
    await sb.from("processo_eventos").insert({
      processo_id: data.id,
      kind: "restored",
      text: txt,
    } as never);

    const notifyIds = new Set<string>();
    if (before.pilar_id && before.pilar_id !== context.userId) notifyIds.add(before.pilar_id);
    const { data: mgrs } = await sb
      .from("user_roles")
      .select("user_id")
      .in("role", ["manager", "admin"] as never);
    for (const m of mgrs ?? []) if (m.user_id !== context.userId) notifyIds.add(m.user_id);
    for (const uid of notifyIds) {
      await sb.from("processo_notificacoes").insert({
        user_id: uid,
        processo_id: data.id,
        text: `${before.codigo} foi restaurado do arquivo.`,
      } as never);
    }
    return { ok: true };
  });
