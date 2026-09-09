import { useEffect, useState } from "react";
import { Copy, RefreshCw, Eye, EyeOff } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import type { AppRole } from "@/hooks/use-auth";
import { useFormDraft } from "@/hooks/use-form-draft";
import { confirmDiscard } from "@/lib/unsaved-guard";

const ALL_ROLES: { value: AppRole; label: string }[] = [
  { value: "admin", label: "Admin" },
  { value: "manager", label: "Manager" },
  { value: "engineer", label: "Engenharia" },
  { value: "production", label: "Produção" },
  { value: "purchasing", label: "Compras" },
  { value: "assembly", label: "Montagem" },
  { value: "field", label: "Campo" },
  { value: "sales", label: "Vendas" },
];

function generatePassword(len = 16) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%";
  let out = "";
  const arr = new Uint32Array(len);
  crypto.getRandomValues(arr);
  for (let i = 0; i < len; i++) out += chars[arr[i] % chars.length];
  return out;
}

export type UserFormValues = {
  full_name: string;
  email: string;
  password: string;
  roles: AppRole[];
  require_password_change: boolean;
  agenda_google_email: string | null;
};

export function UserFormDialog({
  open,
  onOpenChange,
  mode,
  initial,
  submitting,
  onSubmit,
  generatedPassword,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  mode: "create" | "edit";
  initial?: {
    id?: string;
    full_name: string;
    email: string;
    roles: AppRole[];
    agenda_google_email?: string | null;
  };
  submitting: boolean;
  onSubmit: (values: UserFormValues) => void;
  /** When set after a successful create, shows the temporary password reveal. */
  generatedPassword?: string | null;
}) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [requirePasswordChange, setRequirePasswordChange] = useState(true);
  const [agendaGoogleEmail, setAgendaGoogleEmail] = useState("");
  const initialDraft = {
    fullName: initial?.full_name ?? "",
    email: initial?.email ?? "",
    roles: initial?.roles ?? [],
    agendaGoogleEmail: initial?.agenda_google_email ?? "",
  };
  const currentDraft = { fullName, email, roles, agendaGoogleEmail };
  const { clearDraft, isDirty } = useFormDraft({
    formKey: `usuario:${mode}:${initial?.id ?? "novo"}`,
    value: currentDraft,
    initialValue: initialDraft,
    enabled: open && !generatedPassword,
    onRestore: (saved) => {
      setFullName(saved.fullName);
      setEmail(saved.email);
      setRoles(saved.roles);
      setAgendaGoogleEmail(saved.agendaGoogleEmail);
    },
  });

  useEffect(() => {
    if (!open) return;
    setFullName(initial?.full_name ?? "");
    setEmail(initial?.email ?? "");
    setRoles(initial?.roles ?? []);
    setAgendaGoogleEmail(initial?.agenda_google_email ?? "");
    setPassword(mode === "create" ? generatePassword() : "");
    setShowPwd(false);
    setRequirePasswordChange(true);
  }, [open, mode, initial]);

  useEffect(() => {
    if (generatedPassword) clearDraft();
  }, [generatedPassword]);

  function requestClose() {
    if (!generatedPassword && !confirmDiscard(isDirty)) return;
    clearDraft();
    onOpenChange(false);
  }

  const toggleRole = (r: AppRole) =>
    setRoles((prev) => (prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]));

  const submit = () => {
    if (!fullName.trim()) return toast.error("Informe o nome completo.");
    if (mode === "create" && !email.trim()) return toast.error("Informe o email.");
    if (mode === "create" && password.length < 12)
      return toast.error("Senha deve ter ao menos 12 caracteres.");
    if (roles.length === 0) return toast.error("Selecione ao menos uma role.");
    onSubmit({
      full_name: fullName.trim(),
      email: email.trim(),
      password,
      roles,
      require_password_change: requirePasswordChange,
      agenda_google_email: agendaGoogleEmail.trim() || null,
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) requestClose();
        else onOpenChange(true);
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Novo usuário" : "Editar usuário"}</DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Crie um novo usuário com senha temporária e atribua suas roles."
              : "Atualize o nome e as roles do usuário."}
          </DialogDescription>
        </DialogHeader>

        {generatedPassword ? (
          <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
            <p className="font-medium">Usuário criado com sucesso.</p>
            <p className="mt-1 text-xs">
              Copie e repasse a senha temporária — ela não será exibida novamente.
            </p>
            <div className="mt-2 flex items-center gap-2">
              <code className="flex-1 rounded bg-white px-2 py-1 font-mono text-xs">
                {generatedPassword}
              </code>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(generatedPassword);
                  toast.success("Senha copiada");
                }}
              >
                <Copy className="h-3.5 w-3.5" /> Copiar
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="u-name">Nome completo</Label>
              <Input
                id="u-name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                maxLength={120}
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="u-email">Email</Label>
              <Input
                id="u-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={mode === "edit"}
                maxLength={255}
              />
            </div>
            {mode === "create" && (
              <div className="space-y-1.5">
                <Label htmlFor="u-pwd">Senha temporária</Label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Input
                      id="u-pwd"
                      type={showPwd ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pr-9 font-mono text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPwd((s) => !s)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
                      aria-label="Mostrar/ocultar"
                    >
                      {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
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
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(password);
                      toast.success("Senha copiada");
                    }}
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={requirePasswordChange}
                    onCheckedChange={(v) => setRequirePasswordChange(v === true)}
                  />
                  <span>Exigir troca de senha no primeiro acesso</span>
                </label>
              </div>
            )}
            {mode === "edit" && (
              <div className="space-y-1.5">
                <Label htmlFor="u-agenda-google">E-mail Google Workspace</Label>
                <Input
                  id="u-agenda-google"
                  type="email"
                  value={agendaGoogleEmail}
                  onChange={(e) => setAgendaGoogleEmail(e.target.value)}
                  placeholder="nome@sltkamericas.com"
                  maxLength={200}
                />
                <p className="text-[11px] text-[var(--text-muted)]">
                  Endereço do Google Workspace da empresa — é para onde os eventos reais de agenda
                  deste usuário são criados. Deixe vazio para não criar eventos reais.
                </p>
              </div>
            )}
            <div className="space-y-2">
              <Label>Roles</Label>
              <div className="grid grid-cols-2 gap-2 rounded-md border border-[var(--bg-border)] p-3">
                {ALL_ROLES.map((r) => (
                  <label key={r.value} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={roles.includes(r.value)}
                      onCheckedChange={() => toggleRole(r.value)}
                    />
                    <span>{r.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          {generatedPassword ? (
            <Button onClick={requestClose}>Fechar</Button>
          ) : (
            <>
              <Button variant="outline" onClick={requestClose} disabled={submitting}>
                Cancelar
              </Button>
              <Button onClick={submit} disabled={submitting}>
                {submitting ? "Salvando…" : mode === "create" ? "Criar usuário" : "Salvar"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export { ALL_ROLES };
