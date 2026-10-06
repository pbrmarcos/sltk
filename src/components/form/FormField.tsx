import * as React from "react";
import { Info } from "lucide-react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/**
 * Rótulo padrão do sistema (12px, sem caixa alta) + campo + erro.
 * A dica (`hint`) vira um ícone com tooltip nativo em vez de um parágrafo.
 */
export function FormField({
  label,
  htmlFor,
  required,
  error,
  hint,
  className,
  children,
}: {
  label: string;
  htmlFor?: string;
  required?: boolean;
  error?: string | null;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label
        htmlFor={htmlFor}
        className="flex items-center gap-1 text-xs font-medium text-[var(--text-secondary)]"
      >
        {label}
        {required && <span className="text-destructive">*</span>}
        {hint && <Info className="h-3 w-3 text-muted-foreground" aria-label={hint} role="img" />}
        {hint && <span className="sr-only">{hint}</span>}
      </Label>
      {children}
      {error && <p className="text-[11px] text-destructive">{error}</p>}
    </div>
  );
}
