import { createServerFn } from "@tanstack/react-start";
import { friendlyDbError } from "@/lib/db-errors";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import ExcelJS from "exceljs";

type AnySb = any;

const DISCIPLINAS_IMPORT = ["engenharia", "automacao", "planejamento", "producao", "qualidade"] as const;
type DiscImport = (typeof DISCIPLINAS_IMPORT)[number];

const STATUS = ["nao_iniciado", "em_progresso", "bloqueado", "concluido"] as const;
const PRIOS = ["baixa", "media", "alta", "urgente"] as const;

const ETAPAS_COLS = ["codigo", "ordem", "titulo", "descricao", "status", "prioridade", "data_vencimento", "responsavel_nome"];

async function assertEmPlanejamento(sb: AnySb, equipamentoId: string): Promise<{ codigo: string | null; modelo: string }> {
  const { data, error } = await sb
    .from("cliente_equipamentos")
    .select("status, codigo, modelo")
    .eq("id", equipamentoId)
    .maybeSingle();
  if (error) throw friendlyDbError(error);
  if (!data) throw new Error("Equipamento não encontrado");
  if (data.status !== "planejamento") {
    throw new Error("Import/edição em bloco disponível somente durante a fase de planejamento.");
  }
  return { codigo: data.codigo, modelo: data.modelo };
}

async function userNome(sb: AnySb, uid: string) {
  const { data } = await sb.from("profiles").select("full_name, email").eq("id", uid).maybeSingle();
  return data?.full_name ?? data?.email ?? "Usuário";
}

async function log(sb: AnySb, uid: string, entry: {
  equipamento_id: string;
  tipo: string;
  disciplina?: string | null;
  descricao: string;
  diff?: unknown;
  arquivo_nome?: string | null;
}) {
  const nome = await userNome(sb, uid);
  await sb.from("equipamento_import_historico").insert({
    equipamento_id: entry.equipamento_id,
    tipo: entry.tipo,
    disciplina: entry.disciplina ?? null,
    user_id: uid,
    user_nome: nome,
    descricao: entry.descricao,
    diff: entry.diff ?? {},
    arquivo_nome: entry.arquivo_nome ?? null,
  });
}

// =================== EXPORT ===================
export const exportEquipamentoDisciplinaXlsx = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({
      equipamentoId: z.string().uuid(),
      disciplina: z.enum(DISCIPLINAS_IMPORT),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase as AnySb;
    const info = await assertEmPlanejamento(sb, data.equipamentoId);

    const { data: rows, error } = await sb
      .from("equipamento_disciplina_etapas")
      .select("codigo, ordem, titulo, descricao, status, prioridade, data_vencimento, responsavel_nome")
      .eq("equipamento_id", data.equipamentoId)
      .eq("disciplina", data.disciplina)
      .is("deleted_at", null)
      .order("ordem", { ascending: true });
    if (error) throw friendlyDbError(error);

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Etapas");
    ws.columns = ETAPAS_COLS.map((k) => ({
      header: k,
      key: k,
      width: k === "titulo" || k === "descricao" ? 40 : 16,
    }));
    ws.getRow(1).font = { bold: true };
    ws.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEEEEEE" } };
    ws.views = [{ state: "frozen", ySplit: 1 }];

    for (const r of rows ?? []) ws.addRow(r);

    // dropdowns
    const nMax = Math.max(500, (rows?.length ?? 0) + 100);
    const addList = (col: string, values: readonly string[]) => {
      const range = `${col}2:${col}${nMax}`;
      ((ws as any).dataValidations).add(range, {
        type: "list",
        allowBlank: true,
        formulae: [`"${values.join(",")}"`],
      });
    };
    addList("E", STATUS);
    addList("F", PRIOS);

    // Aba de instruções
    const wsI = wb.addWorksheet("Instruções");
    wsI.getColumn(1).width = 120;
    const lines = [
      `Equipamento: ${info.codigo ?? "—"} · ${info.modelo}`,
      `Disciplina: ${data.disciplina}`,
      "",
      "1) O 'codigo' é gerado automaticamente. Se deixar em branco, uma nova etapa será criada.",
      "2) Para atualizar uma etapa existente, mantenha o 'codigo' original.",
      "3) Para remover uma etapa: apague a linha inteira e marque em 'observacoes' na tela do sistema.",
      "4) Colunas com dropdown: status, prioridade.",
      "",
      `status válidos: ${STATUS.join(", ")}`,
      `prioridade válidas: ${PRIOS.join(", ")}`,
      "",
      "Só é possível importar durante a fase de planejamento do equipamento.",
    ];
    lines.forEach((l) => wsI.addRow([l]));

    const buf = (await wb.xlsx.writeBuffer()) as ArrayBuffer;
    const b64 = Buffer.from(buf).toString("base64");

    await log(sb, context.userId, {
      equipamento_id: data.equipamentoId,
      tipo: "export_excel",
      disciplina: data.disciplina,
      descricao: `Baixou template de ${data.disciplina} (${rows?.length ?? 0} etapas)`,
    });

    return {
      base64: b64,
      filename: `etapas_${(info.codigo ?? "eq").replace(/[^a-zA-Z0-9-_]/g, "_")}_${data.disciplina}.xlsx`,
    };
  });

