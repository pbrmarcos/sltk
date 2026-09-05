import { createFileRoute } from "@tanstack/react-router";
import { AdminSettingsPage } from "@/components/admin/AdminSettingsPage";
import { MineracaoTab } from "@/components/admin/MineracaoTab";

export const Route = createFileRoute("/_authenticated/admin/mineracao")({
  component: () => (
    <AdminSettingsPage
      title="Mineração"
      subtitle="Credenciais e limites do provedor de prospecção de leads."
    >
      <MineracaoTab />
    </AdminSettingsPage>
  ),
});
