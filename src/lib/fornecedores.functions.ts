import { createServerFn } from "@tanstack/react-start";
import { friendlyDbError } from "@/lib/db-errors";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  fornecedorInputSchema,
  contatoInputSchema,
  FORNECEDOR_RANKINGS,
  FORNECEDOR_STATUS,
} from "@/lib/fornecedores.shared";
import { hasAnyRole } from "@/lib/admin-guard";

async function assertPurchasingRole(supabase: any, uid: string): Promise<void> {
  const ok = await hasAnyRole(supabase, uid, ["admin", "manager", "purchasing"]);
  if (!ok) throw new Error("Sem permissão para operar em Fornecedores");
}

const listInput = z.object({
  q: z.string().max(120).optional().default(""),
  pais: z.string().max(10).optional().default("todos"),
  status: z
    .enum(["todos", ...FORNECEDOR_STATUS])
    .optional()
    .default("todos"),
  ranking: z
    .enum(["todos", ...FORNECEDOR_RANKINGS])
    .optional()
    .default("todos"),
  categoria: z.string().max(80).optional().default("todos"),
  categorias: z.array(z.string().max(80)).optional().default([]),
  tags: z.array(z.string().max(60)).optional().default([]),
  palavras_chave: z.array(z.string().max(80)).optional().default([]),
  certificacoes: z.array(z.string().max(60)).optional().default([]),
  incoterm: z.string().max(8).optional().default("todos"),
  moeda: z.string().max(8).optional().default("todos"),
  funcionarios_faixa: z.string().max(40).optional().default("todos"),
  lead_time_max: z.number().int().min(0).max(1000).optional().nullable(),
  page: z.number().int().min(1).default(1),
  pageSize: z.union([z.literal(25), z.literal(50), z.literal(100)]).default(25),
});

export const listFornecedores = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => listInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const from = (data.page - 1) * data.pageSize;
    const to = from + data.pageSize - 1;

    let query = supabase
      .from("fornecedores")
      .select("id, codigo, nome, nome_fantasia, pais, cidade, status, ranking, tags, updated_at", {
        count: "exact",
      })
      .is("deleted_at", null)
      .order("updated_at", { ascending: false })
      .range(from, to);

    const term = data.q.trim();
    if (term) {
      // Busca combinada: prefixo por palavra (FTS) OU trecho parcial (ilike) em
      // nome, nome fantasia, código, cidade e tags. Sem isso, digitar "valv"
      // não encontrava "Válvulas" (FTS websearch exige palavra inteira).
      const safe = term.replace(/[%,()"']/g, " ").trim();
      const clauses: string[] = [];
      if (safe) {
        const like = `%${safe}%`;
        clauses.push(
          `nome.ilike.${like}`,
          `nome_fantasia.ilike.${like}`,
          `codigo.ilike.${like}`,
          `cidade.ilike.${like}`,
          `tags.cs.{"${safe}"}`,
        );
        const prefixQuery = safe
          .split(/\s+/)
          .filter(Boolean)
          .map((w) => `${w}:*`)
          .join(" & ");
        if (prefixQuery) clauses.push(`search_tsv.fts(simple).${prefixQuery}`);
      }
      if (clauses.length > 0) query = query.or(clauses.join(","));
    }

    if (data.pais !== "todos") query = query.eq("pais", data.pais);
    if (data.status !== "todos") query = query.eq("status", data.status);
    if (data.ranking !== "todos") query = query.eq("ranking", data.ranking);
    if (data.incoterm !== "todos")
      query = (query as never as { eq: (c: string, v: string) => typeof query }).eq(
        "incoterm_padrao",
        data.incoterm,
      );
    if (data.moeda !== "todos")
      query = (query as never as { eq: (c: string, v: string) => typeof query }).eq(
        "moeda_padrao",
        data.moeda,
      );
    if (data.funcionarios_faixa !== "todos")
      query = (query as never as { eq: (c: string, v: string) => typeof query }).eq(
        "funcionarios_faixa",
        data.funcionarios_faixa,
      );
    if (typeof data.lead_time_max === "number")
      query = (query as never as { lte: (c: string, v: number) => typeof query }).lte(
        "lead_time_dias",
        data.lead_time_max,
      );

    if (data.tags.length > 0) query = query.overlaps("tags", data.tags);
    if (data.palavras_chave.length > 0)
      query = (
        query as never as {
          overlaps: (c: string, v: string[]) => typeof query;
        }
      ).overlaps("palavras_chave", data.palavras_chave);
    if (data.certificacoes.length > 0)
      query = (
        query as never as {
          overlaps: (c: string, v: string[]) => typeof query;
        }
      ).overlaps("certificacoes", data.certificacoes);

    const slugs =
      data.categorias.length > 0
        ? data.categorias
        : data.categoria !== "todos"
          ? [data.categoria]
          : [];
    if (slugs.length > 0) {
      const { data: links, error: linkErr } = await supabase
        .from("fornecedor_categoria_link")
        .select("fornecedor_id")
        .in("categoria_slug", slugs);
      if (linkErr) throw friendlyDbError(linkErr);
      const ids = Array.from(new Set((links ?? []).map((r) => r.fornecedor_id)));
      if (ids.length === 0) return { rows: [], total: 0 };
      query = query.in("id", ids);
    }

    const { data: rows, error, count } = await query;
    if (error) throw friendlyDbError(error);
    return { rows: rows ?? [], total: count ?? 0 };
  });

export const listFiltrosPopulares = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("fornecedores")
      .select(
        "tags, palavras_chave, certificacoes, status, ranking, pais, incoterm_padrao, moeda_padrao, funcionarios_faixa, lead_time_dias" as never,
      )
      .is("deleted_at", null)
      .limit(5000);
    if (error) throw friendlyDbError(error);
    const rows = (data ?? []) as unknown[];

    const tallyArr = (key: string) => {
      const m = new Map<string, number>();
      for (const r of rows) {
        const arr = (r as Record<string, unknown>)[key];
        if (!Array.isArray(arr)) continue;
        for (const v of arr) {
          if (typeof v !== "string" || !v.trim()) continue;
          m.set(v, (m.get(v) ?? 0) + 1);
        }
      }
      return [...m.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 30)
        .map(([value, count]) => ({ value, count }));
    };
    const tallyScalar = (key: string) => {
      const m = new Map<string, number>();
      for (const r of rows) {
        const v = (r as Record<string, unknown>)[key];
        if (typeof v !== "string" || !v.trim()) continue;
        m.set(v, (m.get(v) ?? 0) + 1);
      }
      return [...m.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([value, count]) => ({ value, count }));
    };
    // Buckets de lead time para facetar
    const leadBuckets = [
      { value: "≤15", test: (n: number) => n <= 15 },
      { value: "≤30", test: (n: number) => n <= 30 },
      { value: "≤45", test: (n: number) => n <= 45 },
      { value: "≤60", test: (n: number) => n <= 60 },
      { value: "≤90", test: (n: number) => n <= 90 },
    ];
    const leadCounts = leadBuckets.map((b) => {
      let count = 0;
      for (const r of rows) {
        const n = (r as Record<string, unknown>).lead_time_dias;
        if (typeof n === "number" && b.test(n)) count += 1;
      }
      return { value: b.value, max: Number(b.value.replace("≤", "")), count };
    });

    return {
      tags: tallyArr("tags"),
      palavras_chave: tallyArr("palavras_chave"),
      certificacoes: tallyArr("certificacoes"),
      status: tallyScalar("status"),
      ranking: tallyScalar("ranking"),
      pais: tallyScalar("pais"),
      incoterm: tallyScalar("incoterm_padrao"),
      moeda: tallyScalar("moeda_padrao"),
      funcionarios_faixa: tallyScalar("funcionarios_faixa"),
      lead_time_buckets: leadCounts,
      total: rows.length,
    };
  });

