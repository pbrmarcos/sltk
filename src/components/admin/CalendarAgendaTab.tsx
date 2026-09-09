import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getCalendarMirrorSettings,
  updateCalendarMirrorAdmin,
  toggleCalendarMirrorCategoria,
} from "@/lib/calendar-mirror-settings.functions";
import { listAdminUsers } from "@/lib/admin-users.functions";

const NONE = "none";

export function CalendarAgendaTab() {
  const qc = useQueryClient();

  const getFn = useServerFn(getCalendarMirrorSettings);
  const { data, isLoading } = useQuery({
    queryKey: ["calendar-mirror-settings"],
    queryFn: () => getFn(),
  });

  const listUsersFn = useServerFn(listAdminUsers);
  const { data: usersData } = useQuery({
    queryKey: ["admin-users", "for-mirror-select"],
    queryFn: () =>
      listUsersFn({ data: { search: "", role: "all", status: "active", page: 1, pageSize: 200 } }),
  });

  const setAdminFn = useServerFn(updateCalendarMirrorAdmin);
  const setAdminMut = useMutation({
    mutationFn: (mirrorAdminUserId: string | null) => setAdminFn({ data: { mirrorAdminUserId } }),
    onSuccess: () => {
      toast.success("Administrador da agenda unificada atualizado.");
      qc.invalidateQueries({ queryKey: ["calendar-mirror-settings"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleFn = useServerFn(toggleCalendarMirrorCategoria);
  const toggleMut = useMutation({
    mutationFn: (vars: { categoria: string; mirror_enabled: boolean }) => toggleFn({ data: vars }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["calendar-mirror-settings"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) {
    return <p className="text-sm text-[var(--text-muted)]">Carregando…</p>;
  }

  const users = usersData?.rows ?? [];

  return (
    <div className="max-w-xl space-y-6">
      <div className="rounded-md border border-[var(--bg-border)] bg-[var(--bg-surface)] p-4">
        <Label className="mb-1 block text-xs uppercase text-[var(--text-muted)]">
          Agenda unificada do sistema
        </Label>
        <p className="mb-3 text-[12px] text-[var(--text-muted)]">
          Todo evento real criado pela plataforma para as categorias ativas abaixo é também copiado
          na agenda Google Workspace deste administrador, citando quem agendou.
        </p>
        <Select
          value={data?.mirrorAdminUserId ?? NONE}
          onValueChange={(v) => setAdminMut.mutate(v === NONE ? null : v)}
          disabled={setAdminMut.isPending}
        >
          <SelectTrigger>
            <SelectValue placeholder="Nenhum administrador designado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>Nenhum (não espelhar)</SelectItem>
            {users.map((u) => (
              <SelectItem key={u.id} value={u.id}>
                {u.full_name || u.email} {u.agenda_google_email ? "" : "(sem e-mail Google)"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="mt-2 text-[11px] text-[var(--text-muted)]">
          Precisa ter um e-mail do Google Workspace configurado (em Usuários & Permissões) para o
          espelhamento funcionar de fato.
        </p>
      </div>

      <div className="rounded-md border border-[var(--bg-border)] bg-[var(--bg-surface)] p-4">
        <Label className="mb-3 block text-xs uppercase text-[var(--text-muted)]">
          Categorias espelhadas
        </Label>
        <div className="space-y-3">
          {(data?.categorias ?? []).map((c) => (
            <div key={c.categoria} className="flex items-center justify-between gap-3">
              <span className="text-sm text-[var(--text-primary)]">{c.label}</span>
              <Switch
                checked={c.mirror_enabled}
                disabled={toggleMut.isPending}
                onCheckedChange={(v) =>
                  toggleMut.mutate({ categoria: c.categoria, mirror_enabled: v })
                }
              />
            </div>
          ))}
          {(data?.categorias ?? []).length === 0 && (
            <p className="text-sm text-[var(--text-muted)]">Nenhuma categoria cadastrada.</p>
          )}
        </div>
      </div>
    </div>
  );
}
