import { createFileRoute } from "@tanstack/react-router";

// Endpoint de prontidão — diz se o runtime deste ambiente (preview, Coolify, etc.)
// tem acesso administrativo válido, SEM revelar nomes de variáveis ou valores.
// Útil para checar rapidamente um deploy novo: /api/public/readiness
export const Route = createFileRoute("/api/public/readiness")({
  server: {
    handlers: {
      GET: async () => {
        const { getServiceRoleStatus } = await import("@/lib/service-role-health.server");
        const status = await getServiceRoleStatus();
        const body = status.ok
          ? { status: "ready", admin: "ok" as const }
          : { status: "degraded", admin: status.reason };
        return new Response(JSON.stringify({ ...body, ts: Date.now() }), {
          status: 200,
          headers: { "content-type": "application/json", "cache-control": "no-store" },
        });
      },
    },
  },
});