export const listCategoriasFornecedor = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("fornecedor_categorias_catalog")
      .select("slug, nome_pt, nome_en, ordem")
      .eq("ativo", true)
      .order("ordem", { ascending: true });
    if (error) throw friendlyDbError(error);
    return data ?? [];
  });

export const getFornecedor = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;

    const { data: f, error } = await supabase
      .from("fornecedores")
      .select("*")
      .eq("id", data.id)
      .is("deleted_at", null)
      .maybeSingle();
    if (error) throw friendlyDbError(error);
    if (!f) throw new Error("Fornecedor não encontrado");

    const [contatosRes, linksRes, anexosRes, notasRes] = await Promise.all([
      supabase
        .from("fornecedor_contatos")
        .select("*")
        .eq("fornecedor_id", data.id)
        .order("principal", { ascending: false }),
      supabase
        .from("fornecedor_categoria_link")
        .select("categoria_slug")
        .eq("fornecedor_id", data.id),
      supabase
        .from("fornecedor_anexos")
        .select("*")
        .eq("fornecedor_id", data.id)
        .is("deleted_at", null)
        .order("created_at", { ascending: false }),
      supabase
        .from("fornecedor_notas")
        .select("*")
        .eq("fornecedor_id", data.id)
        .order("created_at", { ascending: false })
        .limit(50),
    ]);

    if (contatosRes.error) throw new Error(contatosRes.error.message);
    if (linksRes.error) throw new Error(linksRes.error.message);
    if (anexosRes.error) throw new Error(anexosRes.error.message);
    if (notasRes.error) throw new Error(notasRes.error.message);

    // search_tsv (tsvector) não é serializável — descartar antes de devolver.
    const { search_tsv: _omit, ...fornecedor } = f as Record<string, unknown>;
    return {
      fornecedor: fornecedor as Omit<typeof f, "search_tsv">,
      contatos: contatosRes.data ?? [],
      categorias: (linksRes.data ?? []).map((r) => r.categoria_slug),
      anexos: anexosRes.data ?? [],
      notas: notasRes.data ?? [],
    };
  });

const upsertInput = z.object({
  id: z.string().uuid().optional(),
  patch: fornecedorInputSchema,
});

export const upsertFornecedor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => upsertInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    await assertPurchasingRole(supabase, context.userId);
    const { categorias, ...rest } = data.patch;
    const nn = (v: unknown) => (v === "" || v === undefined ? null : v);
    const normalized = {
      ...rest,
      email_corporativo: nn(rest.email_corporativo),
      nome_fantasia: nn(rest.nome_fantasia),
      cidade: nn(rest.cidade),
      endereco: nn(rest.endereco),
      site: nn(rest.site),
      telefone_ddi: nn(rest.telefone_ddi),
      telefone_numero: nn(rest.telefone_numero),
      idioma: nn(rest.idioma),
      observacoes: nn(rest.observacoes),
      // novos campos opcionais
      tax_id: nn(rest.tax_id),
      tax_id_tipo: nn(rest.tax_id_tipo),
      legal_name_local: nn(rest.legal_name_local),
      moeda_padrao: nn(rest.moeda_padrao),
      incoterm_padrao: nn(rest.incoterm_padrao),
      porto_origem: nn(rest.porto_origem),
      payment_terms: nn(rest.payment_terms),
      funcionarios_faixa: nn(rest.funcionarios_faixa),
      capacidade_mensal: nn(rest.capacidade_mensal),
      auditado_em: nn(rest.auditado_em),
      auditor: nn(rest.auditor),
      whatsapp_corp: nn(rest.whatsapp_corp),
      wechat_corp: nn(rest.wechat_corp),
      linkedin_url: nn(rest.linkedin_url),
      alibaba_url: nn(rest.alibaba_url),
      made_in_china_url: nn(rest.made_in_china_url),
      endereco_cep: nn(rest.endereco_cep),
      endereco_estado_provincia: nn(rest.endereco_estado_provincia),
      fuso_horario: nn(rest.fuso_horario),
      responsavel_interno_user_id: nn(rest.responsavel_interno_user_id),
      proxima_revisao_em: nn(rest.proxima_revisao_em),
      motivo_bloqueio: nn(rest.motivo_bloqueio),
      // Dados legais BR / cadastrais genéricos
      inscricao_estadual: nn(rest.inscricao_estadual),
      inscricao_municipal: nn(rest.inscricao_municipal),
      regime_tributario: nn(rest.regime_tributario),
      situacao_cadastral: nn(rest.situacao_cadastral),
      data_abertura: nn(rest.data_abertura),
      capital_social: rest.capital_social ?? null,
      natureza_juridica: nn(rest.natureza_juridica),
      cnae_principal: nn(rest.cnae_principal),
      cnaes_secundarios: rest.cnaes_secundarios ?? [],
    };

    let id = data.id;
    if (id) {
      const { error } = await supabase
        .from("fornecedores")
        .update(normalized as never)
        .eq("id", id);
      if (error) throw friendlyDbError(error);
    } else {
      const { data: created, error } = await supabase
        .from("fornecedores")
        .insert(normalized as never)
        .select("id")
        .single();
      if (error) throw friendlyDbError(error);
      id = created.id;
    }

    // sincroniza categorias
    const { error: delErr } = await supabase
      .from("fornecedor_categoria_link")
      .delete()
      .eq("fornecedor_id", id);
    if (delErr) throw friendlyDbError(delErr);
    if (categorias.length > 0) {
      const { error: insErr } = await supabase.from("fornecedor_categoria_link").insert(
        categorias.map((slug) => ({
          fornecedor_id: id!,
          categoria_slug: slug,
        })),
      );
      if (insErr) throw friendlyDbError(insErr);
    }

    return { id };
  });

export const archiveFornecedor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertPurchasingRole(context.supabase, context.userId);
    const { error } = await context.supabase
      .from("fornecedores")
      .update({ deleted_at: new Date().toISOString(), status: "inativo" })
      .eq("id", data.id);
    if (error) throw friendlyDbError(error);
    return { ok: true };
  });

const contatoUpsertInput = z.object({
  fornecedor_id: z.string().uuid(),
  id: z.string().uuid().optional(),
  patch: contatoInputSchema,
});

