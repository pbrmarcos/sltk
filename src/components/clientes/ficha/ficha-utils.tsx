import * as React from "react";
import type { Database } from "@/integrations/supabase/types";
import type { getClienteByCodigo } from "@/lib/clientes.functions";

export type ClienteRow = Database["public"]["Tables"]["clientes"]["Row"];
export type ClienteFichaData = Awaited<ReturnType<typeof getClienteByCodigo>>;

export const FICHA_TABS = [
  { id: "visao", label: "Visão" },
  { id: "comercial", label: "Comercial" },
  { id: "equipamentos", label: "Equipamentos" },
  { id: "contatos", label: "Contatos" },
  { id: "documentos", label: "Documentos" },
  { id: "historico", label: "Histórico" },
] as const;
export type FichaTab = (typeof FICHA_TABS)[number]["id"];

export function fmtMoney(v: number | null | undefined) {
  if (v == null) return "—";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(Number(v));
}
export function fmtDate(d: string | null | undefined) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("pt-BR");
  } catch {
    return "—";
  }
}
export function fmtDateTime(d: string | null | undefined) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return "—";
  }
}
export function formatBytes(n: number | null | undefined) {
  if (!n) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const res = (r.result as string) || "";
      resolve(res.includes(",") ? res.split(",", 2)[1] : res);
    };
    r.onerror = () => reject(new Error("Falha ao ler arquivo"));
    r.readAsDataURL(file);
  });
}

export function EmptyState({
  icon: Icon,
  title,
  hint,
  action,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  hint?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
      <div className="grid h-9 w-9 place-items-center rounded-full bg-muted text-muted-foreground">
        <Icon className="h-4 w-4" />
      </div>
      <div className="text-[13px] font-medium text-foreground">{title}</div>
      {hint && <div className="max-w-sm text-[12px] text-muted-foreground">{hint}</div>}
      {action}
    </div>
  );
}

/** Cartão de seção da ficha: título à esquerda, ação à direita, lista dentro. */
export function FichaSection({
  title,
  action,
  children,
}: {
  title: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-card shadow-sm">
      <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-2.5">
        <h2 className="text-[13.5px] font-semibold text-foreground">{title}</h2>
        {action}
      </div>
      <div>{children}</div>
    </section>
  );
}

/** Botão de filtro em pílula (fase, categoria, tipo de evento). */
export function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] transition-colors " +
        (active
          ? "border-[var(--brand-blue,#1e40af)] bg-[var(--brand-blue,#1e40af)]/10 text-[var(--brand-blue,#1e40af)]"
          : "border-border bg-card text-muted-foreground hover:text-foreground")
      }
    >
      {children}
    </button>
  );
}
