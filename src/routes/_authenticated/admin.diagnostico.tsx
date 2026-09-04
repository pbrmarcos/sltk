import { createFileRoute } from "@tanstack/react-router";
import { AdminSettingsPage } from "@/components/admin/AdminSettingsPage";
import { DiagnosticoTab } from "@/components/admin/DiagnosticoTab";

export const Route = createFileRoute("/_authenticated/admin/diagnostico")({
  component: () => (
    <AdminSettingsPage
      title="Chaves & Diagnóstico"
      subtitle="Status das integrações externas e como reconectá-las."
    >
      <DiagnosticoTab />
    </AdminSettingsPage>
  ),
});
