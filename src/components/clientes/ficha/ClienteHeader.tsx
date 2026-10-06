import { Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { AddressLine } from "./AddressLine";
import type { ClienteRow } from "./ficha-utils";

/**
 * Cabeçalho em uma linha: avatar · nome · #código · ramo · cidade/país e a
 * barra "Cadastro N% completo". Os números da conta ficam na aba Visão.
 */
export function ClienteHeader({
  cliente,
  paisNome,
  segmentoNome,
  completude,
  onCompletar,
}: {
  cliente: ClienteRow;
  paisNome: string;
  segmentoNome: string | null;
  completude: { pct: number; faltantes: number };
  onCompletar: () => void;
}) {
  const initials = cliente.razao_social
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const completo = completude.pct >= 100;

  return (
    <div className="px-4 pt-3 md:px-6 md:pt-4">
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 shadow-sm">
        <div
          className="grid h-11 w-11 shrink-0 place-items-center rounded-lg text-[15px] font-bold text-white"
          style={{ background: "linear-gradient(135deg,#1e3a8a,#3b82f6 60%,#06b6d4)" }}
        >
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate text-[16px] font-semibold tracking-tight text-foreground md:text-[18px]">
              {cliente.nome_fantasia || cliente.razao_social}
            </h1>
            <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10.5px] text-muted-foreground">
              #{cliente.codigo}
            </span>
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12.5px] text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5" /> {segmentoNome ?? "Ramo não informado"}
            </span>
            <AddressLine cliente={cliente} paisNome={paisNome} />
          </div>
        </div>
        <button
          type="button"
          onClick={onCompletar}
          className="group flex w-full items-center gap-2 text-left sm:w-auto sm:min-w-[200px]"
          title={
            completo
              ? "Cadastro completo"
              : `${completude.faltantes} item(ns) para completar · clique para ver`
          }
        >
          <div className="flex-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-muted-foreground">Cadastro</span>
              <span
                className={cn(
                  "font-semibold tabular-nums",
                  completo ? "text-emerald-700" : "text-foreground",
                )}
              >
                {completude.pct}%
              </span>
            </div>
            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  completo ? "bg-emerald-500" : "bg-[var(--brand-blue,#1e40af)]",
                )}
                style={{ width: `${completude.pct}%` }}
              />
            </div>
          </div>
          {!completo && (
            <span className="text-[11.5px] font-medium text-[var(--brand-blue,#1e40af)] group-hover:underline">
              Completar
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
