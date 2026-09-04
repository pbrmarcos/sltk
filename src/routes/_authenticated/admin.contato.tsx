import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/admin/contato")({
  beforeLoad: () => {
    throw redirect({
      to: "/pos-vendas/chamados",
      search: { origem: "contato_site" } as never,
    });
  },
});
