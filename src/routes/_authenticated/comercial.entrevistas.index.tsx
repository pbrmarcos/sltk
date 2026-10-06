import { createFileRoute, redirect } from "@tanstack/react-router";

/** Rota antiga: a lista de entrevistas vive em Comercial → Formulários. */
export const Route = createFileRoute("/_authenticated/comercial/entrevistas/")({
  beforeLoad: () => {
    throw redirect({ to: "/comercial/formularios", search: { aba: "entrevistas" } });
  },
});
