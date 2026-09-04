import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { ShieldAlert } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdministracaoTab } from "@/components/admin/AdministracaoTab";
import { ConfiguracoesTab } from "@/components/admin/ConfiguracoesTab";
import { DiagnosticoTab } from "@/components/admin/DiagnosticoTab";
import { BancoTab } from "@/components/admin/BancoTab";
import { EnriquecimentoLogsTab } from "@/components/admin/EnriquecimentoLogsTab";
import { SeoTab } from "@/components/admin/SeoTab";
import { ContatoConfigTab } from "@/components/admin/ContatoConfigTab";
import { MigrationsTab } from "@/components/admin/MigrationsTab";
import { MineracaoTab } from "@/components/admin/MineracaoTab";
import { OrigensLeadTab } from "@/components/admin/OrigensLeadTab";

const TABS = [
  "administracao",
  "geral",
  "contato",
  "comercial",
  "diagnostico",
  "mineracao",
  "banco",
  "seo",
  "enrich-logs",
  "migrations",
] as const;
type TabKey = (typeof TABS)[number];

// Chaves antigas continuam funcionando e caem na nova aba consolidada.
const LEGACY_TABS: Record<string, TabKey> = {
  integracoes: "diagnostico",
  conectores: "diagnostico",
};

const searchSchema = z.object({
  tab: z
    .string()
    .optional()
    .transform((v) => (v && LEGACY_TABS[v] ? LEGACY_TABS[v] : v))
    .pipe(z.enum(TABS).optional()),
});

export const Route = createFileRoute("/_authenticated/admin/configuracoes")({
  validateSearch: searchSchema,
  component: ConfiguracoesPage,
});


function ConfiguracoesPage() {
  const { role } = useAuth();
  const { tab } = Route.useSearch();
  const navigate = useNavigate();
  const crumbs = [
    { label: "Home", href: "/" },
    { label: "Administração", href: "/admin" },
    { label: "Configurações" },
  ];

  if (role !== "admin") {
    return (
      <PageContainer>
        <PageHeader breadcrumbs={crumbs} title="Configurações" />
        <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-[var(--bg-border)] bg-[var(--bg-surface)] p-12 text-center">
          <ShieldAlert className="h-10 w-10 text-[var(--danger)]" />
          <h2 className="text-lg font-semibold">Acesso restrito</h2>
          <p className="text-sm text-[var(--text-muted)]">
            Esta área é exclusiva para administradores.
          </p>
        </div>
      </PageContainer>
    );
  }

  const active: TabKey = tab ?? "administracao";

  return (
    <PageContainer>
      <PageHeader
        breadcrumbs={crumbs}
        title="Configurações"
        subtitle="Visão administrativa, marca, comunicação, integrações e infraestrutura do sistema."
      />
      <Tabs
        value={active}
        onValueChange={(v) =>
          navigate({
            to: "/admin/configuracoes",
            search: {
              tab: v === "administracao" ? undefined : (v as Exclude<TabKey, "administracao">),
            },
          })
        }
        className="w-full"
      >
        <TabsList className="flex-wrap gap-x-1 gap-y-1.5">
          <TabsTrigger value="administracao">Administração</TabsTrigger>
          <span className="mx-1 h-5 w-px self-center bg-[var(--bg-border)]" aria-hidden />
          <TabsTrigger value="diagnostico">Chaves & Diagnóstico</TabsTrigger>
          <TabsTrigger value="banco">Banco de dados</TabsTrigger>
          <TabsTrigger value="mineracao">Mineração</TabsTrigger>
          <span className="mx-1 h-5 w-px self-center bg-[var(--bg-border)]" aria-hidden />
          <TabsTrigger value="geral">Geral</TabsTrigger>
          <TabsTrigger value="contato">Contato</TabsTrigger>
          <TabsTrigger value="seo">SEO</TabsTrigger>
          <span className="mx-1 h-5 w-px self-center bg-[var(--bg-border)]" aria-hidden />
          <TabsTrigger value="comercial">Comercial</TabsTrigger>
          <TabsTrigger value="enrich-logs">Logs de busca fiscal</TabsTrigger>
          <TabsTrigger value="migrations">Migrations</TabsTrigger>
        </TabsList>
        <TabsContent value="administracao" className="mt-4">
          <AdministracaoTab />
        </TabsContent>
        <TabsContent value="geral" className="mt-4">
          <ConfiguracoesTab />
        </TabsContent>
        <TabsContent value="contato" className="mt-4">
          <ContatoConfigTab />
        </TabsContent>
        <TabsContent value="comercial" className="mt-4">
          <OrigensLeadTab />
        </TabsContent>
        <TabsContent value="diagnostico" className="mt-4">
          <DiagnosticoTab />
        </TabsContent>

        <TabsContent value="mineracao" className="mt-4">
          <MineracaoTab />
        </TabsContent>

        <TabsContent value="banco" className="mt-4">
          <BancoTab />
        </TabsContent>
        <TabsContent value="seo" className="mt-4">
          <SeoTab />
        </TabsContent>
        <TabsContent value="enrich-logs" className="mt-4">
          <EnriquecimentoLogsTab />
        </TabsContent>
        <TabsContent value="migrations" className="mt-4">
          <MigrationsTab />
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}
