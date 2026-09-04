import { createFileRoute, redirect } from "@tanstack/react-router";

// Rota legada — mantida como redirect para preservar links antigos.
export const Route = createFileRoute("/_authenticated/engenharia/eletrico")({
  beforeLoad: () => {
    throw redirect({ to: "/engenharia/projetos", search: { d: "eletrico" } });
  },
});
