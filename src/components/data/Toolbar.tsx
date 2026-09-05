import * as React from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function Toolbar({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mb-4 flex flex-wrap items-center gap-2 rounded-[var(--radius-lg)] border border-[var(--bg-border)] bg-[var(--bg-surface)] p-2 shadow-[var(--shadow-sm)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function ToolbarSearch({
  value,
  onChange,
  placeholder = "Buscar…",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="relative flex min-w-[180px] flex-1 items-center">
      <Search className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-[var(--text-muted)]" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-9 w-full rounded-md border border-[var(--bg-border)] bg-[var(--bg-base)] pl-8 pr-3 text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--info)] focus:outline-none focus:ring-1 focus:ring-[var(--info)]"
      />
    </div>
  );
}

export function ToolbarSpacer() {
  return <div className="flex-1" />;
}

/**
 * Toolbar button — thin wrapper around the design-system Button so all
 * tables/toolbars share the same visual language.
 * variant=default → outline; variant=primary → default (brand blue).
 */
export function ToolbarButton({
  children,
  onClick,
  variant = "default",
  icon,
  type = "button",
  disabled,
  className,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "default" | "primary";
  icon?: React.ReactNode;
  type?: "button" | "submit";
  disabled?: boolean;
  className?: string;
}) {
  return (
    <Button
      type={type}
      onClick={onClick}
      disabled={disabled}
      variant={variant === "primary" ? "default" : "outline"}
      size="sm"
      className={cn("h-9 text-[12.5px]", className)}
    >
      {icon}
      {children}
    </Button>
  );
}
