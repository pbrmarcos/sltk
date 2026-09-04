import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type PipelineStageKey = "novo" | "qualificado" | "proposta" | "negociacao" | "ganho" | "perdido";
export type ProcessoStageKey =
  | "ETP" | "Orçamento" | "OC" | "Eng. Mecânica" | "Eng. Elétrica"
  | "Montagem" | "FAT" | "Embarque" | "Pós-venda";
export type SatStatusKey = "rascunho" | "preenchendo" | "assinado" | "arquivado";

export type DashboardData = {
  generatedAt: string;
  kpis: {
    pipelineValor: number;
    pipelineCount: number;
    winRate: number;          // 0..1
    winRateDelta: number;     // pp
    ticketMedio: number;
    ticketMedioDelta: number; // %
    cicloMedioDias: number;
    cicloMedioDelta: number;  // %
    ganhoMes: number;
    ganhoMesDelta: number;    // %
  };
  funnel: { stage: PipelineStageKey; count: number; valor: number }[];
  revenueByMonth: { month: string; valor: number; count: number }[];
  hotOpportunities: {
    id: string;
    codigo: string | null;
    titulo: string;
    cliente: string | null;
    valor: number | null;
    probabilidade: number;
    stage: PipelineStageKey;
    expectedClose: string | null;
  }[];
  processosByStage: { stage: ProcessoStageKey; count: number }[];
  processosRisco: { Baixo: number; Médio: number; Alto: number };
  processosSlaRisk: {
    id: string;
    codigo: string;
    titulo: string;
    cliente: string | null;
    stage: ProcessoStageKey;
    risco: "Baixo" | "Médio" | "Alto";
    progresso: number;
    previsao: string | null;
    diasNaEtapa: number;
    diasParaPrevisao: number | null;
  }[];
  satByStatus: Record<SatStatusKey, number>;
  recentSats: {
    id: string;
    codigo: string;
    cliente: string | null;
    status: SatStatusKey;
    updatedAt: string;
  }[];
  upcomingTasks: {
    id: string;
    titulo: string;
    prazo: string;
    processoCodigo: string | null;
    cliente: string | null;
  }[];
  clientesAtivos: number;
  oportunidadesAbertas: number;
};

