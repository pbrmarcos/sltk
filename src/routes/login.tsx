import { createFileRoute, Link, redirect, useNavigate, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Loader2, Lock, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { LOGIN_AT_KEY } from "@/hooks/use-auth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { useBrandSettingsOptional } from "@/hooks/use-brand-settings";

const searchSchema = z.object({
  redirect: z.string().optional().catch(undefined),
});

// Accept only same-origin paths: must start with a single "/" and not "//" or "/\".
// Blocks open-redirect payloads like "https://evil.com" or "//evil.com".
function safeRedirect(url: string | undefined): string {
  if (!url) return "/dashboard";
  if (!/^\/(?![/\\])/.test(url)) return "/dashboard";
  return url;
}

const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(1, "Informe a senha"),
});
type LoginValues = z.infer<typeof loginSchema>;

export const Route = createFileRoute("/login")({
  validateSearch: searchSchema,
  beforeLoad: async ({ search }) => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getUser();
    if (data.user) throw redirect({ to: safeRedirect(search.redirect) });
  },
  head: () => ({ meta: [{ title: "Entrar · SLTK App" }] }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/login" });
  const { settings: brand } = useBrandSettingsOptional();
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (values: LoginValues) => {
    setServerError(null);
    const { error } = await supabase.auth.signInWithPassword(values);
    if (error) {
      setServerError("Email ou senha inválidos.");
      return;
    }
    localStorage.setItem(LOGIN_AT_KEY, String(Date.now()));
    navigate({ to: safeRedirect(search.redirect), replace: true });
  };

  const submitting = form.formState.isSubmitting;

  return (
    <AuthLayout title="Entrar" subtitle="Acesse a área restrita da SLTK Americas">
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5" noValidate>
          <div className="space-y-2">
            <Label htmlFor="email" className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--color-text-secondary)" }}>
              Email
            </Label>
            <div className="relative">
              <Mail
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
                style={{ color: "var(--color-text-muted)" }}
              />
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="voce@sltkamericas.com"
                autoFocus
                disabled={submitting}
                className="h-11 pl-10 text-sm"
                {...form.register("email")}
              />
            </div>
            {form.formState.errors.email && (
              <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--color-text-secondary)" }}>
                Senha
              </Label>
              <Link
                to="/forgot-password"
                className="text-xs font-semibold underline-offset-4 hover:underline"
                style={{ color: "var(--color-brand-blue)" }}
              >
                Esqueci a senha
              </Link>
            </div>
            <div className="relative">
              <Lock
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
                style={{ color: "var(--color-text-muted)" }}
              />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="••••••••"
                disabled={submitting}
                className="h-11 pl-10 pr-10 text-sm"
                {...form.register("password")}
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-2.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md transition hover:bg-muted"
                style={{ color: "var(--color-text-muted)" }}
                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {form.formState.errors.password && (
              <p className="text-xs text-destructive">{form.formState.errors.password.message}</p>
            )}
          </div>

          {serverError && (
            <div
              role="alert"
              className="rounded-md border px-3 py-2 text-sm"
              style={{
                background: "color-mix(in oklab, var(--color-danger) 8%, transparent)",
                borderColor: "color-mix(in oklab, var(--color-danger) 30%, transparent)",
                color: "var(--color-danger)",
              }}
            >
              {serverError}
            </div>
          )}

          <Button
            type="submit"
            className="h-11 w-full text-[15px] font-medium shadow-sm transition-all hover:shadow-md"
            disabled={submitting}
          >
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Entrar
          </Button>

          <p
            className="pt-2 text-center text-xs"
            style={{ color: "var(--color-text-muted)" }}
          >
            Acesso restrito a colaboradores autorizados da SLTK Americas.
          </p>
          {brand?.support_email && (
            <p className="text-center text-xs" style={{ color: "var(--color-text-muted)" }}>
              Precisa de ajuda?{" "}
              <a
                href={`mailto:${brand.support_email}`}
                className="font-semibold underline-offset-4 hover:underline"
                style={{ color: "var(--color-brand-blue)" }}
              >
                {brand.support_email}
              </a>
            </p>
          )}
        </form>
    </AuthLayout>
  );
}