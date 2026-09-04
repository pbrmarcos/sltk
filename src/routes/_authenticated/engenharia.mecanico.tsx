import { createFileRoute, redirect } from "@tanstack/react-router";

// Rota legada — mantida como redirect para preservar links antigos.
export const Route = createFileRoute("/_authenticated/engenharia/mecanico")({
  beforeLoad: () => {
    throw redirect({ to: "/engenharia/projetos", search: { d: "mecanico" } });
  },
});
