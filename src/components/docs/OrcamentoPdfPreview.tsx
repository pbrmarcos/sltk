/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useState } from "react";
import type { Bloco, DocumentoLayoutConfig, Idioma, OrcamentoPayload } from "@/lib/docs/types";
import { Loader2 } from "lucide-react";

type Props = {
  codigo: string;
  versao: string;
  idioma: Idioma;
  payload: OrcamentoPayload;
  blocos: Bloco[];
  layout: DocumentoLayoutConfig | null;
};

/**
 * Prévia interativa do PDF — renderiza no cliente via @react-pdf/renderer.
 * Faz debounce de 600ms e expõe contador de páginas.
 */
export function OrcamentoPdfPreview({ codigo, versao, idioma, payload, blocos, layout }: Props) {
  const [url, setUrl] = useState<string | null>(null);
  const [pages, setPages] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastUrl = useRef<string | null>(null);

  useEffect(() => {
    if (!layout) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      setBusy(true);
      setErr(null);
      try {
        const [{ pdf }, { OrcamentoPdf }] = await Promise.all([
          import("@react-pdf/renderer"),
          import("@/lib/docs/pdf-document"),
        ]);
        const doc = (
          <OrcamentoPdf
            codigo={codigo}
            versao={versao}
            idioma={idioma}
            data={new Date()}
            payload={payload}
            blocos={blocos}
            layout={layout}
          />
        );
        const blob = await pdf(doc as any).toBlob();
        const newUrl = URL.createObjectURL(blob);
        if (lastUrl.current) URL.revokeObjectURL(lastUrl.current);
        lastUrl.current = newUrl;
        setUrl(newUrl);
        // contagem de páginas
        try {
          const ab = await blob.arrayBuffer();
          const txt = new TextDecoder("latin1").decode(new Uint8Array(ab));
          const m = txt.match(/\/Type\s*\/Page[^s]/g);
          setPages(m ? m.length : null);
        } catch {
          setPages(null);
        }
      } catch (e) {
        setErr((e as Error).message);
      } finally {
        setBusy(false);
      }
    }, 600);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [codigo, versao, idioma, payload, blocos, layout]);

  useEffect(() => () => { if (lastUrl.current) URL.revokeObjectURL(lastUrl.current); }, []);

  if (!layout) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-sm text-[var(--text-muted)]">
        Layout não configurado.
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-[var(--bg-border)] bg-[var(--bg-surface)] px-3 py-2 text-xs">
        <div className="flex items-center gap-2 text-[var(--text-muted)]">
          {busy ? (
            <><Loader2 className="h-3 w-3 animate-spin" /> Renderizando…</>
          ) : err ? (
            <span className="text-rose-600">Erro: {err}</span>
          ) : (
            <>
              <span className="font-mono">{codigo}</span> · v{versao} · {idioma.toUpperCase()}
              {pages != null && <span className="ml-2">· {pages} página{pages === 1 ? "" : "s"}</span>}
            </>
          )}
        </div>
      </div>
      <div className="flex-1 bg-neutral-100">
        {url ? (
          <object data={url} type="application/pdf" className="h-full w-full">
            <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-center text-sm text-[var(--text-muted)]">
              <p>O navegador bloqueou a prévia incorporada do PDF.</p>
              <a href={url} target="_blank" rel="noreferrer" className="text-[var(--accent)] underline">
                Abrir prévia em nova aba
              </a>
            </div>
          </object>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-[var(--text-muted)]">
            Aguardando primeira renderização…
          </div>
        )}
      </div>
    </div>
  );
}
