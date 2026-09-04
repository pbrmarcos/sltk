import { createFileRoute } from "@tanstack/react-router";
import { AdminSettingsPage } from "@/components/admin/AdminSettingsPage";
import { BancoTab } from "@/components/admin/BancoTab";

export const Route = createFileRoute("/_authenticated/admin/banco")({
  component: () => (
    <AdminSettingsPage title="Banco de Dados" subtitle="Projeto Supabase ativo e status de conexão.">
      <BancoTab />
    </AdminSettingsPage>
  ),
});
