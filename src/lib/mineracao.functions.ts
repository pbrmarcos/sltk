import { createServerFn } from "@tanstack/react-start";
import { friendlyDbError } from "@/lib/db-errors";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAdminOrManager as assertAdmin, hasAnyRole } from "@/lib/admin-guard";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  COL_CONTRA,
  COL_EMPRESA,
  COL_PERIODO,
  COL_RUBRO,
  COL_VALOR,
  indexOfColumn,
  parseNumero,
  parseTexto,
  pickColumn,
  type PentaColuna,
} from "@/lib/mineracao/mapear";


/**
 * As tabelas de mineração ainda não constam nos tipos gerados do Supabase.
 * Usamos um cliente sem tipagem de schema apenas para elas.
 */
type AnyDb = SupabaseClient<any, "public", any>;
const anyDb = (c: unknown) => c as AnyDb;

export type MineracaoConfig = {
  api_base_url: string;
  usuario: string | null;
  senha_definida: boolean;
  pais_padrao: string | null;
  delay_ms: number;
  limite_consultas_dia: number;
  limite_bases: number;
  limite_bases_premium: number;
  limite_rubros: number;
  limite_empresas: number;
  updated_at: string | null;
};

async function assertComercial(supabase: AnyDb, userId: string) {
  const ok = await hasAnyRole(supabase, userId, ["admin", "manager", "sales"]);
  if (!ok) throw new Error("Acesso restrito ao time comercial.");
}

async function loadCreds(supabase: AnyDb) {
  const { data, error } = await supabase.rpc("mineracao_creds");
  if (error) throw friendlyDbError(error);
  const row = (Array.isArray(data) ? data[0] : data) as
    | { api_base_url: string; usuario: string | null; senha: string | null; delay_ms: number }
    | null;
  if (!row?.usuario || !row?.senha) {
    const err = new Error(
      "A mineração de leads ainda não foi configurada. Um administrador precisa informar o acesso do provedor em Configurações › Mineração.",
    );
    (err as any).code = "mineracao_nao_configurada";
    throw err;
  }
  return {
    baseUrl: row.api_base_url,
    usuario: row.usuario,
    senha: row.senha,
    delayMs: row.delay_ms ?? 600,
  };
}

/* ------------------------------------------------------------------ config */

export const getMineracaoConfig = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<MineracaoConfig> => {
    const db = anyDb(context.supabase);
    await assertAdmin(db, context.userId);
    const { data, error } = await db.rpc("mineracao_config_admin");
    if (error) throw friendlyDbError(error);
    const row = (data ?? {}) as Record<string, any>;
    return {
      api_base_url: row["api_base_url"] ?? "",
      usuario: row["usuario"] ?? null,
      senha_definida: Boolean(row["senha_definida"]),
      pais_padrao: row["pais_padrao"] ?? null,
      delay_ms: row["delay_ms"] ?? 600,
      limite_consultas_dia: row["limite_consultas_dia"] ?? 1000,
      limite_bases: row["limite_bases"] ?? 25,
      limite_bases_premium: row["limite_bases_premium"] ?? 15,
      limite_rubros: row["limite_rubros"] ?? 30,
      limite_empresas: row["limite_empresas"] ?? 1000,
      updated_at: row["updated_at"] ?? null,
    };
  });


const configInput = z.object({
  api_base_url: z.string().url().max(300),
  usuario: z.string().trim().max(200).optional(),
  senha: z.string().max(300).optional(),
  pais_padrao: z.string().trim().max(4).optional(),
  delay_ms: z.number().int().min(500).max(10000),
  limite_consultas_dia: z.number().int().min(1).max(100000),
  limite_bases: z.number().int().min(1).max(1000),
  limite_bases_premium: z.number().int().min(0).max(1000),
  limite_rubros: z.number().int().min(1).max(1000),
  limite_empresas: z.number().int().min(1).max(100000),
});

export const saveMineracaoConfig = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => configInput.parse(input))
  .handler(async ({ data, context }) => {
    const db = anyDb(context.supabase);
    await assertAdmin(db, context.userId);
    const patch: Record<string, unknown> = {
      api_base_url: data.api_base_url,
      pais_padrao: data.pais_padrao || null,
      delay_ms: data.delay_ms,
      limite_consultas_dia: data.limite_consultas_dia,
      limite_bases: data.limite_bases,
      limite_bases_premium: data.limite_bases_premium,
      limite_rubros: data.limite_rubros,
      limite_empresas: data.limite_empresas,
      updated_at: new Date().toISOString(),
      updated_by: context.userId,
    };
    if (data.usuario !== undefined) patch["usuario"] = data.usuario || null;
    if (data.senha) patch["senha"] = data.senha;

    const { error } = await db
      .from("mineracao_config")
      .update(patch)
      .eq("singleton", true);
    if (error) throw friendlyDbError(error);
    return { ok: true };
  });

