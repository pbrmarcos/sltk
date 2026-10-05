import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Lock, Wrench, CheckCircle2, XCircle, Clock, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useBrandSettingsOptional } from "@/hooks/use-brand-settings";
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
    <div className="flex items-center justify-between gap-3 px-5 py-3.5">
      <div className="flex items-center gap-3">
        <span className="relative flex h-2.5 w-2.5">
          {m.ok && (
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-50" />
          )}
          <span
            className={`relative inline-flex h-2.5 w-2.5 rounded-full ${m.ok ? "bg-emerald-400" : "bg-red-500"}`}
          />
        </span>
        <span className="text-sm font-medium text-white">{m.label}</span>
      </div>
      <div className="flex items-center gap-3 text-xs">
        {m.latency_ms != null && m.ok && (
          <span className="tabular-nums text-slate-500">{m.latency_ms} ms</span>
        )}
        {m.ok ? (
          <span className="flex items-center gap-1.5 font-semibold text-emerald-400">
            <CheckCircle2 className="h-3.5 w-3.5" /> Operacional
          </span>
        ) : (
          <span className="flex items-center gap-1.5 font-semibold text-red-400">
            <XCircle className="h-3.5 w-3.5" /> Indisponível
          </span>
        )}
      </div>
    </div>
  );
}

const inputCls =
  "h-10 w-full rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-white placeholder:text-slate-500 outline-none transition focus:border-blue-400/60 focus:bg-white/10";

function AdminLogin({ accent }: { accent: string }) {
  const { user, role } = useAuth();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (user && role && role !== "admin") {
    return (
      <p className="text-center text-xs text-slate-500">
        Sua conta não tem acesso durante a manutenção. Apenas administradores podem entrar.
      </p>
    );
  }
  if (user && !role) {
    return (
      <p className="flex items-center justify-center gap-2 text-center text-xs text-slate-500">
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
        className="mx-auto flex items-center gap-1.5 text-xs text-slate-500 underline-offset-4 transition hover:text-slate-300 hover:underline"
      >
        <Lock className="h-3 w-3" /> Acesso administrativo
      </button>
    );
  }

  return (
    <form
      onSubmit={handleLogin}
      className="mx-auto w-full max-w-xs space-y-3 rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur"
    >
      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
        <Lock className="h-3 w-3" /> Acesso administrativo
      </p>
      <input
        type="email"
        autoComplete="email"
        placeholder="E-mail"
        aria-label="E-mail"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        disabled={submitting}
        className={inputCls}
      />
      <input
        type="password"
        autoComplete="current-password"
        placeholder="Senha"
        aria-label="Senha"
        value={senha}
        onChange={(e) => setSenha(e.target.value)}
        disabled={submitting}
        className={inputCls}
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
      <button
        type="submit"
        disabled={submitting || !email || !senha}
        className="flex h-10 w-full items-center justify-center gap-2 rounded-lg text-sm font-semibold text-white shadow-lg transition hover:brightness-110 disabled:opacity-50"
        style={{ backgroundColor: accent, boxShadow: `0 8px 24px -8px ${accent}` }}
      >
        {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
        Entrar como administrador
      </button>
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
  const { settings, defaults } = useBrandSettingsOptional();

  const accent = settings?.primary_color || defaults.primary_color || "#3B82F6";
  const logo = settings?.logo_url_dark || settings?.logo_url || "/site-images/brand-logo-dark.svg";
  const footer =
    settings?.footer_text ||
    `© ${new Date().getFullYear()} SLTK Americas · Todos os direitos reservados`;
  const supportEmail = settings?.support_email;

  const q = useQuery({
    queryKey: ["maintenance-status"],
    queryFn: () => statusFn(),
    refetchInterval: 30_000,
    staleTime: 15_000,
  });

  const modules = q.data?.modules ?? [];
  const allOk = modules.length > 0 && modules.every((m) => m.ok);

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-slate-950 px-4 py-12">
      {/* brilhos de fundo, mesmo clima do site público */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 h-[480px] w-[720px] -translate-x-1/2 rounded-full opacity-25 blur-3xl"
        style={{ background: `radial-gradient(closest-side, ${accent}, transparent)` }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-56 -right-32 h-[420px] w-[560px] rounded-full bg-blue-900/30 blur-3xl"
      />

      <div className="relative z-10 w-full max-w-xl space-y-7">
        <div className="space-y-5 text-center">
          <img src={logo} alt="" className="mx-auto h-12 w-auto object-contain" />

          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/80 backdrop-blur">
            <Wrench className="h-3.5 w-3.5 text-amber-400" />
            Manutenção programada
          </span>

          <h1 className="text-3xl font-bold tracking-tight text-white md:text-4xl">
            Voltamos em breve.
          </h1>
          <p className="mx-auto max-w-md text-sm leading-relaxed text-slate-400">
            {message?.trim() ||
              "O sistema está passando por uma manutenção programada para melhorias de infraestrutura e desempenho."}
          </p>

          {countdown && (
            <div
              className="mx-auto inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold text-white shadow-lg backdrop-blur"
              style={{
                backgroundColor: `color-mix(in oklab, ${accent} 20%, transparent)`,
                border: `1px solid color-mix(in oklab, ${accent} 45%, transparent)`,
              }}
            >
              <Clock className="h-4 w-4" style={{ color: accent }} />
              {countdown.overdue ? (
                <span>Finalizando — {countdown.text}</span>
              ) : (
                <span>
                  Previsão de retorno em <span className="tabular-nums">{countdown.text}</span>
                </span>
              )}
            </div>
          )}
        </div>

        <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5 shadow-2xl backdrop-blur">
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-3.5">
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              Status dos módulos
            </span>
            {q.isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin text-slate-500" />
            ) : (
              <span
                className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                  allOk ? "bg-emerald-400/15 text-emerald-300" : "bg-red-400/15 text-red-300"
                }`}
              >
                {allOk ? "Todos operacionais" : "Degradação parcial"}
              </span>
            )}
          </div>
          <div className="divide-y divide-white/5">
            {modules.map((m) => (
              <ModuleRow key={m.key} m={m} />
            ))}
            {!q.isLoading && modules.length === 0 && (
              <p className="px-5 py-6 text-center text-xs text-slate-500">
                Não foi possível carregar o status agora.
              </p>
            )}
          </div>
          {q.data?.checked_at && (
            <div className="border-t border-white/10 px-5 py-2.5 text-right text-[11px] text-slate-500">
              Atualizado {new Date(q.data.checked_at).toLocaleTimeString("pt-BR")} · atualiza a cada
              30s
            </div>
          )}
        </div>

        <AdminLogin accent={accent} />

        <div className="space-y-1.5 text-center">
          {supportEmail && (
            <a
              href={`mailto:${supportEmail}`}
              className="inline-flex items-center gap-1.5 text-xs text-slate-400 underline-offset-4 transition hover:text-slate-200 hover:underline"
            >
              <Mail className="h-3 w-3" /> Precisa de ajuda? {supportEmail}
            </a>
          )}
          <p className="text-[11px] text-slate-600">{footer}</p>
        </div>
      </div>
    </div>
  );
}
