import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  History,
  MessageCircle,
  Send,
  FilePlus2,
  FileMinus2,
  Pencil,
  Sparkles,
  DollarSign,
  RefreshCw,
  ArrowUpDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  listInsumoAtividades,
  addInsumoComentario,
} from "@/lib/insumo-anexos.functions";

type Props = { insumoId: string };
type FilterKey = "todos" | "status" | "campos" | "arquivos";

type TipoMap = {
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  label: string;
};

const TIPOS: Record<string, TipoMap> = {
  criado: { icon: Sparkles, color: "text-emerald-600 bg-emerald-50 border-emerald-200", label: "Criado" },
  editado: { icon: Pencil, color: "text-blue-600 bg-blue-50 border-blue-200", label: "Editado" },
  status_alterado: { icon: RefreshCw, color: "text-amber-600 bg-amber-50 border-amber-200", label: "Status" },
  anexo_adicionado: { icon: FilePlus2, color: "text-purple-600 bg-purple-50 border-purple-200", label: "Anexo" },
  anexo_removido: { icon: FileMinus2, color: "text-red-600 bg-red-50 border-red-200", label: "Removido" },
  orcamento_recebido: { icon: DollarSign, color: "text-emerald-700 bg-emerald-50 border-emerald-200", label: "Orçamento" },
  comentario: { icon: MessageCircle, color: "text-zinc-700 bg-zinc-50 border-zinc-200", label: "Comentário" },
};

const FIELD_LABEL: Record<string, string> = {
  descricao: "Descrição",
  quantidade: "Quantidade",
  unidade: "Unidade",
  fabricante_sugerido: "Fabricante",
  part_number: "Part Number",
  codigo_interno: "Código interno",
  criticidade: "Criticidade",
  lead_time_desejado_dias: "Lead time",
  necessidade_em: "Necessidade em",
  observacoes: "Observações",
  especificacao_tecnica: "Especificação técnica",
};

const FILTER_TIPOS: Record<FilterKey, (t: string) => boolean> = {
  todos: () => true,
  status: (t) => t === "status_alterado",
  campos: (t) => t === "editado" || t === "criado",
  arquivos: (t) => t === "anexo_adicionado" || t === "anexo_removido" || t === "orcamento_recebido" || t === "comentario",
};

