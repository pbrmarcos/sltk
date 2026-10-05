/**
 * Motor de qualificação de leads com IA — compartilhado pela mineração (Penta)
 * e pelo fluxo "suspect por foto". Estágios do mais barato ao mais caro:
 *
 *   1. Filtro de nicho proibido (sem IA) → C na hora.
 *   2. Leitura do site (Firecrawl): CNPJ, e-mails, telefones, WhatsApp, resumo.
 *   3. Documento fiscal: se faltar e país=BR, Gemini com busca Google acha o
 *      CNPJ — e TODO documento é verificado na Receita (BrasilAPI/ReceitaWS)
 *      conferindo nome/cidade. Nunca aceita documento não verificado.
 *   4. "Já é cliente": raiz do CNPJ ou nome bate na tabela clientes → C.
 *   5. Regras duras (config): sem contato, cadastro inativo, MEI → C sem IA.
 *   6. Qualificação final no Gemini (com a foto, quando houver): perfil ideal
 *      + clientes reais de comparação + tudo coletado → grade A/B/C + motivo.
 *
 * Cada estágio degrada em falha (segue com menos dados); nunca lança.
 */

import { onlyDigits, type EnrichedCliente } from "@/lib/enrich/types";
import type { AiVisionImage } from "@/lib/ai-gateway.server";

export type QualifyInput = {
  empresa: string;
  pais?: string | null;
  cidade?: string | null;
  telefone?: string | null;
  email?: string | null;
  site?: string | null;
  documento?: string | null;
  /** Categoria/segmento detectado (foto) ou rubro/NCM (Penta). */
  segmento?: string | null;
  origem: "penta" | "foto" | "ficha";
  /** Cliente que está sendo minerado — não conta como "já é cliente". */
  excluirClienteId?: string | null;
  /** Texto livre com o que mais se sabe (NCMs/valores da Penta, produto da foto). */
  extras?: string | null;
  imagens?: AiVisionImage[];
  userId?: string | null;
};

export type QualifySiteInfo = {
  resumo?: string | null;
  documento?: string | null;
  emails?: string[];
  telefones?: string[];
  whatsapp?: string | null;
};

export type QualifyResult = {
  grade: "A" | "B" | "C";
  motivo: string;
  abordagem_sugerida?: string | null;
  produtos_sltk?: string[];
  ja_cliente?: { id: string; nome: string } | null;
  dados: {
    site?: QualifySiteInfo | null;
    receita?: Partial<EnrichedCliente> | null;
    documento_verificado?: string | null;
    telefone?: string | null;
    email?: string | null;
  };
  etapas: string[];
};

type RegrasDuras = { sem_contato?: boolean; doc_inativo?: boolean; mei?: boolean };

type ProspeccaoConfig = {
  perfil_ideal: string;
  nichos_proibidos: string[];
  regras_duras: RegrasDuras;
  max_leads_auto: number;
};

const DEFAULT_CONFIG: ProspeccaoConfig = {
  perfil_ideal: "Indústrias que envasam ou embalam produto físico.",
  nichos_proibidos: [],
  regras_duras: { sem_contato: true, doc_inativo: true, mei: true },
  max_leads_auto: 50,
};

export async function loadProspeccaoConfig(): Promise<ProspeccaoConfig> {
  try {
    const { getCriticalClient } = await import("@/lib/supabase-client.server");
    const admin = await getCriticalClient();
    const { data } = await (
      admin as unknown as {
        from: (t: string) => {
          select: (c: string) => {
            eq: (c: string, v: number) => { maybeSingle: () => Promise<{ data: unknown }> };
          };
        };
      }
    )
      .from("prospeccao_config")
      .select("perfil_ideal, nichos_proibidos, regras_duras, max_leads_auto")
      .eq("id", 1)
      .maybeSingle();
    if (!data) return DEFAULT_CONFIG;
    const d = data as Partial<ProspeccaoConfig>;
    return {
      perfil_ideal: d.perfil_ideal || DEFAULT_CONFIG.perfil_ideal,
      nichos_proibidos: Array.isArray(d.nichos_proibidos) ? d.nichos_proibidos : [],
      regras_duras: { ...DEFAULT_CONFIG.regras_duras, ...(d.regras_duras ?? {}) },
      max_leads_auto: d.max_leads_auto ?? DEFAULT_CONFIG.max_leads_auto,
    };
  } catch (e) {
    console.warn("[lead-qualify] config de prospecção indisponível — usando padrão", e);
    return DEFAULT_CONFIG;
  }
}