// =================== APPLY ===================
const rowSchema = z.object({
  codigo: z.string().nullable().optional(),
  ordem: z.number().int().nullable().optional(),
  titulo: z.string().min(1).max(200),
  descricao: z.string().nullable().optional(),
  status: z.enum(STATUS).nullable().optional(),
  prioridade: z.enum(PRIOS).nullable().optional(),
  data_vencimento: z.string().nullable().optional(),
  responsavel_nome: z.string().nullable().optional(),
});

export const applyEquipamentoDisciplinaExcel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({
      equipamentoId: z.string().uuid(),
      disciplina: z.enum(DISCIPLINAS_IMPORT),
      rows: z.array(rowSchema).max(500),
      arquivoNome: z.string().max(200).nullable().optional(),
      dryRun: z.boolean().default(false),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase as AnySb;
    await assertEmPlanejamento(sb, data.equipamentoId);

    const { data: existing, error: exErr } = await sb
      .from("equipamento_disciplina_etapas")
      .select("id, codigo, ordem, titulo, descricao, status, prioridade, data_vencimento, responsavel_nome")
      .eq("equipamento_id", data.equipamentoId)
      .eq("disciplina", data.disciplina)
      .is("deleted_at", null);
    if (exErr) throw friendlyDbError(exErr);

    const byCode = new Map<string, any>();
    for (const r of existing ?? []) if (r.codigo) byCode.set(r.codigo, r);

    const seenCodes = new Set<string>();
    const added: any[] = [];
    const updated: any[] = [];

    for (let i = 0; i < data.rows.length; i++) {
      const r = data.rows[i];
      const codigo = r.codigo?.trim() || null;
      const ordem = r.ordem ?? i + 1;
      const payload: Record<string, any> = {
        titulo: r.titulo,
        descricao: r.descricao ?? null,
        status: r.status ?? "nao_iniciado",
        prioridade: r.prioridade ?? "media",
        data_vencimento: r.data_vencimento || null,
        responsavel_nome: r.responsavel_nome ?? null,
        ordem,
      };
      if (codigo && byCode.has(codigo)) {
        if (seenCodes.has(codigo)) throw new Error(`Código duplicado na planilha: ${codigo}`);
        seenCodes.add(codigo);
        const cur = byCode.get(codigo);
        const changed: Record<string, [any, any]> = {};
        for (const k of Object.keys(payload)) {
          if ((cur as any)[k] !== payload[k]) changed[k] = [(cur as any)[k], payload[k]];
        }
        if (Object.keys(changed).length > 0) updated.push({ id: cur.id, codigo, changed, payload });
      } else {
        added.push({ codigo, payload });
      }
    }

    // etapas existentes que não vieram na planilha → removidas (soft delete)
    const removed = (existing ?? []).filter((r: any) => r.codigo && !data.rows.some((row) => row.codigo?.trim() === r.codigo));

    const diff = {
      added: added.map((a) => ({ codigo: a.codigo, titulo: a.payload.titulo })),
      updated: updated.map((u) => ({ codigo: u.codigo, changed: Object.keys(u.changed) })),
      removed: removed.map((r: any) => ({ codigo: r.codigo, titulo: r.titulo })),
    };

    if (data.dryRun) {
      return { ok: true, diff };
    }

    for (const u of updated) {
      const { error } = await sb
        .from("equipamento_disciplina_etapas")
        .update({ ...u.payload, updated_by: context.userId })
        .eq("id", u.id);
      if (error) throw friendlyDbError(error);
    }
    for (const a of added) {
      const { error } = await sb
        .from("equipamento_disciplina_etapas")
        .insert({
          equipamento_id: data.equipamentoId,
          disciplina: data.disciplina,
          titulo: a.payload.titulo,
          descricao: a.payload.descricao,
          status: a.payload.status,
          prioridade: a.payload.prioridade,
          data_vencimento: a.payload.data_vencimento,
          responsavel_nome: a.payload.responsavel_nome,
          ordem: a.payload.ordem,
          created_by: context.userId,
          updated_by: context.userId,
        });
      if (error) throw friendlyDbError(error);
    }
    for (const r of removed) {
      const { error } = await sb
        .from("equipamento_disciplina_etapas")
        .update({ deleted_at: new Date().toISOString(), updated_by: context.userId })
        .eq("id", (r as any).id);
      if (error) throw friendlyDbError(error);
    }

    const descricao = `Importou Excel de ${data.disciplina}: ${added.length} novas, ${updated.length} atualizadas, ${removed.length} removidas`;
    await log(sb, context.userId, {
      equipamento_id: data.equipamentoId,
      tipo: "import_excel",
      disciplina: data.disciplina,
      descricao,
      diff,
      arquivo_nome: data.arquivoNome ?? null,
    });

    return { ok: true, diff };
  });

