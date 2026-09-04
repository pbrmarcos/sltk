import { createFileRoute, redirect } from "@tanstack/react-router";

// Tipos de Checklist virou a aba "Checklist" dentro de Modelos de Formulário.
export const Route = createFileRoute("/_authenticated/admin/checklist-tipos")({
  beforeLoad: () => {
    throw redirect({ to: "/admin/modelos-formulario", search: { tab: "checklist" } });
  },
});