export function InsumoHistoricoPanel({ insumoId }: Props) {
  const qc = useQueryClient();
  const listFn = useServerFn(listInsumoAtividades);
  const addFn = useServerFn(addInsumoComentario);
  const [comentario, setComentario] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [filter, setFilter] = useState<FilterKey>("todos");
  const [ascending, setAscending] = useState(false);
  const [erroComentario, setErroComentario] = useState<string | null>(null);

  const q = useQuery({
    queryKey: ["insumo-atividades", insumoId],
    queryFn: () => listFn({ data: { insumo_id: insumoId, limit: 200 } }),
  });

  async function enviar() {
    const texto = comentario.trim();
    if (texto.length < 3) {
      setErroComentario("Escreva ao menos 3 caracteres.");
      return;
    }
    if (texto.length > 2000) {
      setErroComentario("Máximo de 2000 caracteres.");
      return;
    }
    setErroComentario(null);
    setEnviando(true);
    try {
      await addFn({ data: { insumo_id: insumoId, texto } });
      setComentario("");
      await qc.invalidateQueries({ queryKey: ["insumo-atividades", insumoId] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao comentar.");
    } finally {
      setEnviando(false);
    }
  }

  const rowsAll = (q.data ?? []) as any[];

  const counts = useMemo(() => {
    return {
      todos: rowsAll.length,
      status: rowsAll.filter((r) => FILTER_TIPOS.status(r.tipo)).length,
      campos: rowsAll.filter((r) => FILTER_TIPOS.campos(r.tipo)).length,
      arquivos: rowsAll.filter((r) => FILTER_TIPOS.arquivos(r.tipo)).length,
    };
  }, [rowsAll]);

  const rows = useMemo(() => {
    const filtered = rowsAll.filter((r) => FILTER_TIPOS[filter](r.tipo));
    const sorted = [...filtered].sort((a, b) => {
      const ta = new Date(a.criado_em).getTime();
      const tb = new Date(b.criado_em).getTime();
      return ascending ? ta - tb : tb - ta;
    });
    return sorted;
  }, [rowsAll, filter, ascending]);

  const FILTERS: Array<{ key: FilterKey; label: string }> = [
    { key: "todos", label: "Tudo" },
    { key: "status", label: "Status" },
    { key: "campos", label: "Campos" },
    { key: "arquivos", label: "Anexos & comentários" },
  ];

  return (
    <div className="space-y-3">
      <div className="rounded-md border border-zinc-200 bg-zinc-50/60 p-3 space-y-2">
        <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-700">
          <MessageCircle className="h-3.5 w-3.5" />
          Novo comentário
        </div>
        <Textarea
          rows={2}
          placeholder="Registre uma nota, decisão ou próximo passo…"
          value={comentario}
          onChange={(e) => {
            setComentario(e.target.value);
            if (erroComentario) setErroComentario(null);
          }}
          className={cn("text-xs bg-white", erroComentario && "border-red-400 focus-visible:ring-red-300")}
          aria-invalid={!!erroComentario}
          maxLength={2000}
        />
        <div className="flex items-center justify-between">
          <span className={cn("text-[11px]", erroComentario ? "text-red-600" : "text-zinc-400")}>
            {erroComentario ?? `${comentario.length}/2000`}
          </span>
          <Button size="sm" onClick={enviar} disabled={enviando}>
            <Send className="mr-1.5 h-3.5 w-3.5" />
            Registrar
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={cn(
              "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] transition-colors",
              filter === f.key
                ? "bg-zinc-900 border-zinc-900 text-white"
                : "bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50",
            )}
          >
            {f.label}
            <span
              className={cn(
                "rounded-full px-1.5 text-[10px]",
                filter === f.key ? "bg-white/20" : "bg-zinc-100 text-zinc-500",
              )}
            >
              {counts[f.key]}
            </span>
          </button>
        ))}
        <Button
          size="sm"
          variant="ghost"
          className="ml-auto h-7 text-[11px] text-zinc-600"
          onClick={() => setAscending((v) => !v)}
        >
          <ArrowUpDown className="mr-1 h-3 w-3" />
          {ascending ? "Mais antigo primeiro" : "Mais recente primeiro"}
        </Button>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-700">
          <History className="h-3.5 w-3.5" />
          Linha do tempo
          <span className="text-zinc-400 font-normal">({rows.length})</span>
        </div>
        {rows.length === 0 ? (
          <div className="text-[11px] text-zinc-400 italic border border-dashed border-zinc-200 rounded p-3">
            Nenhuma atividade nesse filtro.
          </div>
        ) : (
          <ol className="relative border-l border-zinc-200 ml-2 space-y-2 py-1">
            {rows.map((r) => {
              const cfg = TIPOS[r.tipo] ?? {
                icon: History,
                color: "text-zinc-600 bg-zinc-50 border-zinc-200",
                label: r.tipo,
              };
              const Icon = cfg.icon;
              return (
                <li key={r.id} className="ml-4">
                  <span
                    className={cn(
                      "absolute -left-[9px] flex h-4 w-4 items-center justify-center rounded-full border bg-white",
                      cfg.color,
                    )}
                  >
                    <Icon className="h-2.5 w-2.5" />
                  </span>
                  <div className="rounded border border-zinc-200 bg-white p-2 text-xs">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge variant="outline" className={cn("font-normal", cfg.color)}>
                        {cfg.label}
                      </Badge>
                      <span className="text-zinc-500">{r.actor_nome ?? "Sistema"}</span>
                      <span className="text-zinc-400">·</span>
                      <span className="text-zinc-400">
                        {new Date(r.criado_em).toLocaleString("pt-BR")}
                      </span>
                    </div>
                    <div className="text-zinc-800 mt-1 whitespace-pre-wrap">
                      {r.descricao}
                    </div>
                    {r.tipo === "editado" && r.meta && typeof r.meta === "object" && (
                      <div className="mt-1.5 grid grid-cols-1 md:grid-cols-2 gap-1">
                        {Object.entries(r.meta).map(([k, v]) => {
                          if (!Array.isArray(v)) return null;
                          const [a, b] = v as [unknown, unknown];
                          return (
                            <div
                              key={k}
                              className="rounded bg-zinc-50 border border-zinc-100 px-1.5 py-1 text-[10px]"
                            >
                              <span className="text-zinc-500">
                                {FIELD_LABEL[k] ?? k}:{" "}
                              </span>
                              <span className="line-through text-red-600/70">
                                {String(a ?? "—")}
                              </span>
                              <span className="mx-1 text-zinc-400">→</span>
                              <span className="text-emerald-700">
                                {String(b ?? "—")}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </div>
  );
}
