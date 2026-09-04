import * as React from "react";
import { cn } from "@/lib/utils";

export type BadgeTone = "success" | "danger" | "warning" | "info" | "neutral";

const toneStyles: Record<BadgeTone, React.CSSProperties> = {
  success: {
    background: "var(--badge-success-bg)",
    color: "var(--badge-success-fg)",
    borderColor: "var(--badge-success-border)",
  },
  danger: {
    background: "var(--badge-danger-bg)",
    color: "var(--badge-danger-fg)",
    borderColor: "var(--badge-danger-border)",
  },
  warning: {
    background: "var(--badge-warning-bg)",
    color: "var(--badge-warning-fg)",
    borderColor: "var(--badge-warning-border)",
  },
  info: {
    background: "var(--badge-info-bg)",
    color: "var(--badge-info-fg)",
    borderColor: "var(--badge-info-border)",
  },
  neutral: {
    background: "var(--badge-neutral-bg)",
    color: "var(--badge-neutral-fg)",
    borderColor: "var(--badge-neutral-border)",
  },
};

/**
 * Tinted status badge with WCAG AA contrast on light surfaces.
 * Use for tags, action types, statuses and chips across the app.
 */
export function StatusBadge({
  tone = "neutral",
  className,
  children,
}: {
  tone?: BadgeTone;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold tracking-wide",
        className,
      )}
      style={toneStyles[tone]}
    >
      {children}
    </span>
  );
}