import type { ReactNode } from "react";

// ============ TL;DR Box ============
export function TldrBox({ children }: { children: ReactNode }) {
  return (
    <aside
      className="not-prose mb-6 rounded-[var(--radius-lg)] border-l-4 border-[var(--info)] bg-[var(--info)]/5 p-4"
      role="note"
      aria-label="Resumo rápido"
    >
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-[var(--info)]">
        Resumo
      </div>
      <div className="text-sm leading-relaxed text-[var(--text-primary)] [&_ul]:m-0 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:my-0.5">
        {children}
      </div>
    </aside>
  );
}

// ============ Step ============
export function Step({
  n,
  title,
  img,
  alt,
  children,
}: {
  n?: string | number;
  title?: string;
  img?: string;
  alt?: string;
  children: ReactNode;
}) {
  return (
    <section className="not-prose my-5 grid gap-4 rounded-[var(--radius-lg)] border border-[var(--bg-border)] bg-[var(--bg-surface)] p-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
      <div>
        <div className="mb-1 flex items-center gap-2">
          {n !== undefined && (
            <span
              className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-[var(--info)] px-2 text-xs font-semibold text-white"
              aria-label={`Passo ${n}`}
            >
              {n}
            </span>
          )}
          {title && <h3 className="text-sm font-semibold text-[var(--text-primary)]">{title}</h3>}
        </div>
        <div className="text-sm leading-relaxed text-[var(--text-primary)]">{children}</div>
      </div>
      {img && (
        <figure className="m-0 overflow-hidden rounded-[var(--radius-md)] border border-[var(--bg-border)] bg-[var(--bg-elevated)]">
          <a href={img} target="_blank" rel="noreferrer" aria-label="Ampliar imagem">
            <img
              src={img}
              alt={alt ?? title ?? "Ilustração do passo"}
              loading="lazy"
              className="block h-auto w-full"
            />
          </a>
        </figure>
      )}
    </section>
  );
}

// ============ Callout ============
type CalloutKind = "dica" | "atencao" | "erro" | "nota";
const KIND: Record<CalloutKind, { label: string; icon: string; color: string; bg: string }> = {
  dica: { label: "Dica", icon: "💡", color: "var(--success)", bg: "var(--success)" },
  atencao: { label: "Atenção", icon: "⚠️", color: "var(--warning)", bg: "var(--warning)" },
  erro: { label: "Erro comum", icon: "❌", color: "var(--danger)", bg: "var(--danger)" },
  nota: { label: "Nota", icon: "📝", color: "var(--info)", bg: "var(--info)" },
};

export function Callout({
  kind = "nota",
  title,
  children,
}: {
  kind?: CalloutKind;
  title?: string;
  children: ReactNode;
}) {
  const meta = KIND[kind] ?? KIND.nota;
  return (
    <aside
      className="not-prose my-4 rounded-[var(--radius-md)] border-l-4 p-3"
      style={{ borderColor: meta.color, background: `color-mix(in oklab, ${meta.bg} 8%, transparent)` }}
      role="note"
    >
      <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide" style={{ color: meta.color }}>
        <span aria-hidden>{meta.icon}</span>
        <span>{title ?? meta.label}</span>
      </div>
      <div className="text-sm leading-relaxed text-[var(--text-primary)] [&_p]:my-1 [&_ul]:my-1 [&_ul]:list-disc [&_ul]:pl-5">
        {children}
      </div>
    </aside>
  );
}

// ============ Figure ============
export function Figure({ src, alt, caption }: { src: string; alt: string; caption?: string }) {
  return (
    <figure className="not-prose my-4 overflow-hidden rounded-[var(--radius-lg)] border border-[var(--bg-border)] bg-[var(--bg-elevated)]">
      <a href={src} target="_blank" rel="noreferrer" aria-label="Ampliar imagem">
        <img src={src} alt={alt} loading="lazy" className="block h-auto w-full" />
      </a>
      {caption && (
        <figcaption className="border-t border-[var(--bg-border)] px-3 py-2 text-xs text-[var(--text-muted)]">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}
