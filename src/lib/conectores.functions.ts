import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

async function assertAdmin(supabase: SupabaseClient<Database>, userId: string) {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
  if (!(data ?? []).some((r) => r.role === "admin")) throw new Error("Acesso restrito.");
}

export type ConectorStatus = {
  id: string;
  nome: string;
  descricao: string;
  conectado: boolean;
  detalhe: string;
  latencia_ms?: number;
};

async function testFirecrawl(): Promise<ConectorStatus> {
  const base = {
    id: "firecrawl",
    nome: "Firecrawl",
    descricao: "Scraping e busca web para enriquecimento de dados.",
  };
  const key = process.env.FIRECRAWL_API_KEY;
  if (!key) return { ...base, conectado: false, detalhe: "Chave não configurada." };
  const t0 = Date.now();
  try {
    const r = await fetch("https://api.firecrawl.dev/v2/team/credit-usage", {
      headers: { Authorization: `Bearer ${key}` },
    });
    const latencia_ms = Date.now() - t0;
    if (!r.ok) return { ...base, conectado: false, detalhe: `HTTP ${r.status}`, latencia_ms };
    return { ...base, conectado: true, detalhe: "Chave válida.", latencia_ms };
  } catch (e) {
    return { ...base, conectado: false, detalhe: e instanceof Error ? e.message : "Falha na requisição." };
  }
}

async function testGoogleDrive(): Promise<ConectorStatus> {
  const base = {
    id: "google_drive",
    nome: "Google Drive",
    descricao: "Anexar e listar arquivos do Drive vinculado.",
  };
  const lovableKey = process.env.LOVABLE_API_KEY;
  const connKey = process.env.GOOGLE_DRIVE_API_KEY;
  if (!lovableKey || !connKey) {
    return { ...base, conectado: false, detalhe: "Conexão não vinculada." };
  }
  const t0 = Date.now();
  try {
    const r = await fetch(
      "https://connector-gateway.lovable.dev/google_drive/drive/v3/about?fields=user(emailAddress,displayName)",
      {
        headers: {
          Authorization: `Bearer ${lovableKey}`,
          "X-Connection-Api-Key": connKey,
        },
      },
    );
    const latencia_ms = Date.now() - t0;
    if (!r.ok) {
      const body = await r.text().catch(() => "");
      return { ...base, conectado: false, detalhe: `HTTP ${r.status} ${body.slice(0, 120)}`, latencia_ms };
    }
    const data = (await r.json()) as { user?: { emailAddress?: string; displayName?: string } };
    const who = data.user?.emailAddress ?? data.user?.displayName ?? "conta vinculada";
    return { ...base, conectado: true, detalhe: `Conectado como ${who}.`, latencia_ms };
  } catch (e) {
    return { ...base, conectado: false, detalhe: e instanceof Error ? e.message : "Falha na requisição." };
  }
}

async function testGroq(): Promise<ConectorStatus> {
  const base = {
    id: "groq",
    nome: "Groq",
    descricao: "OCR e extração estruturada (scan de cartões/folders de fornecedores) via Llama 4 Scout vision.",
  };
  const key = process.env.GROQ_API_KEY;
  if (!key) return { ...base, conectado: false, detalhe: "Chave não configurada." };
  const t0 = Date.now();
  try {
    const r = await fetch("https://api.groq.com/openai/v1/models", {
      headers: { Authorization: `Bearer ${key}` },
    });
    const latencia_ms = Date.now() - t0;
    if (!r.ok) {
      const body = await r.text().catch(() => "");
      return { ...base, conectado: false, detalhe: `HTTP ${r.status} ${body.slice(0, 120)}`, latencia_ms };
    }
    return { ...base, conectado: true, detalhe: "Chave válida (Llama 4 Scout 17B vision).", latencia_ms };
  } catch (e) {
    return { ...base, conectado: false, detalhe: e instanceof Error ? e.message : "Falha na requisição." };
  }
}

export const checkConectores = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ConectorStatus[]> => {
    await assertAdmin(context.supabase, context.userId);
    return Promise.all([testFirecrawl(), testGoogleDrive(), testGroq()]);
  });

export const checkGroqOnly = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ConectorStatus & { chave_mascarada: string | null }> => {
    await assertAdmin(context.supabase, context.userId);
    const status = await testGroq();
    const key = process.env.GROQ_API_KEY;
    const masked = key ? `${key.slice(0, 4)}••••${key.slice(-4)}` : null;
    return { ...status, chave_mascarada: masked };
  });

// Alias retrocompatível.
export const checkGeminiOnly = checkGroqOnly;

