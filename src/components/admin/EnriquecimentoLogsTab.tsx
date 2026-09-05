import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, CheckCircle2, XCircle, Database, RefreshCw } from "lucide-react";
import { listEnrichLogs } from "@/lib/enrich-logs.functions";
import { Flag } from "@/components/ui/flag";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type StatusFilter = "all" | "success" | "fail";

export function EnriquecimentoLogsTab() {
  const [pais, setPais] = useState<string>("all");
  const [status, setStatus] = useState<StatusFilter>("all");

  const q = useQuery({
    queryKey: ["admin", "enrich-logs", pais, status],
    queryFn: () =>
      listEnrichLogs({
        data: {
          pais: pais === "all" ? undefined : pais,
          success: status === "all" ? undefined : status === "success",
          limit: 200,
        },
      }),
    staleTime: 15_000,
  });

  const rows = q.data ?? [];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-[var(--text-muted)]">
          Histórico das últimas 200 consultas de enriquecimento (busca fiscal). Acesso restrito a
          administradores e gerentes.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={pais} onValueChange={setPais}>
            <SelectTrigger className="h-8 w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os países</SelectItem>
              <SelectItem value="BR">Brasil</SelectItem>
              <SelectItem value="PY">Paraguai</SelectItem>
              <SelectItem value="AR">Argentina</SelectItem>
              <SelectItem value="UY">Uruguai</SelectItem>
              <SelectItem value="PE">Peru</SelectItem>
              <SelectItem value="CR">Costa Rica</SelectItem>
              <SelectItem value="EC">Equador</SelectItem>
              <SelectItem value="CL">Chile</SelectItem>
              <SelectItem value="PA">Panamá</SelectItem>
              <SelectItem value="CO">Colômbia</SelectItem>
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={(v) => setStatus(v as StatusFilter)}>
            <SelectTrigger className="h-8 w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos status</SelectItem>
              <SelectItem value="success">Sucesso</SelectItem>
              <SelectItem value="fail">Falha</SelectItem>
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => q.refetch()}
            disabled={q.isFetching}
          >
            {q.isFetching ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            )}
            Atualizar
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--bg-border)] bg-[var(--bg-surface)] shadow-[var(--shadow-sm)]">
        {q.isLoading ? (
          <div className="flex justify-center p-10">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : rows.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">
            Nenhum registro encontrado.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[12.5px]">
              <thead className="bg-muted/40 text-[11px] uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold">Data</th>
                  <th className="px-3 py-2 text-left font-semibold">País</th>
                  <th className="px-3 py-2 text-left font-semibold">Documento</th>
                  <th className="px-3 py-2 text-left font-semibold">Provedor</th>
                  <th className="px-3 py-2 text-left font-semibold">Resultado</th>
                  <th className="px-3 py-2 text-left font-semibold">Usuário</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--bg-border)]">
                {rows.map((r) => (
                  <tr key={r.id} className="hover:bg-muted/30">
                    <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
                      {new Date(r.created_at).toLocaleString("pt-BR")}
                    </td>
                    <td className="px-3 py-2">
                      <span className="inline-flex items-center gap-1.5">
                        <Flag code={r.pais} size={16} />
                        <span className="font-mono text-[11px]">{r.pais}</span>
                      </span>
                    </td>
                    <td className="px-3 py-2 font-mono text-[11.5px]">{r.documento}</td>
                    <td className="px-3 py-2">
                      <span className="inline-flex items-center gap-1.5">
                        <code className="rounded bg-muted px-1.5 py-0.5 text-[10.5px] font-mono">
                          {r.provider ?? "—"}
                        </code>
                        {r.cached && (
                          <span className="inline-flex items-center gap-0.5 text-[10.5px] text-muted-foreground">
                            <Database className="h-3 w-3" /> cache
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      {r.success ? (
                        <StatusBadge tone="success">
                          <CheckCircle2 className="mr-1 h-3 w-3" /> Sucesso
                        </StatusBadge>
                      ) : (
                        <span className="inline-flex max-w-[420px] items-center gap-1.5">
                          <StatusBadge tone="danger">
                            <XCircle className="mr-1 h-3 w-3" /> Falha
                          </StatusBadge>
                          {r.error && (
                            <span
                              className="truncate text-[11px] text-muted-foreground"
                              title={r.error}
                            >
                              {r.error}
                            </span>
                          )}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{r.user_email ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