/* ------------------------------------------------------------------ status */

/** Snapshot normalizado do GET /restrictions — tudo vem da resposta real da Penta. */
export type MineracaoRestricoes = {
  conta: string;
  email: string;
  estado: string;
  vigencia: { inicio: string; fim: string };
  bases: { usadas: number; limite: number; lista: string[] };
  rubros: { usadas: number; limite: number; lista: string[] };
  empresas: {
    usadas: number;
    limite: number;
    lista: Array<{ nome: string; pais: string }>;
  };
};

export type MineracaoStatus = {
  dados: MineracaoRestricoes | null;
  atualizado_em: string | null;
  erro?: string;
};

const uniq = (xs: Array<string | null | undefined>) =>
  Array.from(new Set(xs.filter((x): x is string => Boolean(x && String(x).trim())).map(String)));

function normalizarRestricoes(r: {
  name: string;
  email: string;
  serviceState: string;
  startDate: string;
  endDate: string;
  totalCountriesAllowed?: number;
  totalTariffCodesAllowed?: number;
  totalCompaniesAllowed?: number;
  basesQueried?: string[];
  tariffCodesQueried?: string[];
  companiesQueried?: Array<{ companyName?: string; keyCountry?: string }>;
}): MineracaoRestricoes {
  const bases = uniq(r.basesQueried ?? []);
  const rubros = uniq(r.tariffCodesQueried ?? []);
  const empresasMap = new Map<string, { nome: string; pais: string }>();
  for (const c of r.companiesQueried ?? []) {
    const nome = (c.companyName ?? "").trim();
    const pais = (c.keyCountry ?? "").trim();
    if (!nome && !pais) continue;
    empresasMap.set(`${nome}|${pais}`, { nome, pais });
  }
  const empresas = Array.from(empresasMap.values()).sort((a, b) => a.nome.localeCompare(b.nome));
  return {
    conta: r.name,
    email: r.email,
    estado: r.serviceState,
    vigencia: { inicio: r.startDate, fim: r.endDate },
    bases: { usadas: bases.length, limite: r.totalCountriesAllowed ?? 0, lista: bases.sort() },
    rubros: { usadas: rubros.length, limite: r.totalTariffCodesAllowed ?? 0, lista: rubros.sort() },
    empresas: { usadas: empresas.length, limite: r.totalCompaniesAllowed ?? 0, lista: empresas },
  };
}

/** Leitura barata: usa apenas o snapshot salvo, sem tocar na API da Penta. */
export const getMineracaoStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<MineracaoStatus> => {
    const db = anyDb(context.supabase);
    await assertComercial(db, context.userId);
    const { data, error } = await db.rpc("mineracao_restricoes_get");
    if (error) return { dados: null, atualizado_em: null, erro: error.message };
    const row = (Array.isArray(data) ? data[0] : data) as
      | { snapshot: MineracaoRestricoes | null; atualizado_em: string | null }
      | null;
    return {
      dados: (row?.snapshot ?? null) as MineracaoRestricoes | null,
      atualizado_em: row?.atualizado_em ?? null,
    };
  });

/** Chamada explícita ao GET /restrictions (botão "Atualizar"). Salva o snapshot. */
export const atualizarRestricoes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<MineracaoStatus> => {
    const db = anyDb(context.supabase);
    await assertComercial(db, context.userId);
    try {
      const creds = await loadCreds(db);
      const { pentaRestrictions } = await import("@/lib/mineracao/penta.server");
      const dados = normalizarRestricoes(await pentaRestrictions(creds));
      const { data, error } = await db.rpc("mineracao_restricoes_set", {
        _snapshot: dados as unknown as Record<string, unknown>,
      });
      if (error) throw friendlyDbError(error);
      return { dados, atualizado_em: (data as string) ?? new Date().toISOString() };
    } catch (err) {
      return { dados: null, atualizado_em: null, erro: (err as Error).message };
    }
  });



export const testarMineracao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = anyDb(context.supabase);
    await assertAdmin(db, context.userId);
    const started = Date.now();
    try {
      const creds = await loadCreds(db);
      const { pentaRestrictions } = await import("@/lib/mineracao/penta.server");
      const r = await pentaRestrictions(creds);
      return { ok: true as const, latencia_ms: Date.now() - started, conta: r.name, estado: r.serviceState };
    } catch (err) {
      return { ok: false as const, latencia_ms: Date.now() - started, erro: (err as Error).message };
    }
  });

/* ------------------------------------------------------------------- bases */

export type BaseLocal = {
  keyCountry: string;
  pais: string;
  keyOperation: string;
  keyVersion: number;
  title: string;
  hasTariffCodes: boolean;
  hasCompanies: boolean;
  startDate: string | null;
  updatedDate: string | null;
  active: boolean;
  underMaintenance: boolean;
  queryLimit: number;
  parameters: Array<{ name: string }>;
  synced_at: string;
};

