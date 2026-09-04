import { createFileRoute, redirect } from "@tanstack/react-router";

// Logs de busca fiscal passaram a viver dentro de Chaves & Diagnóstico.
export const Route = createFileRoute("/_authenticated/admin/logs-fiscais")({
  beforeLoad: () => {
    throw redirect({ to: "/admin/diagnostico" });
  },
});
