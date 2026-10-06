/**
 * Chat/completions com IA via Google Gemini (GEMINI_API_KEY, cofre ou env).
 * Ponto único de acesso à IA do sistema: tradução, visão, JSON e busca web.
 */

type UserContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

export interface AiChatOptions {
  system?: string;
  userContent: string | UserContentPart[];
  jsonMode?: boolean;
  /** Modelo do Gemini na chamada direta. */
  geminiModel?: string;
  /** Habilita busca no Google (grounding) — só no caminho direto do Gemini. */
  webSearch?: boolean;
  maxOutputTokens?: number;
}

export async function aiConfigured(): Promise<boolean> {
  const { secretExists } = await import("@/lib/secrets.server");
  return secretExists("GEMINI_API_KEY");
}

function partsFromUserContent(
  userContent: AiChatOptions["userContent"],
): Array<Record<string, unknown>> {
  if (typeof userContent === "string") return [{ text: userContent }];
  return userContent.map((part) => {
    if (part.type === "text") return { text: part.text };
    const match = /^data:([^;]+);base64,(.+)$/.exec(part.image_url.url);
    if (!match) return { text: "" };
    return { inline_data: { mime_type: match[1], data: match[2] } };
  });
}

/** Erro transitório do Gemini (modelo sobrecarregado/limite) — vale tentar de novo ou trocar de modelo. */
class GeminiTransientError extends Error {
  constructor(public status: number) {
    super(`Gemini ${status}`);
  }
}

