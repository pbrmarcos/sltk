import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type PaginationProps = {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
};

function PageButton({
  active,
  children,
  onClick,
  disabled,
  ariaLabel,
}: {
  active?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  ariaLabel?: string;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      aria-current={active ? "page" : undefined}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] border text-[13px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
        active
          ? "border-[var(--primary)] bg-[var(--primary)] font-semibold text-[var(--primary-foreground)] shadow-[var(--shadow-sm)]"
          : "border-[var(--bg-border)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:border-[var(--bg-border)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]",
        disabled &&
          "cursor-not-allowed border-[var(--bg-border)] text-[var(--text-muted)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-muted)]",
      )}
    >
      {children}
    </button>
  );
}


function getPageItems(current: number, total: number): (number | "ellipsis")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const items: (number | "ellipsis")[] = [1];
  if (current > 3) items.push("ellipsis");

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i++) items.push(i);

  if (current < total - 2) items.push("ellipsis");
  items.push(total);

  return items;
}

export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [25, 50, 100],
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(total, page * pageSize);
  const pageItems = getPageItems(page, totalPages);

  return (
    <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-lg)] border border-[var(--bg-border)] bg-[var(--bg-surface)] px-3 py-2 shadow-[var(--shadow-sm)]">
      <div className="text-[12.5px] text-[var(--text-secondary)]">
        {total === 0
          ? "Nenhum resultado"
          : `Exibindo ${start}–${end} de ${total}`}
      </div>
      <div className="flex items-center gap-3">
        {onPageSizeChange && (
          <div className="flex items-center gap-2 text-[12.5px] text-[var(--text-secondary)]">
            <span>Por página</span>
            <Select
              value={String(pageSize)}
              onValueChange={(v) => onPageSizeChange(Number(v))}
            >
              <SelectTrigger className="h-8 w-[72px] text-[12.5px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pageSizeOptions.map((o) => (
                  <SelectItem key={o} value={String(o)}>
                    {o}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="flex items-center gap-1 rounded-[var(--radius-lg)] border border-[var(--bg-border)] bg-[var(--bg-base)] p-1">
          <PageButton
            disabled={page <= 1}
            onClick={() => onPageChange(1)}
            ariaLabel="Primeira página"
          >
            <ChevronsLeft className="h-4 w-4" />
          </PageButton>
          <PageButton
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            ariaLabel="Página anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </PageButton>
          {pageItems.map((item, idx) =>
            item === "ellipsis" ? (
              <span
                key={`ellipsis-${idx}`}
                className="flex h-9 w-5 items-center justify-center text-[13px] text-[var(--text-muted)]"
                aria-hidden
              >
                …
              </span>
            ) : (
              <PageButton
                key={item}
                active={item === page}
                onClick={() => onPageChange(item)}
                ariaLabel={`Ir para página ${item}`}
              >
                {item}
              </PageButton>
            ),
          )}
          <PageButton
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            ariaLabel="Próxima página"
          >
            <ChevronRight className="h-4 w-4" />
          </PageButton>
          <PageButton
            disabled={page >= totalPages}
            onClick={() => onPageChange(totalPages)}
            ariaLabel="Última página"
          >
            <ChevronsRight className="h-4 w-4" />
          </PageButton>
        </div>
      </div>
    </div>
  );
}
