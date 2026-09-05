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
import { listHistoricoInsumos } from "@/lib/projeto-insumos.functions";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  History,
  FileSpreadsheet,
  Pencil,
  Trash2,
  Plus,
  Download,
  Send,
  Package,
  Rocket,
} from "lucide-react";

const TIPO_META: Record<string, { label: string; icon: any; tone: string }> = {
  import_excel: {
    label: "Import Excel",
    icon: FileSpreadsheet,
    tone: "bg-emerald-100 text-emerald-800",
  },
  export_excel: { label: "Download Excel", icon: Download, tone: "bg-sky-100 text-sky-800" },
  edicao_manual: { label: "Edição", icon: Pencil, tone: "bg-amber-100 text-amber-800" },
  exclusao: { label: "Exclusão", icon: Trash2, tone: "bg-rose-100 text-rose-800" },
  criacao: { label: "Criação", icon: Plus, tone: "bg-blue-100 text-blue-800" },
  envio_aprovacao: {
    label: "Envio p/ aprovação",
    icon: Send,
    tone: "bg-violet-100 text-violet-800",
  },
  estoque_alterado: { label: "Estoque", icon: Package, tone: "bg-teal-100 text-teal-800" },
  liberado_producao: {
    label: "Liberado produção",
    icon: Rocket,
    tone: "bg-fuchsia-100 text-fuchsia-800",
  },
};

export function HistoricoInsumosDrawer({
  open,
  onOpenChange,
  projetoId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  projetoId: string;
}) {
  const [filtroTipo, setFiltroTipo] = useState<string>("todos");

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["projeto-insumo-historico", projetoId, filtroTipo],
    queryFn: () =>
      listHistoricoInsumos({
        data: {
          projeto_id: projetoId,
          tipo: filtroTipo === "todos" ? null : filtroTipo,
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
            <History className="h-4 w-4" /> Histórico do projeto
          </SheetTitle>
          <SheetDescription>
            Importações, edições, estoque e aprovações registrados por usuário.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-3">
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
        </div>

        <div
          className="mt-4 space-y-2 overflow-y-auto pr-1"
          style={{ maxHeight: "calc(100vh - 200px)" }}
        >
          {isLoading && <p className="text-xs text-muted-foreground">Carregando...</p>}
          {!isLoading && rows.length === 0 && (
            <p className="text-xs italic text-muted-foreground">Sem registros ainda.</p>
          )}
          {(rows as any[]).map((r: any) => {
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
