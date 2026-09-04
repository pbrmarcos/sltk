import { createFileRoute } from "@tanstack/react-router";
import { AdminSettingsPage } from "@/components/admin/AdminSettingsPage";
import { ConfiguracoesTab } from "@/components/admin/ConfiguracoesTab";

export const Route = createFileRoute("/_authenticated/admin/geral")({
  component: () => (
    <AdminSettingsPage title="Geral" subtitle="Marca, logos, cores e identidade do site.">
      <ConfiguracoesTab />
    </AdminSettingsPage>
  ),
});
