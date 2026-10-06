import * as React from "react";
import { cn } from "@/lib/utils";

/** Bloco de formulário com título; conteúdo sempre visível. */
export function FormSection({
  title,
  right,
  className,
  children,
}: {
  title: string;
  right?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        "rounded-[var(--radius-lg)] border border-[var(--bg-border)] bg-[var(--bg-surface)] shadow-[var(--shadow-sm)]",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2 border-b border-[var(--bg-border)] px-4 py-2.5">
        <h2 className="text-sm font-semibold text-[var(--text-primary)]">{title}</h2>
        {right}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}