export const getManagerDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<DashboardData> => {
    const sb = context.supabase;
    const now = new Date();
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 86400000).toISOString();
    const oneEightyDaysAgo = new Date(now.getTime() - 180 * 86400000).toISOString();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();

    const [
      oppsAllRes,
      oppsHotRes,
      processosRes,
      satRes,
      tarefasRes,
      clientesAtivosRes,
    ] = await Promise.all([
      sb.from("oportunidades")
        .select("id, codigo, titulo, valor_estimado, probabilidade, pipeline_stage, expected_close_date, created_at, updated_at, lost_at, stage_entered_at, cliente_id, clientes(nome_fantasia, razao_social)")
        .is("deleted_at", null)
        .gte("created_at", oneEightyDaysAgo)
        .limit(1000),
      sb.from("oportunidades")
        .select("id, codigo, titulo, valor_estimado, probabilidade, pipeline_stage, expected_close_date, cliente_id, clientes(nome_fantasia, razao_social)")
        .is("deleted_at", null)
        .in("pipeline_stage", ["proposta", "negociacao"])
        .order("expected_close_date", { ascending: true, nullsFirst: false })
        .limit(8),
      sb.from("processos")
        .select("id, codigo, titulo, stage, stage_entered_at, progresso, risco, previsao, cliente_id, clientes(nome_fantasia, razao_social)")
        .is("deleted_at", null)
        .is("lost_at", null)
        .limit(500),
      sb.from("sat_relatorio")
        .select("id, codigo, status, updated_at, cliente_id, clientes(nome_fantasia, razao_social)")
        .is("deleted_at", null)
        .order("updated_at", { ascending: false })
        .limit(200),
      sb.from("processo_tarefas")
        .select("id, titulo, prazo, processo_id, processos(codigo, cliente_id, clientes(nome_fantasia, razao_social))")
        .eq("status", "aberta")
        .order("prazo", { ascending: true })
        .limit(7),
      sb.from("clientes").select("id", { count: "exact", head: true }).is("deleted_at", null).eq("status", "ativo"),
    ]);

    const opps = oppsAllRes.data ?? [];
    const processos = processosRes.data ?? [];
    const sats = satRes.data ?? [];
    const tarefas = tarefasRes.data ?? [];

    // Funnel — last 90d
    const stages: PipelineStageKey[] = ["novo", "qualificado", "proposta", "negociacao", "ganho", "perdido"];
    const funnel = stages.map((stage) => {
      const items = opps.filter((o) => o.pipeline_stage === stage && new Date(o.created_at) >= new Date(ninetyDaysAgo));
      return {
        stage,
        count: items.length,
        valor: items.reduce((s, i) => s + Number(i.valor_estimado ?? 0), 0),
      };
    });

    const pipelineOpen = opps.filter((o) =>
      !["ganho", "perdido"].includes(o.pipeline_stage as string)
    );
    const pipelineValor = pipelineOpen.reduce((s, o) => s + Number(o.valor_estimado ?? 0), 0);
    const pipelineCount = pipelineOpen.length;

    // Win rate — current 90d vs previous 90d
    const wrCurrent = winRate(opps, ninetyDaysAgo, new Date().toISOString());
    const wrPrev = winRate(opps, oneEightyDaysAgo, ninetyDaysAgo);
    const winR = wrCurrent.rate;
    const winRDelta = (wrCurrent.rate - wrPrev.rate) * 100; // pp

    // Ticket médio (ganhos últimos 90d) vs prev
    const tCurr = avgTicket(opps, ninetyDaysAgo, new Date().toISOString());
    const tPrev = avgTicket(opps, oneEightyDaysAgo, ninetyDaysAgo);
    const ticketDelta = tPrev > 0 ? ((tCurr - tPrev) / tPrev) * 100 : 0;

    // Ciclo médio (ganhos com created_at conhecido)
    const cCurr = avgCycle(opps, ninetyDaysAgo, new Date().toISOString());
    const cPrev = avgCycle(opps, oneEightyDaysAgo, ninetyDaysAgo);
    const cicloDelta = cPrev > 0 ? ((cCurr - cPrev) / cPrev) * 100 : 0;

    // Receita ganha por mês (últimos 6 meses)
    const monthMap = new Map<string, { valor: number; count: number }>();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      monthMap.set(monthKey(d), { valor: 0, count: 0 });
    }
    opps.forEach((o) => {
      if (o.pipeline_stage !== "ganho" || !o.lost_at && !o.updated_at) return;
      if (o.pipeline_stage !== "ganho") return;
      const ref = o.updated_at ? new Date(o.updated_at) : null;
      if (!ref || ref < new Date(sixMonthsAgo)) return;
      const k = monthKey(ref);
      const e = monthMap.get(k);
      if (e) { e.valor += Number(o.valor_estimado ?? 0); e.count += 1; }
    });
    const revenueByMonth = Array.from(monthMap.entries()).map(([month, v]) => ({ month, ...v }));

    const ganhoMesCurr = revenueByMonth[revenueByMonth.length - 1]?.valor ?? 0;
    const ganhoMesPrev = revenueByMonth[revenueByMonth.length - 2]?.valor ?? 0;
    const ganhoMesDelta = ganhoMesPrev > 0 ? ((ganhoMesCurr - ganhoMesPrev) / ganhoMesPrev) * 100 : 0;

    const hotOpportunities = (oppsHotRes.data ?? []).map((o: any) => ({
      id: o.id,
      codigo: o.codigo,
      titulo: o.titulo,
      cliente: o.clientes?.nome_fantasia ?? o.clientes?.razao_social ?? null,
      valor: o.valor_estimado,
      probabilidade: o.probabilidade ?? 0,
      stage: o.pipeline_stage as PipelineStageKey,
      expectedClose: o.expected_close_date,
    }));

    // Processos
    const procStagesAll: ProcessoStageKey[] = ["ETP","Orçamento","OC","Eng. Mecânica","Eng. Elétrica","Montagem","FAT","Embarque","Pós-venda"];
    const procStageCount = new Map<ProcessoStageKey, number>(procStagesAll.map(s => [s, 0]));
    const risco = { Baixo: 0, Médio: 0, Alto: 0 };
    processos.forEach((p) => {
      const s = p.stage as ProcessoStageKey;
      procStageCount.set(s, (procStageCount.get(s) ?? 0) + 1);
      const r = p.risco as keyof typeof risco;
      if (r in risco) risco[r] += 1;
    });
    const processosByStage = procStagesAll.map((s) => ({ stage: s, count: procStageCount.get(s) ?? 0 }));

    const processosSlaRisk = processos
      .map((p: any) => {
        const diasNaEtapa = Math.floor((Date.now() - new Date(p.stage_entered_at).getTime()) / 86400000);
        const diasParaPrev = p.previsao
          ? Math.floor((new Date(p.previsao).getTime() - Date.now()) / 86400000)
          : null;
        const score =
          (p.risco === "Alto" ? 3 : p.risco === "Médio" ? 1.5 : 0) +
          (diasParaPrev !== null && diasParaPrev < 0 ? 4 : diasParaPrev !== null && diasParaPrev < 7 ? 2 : 0) +
          (diasNaEtapa > 30 ? 2 : diasNaEtapa > 14 ? 1 : 0);
        return {
          id: p.id,
          codigo: p.codigo,
          titulo: p.titulo,
          cliente: p.clientes?.nome_fantasia ?? p.clientes?.razao_social ?? null,
          stage: p.stage as ProcessoStageKey,
          risco: p.risco,
          progresso: p.progresso,
          previsao: p.previsao,
          diasNaEtapa,
          diasParaPrevisao: diasParaPrev,
          score,
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 8)
      .map(({ score, ...r }) => r);

    // SAT
    const satByStatus: Record<SatStatusKey, number> = { rascunho: 0, preenchendo: 0, assinado: 0, arquivado: 0 };
    sats.forEach((s) => {
      const st = s.status as SatStatusKey;
      if (st in satByStatus) satByStatus[st] += 1;
    });
    const recentSats = sats.slice(0, 5).map((s: any) => ({
      id: s.id,
      codigo: s.codigo,
      cliente: s.clientes?.nome_fantasia ?? s.clientes?.razao_social ?? null,
      status: s.status as SatStatusKey,
      updatedAt: s.updated_at,
    }));

    const upcomingTasks = tarefas.map((t: any) => ({
      id: t.id,
      titulo: t.titulo,
      prazo: t.prazo,
      processoCodigo: t.processos?.codigo ?? null,
      cliente: t.processos?.clientes?.nome_fantasia ?? t.processos?.clientes?.razao_social ?? null,
    }));

    return {
      generatedAt: new Date().toISOString(),
      kpis: {
        pipelineValor,
        pipelineCount,
        winRate: winR,
        winRateDelta: winRDelta,
        ticketMedio: tCurr,
        ticketMedioDelta: ticketDelta,
        cicloMedioDias: cCurr,
        cicloMedioDelta: cicloDelta,
        ganhoMes: ganhoMesCurr,
        ganhoMesDelta,
      },
      funnel,
      revenueByMonth,
      hotOpportunities,
      processosByStage,
      processosRisco: risco,
      processosSlaRisk,
      satByStatus,
      recentSats,
      upcomingTasks,
      clientesAtivos: clientesAtivosRes.count ?? 0,
      oportunidadesAbertas: pipelineCount,
    };
  });