function mapBaseRow(r: Record<string, any>): BaseLocal {
  return {
    keyCountry: r["key_country"],
    pais: r["pais"] ?? "",
    keyOperation: r["key_operation"],
    keyVersion: r["key_version"],
    title: r["title"],
    hasTariffCodes: Boolean(r["has_tariff_codes"]),
    hasCompanies: Boolean(r["has_companies"]),
    startDate: r["start_date"] ?? null,
    updatedDate: r["updated_date"] ?? null,
    active: r["active"] !== false,
    underMaintenance: Boolean(r["under_maintenance"]),
    queryLimit: Number(r["query_limit"] ?? 0),
    parameters: (r["parameters"] ?? []) as Array<{ name: string }>,
    synced_at: r["synced_at"],
  };
}

/**
 * Lê as bases já sincronizadas no banco local.
 * Nunca chama a API da Penta — a sincronização é manual (botão "Sincronizar bases").
 */
export const listarBases = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ pais: z.string().trim().max(60).optional() }).parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    const db = anyDb(context.supabase);
    await assertComercial(db, context.userId);
    let q = db
      .from("penta_bases")
      .select(
        "key_country, pais, key_operation, key_version, title, has_tariff_codes, has_companies, start_date, updated_date, active, under_maintenance, query_limit, parameters, synced_at",
      )
      .eq("enabled", true)
      .order("pais", { ascending: true })
      .limit(2000);
    if (data.pais) q = q.or(`key_country.eq.${data.pais},pais.ilike.%${data.pais}%`);
    const { data: rows, error } = await q;
    if (error) throw friendlyDbError(error);
    return ((rows ?? []) as Array<Record<string, any>>).map(mapBaseRow);
  });

/** Data da última sincronização das bases (null = nunca sincronizado). */
export const statusSincronizacaoBases = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = anyDb(context.supabase);
    await assertComercial(db, context.userId);
    const { data, error } = await db
      .from("penta_bases")
      .select("synced_at")
      .order("synced_at", { ascending: false })
      .limit(1);
    if (error) throw friendlyDbError(error);
    const { count } = await db
      .from("penta_bases")
      .select("id", { count: "exact", head: true });
    const row = (data ?? [])[0] as { synced_at?: string } | undefined;
    return { ultima_sincronizacao: row?.synced_at ?? null, total: count ?? 0 };
  });

/**
 * Sincroniza países + bases do provedor para a tabela local.
 * Executa somente sob ação explícita do usuário (consome cota da Penta).
 */
export const sincronizarBases = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({ paises: z.array(z.object({ key: z.string(), value: z.string() })).max(8).optional() })
      .parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    const db = anyDb(context.supabase);
    // Sincronizar consome cota da Penta: restrito a administração/gestão.
    await assertAdmin(db, context.userId);

    const creds = await loadCreds(db);
    const { pentaCountries, pentaBases } = await import("@/lib/mineracao/penta.server");

    // Sem lista informada, sincroniza no máximo 4 países por chamada para não
    // estourar o tempo limite do servidor (cada país exige uma chamada externa).
    const paises = data.paises?.length ? data.paises : ((await pentaCountries(creds)) ?? []).slice(0, 4);
    const agora = new Date().toISOString();
    const registros: Array<Record<string, unknown>> = [];
    const erros: string[] = [];

    // A fila serial do cliente Penta já garante o intervalo mínimo de 500 ms.
    for (const p of paises) {
      try {
        const bases = (await pentaBases(creds, p.key)) ?? [];
        for (const b of bases) {
          registros.push({
            key_country: b.keyCountry?.key ?? p.key,
            pais: b.keyCountry?.value ?? p.value,
            key_operation: b.keyOperation,
            key_version: b.keyVersion,
            title: b.title ?? "",
            has_tariff_codes: Boolean(b.hasTariffCodes),
            has_companies: Boolean(b.hasCompanies),
            start_date: b.startDate ?? null,
            updated_date: b.updatedDate ?? null,
            active: b.active !== false,
            under_maintenance: Boolean(b.underMaintenance),
            enabled: b.enabled !== false,
            query_limit: b.queryLimit ?? 0,
            parameters: b.parameters ?? [],
            columns: (b.parameters ?? []).map((x) => x.name),
            synced_at: agora,
          });
        }
      } catch (err) {
        erros.push(`${p.value}: ${(err as Error).message}`);
      }
    }

    if (registros.length) {
      const { error } = await db
        .from("penta_bases")
        .upsert(registros, { onConflict: "key_country,key_operation,key_version" });
      if (error) throw friendlyDbError(error);
    }

    return {
      paises: paises.length,
      bases: registros.length,
      erros,
      sincronizado_em: agora,
    };
  });

