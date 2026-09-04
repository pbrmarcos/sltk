import { useMemo, useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, Save, RotateCcw, Search, ShieldCheck, AlertTriangle, History, ChevronDown, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  APP_MODULES,
  MODULE_LABEL,
  listRoleModulePermissions,
  bulkSetRolePermissions,
  listPermissoesAuditLog,
  validatePermissionMatrix,
  type AppModule,
  type AppRoleName,
  type RoleModulePermissionRow,
  type PermissoesAuditEntry,
} from "@/lib/permissoes.functions";
import type { RuleViolation } from "@/lib/permissoes.functions";
import { ROLE_LABEL } from "@/hooks/use-auth";

const EDITABLE_ROLES: AppRoleName[] = [
  "manager",
  "engineer",
  "production",
  "purchasing",
  "assembly",
  "field",
  "sales",
];

type Matrix = Record<AppRoleName, Record<AppModule, boolean>>;

function emptyMatrix(): Matrix {
  const m = {} as Matrix;
  for (const r of EDITABLE_ROLES) {
    m[r] = {} as Record<AppModule, boolean>;
    for (const mod of APP_MODULES) m[r][mod] = false;
  }
  return m;
}

function rowsToMatrix(rows: RoleModulePermissionRow[]): Matrix {
  const m = emptyMatrix();
  for (const row of rows) {
    if (row.role === "admin") continue;
    if (!(row.role in m)) continue;
    m[row.role as AppRoleName][row.module] = row.enabled;
  }
  return m;
}

