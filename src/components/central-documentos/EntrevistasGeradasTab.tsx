import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Copy, ExternalLink, FileDown, Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { listEntrevistaDocumentosGerados } from "@/lib/entrevistas-docs.functions";

const IDIOMA_FLAG: Record<string, string> = { pt: "🇧🇷", es: "🇪🇸", en: "🇺🇸" };

export function EntrevistasGeradasTab() {
  const listFn = useServerFn(listEntrevistaDocumentosGerados);
  const [q, setQ] = useState("");

  const query = useQuery({
    queryKey: ["central-docs", "entrevistas-gerados", q],
    queryFn: () => listFn({ data: { q, limit: 200 } }),
  });

  const rows = useMemo(() => query.data ?? [], [query.data]);

  const copy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copiado.");
    } catch {
      toast.error("Não foi possível copiar.");
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="relative w-full max-w-md">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-zinc-400" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por código, lead, empresa ou segmento…"
            className="pl-8"
          />
        </div>
        <div className="text-xs text-zinc-500">
          {query.isFetching ? (
            <span className="inline-flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" /> carregando…
            </span>
          ) : (
            `${rows.length} documento(s)`
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-[var(--bg-border)] bg-[var(--bg-surface)]">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-zinc-600">
            <tr className="text-left">
              <th className="px-3 py-2 font-medium">Data</th>
              <th className="px-3 py-2 font-medium">Entrevista</th>
              <th className="px-3 py-2 font-medium">Segmento</th>
              <th className="px-3 py-2 font-medium">Lead</th>
              <th className="px-3 py-2 font-medium text-center">Idioma</th>
              <th className="px-3 py-2 font-medium text-right">Arquivo</th>
              <th className="px-3 py-2 font-medium text-right">Pasta</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && !query.isLoading ? (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-zinc-500">
                  Nenhum PDF de entrevista arquivado ainda. Use “Arquivar no Drive” no card da
                  entrevista respondida.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-t border-[var(--bg-border)] hover:bg-zinc-50/60">
                  <td className="px-3 py-2 whitespace-nowrap text-zinc-700">
                    {new Date(r.criado_em).toLocaleString("pt-BR", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </td>
                  <td className="px-3 py-2">
                    <Badge variant="outline" className="font-mono text-[10px]">
                      ENT-{r.codigo}
                    </Badge>
                  </td>
                  <td className="px-3 py-2 text-zinc-700">{r.segmento}</td>
                  <td className="px-3 py-2">
                    <div className="max-w-[240px]">
                      <div className="truncate text-zinc-800">{r.lead_nome || "—"}</div>
                      {r.lead_empresa && (
                        <div className="truncate text-[11px] text-zinc-500">{r.lead_empresa}</div>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-center">{IDIOMA_FLAG[r.idioma] ?? r.idioma}</td>
                  <td className="px-3 py-2 text-right">
                    {r.drive_view_url ? (
                      <div className="inline-flex items-center gap-0.5">
                        <Button
                          asChild
                          size="sm"
                          variant="ghost"
                          className="h-7 px-1.5 text-emerald-700 hover:bg-emerald-50"
                          title={r.file_name ?? undefined}
                        >
                          <a href={r.drive_view_url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-zinc-500 hover:bg-zinc-100"
                          title="Copiar link"
                          onClick={() => copy(r.drive_view_url!)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <span className="text-zinc-300">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {r.drive_folder_url ? (
                      <Button asChild size="sm" variant="ghost" className="h-7 px-2 text-zinc-600">
                        <a href={r.drive_folder_url} target="_blank" rel="noopener noreferrer">
                          <FileDown className="mr-1 h-3 w-3" /> Drive
                        </a>
                      </Button>
                    ) : (
                      <span className="text-zinc-300">—</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
