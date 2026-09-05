import { createFileRoute, redirect } from "@tanstack/react-router";

// Banco de Dados virou a aba "Banco de Dados" dentro de Chaves & Diagnóstico.
export const Route = createFileRoute("/_authenticated/admin/banco")({
  beforeLoad: () => {
    throw redirect({ to: "/admin/diagnostico" });
  },
});
