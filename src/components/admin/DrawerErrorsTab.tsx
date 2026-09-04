import { useMemo, useState } from "react";
import { Trash2, ChevronDown, ChevronRight, Bug } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TableEmpty } from "@/components/data/TableStates";
import { Toolbar, ToolbarSearch, ToolbarSpacer } from "@/components/data/Toolbar";
import {
  useDrawerErrors,
  clearDrawerErrors,
  type DrawerErrorRecord,
} from "@/lib/processos/drawer-errors.store";
import { cn } from "@/lib/utils";

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "medium" });
  } catch {
    return iso;
  }
}

export function DrawerErrorsTab() {
  const records = useDrawerErrors((s) => s.records);
  const [q, setQ] = useState("");
  const [routeFilter, setRouteFilter] = useState("todas");
  const [versionFilter, setVersionFilter] = useState("todas");
  const [expanded, setExpanded] = useState<string | null>(null);

  const routes = useMemo(
    () => Array.from(new Set(records.map((r) => r.route ?? "?"))).sort(),
    [records],
  );
  const versions = useMemo(
    () => Array.from(new Set(records.map((r) => r.version))).sort().reverse(),
    [records],
  );

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return records.filter((r) => {
      if (routeFilter !== "todas" && (r.route ?? "?") !== routeFilter) return false;
      if (versionFilter !== "todas" && r.version !== versionFilter) return false;
      if (!term) return true;
      return (
        r.message.toLowerCase().includes(term) ||
        (r.processoCode ?? "").toLowerCase().includes(term) ||
        (r.incidentId ?? "").toLowerCase().includes(term) ||
        (r.sessionId ?? "").toLowerCase().includes(term)
      );
    });
  }, [records, q, routeFilter, versionFilter]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[var(--text-muted)]">
          Erros capturados nesta sessão pelo <code>ProcessoDrawerErrorBoundary</code>. Persistência em banco é roadmap (v0.14).
        </p>
        <Button
          size="sm"
          variant="outline"
          onClick={clearDrawerErrors}
          disabled={records.length === 0}
        >
          <Trash2 className="mr-1 h-4 w-4" /> Limpar tudo
        </Button>
      </div>

      <Toolbar>
        <ToolbarSearch
          value={q}
          onChange={setQ}
          placeholder="Buscar por mensagem, código do processo, incidente ou sessão…"
        />
        <Select value={routeFilter} onValueChange={setRouteFilter}>
          <SelectTrigger className="h-9 w-[220px] text-[12.5px]">
            <SelectValue placeholder="Rota" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas as rotas</SelectItem>
            {routes.map((r) => (
              <SelectItem key={r} value={r}>{r}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={versionFilter} onValueChange={setVersionFilter}>
          <SelectTrigger className="h-9 w-[150px] text-[12.5px]">
            <SelectValue placeholder="Versão" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas as versões</SelectItem>
            {versions.map((v) => (
              <SelectItem key={v} value={v}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <ToolbarSpacer />
        <span className="text-[12px] text-[var(--text-muted)]">
          {filtered.length} / {records.length} registro(s)
        </span>
      </Toolbar>

      <div className="rounded-[var(--radius-lg)] border border-[var(--bg-border)] bg-[var(--bg-surface)] shadow-[var(--shadow-sm)]">
        {filtered.length === 0 ? (
          <div className="p-4">
            <TableEmpty
              title="Nenhum erro capturado"
              description={
                records.length === 0
                  ? "Esta aba exibirá erros do Drawer assim que ocorrerem nesta sessão."
                  : "Ajuste a busca/filtros."
              }
            />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]" />
                <TableHead className="w-[150px]">Quando</TableHead>
                <TableHead>Mensagem</TableHead>
                <TableHead className="hidden lg:table-cell w-[180px]">Rota</TableHead>
                <TableHead className="hidden md:table-cell w-[80px]">Versão</TableHead>
                <TableHead className="hidden lg:table-cell w-[140px]">Processo</TableHead>
                <TableHead className="hidden xl:table-cell w-[150px]">Estágio / SLA</TableHead>
                <TableHead className="w-[90px] text-right">Ocorrências</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => (
                <Row
                  key={r.id}
                  rec={r}
                  expanded={expanded === r.id}
                  onToggle={() => setExpanded(expanded === r.id ? null : r.id)}
                />
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <p className="text-[11.5px] text-[var(--text-muted)]">
        <Bug className="mr-1 inline h-3.5 w-3.5" />
        Registros ficam apenas em memória nesta aba. O backend recebe todos via{" "}
        <code>reportClientError</code> e fica gravado nos server logs.
      </p>
    </div>
  );
}

function Row({
  rec,
  expanded,
  onToggle,
}: {
  rec: DrawerErrorRecord;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <TableRow className="cursor-pointer" onClick={onToggle}>
        <TableCell className="align-top">
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </TableCell>
        <TableCell className="text-[11.5px] text-[var(--text-muted)]">{formatDate(rec.at)}</TableCell>
        <TableCell className="text-[12.5px]">
          <div className="font-medium text-[var(--text-primary)] line-clamp-2">{rec.message}</div>
          {rec.incidentId && (
            <div className="mt-0.5 text-[10.5px] text-[var(--text-muted)]">
              {rec.incidentId} · sessão <code>{rec.sessionId}</code>
            </div>
          )}
        </TableCell>
        <TableCell className="hidden lg:table-cell text-[11.5px] text-[var(--text-secondary)]">
          <code className="break-all">{rec.route ?? "?"}</code>
        </TableCell>
        <TableCell className="hidden md:table-cell text-[11.5px] font-mono">{rec.version}</TableCell>
        <TableCell className="hidden lg:table-cell text-[11.5px]">
          {rec.processoCode ? (
            <span className="font-mono">{rec.processoCode}</span>
          ) : (
            <span className="text-[var(--text-muted)]">—</span>
          )}
        </TableCell>
        <TableCell className="hidden xl:table-cell text-[11.5px]">
          {rec.stage ? (
            <span>
              {rec.stage}
              {rec.sla && (
                <span
                  className={cn(
                    "ml-1",
                    rec.sla.status === "atrasado"
                      ? "text-red-600"
                      : rec.sla.status === "risco"
                        ? "text-amber-600"
                        : "text-emerald-600",
                  )}
                >
                  · {rec.sla.diasNoEstagio}/{rec.sla.limite}d
                </span>
              )}
            </span>
          ) : (
            <span className="text-[var(--text-muted)]">—</span>
          )}
        </TableCell>
        <TableCell className="text-right text-[12.5px] font-semibold">{rec.count}</TableCell>
      </TableRow>
      {expanded && (
        <TableRow>
          <TableCell colSpan={8} className="bg-[var(--bg-elevated)]/40">
            <div className="grid grid-cols-1 gap-3 p-2 lg:grid-cols-2">
              <div>
                <p className="mb-1 text-[10.5px] font-semibold uppercase text-[var(--text-muted)]">
                  Stack
                </p>
                <pre className="max-h-64 overflow-auto rounded border border-[var(--bg-border)] bg-[var(--bg-surface)] p-2 text-[10.5px] text-[var(--text-secondary)]">
                  {rec.stack ?? "(sem stack)"}
                </pre>
              </div>
              <div>
                <p className="mb-1 text-[10.5px] font-semibold uppercase text-[var(--text-muted)]">
                  Component stack
                </p>
                <pre className="max-h-64 overflow-auto rounded border border-[var(--bg-border)] bg-[var(--bg-surface)] p-2 text-[10.5px] text-[var(--text-secondary)]">
                  {rec.componentStack ?? "(sem componentStack)"}
                </pre>
                {(rec.progresso !== undefined || rec.risco) && (
                  <p className="mt-2 text-[11px] text-[var(--text-muted)]">
                    Progresso: {rec.progresso ?? "?"}% · Risco: {rec.risco ?? "?"}
                  </p>
                )}
              </div>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}
