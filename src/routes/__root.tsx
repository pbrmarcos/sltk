import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, useState } from "react";

import appCss from "../styles.css?url";
import { AuthProvider } from "@/hooks/use-auth";
import { BrandSettingsProvider } from "@/hooks/use-brand-settings";
import { checkClientEnv } from "@/lib/env-check";
import { installClientTelemetry, trackClientError } from "@/lib/client-telemetry";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

const faviconUrl = "/site-images/favicon.png";

function NotFoundComponent() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Página não encontrada</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          A página que você procura não existe ou foi movida.
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          Rota solicitada:{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono">{pathname}</code>
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Tentar novamente
          </button>
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Voltar para o início
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [incidentId, setIncidentId] = useState<string | null>(null);

  useEffect(() => {
    void trackClientError({ source: "boundary", error, route: pathname }).then(setIncidentId);
  }, [error, pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-lg text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Esta página não carregou
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Algo deu errado do nosso lado. Tente atualizar a página ou voltar para o início.
        </p>
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-xs text-muted-foreground">
          <span>
            Rota: <code className="rounded bg-muted px-1.5 py-0.5 font-mono">{pathname}</code>
          </span>
          {incidentId && (
            <span>
              ID: <code className="rounded bg-muted px-1.5 py-0.5 font-mono">{incidentId}</code>
            </span>
          )}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Se o problema persistir, entre em contato com o suporte e informe o ID acima.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Tentar novamente
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Voltar para o início
          </a>
        </div>
      </div>
    </div>
  );
}

function EnvErrorScreen({ message, missing }: { message: string; missing: string[] }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-lg text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Configuração incompleta
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">{message}</p>
        <ul className="mt-3 inline-flex flex-col gap-1 rounded border border-input bg-muted/40 p-3 text-left text-xs font-mono text-foreground">
          {missing.map((m) => (
            <li key={m}>• {m}</li>
          ))}
        </ul>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Tentar novamente
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Voltar para o início
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "SLTK Americas" },
      { name: "description", content: "Engenharia de packaging para indústrias que não param." },
      { name: "author", content: "SLTK Americas" },
      { property: "og:title", content: "SLTK Americas" },
      {
        property: "og:description",
        content: "Engenharia de packaging para indústrias que não param.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:site", content: "@sltkamericas" },
      { name: "twitter:title", content: "SLTK Americas" },
      {
        name: "twitter:description",
        content: "Engenharia de packaging para indústrias que não param.",
      },
      // og:image/twitter:image ficam APENAS nas rotas-folha (leaf) para não
      // sobrescrever a preview de páginas que definem sua própria imagem.
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/png", href: faviconUrl },
      { rel: "shortcut icon", type: "image/png", href: faviconUrl },
      { rel: "apple-touch-icon", href: faviconUrl },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const envCheck = checkClientEnv();

  useEffect(() => {
    installClientTelemetry();
  }, []);

  if (!envCheck.ok) {
    return <EnvErrorScreen message={envCheck.message} missing={envCheck.missing} />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrandSettingsProvider>
          <TooltipProvider delayDuration={150}>
            <Outlet />
            <Toaster richColors position="top-right" />
          </TooltipProvider>
        </BrandSettingsProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
