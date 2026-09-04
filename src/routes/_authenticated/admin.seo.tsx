import { createFileRoute } from "@tanstack/react-router";
import { AdminSettingsPage } from "@/components/admin/AdminSettingsPage";
import { SeoTab } from "@/components/admin/SeoTab";

export const Route = createFileRoute("/_authenticated/admin/seo")({
  component: () => (
    <AdminSettingsPage title="SEO" subtitle="Metadados de SEO por rota do site público.">
      <SeoTab />
    </AdminSettingsPage>
  ),
});
