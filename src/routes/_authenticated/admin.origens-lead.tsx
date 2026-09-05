import { createFileRoute } from "@tanstack/react-router";
import { AdminSettingsPage } from "@/components/admin/AdminSettingsPage";
import { OrigensLeadTab } from "@/components/admin/OrigensLeadTab";

export const Route = createFileRoute("/_authenticated/admin/origens-lead")({
  component: () => (
    <AdminSettingsPage
      title="Origens de Lead"
      subtitle="Catálogo de origens usado no pipeline comercial."
    >
      <OrigensLeadTab />
    </AdminSettingsPage>
  ),
});
