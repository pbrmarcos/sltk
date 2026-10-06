/* eslint-disable @typescript-eslint/no-explicit-any */
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { FileDown, Printer, ShieldAlert, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getEntrevista } from "@/lib/entrevistas.functions";
import { useBrandSettings } from "@/hooks/use-brand-settings";

/** Prévia paginada (A4) das respostas da entrevista, com impressão/PDF. */
export function EntrevistaPreviewDialog({
  entrevistaId,
  codigo,
  open,
  onOpenChange,
}: {
  entrevistaId: string;
  codigo: string;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const brand = useBrandSettings();
  const getFn = useServerFn(getEntrevista);
  const preview = useQuery({
    queryKey: ["entrevistas", "preview", entrevistaId],
    enabled: open,
    queryFn: () => getFn({ data: { id: entrevistaId } }),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[min(92dvh,980px)] max-w-[min(1180px,calc(100vw-2rem))] flex-col overflow-hidden p-0 [&>button]:hidden">
        <style>{`
          @page { size: A4; margin: 0; }
          @media print {
            html, body { background: #fff !important; }
            body * { visibility: hidden !important; }
            .interview-print-area, .interview-print-area * { visibility: visible !important; }
            .interview-print-area {
              position: absolute !important;
              inset: 0 auto auto 0 !important;
              width: 100% !important;
              margin: 0 !important;
              padding: 0 !important;
              box-shadow: none !important;
            }
            .interview-preview-toolbar, .interview-page-indicator { display: none !important; }
            .interview-print-shell { background: #fff !important; padding: 0 !important; overflow: visible !important; }
            .interview-page { box-shadow: none !important; margin: 0 !important; page-break-after: always; break-after: page; }
            .interview-page:last-child { page-break-after: auto; break-after: auto; }
            .interview-qblock { break-inside: avoid; page-break-inside: avoid; }
          }
        `}</style>
        <DialogHeader className="interview-preview-toolbar border-b bg-background px-5 py-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <DialogTitle>Entrevista #{codigo}</DialogTitle>
              <DialogDescription>Prévia com quebra de páginas.</DialogDescription>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                <X className="mr-1.5 h-4 w-4" /> Fechar
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.print()}
                disabled={!preview.data || preview.isError}
              >
                <FileDown className="mr-1.5 h-4 w-4" /> Salvar PDF
              </Button>
              <Button
                size="sm"
                onClick={() => window.print()}
                disabled={!preview.data || preview.isError}
              >
                <Printer className="mr-1.5 h-4 w-4" /> Imprimir
              </Button>
            </div>
          </div>
        </DialogHeader>
        <div className="interview-print-shell flex-1 overflow-auto bg-muted p-4">
          {preview.isLoading ? (
            <div className="flex min-h-[480px] flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <div>Carregando…</div>
            </div>
          ) : preview.isError ? (
            <div className="mx-auto flex min-h-[480px] max-w-md flex-col items-center justify-center gap-2 rounded border border-rose-200 bg-rose-50 p-6 text-center text-sm text-rose-800">
              <ShieldAlert className="h-6 w-6" />
              <div className="font-semibold">Não foi possível carregar a prévia</div>
              <div>{(preview.error as any)?.message ?? "Tente fechar e abrir novamente."}</div>
              <Button size="sm" variant="outline" onClick={() => preview.refetch()}>
                Tentar novamente
              </Button>
            </div>
          ) : preview.data ? (
            <InterviewPreviewDocument entrevista={preview.data as any} brand={brand.settings} />
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function fmtDateTime(s?: string | null) {
  if (!s) return "—";
  try {
    return new Date(s).toLocaleString("pt-BR");
  } catch {
    return "—";
  }
}

function InterviewPreviewDocument({ entrevista, brand }: { entrevista: any; brand: any }) {
  const respostas: any[] = entrevista.respostas ?? [];
  const logo = brand?.logo_url || brand?.logo_url_dark || null;
  const empresa = brand?.system_name || "SLTK Americas";
  const codigoDoc = `ENT-${entrevista.codigo}`;
  const emissao = fmtDateTime(new Date().toISOString());

  // Paginação: página 1 leva cabeçalho grande + identificação + 6 respostas; demais 12 respostas.
  const FIRST_PAGE_ITEMS = 6;
  const OTHER_PAGE_ITEMS = 12;
  const pages: any[][] = [];
  if (respostas.length === 0) {
    pages.push([]);
  } else {
    pages.push(respostas.slice(0, FIRST_PAGE_ITEMS));
    for (let i = FIRST_PAGE_ITEMS; i < respostas.length; i += OTHER_PAGE_ITEMS) {
      pages.push(respostas.slice(i, i + OTHER_PAGE_ITEMS));
    }
  }
  const total = pages.length;

  return (
    <div className="interview-print-area mx-auto flex w-[210mm] flex-col items-center gap-4">
      {pages.map((chunk, idx) => (
        <div
          key={idx}
          className="interview-page relative flex h-[297mm] w-[210mm] flex-col bg-background p-[12mm] text-[11px] leading-relaxed text-foreground shadow-lg"
          style={{ fontFamily: "Arial, Helvetica, sans-serif" }}
        >
          {idx === 0 ? (
            <>
              <div className="mb-3 flex items-start justify-between gap-4">
                <div className="flex flex-1 items-start gap-3">
                  {logo ? (
                    <img src={logo} alt="Logomarca" className="h-14 w-auto object-contain" />
                  ) : null}
                  <div>
                    <h1 className="m-0 text-[22px] font-bold leading-tight">Entrevista Técnica</h1>
                    <div className="mt-1 leading-tight">
                      <div className="font-bold">{empresa}</div>
                      <div>Respostas do lead · {entrevista.segmento?.nome_pt ?? "—"}</div>
                    </div>
                  </div>
                </div>
                <div className="text-right leading-tight">
                  <div className="text-[13px] font-bold">{codigoDoc}</div>
                  <div>Emissão: {emissao}</div>
                  <div>Respondida: {fmtDateTime(entrevista.respondida_em)}</div>
                </div>
              </div>
              <div className="mb-2 bg-muted px-2 py-1 text-center text-[13px] font-bold">
                Entrevista nº {entrevista.codigo}
              </div>
              <div className="mb-1 bg-muted/70 px-2 py-1 text-center font-semibold">
                Identificação
              </div>
              <div className="mb-3 grid grid-cols-2 gap-x-4 gap-y-0.5">
                <div>
                  <b>Código:</b> #{entrevista.codigo}
                </div>
                <div>
                  <b>Segmento:</b> {entrevista.segmento?.nome_pt ?? "—"}
                </div>
                <div>
                  <b>Lead:</b> {entrevista.lead_nome ?? "—"}
                </div>
                <div>
                  <b>Empresa:</b> {entrevista.lead_empresa ?? "—"}
                </div>
                <div>
                  <b>E-mail:</b> {entrevista.lead_email ?? "—"}
                </div>
                <div>
                  <b>Pilar (criador):</b>{" "}
                  {entrevista.criador?.full_name || entrevista.criador?.email || "—"}
                </div>
                <div>
                  <b>Criada em:</b> {fmtDateTime(entrevista.created_at)}
                </div>
                <div>
                  <b>Respondida em:</b> {fmtDateTime(entrevista.respondida_em)}
                </div>
              </div>
              <div className="mb-2 mt-1 border-b-2 border-primary pb-1 text-[12px] font-bold">
                Respostas
              </div>
            </>
          ) : (
            <div className="mb-2 flex items-center justify-between border-b pb-1 text-[10px] text-muted-foreground">
              <div className="flex items-center gap-2">
                {logo ? <img src={logo} alt="" className="h-6 w-auto object-contain" /> : null}
                <span className="font-semibold text-foreground">{empresa}</span>
                <span>· {codigoDoc}</span>
              </div>
              <div>Entrevista nº {entrevista.codigo}</div>
            </div>
          )}

          <div className="flex-1 overflow-hidden">
            {chunk.length === 0 ? (
              <div className="italic text-muted-foreground">Sem respostas registradas.</div>
            ) : (
              chunk.map((r) => {
                const opts: string[] = Array.isArray(r.valor_options) ? r.valor_options : [];
                const hasText = !!(r.valor_text && String(r.valor_text).trim().length);
                const hasAny = opts.length > 0 || hasText;
                return (
                  <div
                    key={`${r.numero}-${r.pergunta_id}`}
                    className="interview-qblock mb-2 rounded border bg-muted/30 p-2"
                  >
                    <div className="mb-0.5 text-[9px] uppercase text-muted-foreground">
                      Pergunta {r.numero}
                    </div>
                    <div className="mb-1 font-bold">{r.enunciado}</div>
                    {opts.map((o, i) => (
                      <div key={i} className="pl-3">
                        • {o}
                      </div>
                    ))}
                    {hasText ? (
                      <div className="mt-1 whitespace-pre-wrap">{r.valor_text}</div>
                    ) : null}
                    {!hasAny ? (
                      <div className="italic text-muted-foreground">— não respondida —</div>
                    ) : null}
                    {r.descricao_extra ? (
                      <div className="mt-1 border-l-2 border-primary pl-2 text-[10px] text-muted-foreground">
                        Observação: {r.descricao_extra}
                      </div>
                    ) : null}
                  </div>
                );
              })
            )}
          </div>

          <div className="mt-2 flex items-center justify-between border-t pt-1 text-[10px] text-muted-foreground">
            <span>
              {empresa} · {codigoDoc}
            </span>
            <span className="font-semibold text-foreground">
              Pág. {idx + 1} de {total}
            </span>
          </div>

          <div className="interview-page-indicator pointer-events-none absolute right-3 top-3 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
            {idx + 1}/{total}
          </div>
        </div>
      ))}
    </div>
  );
}
