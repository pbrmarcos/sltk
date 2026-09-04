import { Link, type LinkProps } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";
import { useMyModules } from "@/hooks/use-my-modules";
import { MODULE_LABEL, type AppModule } from "@/lib/permissoes.functions";
import { cn } from "@/lib/utils";

type ButtonProps = React.ComponentProps<typeof Button>;

/**
 * Botão de ação que navega para uma rota protegida por módulo.
 * Se o usuário não tem o módulo, o botão fica DESABILITADO com tooltip
 * explicativo — nunca clicável-mas-inerte, nunca bloqueio silencioso.
 */
export function PermissionLinkButton({
  module,
  to,
  params,
  search,
  onClick,
  children,
  className,
  ...buttonProps
}: {
  module: AppModule;
  to: LinkProps["to"];
  params?: LinkProps["params"];
  search?: LinkProps["search"];
  onClick?: () => void;
  children: React.ReactNode;
} & Omit<ButtonProps, "asChild" | "onClick" | "children">) {
  const { role } = useAuth();
  const { modules, loading } = useMyModules();
  const allowed = role === "admin" || modules.has(module);

  if (!allowed && !loading) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          {/* span necessário: botão desabilitado não dispara eventos de hover */}
          <span className="inline-flex">
            <Button {...buttonProps} disabled className={cn("pointer-events-none", className)}>
              {children}
            </Button>
          </span>
        </TooltipTrigger>
        <TooltipContent>
          Você não tem permissão para o módulo {MODULE_LABEL[module] ?? module}. Solicite acesso ao
          administrador.
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Button {...buttonProps} className={className} asChild>
      <Link to={to} params={params as never} search={search as never} onClick={onClick}>
        {children}
      </Link>
    </Button>
  );
}
