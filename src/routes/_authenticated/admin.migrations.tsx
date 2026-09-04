import { createFileRoute } from "@tanstack/react-router";
import { AdminSettingsPage } from "@/components/admin/AdminSettingsPage";
import { MigrationsTab } from "@/components/admin/MigrationsTab";

export const Route = createFileRoute("/_authenticated/admin/migrations")({
  component: () => (
    <AdminSettingsPage title="Migrations" subtitle="Aplicar migrations SQL pendentes no banco.">
      <MigrationsTab />
    </AdminSettingsPage>
  ),
});