export const upsertContatoFornecedor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => contatoUpsertInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const payload = {
      ...data.patch,
      email: data.patch.email || null,
      cargo: data.patch.cargo || null,
      telefone_ddi: data.patch.telefone_ddi || null,
      telefone_numero: data.patch.telefone_numero || null,
      whatsapp: data.patch.whatsapp || null,
      wechat: data.patch.wechat || null,
      fornecedor_id: data.fornecedor_id,
    };

    if (data.id) {
      const { error } = await supabase
        .from("fornecedor_contatos")
        .update(payload)
        .eq("id", data.id);
      if (error) throw friendlyDbError(error);
      return { id: data.id };
    }
    const { data: created, error } = await supabase
      .from("fornecedor_contatos")
      .insert(payload as never)
      .select("id")
      .single();
    if (error) throw friendlyDbError(error);
    return { id: created.id };
  });

export const removeContatoFornecedor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("fornecedor_contatos").delete().eq("id", data.id);
    if (error) throw friendlyDbError(error);
    return { ok: true };
  });

export const addNotaFornecedor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        fornecedor_id: z.string().uuid(),
        texto: z.string().min(2).max(2000),
        tipo: z.string().max(40).optional().default("nota"),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: prof } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", userId)
      .maybeSingle();
    const { error } = await supabase.from("fornecedor_notas").insert({
      fornecedor_id: data.fornecedor_id,
      texto: data.texto,
      tipo: data.tipo,
      user_id: userId,
      user_nome: prof?.full_name || prof?.email || "Usuário",
    } as never);
    if (error) throw friendlyDbError(error);
    return { ok: true };
  });

/* =============================================================
 * Anexos — o upload acontece no client (supabase.storage.from).
 * O server fn registra o metadado depois que o upload sobe.
 * ============================================================= */

const anexoRegisterInput = z.object({
  fornecedor_id: z.string().uuid(),
  storage_path: z.string().min(3),
  nome_original: z.string().min(1).max(300),
  nome_final: z.string().min(1).max(300),
  mime: z.string().max(120).optional().nullable(),
  tamanho: z.number().int().nonnegative().optional().nullable(),
  tipo: z.string().max(40).optional().default("documento"),
  descricao: z.string().max(400).optional().nullable(),
});

export const registerAnexoFornecedor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => anexoRegisterInput.parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("fornecedor_anexos").insert({
      fornecedor_id: data.fornecedor_id,
      storage_bucket: "fornecedores",
      storage_path: data.storage_path,
      nome_original: data.nome_original,
      nome_final: data.nome_final,
      mime: data.mime ?? null,
      tamanho: data.tamanho ?? null,
      tipo: data.tipo ?? "documento",
      descricao: data.descricao ?? null,
    } as never);
    if (error) throw friendlyDbError(error);
    return { ok: true };
  });

export const removeAnexoFornecedor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: row, error: getErr } = await supabase
      .from("fornecedor_anexos")
      .select("storage_path")
      .eq("id", data.id)
      .maybeSingle();
    if (getErr) throw friendlyDbError(getErr);
    const { error } = await supabase
      .from("fornecedor_anexos")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw friendlyDbError(error);
    if (row?.storage_path) {
      // best-effort: remove o arquivo no storage
      await supabase.storage.from("fornecedores").remove([row.storage_path]);
    }
    return { ok: true };
  });

export const getAnexoSignedUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: row, error } = await supabase
      .from("fornecedor_anexos")
      .select("storage_bucket, storage_path, nome_original, descricao")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw friendlyDbError(error);
    if (!row) throw new Error("Anexo não encontrado");
    // Anexos no Google Drive: usa o webViewLink salvo em `descricao`
    if (row.storage_bucket === "google_drive") {
      const url = row.descricao || `https://drive.google.com/file/d/${row.storage_path}/view`;
      return { url, nome: row.nome_original };
    }
    const { data: signed, error: signErr } = await supabase.storage
      .from(row.storage_bucket || "fornecedores")
      .createSignedUrl(row.storage_path, 60 * 10);
    if (signErr) throw friendlyDbError(signErr);
    return { url: signed.signedUrl, nome: row.nome_original };
  });

/* =============================================================
 * Gemini OCR — leitura direta (sem Lovable AI Gateway).
 * Recebe imagens base64 de cartões de visita / folders / catálogos
 * e devolve um JSON estruturado para pré-preencher o cadastro.
 * ============================================================= */

type ScanContato = {
  nome?: string | null;
  cargo?: string | null;
  email?: string | null;
  whatsapp?: string | null;
  wechat?: string | null;
  telefone_numero?: string | null;
};
type ScanExtracted = {
  nome?: string | null;
  nome_fantasia?: string | null;
  pais?: string | null;
  cidade?: string | null;
  endereco?: string | null;
  endereco_original?: string | null;
  site?: string | null;
  email_corporativo?: string | null;
  telefone_ddi?: string | null;
  telefone_numero?: string | null;
  idioma?: string | null;
  categorias_sugeridas?: string[] | null;
  contato_principal?: ScanContato | null;
  observacoes?: string | null;
};

type WebEnrichment = {
  resumo?: string | null;
  produtos_principais?: string[] | null;
  site_oficial?: string | null;
  ano_fundacao?: string | null;
  porte?: string | null;
  certificacoes?: string[] | null;
  mercados_atendidos?: string[] | null;
  funcionarios?: string | null;
  categorias_match?: string[] | null;
  fontes?: string[] | null;
  // ===== Campos avançados (0.53.0) =====
  tax_id?: string | null;
  tax_id_tipo?: string | null;
  legal_name_local?: string | null;
  moeda_padrao?: string | null;
  incoterm_padrao?: string | null;
  porto_origem?: string | null;
  lead_time_dias?: number | null;
  moq?: number | null;
  payment_terms?: string | null;
  funcionarios_faixa?: string | null;
  fabrica_area_m2?: number | null;
  capacidade_mensal?: string | null;
  whatsapp_corp?: string | null;
  wechat_corp?: string | null;
  linkedin_url?: string | null;
  alibaba_url?: string | null;
  made_in_china_url?: string | null;
  endereco_estado_provincia?: string | null;
  fuso_horario?: string | null;
  palavras_chave?: string[] | null;
};

type ScanFailure = {
  message: string;
  status?: number;
  code?: string;
  action?: string;
  logged_at?: string;
  log_id?: string;
};
// Alias mantido para compatibilidade externa do tipo (UI antiga).
export type GeminiFailure = ScanFailure;

const scanInput = z.object({
  imagens: z
    .array(
      z.object({
        base64: z.string().min(20),
        mime: z.string().min(3).max(60),
      }),
    )
    .min(1)
    .max(6),
  contexto: z.string().max(300).optional(),
  enriquecer_web: z.boolean().optional().default(true),
});

