import * as React from "react";
import { Loader2, AlertTriangle, Inbox } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[200px] flex-col items-center justify-center gap-2 rounded-[var(--radius-lg)] border border-[var(--bg-border)] bg-[var(--bg-surface)] p-10 text-center shadow-[var(--shadow-sm)]">
      {children}
    </div>
  );
}

export function TableLoading({ label = "Carregando…" }: { label?: string }) {
  return (
    <Shell>
      <Loader2 className="h-6 w-6 animate-spin text-[var(--text-muted)]" />
      <p className="text-sm text-[var(--text-muted)]">{label}</p>
    </Shell>
  );
}

export function TableEmpty({
  title = "Nenhum registro encontrado",
  description,
  action,
}: {
  title?: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <Shell>
      <Inbox className="h-7 w-7 text-[var(--text-muted)]" />
      <h3 className="text-sm font-semibold text-[var(--text-primary)]">{title}</h3>
      {description && <p className="max-w-md text-xs text-[var(--text-muted)]">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </Shell>
  );
}

export function TableError({
  title = "Erro ao carregar",
  description = "Tente novamente em instantes.",
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <Shell>
      <AlertTriangle className="h-7 w-7 text-[var(--danger)]" />
      <h3 className="text-sm font-semibold text-[var(--text-primary)]">{title}</h3>
      <p className="max-w-md text-xs text-[var(--text-muted)]">{description}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-2 rounded-md border border-[var(--bg-border)] bg-[var(--bg-surface)] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]"
        >
          Tentar novamente
        </button>
      )}
    </Shell>
  );
}

/**
 * Shimmer line — neutral skeleton block matching the Workspace style.
 */
export function SkeletonLine({ className }: { className?: string }) {
  return (
    <div className={cn("h-3 w-full animate-pulse rounded bg-[var(--bg-elevated)]", className)} />
  );
}

/**
 * Skeleton rows rendered inside the standard Table shell, matching the
 * column count of the target table so the layout doesn't jump on load.
 */
export function TableSkeleton({
  columns,
  rows = 6,
  headers,
}: {
  columns: number;
  rows?: number;
  headers?: string[];
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          {Array.from({ length: columns }).map((_, i) => (
            <TableHead key={i}>{headers?.[i] ?? <SkeletonLine className="h-2.5 w-20" />}</TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: rows }).map((_, r) => (
          <TableRow key={r}>
            {Array.from({ length: columns }).map((_, c) => (
              <TableCell key={c}>
                <SkeletonLine
                  className={cn(
                    c === 0 && "w-28",
                    c === columns - 1 && "w-16",
                    c !== 0 && c !== columns - 1 && "w-3/4",
                  )}
                />
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
