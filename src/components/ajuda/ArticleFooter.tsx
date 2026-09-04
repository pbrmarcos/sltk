import { Link } from "@tanstack/react-router";
import { ThumbsUp, ThumbsDown, MessageSquarePlus, Tag } from "lucide-react";
import { toast } from "sonner";
import { APP_VERSION } from "@/lib/app-version";

export function ArticleFooter({
  slug,
  atualizadoEm,
  appVersion,
}: {
  slug: string;
  atualizadoEm: string;
  appVersion?: string;
}) {
  const date = new Date(atualizadoEm);
  const formatted = isNaN(date.getTime())
    ? atualizadoEm
    : date.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });

  const version = appVersion ?? APP_VERSION;
  const isCurrent = version === APP_VERSION;

  return (
    <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--bg-border)] pt-4 text-sm text-[var(--text-muted)]">
      <div className="flex flex-wrap items-center gap-3">
        <span>Atualizado em {formatted}</span>
        <span
          className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] uppercase tracking-wide ${
            isCurrent
              ? "bg-[var(--bg-elevated)] text-[var(--text-primary)]"
              : "bg-[var(--warning-bg,var(--bg-elevated))] text-[var(--warning,var(--text-muted))]"
          }`}
          title={isCurrent ? "Revisado na versão atual do app" : `Revisado em v${version}; app atual é v${APP_VERSION}`}
        >
          <Tag className="h-3 w-3" /> v{version}
        </span>
        <Link to="/ajuda/atualizacoes" className="text-[var(--info)] hover:underline">
          ver histórico
        </Link>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span>Este artigo foi útil?</span>
        <button
          type="button"
          onClick={() => toast.success("Obrigado pelo feedback!")}
          className="inline-flex items-center gap-1 rounded-md border border-[var(--bg-border)] bg-[var(--bg-surface)] px-2 py-1 text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]"
          aria-label="Artigo útil"
        >
          <ThumbsUp className="h-3.5 w-3.5" /> Sim
        </button>
        <button
          type="button"
          onClick={() => toast.message("Registrado. Vamos revisar este artigo.")}
          className="inline-flex items-center gap-1 rounded-md border border-[var(--bg-border)] bg-[var(--bg-surface)] px-2 py-1 text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]"
          aria-label="Artigo não útil"
        >
          <ThumbsDown className="h-3.5 w-3.5" /> Não
        </button>
        <Link
          to="/pos-vendas/chamados"
          search={{ origem: "docs", slug } as never}
          className="inline-flex items-center gap-1 rounded-md border border-[var(--bg-border)] bg-[var(--bg-surface)] px-2 py-1 text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]"
        >
          <MessageSquarePlus className="h-3.5 w-3.5" /> Sugerir melhoria
        </Link>
      </div>
    </div>
  );
}