function norm(s: string | null | undefined): string {
  return (s ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/** "varejo / revenda sem produção própria" casa se o texto contiver "varejo" OU "revenda...". */
function nichoProibidoMatch(nichos: string[], texto: string): string | null {
  const alvo = norm(texto);
  if (!alvo) return null;
  for (const nicho of nichos) {
    const alternativas = nicho
      .split("/")
      .map((a) => norm(a).trim())
      .filter((a) => a.length >= 3);
    for (const alt of alternativas) {
      const chave = alt.split(" ")[0];
      if (chave.length >= 4 && alvo.includes(chave)) return nicho;
    }
  }
  return null;
}

async function lerSite(site: string, pais?: string | null): Promise<QualifySiteInfo | null> {
  try {
    const { firecrawlScrapeJson } = await import("@/lib/enrich/firecrawl.server");
    const url = site.startsWith("http") ? site : `https://${site}`;
    const r = await Promise.race([
      firecrawlScrapeJson<QualifySiteInfo>({
        url,
        prompt:
          "Desta página (e do que ela diz sobre a empresa), extraia JSON: " +
          '{"resumo": "2-3 frases sobre o que a empresa FAZ/PRODUZ", ' +
          '"documento": "CNPJ/RUT/RUC/NIT fiscal se aparecer (com pontuação original)", ' +
          '"emails": ["..."], "telefones": ["..."], ' +
          '"whatsapp": "número de WhatsApp se houver botão/menção"}. ' +
          "Campos não encontrados = null. NÃO invente.",
        waitFor: 2000,
        ...(pais ? { country: pais } : {}),
      }),
      new Promise<{ ok: false; error: string }>((resolve) =>
        setTimeout(() => resolve({ ok: false, error: "timeout 45s" }), 45_000),
      ),
    ]);
    return r.ok ? r.data : null;
  } catch (e) {
    console.warn("[lead-qualify] leitura do site falhou", e);
    return null;
  }
}

/** Gemini + busca Google só pra achar o CNPJ. O retorno NUNCA é usado sem verificação na Receita. */
async function descobrirCnpjViaBusca(
  empresa: string,
  cidade?: string | null,
): Promise<string | null> {
  try {
    const { aiChatComplete } = await import("@/lib/ai-gateway.server");
    const raw = await aiChatComplete({
      userContent: `Qual é o CNPJ da empresa brasileira "${empresa}"${cidade ? ` de ${cidade}` : ""}? Pesquise na internet. Responda APENAS com o CNPJ no formato XX.XXX.XXX/XXXX-XX, ou "NAO_ENCONTRADO" se não tiver certeza. Não explique.`,
      webSearch: true,
      maxOutputTokens: 100,
    });
    const digits = onlyDigits(raw);
    return digits.length === 14 ? digits : null;
  } catch (e) {
    console.warn("[lead-qualify] busca de CNPJ falhou", e);
    return null;
  }
}

function nomeBate(razaoReceita: string | undefined, empresa: string): boolean {
  const a = norm(razaoReceita);
  const b = norm(empresa);
  if (!a || !b) return false;
  const tokens = b.split(/\s+/).filter((t) => t.length >= 4);
  if (tokens.length === 0) return a.includes(b) || b.includes(a.split(/\s+/)[0] ?? "");
  return tokens.some((t) => a.includes(t));
}

async function verificarNaReceita(
  cnpjDigits: string,
  empresa: string,
  cidade?: string | null,
): Promise<Partial<EnrichedCliente> | null> {
  try {
    const { enrichBrasilApi, enrichReceitaWs } = await import("@/lib/enrich/br.server");
    const r = (await enrichBrasilApi(cnpjDigits)) ?? (await enrichReceitaWs(cnpjDigits));
    if (!r) return null;
    const cidadeBate = cidade
      ? norm(r.endereco_cidade).includes(norm(cidade).split(" ")[0])
      : false;
    if (!nomeBate(r.razao_social, empresa) && !nomeBate(r.nome_fantasia, empresa) && !cidadeBate) {
      return null; // documento achado não é desta empresa — descarta
    }
    return r;
  } catch (e) {
    console.warn("[lead-qualify] consulta à Receita falhou", e);
    return null;
  }
}

async function buscarClienteExistente(
  docDigits: string | null,
  telefone: string | null,
  empresa: string,
  excluirId?: string | null,
): Promise<{ id: string; nome: string } | null> {
  try {
    const { getCriticalClient } = await import("@/lib/supabase-client.server");
    const admin = await getCriticalClient();
    const sb = admin as unknown as {
      from: (t: string) => {
        select: (c: string) => {
          ilike: (
            c: string,
            v: string,
          ) => {
            limit: (
              n: number,
            ) => Promise<{ data: Array<{ id: string; razao_social: string }> | null }>;
          };
        };
      };
    };
    if (docDigits && docDigits.length >= 8) {
      const raiz = docDigits.slice(0, 8);
      const { data } = await sb
        .from("clientes")
        .select("id, razao_social")
        .ilike("documento_fiscal_numero", `${raiz}%`)
        .limit(3);
      const hit = data?.find((d) => d.id !== excluirId);
      if (hit) return { id: hit.id, nome: hit.razao_social };
    }
    const alvo = norm(empresa);
    if (alvo.length >= 6) {
      const { data } = await sb
        .from("clientes")
        .select("id, razao_social")
        .ilike("razao_social", `%${empresa.slice(0, 40)}%`)
        .limit(3);
      const hit = data?.find((d) => d.id !== excluirId);
      if (hit) return { id: hit.id, nome: hit.razao_social };
    }
    void telefone;
    return null;
  } catch (e) {
    console.warn("[lead-qualify] checagem de cliente existente falhou", e);
    return null;
  }
}

async function clientesDeComparacao(): Promise<string[]> {
  try {
    const { getCriticalClient } = await import("@/lib/supabase-client.server");
    const admin = await getCriticalClient();
    const { data } = await (
      admin as unknown as {
        from: (t: string) => {
          select: (c: string) => {
            eq: (
              c: string,
              v: string,
            ) => {
              order: (
                c: string,
                o: { ascending: boolean },
              ) => {
                limit: (n: number) => Promise<{ data: Array<{ razao_social: string }> | null }>;
              };
            };
          };
        };
      }
    )
      .from("clientes")
      .select("razao_social")
      .eq("status", "ativo")
      .order("valor_ganho_total", { ascending: false })
      .limit(5);
    return (data ?? []).map((c) => c.razao_social);
  } catch (e) {
    console.warn("[lead-qualify] clientes de comparação indisponíveis", e);
    return [];
  }
}

async function logQualify(args: {
  userId: string | null;
  ok: boolean;
  message: string | null;
  duration_ms: number;
  contexto: string;
}): Promise<void> {
  try {
    const { getCriticalClient } = await import("@/lib/supabase-client.server");
    const admin = await getCriticalClient();
    await (
      admin as unknown as { from: (t: string) => { insert: (v: unknown) => Promise<unknown> } }
    )
      .from("gemini_scan_log")
      .insert({
        endpoint: "lead_qualify",
        user_id: args.userId,
        user_email: null,
        ok: args.ok,
        status: args.ok ? 200 : 500,
        code: args.ok ? "OK" : "ERRO",
        message: args.message,
        provider_message: null,
        duration_ms: args.duration_ms,
        imagens_count: 0,
        request_context: args.contexto.slice(0, 280),
        created_at: new Date().toISOString(),
      });
  } catch {
    /* log nunca derruba o fluxo */
  }
}

export async function qualificarLead(input: QualifyInput): Promise<QualifyResult> {
  const started = Date.now();
  const etapas: string[] = [];
  const config = await loadProspeccaoConfig();

  const dados: QualifyResult["dados"] = {
    telefone: input.telefone ?? null,
    email: input.email ?? null,
  };

  // ===== 1) Nicho proibido — sem gastar IA =====
  const textoNicho = [input.segmento, input.extras].filter(Boolean).join(" · ");
  const nicho = nichoProibidoMatch(config.nichos_proibidos, textoNicho);
  if (nicho) {
    etapas.push(`nicho proibido: ${nicho}`);
    return {
      grade: "C",
      motivo: `Nicho fora do perfil (${nicho}) — reprovado sem análise de IA.`,
      dados,
      etapas,
    };
  }
  etapas.push("nicho ok");

  // ===== 2) Leitura do site =====
  let docDigits = input.documento ? onlyDigits(input.documento) : "";
  if (input.site) {
    const site = await lerSite(input.site, input.pais);
    dados.site = site;
    etapas.push(site ? "site lido" : "site ilegível");
    if (site) {
      if (!docDigits && site.documento) docDigits = onlyDigits(site.documento);
      if (!dados.telefone && site.telefones?.length) dados.telefone = site.telefones[0];
      if (!dados.telefone && site.whatsapp) dados.telefone = site.whatsapp;
      if (!dados.email && site.emails?.length) dados.email = site.emails[0];
    }
  }

  // ===== 3) Documento: descobrir (BR) e SEMPRE verificar na Receita =====
  const paisNorm = norm(input.pais ?? "br");
  const isBR = paisNorm === "br" || paisNorm.includes("brasil") || paisNorm.includes("brazil");
  if (isBR && docDigits.length !== 14) {
    const achado = await descobrirCnpjViaBusca(input.empresa, input.cidade);
    if (achado) {
      docDigits = achado;
      etapas.push("cnpj via busca google");
    } else {
      etapas.push("cnpj não encontrado na busca");
    }
  }
  if (isBR && docDigits.length === 14) {
    const receita = await verificarNaReceita(docDigits, input.empresa, input.cidade);
    if (receita) {
      dados.receita = receita;
      dados.documento_verificado = docDigits;
      etapas.push("cnpj verificado na receita");
      if (!dados.telefone && receita.telefone_corporativo_numero) {
        dados.telefone = `${receita.telefone_corporativo_ddi ?? ""}${receita.telefone_corporativo_numero}`;
      }
      if (!dados.email && receita.email_corporativo) dados.email = receita.email_corporativo;
    } else {
      docDigits = "";
      etapas.push("cnpj descartado (não bateu nome/cidade na receita)");
    }
  }

  // ===== 4) Já é cliente? =====
  const jaCliente = await buscarClienteExistente(
    dados.documento_verificado ?? null,
    dados.telefone ?? null,
    input.empresa,
    input.excluirClienteId,
  );
  if (jaCliente) {
    etapas.push("já é cliente");
    return {
      grade: "C",
      motivo: `Já é cliente da SLTK (${jaCliente.nome}).`,
      ja_cliente: jaCliente,
      dados,
      etapas,
    };
  }
  etapas.push("não é cliente");

  // ===== 5) Regras duras =====
  const rd = config.regras_duras;
  if (rd.sem_contato && !dados.telefone && !dados.email && !input.site) {
    etapas.push("regra dura: sem contato");
    return {
      grade: "C",
      motivo: "Sem nenhum canal de contato (telefone, e-mail ou site) — reprovado sem IA.",
      dados,
      etapas,
    };
  }
  const situacao = norm(dados.receita?.situacao_cadastral);
  if (rd.doc_inativo && situacao && !situacao.includes("ativa")) {
    etapas.push("regra dura: cadastro inativo");
    return {
      grade: "C",
      motivo: `Situação cadastral "${dados.receita?.situacao_cadastral}" na Receita — reprovado sem IA.`,
      dados,
      etapas,
    };
  }
  const naturezaPorte = `${norm(dados.receita?.natureza_juridica_descricao)} ${norm(dados.receita?.porte)}`;
  if (rd.mei && /\bmei\b|microempreendedor/.test(naturezaPorte)) {
    etapas.push("regra dura: MEI");
    return {
      grade: "C",
      motivo: "Empresa MEI/microempreendedor — porte fora do perfil, reprovado sem IA.",
      dados,
      etapas,
    };
  }
  etapas.push("regras duras ok");

  // ===== 6) Qualificação final no Gemini =====
  const comparacao = await clientesDeComparacao();
  const receita = dados.receita;
  const fatos = [
    `Empresa: ${input.empresa}`,
    input.pais ? `País: ${input.pais}` : null,
    input.cidade ? `Cidade: ${input.cidade}` : null,
    input.segmento ? `Segmento/categoria detectada: ${input.segmento}` : null,
    input.extras ? `Dados da origem (${input.origem}): ${input.extras}` : null,
    input.site ? `Site: ${input.site}` : null,
    dados.site?.resumo ? `Resumo do site: ${dados.site.resumo}` : null,
    dados.telefone ? `Telefone: ${dados.telefone}` : null,
    dados.email ? `E-mail: ${dados.email}` : null,
    receita
      ? `Receita Federal: razão social "${receita.razao_social ?? "?"}", CNAE principal ${receita.cnae_principal ?? "?"}, CNAEs secundários ${(receita.cnaes_secundarios ?? []).slice(0, 6).join("; ") || "—"}, abertura ${receita.data_abertura ?? "?"}, porte ${receita.porte ?? "?"}, capital social ${receita.capital_social ?? "?"}, sócios ${(receita.socios ?? []).length}`
      : "Receita Federal: CNPJ não encontrado/verificado.",
  ]
    .filter(Boolean)
    .join("\n");

  const prompt = `PERFIL IDEAL DE CLIENTE DA SLTK AMERICAS:
${config.perfil_ideal}

CLIENTES REAIS ATUAIS (para comparação de aderência):
${comparacao.length ? comparacao.map((c) => `- ${c}`).join("\n") : "- (sem base de comparação)"}

DADOS COLETADOS DO LEAD:
${fatos}

Avalie a aderência deste lead ao perfil ideal e devolva APENAS JSON:
{"grade":"A|B|C","motivo":"2-3 frases objetivas em português","abordagem_sugerida":"1-2 frases de como abordar","produtos_sltk":["linha/máquina SLTK aderente"]}
Critérios: A = encaixe forte (indústria do perfil, com produção própria e sinais de compra de máquinas); B = encaixe possível mas com incertezas; C = fora do perfil. Seja criterioso: na dúvida entre A e B, dê B. NÃO invente fatos.`;

  try {
    const { aiJson, aiVisionJson } = await import("@/lib/ai-gateway.server");
    type Resp = {
      grade?: string;
      motivo?: string;
      abordagem_sugerida?: string;
      produtos_sltk?: string[];
    };
    const resp = input.imagens?.length
      ? await aiVisionJson<Resp>({
          prompt: `${prompt}\n\nA(s) imagem(ns) anexa(s) são a origem deste lead (cartão de visita ou produto/fabricante) — use-as como evidência adicional.`,
          imagens: input.imagens,
          maxOutputTokens: 500,
        })
      : await aiJson<Resp>({ userContent: prompt, maxOutputTokens: 500 });
    if (!resp?.grade || !["A", "B", "C"].includes(resp.grade)) {
      throw new Error("Resposta da IA sem grade válida.");
    }
    etapas.push(`gemini: grade ${resp.grade}`);
    await logQualify({
      userId: input.userId ?? null,
      ok: true,
      message: `grade ${resp.grade} — ${input.empresa}`,
      duration_ms: Date.now() - started,
      contexto: `${input.origem}:${input.empresa}`,
    });
    return {
      grade: resp.grade as "A" | "B" | "C",
      motivo: resp.motivo ?? "Sem justificativa retornada.",
      abordagem_sugerida: resp.abordagem_sugerida ?? null,
      produtos_sltk: resp.produtos_sltk ?? [],
      dados,
      etapas,
    };
  } catch (err) {
    etapas.push("gemini falhou");
    await logQualify({
      userId: input.userId ?? null,
      ok: false,
      message: err instanceof Error ? err.message : "erro",
      duration_ms: Date.now() - started,
      contexto: `${input.origem}:${input.empresa}`,
    });
    throw err instanceof Error ? err : new Error("Falha na qualificação por IA.");
  }
}
