import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Inbox, Loader2, MessageSquare, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { clienteTimelineQueryOptions } from "@/lib/clientes.queries";
import { addClienteInteracao } from "@/lib/clientes.functions";
import { Chip, EmptyState, FichaSection, fmtDateTime } from "./ficha-utils";

type TimelineFilter = "todos" | "manuais" | "oportunidades" | "processos" | "sistema";
const FILTER_LABEL: Record<TimelineFilter, string> = {
  todos: "Todos",
  manuais: "Interações",
  oportunidades: "Oportunidades",
  processos: "Processos",
  sistema: "Sistema",
};
const MANUAL_TIPOS = new Set(["nota", "ligacao", "reuniao", "email", "visita"]);
function bucketFor(tipo: string): Exclude<TimelineFilter, "todos"> {
  if (MANUAL_TIPOS.has(tipo)) return "manuais";
  if (tipo.startsWith("oportunidade")) return "oportunidades";
  if (tipo.startsWith("processo")) return "processos";
  return "sistema";
}
const TIPO_LABEL: Record<string, string> = {
  documento_anexado: "documento anexado",
  documento_removido: "documento removido",
  socio_adicionado: "sócio adicionado",
  socio_removido: "sócio removido",
  geocoded: "geocodificado",
};
type TipoInteracao = "nota" | "ligacao" | "reuniao" | "email" | "visita";

/** Aba Histórico: timeline com filtros e "Registrar interação" em popover. */
export function ClienteHistoricoTab({ clienteId }: { clienteId: string }) {
  const { data, isLoading } = useQuery(clienteTimelineQueryOptions(clienteId));
  const qc = useQueryClient();
  const [filter, setFilter] = useState<TimelineFilter>("todos");
  const [open, setOpen] = useState(false);
  const [tipo, setTipo] = useState<TipoInteracao>("nota");
  const [descricao, setDescricao] = useState("");

  const mut = useMutation({
    mutationFn: () =>
      addClienteInteracao({ data: { clienteId, tipo, descricao: descricao.trim() } }),
    onSuccess: () => {
      setDescricao("");
      setOpen(false);
      toast.success("Interação registrada.");
      qc.invalidateQueries({ queryKey: ["clientes", clienteId, "timeline"] });
      qc.invalidateQueries({ queryKey: ["clientes", "detail-codigo"] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Falha ao registrar."),
  });

  const items = data ?? [];
  const counts = items.reduce<Record<TimelineFilter, number>>(
    (acc, t) => {
      acc.todos += 1;
      acc[bucketFor(t.tipo)] += 1;
      return acc;
    },
    { todos: 0, manuais: 0, oportunidades: 0, processos: 0, sistema: 0 },
  );
  const filtered = filter === "todos" ? items : items.filter((t) => bucketFor(t.tipo) === filter);

  return (
    <FichaSection
      title="Histórico"
      action={
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button size="sm" className="h-8">
              <Plus className="h-3.5 w-3.5" /> Registrar interação
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 space-y-2">
            <Select value={tipo} onValueChange={(v) => setTipo(v as TipoInteracao)}>
              <SelectTrigger className="h-9 text-[12.5px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="nota">Nota</SelectItem>
                <SelectItem value="ligacao">Ligação</SelectItem>
                <SelectItem value="reuniao">Reunião</SelectItem>
                <SelectItem value="email">E-mail</SelectItem>
                <SelectItem value="visita">Visita</SelectItem>
              </SelectContent>
            </Select>
            <Textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              rows={3}
              placeholder="O que aconteceu?"
              className="text-[12.5px]"
              autoFocus
            />
            <Button
              size="sm"
              className="w-full"
              disabled={!descricao.trim() || mut.isPending}
              onClick={() => mut.mutate()}
            >
              {mut.isPending && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />}
              Registrar
            </Button>
          </PopoverContent>
        </Popover>
      }
    >
      {items.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 border-b border-border bg-muted/20 px-4 py-2">
          {(Object.keys(FILTER_LABEL) as TimelineFilter[])
            .filter((f) => f === "todos" || counts[f] > 0)
            .map((f) => (
              <Chip key={f} active={filter === f} onClick={() => setFilter(f)}>
                {FILTER_LABEL[f]} <span className="opacity-60">{counts[f]}</span>
              </Chip>
            ))}
        </div>
      )}
      {isLoading ? (
        <div className="p-4 text-[12px] text-muted-foreground">Carregando…</div>
      ) : items.length === 0 ? (
        <EmptyState icon={Inbox} title="Sem atividades" hint="Registre a primeira interação." />
      ) : filtered.length === 0 ? (
        <EmptyState icon={Inbox} title="Nada neste filtro" />
      ) : (
        <ol className="relative ml-5 space-y-4 border-l border-border py-4 pl-6 pr-4">
          {filtered.map((t) => (
            <li key={t.id} className="relative">
              <span className="absolute -left-[33px] grid h-6 w-6 place-items-center rounded-full bg-blue-100 text-blue-700 ring-4 ring-card">
                <MessageSquare className="h-3 w-3" />
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[13px] font-semibold">{t.titulo}</span>
                <Badge variant="outline" className="text-[10px] capitalize">
                  {TIPO_LABEL[t.tipo] ?? t.tipo.replace("_", " ")}
                </Badge>
                <span className="ml-auto text-[11px] text-muted-foreground">
                  {fmtDateTime(t.ts)}
                  {t.user_nome ? ` · ${t.user_nome}` : ""}
                </span>
              </div>
              {t.descricao && (
                <p className="mt-0.5 text-[12px] text-muted-foreground">{t.descricao}</p>
              )}
            </li>
          ))}
        </ol>
      )}
    </FichaSection>
  );
}
