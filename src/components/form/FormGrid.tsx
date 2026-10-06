import * as React from "react";
import { cn } from "@/lib/utils";

const COLS = {
  1: "grid-cols-1",
  2: "grid-cols-1 sm:grid-cols-2",
  3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
  4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
} as const;

export function FormGrid({
  cols = 3,
  className,
  children,
}: {
  cols?: keyof typeof COLS;
  className?: string;
  children: React.ReactNode;
}) {
  return <div className={cn("grid gap-3", COLS[cols], className)}>{children}</div>;
}
