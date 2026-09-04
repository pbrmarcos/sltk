import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Copy, ExternalLink, FileDown, Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { listRfqDocumentosGerados } from "@/lib/compras-rfq-docs.functions";

type Idioma = "pt" | "es" | "en";
const IDIOMA_FLAG: Record<Idioma, string> = { pt: "🇧🇷", es: "🇪🇸", en: "🇺🇸" };
const IDIOMA_LABEL: Record<Idioma, string> = { pt: "PT", es: "ES", en: "EN" };

async function copy(url: string, lang: Idioma) {
  try {
    await navigator.clipboard.writeText(url);
    toast.success(`Link ${IDIOMA_LABEL[lang]} copiado.`);
  } catch {
    toast.error("Não foi possível copiar.");
  }
}

export function RfqGeradosTab() {
  const listFn = useServerFn(listRfqDocumentosGerados);
  const [q, setQ] = useState("");

  const query = useQuery({
    queryKey: ["central-docs", "rfq-gerados", q],
    queryFn: () => listFn({ data: { q, limit: 200 } }),
  });

  const rows = useMemo(() => query.data ?? [], [query.data]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="relative w-full max-w-md">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-zinc-400" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por fornecedor, insumo, código ou arquivo…"
            className="pl-8"
          />
        </div>
        <div className="text-xs text-zinc-500">
          {query.isFetching ? (
            <span className="inline-flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" /> carregando…
            </span>
          ) : (
            `${rows.length} geração(ões)`
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-[var(--bg-border)] bg-[var(--bg-surface)]">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-zinc-600">
            <tr className="text-left">
              <th className="px-3 py-2 font-medium">Data</th>
              <th className="px-3 py-2 font-medium">Fornecedor</th>
              <th className="px-3 py-2 font-medium">Insumo</th>
              <th className="px-3 py-2 font-medium">Projeto</th>
              <th className="px-3 py-2 font-medium text-center">PT</th>
              <th className="px-3 py-2 font-medium text-center">ES</th>
              <th className="px-3 py-2 font-medium text-center">EN</th>
              <th className="px-3 py-2 font-medium text-right">Pasta</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && !query.isLoading ? (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-zinc-500">
                  Nenhum documento Checklist gerado ainda.
                </td>
              </tr>
            ) : (
              rows.map((g) => (
                <tr key={g.key} className="border-t border-[var(--bg-border)] hover:bg-zinc-50/60">
                  <td className="px-3 py-2 whitespace-nowrap text-zinc-700">
                    {new Date(g.criado_em).toLocaleString("pt-BR", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </td>
                  <td className="px-3 py-2">
                    {g.fornecedor_nome ? (
                      <span className="font-medium text-zinc-800">{g.fornecedor_nome}</span>
                    ) : (
                      <span className="text-zinc-400">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <div className="max-w-[280px]">
                      <div className="truncate text-zinc-800">{g.insumo_descricao}</div>
                      {g.insumo_codigo && (
                        <div className="text-[11px] text-zinc-500">{g.insumo_codigo}</div>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    {g.projeto_codigo ? (
                      <Badge variant="outline" className="font-mono text-[10px]">
                        {g.projeto_codigo}
                      </Badge>
                    ) : (
                      <span className="text-zinc-400">—</span>
                    )}
                  </td>
                  {(["pt", "es", "en"] as Idioma[]).map((l) => {
                    const item = g.idiomas[l];
                    return (
                      <td key={l} className="px-2 py-2 text-center">
                        {item?.url ? (
                          <div className="inline-flex items-center gap-0.5">
                            <Button
                              asChild
                              size="sm"
                              variant="ghost"
                              className="h-7 px-1.5 text-emerald-700 hover:bg-emerald-50"
                              title={item.file_name ?? undefined}
                            >
                              <a href={item.url} target="_blank" rel="noopener noreferrer">
                                <span className="mr-1">{IDIOMA_FLAG[l]}</span>
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0 text-zinc-500 hover:bg-zinc-100"
                              title={`Copiar link ${IDIOMA_LABEL[l]}`}
                              onClick={() => copy(item.url!, l)}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <span className="text-zinc-300">—</span>
                        )}
                      </td>
                    );
                  })}
                  <td className="px-3 py-2 text-right">
                    {g.drive_folder_url ? (
                      <Button
                        asChild
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-zinc-600"
                      >
                        <a href={g.drive_folder_url} target="_blank" rel="noopener noreferrer">
                          <FileDown className="mr-1 h-3 w-3" />
                          Drive
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
