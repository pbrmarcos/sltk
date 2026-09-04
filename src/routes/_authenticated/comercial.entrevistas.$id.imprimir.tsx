/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getEntrevista } from "@/lib/entrevistas.functions";
import { useBrandSettings } from "@/hooks/use-brand-settings";
import { Button } from "@/components/ui/button";
import { Printer, X } from "lucide-react";

export const Route = createFileRoute("/_authenticated/comercial/entrevistas/$id/imprimir")({
  component: ImprimirEntrevistaPage,
  head: () => ({
    meta: [{ title: "Prévia da entrevista — SLTK Americas" }],
  }),
});

function fmtDate(s?: string | null) {
  if (!s) return "—";
  try { return new Date(s).toLocaleString("pt-BR"); } catch { return "—"; }
}

function ImprimirEntrevistaPage() {
  const { id } = Route.useParams();
  const getFn = useServerFn(getEntrevista);
  const brand = useBrandSettings();
  const q = useQuery({ queryKey: ["entrevistas", "imprimir", id], queryFn: () => getFn({ data: { id } }) });

  if (q.isLoading || !q.data) {
    return <div className="min-h-screen flex items-center justify-center bg-neutral-200 text-neutral-700">Carregando prévia…</div>;
  }
  const e: any = q.data;
  const respostas: any[] = e.respostas ?? [];
  const logo = brand?.settings?.logo_url || brand?.settings?.logo_url_dark || null;
  const empresa = brand?.settings?.system_name || "SLTK Americas";
  const codigoDoc = `ENT-${e.codigo}`;

  return (
    <div className="min-h-screen bg-neutral-300 pb-16">
      <style>{`
        @page { size: A4; margin: 12mm; }
        @media print {
          html, body { background: white !important; }
          .no-print { display: none !important; }
          .a4-sheet {
            box-shadow: none !important;
            margin: 0 !important;
            width: auto !important;
            min-height: 0 !important;
            padding: 0 !important;
            page-break-after: auto;
          }
          .a4-wrap { padding: 0 !important; background: white !important; }
        }
        .a4-sheet {
          width: 210mm;
          min-height: 297mm;
          padding: 12mm;
          margin: 16px auto;
          background: white;
          box-shadow: 0 2px 12px rgba(0,0,0,0.15);
          color: #111827;
          font-family: Arial, Helvetica, sans-serif;
          font-size: 11px;
          line-height: 1.4;
        }
        .a4-sheet h1 { font-size: 22px; font-weight: bold; line-height: 1.1; margin: 0; }
        .bar { background: #d9d9d9; padding: 4px 8px; font-weight: bold; text-align: center; font-size: 13px; }
        .bar-sub { background: #e8e8e8; padding: 3px 8px; text-align: center; font-weight: 600; }
        .accent { border-bottom: 2px solid #0B3D91; padding-bottom: 3px; margin-top: 14px; margin-bottom: 8px; font-weight: bold; font-size: 12px; }
        .qblock {
          border: 1px solid #ccc; border-radius: 3px; padding: 8px;
          margin-bottom: 8px; background: #fafafa;
          break-inside: avoid; page-break-inside: avoid;
        }
      `}</style>

      {/* TOOLBAR (não imprime) */}
      <div className="no-print sticky top-0 z-10 border-b border-neutral-400/60 bg-neutral-800 text-white">
        <div className="mx-auto flex max-w-[210mm] items-center justify-between px-4 py-2">
          <div className="text-sm">
            <span className="font-semibold">{codigoDoc}</span>
            <span className="mx-2 opacity-60">·</span>
            <span className="opacity-80">Prévia da entrevista — quebra de páginas simulada</span>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="secondary" onClick={() => window.close()}>
              <X className="mr-1 h-4 w-4" /> Fechar
            </Button>
            <Button size="sm" onClick={() => window.print()}>
              <Printer className="mr-1 h-4 w-4" /> Imprimir / Salvar PDF
            </Button>
          </div>
        </div>
      </div>

      <div className="a4-wrap">
        <div className="a4-sheet">
          {/* HEADER */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-start gap-3 flex-1">
              {logo && <img src={logo} alt="Logo" style={{ height: 56, width: "auto", objectFit: "contain" }} />}
              <div>
                <h1>Entrevista Técnica</h1>
                <div style={{ marginTop: 4 }}>
                  <div style={{ fontWeight: "bold" }}>{empresa}</div>
                  <div>Respostas do lead · {e.segmento?.nome_pt ?? "—"}</div>
                </div>
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontWeight: "bold", fontSize: 13 }}>{codigoDoc}</div>
              <div>Emissão: {fmtDate(new Date().toISOString())}</div>
              <div>Respondida: {fmtDate(e.respondida_em)}</div>
            </div>
          </div>

          <div className="bar" style={{ marginBottom: 8 }}>Entrevista nº {e.codigo}</div>

          <div className="bar-sub" style={{ marginBottom: 4 }}>Identificação</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2px 16px", marginBottom: 12 }}>
            <div><b>Código:</b> #{e.codigo}</div>
            <div><b>Segmento:</b> {e.segmento?.nome_pt ?? "—"}</div>
            <div><b>Lead:</b> {e.lead_nome ?? "—"}</div>
            <div><b>Empresa:</b> {e.lead_empresa ?? "—"}</div>
            <div><b>E-mail:</b> {e.lead_email ?? "—"}</div>
            <div><b>Pilar (criador):</b> {e.criador?.full_name || e.criador?.email || "—"}</div>
            <div><b>Criada em:</b> {fmtDate(e.created_at)}</div>
            <div><b>Respondida em:</b> {fmtDate(e.respondida_em)}</div>
          </div>

          <div className="accent">Respostas</div>
          {respostas.length === 0 ? (
            <div style={{ fontStyle: "italic", color: "#6B7280" }}>Sem respostas registradas.</div>
          ) : (
            respostas.map((r) => {
              const opts: string[] = Array.isArray(r.valor_options) ? r.valor_options : [];
              const hasText = !!(r.valor_text && String(r.valor_text).trim().length);
              const hasAny = opts.length > 0 || hasText;
              return (
                <div key={`${r.numero}-${r.pergunta_id}`} className="qblock">
                  <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: 0.4, color: "#6B7280", marginBottom: 2 }}>
                    Pergunta {r.numero}
                  </div>
                  <div style={{ fontWeight: "bold", marginBottom: 4 }}>{r.enunciado}</div>
                  {opts.map((o, i) => (
                    <div key={i} style={{ paddingLeft: 12 }}>• {o}</div>
                  ))}
                  {hasText && <div style={{ marginTop: 4 }}>{r.valor_text}</div>}
                  {!hasAny && <div style={{ fontStyle: "italic", color: "#6B7280" }}>— não respondida —</div>}
                  {r.descricao_extra ? (
                    <div style={{ marginTop: 6, paddingLeft: 8, borderLeft: "2px solid #0B3D91", fontSize: 10, color: "#374151" }}>
                      Observação: {r.descricao_extra}
                    </div>
                  ) : null}
                </div>
              );
            })
          )}

          <div style={{ textAlign: "center", fontSize: 10, marginTop: 24, borderTop: "1px solid #000", paddingTop: 4 }}>
            {empresa} · {codigoDoc}
          </div>
        </div>
      </div>
    </div>
  );
}