/** Quando o modelo pedido está sobrecarregado (503), tentamos estes na sequência. */
const FALLBACK_MODELS: Record<string, string[]> = {
  "gemini-flash-latest": ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-flash-lite-latest"],
  "gemini-flash-lite-latest": [
    "gemini-2.5-flash-lite",
    "gemini-2.0-flash-lite",
    "gemini-2.0-flash",
  ],
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Chama o Gemini com 2 tentativas por modelo (503/500/429 com espera curta) e
 * cai para modelos alternativos. Só desiste com uma mensagem em português.
 */
async function callGeminiDirect(apiKey: string, opts: AiChatOptions): Promise<string> {
  const primeiro = opts.geminiModel ?? "gemini-flash-lite-latest";
  const modelos = [primeiro, ...(FALLBACK_MODELS[primeiro] ?? [])];
  let ultimo: GeminiTransientError | null = null;
  for (const model of modelos) {
    for (let tentativa = 0; tentativa < 2; tentativa++) {
      try {
        return await callGeminiOnce(apiKey, model, opts);
      } catch (e) {
        if (!(e instanceof GeminiTransientError)) throw e;
        ultimo = e;
        if (tentativa === 0) await sleep(e.status === 429 ? 1500 : 800);
      }
    }
  }
  throw new Error(
    ultimo?.status === 429
      ? "Limite de requisições do Gemini atingido. Tente novamente em instantes."
      : "A IA do Google está sobrecarregada agora. Tente de novo em alguns segundos.",
  );
}

async function callGeminiOnce(apiKey: string, model: string, opts: AiChatOptions): Promise<string> {
  const generationConfig: Record<string, unknown> = {};
  if (opts.jsonMode && !opts.webSearch) generationConfig.responseMimeType = "application/json";
  if (opts.maxOutputTokens) generationConfig.maxOutputTokens = opts.maxOutputTokens;

  const body: Record<string, unknown> = {
    contents: [{ role: "user", parts: partsFromUserContent(opts.userContent) }],
  };
  if (opts.system) body.systemInstruction = { parts: [{ text: opts.system }] };
  if (Object.keys(generationConfig).length > 0) body.generationConfig = generationConfig;
  // google_search não pode ser combinado com responseMimeType json no v1beta.
  if (opts.webSearch) body.tools = [{ google_search: {} }];

  const r = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
  if (r.status === 400 || r.status === 401 || r.status === 403) {
    throw new Error(
      "Chave do Gemini inválida ou sem permissão. Confira em Configurações › Chaves & Diagnóstico.",
    );
  }
  if (
    r.status === 429 ||
    r.status === 500 ||
    r.status === 502 ||
    r.status === 503 ||
    r.status === 504
  ) {
    throw new GeminiTransientError(r.status);
  }
  if (r.status === 404) {
    // Modelo inexistente nesta conta/região — tenta o próximo da lista.
    throw new GeminiTransientError(404);
  }
  if (!r.ok) throw new Error(`Gemini respondeu ${r.status}. Tente novamente.`);
  const j = (await r.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const out = (j.candidates?.[0]?.content?.parts ?? [])
    .map((p) => p.text ?? "")
    .join("")
    .trim();
  if (!out) throw new Error("Sem resposta da IA.");
  return out;
}

export async function aiChatComplete(opts: AiChatOptions): Promise<string> {
  const { getSecret } = await import("@/lib/secrets.server");
  const geminiKey = await getSecret("GEMINI_API_KEY");
  if (geminiKey) return callGeminiDirect(geminiKey, opts);
  throw new Error(
    "Recurso de IA indisponível — a integração não está configurada. Cadastre a chave do Gemini em Configurações › Chaves & Diagnóstico.",
  );
}

/** Extrai o primeiro objeto/array JSON de uma resposta de modelo (tolera cercas ```json). */
export function extractJsonFromAi<T>(raw: string): T | null {
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  const start = cleaned.search(/[{[]/);
  if (start === -1) return null;
  for (let end = cleaned.length; end > start; end--) {
    const slice = cleaned.slice(start, end).trim();
    if (!slice.endsWith("}") && !slice.endsWith("]")) continue;
    try {
      return JSON.parse(slice) as T;
    } catch {
      /* tenta um recorte menor */
    }
  }
  return null;
}

/** Chat em modo JSON com parse tolerante. Retorna null se o modelo não devolver JSON válido. */
export async function aiJson<T>(opts: Omit<AiChatOptions, "jsonMode">): Promise<T | null> {
  const raw = await aiChatComplete({ ...opts, jsonMode: true });
  return extractJsonFromAi<T>(raw);
}

export interface AiVisionImage {
  base64: string;
  mime: string;
}

/** Visão + JSON: imagens em base64 analisadas pelo modelo, resposta JSON tipada. */
export async function aiVisionJson<T>(args: {
  system?: string;
  prompt: string;
  imagens: AiVisionImage[];
  geminiModel?: string;
  maxOutputTokens?: number;
}): Promise<T | null> {
  const userContent: UserContentPart[] = [
    { type: "text", text: args.prompt },
    ...args.imagens.map(
      (img): UserContentPart => ({
        type: "image_url",
        image_url: { url: `data:${img.mime};base64,${img.base64}` },
      }),
    ),
  ];
  const raw = await aiChatComplete({
    system: args.system,
    userContent,
    jsonMode: true,
    geminiModel: args.geminiModel ?? "gemini-flash-latest",
    maxOutputTokens: args.maxOutputTokens,
  });
  return extractJsonFromAi<T>(raw);
}

const TRANSLATE_SYSTEM_PROMPT: Record<"es" | "en", string> = {
  es: `Você é um tradutor técnico industrial. Traduza do português brasileiro para espanhol neutro (LATAM).
Regras estritas:
- Preserve quebras de linha, marcadores (•, -, *) e formatação markdown.
- Preserve placeholders no formato {{var.path}} EXATAMENTE como estão (não traduza).
- Mantenha números, moedas, unidades e nomes próprios.
- Use terminologia técnica de equipamentos industriais e processos.
- Responda APENAS com a tradução, sem comentários, sem aspas extras.`,
  en: `Você é um tradutor técnico industrial. Traduza do português brasileiro para inglês técnico (US).
Regras estritas:
- Preserve quebras de linha, marcadores (•, -, *) e formatação markdown.
- Preserve placeholders no formato {{var.path}} EXATAMENTE como estão (não traduza).
- Mantenha números, moedas, unidades e nomes próprios.
- Use terminologia técnica de equipamentos industriais e processos.
- Responda APENAS com a tradução, sem comentários, sem aspas extras.`,
};

/** Tradução PT → ES/EN de conteúdo de documentação, compartilhada entre docs.functions.ts e admin-docs.server.ts. */
export async function translatePtTo(texto: string, alvo: "es" | "en"): Promise<string> {
  if (!texto || !texto.trim()) return "";
  return aiChatComplete({ system: TRANSLATE_SYSTEM_PROMPT[alvo], userContent: texto });
}
