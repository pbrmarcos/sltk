import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { validarDocumentoFiscal } from "@/lib/documentos-fiscais";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { EnrichedCliente } from "@/lib/enrich/types";

export type { EnrichedCliente };

const input = z.object({
  pais: z.string().length(2),
  documento: z.string().min(2).max(40),
});

function onlyDigits(s: string): string {
  return (s ?? "").replace(/\D/g, "");
}

/**
 * Provedores baseados em LLM (Firecrawl JSON) às vezes devolvem a string
 * literal "null"/"undefined"/"N/A" em vez de null real. Normaliza valores
 * inúteis para `undefined` em todos os campos do resultado, para evitar que
 * o formulário seja preenchido com "null" e que o cache trate como sucesso.
 */
function sanitizeResult(r: EnrichedCliente | null): EnrichedCliente | null {
  if (!r) return null;
  const isJunk = (v: unknown) => {
    if (v == null) return true;
    if (typeof v !== "string") return false;
    const t = v.trim().toLowerCase();
    if (t === "" || t === "null" || t === "undefined" || t === "n/a" || t === "na" || t === "-")
      return true;
    // Firecrawl às vezes devolve marcadores tipo "/** campo not found **/"
    if (t.includes("not found") || /^\/\*.*\*\/$/.test(t)) return true;
    // Variantes wrapadas em slashes: "/null/", "/undefined/", "/n\a/"
    const inner = t.replace(/^\/+|\/+$/g, "").trim();
    if (
      inner === "null" ||
      inner === "undefined" ||
      inner === "n/a" ||
      inner === "na" ||
      inner === "-" ||
      inner === ""
    )
      return true;
    return false;
  };
  const clean: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(r)) {
    if (Array.isArray(v)) {
      const arr = v.filter((x) => !isJunk(x));
      if (arr.length > 0) clean[k] = arr;
    } else if (!isJunk(v)) {
      clean[k] = v;
    }
  }
  // _source sempre preservado
  if (!clean._source && r._source) clean._source = r._source;
  return clean as EnrichedCliente;
}

/** Provedores na ordem de preferência por país. */
const PROVIDERS_BY_PAIS: Record<string, string[]> = {
  BR: ["brasilapi_cnpj", "receitaws_cnpj"],
  PY: ["set_py_ruc"],
  PE: ["apis_net_pe_ruc"],
  AR: ["cuitonline_ar"],
  UY: ["dgi_uy_rut"],
  CR: ["hacienda_cr_cedula"],
  EC: ["sri_ec_ruc"],
  CL: ["sii_cl_rut"],
  PA: ["dgi_pa_ruc"],
  CO: ["rues_co_nit"],
};

const CACHE_TTL_DAYS = 7;

/**
 * Cliente auxiliar para cache/log do enriquecimento.
 * Nunca bloqueia a consulta: se a credencial administrativa não estiver
 * disponível neste ambiente, devolve `null` e o fluxo segue sem cache.
 */
async function auxClient(): Promise<{
  from: (t: string) => any;
} | null> {
  try {
    const { getAdminClient } = await import("@/lib/supabase-client.server");
    const c = await getAdminClient();
    return (c as unknown as { from: (t: string) => any }) ?? null;
  } catch (e) {
    console.warn("[enrich] cache/log indisponível neste ambiente", e);
    return null;
  }
}

async function writeLog(params: {
  userId: string | null;
  pais: string;
  documento: string;
  provider: string | null;
  success: boolean;
  cached?: boolean;
  source?: string | null;
  error?: string | null;
}) {
  try {
    const supabaseAdmin = await auxClient();
    if (!supabaseAdmin) return;
    await supabaseAdmin.from("enrich_log").insert({
      user_id: params.userId,
      pais: params.pais,
      documento: params.documento,
      provider: params.provider,
      success: params.success,
      cached: params.cached ?? false,
      source: params.source ?? null,
      error: params.error ?? null,
    } as never);
  } catch (e) {
    console.warn("[enrich] log failed", e);
  }
}