const SCAN_PROMPT = `Você é um assistente que extrai dados de cartões de visita, folders e catálogos de fornecedores industriais (principalmente China, EUA, Europa, Brasil).
Analise as imagens enviadas e devolva APENAS um JSON válido (sem markdown, sem comentários) no formato:

{
  "nome": "Razão social ou nome principal",
  "nome_fantasia": "Nome comercial / marca, se houver",
  "pais": "ISO-2 (CN, US, BR, DE, IT, ...)",
  "cidade": "cidade principal",
  "endereco": "endereço completo, se houver",
  "site": "url do site (sem http)",
  "email_corporativo": "email principal",
  "telefone_ddi": "código do país (apenas dígitos, ex: 86, 55)",
  "telefone_numero": "número, apenas dígitos",
  "idioma": "en|zh|pt|es",
  "categorias_sugeridas": ["palavra-chave 1", "palavra-chave 2"],
  "contato_principal": {
    "nome": "nome da pessoa",
    "cargo": "cargo / position",
    "email": "email pessoal se diferente do corporativo",
    "whatsapp": "se houver",
    "wechat": "se houver",
    "telefone_numero": "telefone direto"
  },
  "observacoes": "Resumo curto do que a empresa oferece (1-2 linhas)"
}

Se algum campo não estiver presente, devolva null. Não invente dados. Não traduza nomes próprios.`;

// Somente modelos que realmente aceitam conteúdo multimodal (image_url).
const GROQ_VISION_CANDIDATES = [
  "meta-llama/llama-4-scout-17b-16e-instruct",
  "meta-llama/llama-4-maverick-17b-128e-instruct",
  "qwen/qwen3.6-27b",
];
const GROQ_TEXT_CANDIDATES = [
  "llama-3.3-70b-versatile",
  "openai/gpt-oss-120b",
  "qwen/qwen3.6-27b",
  "openai/gpt-oss-20b",
];

let groqModelCache: { at: number; ids: string[] } | null = null;

async function listGroqModels(apiKey: string): Promise<string[]> {
  if (groqModelCache && Date.now() - groqModelCache.at < 10 * 60 * 1000) {
    return groqModelCache.ids;
  }
  try {
    const r = await fetch("https://api.groq.com/openai/v1/models", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!r.ok) return [];
    const j = (await r.json()) as { data?: Array<{ id?: string }> };
    const ids = (j.data ?? []).map((m) => m.id ?? "").filter(Boolean);
    groqModelCache = { at: Date.now(), ids };
    return ids;
  } catch {
    return [];
  }
}

/** Retorna o primeiro candidato liberado na chave, ou null se nenhum estiver disponível. */
async function pickGroqModel(apiKey: string, candidates: string[]): Promise<string | null> {
  const available = await listGroqModels(apiKey);
  if (!available.length) return candidates[0] ?? null;
  return candidates.find((c) => available.includes(c)) ?? null;
}

function hasCJK(s: string | null | undefined): boolean {
  if (!s) return false;
  return /[\u3000-\u303f\u3400-\u4dbf\u4e00-\u9fff\uff00-\uffef]/.test(s);
}

async function groqJson<T>(apiKey: string, prompt: string, maxTokens = 600): Promise<T | null> {
  try {
    const textModel = await pickGroqModel(apiKey, GROQ_TEXT_CANDIDATES);
    if (!textModel) return null;
    const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
      body: JSON.stringify({
        model: textModel,

        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
        response_format: { type: "json_object" },
        max_completion_tokens: maxTokens,
      }),
    });
    if (!r.ok) return null;
    const j = (await r.json()) as { choices?: Array<{ message?: { content?: string } }> };
    return extractJson<T>(j.choices?.[0]?.message?.content ?? "");
  } catch {
    return null;
  }
}

function buildScanFailure(status: number, body: string, model = "de visão"): ScanFailure {
  let code: string | undefined;
  let providerMessage = body.slice(0, 240);
  try {
    const parsed = JSON.parse(body) as {
      error?: { type?: string; code?: string; message?: string };
    };
    code = parsed.error?.code ?? parsed.error?.type;
    providerMessage = parsed.error?.message ?? providerMessage;
  } catch {
    // Mantém o texto bruto.
  }

  if (status === 401 || status === 403) {
    return {
      status,
      code: code ?? "UNAUTHORIZED",
      message:
        "A conta Groq configurada é inválida ou foi revogada. Atualize a chave em Configurações › Chaves & Diagnóstico e tente novamente.",
      action: providerMessage,
    };
  }

  if (status === 429) {
    return {
      status,
      code: code ?? "RATE_LIMITED",
      message:
        "Limite de requisições do Groq atingido (tier gratuito ~30 req/min). Aguarde alguns segundos e tente novamente.",
      action: providerMessage,
    };
  }

  if (status === 404) {
    return {
      status,
      code: code ?? "NOT_FOUND",
      message: `Modelo ${model} indisponível para esta chave Groq. Ajuste o conector Groq nas Configurações.`,
      action: providerMessage,
    };
  }

  return {
    status,
    code,
    message: `Groq falhou (${status}). Verifique o conector e tente novamente.`,
    action: providerMessage || "Sem detalhes retornados pela API.",
  };
}

async function logGeminiScan(row: {
  user_id: string | null;
  user_email: string | null;
  ok: boolean;
  status?: number | null;
  code?: string | null;
  message?: string | null;
  provider_message?: string | null;
  duration_ms: number;
  imagens_count: number;
  request_context?: string | null;
}): Promise<{ id: string | null; created_at: string }> {
  const created_at = new Date().toISOString();
  try {
    const { getCriticalClient } = await import("@/lib/supabase-client.server");
    const supabaseAdmin = await getCriticalClient();
    const { data, error } = await (
      supabaseAdmin as unknown as {
        from: (t: string) => {
          insert: (v: unknown) => {
            select: (c: string) => {
              single: () => Promise<{ data: { id: string } | null; error: unknown }>;
            };
          };
        };
      }
    )
      .from("gemini_scan_log")
      .insert({ endpoint: "scan_fornecedor", created_at, ...row })
      .select("id")
      .single();
    if (error) return { id: null, created_at };
    return { id: data?.id ?? null, created_at };
  } catch {
    return { id: null, created_at };
  }
}

function extractJson<T>(text: string): T | null {
  try {
    return JSON.parse(text) as T;
  } catch {
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) return null;
    try {
      return JSON.parse(m[0]) as T;
    } catch {
      return null;
    }
  }
}

async function firecrawlSearchMarkdown(
  query: string,
  apiKey: string,
): Promise<{ markdown: string; sources: string[] }> {
  try {
    const r = await fetch("https://api.firecrawl.dev/v2/search", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        query,
        limit: 3,
        scrapeOptions: { formats: ["markdown"], onlyMainContent: true },
      }),
    });
    if (!r.ok) return { markdown: "", sources: [] };
    const j = (await r.json()) as {
      data?: Array<{ url?: string; title?: string; markdown?: string; description?: string }>;
    };
    const items = j.data ?? [];
    const sources = items.map((it) => it.url ?? "").filter(Boolean);
    const markdown = items
      .map((it) => {
        const head = `## ${it.title ?? it.url ?? ""}\n${it.url ?? ""}\n`;
        const body = (it.markdown ?? it.description ?? "").slice(0, 3000);
        return head + body;
      })
      .join("\n\n---\n\n");
    return { markdown, sources };
  } catch {
    return { markdown: "", sources: [] };
  }
}

