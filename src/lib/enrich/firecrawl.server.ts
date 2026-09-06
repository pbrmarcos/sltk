/**
 * Cliente Firecrawl mínimo via REST (evita SDK pesado no bundle).
 * Usa o modo `json` com prompt para extrair campos estruturados de páginas
 * públicas — mais resiliente a mudanças de HTML que parsing manual.
 */

const FIRECRAWL_URL = "https://api.firecrawl.dev/v2/scrape";

export type ScrapeJsonOptions = {
  url: string;
  prompt: string;
  waitFor?: number;
  schema?: Record<string, unknown>;
  /** ISO country code para geo-targeting (opcional) */
  country?: string;
  /** Idiomas preferenciais para o request (opcional) */
  languages?: string[];
};

export async function firecrawlScrapeJson<T = Record<string, unknown>>(
  opts: ScrapeJsonOptions,
): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  const { getSecret } = await import("@/lib/secrets.server");
  const apiKey = await getSecret("FIRECRAWL_API_KEY");
  if (!apiKey)
    return { ok: false, error: "Busca web indisponível — a integração não está configurada." };

  const body: Record<string, unknown> = {
    url: opts.url,
    onlyMainContent: true,
    formats: [
      {
        type: "json",
        prompt: opts.prompt,
        ...(opts.schema ? { schema: opts.schema } : {}),
      },
    ],
    ...(opts.waitFor ? { waitFor: opts.waitFor } : {}),
    ...(opts.country || opts.languages
      ? {
          location: {
            ...(opts.country ? { country: opts.country } : {}),
            ...(opts.languages ? { languages: opts.languages } : {}),
          },
        }
      : {}),
  };

  try {
    const res = await fetch(FIRECRAWL_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      return { ok: false, error: `Firecrawl ${res.status}: ${txt.slice(0, 200)}` };
    }
    const j: any = await res.json();
    // v2 retorna { success, data: { json, markdown, metadata, ... } }
    const json = j?.data?.json ?? j?.json;
    if (!json) return { ok: false, error: "Resposta sem campo json." };
    return { ok: true, data: json as T };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Falha de rede." };
  }
}

const FIRECRAWL_SEARCH_URL = "https://api.firecrawl.dev/v2/search";

/**
 * Busca na web + extração JSON por resultado. Aceita um resultado SOMENTE se
 * o documento fiscal (dígitos) aparecer no conteúdo da página — evita que o
 * LLM "encontre" outra empresa.
 */
export async function firecrawlSearchEnrich<T = Record<string, unknown>>(opts: {
  query: string;
  /** Documento fiscal — usado para validar que o resultado é da empresa certa */
  doc: string;
  prompt: string;
  limit?: number;
  /** Etiqueta usada nos logs para distinguir o país/provider chamador */
  logLabel?: string;
}): Promise<{ ok: true; data: T; url: string } | { ok: false; error: string }> {
  const { getSecret } = await import("@/lib/secrets.server");
  const apiKey = await getSecret("FIRECRAWL_API_KEY");
  if (!apiKey)
    return { ok: false, error: "Busca web indisponível — a integração não está configurada." };

  const tag = `[enrich:${opts.logLabel ?? "search"}]`;
  const t0 = Date.now();
  console.log(
    `${tag} query=${JSON.stringify(opts.query)} doc=${opts.doc} limit=${opts.limit ?? 3}`,
  );

  try {
    const res = await fetch(FIRECRAWL_SEARCH_URL, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        query: opts.query,
        limit: opts.limit ?? 3,
        scrapeOptions: {
          onlyMainContent: true,
          formats: ["markdown", { type: "json", prompt: opts.prompt }],
        },
      }),
    });
    console.log(`${tag} firecrawl status=${res.status} ms=${Date.now() - t0}`);
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      console.warn(`${tag} firecrawl error body=${txt.slice(0, 400)}`);
      return { ok: false, error: `Firecrawl search ${res.status}: ${txt.slice(0, 200)}` };
    }
    const j: any = await res.json();
    const web: any[] = j?.data?.web ?? [];
    console.log(
      `${tag} results=${web.length} urls=${JSON.stringify(web.map((r) => r?.url).slice(0, 5))}`,
    );
    const docDigits = (opts.doc || "").replace(/\D/g, "");
    for (let i = 0; i < web.length; i++) {
      const r = web[i];
      const data = r?.json;
      const mdLen = typeof r?.markdown === "string" ? r.markdown.length : 0;
      console.log(
        `${tag} [${i}] url=${r?.url} title=${JSON.stringify((r?.title || "").slice(0, 80))} mdLen=${mdLen} hasJson=${!!data}`,
      );
      if (!data) {
        if (mdLen > 0)
          console.log(
            `${tag} [${i}] md snippet=${JSON.stringify(String(r.markdown).slice(0, 300))}`,
          );
        continue;
      }
      // Validação anti-alucinação: o documento precisa estar na página.
      const haystack = `${r.url ?? ""} ${r.title ?? ""} ${r.description ?? ""} ${r.markdown ?? ""}`;
      const haystackDigits = haystack.replace(/[.\-\s/]/g, "");
      const docMatches = !(docDigits.length >= 6 && !haystackDigits.includes(docDigits));
      console.log(
        `${tag} [${i}] docMatches=${docMatches} extracted=${JSON.stringify(data).slice(0, 500)}`,
      );
      if (!docMatches) continue;
      return { ok: true, data: data as T, url: r.url ?? "" };
    }
    console.warn(`${tag} no result matched doc=${opts.doc}`);
    return { ok: false, error: "Nenhum resultado de busca correspondeu ao documento." };
  } catch (e) {
    console.warn(`${tag} exception`, e);
    return { ok: false, error: e instanceof Error ? e.message : "Falha de rede." };
  }
}
