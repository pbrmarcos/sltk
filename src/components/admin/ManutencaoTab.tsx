import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Wrench, TriangleAlert, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import {
  getMaintenanceStatus,
  setMaintenanceConfig,
  type ModuleStatus,
} from "@/lib/maintenance.functions";

function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalInput(v: string): string | null {
  if (!v) return null;
  return new Date(v).toISOString();
}

export function ManutencaoTab() {
  const statusFn = useServerFn(getMaintenanceStatus);
  const saveFn = useServerFn(setMaintenanceConfig);

  const [enabled, setEnabled] = useState(false);
  const [message, setMessage] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmOn, setConfirmOn] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  const q = useQuery({
    queryKey: ["admin", "maintenance-status"],
    queryFn: () => statusFn(),
    refetchInterval: 30_000,
  });

  useEffect(() => {
    if (q.data && !hydrated) {
      setEnabled(q.data.enabled);
      setMessage(q.data.message ?? "");
      setEndsAt(toLocalInput(q.data.ends_at));
      setHydrated(true);
    }
  }, [q.data, hydrated]);

  async function save(nextEnabled: boolean) {
    setSaving(true);
    try {
      await saveFn({
        data: {
          enabled: nextEnabled,
          message: message.trim() || null,
          ends_at: fromLocalInput(endsAt),
        },
      });
      setEnabled(nextEnabled);
      toast.success(
        nextEnabled
          ? "Modo manutenção ATIVADO — visitantes agora veem a página de manutenção."
          : "Modo manutenção desativado — site liberado.",
      );
      await q.refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  if (q.isLoading) {
    return (
      <div className="flex items-center gap-2 p-6 text-sm text-[var(--text-muted)]">
        <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
      </div>
    );
  }

  const modules: ModuleStatus[] = q.data?.modules ?? [];

  return (
    <div className="space-y-5">
      <div
        className={`flex items-center justify-between gap-4 rounded-lg border p-4 ${
          enabled
            ? "border-amber-300 bg-amber-50"
            : "border-[var(--bg-border)] bg-[var(--bg-surface)]"
        }`}
      >
        <div className="flex items-start gap-3">
          <Wrench
            className={`mt-0.5 h-5 w-5 ${enabled ? "text-amber-600" : "text-[var(--text-muted)]"}`}
          />
          <div>
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              {enabled ? "Modo manutenção ATIVO" : "Modo manutenção desligado"}
            </p>
            <p className="text-xs text-[var(--text-muted)]">
              Quando ativo, todo o site mostra a página de manutenção. Administradores continuam
              acessando normalmente (com login pela própria página).
            </p>
          </div>
        </div>
        <Switch
          checked={enabled}
          disabled={saving}
          onCheckedChange={(v) => {
            if (v) setConfirmOn(true);
            else void save(false);
          }}
        />
      </div>

      <div className="space-y-4 rounded-lg border border-[var(--bg-border)] bg-[var(--bg-surface)] p-4">
        <div className="space-y-1.5">
          <Label htmlFor="mt-msg">Mensagem exibida aos visitantes</Label>
          <Textarea
            id="mt-msg"
            rows={3}
            maxLength={500}
            placeholder="O sistema está passando por uma manutenção programada. Voltamos em breve."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="mt-ends">Previsão de retorno (opcional)</Label>
          <Input
            id="mt-ends"
            type="datetime-local"
            value={endsAt}
            onChange={(e) => setEndsAt(e.target.value)}
            className="max-w-xs"
          />
          <p className="text-xs text-[var(--text-muted)]">
            Exibida como contagem regressiva na página de manutenção.
          </p>
        </div>
        <Button size="sm" disabled={saving} onClick={() => void save(enabled)}>
          {saving && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
          Salvar configurações
        </Button>
      </div>

      <div className="overflow-hidden rounded-lg border border-[var(--bg-border)] bg-[var(--bg-surface)]">
        <div className="border-b border-[var(--bg-border)] px-4 py-3 text-sm font-semibold">
          Status dos módulos (como aparece na página de manutenção)
        </div>
        <div className="divide-y divide-[var(--bg-border)]">
          {modules.map((m) => (
            <div key={m.key} className="flex items-center justify-between px-4 py-2.5 text-sm">
              <span>{m.label}</span>
              <span className="flex items-center gap-2 text-xs">
                {m.ok && m.latency_ms != null && (
                  <span className="text-[var(--text-muted)]">{m.latency_ms} ms</span>
                )}
                {m.ok ? (
                  <span className="flex items-center gap-1 font-medium text-emerald-600">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Operacional
                  </span>
                ) : (
                  <span className="flex items-center gap-1 font-medium text-red-600">
                    <XCircle className="h-3.5 w-3.5" /> Indisponível
                  </span>
                )}
              </span>
            </div>
          ))}
        </div>
      </div>

      <AlertDialog open={confirmOn} onOpenChange={setConfirmOn}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <TriangleAlert className="h-4 w-4 text-[var(--warning)]" /> Ativar modo manutenção
            </AlertDialogTitle>
            <AlertDialogDescription>
              Todos os visitantes e usuários não-administradores passam a ver a página de manutenção
              imediatamente — inclusive quem está usando o sistema agora. Apenas administradores
              continuam com acesso. Confirma?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmOn(false);
                void save(true);
              }}
            >
              Ativar manutenção
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
