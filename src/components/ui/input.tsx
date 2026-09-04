import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-11 w-full rounded-[var(--radius-md)] border border-[var(--bg-border)] bg-[var(--bg-surface)] px-3.5 py-2 text-sm font-medium text-[var(--text-primary)] shadow-[inset_0_1px_0_rgba(255,255,255,0.02)] transition-all",
          "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
          "placeholder:font-normal placeholder:text-[var(--text-muted)]",
          "hover:border-[var(--text-muted)]/50",
          "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--primary)]/15 focus-visible:border-[var(--primary)] focus-visible:bg-[var(--bg-surface)]",
          "disabled:cursor-not-allowed disabled:opacity-60",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
