import { createFileRoute } from "@tanstack/react-router";
import { AdminSettingsPage } from "@/components/admin/AdminSettingsPage";
import { EnriquecimentoLogsTab } from "@/components/admin/EnriquecimentoLogsTab";

export const Route = createFileRoute("/_authenticated/admin/logs-fiscais")({
  component: () => (
    <AdminSettingsPage title="Logs de busca fiscal" subtitle="Histórico de consultas de enriquecimento fiscal.">
      <EnriquecimentoLogsTab />
    </AdminSettingsPage>
  ),
});
