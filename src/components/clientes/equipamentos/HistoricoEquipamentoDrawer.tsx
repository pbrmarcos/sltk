import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { listHistoricoEquipamento } from "@/lib/equipamento-import.functions";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  History,
  FileSpreadsheet,
  Pencil,
  Trash2,
  Plus,
  ArrowUpDown,
  Download,
} from "lucide-react";

const TIPO_META: Record<string, { label: string; icon: any; tone: string }> = {
  import_excel: {
    label: "Import Excel",
    icon: FileSpreadsheet,
    tone: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
  },
  export_excel: {
    label: "Download Excel",
    icon: Download,
    tone: "bg-sky-100 text-sky-800 dark:bg-sky-950/40 dark:text-sky-300",
  },
  edicao_manual: {
    label: "Edição",
    icon: Pencil,
    tone: "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
  },
  exclusao: {
    label: "Exclusão",
    icon: Trash2,
    tone: "bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300",
  },
  criacao: {
    label: "Criação",
    icon: Plus,
    tone: "bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300",
  },
  reordenacao: {
    label: "Reordem",
    icon: ArrowUpDown,
    tone: "bg-[var(--badge-neutral-bg)] text-[var(--badge-neutral-fg)]",
  },
};

export function HistoricoEquipamentoDrawer({
  open,
  onOpenChange,
  equipamentoId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  equipamentoId: string;
}) {
  const [filtroTipo, setFiltroTipo] = useState<string>("todos");
  const [filtroDisc, setFiltroDisc] = useState<string>("todas");

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["eq-historico", equipamentoId, filtroTipo, filtroDisc],
    queryFn: () =>
      listHistoricoEquipamento({
        data: {
          equipamentoId,
          tipo: filtroTipo === "todos" ? null : filtroTipo,
          disciplina: filtroDisc === "todas" ? null : filtroDisc,
          limit: 200,
        },
      }),
    enabled: open,
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <History className="h-4 w-4" /> Histórico do equipamento
          </SheetTitle>
          <SheetDescription>
            Importações, edições e alterações registradas por usuário.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-3 flex gap-2">
          <Select value={filtroTipo} onValueChange={setFiltroTipo}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os tipos</SelectItem>
              {Object.entries(TIPO_META).map(([k, m]) => (
                <SelectItem key={k} value={k}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filtroDisc} onValueChange={setFiltroDisc}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas disciplinas</SelectItem>
              {["engenharia", "automacao", "planejamento", "producao", "qualidade"].map((d) => (
                <SelectItem key={d} value={d}>
                  {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div
          className="mt-4 space-y-2 overflow-y-auto pr-1"
          style={{ maxHeight: "calc(100vh - 200px)" }}
        >
          {isLoading && <p className="text-xs text-muted-foreground">Carregando...</p>}
          {!isLoading && rows.length === 0 && (
            <p className="text-xs italic text-muted-foreground">Sem registros ainda.</p>
          )}
          {rows.map((r: any) => {
            const meta = TIPO_META[r.tipo] ?? {
              label: r.tipo,
              icon: Pencil,
              tone: "bg-[var(--badge-neutral-bg)]",
            };
            const Icon = meta.icon;
            return (
              <div key={r.id} className="rounded-md border p-2 text-xs">
                <div className="flex items-center gap-2">
                  <Badge className={meta.tone} variant="secondary">
                    <Icon className="mr-1 h-3 w-3" /> {meta.label}
                  </Badge>
                  {r.disciplina && (
                    <span className="rounded bg-muted px-1.5 py-0.5 text-[10px]">
                      {r.disciplina}
                    </span>
                  )}
                  <span className="ml-auto text-[10px] text-muted-foreground">
                    {formatDistanceToNow(new Date(r.created_at), { addSuffix: true, locale: ptBR })}
                  </span>
                </div>
                <p className="mt-1 font-medium">{r.descricao}</p>
                <div className="mt-1 flex items-center justify-between text-[10.5px] text-muted-foreground">
                  <span>{r.user_nome ?? "—"}</span>
                  <span>{new Date(r.created_at).toLocaleString("pt-BR")}</span>
                </div>
                {r.arquivo_nome && (
                  <p className="mt-1 text-[10.5px] text-muted-foreground">📎 {r.arquivo_nome}</p>
                )}
              </div>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}
