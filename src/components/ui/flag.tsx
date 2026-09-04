import { cn } from "@/lib/utils";

/**
 * Bandeira SVG via flagcdn.com — funciona em todos os SOs (inclusive Windows,
 * que não renderiza emojis de bandeira).
 */
export function Flag({
  code,
  className,
  size = 20,
}: {
  code: string | null | undefined;
  className?: string;
  size?: number;
}) {
  if (!code || code.length !== 2) return null;
  const c = code.toLowerCase();
  return (
    <img
      src={`https://flagcdn.com/${c}.svg`}
      alt={code.toUpperCase()}
      width={size}
      height={Math.round(size * 0.75)}
      loading="lazy"
      className={cn("inline-block rounded-[2px] object-cover shadow-[0_0_0_1px_rgba(0,0,0,0.06)]", className)}
      style={{ width: size, height: Math.round(size * 0.75) }}
    />
  );
}