import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { LOGIN_AT_KEY, SESSION_MAX_MS } from "@/hooks/use-auth";
import { useEffect, useState } from "react";
import { AlertTriangle, Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { AppSidebar, AppSidebarContent, useCloseOnNavigate } from "@/components/layout/AppSidebar";
import { ModuleGuard } from "@/components/layout/ModuleGuard";

import { runStartupCheck } from "@/lib/startup-check";
import { reportClientError } from "@/lib/error-report.functions";
import { Button } from "@/components/ui/button";
import { useBrandSettingsOptional } from "@/hooks/use-brand-settings";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    // 8h fixed session
    if (typeof window !== "undefined") {
      const raw = localStorage.getItem(LOGIN_AT_KEY);
      const loginAt = raw ? Number(raw) : NaN;
      if (Number.isFinite(loginAt) && Date.now() - loginAt > SESSION_MAX_MS) {
        localStorage.removeItem(LOGIN_AT_KEY);
        await supabase.auth.signOut();
        throw redirect({ to: "/login", search: { redirect: location.href } });
      }
    }

    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      throw redirect({ to: "/login", search: { redirect: location.href } });
    }
    return { user: data.user };
  },
  component: AuthenticatedShell,
  errorComponent: AuthenticatedErrorBoundary,
});

function AuthenticatedShell() {
  const [mobileOpen, setMobileOpen] = useState(false);
  useCloseOnNavigate(() => setMobileOpen(false));
  const { settings: brand } = useBrandSettingsOptional();
  const { profile } = useAuth();

  useEffect(() => {
    void runStartupCheck();
  }, []);

  // Troca de senha obrigatória no primeiro acesso.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (profile?.must_change_password && window.location.pathname !== "/trocar-senha") {
      window.location.replace("/trocar-senha");
    }
  }, [profile?.must_change_password]);

  return (
    <div className="flex min-h-screen w-full bg-[var(--bg-base)]">
      <AppSidebar />
      <div className="flex flex-1 flex-col min-w-0">
        <header className="flex md:hidden items-center gap-2 h-14 border-b border-[var(--bg-border)] bg-[var(--bg-surface)] px-3">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Abrir menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[260px] p-0">
              <SheetTitle className="sr-only">Menu de navegação</SheetTitle>
              <AppSidebarContent onNavigate={() => setMobileOpen(false)} />
            </SheetContent>
          </Sheet>
          <span className="text-sm font-semibold text-[var(--text-primary)]">
            {brand?.system_name ?? "Solutek Operations"}
          </span>
        </header>
        <main className="flex-1 overflow-auto flex flex-col">
          <ModuleGuard>
            <Outlet />
          </ModuleGuard>
        </main>

        {(brand?.footer_text || brand?.support_email) && (
          <footer className="border-t border-[var(--bg-border)] bg-[var(--bg-surface)] px-6 py-3 text-center text-[11px] text-[var(--text-muted)] flex flex-wrap justify-center items-center gap-x-3 gap-y-1">
            {brand?.footer_text && <span>{brand.footer_text}</span>}
            {brand?.footer_text && brand?.support_email && <span className="opacity-40">·</span>}
            {brand?.support_email && (
              <a href={`mailto:${brand.support_email}`} className="hover:text-[var(--text-primary)] transition-colors">
                {brand.support_email}
              </a>
            )}
          </footer>
        )}
      </div>
    </div>
  );
}

function generateIncidentId(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `INC-${ts}-${rand}`;
}

function AuthenticatedErrorBoundary({ error, reset }: { error: Error; reset: () => void }) {
  const message = error?.message ?? String(error);
  const isMissingModule = /Cannot find module|Failed to resolve|Failed to fetch dynamically imported module/i.test(
    message,
  );
  // Stable incident ID for this boundary instance.
  const [incidentId] = useState(() => generateIncidentId());
  const [copied, setCopied] = useState(false);

  const clip = (s: string | undefined, n: number) =>
    s ? s.replace(/[\r\n]+/g, " ").slice(0, n) : undefined;

  useEffect(() => {
    // Log locally with the ID so users/admins can correlate via console.
    console.error(`[AuthenticatedErrorBoundary] incident=${incidentId}`, error);
    // Best-effort report to the backend; never let logging fail the UI.
    // Pre-trim every field so server-side validators never reject the payload
    // — keeping the boundary's fallback UI visible no matter what.
    try {
      void reportClientError({
        data: {
          incidentId,
          message: clip(message, 500) ?? "unknown",
          stack: clip(error?.stack, 2000),
          url: clip(typeof window !== "undefined" ? window.location.href : undefined, 500),
          userAgent: clip(typeof navigator !== "undefined" ? navigator.userAgent : undefined, 300),
          route: clip(typeof window !== "undefined" ? window.location.pathname : undefined, 200),
        },
      }).catch((err) => console.warn("[AuthenticatedErrorBoundary] report failed", err));
    } catch (err) {
      console.warn("[AuthenticatedErrorBoundary] report threw", err);
    }
  }, [incidentId, message, error]);

  const copyId = async () => {
    try {
      await navigator.clipboard.writeText(incidentId);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg-base)] px-4">
      <div className="max-w-lg rounded-lg border border-[var(--bg-border)] bg-[var(--bg-surface)] p-6 text-center">
        <AlertTriangle className="mx-auto h-10 w-10 text-[var(--danger)]" />
        <h1 className="mt-3 text-xl font-semibold text-[var(--text-primary)]">
          {isMissingModule ? "Módulo não encontrado" : "Algo deu errado"}
        </h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          {isMissingModule
            ? "Uma dependência necessária não pôde ser carregada. Verifique o console para detalhes técnicos e contate um administrador."
            : "Não foi possível carregar esta página. Tente novamente ou abra o console para mais detalhes."}
        </p>
        <div className="mt-3 flex items-center justify-center gap-2 text-xs text-[var(--text-muted)]">
          <span>ID da ocorrência:</span>
          <code className="rounded bg-[var(--bg-elevated)] px-2 py-0.5 font-mono text-[var(--text-primary)]">
            {incidentId}
          </code>
          <Button type="button" variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={copyId}>
            {copied ? "Copiado" : "Copiar"}
          </Button>
        </div>
        <p className="mt-3 text-xs text-[var(--text-muted)]">
          {isMissingModule
            ? "Uma atualização recente exige recarregar a página."
            : "Ocorreu um erro inesperado. Informe o ID acima ao suporte se o problema persistir."}
        </p>
        <div className="mt-4 flex justify-center gap-2">
          <Button onClick={() => reset()}>Tentar novamente</Button>
          <Button asChild variant="outline">
            <a href="/">Ir para início</a>
          </Button>
        </div>
      </div>
    </div>
  );
}