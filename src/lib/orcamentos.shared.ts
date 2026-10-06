/**
 * Status de orçamento/documento comercial — fonte única de rótulo e cor.
 * Antes estava copiado em comercial.orcamento.index.tsx e na ficha do cliente.
 */
export const ORCAMENTO_STATUS_META: Record<string, { label: string; cls: string }> = {
  rascunho: {
    label: "Rascunho",
    cls: "bg-[var(--badge-neutral-bg)] text-[var(--badge-neutral-fg)] border-[var(--badge-neutral-border)]",
  },
  emitido: {
    label: "Emitido",
    cls: "bg-[var(--badge-neutral-bg)] text-[var(--badge-neutral-fg)] border-[var(--badge-neutral-border)]",
  },
  em_revisao: { label: "Em revisão", cls: "bg-amber-50 text-amber-800 border-amber-200" },
  aprovado: { label: "Aprovado", cls: "bg-emerald-50 text-emerald-800 border-emerald-200" },
  publicado: { label: "Publicado", cls: "bg-sky-50 text-sky-800 border-sky-200" },
  arquivado: { label: "Arquivado", cls: "bg-rose-50 text-rose-800 border-rose-200" },
};

export function orcamentoStatusMeta(status: string | null | undefined) {
  return (status && ORCAMENTO_STATUS_META[status]) || { label: status ?? "—", cls: "" };
}
