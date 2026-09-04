import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { ShieldAlert, UserPlus, Pencil, UserX, UserCheck, KeyRound, Copy, RefreshCw, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { useAuth, type AppRole } from "@/hooks/use-auth";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { TableEmpty, TableError, TableSkeleton } from "@/components/data/TableStates";
import { Toolbar, ToolbarSearch, ToolbarSpacer } from "@/components/data/Toolbar";
import {
  listAdminUsers,
  createAdminUser,
  updateAdminUser,
  deactivateAdminUser,
  reactivateAdminUser,
  resetAdminUserPassword,
  type AdminUserRow,
} from "@/lib/admin-users.functions";
import { ALL_ROLES, UserFormDialog } from "@/components/admin/UserFormDialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PermissoesMatrixTab } from "@/components/admin/PermissoesMatrixTab";
import { SupportPasswordResetPanel } from "@/components/admin/SupportPasswordResetPanel";

export const Route = createFileRoute("/_authenticated/admin/usuarios")({
  component: UsuariosPage,
});

const PAGE_SIZE = 50;

function UsuariosPage() {
  const { role } = useAuth();
  const crumbs = [
    { label: "Home", href: "/" },
    { label: "Administração", href: "/admin" },
    { label: "Usuários" },
  ];

  const allowed = role === "admin" || role === "manager" || role === "engineer";

  if (!allowed) {
    return (
      <PageContainer>
        <PageHeader breadcrumbs={crumbs} title="Usuários & Permissões" />
        <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-[var(--bg-border)] bg-[var(--bg-surface)] p-12 text-center">
          <ShieldAlert className="h-10 w-10 text-[var(--danger)]" />
          <h2 className="text-lg font-semibold">Acesso restrito</h2>
          <p className="text-sm text-[var(--text-muted)]">
            Esta área é exclusiva para administradores, gestores e engenharia.
          </p>
        </div>
      </PageContainer>
    );
  }

  return <UsuariosPanel crumbs={crumbs} isAdmin={role === "admin"} />;
}

function UsuariosPanel({
  crumbs,
  isAdmin,
}: {
  crumbs: { label: string; href?: string }[];
  isAdmin: boolean;
}) {
  const { user } = useAuth();
  const qc = useQueryClient();

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<AppRole | "all">("all");
  const [status, setStatus] = useState<"active" | "inactive" | "all">("active");
  const [page, setPage] = useState(1);
  const [tab, setTab] = useState<"usuarios" | "permissoes" | "senha">(() => {
    if (!isAdmin) return "senha";
    if (typeof window === "undefined") return "usuarios";
    const p = new URLSearchParams(window.location.search).get("tab");
    return p === "permissoes" || p === "senha" ? p : "usuarios";
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (tab === "usuarios") url.searchParams.delete("tab");
    else url.searchParams.set("tab", tab);
    window.history.replaceState(null, "", url.toString());
  }, [tab]);

  const [dialog, setDialog] = useState<
    | { kind: "create" }
    | { kind: "edit"; row: AdminUserRow }
    | { kind: "created"; password: string }
    | null
  >(null);
  const [confirm, setConfirm] = useState<
    { kind: "deactivate" | "reactivate"; row: AdminUserRow } | null
  >(null);
  const [resetTarget, setResetTarget] = useState<AdminUserRow | null>(null);
  const [resetResult, setResetResult] = useState<{ row: AdminUserRow; password: string } | null>(
    null,
  );

  const listFn = useServerFn(listAdminUsers);
  const createFn = useServerFn(createAdminUser);
  const updateFn = useServerFn(updateAdminUser);
  const deactivateFn = useServerFn(deactivateAdminUser);
  const reactivateFn = useServerFn(reactivateAdminUser);
  const resetFn = useServerFn(resetAdminUserPassword);

  const queryKey = useMemo(
    () => ["admin-users", { search, role: roleFilter, status, page }],
    [search, roleFilter, status, page],
  );

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey,
    queryFn: () =>
      listFn({
        data: { search, role: roleFilter, status, page, pageSize: PAGE_SIZE },
      }),
    enabled: isAdmin,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin-users"] });

  const createMut = useMutation({
    mutationFn: (values: {
      full_name: string;
      email: string;
      password: string;
      roles: AppRole[];
    }) => createFn({ data: values }),
    onSuccess: (_res, vars) => {
      toast.success("Usuário criado");
      setDialog({ kind: "created", password: vars.password });
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMut = useMutation({
    mutationFn: (values: { id: string; full_name: string; roles: AppRole[] }) =>
      updateFn({ data: values }),
    onSuccess: () => {
      toast.success("Usuário atualizado");
      setDialog(null);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deactivateMut = useMutation({
    mutationFn: (id: string) => deactivateFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Usuário desativado");
      setConfirm(null);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const reactivateMut = useMutation({
    mutationFn: (id: string) => reactivateFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Usuário reativado");
      setConfirm(null);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const resetMut = useMutation({
    mutationFn: (vars: { id: string; password: string }) => resetFn({ data: vars }),
    onSuccess: (_res, vars) => {

      toast.success("Senha redefinida");
      if (resetTarget) setResetResult({ row: resetTarget, password: vars.password });
      setResetTarget(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });


  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const rows = data?.rows ?? [];

  return (
    <PageContainer>
      <PageHeader
        breadcrumbs={crumbs}
        title="Usuários & Permissões"
        subtitle="Gerencie contas, roles e status de acesso."
        actions={
          tab === "usuarios" ? (
            <Button size="sm" onClick={() => setDialog({ kind: "create" })}>
              <UserPlus className="h-4 w-4" /> Novo usuário
            </Button>
          ) : undefined
        }
      />

      <Tabs
        value={tab}
        onValueChange={(v) => setTab(v as "usuarios" | "permissoes" | "senha")}
        className="w-full"
      >
        <TabsList>
          {isAdmin && <TabsTrigger value="usuarios">Usuários</TabsTrigger>}
          {isAdmin && <TabsTrigger value="permissoes">Permissões</TabsTrigger>}
          <TabsTrigger value="senha">Redefinir senha</TabsTrigger>
        </TabsList>
        {isAdmin && (
        <TabsContent value="usuarios" className="mt-4 flex flex-col gap-4">
      <Toolbar>
        <ToolbarSearch
          value={search}
          onChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          placeholder="Buscar por nome ou email…"
        />
        <Select
          value={roleFilter}
          onValueChange={(v) => {
            setRoleFilter(v as AppRole | "all");
            setPage(1);
          }}
        >
          <SelectTrigger className="h-9 w-[160px] text-[12.5px]">
            <SelectValue placeholder="Role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as roles</SelectItem>
            {ALL_ROLES.map((r) => (
              <SelectItem key={r.value} value={r.value}>
                {r.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={status}
          onValueChange={(v) => {
            setStatus(v as "active" | "inactive" | "all");
            setPage(1);
          }}
        >
          <SelectTrigger className="h-9 w-[140px] text-[12.5px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Ativos</SelectItem>
            <SelectItem value="inactive">Desativados</SelectItem>
            <SelectItem value="all">Todos</SelectItem>
          </SelectContent>
        </Select>
        <ToolbarSpacer />
        <span className="text-[11.5px] text-[var(--text-muted)]">
          {total} {total === 1 ? "usuário" : "usuários"}
        </span>
      </Toolbar>

      {isLoading ? (
        <TableSkeleton
          columns={6}
          rows={8}
          headers={["Nome", "Email", "Roles", "Status", "Criado em", ""]}
        />
      ) : error ? (
        <TableError
          title="Erro ao carregar usuários"
          description={(error as Error).message}
          onRetry={() => refetch()}
        />
      ) : rows.length === 0 ? (
        <TableEmpty
          title="Nenhum usuário encontrado"
          description="Ajuste os filtros ou crie um novo usuário."
        />
      ) : (
        <div className="rounded-[var(--radius-lg)] border border-[var(--bg-border)] bg-[var(--bg-surface)]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Roles</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="whitespace-nowrap">Criado em</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => {
                const isSelf = r.id === user?.id;
                const inactive = !!r.deleted_at;
                return (
                  <TableRow key={r.id} className={inactive ? "opacity-60" : undefined}>
                    <TableCell className="font-medium">
                      {r.full_name ?? "—"}
                      {isSelf && (
                        <span className="ml-2 rounded bg-[var(--bg-elevated)] px-1.5 py-0.5 text-[10px] text-[var(--text-muted)]">
                          você
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-[var(--text-secondary)]">{r.email ?? "—"}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {r.roles.length === 0 ? (
                          <span className="text-[11px] text-[var(--text-muted)]">—</span>
                        ) : (
                          r.roles.map((role) => (
                            <span
                              key={role}
                              className="rounded bg-blue-50 px-1.5 py-0.5 text-[10.5px] font-medium text-blue-700"
                            >
                              {role}
                            </span>
                          ))
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {inactive ? (
                        <span className="rounded bg-rose-100 px-2 py-0.5 text-[11px] font-semibold text-rose-700">
                          Desativado
                        </span>
                      ) : (
                        <span className="rounded bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                          Ativo
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="tabular-nums whitespace-nowrap text-[12px]">
                      {new Date(r.created_at).toLocaleDateString("pt-BR")}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setDialog({ kind: "edit", row: r })}
                          disabled={inactive}
                          title="Editar"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setResetTarget(r)}
                          disabled={inactive || isSelf}
                          title={
                            isSelf
                              ? "Use a página Minha conta para sua senha"
                              : "Redefinir senha"
                          }
                        >
                          <KeyRound className="h-3.5 w-3.5 text-blue-600" />
                        </Button>
                        {inactive ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setConfirm({ kind: "reactivate", row: r })}
                            title="Reativar"
                          >
                            <UserCheck className="h-3.5 w-3.5 text-emerald-600" />
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setConfirm({ kind: "deactivate", row: r })}
                            disabled={isSelf}
                            title={isSelf ? "Você não pode desativar a si mesmo" : "Desativar"}
                          >
                            <UserX className="h-3.5 w-3.5 text-rose-600" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-end gap-2 text-[12px]">
          <Button
            size="sm"
            variant="outline"
            disabled={page <= 1 || isFetching}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Anterior
          </Button>
          <span className="text-[var(--text-muted)]">
            Página {page} de {totalPages}
          </span>
          <Button
            size="sm"
            variant="outline"
            disabled={page >= totalPages || isFetching}
            onClick={() => setPage((p) => p + 1)}
          >
            Próxima
          </Button>
        </div>
      )}
        </TabsContent>
        )}
        {isAdmin && (
        <TabsContent value="permissoes" className="mt-4">
          <PermissoesMatrixTab />
        </TabsContent>
        )}
        <TabsContent value="senha" className="mt-4">
          <SupportPasswordResetPanel />
        </TabsContent>
      </Tabs>

      {/* Create / Edit / Post-create reveal */}
      <UserFormDialog
        open={dialog?.kind === "create" || dialog?.kind === "edit" || dialog?.kind === "created"}
        onOpenChange={(v) => {
          if (!v) setDialog(null);
        }}
        mode={dialog?.kind === "edit" ? "edit" : "create"}
        initial={
          dialog?.kind === "edit"
            ? {
                id: dialog.row.id,
                full_name: dialog.row.full_name ?? "",
                email: dialog.row.email ?? "",
                roles: dialog.row.roles,
              }
            : undefined
        }
        submitting={createMut.isPending || updateMut.isPending}
        generatedPassword={dialog?.kind === "created" ? dialog.password : null}
        onSubmit={(values) => {
          if (dialog?.kind === "edit") {
            updateMut.mutate({
              id: dialog.row.id,
              full_name: values.full_name,
              roles: values.roles,
            });
          } else {
            createMut.mutate(values);
          }
        }}
      />

      <AlertDialog
        open={!!confirm}
        onOpenChange={(v) => {
          if (!v) setConfirm(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm?.kind === "deactivate" ? "Desativar usuário?" : "Reativar usuário?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm?.kind === "deactivate" ? (
                <>
                  Esta ação remove todas as roles, bloqueia o login e marca a conta como
                  desativada. O usuário <strong>{confirm.row.full_name ?? confirm.row.email}</strong>{" "}
                  deixará de acessar o sistema. É possível reativar depois.
                </>
              ) : (
                confirm && (
                  <>
                    A conta de <strong>{confirm.row.full_name ?? confirm.row.email}</strong> voltará
                    a poder acessar o sistema. As roles precisarão ser reatribuídas.
                  </>
                )
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deactivateMut.isPending || reactivateMut.isPending}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                if (!confirm) return;
                if (confirm.kind === "deactivate") deactivateMut.mutate(confirm.row.id);
                else reactivateMut.mutate(confirm.row.id);
              }}
              disabled={deactivateMut.isPending || reactivateMut.isPending}
            >
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ResetPasswordDialog
        target={resetTarget}
        onCancel={() => setResetTarget(null)}
        onConfirm={(password) =>
          resetTarget && resetMut.mutate({ id: resetTarget.id, password })
        }
        submitting={resetMut.isPending}
      />

      <ResetResultDialog
        result={resetResult}
        onClose={() => setResetResult(null)}
      />
    </PageContainer>
  );
}

function generatePassword(len = 16) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%";
  let out = "";
  const arr = new Uint32Array(len);
  crypto.getRandomValues(arr);
  for (let i = 0; i < len; i++) out += chars[arr[i] % chars.length];
  return out;
}

function ResetPasswordDialog({
  target,
  onCancel,
  onConfirm,
  submitting,
}: {
  target: AdminUserRow | null;
  onCancel: () => void;
  onConfirm: (password: string) => void;
  submitting: boolean;
}) {
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (target) {
      setPassword(generatePassword());
      setShow(false);
    }
  }, [target?.id]);

  return (
    <Dialog open={!!target} onOpenChange={(v) => !v && onCancel()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Redefinir senha</DialogTitle>
          <DialogDescription>
            Gerar nova senha temporária para{" "}
            <strong>{target?.full_name ?? target?.email}</strong>. A senha será exibida uma única vez.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label htmlFor="r-pwd">Nova senha temporária</Label>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Input
                id="r-pwd"
                type={show ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pr-9 font-mono text-xs"
              />
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
                aria-label="Mostrar/ocultar"
              >
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPassword(generatePassword())}
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          </div>
          <p className="text-[11px] text-[var(--text-muted)]">Mínimo 12 caracteres.</p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={submitting}>
            Cancelar
          </Button>
          <Button
            onClick={() => {
              if (password.length < 12) {
                toast.error("Senha deve ter ao menos 12 caracteres.");
                return;
              }
              onConfirm(password);
            }}
            disabled={submitting}
          >
            {submitting ? "Redefinindo…" : "Redefinir senha"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ResetResultDialog({
  result,
  onClose,
}: {
  result: { row: AdminUserRow; password: string } | null;
  onClose: () => void;
}) {
  return (
    <Dialog open={!!result} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Senha redefinida</DialogTitle>
          <DialogDescription>
            Copie e repasse a senha de <strong>{result?.row.full_name ?? result?.row.email}</strong>{" "}
            — ela não será exibida novamente.
          </DialogDescription>
        </DialogHeader>
        {result && (
          <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3">
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded bg-white px-2 py-1 font-mono text-xs">
                {result.password}
              </code>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(result.password);
                  toast.success("Senha copiada");
                }}
              >
                <Copy className="h-3.5 w-3.5" /> Copiar
              </Button>
            </div>
          </div>
        )}
        <DialogFooter>
          <Button onClick={onClose}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}