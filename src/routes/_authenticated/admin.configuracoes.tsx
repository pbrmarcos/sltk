import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";
import { AdminSettingsPage } from "@/components/admin/AdminSettingsPage";
import { AdministracaoTab } from "@/components/admin/AdministracaoTab";

// Compatibilidade: as antigas abas de ?tab= viraram rotas próprias.
const OLD_TAB_TO_ROUTE: Record<string, string> = {
  geral: "/admin/geral",
  contato: "/admin/contato",
  comercial: "/admin/origens-lead",
  diagnostico: "/admin/diagnostico",
  integracoes: "/admin/diagnostico",
  conectores: "/admin/diagnostico",
  mineracao: "/admin/mineracao",
  banco: "/admin/banco",
  seo: "/admin/seo",
  "enrich-logs": "/admin/logs-fiscais",
  migrations: "/admin/migrations",
};

const searchSchema = z.object({ tab: z.string().optional() });

export const Route = createFileRoute("/_authenticated/admin/configuracoes")({
  validateSearch: searchSchema,
  beforeLoad: ({ search }) => {
    const to = search.tab ? OLD_TAB_TO_ROUTE[search.tab] : undefined;
    if (to) throw redirect({ to });
  },
  component: () => (
    <AdminSettingsPage
      title="Configurações"
      subtitle="Visão administrativa, marca, comunicação, integrações e infraestrutura do sistema."
    >
      <AdministracaoTab />
    </AdminSettingsPage>
  ),
});
