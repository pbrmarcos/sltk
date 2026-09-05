// Diagnóstico das chaves/capacidades externas — SOMENTE servidor.
import { CAPABILITIES, type CapabilityDef } from "./system-keys";
import { driveAuth, driveConfigured } from "./docs/drive-auth.server";

export type EnvStatus = {
  nome: string;
  presente: boolean;
  mascara: string | null;
  opcional: boolean;
};

export type CapabilityStatus = {
  id: string;
  label: string;
  descricao: string;
  impacto: string;
  area: CapabilityDef["area"];
  criticidade: CapabilityDef["criticidade"];
  status: "ok" | "ausente" | "erro" | "nao_testado";
  detalhe: string;
  latencia_ms?: number;
  envs: EnvStatus[];
};

export type DiagnosticoResumo = {
  ok: number;
  ausentes: number;
  erros: number;
  naoTestados: number;
  verificadoEm: string;
};

function mask(v?: string | null): string | null {
  if (!v) return null;
  if (v.length <= 10) return "••••";
  return `${v.slice(0, 4)}••••${v.slice(-4)} (${v.length} car.)`;
}

function envStatus(nome: string, opcional: boolean): EnvStatus {
  const v = process.env[nome];
  return { nome, presente: Boolean(v && v.trim()), mascara: mask(v), opcional };
}

async function timedFetch(
  url: string,
  init: RequestInit = {},
  timeoutMs = 8000,
): Promise<{ ok: boolean; status: number; body: string; ms: number; erro?: string }> {
  const t0 = Date.now();
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    const r = await fetch(url, { ...init, signal: ctrl.signal });
    clearTimeout(t);
    const body = await r.text().catch(() => "");
    return { ok: r.ok, status: r.status, body, ms: Date.now() - t0 };
  } catch (e) {
    return {
      ok: false,
      status: 0,
      body: "",
      ms: Date.now() - t0,
      erro: e instanceof Error ? e.message : "Falha de rede",
    };
  }
}

/** Ping ao Auth health endpoint de um projeto Supabase — reaproveitado pelo probe() e por admin-backend-info.functions.ts. */
export async function pingSupabaseHealth(
  url: string,
  publishableKey?: string | null,
): Promise<{ ok: boolean; status: number; erro?: string; ms: number }> {
  const r = await timedFetch(`${url}/auth/v1/health`, {
    headers: publishableKey ? { apikey: publishableKey } : {},
  });
  return { ok: r.ok, status: r.status, erro: r.erro, ms: r.ms };
}