/**
 * Usuário sem perfil de administrador pede a atualização das bases.
 * Gera notificação interna para admins/gestores (nenhuma cota da Penta é usada).
 */
export const solicitarSincronizacaoBases = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ motivo: z.string().trim().max(300).optional() }).parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    const db = anyDb(context.supabase);
    await assertComercial(db, context.userId);
    const { data: perfil } = await db
      .from("profiles")
      .select("full_name, email")
      .eq("id", context.userId)
      .maybeSingle();
    const quem =
      (perfil as { full_name?: string; email?: string } | null)?.full_name ||
      (perfil as { email?: string } | null)?.email ||
      "Um usuário";
    const { error } = await db.rpc("notify_admins_managers_form", {
      p_titulo: "Sincronização das bases de mineração",
      p_mensagem: `${quem} solicitou a atualização das bases de dados da mineração.${
        data.motivo ? ` Motivo: ${data.motivo}` : ""
      }`,
      p_origem: "mineracao",
      p_origem_id: null,
      p_link: "/comercial/mineracao",
    });
    if (error) throw friendlyDbError(error);
    return { ok: true as const };
  });


export const listarPaises = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertComercial(anyDb(context.supabase), context.userId);
    const creds = await loadCreds(anyDb(context.supabase));
    const { pentaCountries } = await import("@/lib/mineracao/penta.server");
    return (await pentaCountries(creds)) ?? [];
  });

/* ------------------------------------------------------------------ buscar */

const buscaInput = z.object({
  keyCountry: z.string().min(2).max(4),
  keyOperation: z.string().min(2).max(40),
  keyVersion: z.number().int().min(0).max(99),
  baseTitulo: z.string().max(200).optional(),
  queryLimit: z.number().int().min(0).max(1000000).optional(),
  rubros: z.array(z.string().regex(/^\d{4}$/)).min(1).max(30),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  empresaParam: z.string().max(60).optional(),
  empresaColuna: z.string().max(60).optional(),
  contraparteColuna: z.string().max(60).optional(),
  /** "empresas" agrupa por empresa local; "pares" e "rota" agrupam por empresa ↔ contraparte. */
  modo: z.enum(["empresas", "pares", "rota"]).optional(),
  /** Modo rota: código do país de origem (vendedor) e nome do país de destino. */
  paisOrigem: z.string().trim().max(8).optional(),
  paisOrigemNome: z.string().trim().max(120).optional(),
  paisDestinoNome: z.string().trim().max(120).optional(),
  /** Filtros por nome (contém, sem distinção de maiúsculas). */
  filtroEmpresa: z.string().trim().max(120).optional(),
  filtroContraparte: z.string().trim().max(120).optional(),
  /** Descarta empresas com poucas operações ou valor baixo. */
  minOperacoes: z.number().int().min(0).max(1000).optional(),
  minValor: z.number().min(0).optional(),
});

export type LeadMinerado = {
  empresa: string;
  contraparte: string | null;
  operacoes: number;
  valor_total: number;
  rubros: string[];
  primeira_operacao: string | null;
  ultima_operacao: string | null;
  /** Principais contrapartes do lead (top 5 por valor). */
  parceiros: Array<{ nome: string; operacoes: number; valor: number }>;
};





