import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { KeyRound, Mail, RefreshCw } from "lucide-react";
import { toast } from "sonner";
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
  listSupportUsers,
  supportResetPassword,
  supportSendPasswordRecovery,
  type SupportUserRow,
} from "@/lib/support.functions";

const PAGE_SIZE = 25;

function generatePassword() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%*";
  const bytes = new Uint32Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

/**
 * Reset de senha / envio de link de recuperação para usuários abaixo do
 * nível de acesso de quem está logado — antes era a página /admin/suporte
 * inteira, agora vive como uma aba dentro de Usuários & Permissões.
 */
export function SupportPasswordResetPanel() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [resetTarget, setResetTarget] = useState<SupportUserRow | null>(null);
  const [resetResult, setResetResult] = useState<{ row: SupportUserRow; password: string } | null>(
    null,
  );
  const [recoveryTarget, setRecoveryTarget] = useState<SupportUserRow | null>(null);

  const listFn = useServerFn(listSupportUsers);
  const resetFn = useServerFn(supportResetPassword);
  const recoveryFn = useServerFn(supportSendPasswordRecovery);

  const queryKey = useMemo(() => ["support-users", { search, page }], [search, page]);

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey,
    queryFn: () => listFn({ data: { search, page, pageSize: PAGE_SIZE } }),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["support-users"] });

  const resetMut = useMutation({
    mutationFn: (vars: { id: string; password: string }) => resetFn({ data: vars }),
    onSuccess: (_res, vars) => {
      toast.success("Senha redefinida");
      if (resetTarget) setResetResult({ row: resetTarget, password: vars.password });
      setResetTarget(null);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const recoveryMut = useMutation({
    mutationFn: (id: string) => recoveryFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Link de recuperação enviado por email");
      setRecoveryTarget(null);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-[12px] text-amber-800">
        <strong>Política de suporte:</strong> você só vê e opera sobre usuários com nível de acesso{" "}
        <em>inferior</em> ao seu. Reset de senha de outro engenheiro, gestor ou administrador
        precisa ser feito por um administrador na aba Usuários.
      </div>

      <Toolbar>
        <ToolbarSearch
          value={search}
          onChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          placeholder="Buscar por nome ou email…"
        />
        <ToolbarSpacer />
        <span className="text-[11.5px] text-[var(--text-muted)]">
          {rows.length} de {total}
        </span>
        <Button size="sm" variant="outline" onClick={() => refetch()}>
          <RefreshCw className="h-3.5 w-3.5" /> Atualizar
        </Button>
      </Toolbar>

      {isLoading ? (
        <TableSkeleton columns={5} rows={6} headers={["Nome", "Email", "Roles", "Status", ""]} />
      ) : error ? (
        <TableError
          title="Erro ao carregar usuários"
          description={(error as Error).message}
          onRetry={() => refetch()}
        />
      ) : rows.length === 0 ? (
        <TableEmpty
          title="Nenhum usuário elegível"
          description="Ajuste a busca ou aguarde a criação de novos usuários operacionais."
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
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id} className={r.disabled ? "opacity-60" : undefined}>
                  <TableCell className="font-medium">{r.full_name ?? "—"}</TableCell>
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
                    {r.disabled ? (
                      <span className="rounded bg-rose-100 px-2 py-0.5 text-[11px] font-semibold text-rose-700">
                        Desativado
                      </span>
                    ) : (
                      <span className="rounded bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                        Ativo
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setRecoveryTarget(r)}
                        disabled={r.disabled || !r.email}
                        title="Enviar email de recuperação"
                      >
                        <Mail className="h-3.5 w-3.5 text-blue-600" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setResetTarget(r)}
                        disabled={r.disabled}
                        title="Gerar senha temporária"
                      >
                        <KeyRound className="h-3.5 w-3.5 text-amber-600" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-end gap-2 text-[12px]">
          <Button
            size="sm"
            variant="outline"
            disabled={page <= 1 || isFetching}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Anterior
          </Button>
          <span className="text-[var(--text-muted)]">Página {page}</span>
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

      {/* Reset de senha (gera senha temporária) */}
      <ResetPasswordDialog
        target={resetTarget}
        onCancel={() => setResetTarget(null)}
        submitting={resetMut.isPending}
        onConfirm={(password) => {
          if (resetTarget) resetMut.mutate({ id: resetTarget.id, password });
        }}
      />

      {/* Reveal da senha temporária */}
      <Dialog
        open={!!resetResult}
        onOpenChange={(v) => {
          if (!v) setResetResult(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Senha temporária gerada</DialogTitle>
            <DialogDescription>
              Copie e entregue ao usuário por canal seguro. Peça troca no primeiro login. Este valor
              não será mostrado novamente.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded bg-muted p-3 font-mono text-sm break-all">
            {resetResult?.password}
          </div>
          <DialogFooter>
            <Button
              onClick={() => {
                if (resetResult) {
                  navigator.clipboard.writeText(resetResult.password);
                  toast.success("Copiado");
                }
              }}
            >
              Copiar
            </Button>
            <Button variant="outline" onClick={() => setResetResult(null)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Envio de link de recuperação */}
      <AlertDialog
        open={!!recoveryTarget}
        onOpenChange={(v) => {
          if (!v) setRecoveryTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Enviar link de recuperação?</AlertDialogTitle>
            <AlertDialogDescription>
              Um email será enviado para <strong>{recoveryTarget?.email}</strong> com um link para
              redefinir a senha. O link expira conforme a política do Supabase Auth.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={recoveryMut.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={recoveryMut.isPending}
              onClick={() => {
                if (recoveryTarget) recoveryMut.mutate(recoveryTarget.id);
              }}
            >
              Enviar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ResetPasswordDialog({
  target,
  onCancel,
  onConfirm,
  submitting,
}: {
  target: SupportUserRow | null;
  onCancel: () => void;
  onConfirm: (password: string) => void;
  submitting: boolean;
}) {
  const [password, setPassword] = useState("");

  return (
    <Dialog
      open={!!target}
      onOpenChange={(v) => {
        if (!v) {
          setPassword("");
          onCancel();
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Redefinir senha</DialogTitle>
          <DialogDescription>
            Gere ou digite uma senha temporária para{" "}
            <strong>{target?.full_name ?? target?.email}</strong>. Mínimo 12 caracteres.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Label>Senha</Label>
          <div className="flex gap-2">
            <Input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 12 caracteres"
            />
            <Button type="button" variant="outline" onClick={() => setPassword(generatePassword())}>
              Gerar
            </Button>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={submitting}>
            Cancelar
          </Button>
          <Button
            disabled={submitting || password.length < 12}
            onClick={() => {
              onConfirm(password);
              setPassword("");
            }}
          >
            {submitting ? "Aplicando…" : "Confirmar reset"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