export const enrichDocumento = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => input.parse(raw))
  .handler(async ({ data, context }) => {
    const pais = data.pais.toUpperCase();
    // Para BR/AR/PY/PE/UY usamos somente dígitos; outros países podem ter letras.
    const digitsOnlyCountries = new Set(["AR", "BR", "PY", "PE", "UY", "CR", "EC", "CO"]);
    const doc = digitsOnlyCountries.has(pais)
      ? onlyDigits(data.documento)
      : (data.documento || "").trim().toUpperCase();

    const uid = context.userId ?? null;
    const failAndLog = async (error: string, provider: string | null = null) => {
      await writeLog({ userId: uid, pais, documento: doc, provider, success: false, error });
      return { ok: false as const, error };
    };

    // Validação única e centralizada (mesmo módulo do formulário e do backend).
    const check = validarDocumentoFiscal(pais, data.documento);
    if (!check.ok) {
      return failAndLog(check.mensagem ?? "Documento fiscal inválido.");
    }

    const providers = PROVIDERS_BY_PAIS[pais];
    if (!providers || providers.length === 0) {
      return failAndLog(
        "Autocompletar ainda não disponível para este país — preencha manualmente.",
      );
    }

    // Cache e configuração: usa service role quando disponível; caso contrário
    // segue com o client do usuário (RLS). Nunca bloqueia a consulta.
    const supabaseAdmin = ((await auxClient()) ??
      (context.supabase as unknown as { from: (t: string) => any })) as any;

    // Cache: 7 dias por (pais, documento). Retorna o primeiro válido.
    {
      const since = new Date(Date.now() - CACHE_TTL_DAYS * 86400 * 1000).toISOString();
      const { data: cached } = await supabaseAdmin
        .from("enrich_cache")
        .select("provider, payload, fetched_at")
        .eq("pais", pais)
        .eq("documento", doc)
        .gte("fetched_at", since)
        .in("provider", providers)
        .order("fetched_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (cached?.payload) {
        const payload = cached.payload as EnrichedCliente;
        // Ignora cache "vazio" (provedor que retornou apenas _source).
        const hasData = !!(
          payload?.razao_social ||
          payload?.nome_fantasia ||
          payload?.endereco_logradouro ||
          payload?.cnae_principal
        );
        if (!hasData) {
          // Apaga entrada inútil para não bloquear novas tentativas.
          await supabaseAdmin
            .from("enrich_cache")
            .delete()
            .eq("pais", pais)
            .eq("documento", doc)
            .eq("provider", cached.provider);
        } else {
          await writeLog({
            userId: uid,
            pais,
            documento: doc,
            provider: cached.provider,
            success: true,
            cached: true,
            source: payload?._source ?? cached.provider,
          });
          return { ok: true as const, data: cached.payload as EnrichedCliente, cached: true };
        }
      }
    }

    // Filtra providers ativos+disponíveis. Se a configuração não puder ser lida
    // (ex.: RLS sem service role), assume todos habilitados em vez de bloquear.
    const { data: cfgsRaw } = await supabaseAdmin
      .from("integracoes_config")
      .select("provider, ativo, disponivel")
      .in("provider", providers);
    const cfgs = (cfgsRaw ?? []) as Array<{
      provider: string;
      ativo: boolean | null;
      disponivel: boolean | null;
    }>;
    const semConfig = cfgs.length === 0;
    const ativos = new Map(cfgs.map((c) => [c.provider, c]));

    const errors: string[] = [];
    for (const provider of providers) {
      const cfg = ativos.get(provider);
      if (!semConfig && (!cfg?.ativo || !cfg?.disponivel)) continue;

      try {
        console.log(`[enrich] running provider=${provider} pais=${pais} doc=${doc}`);
        const raw = await runProvider(provider, doc);
        const result = sanitizeResult(raw);
        console.log(
          `[enrich] provider=${provider} rawKeys=${raw ? Object.keys(raw).join(",") : "null"} cleanKeys=${result ? Object.keys(result).join(",") : "null"}`,
        );
        const hasData = !!(
          result?.razao_social ||
          result?.nome_fantasia ||
          result?.endereco_logradouro ||
          result?.cnae_principal
        );
        if (result && hasData) {
          // Grava no cache de forma best-effort.
          await supabaseAdmin.from("enrich_cache").upsert(
            {
              pais,
              documento: doc,
              provider,
              payload: JSON.parse(JSON.stringify(result)) as never,
              fetched_at: new Date().toISOString(),
            },
            { onConflict: "pais,documento,provider" },
          );
          await writeLog({
            userId: uid,
            pais,
            documento: doc,
            provider,
            success: true,
            cached: false,
            source: result._source ?? provider,
          });
          return { ok: true as const, data: result, cached: false };
        }
        // Provedor respondeu mas sem dados úteis — registra motivo para auditoria.
        const reason = !result
          ? "Provedor não retornou resposta (documento não encontrado)."
          : "Resposta sem campos úteis (razão social/endereço/CNAE vazios).";
        errors.push(`${provider}: ${reason}`);
        await writeLog({
          userId: uid,
          pais,
          documento: doc,
          provider,
          success: false,
          source: result?._source ?? provider,
          error: reason,
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        errors.push(`${provider}: ${msg}`);
        console.warn("[enrich]", provider, msg);
        await writeLog({ userId: uid, pais, documento: doc, provider, success: false, error: msg });
      }
    }

    if (errors.length > 0) {
      return failAndLog(`Nenhum provedor retornou dados. ${errors[0]}`);
    }
    return failAndLog(
      "Nenhum provedor de autocompletar está ativo para este país. " +
        "Habilite em Configurações > Integrações.",
    );
  });

async function runProvider(provider: string, doc: string): Promise<EnrichedCliente | null> {
  switch (provider) {
    case "brasilapi_cnpj": {
      const m = await import("@/lib/enrich/br.server");
      return m.enrichBrasilApi(doc);
    }
    case "receitaws_cnpj": {
      const m = await import("@/lib/enrich/br.server");
      return m.enrichReceitaWs(doc);
    }
    case "apis_net_pe_ruc": {
      const m = await import("@/lib/enrich/pe.server");
      return m.enrichApisNetPe(doc);
    }
    case "set_py_ruc": {
      const m = await import("@/lib/enrich/py.server");
      return m.enrichSetPy(doc);
    }
    case "cuitonline_ar": {
      const m = await import("@/lib/enrich/ar.server");
      return m.enrichCuitOnlineAr(doc);
    }
    case "dgi_uy_rut": {
      const m = await import("@/lib/enrich/uy.server");
      return m.enrichDgiUy(doc);
    }
    case "hacienda_cr_cedula": {
      const m = await import("@/lib/enrich/cr.server");
      return m.enrichHaciendaCr(doc);
    }
    case "sri_ec_ruc": {
      const m = await import("@/lib/enrich/ec.server");
      return m.enrichSriEc(doc);
    }
    case "sii_cl_rut": {
      const m = await import("@/lib/enrich/cl.server");
      return m.enrichSiiCl(doc);
    }
    case "dgi_pa_ruc": {
      const m = await import("@/lib/enrich/pa.server");
      return m.enrichDgiPa(doc);
    }
    case "rues_co_nit": {
      const m = await import("@/lib/enrich/co.server");
      return m.enrichRuesCo(doc);
    }
    default:
      return null;
  }
}