export const buscarOperacoes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => buscaInput.parse(input))
  .handler(async ({ data, context }) => {
    await assertComercial(anyDb(context.supabase), context.userId);
    const admin = anyDb(context.supabase);
    const creds = await loadCreds(admin);

    const meses =
      (new Date(data.endDate).getTime() - new Date(data.startDate).getTime()) /
      (1000 * 60 * 60 * 24 * 30.5);
    if (meses > 12) throw new Error("O período de busca não pode ultrapassar 12 meses.");
    if (meses < 0) throw new Error("A data final precisa ser posterior à data inicial.");

    // Vigência real da base (sincronizada do provedor). Consultar fora dela faz
    // a Penta recusar a busca com um erro técnico; aqui avisamos antes.
    const { data: baseRow } = await admin
      .from("penta_bases")
      .select("title, pais, start_date, updated_date")
      .eq("key_country", data.keyCountry)
      .eq("key_operation", data.keyOperation)
      .eq("key_version", data.keyVersion)
      .maybeSingle();
    const bd = baseRow as { title?: string; pais?: string; start_date?: string | null; updated_date?: string | null } | null;
    if (bd?.start_date || bd?.updated_date) {
      const fmt = (d: string) => d.slice(0, 10).split("-").reverse().join("/");
      const ini = bd.start_date ? bd.start_date.slice(0, 10) : null;
      const fim = bd.updated_date ? bd.updated_date.slice(0, 10) : null;
      const buscaIni = data.startDate.slice(0, 10);
      const buscaFim = data.endDate.slice(0, 10);
      if ((ini && buscaFim < ini) || (fim && buscaIni > fim)) {
        throw new Error(
          `Esta base (${bd.pais ?? data.keyCountry}${bd.title ? ` — ${bd.title}` : ""}) tem dados apenas de ` +
            `${ini ? fmt(ini) : "início desconhecido"} até ${fim ? fmt(fim) : "hoje"}. ` +
            `Ajuste o período da busca para dentro desse intervalo.`,
        );
      }
      if (ini && buscaIni < ini) data.startDate = ini;
      if (fim && buscaFim > fim) data.endDate = fim;
    }


    const modo = data.modo ?? "empresas";
    if (modo === "rota" && !data.paisOrigem) {
      throw new Error("Selecione o país de origem (quem vendeu).");
    }

    // Cota diária de consultas — bloqueia antes de chamar o provedor.
    const { error: cotaErr } = await admin.rpc("mineracao_consumir_consultas", { _chamadas: 1 });
    if (cotaErr) throw friendlyDbError(cotaErr);

    const { pentaOperations } = await import("@/lib/mineracao/penta.server");

    const parametros: Array<Record<string, unknown>> = [
      { name: "rubro", title: "Código SAC", value: data.rubros, type: "text", multiple: true },
    ];
    if (modo === "rota" && data.paisOrigem) {
      parametros.push({
        name: "paisCodigo",
        title: "País de origem",
        value: [data.paisOrigem],
        type: "keyValue",
        multiple: true,
      });
    }

    // Sem `personalizedColumns`: a base devolve o conjunto padrão de colunas
    // (com nome da empresa). Pedir colunas por palpite fazia a consulta voltar
    // só com códigos numéricos ou falhar.
    const res = await pentaOperations(creds, {
      keyCountry: data.keyCountry,
      keyOperation: data.keyOperation,
      keyVersion: data.keyVersion,
      startDate: data.startDate,
      endDate: data.endDate,
      parameters: parametros as never,
    });

    const cols = (res?.columns ?? []) as PentaColuna[];
    const disponiveis = cols.map((c) => c.name);
    const empresaCol = pickColumn(disponiveis, COL_EMPRESA, data.empresaColuna);
    const contraCol = pickColumn(disponiveis, COL_CONTRA, data.contraparteColuna);
    const valorCol = pickColumn(
      disponiveis.filter((n) => {
        const c = cols.find((x) => x.name === n);
        return !c?.type || /num|dec|money|float|int/i.test(String(c.type));
      }),
      COL_VALOR,
    ) ?? pickColumn(disponiveis, COL_VALOR);
    const periodoCol = pickColumn(disponiveis, COL_PERIODO);
    const rubroCol = pickColumn(disponiveis, COL_RUBRO);

    console.info(
      `[mineracao] colunas=${JSON.stringify(cols.map((c) => `${c.name}:${c.type ?? "?"}@${c.positionInRow ?? "-"}`))} ` +
        `empresa=${empresaCol} contraparte=${contraCol} valor=${valorCol} periodo=${periodoCol} rubro=${rubroCol}`,
    );

    const iPeriodo = indexOfColumn(cols, periodoCol);
    const iRubro = indexOfColumn(cols, rubroCol);
    const iValor = indexOfColumn(cols, valorCol);
    const iEmpresa = indexOfColumn(cols, empresaCol);
    // Bases que não expõem o nome do exportador ao menos trazem o país de
    // procedência — usado como contraparte para não deixar o par vazio.
    const contraFallback =
      contraCol ?? cols.find((c) => /paisProcedencia|paisOrigen|paisOrigem/i.test(c.name))?.name ?? null;
    const iContra = indexOfColumn(cols, contraFallback);
    const contraparteDisponivel = iContra >= 0;

    const contem = (valor: string, filtro?: string) =>
      !filtro || valor.toLowerCase().includes(filtro.toLowerCase());

    const agrupado = new Map<string, LeadMinerado & { _parc: Map<string, { operacoes: number; valor: number }> }>();
    let totalValor = 0;
    let totalLinhas = 0;

    for (const row of res?.rows ?? []) {
      const v = row.values ?? [];
      const empresa = parseTexto(iEmpresa >= 0 ? v[iEmpresa] : "") || "Não informado";
      const contraparte = parseTexto(iContra >= 0 ? v[iContra] : "");
      if (!contem(empresa, data.filtroEmpresa)) continue;
      if (data.filtroContraparte && !contem(contraparte, data.filtroContraparte)) continue;

      const valor = parseNumero(iValor >= 0 ? v[iValor] : 0);
      const rubro = parseTexto(iRubro >= 0 ? v[iRubro] : "");
      const periodo = iPeriodo >= 0 ? parseTexto(v[iPeriodo]) || null : null;
      totalValor += valor;
      totalLinhas += 1;


      const porPar = modo === "pares" || modo === "rota";
      const chave = porPar ? `${empresa}||${contraparte}` : empresa;
      const cur =
        agrupado.get(chave) ??
        {
          empresa,
          contraparte: porPar ? contraparte || null : null,

          operacoes: 0,
          valor_total: 0,
          rubros: [] as string[],
          primeira_operacao: null as string | null,
          ultima_operacao: null as string | null,
          parceiros: [] as LeadMinerado["parceiros"],
          _parc: new Map<string, { operacoes: number; valor: number }>(),
        };
      cur.operacoes += 1;
      cur.valor_total += valor;
      if (rubro && !cur.rubros.includes(rubro.slice(0, 4))) cur.rubros.push(rubro.slice(0, 4));
      if (contraparte) {
        const p = cur._parc.get(contraparte) ?? { operacoes: 0, valor: 0 };
        p.operacoes += 1;
        p.valor += valor;
        cur._parc.set(contraparte, p);
      }
      if (periodo) {
        if (!cur.primeira_operacao || periodo < cur.primeira_operacao) cur.primeira_operacao = periodo;
        if (!cur.ultima_operacao || periodo > cur.ultima_operacao) cur.ultima_operacao = periodo;
      }
      agrupado.set(chave, cur);
    }

    const minOps = data.minOperacoes ?? 0;
    const minVal = data.minValor ?? 0;
    const leads: LeadMinerado[] = [...agrupado.values()]
      .filter((l) => l.operacoes >= minOps && l.valor_total >= minVal)
      .map(({ _parc, ...l }) => ({
        ...l,
        parceiros: [..._parc.entries()]
          .map(([nome, p]) => ({ nome, operacoes: p.operacoes, valor: p.valor }))
          .sort((a, b) => b.valor - a.valor)
          .slice(0, 5),
      }))
      .sort((a, b) => b.valor_total - a.valor_total);

    const filtroDesc = [
      data.filtroEmpresa ? `empresa ~ ${data.filtroEmpresa}` : null,
      data.filtroContraparte ? `contraparte ~ ${data.filtroContraparte}` : null,
    ]
      .filter(Boolean)
      .join(" · ");

    const limiteBase = data.queryLimit ?? 0;
    const truncado = limiteBase > 0 && totalLinhas >= limiteBase;

    const rotaDesc =
      modo === "rota"
        ? `${data.paisOrigemNome ?? data.paisOrigem} → ${data.paisDestinoNome ?? data.keyCountry}`
        : null;

    const { data: campanha, error: campErr } = await admin
      .from("mineracao_campanhas")
      .insert({
        nome: `${rotaDesc ?? data.baseTitulo ?? data.keyOperation} · ${data.rubros.join(", ")}${filtroDesc ? ` · ${filtroDesc}` : ""}`,
        key_country: data.keyCountry,
        key_operation: data.keyOperation,
        key_version: data.keyVersion,
        base_titulo: data.baseTitulo ?? null,
        rubros: data.rubros,
        start_date: data.startDate,
        end_date: data.endDate,
        modo,
        pais_origem: data.paisOrigem ?? null,
        pais_destino: modo === "rota" ? (data.paisDestinoNome ?? data.keyCountry) : null,
        truncado,
        limite_base: limiteBase || null,
        filtro_empresa: data.filtroEmpresa ?? null,
        filtro_contraparte: data.filtroContraparte ?? null,
        total_operacoes: totalLinhas,
        total_empresas: leads.length,
        valor_total: totalValor,
        criado_por: context.userId,
      })
      .select("id")
      .single();
    if (campErr) throw friendlyDbError(campErr);
    const campanhaId = (campanha as { id: string }).id;

    if (leads.length) {
      const { error: resErr } = await admin.from("mineracao_resultados").insert(
        leads.map((l) => ({
          campanha_id: campanhaId,
          empresa: l.empresa,
          contraparte: l.contraparte,
          parceiros: l.parceiros,
          pais: modo === "rota" ? (data.paisDestinoNome ?? data.keyCountry) : data.keyCountry,
          operacoes: l.operacoes,
          valor_total: l.valor_total,
          rubros: l.rubros,
          primeira_operacao: l.primeira_operacao,
          ultima_operacao: l.ultima_operacao,
        })),
      );
      if (resErr) throw friendlyDbError(resErr);
    }

    return {
      campanha_id: campanhaId,
      total_operacoes: totalLinhas,
      total_empresas: leads.length,
      valor_total: totalValor,
      truncado,
      limite_base: limiteBase || null,
      /** false = esta base não devolve o nome da contraparte no exterior. */
      contraparte_disponivel: contraparteDisponivel,
      colunas_base: disponiveis,
    };

  });

