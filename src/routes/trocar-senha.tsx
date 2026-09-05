import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Loader2, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { AuthLayout } from "@/components/auth/AuthLayout";

const schema = z
  .object({
    password: z.string().min(8, "Mínimo de 8 caracteres"),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, {
    path: ["confirm"],
    message: "As senhas não coincidem",
  });
type Values = z.infer<typeof schema>;

export const Route = createFileRoute("/trocar-senha")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Trocar senha · SLTK App" },
      { name: "description", content: "Defina uma nova senha para continuar acessando o sistema." },
    ],
  }),
  component: TrocarSenhaPage,
});

function TrocarSenhaPage() {
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);
  const [show, setShow] = useState(false);
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { password: "", confirm: "" },
  });

  const onSubmit = async ({ password }: Values) => {
    setServerError(null);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setServerError(error.message ?? "Não foi possível atualizar a senha.");
      return;
    }
    const { error: rpcError } = await (supabase as any).rpc("clear_must_change_password");
    if (rpcError) {
      setServerError(
        "Senha alterada, mas não foi possível liberar o acesso. Recarregue e tente novamente.",
      );
      return;
    }
    window.location.replace("/dashboard");
    void navigate;
  };

  const submitting = form.formState.isSubmitting;

  return (
    <AuthLayout
      title="Troque sua senha"
      subtitle="Por segurança, defina uma nova senha antes de continuar"
    >
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5" noValidate>
        <div className="space-y-2">
          <Label
            htmlFor="password"
            className="text-xs font-medium uppercase tracking-wider"
            style={{ color: "var(--color-text-secondary)" }}
          >
            Nova senha
          </Label>
          <div className="relative">
            <Lock
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
              style={{ color: "var(--color-text-muted)" }}
            />
            <Input
              id="password"
              type={show ? "text" : "password"}
              autoComplete="new-password"
              placeholder="Mínimo 8 caracteres"
              autoFocus
              disabled={submitting}
              className="h-11 pl-10 pr-10 text-sm"
              {...form.register("password")}
            />
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShow((v) => !v)}
              className="absolute right-2.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md transition hover:bg-muted"
              style={{ color: "var(--color-text-muted)" }}
              aria-label={show ? "Ocultar senha" : "Mostrar senha"}
            >
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {form.formState.errors.password && (
            <p className="text-xs text-destructive">{form.formState.errors.password.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label
            htmlFor="confirm"
            className="text-xs font-medium uppercase tracking-wider"
            style={{ color: "var(--color-text-secondary)" }}
          >
            Confirmar senha
          </Label>
          <div className="relative">
            <Lock
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
              style={{ color: "var(--color-text-muted)" }}
            />
            <Input
              id="confirm"
              type={show ? "text" : "password"}
              autoComplete="new-password"
              placeholder="Repita a nova senha"
              disabled={submitting}
              className="h-11 pl-10 text-sm"
              {...form.register("confirm")}
            />
          </div>
          {form.formState.errors.confirm && (
            <p className="text-xs text-destructive">{form.formState.errors.confirm.message}</p>
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

        <Button type="submit" className="h-11 w-full text-[15px] font-medium" disabled={submitting}>
          {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Salvar nova senha
        </Button>
      </form>
    </AuthLayout>
  );
}
