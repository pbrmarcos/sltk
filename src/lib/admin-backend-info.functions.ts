import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getSupabasePublicConfig } from "@/integrations/supabase/config";
import { pingSupabaseHealth } from "@/lib/system-diagnostics.server";

async function assertAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  if (error) throw new Error(error.message);
  if (!(data ?? []).some((r: { role: string }) => r.role === "admin")) throw new Error("Acesso restrito.");
}

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
  const url = process.env.SUPABASE_URL ?? process.env.DEST_SUPABASE_URL ?? fallback.url ?? null;
  const projectId = process.env.SUPABASE_PROJECT_ID ?? projectRefFromUrl(url);
  const publishable = process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.DEST_SUPABASE_PUBLISHABLE_KEY ?? fallback.publishableKey ?? null;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY ?? null;

  const destUrl = process.env.DEST_SUPABASE_URL ?? null;
  const destProjectId = process.env.DEST_SUPABASE_PROJECT_ID ?? projectRefFromUrl(destUrl);
  const destPublishable = process.env.DEST_SUPABASE_PUBLISHABLE_KEY ?? null;
  const destServiceRole = process.env.DEST_SUPABASE_SERVICE_ROLE_KEY ?? null;

  // Ping leve no Auth health endpoint pra validar se o projeto está ativo — reaproveita o helper do motor de diagnóstico.
  async function ping(target?: string | null) {
    if (!target) return { ok: false, status: 0, error: "URL não configurada" };
    const r = await pingSupabaseHealth(target, publishable);
    return { ok: r.ok, status: r.status, error: r.ok ? null : (r.erro ?? `HTTP ${r.status}`) };
  }

  const activeRef = projectRefFromUrl(url) ?? projectId;
  const destRef = projectRefFromUrl(destUrl) ?? destProjectId;
  // Só é um "segundo banco" de verdade se apontar para outro projeto Supabase.
  const destDistinto = Boolean(destUrl) && destRef !== activeRef;

  const [activePing, destPing] = await Promise.all([
    ping(url),
    destDistinto ? ping(destUrl) : Promise.resolve({ ok: false, status: 0, error: null as string | null }),
  ]);

  return {
    active: {
      label: "Banco de dados do sistema",
      url,
      projectId,
      projectRef: activeRef,
      dashboardUrl: projectId ? `https://supabase.com/dashboard/project/${projectId}` : null,
      publishableKeyMasked: mask(publishable),
      hasServiceRole: Boolean(serviceRole),
      ping: activePing,
    },
    dest: destDistinto
      ? {
          label: "Segundo Supabase configurado (DEST_*)",
          url: destUrl,
          projectId: destProjectId,
          projectRef: destRef,
          dashboardUrl: destProjectId ? `https://supabase.com/dashboard/project/${destProjectId}` : null,
          publishableKeyMasked: mask(destPublishable),
          hasServiceRole: Boolean(destServiceRole),
          ping: destPing,
        }
      : null,
    checkedAt: new Date().toISOString(),
  };
});