/* --------------------------------------------------- rota origem → destino */

/** Descobre a base de importação do país de destino (quem comprou). */
export const descobrirBaseImportacao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ pais: z.string().trim().min(1).max(60) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const db = anyDb(context.supabase);
    await assertComercial(db, context.userId);
    const { data: rows, error } = await db
      .from("penta_bases")
      .select(
        "key_country, pais, key_operation, key_version, title, query_limit, under_maintenance, parameters",
      )
      .eq("enabled", true)
      .eq("active", true)
      .ilike("pais", `%${data.pais}%`)
      .limit(50);
    if (error) throw friendlyDbError(error);
    const base = ((rows ?? []) as Array<Record<string, any>>).find((b) =>
      /import/i.test(String(b["key_operation"])),
    );
    if (!base) {
      throw new Error(
        "Não há base de importação sincronizada para este país. Clique em “Sincronizar bases” ou escolha outro destino.",
      );
    }
    return {
      keyCountry: base["key_country"] as string,
      pais: (base["pais"] as string) ?? data.pais,
      keyOperation: base["key_operation"] as string,
      keyVersion: base["key_version"] as number,
      title: base["title"] as string,
      queryLimit: Number(base["query_limit"] ?? 0),
      underMaintenance: Boolean(base["under_maintenance"]),
      colunas: ((base["parameters"] ?? []) as Array<{ name: string }>).map((p) => p.name),

    };
  });

