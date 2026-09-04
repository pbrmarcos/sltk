import * as React from "react";

import { cn } from "@/lib/utils";

const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<"textarea">>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[88px] w-full rounded-[var(--radius-md)] border border-[var(--bg-border)] bg-[var(--bg-surface)] px-3.5 py-3 text-sm font-medium leading-relaxed text-[var(--text-primary)] shadow-[inset_0_1px_0_rgba(255,255,255,0.02)] transition-all",
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
Textarea.displayName = "Textarea";

export { Textarea };
