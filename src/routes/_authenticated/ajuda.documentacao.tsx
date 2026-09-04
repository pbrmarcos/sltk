import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/ajuda/documentacao")({
  head: () => ({
    meta: [
      { title: "Documentação — Solutek Hub" },
      { name: "description", content: "Guias e referências por categoria." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => <Outlet />,
});