export const scanFornecedorDocs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => scanInput.parse(d))
  .handler(async ({ data, context }) => {
    const started = Date.now();
    const { userId, supabase } = context;
    const { data: prof } = await supabase
      .from("profiles")
      .select("email")
      .eq("id", userId)
      .maybeSingle();
    const userEmail = prof?.email ?? null;

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      const log = await logGeminiScan({
        user_id: userId,
        user_email: userEmail,
        ok: false,
        status: null,
        code: "MISSING_GROQ_API_KEY",
        message: "Leitura por IA indisponível — a conta Groq não está configurada.",
        provider_message: null,
        duration_ms: Date.now() - started,
        imagens_count: data.imagens.length,
        request_context: data.contexto ?? null,
      });
      const error: ScanFailure = {
        message:
          "Leitura por IA indisponível — configure a conta Groq em Configurações › Chaves & Diagnóstico.",
        code: "MISSING_GROQ_API_KEY",
        logged_at: log.created_at,
        log_id: log.id ?? undefined,
      };
      return {
        ok: false as const,
        raw: "",
        extracted: {} as ScanExtracted,
        web: null,
        error,
      };
    }

    const userContent: Array<Record<string, unknown>> = [{ type: "text", text: SCAN_PROMPT }];
    if (data.contexto) {
      userContent.push({ type: "text", text: `Contexto: ${data.contexto}` });
    }
    for (const img of data.imagens) {
      userContent.push({
        type: "image_url",
        image_url: { url: `data:${img.mime};base64,${img.base64}` },
      });
    }

    const visionModel = await pickGroqModel(apiKey, GROQ_VISION_CANDIDATES);
    if (!visionModel) {
      const msg =
        "Leitura por IA indisponível — nenhum modelo com leitura de imagem está liberado nesta conta Groq. Habilite um modelo de visão no console Groq ou siga com o cadastro manual.";
      const log = await logGeminiScan({
        user_id: userId,
        user_email: userEmail,
        ok: false,
        status: null,
        code: "NO_VISION_MODEL",
        message: msg,
        provider_message: null,
        duration_ms: Date.now() - started,
        imagens_count: data.imagens.length,
        request_context: data.contexto ?? null,
      });
      return {
        ok: false as const,
        raw: "",
        extracted: {} as ScanExtracted,
        web: null,
        error: {
          message: msg,
          code: "NO_VISION_MODEL",
          logged_at: log.created_at,
          log_id: log.id ?? undefined,
        } as ScanFailure,
      };
    }

    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: visionModel,
        messages: [{ role: "user", content: userContent }],
        temperature: 0.1,
        response_format: { type: "json_object" },
        max_completion_tokens: 1500,
      }),
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      const failure = buildScanFailure(res.status, txt, visionModel);

      const log = await logGeminiScan({
        user_id: userId,
        user_email: userEmail,
        ok: false,
        status: res.status,
        code: failure.code ?? null,
        message: failure.message,
        provider_message: failure.action ?? null,
        duration_ms: Date.now() - started,
        imagens_count: data.imagens.length,
        request_context: data.contexto ?? null,
      });
      failure.logged_at = log.created_at;
      failure.log_id = log.id ?? undefined;
      return {
        ok: false as const,
        raw: "",
        extracted: {} as ScanExtracted,
        web: null,
        error: failure,
      };
    }

    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const text = json.choices?.[0]?.message?.content ?? "";
    const extracted = extractJson<ScanExtracted>(text) ?? {};

    // ===== Tradução automática (CJK → PT) =====
    const needsTranslation =
      hasCJK(extracted.endereco) || hasCJK(extracted.cidade) || hasCJK(extracted.nome_fantasia);
    if (needsTranslation) {
      const translated = await groqJson<{
        endereco_pt?: string;
        cidade_pt?: string;
        nome_fantasia_pt?: string;
      }>(
        apiKey,
        `Traduza os seguintes campos do chinês para português brasileiro. Mantenha nomes próprios em pinyin quando aplicável. Retorne APENAS JSON válido sem markdown:
{"endereco_pt":"...","cidade_pt":"...","nome_fantasia_pt":"..."}

Use null para campos vazios. NÃO traduza marcas registradas.

endereco: ${extracted.endereco ?? ""}
cidade: ${extracted.cidade ?? ""}
nome_fantasia: ${extracted.nome_fantasia ?? ""}`,
        400,
      );
      if (translated) {
        if (translated.endereco_pt && hasCJK(extracted.endereco)) {
          extracted.endereco_original = extracted.endereco ?? null;
          extracted.endereco = translated.endereco_pt;
        }
        if (translated.cidade_pt && hasCJK(extracted.cidade)) {
          extracted.cidade = translated.cidade_pt;
        }
        if (translated.nome_fantasia_pt && hasCJK(extracted.nome_fantasia)) {
          extracted.nome_fantasia = translated.nome_fantasia_pt;
        }
      }
    }

    // ===== Lista de categorias do catálogo (para auto-match) =====
    const { data: catalogoRows } = await supabase
      .from("fornecedor_categorias_catalog")
      .select("slug, nome_pt, nome_en")
      .eq("ativo", true);
    const catalogo = (catalogoRows ?? []) as Array<{
      slug: string;
      nome_pt: string;
      nome_en: string | null;
    }>;
    const catalogoStr = catalogo
      .map((c) => `${c.slug}=${c.nome_pt}${c.nome_en ? ` / ${c.nome_en}` : ""}`)
      .join(", ");

    // Enriquecimento web: Firecrawl busca + Groq sumariza em JSON estruturado.
    let web: WebEnrichment | null = null;
    const pista = extracted.nome || extracted.nome_fantasia || extracted.site;
    const firecrawlKey = process.env.FIRECRAWL_API_KEY;
    if (data.enriquecer_web && pista && firecrawlKey) {
      try {
        const q = [
          extracted.nome,
          extracted.nome_fantasia,
          extracted.site,
          extracted.pais ? `country:${extracted.pais}` : "",
          "manufacturer OR supplier",
        ]
          .filter(Boolean)
          .join(" ");
        const { markdown, sources } = await firecrawlSearchMarkdown(q, firecrawlKey);

        if (markdown) {
          const enrichPrompt = `Você é um analista de fornecedores industriais. Com base APENAS no conteúdo abaixo (resultados de busca web), devolva JSON válido sem markdown:
{
  "resumo": "2-3 linhas sobre o que a empresa faz, em português",
  "produtos_principais": ["produto 1", "produto 2"],
  "site_oficial": "url oficial sem http",
  "ano_fundacao": "AAAA",
  "porte": "pequeno|medio|grande",
  "funcionarios": "faixa ex. 50-200",
  "funcionarios_faixa": "1-10|11-50|51-200|201-500|501-1000|1000+",
  "fabrica_area_m2": 0,
  "capacidade_mensal": "ex.: 500 unidades/mês",
  "certificacoes": ["ISO 9001", "CE"],
  "mercados_atendidos": ["Brasil", "EUA"],
  "categorias_match": ["slug1"],
  "tax_id": "USCC/EIN/CNPJ se encontrado",
  "tax_id_tipo": "USCC|EIN|CNPJ|VAT|RUC|RUT|RFC|OTHER",
  "legal_name_local": "razão social no idioma original (CJK quando aplicável)",
  "moeda_padrao": "USD|CNY|EUR|BRL",
  "incoterm_padrao": "FOB|EXW|CIF|DAP|DDP|...",
  "porto_origem": "Shanghai|Ningbo|Shenzhen|...",
  "lead_time_dias": 0,
  "moq": 0,
  "payment_terms": "ex.: 30% T/T antecipado, 70% contra B/L",
  "whatsapp_corp": "+86...",
  "wechat_corp": "id",
  "linkedin_url": "https://linkedin.com/company/...",
  "alibaba_url": "https://...alibaba.com",
  "made_in_china_url": "https://...made-in-china.com",
  "endereco_estado_provincia": "Guangdong|Zhejiang|...",
  "fuso_horario": "Asia/Shanghai",
  "palavras_chave": ["rotary filler","servo capper","hot-fill"],
  "fontes": ["url 1", "url 2"]
}
Regras: campos não encontrados = null. NÃO invente. Números devem ser inteiros (sem unidade). URLs devem incluir https quando aplicável.

Para "categorias_match", escolha APENAS slugs da lista abaixo que se aplicam à empresa (pode escolher múltiplas):
${catalogoStr || "(nenhuma categoria disponível)"}

Dados já conhecidos: nome="${extracted.nome ?? ""}" fantasia="${extracted.nome_fantasia ?? ""}" site="${extracted.site ?? ""}" pais="${extracted.pais ?? ""}".

CONTEÚDO:
${markdown.slice(0, 12000)}`;

          web = await groqJson<WebEnrichment>(apiKey, enrichPrompt, 1400);
          if (web && (!web.fontes || web.fontes.length === 0) && sources.length) {
            web.fontes = sources;
          }
        }
      } catch {
        web = null;
      }

      if (web) {
        if (!extracted.site && web.site_oficial) extracted.site = web.site_oficial;
        if (web.produtos_principais?.length) {
          extracted.categorias_sugeridas = Array.from(
            new Set([...(extracted.categorias_sugeridas ?? []), ...web.produtos_principais]),
          );
        }
      }
    }

    await logGeminiScan({
      user_id: userId,
      user_email: userEmail,
      ok: true,
      status: 200,
      code: "OK",
      message: null,
      provider_message: null,
      duration_ms: Date.now() - started,
      imagens_count: data.imagens.length,
      request_context: data.contexto ?? null,
    });

    return { ok: true as const, raw: text, extracted, web };
  });

