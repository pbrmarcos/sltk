import { useRef } from "react";
import {
  Workflow,
  Droplets,
  Tag,
  Package,
  Boxes,
  Radar,
  GitMerge,
  Waves,
  Cog,
  Zap,
  Cpu,
  CircuitBoard,
  Wrench,
  Layers,
  Box,
  Ship,
  Ruler,
  Bot,
  type LucideIcon,
} from "lucide-react";

type Categoria = { slug: string; nome_pt: string };

const ICONS: Record<string, LucideIcon> = {
  esteiras: Workflow,
  envasadoras: Droplets,
  rotuladoras: Tag,
  empacotadoras: Package,
  paletizadoras: Boxes,
  sensores: Radar,
  valvulas: GitMerge,
  bombas: Waves,
  motores_redutores: Cog,
  inversores: Zap,
  clps_ihm: Cpu,
  paineis_eletricos: CircuitBoard,
  inox: Wrench,
  embalagem_filme: Layers,
  caixas_papelao: Box,
  frete_internacional: Ship,
  servicos_engenharia: Ruler,
  automacao_geral: Bot,
};

// Tonalidade sutil por slug — usada no badge do ícone quando inativo
const TINT: Record<string, string> = {
  esteiras: "bg-amber-50 text-amber-700",
  envasadoras: "bg-sky-50 text-sky-700",
  rotuladoras: "bg-pink-50 text-pink-700",
  empacotadoras: "bg-orange-50 text-orange-700",
  paletizadoras: "bg-yellow-50 text-yellow-700",
  sensores: "bg-emerald-50 text-emerald-700",
  valvulas: "bg-[var(--badge-neutral-bg)] text-[var(--badge-neutral-fg)]",
  bombas: "bg-cyan-50 text-cyan-700",
  motores_redutores: "bg-[var(--badge-neutral-bg)] text-[var(--badge-neutral-fg)]",
  inversores: "bg-violet-50 text-violet-700",
  clps_ihm: "bg-indigo-50 text-indigo-700",
  paineis_eletricos: "bg-blue-50 text-blue-700",
  inox: "bg-neutral-100 text-neutral-700",
  embalagem_filme: "bg-teal-50 text-teal-700",
  caixas_papelao: "bg-amber-50 text-amber-800",
  frete_internacional: "bg-blue-50 text-blue-700",
  servicos_engenharia: "bg-purple-50 text-purple-700",
  automacao_geral: "bg-rose-50 text-rose-700",
};

export function CategoriasPicker({
  categorias,
  selected,
  onToggle,
  ariaLabel = "Categorias do fornecedor",
}: {
  categorias: Categoria[];
  selected: string[];
  onToggle: (slug: string) => void;
  ariaLabel?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Roving focus com setas — melhora navegação por teclado.
  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    const keys = ["ArrowRight", "ArrowLeft", "ArrowDown", "ArrowUp", "Home", "End"];
    if (!keys.includes(e.key)) return;
    const buttons = Array.from(
      containerRef.current?.querySelectorAll<HTMLButtonElement>("button[data-cat-tile]") ?? [],
    );
    if (buttons.length === 0) return;
    const currentIdx = buttons.findIndex((b) => b === document.activeElement);
    let nextIdx = currentIdx;
    if (e.key === "ArrowRight" || e.key === "ArrowDown")
      nextIdx = (currentIdx + 1 + buttons.length) % buttons.length;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp")
      nextIdx = (currentIdx - 1 + buttons.length) % buttons.length;
    else if (e.key === "Home") nextIdx = 0;
    else if (e.key === "End") nextIdx = buttons.length - 1;
    if (nextIdx !== currentIdx && buttons[nextIdx]) {
      e.preventDefault();
      buttons[nextIdx].focus();
    }
  }

  return (
    <div
      ref={containerRef}
      role="group"
      aria-label={ariaLabel}
      onKeyDown={handleKeyDown}
      data-testid="categorias-picker"
      className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6"
    >
      {categorias.map((c) => {
        const Icon = ICONS[c.slug] ?? Package;
        const active = selected.includes(c.slug);
        const tint = TINT[c.slug] ?? "bg-[var(--badge-neutral-bg)] text-[var(--badge-neutral-fg)]";
        return (
          <button
            key={c.slug}
            type="button"
            data-cat-tile
            data-slug={c.slug}
            data-active={active ? "true" : "false"}
            onClick={() => onToggle(c.slug)}
            aria-pressed={active}
            aria-label={`${c.nome_pt}${active ? " (selecionado)" : ""}`}
            className={`group flex min-w-0 items-center gap-2.5 rounded-lg border px-2.5 py-2 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 ${
              active
                ? "border-blue-600 bg-blue-50 ring-1 ring-blue-600"
                : "border-[var(--bg-border)] bg-[var(--bg-surface)] hover:border-blue-300 hover:bg-[var(--bg-elevated)]"
            }`}
          >
            <span
              aria-hidden="true"
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${
                active ? "bg-blue-600 text-white" : tint
              }`}
            >
              <Icon className="h-4 w-4" strokeWidth={2} />
            </span>
            <span
              className={`min-w-0 break-words text-[12px] font-medium leading-tight ${
                active ? "text-blue-900" : "text-[var(--text-primary)]"
              }`}
            >
              {c.nome_pt}
            </span>
          </button>
        );
      })}
    </div>
  );
}