/** Lista os países de origem aceitos pela base (parâmetro paisCodigo). */
export const listarPaisesOrigem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        keyCountry: z.string().min(2).max(4),
        keyOperation: z.string().min(2).max(40),
        keyVersion: z.number().int().min(0).max(99),
        filtro: z.string().trim().max(60).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertComercial(anyDb(context.supabase), context.userId);
    const creds = await loadCreds(anyDb(context.supabase));
    const { pentaParameterSupport } = await import("@/lib/mineracao/penta.server");
    return await pentaParameterSupport(creds, {
      keyCountry: data.keyCountry,
      keyOperation: data.keyOperation,
      keyVersion: data.keyVersion,
      parameterName: "paisCodigo",
      filter: data.filtro ?? "",
      searchType: "contains",
    });
  });

/** Anotação manual do comercial (contato encontrado, próximos passos, etc.). */
export const salvarAnotacaoLead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({ resultado_id: z.string().uuid(), anotacao: z.string().max(2000) })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const db = anyDb(context.supabase);
    await assertComercial(db, context.userId);
    const { error } = await db
      .from("mineracao_resultados")
      .update({ anotacao: data.anotacao || null })
      .eq("id", data.resultado_id);
    if (error) throw friendlyDbError(error);
    return { ok: true };
  });


/* -------------------------------------------------------------- campanhas */

/** Procura uma busca anterior com exatamente os mesmos filtros (evita gastar cota). */
export const buscaAnterior = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        keyCountry: z.string().min(2).max(4),
        keyOperation: z.string().min(2).max(40),
        keyVersion: z.number().int().min(0).max(99),
        rubros: z.array(z.string()).min(1).max(30),
        startDate: z.string(),
        endDate: z.string(),
        modo: z.enum(["empresas", "pares", "rota"]),
        paisOrigem: z.string().max(8).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const db = anyDb(context.supabase);
    await assertComercial(db, context.userId);
    let q = db
      .from("mineracao_campanhas")
      .select("id, created_at, total_empresas, total_operacoes, rubros, pais_origem")
      .eq("key_country", data.keyCountry)
      .eq("key_operation", data.keyOperation)
      .eq("key_version", data.keyVersion)
      .eq("start_date", data.startDate)
      .eq("end_date", data.endDate)
      .eq("modo", data.modo)
      .order("created_at", { ascending: false })
      .limit(10);
    if (data.paisOrigem) q = q.eq("pais_origem", data.paisOrigem);
    const { data: rows, error } = await q;
    if (error) throw friendlyDbError(error);
    const alvo = [...data.rubros].sort().join(",");
    const match = ((rows ?? []) as Array<Record<string, any>>).find(
      (r) => [...((r["rubros"] ?? []) as string[])].sort().join(",") === alvo,
    );
    if (!match) return null;
    return {
      campanha_id: match["id"] as string,
      created_at: match["created_at"] as string,
      total_empresas: Number(match["total_empresas"] ?? 0),
      total_operacoes: Number(match["total_operacoes"] ?? 0),
    };
  });



export const listarCampanhas = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = anyDb(context.supabase);
    await assertComercial(db, context.userId);
    const { data, error } = await db
      .from("mineracao_campanhas")
      .select(
        "id, nome, key_country, key_operation, base_titulo, rubros, start_date, end_date, modo, pais_origem, pais_destino, filtro_empresa, filtro_contraparte, total_operacoes, total_empresas, valor_total, created_at, criado_por",
      )
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw friendlyDbError(error);
    const rows = (data ?? []) as Array<Record<string, any>>;

    // Quem executou cada busca (evita dois vendedores repetirem o mesmo trabalho).
    const ids = Array.from(
      new Set(rows.map((r) => r["criado_por"]).filter((x): x is string => Boolean(x))),
    );
    const nomes = new Map<string, string>();
    if (ids.length) {
      const { data: perfis } = await db
        .from("profiles")
        .select("id, full_name, email")
        .in("id", ids);
      for (const p of (perfis ?? []) as Array<Record<string, any>>) {
        nomes.set(p["id"], p["full_name"] || p["email"] || "Usuário");
      }
    }
    return rows.map((r) => ({
      ...r,
      responsavel: r["criado_por"] ? (nomes.get(r["criado_por"]) ?? "Usuário") : "—",
    })) as Array<Record<string, any>>;


  });

