import { useMutation, useQuery, useQueryClient, queryOptions } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Sparkles,
  KeyRound,
  ExternalLink,
  History,
} from "lucide-react";
import { toast } from "sonner";
import { runDiagnostico } from "@/lib/system-diagnostics.functions";
import { listGeminiScanLogs } from "@/lib/fornecedores.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

type GroqStatus = {
  conectado: boolean;
  detalhe: string;
  latencia_ms?: number;
  chave_mascarada: string | null;
};

export function GroqConfigCard() {
  const qc = useQueryClient();
  const fn = useServerFn(runDiagnostico);
  const testGroq = async (): Promise<GroqStatus> => {
    const res = await fn({ data: { ids: ["groq"] } });
    const cap = res.itens[0];
    return {
      conectado: cap?.status === "ok",
      detalhe: cap?.detalhe ?? "Sem resposta.",
      latencia_ms: cap?.latencia_ms,
      chave_mascarada: cap?.envs.find((e) => e.nome === "GROQ_API_KEY")?.mascara ?? null,
    };
  };
  const qo = queryOptions({
    queryKey: ["admin", "groq-config"],
    queryFn: testGroq,
    staleTime: 30_000,
  });
  const q = useQuery(qo);
  const logsFn = useServerFn(listGeminiScanLogs);
  const logs = useQuery({
    queryKey: ["admin", "scan-logs"],
    queryFn: () => logsFn({ data: { limit: 10, only_failures: false } }),
    staleTime: 15_000,
  });

  const test = useMutation({
    mutationFn: testGroq,
    onSuccess: (d) => {
      qc.setQueryData(qo.queryKey, d);
      if (d.conectado) toast.success(`Groq OK — ${d.latencia_ms ?? 0}ms`);
      else toast.error(`Falha: ${d.detalhe}`);
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const data = q.data;

  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--bg-border)] bg-[var(--bg-surface)] p-5 shadow-[var(--shadow-sm)]">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="rounded-md bg-[var(--primary)]/10 p-2">
            <Sparkles className="h-5 w-5 text-[var(--primary)]" />
          </div>
          <div>
            <h3 className="text-[14px] font-semibold text-[var(--text-primary)]">Groq</h3>
            <p className="text-[12.5px] text-[var(--text-muted)]">
              OCR de cartões/folders + enriquecimento web para cadastro de fornecedores.
            </p>
          </div>
        </div>
        {data ? (
          data.conectado ? (
            <Badge className="bg-[var(--success)]/15 text-[var(--success)] border-[var(--success)]/30">
              <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Conectado
            </Badge>
          ) : (
            <Badge className="bg-[var(--danger)]/15 text-[var(--danger)] border-[var(--danger)]/30">
              <XCircle className="mr-1 h-3.5 w-3.5" /> Desconectado
            </Badge>
          )
        ) : null}
      </div>

      <div className="space-y-3">
        <div>
          <Label className="flex items-center gap-1.5 text-[12px]">
            <KeyRound className="h-3.5 w-3.5" /> GROQ_API_KEY
          </Label>
          <div className="mt-1 flex gap-2">
            <Input
              readOnly
              value={data?.chave_mascarada ?? (q.isLoading ? "Carregando…" : "Não configurada")}
              className="font-mono text-[13px]"
            />
            <Button
              variant="outline"
              onClick={() => test.mutate()}
              disabled={test.isPending || q.isLoading}
            >
              {test.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Testar"}
            </Button>
          </div>
          {data?.detalhe && (
            <p
              className={`mt-1.5 text-[12px] ${
                data.conectado ? "text-[var(--success)]" : "text-[var(--danger)]"
              }`}
            >
              {data.detalhe}
              {typeof data.latencia_ms === "number" && ` · ${data.latencia_ms}ms`}
            </p>
          )}
        </div>

        <div className="rounded-md border border-dashed border-[var(--bg-border)] bg-[var(--bg-elevated)] p-3 text-[12px] text-[var(--text-muted)]">
          <p className="mb-1 font-medium text-[var(--text-secondary)]">Modelos em uso</p>
          <ul className="ml-4 list-disc space-y-0.5">
            <li>
              <code className="font-mono">modelo de visão detectado automaticamente</code> —
              extração estruturada das imagens (usa o melhor modelo disponível na sua chave).
            </li>
            <li>
              <code className="font-mono">modelo de texto detectado automaticamente</code> —
              sumarização do enriquecimento web (resultados do Firecrawl).
            </li>
          </ul>
        </div>

        <p className="text-[11.5px] text-[var(--text-muted)]">
          Para rotacionar a chave, atualize o segredo{" "}
          <code className="rounded bg-muted px-1 py-0.5 font-mono">GROQ_API_KEY</code> nas
          configurações do projeto.{" "}
          <a
            href="https://console.groq.com/keys"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-0.5 text-[var(--primary)] hover:underline"
          >
            Obter chave no console Groq <ExternalLink className="h-3 w-3" />
          </a>
        </p>

        <div className="rounded-md border border-[var(--bg-border)] bg-[var(--bg-elevated)] p-3">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[12px] font-medium text-[var(--text-secondary)]">
              <History className="h-3.5 w-3.5" /> Últimas chamadas (auditoria)
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => logs.refetch()}
              disabled={logs.isFetching}
              className="h-7 px-2 text-[11.5px]"
            >
              {logs.isFetching ? <Loader2 className="h-3 w-3 animate-spin" /> : "Atualizar"}
            </Button>
          </div>
          {logs.data && !logs.data.available ? (
            <p className="text-[11.5px] text-[var(--text-muted)]">
              Tabela de log ainda não foi criada. Aplique a migração{" "}
              <code className="font-mono">gemini_scan_log</code>.
            </p>
          ) : logs.data && logs.data.rows.length === 0 ? (
            <p className="text-[11.5px] text-[var(--text-muted)]">
              Nenhuma chamada registrada ainda.
            </p>
          ) : (
            <ul className="space-y-1.5 text-[11.5px]">
              {(logs.data?.rows ?? []).map((r) => (
                <li
                  key={r.id}
                  className="flex items-start justify-between gap-2 border-b border-[var(--bg-border)] pb-1.5 last:border-0 last:pb-0"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      {r.ok ? (
                        <CheckCircle2 className="h-3 w-3 text-[var(--success)]" />
                      ) : (
                        <XCircle className="h-3 w-3 text-[var(--danger)]" />
                      )}
                      <span className="font-mono text-[11px] text-[var(--text-muted)]">
                        {new Date(r.created_at).toLocaleString("pt-BR")}
                      </span>
                      {r.status ? (
                        <Badge variant="outline" className="h-4 px-1 text-[10px]">
                          {r.status}
                          {r.code ? ` ${r.code}` : ""}
                        </Badge>
                      ) : r.code ? (
                        <Badge variant="outline" className="h-4 px-1 text-[10px]">
                          {r.code}
                        </Badge>
                      ) : null}
                    </div>
                    {r.message ? (
                      <p className="mt-0.5 line-clamp-2 text-[var(--text-secondary)]">
                        {r.message}
                      </p>
                    ) : null}
                    {r.user_email ? (
                      <p className="text-[10.5px] text-[var(--text-muted)]">{r.user_email}</p>
                    ) : null}
                  </div>
                  {typeof r.duration_ms === "number" ? (
                    <span className="shrink-0 font-mono text-[10.5px] text-[var(--text-muted)]">
                      {r.duration_ms}ms
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
