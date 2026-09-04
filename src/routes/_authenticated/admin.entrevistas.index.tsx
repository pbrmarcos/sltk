import { createFileRoute, redirect } from "@tanstack/react-router";

// Formulários de Entrevista virou a aba "Entrevista" dentro de Modelos de Formulário.
export const Route = createFileRoute("/_authenticated/admin/entrevistas/")({
  beforeLoad: () => {
    throw redirect({ to: "/admin/modelos-formulario", search: { tab: "entrevista" } });
  },
});