async function probe(cap: CapabilityDef): Promise<{
  status: CapabilityStatus["status"];
  detalhe: string;
  latencia_ms?: number;
}> {
  switch (cap.id) {
    case "supabase_core": {
      const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
      const key = process.env.SUPABASE_PUBLISHABLE_KEY;
      if (!url) return { status: "ausente", detalhe: "Endereço do projeto não configurado." };
      const r = await pingSupabaseHealth(url, key);
      return r.ok
        ? { status: "ok", detalhe: "Projeto acessível.", latencia_ms: r.ms }
        : {
            status: "erro",
            detalhe: r.erro ?? `Resposta ${r.status} do projeto.`,
            latencia_ms: r.ms,
          };
    }
    case "supabase_service_role": {
      const { getServiceRoleStatus } = await import("./service-role-health.server");
      const s = await getServiceRoleStatus();
      if (s.ok) return { status: "ok", detalhe: "Acesso administrativo liberado." };
      return { status: s.reason === "missing" ? "ausente" : "erro", detalhe: s.message };
    }
    case "sb_management": {
      const token = process.env.SB_MANAGEMENT_ACCESS_TOKEN;
      if (!token) return { status: "ausente", detalhe: "Token não configurado." };
      const projectRef = process.env.VITE_SUPABASE_PROJECT_ID || process.env.SUPABASE_PROJECT_ID;
      if (!projectRef)
        return { status: "erro", detalhe: "Project ref do Supabase não encontrado." };
      const r = await timedFetch(`https://api.supabase.com/v1/projects/${projectRef}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return r.ok
        ? {
            status: "ok",
            detalhe: "Token válido — Migrations pode aplicar SQL.",
            latencia_ms: r.ms,
          }
        : {
            status: "erro",
            detalhe: r.erro ?? `Management API respondeu ${r.status}.`,
            latencia_ms: r.ms,
          };
    }
    case "groq": {
      const key = process.env.GROQ_API_KEY;
      if (!key) return { status: "ausente", detalhe: "Chave não configurada." };
      const r = await timedFetch("https://api.groq.com/openai/v1/models", {
        headers: { Authorization: `Bearer ${key}` },
      });
      return r.ok
        ? { status: "ok", detalhe: "Chave válida.", latencia_ms: r.ms }
        : {
            status: "erro",
            detalhe: r.erro ?? `Provedor respondeu ${r.status}.`,
            latencia_ms: r.ms,
          };
    }
    case "firecrawl": {
      const key = process.env.FIRECRAWL_API_KEY;
      if (!key) return { status: "ausente", detalhe: "Chave não configurada." };
      const r = await timedFetch("https://api.firecrawl.dev/v2/team/credit-usage", {
        headers: { Authorization: `Bearer ${key}` },
      });
      return r.ok
        ? { status: "ok", detalhe: "Chave válida.", latencia_ms: r.ms }
        : {
            status: "erro",
            detalhe: r.erro ?? `Provedor respondeu ${r.status}.`,
            latencia_ms: r.ms,
          };
    }
    case "resend": {
      const key = process.env.RESEND_API_KEY;
      if (!key) return { status: "ausente", detalhe: "Chave não configurada." };
      const r = await timedFetch("https://api.resend.com/domains", {
        headers: { Authorization: `Bearer ${key}` },
      });
      return r.ok
        ? { status: "ok", detalhe: "Chave válida.", latencia_ms: r.ms }
        : {
            status: "erro",
            detalhe: r.erro ?? `Provedor respondeu ${r.status}.`,
            latencia_ms: r.ms,
          };
    }
    case "google_drive": {
      if (!driveConfigured())
        return { status: "ausente", detalhe: "Conta do Drive não vinculada." };
      const { baseUrl, headers } = await driveAuth();
      const r = await timedFetch(
        `${baseUrl}/drive/v3/about?fields=user(emailAddress,displayName)`,
        { headers },
      );
      if (!r.ok) {
        return {
          status: "erro",
          detalhe: r.erro ?? `Conector respondeu ${r.status}.`,
          latencia_ms: r.ms,
        };
      }
      let quem = "conta vinculada";
      try {
        const j = JSON.parse(r.body) as { user?: { emailAddress?: string; displayName?: string } };
        quem = j.user?.emailAddress ?? j.user?.displayName ?? quem;
      } catch {
        /* resposta sem JSON — mantém o rótulo padrão */
      }
      return { status: "ok", detalhe: `Conectado como ${quem}.`, latencia_ms: r.ms };
    }
    default:
      return { status: "nao_testado", detalhe: "" };
  }
}

async function statusFor(cap: CapabilityDef): Promise<CapabilityStatus> {
  const envs = [
    ...cap.envs.map((n) => envStatus(n, false)),
    ...(cap.envsOpcionais ?? []).map((n) => envStatus(n, true)),
  ];
  const faltando = envs.filter((e) => !e.opcional && !e.presente);

  const base = {
    id: cap.id,
    label: cap.label,
    descricao: cap.descricao,
    impacto: cap.impacto,
    area: cap.area,
    criticidade: cap.criticidade,
    envs,
  };

  if (faltando.length > 0) {
    return { ...base, status: "ausente", detalhe: "Configuração ausente neste ambiente." };
  }
  if (!cap.testavel) {
    return {
      ...base,
      status: "nao_testado",
      detalhe: "Configurada (sem teste automático disponível).",
    };
  }
  const r = await probe(cap);
  return { ...base, ...r };
}

export async function runSystemDiagnostics(ids?: string[]): Promise<{
  itens: CapabilityStatus[];
  resumo: DiagnosticoResumo;
}> {
  const alvo = ids?.length ? CAPABILITIES.filter((c) => ids.includes(c.id)) : CAPABILITIES;
  const itens = await Promise.all(alvo.map(statusFor));
  const resumo: DiagnosticoResumo = {
    ok: itens.filter((i) => i.status === "ok").length,
    ausentes: itens.filter((i) => i.status === "ausente").length,
    erros: itens.filter((i) => i.status === "erro").length,
    naoTestados: itens.filter((i) => i.status === "nao_testado").length,
    verificadoEm: new Date().toISOString(),
  };
  return { itens, resumo };
}