export function PermissoesMatrixTab() {
  const qc = useQueryClient();
  const listFn = useServerFn(listRoleModulePermissions);
  const saveFn = useServerFn(bulkSetRolePermissions);
  const auditFn = useServerFn(listPermissoesAuditLog);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["permissoes"],
    queryFn: () => listFn(),
  });

  const auditQuery = useQuery({
    queryKey: ["permissoes-audit"],
    queryFn: () => auditFn(),
    staleTime: 30_000,
  });

  const serverMatrix = useMemo(() => rowsToMatrix(data ?? []), [data]);
  const [local, setLocal] = useState<Matrix>(emptyMatrix());
  const [search, setSearch] = useState("");

  useEffect(() => {
    setLocal(serverMatrix);
  }, [serverMatrix]);

  const dirtyRoles = useMemo(() => {
    const out: AppRoleName[] = [];
    for (const r of EDITABLE_ROLES) {
      for (const mod of APP_MODULES) {
        if (local[r][mod] !== serverMatrix[r][mod]) {
          out.push(r);
          break;
        }
      }
    }
    return out;
  }, [local, serverMatrix]);

  const validationErrors = useMemo<RuleViolation[]>(() => {
    const out: RuleViolation[] = [];
    for (const r of EDITABLE_ROLES) {
      out.push(...validatePermissionMatrix(r, local[r]));
    }
    return out;
  }, [local]);

  const dirtyValidationErrors = useMemo<RuleViolation[]>(
    () => validationErrors.filter((e) => dirtyRoles.includes(e.role)),
    [validationErrors, dirtyRoles],
  );
  const blockingErrors = dirtyValidationErrors;

  /** Aplica a sugestão da regra (alternativa válida mais próxima) na matriz local. */
  const applyFix = (v: RuleViolation) => {
    setLocal((prev) => ({
      ...prev,
      [v.role]: {
        ...prev[v.role],
        [v.suggestion.module]: v.suggestion.action === "enable",
      },
    }));
  };

  /** Mapa (role:module) -> array de violações que envolvem essa célula. */
  const cellErrorMap = useMemo(() => {
    const map = new Map<string, RuleViolation[]>();
    for (const v of validationErrors) {
      for (const mod of v.modulesInvolved) {
        const key = `${v.role}:${mod}`;
        const arr = map.get(key) ?? [];
        arr.push(v);
        map.set(key, arr);
      }
    }
    return map;
  }, [validationErrors]);

  const saveMut = useMutation({
    mutationFn: async () => {
      if (blockingErrors.length > 0) {
        throw new Error("Corrija as combinações inválidas antes de salvar.");
      }
      for (const r of dirtyRoles) {
        await saveFn({ data: { role: r, modules: local[r] } });
      }
    },
    onSuccess: () => {
      toast.success("Permissões atualizadas");
      qc.invalidateQueries({ queryKey: ["permissoes"] });
      qc.invalidateQueries({ queryKey: ["my-modules"] });
      qc.invalidateQueries({ queryKey: ["permissoes-audit"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const filteredModules = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return APP_MODULES as readonly AppModule[];
    return APP_MODULES.filter(
      (m) => m.toLowerCase().includes(q) || MODULE_LABEL[m].toLowerCase().includes(q),
    );
  }, [search]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-[var(--text-muted)]">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }
  if (error) {
    return (
      <div className="rounded-lg border border-[var(--bg-border)] bg-[var(--bg-surface)] p-6 text-center">
        <p className="text-sm text-[var(--danger)]">{(error as Error).message}</p>
        <Button size="sm" variant="outline" className="mt-3" onClick={() => refetch()}>
          Tentar novamente
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="sticky top-0 z-10 -mx-1 flex flex-wrap items-center gap-3 rounded-lg border border-[var(--bg-border)] bg-[var(--bg-surface)] p-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--text-muted)]" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar módulo…"
            className="h-9 pl-8 text-[12.5px]"
          />
        </div>
        <div className="text-[11.5px] text-[var(--text-muted)]">
          {dirtyRoles.length === 0
            ? "Sem alterações pendentes"
            : `${dirtyRoles.length} ${dirtyRoles.length === 1 ? "role" : "roles"} com alterações`}
        </div>
        <Button
          size="sm"
          variant="outline"
          disabled={dirtyRoles.length === 0 || saveMut.isPending}
          onClick={() => setLocal(serverMatrix)}
        >
          <RotateCcw className="h-3.5 w-3.5" /> Descartar
        </Button>
        <Button
          size="sm"
          disabled={
            dirtyRoles.length === 0 || saveMut.isPending || blockingErrors.length > 0
          }
          onClick={() => saveMut.mutate()}
          title={blockingErrors.length > 0 ? "Corrija os erros de validação" : undefined}
        >
          {saveMut.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Save className="h-3.5 w-3.5" />
          )}
          Salvar alterações
        </Button>
      </div>

      {blockingErrors.length > 0 && (
        <div
          role="alert"
          data-testid="permissoes-blocking-errors"
          className="flex flex-col gap-1.5 rounded-md border border-amber-300 bg-amber-50 p-3 text-[12px] text-amber-900"
        >
          <div className="flex items-center gap-2 font-semibold">
            <AlertTriangle className="h-3.5 w-3.5" />
            {blockingErrors.length}{" "}
            {blockingErrors.length === 1 ? "combinação inválida" : "combinações inválidas"}
          </div>
          <ul className="ml-5 list-disc space-y-2">
            {blockingErrors.map((e, i) => (
              <li key={i} data-testid="permissoes-violation" data-rule-id={e.ruleId}>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[11px] uppercase">{e.role}</span>
                  <span
                    className="rounded bg-amber-200/70 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide text-amber-900"
                    data-testid="permissoes-violation-code"
                  >
                    {e.ruleId}
                  </span>
                  <strong>{e.message}</strong>
                </div>
                <div className="text-[11px] font-normal text-amber-800/80">{e.hint}</div>
                <div className="mt-1 flex items-center gap-2">
                  <span className="text-[11px] text-amber-900/90">
                    Alternativa válida mais próxima:{" "}
                    <strong data-testid="permissoes-violation-fix">{e.suggestion.label}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => applyFix(e)}
                    className="inline-flex items-center gap-1 rounded border border-amber-400 bg-white px-2 py-0.5 text-[11px] font-semibold text-amber-900 hover:bg-amber-100"
                    data-testid="permissoes-violation-apply-fix"
                  >
                    <Wand2 className="h-3 w-3" /> Aplicar correção
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex items-start gap-2 rounded-md border border-blue-200 bg-blue-50 p-3 text-[11.5px] text-blue-900">
        <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <div>
          A role <strong>Admin</strong> tem acesso total a todos os módulos e não pode ser
          editada. As demais roles podem ser configuradas livremente. Usuários com múltiplas
          roles enxergam a união dos módulos habilitados.
        </div>
      </div>

      <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-[var(--bg-border)] bg-[var(--bg-surface)]">
        <table className="w-full min-w-[720px] border-collapse text-[12.5px]">
          <thead className="sticky top-0 bg-[var(--bg-elevated)]">
            <tr>
              <th className="w-[260px] border-b border-[var(--bg-border)] p-3 text-left font-semibold">
                Módulo
              </th>
              {EDITABLE_ROLES.map((r) => (
                <th
                  key={r}
                  className="border-b border-[var(--bg-border)] p-3 text-center font-semibold whitespace-nowrap"
                  title={ROLE_LABEL[r]}
                >
                  <div className="flex flex-col items-center gap-0.5">
                    <span className="capitalize">{r}</span>
                    <span className="text-[10px] font-normal text-[var(--text-muted)]">
                      {ROLE_LABEL[r]}
                    </span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredModules.map((mod, idx) => (
              <tr
                key={mod}
                className={idx % 2 === 0 ? "" : "bg-[var(--bg-elevated)]/40"}
              >
                <td className="border-b border-[var(--bg-border)] p-3">
                  <div className="font-medium capitalize">{mod.replace("_", " ")}</div>
                  <div className="text-[10.5px] text-[var(--text-muted)]">
                    {MODULE_LABEL[mod]}
                  </div>
                </td>
                {EDITABLE_ROLES.map((r) => {
                  const checked = local[r][mod];
                  const dirty = checked !== serverMatrix[r][mod];
                  const cellViolations = cellErrorMap.get(`${r}:${mod}`) ?? [];
                  const invalid = cellViolations.length > 0;
                  return (
                    <td
                      key={r}
                      className={
                        "border-b border-[var(--bg-border)] p-3 text-center " +
                        (invalid ? "bg-amber-50" : "")
                      }
                      title={
                        invalid
                          ? cellViolations
                              .map((v) => `${v.message}\n${v.hint}`)
                              .join("\n\n")
                          : undefined
                      }
                    >
                      <div className="flex flex-col items-center gap-1">
                        <Switch
                          checked={checked}
                          onCheckedChange={(v) =>
                            setLocal((prev) => ({
                              ...prev,
                              [r]: { ...prev[r], [mod]: v },
                            }))
                          }
                        />
                        {dirty && !invalid && (
                          <span className="text-[9px] font-semibold uppercase text-amber-600">
                            alterado
                          </span>
                        )}
                        {invalid && (
                          <span className="flex items-center gap-1 text-[9px] font-semibold uppercase text-amber-700">
                            <AlertTriangle className="h-2.5 w-2.5" /> inválido
                          </span>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AuditLogPanel
        entries={auditQuery.data ?? []}
        loading={auditQuery.isLoading}
        onRefresh={() => auditQuery.refetch()}
      />
    </div>
  );
}

function AuditLogPanel({
  entries,
  loading,
  onRefresh,
}: {
  entries: PermissoesAuditEntry[];
  loading: boolean;
  onRefresh: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--bg-border)] bg-[var(--bg-surface)]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between p-3 text-left"
      >
        <div className="flex items-center gap-2 text-[13px] font-semibold">
          <History className="h-4 w-4 text-[var(--text-muted)]" />
          Auditoria de permissões
          <span className="text-[11px] font-normal text-[var(--text-muted)]">
            ({entries.length} {entries.length === 1 ? "evento" : "eventos"} — últimos 100)
          </span>
        </div>
        <ChevronDown
          className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="border-t border-[var(--bg-border)]">
          <div className="flex items-center justify-end p-2">
            <Button size="sm" variant="ghost" onClick={onRefresh} disabled={loading}>
              {loading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RotateCcw className="h-3.5 w-3.5" />
              )}
              Recarregar
            </Button>
          </div>
          <div className="max-h-[360px] overflow-y-auto">
            <table className="w-full border-collapse text-[12px]">
              <thead className="sticky top-0 bg-[var(--bg-elevated)]">
                <tr>
                  <th className="border-b border-[var(--bg-border)] p-2 text-left">Quando</th>
                  <th className="border-b border-[var(--bg-border)] p-2 text-left">Quem</th>
                  <th className="border-b border-[var(--bg-border)] p-2 text-left">Role</th>
                  <th className="border-b border-[var(--bg-border)] p-2 text-left">Módulo</th>
                  <th className="border-b border-[var(--bg-border)] p-2 text-left">Mudança</th>
                </tr>
              </thead>
              <tbody>
                {entries.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="p-6 text-center text-[var(--text-muted)]"
                    >
                      Nenhum evento de permissão registrado ainda.
                    </td>
                  </tr>
                ) : (
                  entries.map((e) => (
                    <tr key={e.id} className="border-b border-[var(--bg-border)]">
                      <td className="p-2 tabular-nums whitespace-nowrap text-[11.5px]">
                        {new Date(e.created_at).toLocaleString("pt-BR")}
                      </td>
                      <td className="p-2">
                        {e.user_name ?? e.user_email ?? (
                          <span className="text-[var(--text-muted)]">—</span>
                        )}
                      </td>
                      <td className="p-2 font-mono text-[11px]">{e.role ?? "—"}</td>
                      <td className="p-2">
                        {e.module ? MODULE_LABEL[e.module] : "—"}
                      </td>
                      <td className="p-2">
                        <ChangeCell entry={e} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function ChangeCell({ entry }: { entry: PermissoesAuditEntry }) {
  const pill = (label: string, on: boolean) => (
    <span
      className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
        on ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
      }`}
    >
      {label}
    </span>
  );
  if (entry.action === "INSERT") {
    return (
      <span className="flex items-center gap-1.5">
        <span className="text-[10.5px] uppercase text-blue-700">Criado</span>
        {entry.new_enabled !== null && pill(entry.new_enabled ? "ON" : "OFF", entry.new_enabled)}
      </span>
    );
  }
  if (entry.action === "DELETE") {
    return <span className="text-[10.5px] uppercase text-rose-700">Removido</span>;
  }
  return (
    <span className="flex items-center gap-1.5">
      {entry.old_enabled !== null && pill(entry.old_enabled ? "ON" : "OFF", entry.old_enabled)}
      <span className="text-[var(--text-muted)]">→</span>
      {entry.new_enabled !== null && pill(entry.new_enabled ? "ON" : "OFF", entry.new_enabled)}
    </span>
  );
}