import { createFileRoute } from "@tanstack/react-router";
import { AdminSettingsPage } from "@/components/admin/AdminSettingsPage";
import { ManutencaoTab } from "@/components/admin/ManutencaoTab";

export const Route = createFileRoute("/_authenticated/admin/manutencao")({
  component: () => (
    <AdminSettingsPage
      title="Modo Manutenção"
      subtitle="Bloqueie o site para visitantes durante manutenções — admins continuam com acesso."
    >
      <ManutencaoTab />
    </AdminSettingsPage>
  ),
});
