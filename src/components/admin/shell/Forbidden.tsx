import { Lock } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

/**
 * Renderizado pelo `errorComponent` do layout `_admin` quando o guard nega
 * acesso. Sem redirect — evita loop de auth em rotas dentro do próprio
 * layout.
 */
export function Forbidden() {
  const navigate = useNavigate();
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="mx-auto max-w-md rounded-lg border bg-card p-8 text-center shadow-sm">
        <Lock className="mx-auto mb-4 h-10 w-10 text-destructive" />
        <h1 className="text-lg font-semibold">Você não tem permissão para acessar esta área</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Se acredita que isso é um engano, procure um administrador.
        </p>
        <Button className="mt-6" onClick={() => navigate({ to: "/dashboard", replace: true })}>
          Voltar ao início
        </Button>
      </div>
    </div>
  );
}