// =================== LOG (manual edit) ===================
export const logEdicaoManualEtapa = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({
      equipamentoId: z.string().uuid(),
      disciplina: z.string().max(40).nullable().optional(),
      descricao: z.string().min(1).max(500),
      diff: z.record(z.string(), z.any()).optional(),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase as AnySb;
    await log(sb, context.userId, {
      equipamento_id: data.equipamentoId,
      tipo: "edicao_manual",
      disciplina: data.disciplina ?? null,
      descricao: data.descricao,
      diff: data.diff ?? {},
    });
    return { ok: true };
  });

// =================== HISTORICO ===================
export const listHistoricoEquipamento = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({
      equipamentoId: z.string().uuid(),
      disciplina: z.string().nullable().optional(),
      tipo: z.string().nullable().optional(),
      limit: z.number().int().min(1).max(500).default(200),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase as AnySb;
    let q = sb
      .from("equipamento_import_historico")
      .select("id, tipo, disciplina, user_id, user_nome, descricao, diff, arquivo_nome, created_at")
      .eq("equipamento_id", data.equipamentoId)
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (data.disciplina) q = q.eq("disciplina", data.disciplina);
    if (data.tipo) q = q.eq("tipo", data.tipo);
    const { data: rows, error } = await q;
    if (error) throw friendlyDbError(error);
    return rows ?? [];
  });

export const isEquipamentoEmPlanejamento = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ equipamentoId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as AnySb;
    const { data: r } = await sb
      .from("cliente_equipamentos")
      .select("status")
      .eq("id", data.equipamentoId)
      .maybeSingle();
    return { emPlanejamento: r?.status === "planejamento", status: r?.status ?? null };
  });
