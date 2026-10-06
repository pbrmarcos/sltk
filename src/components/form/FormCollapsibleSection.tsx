import * as React from "react";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

/**
 * Bloco de formulário recolhido por padrão. `count` ("2/9") mostra quantos
 * campos já estão preenchidos sem precisar abrir.
 */
export function FormCollapsibleSection({
  title,
  count,
  right,
  defaultOpen = false,
  open: openProp,
  onOpenChange,
  className,
  children,
}: {
  title: string;
  count?: string;
  right?: React.ReactNode;
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (o: boolean) => void;
  className?: string;
  children: React.ReactNode;
}) {
  const [openState, setOpenState] = useState(defaultOpen);
  const open = openProp ?? openState;
  const setOpen = (o: boolean) => {
    setOpenState(o);
    onOpenChange?.(o);
  };
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <section
        className={cn(
          "rounded-[var(--radius-lg)] border border-[var(--bg-border)] bg-[var(--bg-surface)] shadow-[var(--shadow-sm)]",
          className,
        )}
      >
        <div className="flex items-center justify-between gap-2 px-4 py-2.5">
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="flex flex-1 items-center gap-2 text-left text-sm font-semibold text-[var(--text-primary)]"
            >
              <ChevronDown className={cn("h-4 w-4 transition-transform", !open && "-rotate-90")} />
              {title}
              {count && (
                <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10.5px] font-medium tabular-nums text-muted-foreground">
                  {count}
                </span>
              )}
            </button>
          </CollapsibleTrigger>
          {right}
        </div>
        <CollapsibleContent>
          <div className="border-t border-[var(--bg-border)] p-4">{children}</div>
        </CollapsibleContent>
      </section>
    </Collapsible>
  );
}
