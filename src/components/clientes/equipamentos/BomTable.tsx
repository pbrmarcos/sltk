import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { ExternalLink, ShoppingCart } from "lucide-react";
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
import { listEquipamentoBom, getProjetoParaEquipamento } from "@/lib/equipamento-bom.functions";
import { type Disciplina } from "@/lib/equipamento-disciplina-etapas.functions";
import {
  INSUMO_STATUS_LABEL,
  INSUMO_STATUS_COLOR,
  INSUMO_CRITICIDADE_LABEL,
  INSUMO_CRITICIDADE_COLOR,
} from "@/lib/projeto-insumos.shared";
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

// Somente leitura: a edição/aprovação do BOM acontece só em Engenharia →
// Projetos (ProjetoInsumosPanel), pra não ter duas portas de escrita pro mesmo
// dado (projeto_insumos). Aqui só mostramos o retrato atual e um link pra lá.
export function BomTable({
  equipamentoId,
  equipamentoDisciplina,
}: {
  equipamentoId: string;
  equipamentoDisciplina: Disciplina;
}) {
  const navigate = useNavigate();

  const queryKey = ["eq-bom", equipamentoId, equipamentoDisciplina];
  const { data: rows = [], isLoading } = useQuery({
    queryKey,
    queryFn: () =>
      listEquipamentoBom({
        data: { equipamento_id: equipamentoId, disciplina: equipamentoDisciplina },
      }),
  });

  const custoTotal = useMemo(
    () =>
      (rows as BomRow[]).reduce((acc, r) => {
        const c = r.custo_total_estimado ?? (r.custo_unitario_estimado ?? 0) * (r.quantidade ?? 1);
        return acc + (Number(c) || 0);
      }, 0),
    [rows],
  );

  const abrirNoProjeto = async () => {
    try {
      const r = await getProjetoParaEquipamento({
        data: { equipamento_id: equipamentoId, equipamento_disciplina: equipamentoDisciplina },
      });
      if (!r.projeto_id) {
        toast.error("Nenhum projeto de Engenharia vinculado a este equipamento ainda.");
        return;
      }
      navigate({
        to: "/engenharia/projetos",
        search: { d: r.projeto_disciplina as "mecanico" | "eletrico", open: r.projeto_id },
      });
    } catch (e: any) {
      toast.error(e?.message ?? "Falha ao localizar o projeto de Engenharia.");
    }
  };

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
        <Button size="sm" variant="secondary" onClick={abrirNoProjeto}>
          <ExternalLink className="mr-1 h-3.5 w-3.5" />
          Editar no projeto de Engenharia
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
              <TableHead className="w-36 text-[11px]">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(rows as BomRow[]).length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="py-4 text-center text-[12px] text-muted-foreground"
                >
                  Nenhum item cadastrado ainda.
                </TableCell>
              </TableRow>
            )}
            {(rows as BomRow[]).map((r) => (
              <TableRow key={r.id}>
                <TableCell className="text-[12px]">{r.descricao}</TableCell>
                <TableCell className="text-[12px]">{r.quantidade}</TableCell>
                <TableCell className="text-[12px]">{r.unidade}</TableCell>
                <TableCell className="text-[12px]">
                  {r.custo_unitario_estimado != null
                    ? r.custo_unitario_estimado.toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      })
                    : "—"}
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={cn(
                      "h-5 px-1.5 text-[10px]",
                      INSUMO_CRITICIDADE_COLOR[r.criticidade],
                    )}
                  >
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
                    <Badge
                      variant="outline"
                      className={cn(
                        "h-5 px-1.5 text-[10px]",
                        INSUMO_STATUS_COLOR[r.status as keyof typeof INSUMO_STATUS_COLOR] ?? "",
                      )}
                    >
                      {INSUMO_STATUS_LABEL[r.status as keyof typeof INSUMO_STATUS_LABEL] ??
                        r.status}
                    </Badge>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
