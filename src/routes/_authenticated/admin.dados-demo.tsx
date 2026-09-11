import { createFileRoute } from "@tanstack/react-router";
import { AdminSettingsPage } from "@/components/admin/AdminSettingsPage";
import { DadosDemoTab } from "@/components/admin/DadosDemoTab";

export const Route = createFileRoute("/_authenticated/admin/dados-demo")({
  component: () => (
    <AdminSettingsPage
      title="Dados de Demonstração"
      subtitle="Conteúdo de exemplo seedado para testes — exclua quando não precisar mais."
    >
      <DadosDemoTab />
    </AdminSettingsPage>
  ),
});