const logsInput = z.object({
  limit: z.number().int().min(1).max(100).default(20),
  only_failures: z.boolean().optional().default(false),
});

export type GeminiScanLogRow = {
  id: string;
  created_at: string;
  user_email: string | null;
  ok: boolean;
  status: number | null;
  code: string | null;
  message: string | null;
  provider_message: string | null;
  duration_ms: number | null;
  imagens_count: number | null;
};

export const listGeminiScanLogs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => logsInput.parse(d))
  .handler(async ({ data, context }): Promise<{ rows: GeminiScanLogRow[]; available: boolean }> => {
    const { supabase } = context;
    const base = (
      supabase as unknown as {
        from: (t: string) => {
          select: (c: string) => {
            eq: (
              col: string,
              val: unknown,
            ) => {
              order: (
                col: string,
                opts: { ascending: boolean },
              ) => {
                limit: (n: number) => Promise<{ data: GeminiScanLogRow[] | null; error: unknown }>;
              };
            };
            order: (
              col: string,
              opts: { ascending: boolean },
            ) => {
              limit: (n: number) => Promise<{ data: GeminiScanLogRow[] | null; error: unknown }>;
            };
          };
        };
      }
    )
      .from("gemini_scan_log")
      .select(
        "id, created_at, user_email, ok, status, code, message, provider_message, duration_ms, imagens_count",
      );
    const result = data.only_failures
      ? await base.eq("ok", false).order("created_at", { ascending: false }).limit(data.limit)
      : await base.order("created_at", { ascending: false }).limit(data.limit);
    if (result.error) {
      return { rows: [], available: false };
    }
    return { rows: result.data ?? [], available: true };
  });

/* =============================================================
 * Upload de imagens do scan para o Google Drive
 * Pasta: Fornecedores / {codigo} - {nome} / Scans
 * ============================================================= */

const driveUploadInput = z.object({
  fornecedor_id: z.string().uuid(),
  imagens: z
    .array(
      z.object({
        base64: z.string().min(20),
        mime: z.string().min(3).max(60),
        tipo: z.string().max(40).optional().default("cartao"),
      }),
    )
    .min(1)
    .max(6),
});

function extFromMime(mime: string): string {
  const m = mime.toLowerCase();
  if (m.includes("png")) return "png";
  if (m.includes("webp")) return "webp";
  if (m.includes("gif")) return "gif";
  if (m.includes("pdf")) return "pdf";
  return "jpg";
}

function sanitizeFolderName(s: string): string {
  return (
    s
      .replace(/[\\/:*?"<>|]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 80) || "fornecedor"
  );
}

export const uploadScanToDrive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => driveUploadInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: f, error: fErr } = await supabase
      .from("fornecedores")
      .select("id, codigo, nome")
      .eq("id", data.fornecedor_id)
      .maybeSingle();
    if (fErr) throw friendlyDbError(fErr);
    if (!f) throw new Error("Fornecedor não encontrado");

    const { driveConfigured } = await import("@/lib/docs/drive-auth.server");
    if (!(await driveConfigured())) {
      return {
        ok: false as const,
        error:
          "Google Drive indisponível — a integração não está configurada. Você pode seguir sem o arquivamento automático.",
        uploaded: [] as Array<{ id: string; url: string; nome: string }>,
      };
    }

    const folderName = sanitizeFolderName(`${f.codigo} - ${f.nome}`);
    const { ensurePath, uploadFile } = await import("@/lib/docs/drive.server");
    const parentId = await ensurePath(["Fornecedores", folderName, "Scans"]);

    const uploaded: Array<{ id: string; url: string; nome: string }> = [];
    const ts = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14);
    for (let i = 0; i < data.imagens.length; i++) {
      const img = data.imagens[i];
      const ext = extFromMime(img.mime);
      const nome_final = `${f.codigo}_${img.tipo ?? "scan"}_${ts}_${i + 1}.${ext}`;
      try {
        const bytes = Uint8Array.from(atob(img.base64), (c) => c.charCodeAt(0));
        const { id, webViewLink } = await uploadFile({
          name: nome_final,
          parentId,
          bytes,
          mimeType: img.mime,
        });
        await supabase.from("fornecedor_anexos").insert({
          fornecedor_id: data.fornecedor_id,
          storage_bucket: "google_drive",
          storage_path: id,
          nome_original: `scan_${i + 1}.${ext}`,
          nome_final,
          mime: img.mime,
          tamanho: bytes.byteLength,
          tipo: img.tipo ?? "cartao",
          descricao: webViewLink,
        } as never);
        uploaded.push({ id, url: webViewLink, nome: nome_final });
      } catch (e) {
        // segue para o próximo arquivo
        console.error("[scan→drive]", (e as Error).message);
      }
    }
    const driveFolderUrl = `https://drive.google.com/drive/folders/${parentId}`;
    return { ok: true as const, uploaded, folder_id: parentId, folder_url: driveFolderUrl };
  });

