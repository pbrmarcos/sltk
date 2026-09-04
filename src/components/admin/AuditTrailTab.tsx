import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { Download, X, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TableEmpty, TableError, TableSkeleton } from "@/components/data/TableStates";
import { Toolbar, ToolbarSearch, ToolbarSpacer } from "@/components/data/Toolbar";
import { toast } from "sonner";
import {
  listAuditLog,
  exportAuditLog,
  searchAuditUsers,
  type AuditLogRow,
} from "@/lib/audit-log.functions";

const PAGE_SIZE = 50;

type Filters = {
  search: string;
  user_id: string | null;
  user_label: string | null;
  action: "all" | "INSERT" | "UPDATE" | "DELETE";
  table_name: string;
  from: string;
  to: string;
  page: number;
};

const initialFilters: Filters = {
  search: "",
  user_id: null,
  user_label: null,
  action: "all",
  table_name: "",
  from: "",
  to: "",
  page: 1,
};

function toISO(local: string): string | null {
  if (!local) return null;
  const d = new Date(local);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

export function AuditTrailTab() {
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [selected, setSelected] = useState<AuditLogRow | null>(null);
  const [userSearch, setUserSearch] = useState("");
  const [exporting, setExporting] = useState(false);

  const listFn = useServerFn(listAuditLog);
  const searchUsersFn = useServerFn(searchAuditUsers);
  const exportFn = useServerFn(exportAuditLog);

  const queryArgs = useMemo(
    () => ({
      search: filters.search,
      user_id: filters.user_id,
      action: filters.action,
      table_name: filters.table_name,
      from: toISO(filters.from),
      to: toISO(filters.to),
      page: filters.page,
      pageSize: PAGE_SIZE,
    }),
    [filters],
  );

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["audit-log", queryArgs],
    queryFn: () => listFn({ data: queryArgs }),
  });

  const usersQuery = useQuery({
    queryKey: ["audit-log-users", userSearch],
    queryFn: () => searchUsersFn({ data: { search: userSearch } }),
    staleTime: 30_000,
  });

  const set = <K extends keyof Filters>(k: K, v: Filters[K]) =>
    setFilters((f) => ({ ...f, [k]: v, page: k === "page" ? (v as number) : 1 }));

  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const exportCsv = async () => {
    setExporting(true);
    try {
      const { rows: all } = await exportFn({
        data: {
          search: filters.search,
          user_id: filters.user_id,
          action: filters.action,
          table_name: filters.table_name,
          from: toISO(filters.from),
          to: toISO(filters.to),
          limit: 5000,
        },
      });
      const header = [
        "data",
        "autor",
        "user_id",
        "tabela",
        "registro",
        "acao",
        "campo",
        "valor_antigo",
        "valor_novo",
      ];
      const esc = (v: string) => `"${String(v ?? "").replace(/"/g, '""')}"`;
      const lines = [
        header.join(","),
        ...all.map((r) =>
          [
            new Date(r.created_at).toISOString(),
            r.autor,
            r.user_id ?? "",
            r.table_name,
            r.record_id,
            r.action,
            r.field_changed ?? "",
            r.old_value,
            r.new_value,
          ]
            .map(esc)
            .join(","),
        ),
      ];
      const blob = new Blob(["\uFEFF" + lines.join("\n")], {
        type: "text/csv;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `audit_log_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`${all.length} registro(s) exportados. A exportação foi registrada na trilha.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao exportar a trilha.");
    } finally {
      setExporting(false);
    }
  };


  return (
    <>
      <Toolbar>
        <ToolbarSearch
          value={filters.search}
          onChange={(v) => set("search", v)}
          placeholder="Buscar tabela / registro / campo…"
        />
        <Select
          value={filters.user_id ?? "all"}
          onValueChange={(v) => {
            if (v === "all") {
              setFilters((f) => ({ ...f, user_id: null, user_label: null, page: 1 }));
            } else {
              const u = usersQuery.data?.find((x) => x.id === v);
              setFilters((f) => ({
                ...f,
                user_id: v,
                user_label: u?.full_name ?? u?.email ?? v.slice(0, 8),
                page: 1,
              }));
            }
          }}
        >
          <SelectTrigger className="h-9 w-[200px] text-[12.5px]">
            <SelectValue placeholder="Usuário">
              {filters.user_label ?? "Todos os usuários"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <div className="p-2">
              <Input
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Buscar usuário…"
                className="h-8 text-[12px]"
              />
            </div>
            <SelectItem value="all">Todos os usuários</SelectItem>
            {(usersQuery.data ?? []).map((u) => (
              <SelectItem key={u.id} value={u.id}>
                {u.full_name ?? u.email ?? u.id.slice(0, 8)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filters.action}
          onValueChange={(v) => set("action", v as Filters["action"])}
        >
          <SelectTrigger className="h-9 w-[140px] text-[12.5px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as ações</SelectItem>
            <SelectItem value="INSERT">INSERT</SelectItem>
            <SelectItem value="UPDATE">UPDATE</SelectItem>
            <SelectItem value="DELETE">DELETE</SelectItem>
          </SelectContent>
        </Select>
        <Input
          type="datetime-local"
          value={filters.from}
          onChange={(e) => set("from", e.target.value)}
          className="h-9 w-[200px] text-[12px]"
          aria-label="De"
        />
        <Input
          type="datetime-local"
          value={filters.to}
          onChange={(e) => set("to", e.target.value)}
          className="h-9 w-[200px] text-[12px]"
          aria-label="Até"
        />
        {(filters.user_id ||
          filters.action !== "all" ||
          filters.from ||
          filters.to ||
          filters.search ||
          filters.table_name) && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setFilters(initialFilters)}
            title="Limpar filtros"
          >
            <X className="h-3.5 w-3.5" /> Limpar
          </Button>
        )}
        <ToolbarSpacer />
        <span className="text-[11.5px] text-[var(--text-muted)]">
          {total} {total === 1 ? "registro" : "registros"}
        </span>
        <Button
          size="sm"
          variant="outline"
          onClick={() => void exportCsv()}
          disabled={total === 0 || exporting}
          title="Exporta todos os registros dos filtros atuais (até 5.000)"
        >
          <Download className="h-3.5 w-3.5" /> {exporting ? "Exportando…" : "Exportar"}
        </Button>
      </Toolbar>

      {isLoading ? (
        <TableSkeleton
          columns={6}
          rows={8}
          headers={["Data", "Usuário", "Tabela", "Registro", "Ação", "Campo"]}
        />
      ) : error ? (
        <TableError
          title="Erro ao carregar auditoria"
          description={(error as Error).message}
          onRetry={() => refetch()}
        />
      ) : rows.length === 0 ? (
        <TableEmpty title="Nenhum registro encontrado" description="Ajuste os filtros." />
      ) : (
        <div className="rounded-[var(--radius-lg)] border border-[var(--bg-border)] bg-[var(--bg-surface)]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Usuário</TableHead>
                <TableHead>Tabela</TableHead>
                <TableHead>Registro</TableHead>
                <TableHead>Ação</TableHead>
                <TableHead>Campo</TableHead>
                <TableHead className="text-right">Detalhes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="tabular-nums whitespace-nowrap text-[12px]">
                    {new Date(r.created_at).toLocaleString("pt-BR")}
                  </TableCell>
                  <TableCell className="text-[12px]">
                    {r.user_name ?? r.user_email ?? (
                      r.user_id ? (
                        <span className="font-mono text-[11px]">{r.user_id.slice(0, 8)}</span>
                      ) : (
                        <span className="text-[var(--text-muted)]">Sistema</span>
                      )
                    )}
                  </TableCell>
                  <TableCell>{r.table_name}</TableCell>
                  <TableCell className="font-mono text-[11px]">{r.record_id.slice(0, 12)}</TableCell>
                  <TableCell>
                    <ActionBadge action={r.action} />
                  </TableCell>
                  <TableCell>{r.field_changed ?? "—"}</TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="ghost" onClick={() => setSelected(r)}>
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-end gap-2 text-[12px]">
          <Button
            size="sm"
            variant="outline"
            disabled={filters.page <= 1 || isFetching}
            onClick={() => set("page", Math.max(1, filters.page - 1))}
          >
            Anterior
          </Button>
          <span className="text-[var(--text-muted)]">
            Página {filters.page} de {totalPages}
          </span>
          <Button
            size="sm"
            variant="outline"
            disabled={filters.page >= totalPages || isFetching}
            onClick={() => set("page", filters.page + 1)}
          >
            Próxima
          </Button>
        </div>
      )}

      <Dialog open={!!selected} onOpenChange={(v) => !v && setSelected(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes da entrada</DialogTitle>
            <DialogDescription>
              {selected && new Date(selected.created_at).toLocaleString("pt-BR")}
            </DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="space-y-3 text-[12.5px]">
              <Row label="Usuário" value={selected.user_name ?? selected.user_email ?? selected.user_id ?? "—"} />
              <Row label="Tabela" value={selected.table_name} />
              <Row label="Registro" value={selected.record_id} mono />
              <Row label="Ação" value={selected.action} />
              {selected.field_changed && <Row label="Campo" value={selected.field_changed} />}
              <JsonBlock label="Valor anterior" value={selected.old_value} />
              <JsonBlock label="Novo valor" value={selected.new_value} />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="grid grid-cols-[140px_1fr] gap-2">
      <div className="text-[var(--text-muted)]">{label}</div>
      <div className={mono ? "font-mono text-[11px]" : ""}>{value}</div>
    </div>
  );
}

function JsonBlock({ label, value }: { label: string; value: unknown }) {
  if (value === null || value === undefined) return null;
  return (
    <div>
      <div className="mb-1 text-[var(--text-muted)]">{label}</div>
      <pre className="max-h-[200px] overflow-auto rounded bg-[var(--bg-elevated)] p-2 text-[11px]">
        {typeof value === "string" ? value : JSON.stringify(value, null, 2)}
      </pre>
    </div>
  );
}

function ActionBadge({ action }: { action: "INSERT" | "UPDATE" | "DELETE" }) {
  const styles = {
    INSERT: "bg-emerald-100 text-emerald-700",
    UPDATE: "bg-amber-100 text-amber-700",
    DELETE: "bg-rose-100 text-rose-700",
  } as const;
  return (
    <span className={"rounded px-2 py-0.5 text-[11px] font-semibold " + styles[action]}>
      {action}
    </span>
  );
}
