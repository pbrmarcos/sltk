/**
 * Chat/completions com IA, preferindo GEMINI_API_KEY direto (sem depender da
 * Lovable) e caindo para o AI Gateway da Lovable só quando a chave direta
 * não estiver configurada. Mesmo padrão de precedência já usado em
 * `entrevistas-admin.functions.ts`, generalizado aqui para reuso (tradução
 * de documentação, sugestão de nome de arquivo com imagem).
 */

type UserContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

export interface AiChatOptions {
  system?: string;
  userContent: string | UserContentPart[];
  jsonMode?: boolean;
  /** Modelo no formato do AI Gateway da Lovable (usado só no fallback). */
  lovableModel?: string;
  /** Modelo do Gemini na chamada direta. */
  geminiModel?: string;
}

export async function aiConfigured(): Promise<boolean> {
  const { secretExists } = await import("@/lib/secrets.server");
  const [gemini, lovable] = await Promise.all([
    secretExists("GEMINI_API_KEY"),
    secretExists("LOVABLE_API_KEY"),
  ]);
  return gemini || lovable;
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

async function callGeminiDirect(apiKey: string, opts: AiChatOptions): Promise<string> {
  const model = opts.geminiModel ?? "gemini-flash-lite-latest";
  const body: Record<string, unknown> = {
    contents: [{ role: "user", parts: partsFromUserContent(opts.userContent) }],
  };
  if (opts.system) body.systemInstruction = { parts: [{ text: opts.system }] };
  if (opts.jsonMode) body.generationConfig = { responseMimeType: "application/json" };

  const r = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
  if (!r.ok) throw new Error(`Gemini ${r.status}`);
  const j = (await r.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const out = j.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!out) throw new Error("Sem resposta da IA.");
  return out;
}

async function callLovableGateway(apiKey: string, opts: AiChatOptions): Promise<string> {
  const messages: Array<Record<string, unknown>> = [];
  if (opts.system) messages.push({ role: "system", content: opts.system });
  messages.push({ role: "user", content: opts.userContent });

  const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: opts.lovableModel ?? "google/gemini-2.5-flash",
      messages,
      ...(opts.jsonMode ? { response_format: { type: "json_object" } } : {}),
    }),
  });
  if (r.status === 429)
    throw new Error("Limite de requisições da IA atingido. Tente em alguns segundos.");
  if (r.status === 402)
    throw new Error("Créditos de IA esgotados. Adicione créditos no workspace Lovable.");
  if (!r.ok) throw new Error(`Lovable AI ${r.status}`);
  const j = (await r.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const out = j.choices?.[0]?.message?.content?.trim();
  if (!out) throw new Error("Sem resposta da IA.");
  return out;
}

export async function aiChatComplete(opts: AiChatOptions): Promise<string> {
  const { getSecret } = await import("@/lib/secrets.server");
  const geminiKey = await getSecret("GEMINI_API_KEY");
  if (geminiKey) return callGeminiDirect(geminiKey, opts);
  const lovableKey = await getSecret("LOVABLE_API_KEY");
  if (lovableKey) return callLovableGateway(lovableKey, opts);
  throw new Error(
    "Recurso de IA indisponível — a integração não está configurada. Verifique em Configurações › Chaves & Diagnóstico.",
  );
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