/* =============================================================
 * Submissões (histórico de scans + enriquecimento) por fornecedor
 * ============================================================= */

const linkSubmissaoInput = z.object({
  fornecedor_id: z.string().uuid(),
  origem: z.enum(["scan", "reenrich"]).default("scan"),
  imagens_count: z.number().int().nonnegative().default(0),
  extracted: z.any().optional().nullable(),
  enrichment: z.any().optional().nullable(),
  endereco_original: z.string().optional().nullable(),
  drive_folder_id: z.string().optional().nullable(),
  drive_files: z.any().optional().nullable(),
  ok: z.boolean().default(true),
  error: z.string().optional().nullable(),
});

type JsonValue = string | number | boolean | null | { [k: string]: JsonValue } | JsonValue[];

export type ScanSubmissaoRow = {
  id: string;
  fornecedor_id: string;
  origem: string;
  imagens_count: number;
  extracted: JsonValue;
  enrichment: JsonValue;
  endereco_original: string | null;
  drive_folder_id: string | null;
  drive_files: JsonValue;
  ok: boolean;
  error: string | null;
  created_at: string;
  created_by_email: string | null;
};

export const linkScanSubmissao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => linkSubmissaoInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: prof } = await supabase
      .from("profiles")
      .select("email")
      .eq("id", userId)
      .maybeSingle();
    const payload = {
      fornecedor_id: data.fornecedor_id,
      origem: data.origem,
      imagens_count: data.imagens_count,
      extracted: data.extracted ?? null,
      enrichment: data.enrichment ?? null,
      endereco_original: data.endereco_original ?? null,
      drive_folder_id: data.drive_folder_id ?? null,
      drive_files: data.drive_files ?? null,
      ok: data.ok,
      error: data.error ?? null,
      created_by: userId,
      created_by_email: prof?.email ?? null,
    };
    const { data: row, error } = await (
      supabase as unknown as {
        from: (t: string) => {
          insert: (v: unknown) => {
            select: (c: string) => {
              single: () => Promise<{
                data: { id: string } | null;
                error: { message: string } | null;
              }>;
            };
          };
        };
      }
    )
      .from("fornecedor_scan_submissoes")
      .insert(payload)
      .select("id")
      .single();
    if (error) throw friendlyDbError(error);
    return { id: row?.id ?? null };
  });

export const listScanSubmissoes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ fornecedor_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }): Promise<{ rows: ScanSubmissaoRow[] }> => {
    const { supabase } = context;
    const r = await (
      supabase as unknown as {
        from: (t: string) => {
          select: (c: string) => {
            eq: (
              col: string,
              val: unknown,
            ) => {
              order: (
                col: string,
                opts: { ascending: boolean },
              ) => {
                limit: (n: number) => Promise<{
                  data: ScanSubmissaoRow[] | null;
                  error: { message: string } | null;
                }>;
              };
            };
          };
        };
      }
    )
      .from("fornecedor_scan_submissoes")
      .select(
        "id, fornecedor_id, origem, imagens_count, extracted, enrichment, endereco_original, drive_folder_id, drive_files, ok, error, created_at, created_by_email",
      )
      .eq("fornecedor_id", data.fornecedor_id)
      .order("created_at", { ascending: false })
      .limit(50);
    if (r.error) return { rows: [] };
    return { rows: r.data ?? [] };
  });

/* =============================================================
 * Re-enriquecer fornecedor: re-roda enriquecimento web (Firecrawl + Groq)
 * usando dados atuais do fornecedor. Atualiza categorias e observações
 * e grava entrada no histórico de submissões.
 * ============================================================= */

