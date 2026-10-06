import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

export type StatItem = {
  label: string;
  value: string | number;
  /** Complemento curto, mostrado em cinza após o valor. */
  hint?: string;
  tone?: "default" | "success" | "warning" | "danger";
  /** Rota opcional: o item vira link. */
  to?: string;
};

const TONE: Record<NonNullable<StatItem["tone"]>, string> = {
  default: "text-foreground",
  success: "text-emerald-700",
  warning: "text-amber-700",
  danger: "text-rose-700",
};

/**
 * Números de resumo em uma linha de texto ("6 ativas · R$ 2,1M · conversão 50%").
 * Substitui as fileiras de mini-cards nas listas e fichas; cards só nos dashboards
 * (`variant="cards"`).
 */
export function StatLine({
  items,
  variant = "line",
  className,
}: {
  items: StatItem[];
  variant?: "line" | "cards";
  className?: string;
}) {
  if (items.length === 0) return null;

  if (variant === "cards") {
    return (
      <div
        className={cn("grid grid-cols-2 gap-3", items.length >= 4 && "md:grid-cols-4", className)}
      >
        {items.map((it) => (
          <StatWrap key={it.label} to={it.to} className="rounded-lg border bg-card p-3">
            <div className="text-[11px] text-muted-foreground">{it.label}</div>
            <div className={cn("text-lg font-semibold tabular-nums", TONE[it.tone ?? "default"])}>
              {it.value}
            </div>
            {it.hint && <div className="text-[11px] text-muted-foreground">{it.hint}</div>}
          </StatWrap>
        ))}
      </div>
    );
  }

  return (
    <p className={cn("flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 text-sm", className)}>
      {items.map((it, i) => (
        <span key={it.label} className="inline-flex items-baseline gap-1">
          {i > 0 && <span className="text-muted-foreground/60">·</span>}
          <StatWrap to={it.to} className="inline-flex items-baseline gap-1">
            <span className={cn("font-semibold tabular-nums", TONE[it.tone ?? "default"])}>
              {it.value}
            </span>
            <span className="text-muted-foreground">{it.label}</span>
            {it.hint && <span className="text-muted-foreground/70">({it.hint})</span>}
          </StatWrap>
        </span>
      ))}
    </p>
  );
}

function StatWrap({
  to,
  className,
  children,
}: {
  to?: string;
  className?: string;
  children: React.ReactNode;
}) {
  if (to) {
    return (
      <Link to={to} className={cn(className, "hover:underline")}>
        {children}
      </Link>
    );
  }
  return <span className={className}>{children}</span>;
}