export const listarResultados = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({ campanha_id: z.string().uuid(), busca: z.string().max(120).optional() })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const db = anyDb(context.supabase);
    await assertComercial(db, context.userId);
    let q = db
      .from("mineracao_resultados")
      .select(
        "id, empresa, contraparte, parceiros, documento, pais, operacoes, valor_total, rubros, primeira_operacao, ultima_operacao, anotacao, papel, enviado_para_pipeline, convertido_oportunidade_id, convertido_at",
      )
      .eq("campanha_id", data.campanha_id)
      .order("valor_total", { ascending: false })
      .limit(1000);
    if (data.busca) q = q.or(`empresa.ilike.%${data.busca}%,contraparte.ilike.%${data.busca}%`);
    const { data: rows, error } = await q;
    if (error) throw friendlyDbError(error);
    return (rows ?? []) as Array<Record<string, any>>;
  });

/* -------------------------------------------------------------- conversão */

export const converterLeadEmOportunidade = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        resultado_ids: z.array(z.string().uuid()).min(1).max(50),
        /** Qual ponta do par vira lead. */
        papel: z.enum(["importador", "fornecedor", "ambos"]).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const db = anyDb(context.supabase);
    await assertComercial(db, context.userId);

    const { data: rows, error } = await db
      .from("mineracao_resultados")
      .select(
        "id, empresa, contraparte, pais, operacoes, rubros, valor_total, anotacao, ultima_operacao, convertido_oportunidade_id, campanha_id",
      )
      .in("id", data.resultado_ids);
    if (error) throw friendlyDbError(error);

    const papel = data.papel ?? "importador";
    const criadas: Array<{ resultado_id: string; oportunidade_id: string; codigo: string }> = [];
    let ignorados = 0;

    const usd = (n: number) =>
      Number(n || 0).toLocaleString("pt-BR", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      });

    for (const row of (rows ?? []) as Array<Record<string, any>>) {
      if (row["convertido_oportunidade_id"]) {
        ignorados += 1;
        continue;
      }
      const importador = String(row["empresa"] ?? "").slice(0, 200);
      const fornecedor = String(row["contraparte"] ?? "").slice(0, 200);
      const rubros: string[] = row["rubros"] ?? [];
      const pais = row["pais"] ?? null;

      const alvos: string[] = [];
      if (papel === "importador" || papel === "ambos") alvos.push(importador);
      if ((papel === "fornecedor" || papel === "ambos") && fornecedor) alvos.push(fornecedor);
      if (!alvos.length) alvos.push(importador);

      let primeira: { id: string; codigo: string } | null = null;
      for (const empresa of alvos) {
        if (!empresa) continue;
        const contraponto =
          empresa === importador ? fornecedor : importador;
        const observacoes = [
          `Origem: mineração de leads (NCM ${rubros.join(", ") || "—"}).`,
          contraponto ? `Contraparte: ${contraponto}.` : null,
          pais ? `País: ${pais}.` : null,
          `Histórico no período: ${row["operacoes"] ?? 0} operações · ${usd(Number(row["valor_total"] ?? 0))}.`,
          row["ultima_operacao"] ? `Última operação: ${row["ultima_operacao"]}.` : null,
          row["anotacao"] ? `Anotação: ${row["anotacao"]}` : null,
        ]
          .filter(Boolean)
          .join("\n");

        const { data: op, error: opErr } = await db
          .from("oportunidades")
          .insert({
            titulo: `Lead minerado — ${empresa}`.slice(0, 200),
            empresa_lead: empresa,
            responsavel_id: context.userId,
            probabilidade: 10,
            observacoes,
          })
          .select("id, codigo")
          .single();
        if (opErr) throw friendlyDbError(opErr);
        const oportunidade = op as { id: string; codigo: string };
        if (!primeira) primeira = oportunidade;
        criadas.push({
          resultado_id: row["id"],
          oportunidade_id: oportunidade.id,
          codigo: oportunidade.codigo,
        });
      }

      if (primeira) {
        await db
          .from("mineracao_resultados")
          .update({
            convertido_oportunidade_id: primeira.id,
            enviado_para_pipeline: true,
            papel,
            convertido_at: new Date().toISOString(),
          })

          .eq("id", row["id"]);
      }

    }

    return { criadas, ignorados };
  });
