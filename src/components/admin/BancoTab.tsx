import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Database, RefreshCw, ExternalLink, CheckCircle2, XCircle, Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getBackendInfo } from "@/lib/admin-backend-info.functions";

type Conn = {
  label: string;
  url: string | null;
  projectId: string | null;
  projectRef: string | null;
  dashboardUrl: string | null;
  publishableKeyMasked: string | null;
  hasServiceRole: boolean;
  ping: { ok: boolean; status: number; error: string | null };
};

function copy(value: string | null | undefined, label: string) {
  if (!value) return;
  navigator.clipboard.writeText(value);
  toast.success(`${label} copiado`);
}

function ConnectionCard({ data, primary }: { data: Conn; primary?: boolean }) {
  const configured = Boolean(data.url);
  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--bg-border)] bg-white p-6 shadow-[var(--shadow-sm)]">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-center gap-2">
          <Database className="h-5 w-5 text-[var(--accent)]" />
          <h2 className="text-base font-semibold">{data.label}</h2>
          {primary && <Badge variant="secondary">em uso</Badge>}
        </div>
        {configured ? (
          data.ping.ok ? (
            <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
              <CheckCircle2 className="h-3 w-3 mr-1" /> Online
            </Badge>
          ) : (
            <Badge className="bg-red-100 text-red-700 border-red-200">
              <XCircle className="h-3 w-3 mr-1" /> {data.ping.error || "Offline / pausado"}
            </Badge>
          )
        ) : (
          <Badge variant="outline">não configurado</Badge>
        )}
      </div>

      {!configured ? (
        <p className="text-sm text-[var(--text-muted)]">
          Nenhuma URL definida para esta conexão.
        </p>
      ) : (
        <dl className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-y-3 gap-x-4 text-sm">
          <dt className="text-[var(--text-muted)]">Project ID / ref</dt>
          <dd className="font-mono flex items-center gap-2">
            <span>{data.projectId ?? "—"}</span>
            {data.projectId && (
              <button onClick={() => copy(data.projectId, "Project ID")} className="text-[var(--text-muted)] hover:text-[var(--accent)]">
                <Copy className="h-3.5 w-3.5" />
              </button>
            )}
          </dd>

          <dt className="text-[var(--text-muted)]">URL</dt>
          <dd className="font-mono break-all flex items-center gap-2">
            <span>{data.url}</span>
            <button onClick={() => copy(data.url, "URL")} className="text-[var(--text-muted)] hover:text-[var(--accent)]">
              <Copy className="h-3.5 w-3.5" />
            </button>
          </dd>

          <dt className="text-[var(--text-muted)]">Publishable key</dt>
          <dd className="font-mono">{data.publishableKeyMasked ?? "—"}</dd>

          <dt className="text-[var(--text-muted)]">Service role key</dt>
          <dd>
            {data.hasServiceRole ? (
              <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">configurada</Badge>
            ) : (
              <Badge variant="outline">ausente</Badge>
            )}
          </dd>

          <dt className="text-[var(--text-muted)]">Health check</dt>
          <dd>
            HTTP {data.ping.status || "—"} {data.ping.ok ? "(ok)" : data.ping.error ? `— ${data.ping.error}` : ""}
          </dd>

          {data.dashboardUrl && (
            <>
              <dt className="text-[var(--text-muted)]">Dashboard</dt>
              <dd>
                <a
                  href={data.dashboardUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[var(--accent)] hover:underline"
                >
                  Abrir no Supabase <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </dd>
            </>
          )}
        </dl>
      )}
    </div>
  );
}

export function BancoTab() {
  const fetchInfo = useServerFn(getBackendInfo);

  const { data, isFetching, refetch } = useQuery({
    queryKey: ["admin", "backend-info"],
    queryFn: () => fetchInfo(),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="text-sm text-[var(--text-muted)]">
          Qual Supabase está conectado ao app, credenciais (mascaradas) e status de saúde.
        </p>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`} /> Atualizar
        </Button>
      </div>

      <div className={`grid grid-cols-1 gap-4 ${data?.dest ? "lg:grid-cols-2" : ""}`}>
        {data ? (
          <>
            <ConnectionCard data={data.active as Conn} primary />
            {data.dest && <ConnectionCard data={data.dest as Conn} />}
          </>
        ) : (
          <p className="text-sm text-[var(--text-muted)]">Carregando…</p>
        )}
      </div>

      {data && (
        <p className="text-xs text-[var(--text-muted)]">
          Verificado em {new Date(data.checkedAt).toLocaleString("pt-BR")}. Se o status estiver "Offline / pausado",
          provavelmente o projeto correspondente está em pausa no painel do Supabase — basta abrir o dashboard e
          clicar em "Restore project".
        </p>
      )}
    </div>
  );
}
