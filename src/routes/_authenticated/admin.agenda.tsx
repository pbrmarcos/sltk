import { createFileRoute } from "@tanstack/react-router";
import { AdminSettingsPage } from "@/components/admin/AdminSettingsPage";
import { CalendarAgendaTab } from "@/components/admin/CalendarAgendaTab";

export const Route = createFileRoute("/_authenticated/admin/agenda")({
  component: () => (
    <AdminSettingsPage
      title="Agenda & Calendário"
      subtitle="Administrador que recebe a cópia dos agendamentos reais e quais categorias são espelhadas."
    >
      <CalendarAgendaTab />
    </AdminSettingsPage>
  ),
});
