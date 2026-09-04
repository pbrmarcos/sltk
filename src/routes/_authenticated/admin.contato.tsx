import { createFileRoute } from "@tanstack/react-router";
import { AdminSettingsPage } from "@/components/admin/AdminSettingsPage";
import { ContatoConfigTab } from "@/components/admin/ContatoConfigTab";

export const Route = createFileRoute("/_authenticated/admin/contato")({
  component: () => (
    <AdminSettingsPage title="Contato" subtitle="Informações de contato exibidas no site público.">
      <ContatoConfigTab />
    </AdminSettingsPage>
  ),
});
