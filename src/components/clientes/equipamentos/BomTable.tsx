import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Plus, Send, Check, X as XIcon, Trash2, ShoppingCart } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  listEquipamentoBom,
  createBomItem,
  updateBomItem,
  deleteBomItem,
  submitBomForApproval,
  approveBomItem,
  rejectBomItem,
} from "@/lib/equipamento-bom.functions";
import { type Disciplina } from "@/lib/equipamento-disciplina-etapas.functions";
import {
  INSUMO_STATUS_LABEL,
  INSUMO_STATUS_COLOR,
  INSUMO_CRITICIDADE_LABEL,
  INSUMO_CRITICIDADE_COLOR,
} from "@/lib/projeto-insumos.shared";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

type BomRow = {
  id: string;
  equipamento_id: string;
  equipamento_disciplina: string | null;
  disciplina: string;
  descricao: string;
  quantidade: number;
  unidade: string;
  criticidade: "baixa" | "media" | "alta" | "critica";
  status: string;
  custo_unitario_estimado: number | null;
  custo_total_estimado: number | null;
  ordem_compra: { id: string; numero: string | null; status: string } | null;
};

export function BomTable({
  equipamentoId,
  equipamentoDisciplina,
}: {
  equipamentoId: string;
  equipamentoDisciplina: Disciplina;
}) {
  const qc = useQueryClient();
  const auth = useAuth();
  const isManager = auth.role === "admin" || auth.role === "manager";

  const queryKey = ["eq-bom", equipamentoId, equipamentoDisciplina];
  const { data: rows = [], isLoading } = useQuery({
    queryKey,
    queryFn: () =>
      listEquipamentoBom({ data: { equipamento_id: equipamentoId, disciplina: equipamentoDisciplina } }),
  });

  const [novo, setNovo] = useState<{ desc: string; qtd: number; un: string; custo: string }>({
    desc: "",
    qtd: 1,
    un: "un",
    custo: "",
  });

  const invalidate = () => qc.invalidateQueries({ queryKey });

  const createMut = useMutation({
    mutationFn: (p: {
      descricao: string;
      quantidade: number;
      unidade: string;
      custo_unitario_estimado?: number | null;
    }) =>
      createBomItem({
        data: {
          equipamento_id: equipamentoId,
          equipamento_disciplina: equipamentoDisciplina,
          disciplina:
            equipamentoDisciplina === "engenharia"
              ? "mecanico"
              : equipamentoDisciplina === "producao"
                ? "automacao"
                : "outro",
          ...p,
        },
      }),
    onSuccess: () => {
      invalidate();
      setNovo({ desc: "", qtd: 1, un: "un", custo: "" });
    },
    onError: (e: any) => toast.error(e?.message ?? "Falha ao criar item"),
  });

  const updateMut = useMutation({
    mutationFn: (p: { id: string; [k: string]: any }) => updateBomItem({ data: p as any }),
    onSuccess: invalidate,
  });
  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteBomItem({ data: { id } }),
    onSuccess: invalidate,
  });
  const submitMut = useMutation({
    mutationFn: () =>
      submitBomForApproval({
        data: { equipamento_id: equipamentoId, equipamento_disciplina: equipamentoDisciplina },
      }),
    onSuccess: (r: any) => {
      invalidate();
      toast.success(`${r.count ?? 0} item(ns) enviado(s) para aprovação`);
    },
    onError: (e: any) => toast.error(e?.message ?? "Falha ao enviar"),
  });
  const approveMut = useMutation({
    mutationFn: (id: string) => approveBomItem({ data: { id } }),
    onSuccess: invalidate,
    onError: (e: any) => toast.error(e?.message ?? "Sem permissão"),
  });
  const rejectMut = useMutation({
    mutationFn: (id: string) => rejectBomItem({ data: { id } }),
    onSuccess: invalidate,
    onError: (e: any) => toast.error(e?.message ?? "Sem permissão"),
  });

  const totalRascunhos = useMemo(
    () => (rows as BomRow[]).filter((r) => r.status === "rascunho").length,
    [rows],
  );
  const totalPendentes = useMemo(
    () => (rows as BomRow[]).filter((r) => r.status === "pronto_aprovacao").length,
    [rows],
  );

  const custoTotal = useMemo(
    () =>
      (rows as BomRow[]).reduce((acc, r) => {
        const c = r.custo_total_estimado ?? (r.custo_unitario_estimado ?? 0) * (r.quantidade ?? 1);
        return acc + (Number(c) || 0);
      }, 0),
    [rows],
  );

  return (
    <div className="rounded-md border border-border/60 bg-card/50">
      <div className="flex items-center justify-between border-b border-border/60 px-3 py-2">
        <div>
          <h3 className="text-sm font-semibold">Insumos & Materiais</h3>
          <p className="text-[11px] text-muted-foreground">
            {(rows as BomRow[]).length} item(ns) · Total estimado:{" "}
            {custoTotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          </p>
        </div>
        <Button
          size="sm"
          variant="secondary"
          disabled={totalRascunhos === 0 || submitMut.isPending}
          onClick={() => submitMut.mutate()}
        >
          <Send className="mr-1 h-3.5 w-3.5" />
          Enviar para aprovação ({totalRascunhos})
        </Button>
      </div>

      {isLoading ? (
        <div className="px-3 py-4 text-[12px] text-muted-foreground">Carregando…</div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-[11px]">Descrição</TableHead>
              <TableHead className="w-20 text-[11px]">Qtd</TableHead>
              <TableHead className="w-16 text-[11px]">Un</TableHead>
              <TableHead className="w-28 text-[11px]">R$ un</TableHead>
              <TableHead className="w-24 text-[11px]">Criticidade</TableHead>
              <TableHead className="w-32 text-[11px]">Status</TableHead>
              <TableHead className="w-32 text-right text-[11px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(rows as BomRow[]).map((r) => (
              <TableRow key={r.id}>
                <TableCell className="text-[12px]">
                  <input
                    defaultValue={r.descricao}
                    onBlur={(e) => {
                      if (e.target.value.trim() && e.target.value !== r.descricao)
                        updateMut.mutate({ id: r.id, descricao: e.target.value.trim() });
                    }}
                    className="w-full bg-transparent outline-none focus:border-b focus:border-primary"
                  />
                </TableCell>
                <TableCell className="text-[12px]">
                  <input
                    type="number"
                    defaultValue={r.quantidade}
                    onBlur={(e) => {
                      const v = Number(e.target.value) || 0;
                      if (v !== r.quantidade) updateMut.mutate({ id: r.id, quantidade: v });
                    }}
                    className="w-16 bg-transparent outline-none"
                  />
                </TableCell>
                <TableCell className="text-[12px]">
                  <input
                    defaultValue={r.unidade}
                    onBlur={(e) => {
                      if (e.target.value !== r.unidade)
                        updateMut.mutate({ id: r.id, unidade: e.target.value });
                    }}
                    className="w-12 bg-transparent outline-none"
                  />
                </TableCell>
                <TableCell className="text-[12px]">
                  <input
                    type="number"
                    defaultValue={r.custo_unitario_estimado ?? ""}
                    placeholder="—"
                    onBlur={(e) => {
                      const v = e.target.value ? Number(e.target.value) : null;
                      updateMut.mutate({ id: r.id, custo_unitario_estimado: v });
                    }}
                    className="w-20 bg-transparent outline-none"
                  />
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={cn("h-5 px-1.5 text-[10px]", INSUMO_CRITICIDADE_COLOR[r.criticidade])}>
                    {INSUMO_CRITICIDADE_LABEL[r.criticidade]}
                  </Badge>
                </TableCell>
                <TableCell>
                  {r.ordem_compra ? (
                    <Link
                      to="/compras/ordens/$id"
                      params={{ id: r.ordem_compra.id }}
                      className="inline-flex items-center gap-1 rounded border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 hover:bg-emerald-100"
                      title={`OC ${r.ordem_compra.numero ?? ""}`}
                    >
                      <ShoppingCart className="h-3 w-3" />
                      Comprado ✓
                    </Link>
                  ) : (
                    <Badge variant="outline" className={cn("h-5 px-1.5 text-[10px]", INSUMO_STATUS_COLOR[r.status as keyof typeof INSUMO_STATUS_COLOR] ?? "")}>
                      {INSUMO_STATUS_LABEL[r.status as keyof typeof INSUMO_STATUS_LABEL] ?? r.status}
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="inline-flex items-center gap-1">
                    {isManager && r.status === "pronto_aprovacao" && (
                      <>
                        <Button size="icon" variant="ghost" className="h-6 w-6 text-emerald-600" onClick={() => approveMut.mutate(r.id)} title="Aprovar">
                          <Check className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-6 w-6 text-rose-600" onClick={() => rejectMut.mutate(r.id)} title="Rejeitar">
                          <XIcon className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    )}
                    {(r.status === "rascunho" || isManager) && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 text-muted-foreground hover:text-rose-600"
                        onClick={() => {
                          if (confirm("Remover item?")) deleteMut.mutate(r.id);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
            <TableRow>
              <TableCell colSpan={7} className="py-1">
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Descrição do novo item…"
                    value={novo.desc}
                    onChange={(e) => setNovo({ ...novo, desc: e.target.value })}
                    className="h-7 flex-1 text-[12px]"
                  />
                  <Input
                    type="number"
                    placeholder="Qtd"
                    value={novo.qtd}
                    onChange={(e) => setNovo({ ...novo, qtd: Number(e.target.value) || 0 })}
                    className="h-7 w-16 text-[12px]"
                  />
                  <Input
                    placeholder="Un"
                    value={novo.un}
                    onChange={(e) => setNovo({ ...novo, un: e.target.value })}
                    className="h-7 w-16 text-[12px]"
                  />
                  <Input
                    type="number"
                    placeholder="R$"
                    value={novo.custo}
                    onChange={(e) => setNovo({ ...novo, custo: e.target.value })}
                    className="h-7 w-20 text-[12px]"
                  />
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={!novo.desc.trim() || createMut.isPending}
                    onClick={() =>
                      createMut.mutate({
                        descricao: novo.desc.trim(),
                        quantidade: novo.qtd,
                        unidade: novo.un || "un",
                        custo_unitario_estimado: novo.custo ? Number(novo.custo) : null,
                      })
                    }
                  >
                    <Plus className="mr-1 h-3.5 w-3.5" />
                    Adicionar
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      )}

      {totalPendentes > 0 && !isManager && (
        <div className="border-t border-border/40 bg-amber-50 px-3 py-1.5 text-[11px] text-amber-700">
          {totalPendentes} item(ns) aguardando aprovação do manager.
        </div>
      )}
    </div>
  );
}
