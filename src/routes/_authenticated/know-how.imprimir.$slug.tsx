import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect } from "react";
import { ArrowLeft, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getItemBySlug } from "@/lib/know-how.functions";

export const Route = createFileRoute("/_authenticated/know-how/imprimir/$slug")({
  head: () => ({
    meta: [
      { title: "Know-how — versão para impressão | Solutek Hub" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: KnowHowPrint,
});

const PRINT_CSS = `
@media print {
  @page { size: A4; margin: 16mm 14mm 18mm 14mm; }
  body { background: #fff !important; }
  [data-print-hide] { display: none !important; }
  body * { visibility: hidden !important; }
  .kh-print-root, .kh-print-root * { visibility: visible !important; }
  .kh-print-root { position: absolute !important; inset: 0 auto auto 0 !important; width: 100% !important; }
  .kh-print-sheet { box-shadow: none !important; border: 0 !important; padding: 0 !important; margin: 0 !important; max-width: none !important; }
  .kh-print-body { page-break-inside: auto; }
  .kh-print-avoid-break { page-break-inside: avoid; }
}
`;

function KnowHowPrint() {
  const { slug } = Route.useParams();
  const getFn = useServerFn(getItemBySlug);
  const item = useQuery({ queryKey: ["kh", "item", slug], queryFn: () => getFn({ data: { slug } }) });

  useEffect(() => {
    if (item.data) {
      const t = setTimeout(() => window.print(), 500);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [item.data]);

  if (item.isLoading) {
    return <p className="p-10 text-sm text-[var(--text-muted)]">Preparando versão para impressão…</p>;
  }
  if (item.error || !item.data) {
    return (
      <div className="p-10">
        <p className="text-sm text-[var(--danger)]">
          {(item.error as Error | undefined)?.message ?? "Conteúdo não encontrado."}
        </p>
      </div>
    );
  }

  const it = item.data;

  return (
    <div className="kh-print-root min-h-screen bg-[var(--bg-elevated)] py-8 print:bg-white print:py-0">
      <style dangerouslySetInnerHTML={{ __html: PRINT_CSS }} />

      <div className="mx-auto mb-4 flex max-w-[820px] items-center justify-between px-4" data-print-hide>
        <Button asChild variant="ghost" size="sm">
          <Link to="/know-how/$slug" params={{ slug }}>
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Voltar ao material
          </Link>
        </Button>
        <Button size="sm" onClick={() => window.print()}>
          <Printer className="mr-1.5 h-4 w-4" />
          Imprimir / Salvar PDF
        </Button>
      </div>

      <article className="kh-print-sheet mx-auto max-w-[820px] rounded-lg border border-[var(--bg-border)] bg-white p-10 text-black shadow-[var(--shadow-sm)]">
        <header className="kh-print-avoid-break mb-6 border-b border-neutral-300 pb-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
            SLTK Americas · Know-how &amp; Treinamentos
          </p>
          <h1 className="mt-2 text-2xl font-bold leading-tight text-neutral-900">{it.titulo}</h1>
          {it.resumo && <p className="mt-2 text-sm text-neutral-600">{it.resumo}</p>}
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-neutral-500">
            <span>Tipo: {it.tipo}</span>
            <span>Versão: v{it.versao}</span>
            <span>Status: {it.status}</span>
            <span>Atualizado em {new Date(it.atualizado_em).toLocaleDateString("pt-BR")}</span>
          </div>
          {it.tags?.length > 0 && (
            <p className="mt-2 text-[11px] text-neutral-500">Tags: {it.tags.map((t) => `#${t}`).join("  ")}</p>
          )}
          {it.papeis_alvo?.length > 0 && (
            <p className="mt-1 text-[11px] text-neutral-500">Perfis-alvo: {it.papeis_alvo.join(", ")}</p>
          )}
        </header>

        {it.corpo ? (
          <div className="kh-print-body whitespace-pre-wrap text-[13px] leading-relaxed text-neutral-900">
            {it.corpo}
          </div>
        ) : (
          <p className="text-sm text-neutral-500">Este material não possui corpo em texto (conteúdo em mídia anexa).</p>
        )}

        {it.midia_url && (
          <p className="mt-6 break-all border-t border-neutral-200 pt-3 text-[11px] text-neutral-500">
            Mídia associada: {it.midia_url}
          </p>
        )}

        <footer className="kh-print-avoid-break mt-8 border-t border-neutral-300 pt-3 text-[10px] text-neutral-500">
          Documento gerado pelo Solutek Hub · uso interno · confira sempre a versão vigente em /know-how/{it.slug}
        </footer>
      </article>
    </div>
  );
}
