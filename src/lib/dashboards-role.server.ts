import type { SupabaseClient } from "@supabase/supabase-js";

export type ListItem = {
  id: string;
  titulo: string;
  meta: string;
  status: string;
  tone: "success" | "warning" | "danger" | "info" | "neutral";
};

export type Segment = { label: string; value: number; color: string };

export type EngineeringData = {
  kpis: { etpsAbertos: number; etapasAbertas: number; revisoes: number; atrasadas: number };
  kanban: Segment[];
  criticas: ListItem[];
};

export type ProductionData = {
  kpis: { osExecucao: number; atrasadas: number; entregasSemana: number; ncAbertas: number };
  aderencia: number;
  etapasHeat: Segment[];
  entregas: ListItem[];
};

export type AssemblyData = {
  kpis: { etapasAbertas: number; emAndamento: number; concluidas7d: number; atrasadas: number };
  progresso: { atual: number; alvo: number };
  fila: ListItem[];
};

export type PurchasingData = {
  kpis: {
    ocsAprovar: number;
    cotacoesAbertas: number;
    gastoMes: number;
    insumosAguardando: number;
  };
  ocs: ListItem[];
  cotacoes: ListItem[];
};

export type FieldData = {
  kpis: {
    satsPendentes: number;
    chamadosAbertos: number;
    slaVencendo: number;
    satsAssinados30d: number;
  };
  slaMeter: { atual: number; alvo: number };
  chamados: ListItem[];
  sats: ListItem[];
};

export type AdminData = {
  kpis: { chamadosSla: number; formulariosPendentes: number; ocsAprovar: number; erros24h: number };
  saudeGeral: number;
  modulos: Segment[];
  fila: ListItem[];
  auditoria: { id: string; actor: string; action: string; target: string; when: string }[];
};

export type RoleDashboards = {
  generatedAt: string;
  engineering: EngineeringData;
  production: ProductionData;
  assembly: AssemblyData;
  purchasing: PurchasingData;
  field: FieldData;
  admin: AdminData;
};

type SB = SupabaseClient<any, any, any>;

const DAY = 86400000;
const fmtDate = (v: string | null) =>
  v ? new Date(v).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) : "sem data";

const rel = (v: string | null) => {
  if (!v) return "—";
  const diff = Math.round((Date.now() - new Date(v).getTime()) / DAY);
  if (diff <= 0) return "hoje";
  if (diff === 1) return "ontem";
  return `há ${diff} dias`;
};

