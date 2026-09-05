import { ArrowDown, ArrowUp } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Props = {
  label: string;
  value: string;
  deltaPct: number;
  /** Se true, um delta positivo é ruim (ex: erros, chamados fora de SLA). */
  invert?: boolean;
  hint?: string;
  icon?: React.ComponentType<{ className?: string }>;
  to?: string;
};

export function MetricCard({
  label,
  value,
  deltaPct,
  invert = false,
  hint,
  icon: Icon,
  to,
}: Props) {
  const up = deltaPct >= 0;
  const isBad = invert ? up : !up;
  const color =
    deltaPct === 0
      ? "text-muted-foreground"
      : isBad
        ? "text-destructive"
        : "text-emerald-600 dark:text-emerald-400";
  const Arrow = up ? ArrowUp : ArrowDown;

  const inner = (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        {Icon ? <Icon className="h-4 w-4 text-muted-foreground" /> : null}
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-semibold tabular-nums">{value}</div>
        <div className={cn("mt-1 flex items-center gap-1 text-xs", color)}>
          <Arrow className="h-3 w-3" />
          <span className="font-medium">{Math.abs(deltaPct)}%</span>
          {hint ? <span className="text-muted-foreground">{hint}</span> : null}
        </div>
      </CardContent>
    </Card>
  );

  if (to) {
    return (
      <Link to={to as never} className="block h-full transition-transform hover:-translate-y-0.5">
        {inner}
      </Link>
    );
  }
  return inner;
}
