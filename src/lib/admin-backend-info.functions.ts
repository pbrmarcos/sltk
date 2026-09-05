import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getSupabasePublicConfig } from "@/integrations/supabase/config";
import { pingSupabaseHealth } from "@/lib/system-diagnostics.server";
import { assertAdmin } from "@/lib/admin-guard";

function mask(v?: string | null) {
  if (!v) return null;
  if (v.length <= 12) return v;
  return `${v.slice(0, 8)}…${v.slice(-4)} (${v.length} chars)`;
}

function projectRefFromUrl(url?: string | null) {
  if (!url) return null;
  const m = url.match(/https?:\/\/([a-z0-9]+)\.supabase\.co/i);
  return m?.[1] ?? null;
}

export const getBackendInfo = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const fallback = getSupabasePublicConfig();
    const url = process.env.SUPABASE_URL ?? fallback.url ?? null;
    const projectId = process.env.SUPABASE_PROJECT_ID ?? projectRefFromUrl(url);
    const publishable = process.env.SUPABASE_PUBLISHABLE_KEY ?? fallback.publishableKey ?? null;
    const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY ?? null;

    // Ping leve no Auth health endpoint pra validar se o projeto está ativo — reaproveita o helper do motor de diagnóstico.
    async function ping(target?: string | null) {
      if (!target) return { ok: false, status: 0, error: "URL não configurada" };
      const r = await pingSupabaseHealth(target, publishable);
      return { ok: r.ok, status: r.status, error: r.ok ? null : (r.erro ?? `HTTP ${r.status}`) };
    }

    const activePing = await ping(url);

    return {
      active: {
        label: "Banco de dados do sistema",
        url,
        projectId,
        projectRef: projectRefFromUrl(url) ?? projectId,
        dashboardUrl: projectId ? `https://supabase.com/dashboard/project/${projectId}` : null,
        publishableKeyMasked: mask(publishable),
        hasServiceRole: Boolean(serviceRole),
        ping: activePing,
      },
      dest: null,
      checkedAt: new Date().toISOString(),
    };
  });
