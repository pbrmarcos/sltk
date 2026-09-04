import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/pos-vendas/")({
  beforeLoad: () => {
    throw redirect({ to: "/pos-vendas/sat" });
  },
});
