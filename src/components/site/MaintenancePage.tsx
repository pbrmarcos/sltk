import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Lock, Wrench, CheckCircle2, XCircle, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getMaintenanceStatus, type ModuleStatus } from "@/lib/maintenance.functions";

function useCountdown(endsAt: string | null) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!endsAt) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [endsAt]);
  return useMemo(() => {
    if (!endsAt) return null;
    const diff = new Date(endsAt).getTime() - now;
    if (diff <= 0) return { overdue: true as const, text: "deve voltar a qualquer momento" };
    const h = Math.floor(diff / 3_600_000);
    const m = Math.floor((diff % 3_600_000) / 60_000);
    const s = Math.floor((diff % 60_000) / 1000);
    const text =
      h > 0
        ? `${h}h ${String(m).padStart(2, "0")}min`
        : m > 0
          ? `${m}min ${String(s).padStart(2, "0")}s`
          : `${s}s`;
    return { overdue: false as const, text };
  }, [endsAt, now]);
}

function ModuleRow({ m }: { m: ModuleStatus }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3">
      <div className="flex items-center gap-3">
        <span className="relative flex h-2.5 w-2.5">
          {m.ok && (
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60" />
          )}
          <span
            className={`relative inline-flex h-2.5 w-2.5 rounded-full ${m.ok ? "bg-emerald-500" : "bg-red-500"}`}
          />
        </span>
        <span className="text-sm font-medium text-[var(--text-primary)]">{m.label}</span>
      </div>
      <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
        {m.latency_ms != null && m.ok && <span>{m.latency_ms} ms</span>}
        {m.ok ? (
          <span className="flex items-center gap-1 font-medium text-emerald-600">
            <CheckCircle2 className="h-3.5 w-3.5" /> Operacional
          </span>
        ) : (
          <span className="flex items-center gap-1 font-medium text-red-600">
            <XCircle className="h-3.5 w-3.5" /> Indisponível
          </span>
        )}
      </div>
    </div>
  );
}

function AdminLogin() {
  const { user, role } = useAuth();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (user && role && role !== "admin") {
    return (
      <p className="text-center text-xs text-[var(--text-muted)]">
        Sua conta não tem acesso durante a manutenção. Apenas administradores podem entrar.
      </p>
    );
  }
  if (user && !role) {
    return (
      <p className="flex items-center justify-center gap-2 text-center text-xs text-[var(--text-muted)]">
        <Loader2 className="h-3 w-3 animate-spin" /> Verificando permissões…
      </p>
    );
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const { error: err } = await supabase.auth.signInWithPassword({ email, password: senha });
    if (err) setError("Credenciais inválidas.");
    setSubmitting(false);
    // Se for admin, o gate libera sozinho assim que a sessão/role carregar.
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mx-auto flex items-center gap-1.5 text-xs text-[var(--text-muted)] underline-offset-4 hover:text-[var(--text-primary)] hover:underline"
      >
        <Lock className="h-3 w-3" /> Acesso administrativo
      </button>
    );
  }

  return (
    <form onSubmit={handleLogin} className="mx-auto w-full max-w-xs space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="mt-email" className="text-xs">
          E-mail
        </Label>
        <Input
          id="mt-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={submitting}
          className="h-9 text-sm"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="mt-senha" className="text-xs">
          Senha
        </Label>
        <Input
          id="mt-senha"
          type="password"
          autoComplete="current-password"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          disabled={submitting}
          className="h-9 text-sm"
        />
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <Button type="submit" size="sm" className="w-full" disabled={submitting || !email || !senha}>
        {submitting && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
        Entrar como administrador
      </Button>
    </form>
  );
}

export function MaintenancePage({
  message,
  endsAt,
}: {
  message: string | null;
  endsAt: string | null;
}) {
  const statusFn = useServerFn(getMaintenanceStatus);
  const countdown = useCountdown(endsAt);

  const q = useQuery({
    queryKey: ["maintenance-status"],
    queryFn: () => statusFn(),
    refetchInterval: 30_000,
    staleTime: 15_000,
  });

  const modules = q.data?.modules ?? [];
  const allOk = modules.length > 0 && modules.every((m) => m.ok);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--bg-base,#f8fafc)] px-4 py-10">
      <div className="w-full max-w-lg space-y-6">
        <div className="space-y-4 text-center">
          <img
            src="/site-images/favicon.png"
            alt="Solutek"
            className="mx-auto h-12 w-12 rounded-xl"
          />
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100">
            <Wrench className="h-7 w-7 text-amber-600" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary,#0f172a)]">
            Estamos em manutenção
          </h1>
          <p className="mx-auto max-w-md text-sm text-[var(--text-muted,#64748b)]">
            {message?.trim() ||
              "O sistema está passando por uma manutenção programada. Voltamos em breve."}
          </p>
          {countdown && (
            <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 py-1.5 text-sm font-medium text-amber-700">
              <Clock className="h-4 w-4" />
              {countdown.overdue ? (
                <span>Finalizando — {countdown.text}</span>
              ) : (
                <span>Previsão de retorno em {countdown.text}</span>
              )}
            </div>
          )}
        </div>

        <div className="overflow-hidden rounded-xl border border-[var(--bg-border,#e2e8f0)] bg-[var(--bg-surface,#ffffff)] shadow-sm">
          <div className="flex items-center justify-between border-b border-[var(--bg-border,#e2e8f0)] px-4 py-3">
            <span className="text-sm font-semibold text-[var(--text-primary,#0f172a)]">
              Status dos módulos
            </span>
            {q.isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin text-[var(--text-muted)]" />
            ) : (
              <span
                className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                  allOk ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                }`}
              >
                {allOk ? "Todos operacionais" : "Degradação parcial"}
              </span>
            )}
          </div>
          <div className="divide-y divide-[var(--bg-border,#e2e8f0)]">
            {modules.map((m) => (
              <ModuleRow key={m.key} m={m} />
            ))}
            {!q.isLoading && modules.length === 0 && (
              <p className="px-4 py-6 text-center text-xs text-[var(--text-muted)]">
                Não foi possível carregar o status agora.
              </p>
            )}
          </div>
          {q.data?.checked_at && (
            <div className="border-t border-[var(--bg-border,#e2e8f0)] px-4 py-2 text-right text-[11px] text-[var(--text-muted,#64748b)]">
              Atualizado {new Date(q.data.checked_at).toLocaleTimeString("pt-BR")} · atualiza a cada
              30s
            </div>
          )}
        </div>

        <AdminLogin />

        <p className="text-center text-[11px] text-[var(--text-muted,#94a3b8)]">
          © {new Date().getFullYear()} SLTK Americas
        </p>
      </div>
    </div>
  );
}