export const reenriquecerFornecedor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ fornecedor_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const apiKey = process.env.GROQ_API_KEY;
    const firecrawlKey = process.env.FIRECRAWL_API_KEY;

    const { data: f, error: fErr } = await supabase
      .from("fornecedores")
      .select("*")
      .eq("id", data.fornecedor_id)
      .maybeSingle();
    if (fErr) throw friendlyDbError(fErr);
    if (!f) throw new Error("Fornecedor não encontrado");

    if (!apiKey || !firecrawlKey) {
      const msg = !apiKey
        ? "Leitura por IA indisponível — configure a conta Groq em Configurações › Chaves & Diagnóstico."
        : "Busca web indisponível — configure o Firecrawl em Configurações › Chaves & Diagnóstico.";
      return { ok: false as const, error: msg, web: null as WebEnrichment | null };
    }

    const { data: catalogoRows } = await supabase
      .from("fornecedor_categorias_catalog")
      .select("slug, nome_pt, nome_en")
      .eq("ativo", true);
    const catalogo = (catalogoRows ?? []) as Array<{
      slug: string;
      nome_pt: string;
      nome_en: string | null;
    }>;
    const catalogoStr = catalogo
      .map((c) => `${c.slug}=${c.nome_pt}${c.nome_en ? ` / ${c.nome_en}` : ""}`)
      .join(", ");

    const q = [
      f.nome,
      f.nome_fantasia,
      f.site,
      f.pais ? `country:${f.pais}` : "",
      "manufacturer OR supplier",
    ]
      .filter(Boolean)
      .join(" ");
    const { markdown, sources } = await firecrawlSearchMarkdown(q, firecrawlKey);

    let web: WebEnrichment | null = null;
    if (markdown) {
      const enrichPrompt = `Você é um analista de fornecedores industriais. Com base APENAS no conteúdo abaixo, devolva JSON válido sem markdown:
{
  "resumo": "2-3 linhas em português",
  "produtos_principais": ["..."],
  "site_oficial": "url sem http",
  "ano_fundacao": "AAAA",
  "porte": "pequeno|medio|grande",
  "funcionarios": "faixa",
  "funcionarios_faixa": "1-10|11-50|51-200|201-500|501-1000|1000+",
  "fabrica_area_m2": 0,
  "capacidade_mensal": "ex.: 500 unidades/mês",
  "certificacoes": ["ISO 9001"],
  "mercados_atendidos": ["Brasil"],
  "categorias_match": ["slug1"],
  "tax_id": "USCC/EIN/CNPJ se encontrado",
  "tax_id_tipo": "USCC|EIN|CNPJ|VAT|RUC|RUT|RFC|OTHER",
  "legal_name_local": "razão social no idioma original",
  "moeda_padrao": "USD|CNY|EUR|BRL",
  "incoterm_padrao": "FOB|EXW|CIF|DAP|DDP|...",
  "porto_origem": "Shanghai|...",
  "lead_time_dias": 0,
  "moq": 0,
  "payment_terms": "ex.: 30% T/T + 70% B/L",
  "whatsapp_corp": "+86...",
  "wechat_corp": "id",
  "linkedin_url": "https://linkedin.com/company/...",
  "alibaba_url": "https://...alibaba.com",
  "made_in_china_url": "https://...made-in-china.com",
  "endereco_estado_provincia": "Guangdong|...",
  "fuso_horario": "Asia/Shanghai",
  "palavras_chave": ["rotary filler","servo capper"],
  "fontes": ["url 1"]
}
Campos não encontrados = null. NÃO invente. Para "categorias_match", apenas slugs da lista: ${catalogoStr || "(vazio)"}
Dados conhecidos: nome="${f.nome ?? ""}" fantasia="${f.nome_fantasia ?? ""}" site="${f.site ?? ""}" pais="${f.pais ?? ""}".
CONTEÚDO:
${markdown.slice(0, 12000)}`;
      web = await groqJson<WebEnrichment>(apiKey, enrichPrompt, 1400);
      if (web && (!web.fontes || web.fontes.length === 0) && sources.length) {
        web.fontes = sources;
      }
    }

    // Atualiza fornecedor (campos avançados sem sobrescrever + observações + categorias)
    if (web) {
      const novoTrecho = [
        web.resumo ? `Resumo (web): ${web.resumo}` : "",
        web.ano_fundacao ? `Fundada em ${web.ano_fundacao}.` : "",
        web.porte ? `Porte: ${web.porte}.` : "",
        web.funcionarios ? `Funcionários: ${web.funcionarios}.` : "",
        web.certificacoes?.length ? `Certificações: ${web.certificacoes.join(", ")}.` : "",
        web.mercados_atendidos?.length ? `Mercados: ${web.mercados_atendidos.join(", ")}.` : "",
        web.fontes?.length ? `Fontes: ${web.fontes.slice(0, 3).join(" | ")}` : "",
      ]
        .filter(Boolean)
        .join("\n");
      const tagReenrich = `\n\n--- Re-enriquecido ${new Date().toLocaleString("pt-BR")} ---\n${novoTrecho}`;

      // Merge: só preenche se o campo atual estiver vazio.
      const fRow = f as unknown as Record<string, unknown>;
      const keep = <T>(curr: T, val: T | undefined | null): T => {
        const isEmpty = curr === null || curr === undefined || curr === "";
        return isEmpty && val !== undefined && val !== null && val !== "" ? val : curr;
      };
      const mergeArr = (
        curr: string[] | null | undefined,
        val: string[] | null | undefined,
      ): string[] => {
        const a = Array.isArray(curr) ? curr : [];
        const b = Array.isArray(val) ? val : [];
        return Array.from(new Set([...a, ...b]));
      };
      const updatePatch: Record<string, unknown> = {
        observacoes: ((f.observacoes ?? "") + tagReenrich).slice(0, 8000),
        tax_id: keep(fRow.tax_id as string | null, web.tax_id ?? null),
        tax_id_tipo: keep(fRow.tax_id_tipo as string | null, web.tax_id_tipo ?? null),
        legal_name_local: keep(
          fRow.legal_name_local as string | null,
          web.legal_name_local ?? null,
        ),
        moeda_padrao: keep(fRow.moeda_padrao as string | null, web.moeda_padrao ?? null),
        incoterm_padrao: keep(fRow.incoterm_padrao as string | null, web.incoterm_padrao ?? null),
        porto_origem: keep(fRow.porto_origem as string | null, web.porto_origem ?? null),
        lead_time_dias: keep(fRow.lead_time_dias as number | null, web.lead_time_dias ?? null),
        moq: keep(fRow.moq as number | null, web.moq ?? null),
        payment_terms: keep(fRow.payment_terms as string | null, web.payment_terms ?? null),
        funcionarios_faixa: keep(
          fRow.funcionarios_faixa as string | null,
          web.funcionarios_faixa ?? null,
        ),
        fabrica_area_m2: keep(fRow.fabrica_area_m2 as number | null, web.fabrica_area_m2 ?? null),
        capacidade_mensal: keep(
          fRow.capacidade_mensal as string | null,
          web.capacidade_mensal ?? null,
        ),
        whatsapp_corp: keep(fRow.whatsapp_corp as string | null, web.whatsapp_corp ?? null),
        wechat_corp: keep(fRow.wechat_corp as string | null, web.wechat_corp ?? null),
        linkedin_url: keep(fRow.linkedin_url as string | null, web.linkedin_url ?? null),
        alibaba_url: keep(fRow.alibaba_url as string | null, web.alibaba_url ?? null),
        made_in_china_url: keep(
          fRow.made_in_china_url as string | null,
          web.made_in_china_url ?? null,
        ),
        endereco_estado_provincia: keep(
          fRow.endereco_estado_provincia as string | null,
          web.endereco_estado_provincia ?? null,
        ),
        fuso_horario: keep(fRow.fuso_horario as string | null, web.fuso_horario ?? null),
        certificacoes: mergeArr(fRow.certificacoes as string[] | null, web.certificacoes ?? null),
        palavras_chave: mergeArr(
          fRow.palavras_chave as string[] | null,
          web.palavras_chave ?? null,
        ),
      };
      await supabase
        .from("fornecedores")
        .update(updatePatch as never)
        .eq("id", f.id);

      const matched = Array.isArray(web.categorias_match) ? web.categorias_match : [];
      if (matched.length) {
        const existRes = await supabase
          .from("fornecedor_categoria_link")
          .select("categoria_slug")
          .eq("fornecedor_id", f.id);
        const existing = new Set((existRes.data ?? []).map((r) => r.categoria_slug));
        const toInsert = matched
          .filter((slug) => !existing.has(slug))
          .map((slug) => ({ fornecedor_id: f.id, categoria_slug: slug }));
        if (toInsert.length) {
          await supabase.from("fornecedor_categoria_link").insert(toInsert);
        }
      }
    }

    // Grava no histórico
    try {
      const { data: prof } = await supabase
        .from("profiles")
        .select("email")
        .eq("id", userId)
        .maybeSingle();
      await (
        supabase as unknown as {
          from: (t: string) => { insert: (v: unknown) => Promise<{ error: unknown }> };
        }
      )
        .from("fornecedor_scan_submissoes")
        .insert({
          fornecedor_id: f.id,
          origem: "reenrich",
          imagens_count: 0,
          enrichment: web ?? null,
          ok: !!web,
          error: web ? null : "Sem resultados do enriquecimento web.",
          created_by: userId,
          created_by_email: prof?.email ?? null,
        });
    } catch {
      // best-effort
    }

    return { ok: true as const, web };
  });
