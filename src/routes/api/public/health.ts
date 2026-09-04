import { createFileRoute } from "@tanstack/react-router";

// Endpoint público de healthcheck — usado pelo Docker/Coolify.
// Não acessa banco nem auth de propósito (precisa responder mesmo em degradação).
export const Route = createFileRoute("/api/public/health")({
  server: {
    handlers: {
      GET: async () =>
        new Response(JSON.stringify({ status: "ok", ts: Date.now() }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
    },
  },
});