const brl = (n: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(n);

export async function buildRoleDashboards(sb: SB): Promise<RoleDashboards> {
  const now = Date.now();
  const iso = (ms: number) => new Date(ms).toISOString();
  const in7d = iso(now + 7 * DAY);
  const ago7d = iso(now - 7 * DAY);
  const ago24h = iso(now - DAY);
  const ago30d = iso(now - 30 * DAY);
  const ago72h = iso(now - 3 * DAY);
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

  const [
    etps,
    etapas,
    revisoes,
    montagens,
    rncs,
    ocs,
    cotacoes,
    insumos,
    sats,
    chamados,
    formularios,
    enrichErros,
    audit,
  ] = await Promise.all([
    sb
      .from("equipamento_etps")
      .select("id, versao, status, updated_at")
      .is("deleted_at", null)
      .limit(500),
    sb
      .from("equipamento_disciplina_etapas")
      .select("id, titulo, status, disciplina, data_vencimento, progresso, updated_at")
      .is("deleted_at", null)
      .limit(1000),
    sb
      .from("equipamento_revisoes")
      .select("id, status, updated_at")
      .is("deleted_at", null)
      .limit(500),
    sb
      .from("equipamento_montagens")
      .select("id, status, progresso, fim_previsto, fim_real, updated_at, cliente_id")
      .is("deleted_at", null)
      .limit(500),
    sb.from("fat_rnc").select("id, codigo, titulo, status, prazo").limit(500),
    sb
      .from("ordens_compra")
      .select("id, numero, status, valor_total, fornecedor_razao_social, aprovado_em, created_at")
      .is("deleted_at", null)
      .limit(500),
    sb
      .from("cotacoes")
      .select("id, codigo, titulo, status, prazo_resposta")
      .is("deleted_at", null)
      .limit(500),
    sb.from("projeto_insumos").select("id, status").is("deleted_at", null).limit(1000),
    sb
      .from("sat_relatorio")
      .select("id, codigo, status, updated_at, periodo_de")
      .is("deleted_at", null)
      .order("updated_at", { ascending: false })
      .limit(300),
    sb
      .from("chamados")
      .select(
        "id, codigo, assunto, status, prioridade, sla_resolucao_at, first_response_at, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(300),
    sb
      .from("rfq_submissao")
      .select("id, criado_em, lida_em")
      .order("criado_em", { ascending: false })
      .limit(300),
    sb.from("enrich_log").select("id").eq("success", false).gte("created_at", ago24h).limit(200),
    sb
      .from("audit_log")
      .select("id, action, table_name, record_id, created_at, user_id")
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  const rowsEtps = etps.data ?? [];
  const rowsEtapas = etapas.data ?? [];
  const rowsRevisoes = revisoes.data ?? [];
  const rowsMont = montagens.data ?? [];
  const rowsRnc = rncs.data ?? [];
  const rowsOcs = ocs.data ?? [];
  const rowsCot = cotacoes.data ?? [];
  const rowsInsumos = insumos.data ?? [];
  const rowsSats = sats.data ?? [];
  const rowsCham = chamados.data ?? [];
  const rowsForms = formularios.data ?? [];

  // ---------- Engenharia ----------
  const etpAberto = (s: string) => s === "rascunho" || s === "em_revisao";
  const etapaConcluida = (s: string) => s === "concluida" || s === "concluido";
  const etapaAtrasada = (e: any) =>
    !etapaConcluida(e.status) && e.data_vencimento && new Date(e.data_vencimento).getTime() < now;

  const engineering: EngineeringData = {
    kpis: {
      etpsAbertos: rowsEtps.filter((e: any) => etpAberto(e.status)).length,
      etapasAbertas: rowsEtapas.filter((e: any) => !etapaConcluida(e.status)).length,
      revisoes: rowsRevisoes.filter((r: any) => r.status !== "aprovada" && r.status !== "aprovado")
        .length,
      atrasadas: rowsEtapas.filter(etapaAtrasada).length,
    },
    kanban: [
      {
        label: "Rascunho",
        value: rowsEtps.filter((e: any) => e.status === "rascunho").length,
        color: "#94a3b8",
      },
      {
        label: "Em revisão",
        value: rowsEtps.filter((e: any) => e.status === "em_revisao").length,
        color: "#6366f1",
      },
      {
        label: "Aprovado",
        value: rowsEtps.filter((e: any) => e.status === "aprovado").length,
        color: "#22c55e",
      },
      {
        label: "Rejeitado",
        value: rowsEtps.filter((e: any) => e.status === "rejeitado").length,
        color: "#ef4444",
      },
    ],
    criticas: rowsEtapas
      .filter((e: any) => !etapaConcluida(e.status))
      .sort((a: any, b: any) => {
        const av = a.data_vencimento ? new Date(a.data_vencimento).getTime() : Infinity;
        const bv = b.data_vencimento ? new Date(b.data_vencimento).getTime() : Infinity;
        return av - bv;
      })
      .slice(0, 6)
      .map((e: any) => ({
        id: e.id,
        titulo: e.titulo,
        meta: `${e.disciplina ?? "—"} · vence ${fmtDate(e.data_vencimento)}`,
        status: etapaAtrasada(e)
          ? "ATRASADA"
          : e.status === "em_andamento"
            ? "EM ANDAMENTO"
            : "PENDENTE",
        tone: etapaAtrasada(e) ? "danger" : e.status === "em_andamento" ? "info" : "neutral",
      })),
  };

  // ---------- Produção ----------
  const montEmAndamento = rowsMont.filter((m: any) => m.status === "em_andamento");
  const montAtrasadas = rowsMont.filter(
    (m: any) =>
      m.status !== "concluida" && m.fim_previsto && new Date(m.fim_previsto).getTime() < now,
  );
  const concluidas = rowsMont.filter((m: any) => m.status === "concluida" && m.fim_real);
  const noPrazo = concluidas.filter(
    (m: any) =>
      !m.fim_previsto || new Date(m.fim_real).getTime() <= new Date(m.fim_previsto).getTime(),
  );

  const production: ProductionData = {
    kpis: {
      osExecucao: montEmAndamento.length,
      atrasadas: montAtrasadas.length,
      entregasSemana: rowsMont.filter(
        (m: any) => m.fim_previsto && m.fim_previsto >= iso(now) && m.fim_previsto <= in7d,
      ).length,
      ncAbertas: rowsRnc.filter((r: any) => r.status === "aberta" || r.status === "em_tratativa")
        .length,
    },
    aderencia: concluidas.length > 0 ? noPrazo.length / concluidas.length : 0,
    etapasHeat: [
      {
        label: "Não iniciada",
        value: rowsMont.filter((m: any) => m.status === "nao_iniciada").length,
        color: "#94a3b8",
      },
      { label: "Em andamento", value: montEmAndamento.length, color: "#6366f1" },
      {
        label: "Bloqueada",
        value: rowsMont.filter((m: any) => m.status === "bloqueada").length,
        color: "#f59e0b",
      },
      {
        label: "Concluída",
        value: rowsMont.filter((m: any) => m.status === "concluida").length,
        color: "#22c55e",
      },
    ],
    entregas: rowsMont
      .filter((m: any) => m.status !== "concluida")
      .sort((a: any, b: any) => {
        const av = a.fim_previsto ? new Date(a.fim_previsto).getTime() : Infinity;
        const bv = b.fim_previsto ? new Date(b.fim_previsto).getTime() : Infinity;
        return av - bv;
      })
      .slice(0, 6)
      .map((m: any) => {
        const atrasada = m.fim_previsto && new Date(m.fim_previsto).getTime() < now;
        return {
          id: m.id,
          titulo: `Montagem ${m.id.slice(0, 8)}`,
          meta: `Previsão ${fmtDate(m.fim_previsto)} · ${m.progresso ?? 0}%`,
          status: atrasada ? "ATRASADO" : m.status === "bloqueada" ? "BLOQUEADO" : "NO PRAZO",
          tone: (atrasada
            ? "danger"
            : m.status === "bloqueada"
              ? "warning"
              : "success") as ListItem["tone"],
        };
      }),
  };

  // ---------- Montagem ----------
  const etapasAbertas = rowsEtapas.filter((e: any) => !etapaConcluida(e.status));
  const etapasConcluidas7d = rowsEtapas.filter(
    (e: any) => etapaConcluida(e.status) && e.updated_at && e.updated_at >= ago7d,
  );
  const assembly: AssemblyData = {
    kpis: {
      etapasAbertas: etapasAbertas.length,
      emAndamento: rowsEtapas.filter(
        (e: any) => e.status === "em_andamento" || e.status === "em_progresso",
      ).length,
      concluidas7d: etapasConcluidas7d.length,
      atrasadas: rowsEtapas.filter(etapaAtrasada).length,
    },
    progresso: {
      atual: rowsEtapas.filter(etapaConcluidaRow).length,
      alvo: rowsEtapas.length,
    },
    fila: etapasAbertas.slice(0, 6).map((e: any) => ({
      id: e.id,
      titulo: e.titulo,
      meta: `${e.disciplina ?? "—"} · ${e.progresso ?? 0}%`,
      status: etapaAtrasada(e)
        ? "ATRASADO"
        : e.status === "em_andamento"
          ? "EM ANDAMENTO"
          : "PRÓXIMA",
      tone: (etapaAtrasada(e)
        ? "danger"
        : e.status === "em_andamento"
          ? "info"
          : "neutral") as ListItem["tone"],
    })),
  };

  function etapaConcluidaRow(e: any) {
    return etapaConcluida(e.status);
  }

  // ---------- Compras ----------
  const ocsAprovar = rowsOcs.filter((o: any) => o.status === "aguardando_aprovacao");
  const purchasing: PurchasingData = {
    kpis: {
      ocsAprovar: ocsAprovar.length,
      cotacoesAbertas: rowsCot.filter(
        (c: any) => c.status === "aberta" || c.status === "respondida",
      ).length,
      gastoMes: rowsOcs
        .filter(
          (o: any) => (o.aprovado_em ?? o.created_at) >= monthStart && o.status !== "cancelada",
        )
        .reduce((s: number, o: any) => s + Number(o.valor_total ?? 0), 0),
      insumosAguardando: rowsInsumos.filter(
        (i: any) => i.status === "pronto_aprovacao" || i.status === "em_cotacao",
      ).length,
    },
    ocs: ocsAprovar.slice(0, 6).map((o: any) => ({
      id: o.id,
      titulo: `OC ${o.numero ?? o.id.slice(0, 8)}`,
      meta: `${brl(Number(o.valor_total ?? 0))} · ${o.fornecedor_razao_social ?? "sem fornecedor"}`,
      status: "APROVAR",
      tone: "warning" as const,
    })),
    cotacoes: rowsCot
      .filter((c: any) => c.status === "aberta" || c.status === "respondida")
      .slice(0, 6)
      .map((c: any) => ({
        id: c.id,
        titulo: `${c.codigo ?? "Cotação"} · ${c.titulo ?? ""}`.trim(),
        meta: `Prazo ${fmtDate(c.prazo_resposta)}`,
        status: c.status === "respondida" ? "REVISAR" : "EM COTAÇÃO",
        tone: (c.status === "respondida" ? "info" : "neutral") as ListItem["tone"],
      })),
  };

  // ---------- Campo / pós-venda ----------
  const chamadosAbertos = rowsCham.filter(
    (c: any) => c.status !== "resolvido" && c.status !== "arquivado",
  );
  const slaVencendo = chamadosAbertos.filter(
    (c: any) => c.sla_resolucao_at && new Date(c.sla_resolucao_at).getTime() - now < DAY,
  );
  const chamados30d = rowsCham.filter((c: any) => c.created_at >= ago30d);
  const dentroSla = chamados30d.filter(
    (c: any) =>
      !c.sla_resolucao_at || (c.first_response_at && c.first_response_at <= c.sla_resolucao_at),
  );

  const field: FieldData = {
    kpis: {
      satsPendentes: rowsSats.filter(
        (s: any) => s.status === "rascunho" || s.status === "preenchendo",
      ).length,
      chamadosAbertos: chamadosAbertos.length,
      slaVencendo: slaVencendo.length,
      satsAssinados30d: rowsSats.filter(
        (s: any) => s.status === "assinado" && s.updated_at >= ago30d,
      ).length,
    },
    slaMeter: {
      atual: chamados30d.length > 0 ? Math.round((dentroSla.length / chamados30d.length) * 100) : 0,
      alvo: 95,
    },
    chamados: chamadosAbertos.slice(0, 6).map((c: any) => ({
      id: c.id,
      titulo: `${c.codigo ?? "Chamado"} · ${c.assunto ?? "sem assunto"}`,
      meta: `${c.prioridade ?? "—"} · aberto ${rel(c.created_at)}`,
      status:
        c.prioridade === "critica" ? "CRÍTICO" : c.status === "aberto" ? "ABERTO" : "EM ANÁLISE",
      tone: (c.prioridade === "critica" ? "danger" : "info") as ListItem["tone"],
    })),
    sats: rowsSats
      .filter((s: any) => s.status === "rascunho" || s.status === "preenchendo")
      .slice(0, 6)
      .map((s: any) => ({
        id: s.id,
        titulo: `SAT ${s.codigo ?? s.id.slice(0, 8)}`,
        meta: `Atualizado ${rel(s.updated_at)}`,
        status: s.status === "preenchendo" ? "PREENCHENDO" : "RASCUNHO",
        tone: (s.status === "preenchendo" ? "info" : "neutral") as ListItem["tone"],
      })),
  };

  // ---------- Administração ----------
  const foraSla = chamadosAbertos.filter(
    (c: any) => c.sla_resolucao_at && new Date(c.sla_resolucao_at).getTime() < now,
  );
  const formsPendentes = rowsForms.filter((f: any) => !f.lida_em && f.criado_em <= ago72h);
  const erros24h = enrichErros.data?.length ?? 0;

  const pendComercial = formsPendentes.length;
  const pendEngenharia = engineering.kpis.etpsAbertos + engineering.kpis.atrasadas;
  const pendProducao = production.kpis.atrasadas + production.kpis.ncAbertas;
  const pendCompras = purchasing.kpis.ocsAprovar + purchasing.kpis.insumosAguardando;
  const pendPos = chamadosAbertos.length + field.kpis.satsPendentes;
  const totalPend = pendComercial + pendEngenharia + pendProducao + pendCompras + pendPos;
  const criticos = foraSla.length + production.kpis.atrasadas + engineering.kpis.atrasadas;

  const admin: AdminData = {
    kpis: {
      chamadosSla: foraSla.length,
      formulariosPendentes: formsPendentes.length,
      ocsAprovar: purchasing.kpis.ocsAprovar,
      erros24h,
    },
    saudeGeral: totalPend === 0 ? 1 : Math.max(0, 1 - criticos / Math.max(totalPend, 1)),
    modulos: [
      { label: "Comercial", value: pendComercial, color: "#22c55e" },
      { label: "Engenharia", value: pendEngenharia, color: "#6366f1" },
      { label: "Produção", value: pendProducao, color: "#f59e0b" },
      { label: "Compras", value: pendCompras, color: "#0ea5e9" },
      { label: "Pós-vendas", value: pendPos, color: "#ef4444" },
    ],
    fila: [
      {
        id: "sla",
        titulo: "Chamados fora do SLA",
        meta: "Pós-vendas / Suporte",
        status: foraSla.length > 0 ? "CRÍTICO" : "OK",
        tone: (foraSla.length > 0 ? "danger" : "success") as ListItem["tone"],
      },
      {
        id: "forms",
        titulo: "Formulários públicos sem leitura (> 72h)",
        meta: `${formsPendentes.length} pendente(s)`,
        status: formsPendentes.length > 0 ? "ATENÇÃO" : "OK",
        tone: (formsPendentes.length > 0 ? "warning" : "success") as ListItem["tone"],
      },
      {
        id: "ocs",
        titulo: "Ordens de compra aguardando aprovação",
        meta: `${purchasing.kpis.ocsAprovar} na fila`,
        status: purchasing.kpis.ocsAprovar > 0 ? "FILA" : "OK",
        tone: (purchasing.kpis.ocsAprovar > 0 ? "info" : "success") as ListItem["tone"],
      },
      {
        id: "etapas",
        titulo: "Etapas de engenharia atrasadas",
        meta: `${engineering.kpis.atrasadas} etapa(s)`,
        status: engineering.kpis.atrasadas > 0 ? "REVISÃO" : "OK",
        tone: (engineering.kpis.atrasadas > 0 ? "warning" : "success") as ListItem["tone"],
      },
    ],
    auditoria: (audit.data ?? []).map((a: any) => ({
      id: a.id,
      actor: a.user_id ? "Usuário do sistema" : "Sistema",
      action: a.action === "INSERT" ? "criou" : a.action === "UPDATE" ? "atualizou" : "removeu",
      target: `${a.table_name} ${String(a.record_id ?? "").slice(0, 8)}`,
      when: rel(a.created_at),
    })),
  };

  return {
    generatedAt: new Date().toISOString(),
    engineering,
    production,
    assembly,
    purchasing,
    field,
    admin,
  };
}
