import { createFileRoute } from "@tanstack/react-router";
import { AdminSettingsPage } from "@/components/admin/AdminSettingsPage";
import { ProspeccaoCriteriosTab } from "@/components/admin/ProspeccaoCriteriosTab";

export const Route = createFileRoute("/_authenticated/admin/prospeccao")({
  component: () => (
    <AdminSettingsPage
      title="Critérios de Prospecção"
      subtitle="Perfil ideal de cliente e regras que a IA usa para qualificar leads (A/B/C)."
    >
      <ProspeccaoCriteriosTab />
    </AdminSettingsPage>
  ),
});
