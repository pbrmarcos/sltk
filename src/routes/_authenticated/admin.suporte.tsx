import { createFileRoute, redirect } from "@tanstack/react-router";

// Balcão de suporte virou a aba "Redefinir senha" dentro de Usuários & Permissões.
export const Route = createFileRoute("/_authenticated/admin/suporte")({
  beforeLoad: () => {
    throw redirect({ to: "/admin/usuarios", search: { tab: "senha" } });
  },
});