function winRate(opps: any[], from: string, to: string) {
  const closed = opps.filter((o) =>
    (o.pipeline_stage === "ganho" || o.pipeline_stage === "perdido") &&
    o.updated_at >= from && o.updated_at < to
  );
  const wins = closed.filter((o) => o.pipeline_stage === "ganho").length;
  const rate = closed.length > 0 ? wins / closed.length : 0;
  return { wins, total: closed.length, rate };
}
function avgTicket(opps: any[], from: string, to: string) {
  const wins = opps.filter((o) => o.pipeline_stage === "ganho" && o.updated_at >= from && o.updated_at < to);
  if (wins.length === 0) return 0;
  return wins.reduce((s, o) => s + Number(o.valor_estimado ?? 0), 0) / wins.length;
}
function avgCycle(opps: any[], from: string, to: string) {
  const wins = opps.filter((o) =>
    o.pipeline_stage === "ganho" && o.updated_at >= from && o.updated_at < to && o.created_at
  );
  if (wins.length === 0) return 0;
  const days = wins.map((o) => (new Date(o.updated_at).getTime() - new Date(o.created_at).getTime()) / 86400000);
  return days.reduce((a, b) => a + b, 0) / days.length;
}
function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Painéis por papel (engenharia, produção, montagem, compras, campo, admin) com dados reais. */
export const getRoleDashboards = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { buildRoleDashboards } = await import("@/lib/dashboards-role.server");
    return buildRoleDashboards(context.supabase as never);
  });
