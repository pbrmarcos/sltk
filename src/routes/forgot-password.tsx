import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Loader2, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { AuthLayout } from "@/components/auth/AuthLayout";

const schema = z.object({ email: z.string().email("Email inválido") });
type Values = z.infer<typeof schema>;

export const Route = createFileRoute("/forgot-password")({
  head: () => ({ meta: [{ title: "Recuperar senha · SLTK App" }] }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { email: "" } });

  const onSubmit = async ({ email }: Values) => {
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    // resposta sempre genérica (não vazar existência de email)
    setSent(true);
  };

  const submitting = form.formState.isSubmitting;

  return (
    <AuthLayout title="Recuperar senha" subtitle="Informe seu email para receber as instruções">
      {sent ? (
        <div className="space-y-5">
          <div
            className="rounded-xl border p-4 text-sm"
            style={{
              background: "color-mix(in oklab, var(--color-success) 8%, transparent)",
              borderColor: "color-mix(in oklab, var(--color-success) 25%, transparent)",
            }}
          >
            <p style={{ color: "var(--color-text-primary)" }}>
              Se houver uma conta com esse email, enviamos um link para redefinir sua senha.
              Verifique sua caixa de entrada.
            </p>
          </div>
          <Link to="/login" className="block">
            <Button variant="outline" className="h-11 w-full text-sm">
              <ArrowLeft className="mr-2 h-4 w-4" /> Voltar para login
            </Button>
          </Link>
        </div>
      ) : (
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5" noValidate>
          <div className="space-y-2">
            <Label
              htmlFor="email"
              className="text-xs font-medium uppercase tracking-wider"
              style={{ color: "var(--color-text-secondary)" }}
            >
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
                placeholder="voce@sltkamercias.com"
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
          <Button
            type="submit"
            className="h-11 w-full text-[15px] font-medium"
            disabled={submitting}
          >
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Enviar instruções
          </Button>
          <Link
            to="/login"
            className="flex items-center justify-center gap-1.5 text-xs font-semibold underline-offset-4 hover:underline"
            style={{ color: "var(--color-brand-blue)" }}
          >
            <ArrowLeft className="h-3 w-3" /> Voltar para login
          </Link>
        </form>
      )}
    </AuthLayout>
  );
}
