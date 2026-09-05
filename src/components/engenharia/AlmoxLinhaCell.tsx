import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";
import { Boxes, BookmarkPlus, Link2, PackagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  buscarItensCatalogo,
  criarItemDeInsumo,
  listAlmoxCadastros,
  reservarEstoque,
  vincularInsumoAoItem,
  cancelarReserva,
} from "@/lib/almoxarifado.functions";

type Estoque = {
  item_id: string;
  codigo: string;
  descricao: string;
  unidade_estoque: string;
  fator: number;
  total: number;
  disponivel: number;
  reservado_projeto: number;
  reserva_id: string | null;
};

const fmt = (v: number) => Number(v ?? 0).toLocaleString("pt-BR", { maximumFractionDigits: 3 });

/**
 * Célula "Almoxarifado" de uma linha de insumo do projeto:
 * mostra o saldo disponível do item vinculado (já convertido para a unidade
 * da linha) e permite vincular, criar item a partir da linha e reservar.
 */
export function AlmoxLinhaCell({
  insumo,
  projetoId,
  estoque,
  podeEditar,
}: {
  insumo: { id: string; descricao: string; unidade: string | null; quantidade: number };
  projetoId: string;
  estoque?: Estoque;
  podeEditar: boolean;
}) {
  const qc = useQueryClient();
  const [dlg, setDlg] = useState<null | "vincular" | "criar" | "reservar">(null);

  const buscarFn = useServerFn(buscarItensCatalogo);
  const cadFn = useServerFn(listAlmoxCadastros);
  const vincularFn = useServerFn(vincularInsumoAoItem);
  const criarFn = useServerFn(criarItemDeInsumo);
  const reservarFn = useServerFn(reservarEstoque);
  const cancelarFn = useServerFn(cancelarReserva);

  const [busca, setBusca] = useState("");
  const [itemSel, setItemSel] = useState<any>(null);
  const [fator, setFator] = useState("1");
  const [unidadeNova, setUnidadeNova] = useState("");
  const [qtdReserva, setQtdReserva] = useState("");
  const [semelhantes, setSemelhantes] = useState<any[] | null>(null);

  const { data: itens = [] } = useQuery({
    queryKey: ["almox-catalogo", busca],
    queryFn: () => buscarFn({ data: { q: busca } }),
    enabled: dlg === "vincular",
  });
  const { data: cad } = useQuery({
    queryKey: ["almox-cadastros"],
    queryFn: () => cadFn(),
    enabled: dlg === "criar",
    staleTime: 300_000,
  });

  const invalidar = () => {
    qc.invalidateQueries({ queryKey: ["projeto-insumos"] });
    qc.invalidateQueries({ queryKey: ["projeto-insumos-estoque", projetoId] });
    setDlg(null);
    setSemelhantes(null);
  };

  const vincular = useMutation({
    mutationFn: () =>
      vincularFn({
        data: {
          insumo_id: insumo.id,
          item_id: itemSel?.item_id ?? null,
          fator: Number(String(fator).replace(",", ".")) || null,
        },
      }),
    onSuccess: () => {
      toast.success("Insumo vinculado ao item do almoxarifado.");
      invalidar();
    },
    onError: (e: any) => toast.error(e?.message ?? "Não foi possível vincular."),
  });

  const criar = useMutation({
    mutationFn: (confirmar: boolean) =>
      criarFn({
        data: {
          insumo_id: insumo.id,
          unidade_estoque: unidadeNova || insumo.unidade || "UN",
          fator: Number(String(fator).replace(",", ".")) || 1,
          confirmar_semelhante: confirmar,
        },
      }),
    onSuccess: (res: any) => {
      if (res?.ok === false) {
        setSemelhantes(res.semelhantes ?? []);
        toast.warning("Já existem itens parecidos no catálogo. Confira antes de criar um novo.");
        return;
      }
      toast.success(`Item ${res.item.codigo} criado e vinculado.`);
      invalidar();
    },
    onError: (e: any) => toast.error(e?.message ?? "Não foi possível criar o item."),
  });

  const reservar = useMutation({
    mutationFn: () => {
      const q = Number(String(qtdReserva).replace(",", ".")) * (estoque?.fator ?? 1);
      if (!(q > 0)) throw new Error("Informe uma quantidade maior que zero.");
      return reservarFn({
        data: { item_id: estoque!.item_id, projeto_id: projetoId, quantidade: q },
      });
    },
    onSuccess: () => {
      toast.success("Estoque reservado para este projeto.");
      invalidar();
    },
    onError: (e: any) => toast.error(e?.message ?? "Não foi possível reservar."),
  });

  const cancelar = useMutation({
    mutationFn: () =>
      cancelarFn({
        data: { reserva_id: estoque!.reserva_id!, motivo: "Cancelada pela engenharia" },
      }),
    onSuccess: () => {
      toast.success("Reserva cancelada.");
      invalidar();
    },
    onError: (e: any) => toast.error(e?.message ?? "Não foi possível cancelar."),
  });

  if (!estoque) {
    return (
      <>
        <div className="flex flex-col items-end gap-1">
          <span className="text-[11px] text-[var(--text-muted)]">sem vínculo</span>
          {podeEditar && (
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="ghost"
                className="h-6 px-1.5 text-[11px]"
                onClick={() => setDlg("vincular")}
              >
                <Link2 className="mr-1 h-3 w-3" /> Vincular
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 px-1.5 text-[11px]"
                onClick={() => {
                  setUnidadeNova(insumo.unidade ?? "");
                  setDlg("criar");
                }}
              >
                <PackagePlus className="mr-1 h-3 w-3" /> Criar item
              </Button>
            </div>
          )}
        </div>
        {renderDialogs()}
      </>
    );
  }

  const suficiente = estoque.disponivel >= Number(insumo.quantidade ?? 0);

  return (
    <>
      <div className="flex flex-col items-end gap-0.5">
        <Link
          to="/compras/almoxarifado/$id"
          params={{ id: estoque.item_id }}
          className="font-mono text-[11px] text-blue-700 hover:underline"
        >
          {estoque.codigo}
        </Link>
        <Badge
          variant="outline"
          className={
            suficiente
              ? "border-emerald-200 bg-emerald-50 font-normal text-emerald-700"
              : "border-amber-200 bg-amber-50 font-normal text-amber-700"
          }
        >
          <Boxes className="mr-1 h-3 w-3" /> {fmt(estoque.disponivel)} {insumo.unidade ?? ""}
        </Badge>
        {estoque.reservado_projeto > 0 && (
          <span className="text-[10px] text-[var(--text-secondary)]">
            reservado: {fmt(estoque.reservado_projeto)}
          </span>
        )}
        {podeEditar && (
          <div className="flex gap-1">
            {estoque.reserva_id ? (
              <Button
                size="sm"
                variant="ghost"
                className="h-6 px-1.5 text-[11px]"
                disabled={cancelar.isPending}
                onClick={() => cancelar.mutate()}
              >
                Cancelar reserva
              </Button>
            ) : (
              <Button
                size="sm"
                variant="ghost"
                className="h-6 px-1.5 text-[11px]"
                onClick={() => {
                  setQtdReserva(String(insumo.quantidade ?? ""));
                  setDlg("reservar");
                }}
              >
                <BookmarkPlus className="mr-1 h-3 w-3" /> Reservar
              </Button>
            )}
          </div>
        )}
      </div>
      {renderDialogs()}
    </>
  );

  function renderDialogs() {
    return (
      <Dialog
        open={dlg !== null}
        onOpenChange={(v) => {
          if (!v) {
            setDlg(null);
            setSemelhantes(null);
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {dlg === "vincular"
                ? "Vincular ao almoxarifado"
                : dlg === "criar"
                  ? "Criar item de almoxarifado"
                  : "Reservar do estoque"}
            </DialogTitle>
            <DialogDescription className="truncate">{insumo.descricao}</DialogDescription>
          </DialogHeader>

          {dlg === "vincular" && (
            <div className="grid gap-3">
              <Input
                placeholder="Buscar por código ou descrição"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
              />
              <div className="max-h-56 overflow-y-auto rounded border">
                {(itens as any[]).map((i) => (
                  <button
                    key={i.item_id}
                    type="button"
                    onClick={() => setItemSel(i)}
                    className={`flex w-full items-center justify-between px-2 py-1.5 text-left text-xs hover:bg-[var(--bg-elevated)] ${
                      itemSel?.item_id === i.item_id ? "bg-blue-50" : ""
                    }`}
                  >
                    <span className="truncate">
                      <span className="font-mono">{i.codigo}</span> · {i.descricao}
                    </span>
                    <span className="ml-2 shrink-0 text-[var(--text-secondary)]">
                      {fmt(i.disponivel)} {i.unidade_estoque}
                    </span>
                  </button>
                ))}
                {(itens as any[]).length === 0 && (
                  <p className="px-2 py-3 text-xs text-[var(--text-secondary)]">Nenhum item encontrado.</p>
                )}
              </div>
              {itemSel &&
                itemSel.unidade_estoque?.toLowerCase() !== (insumo.unidade ?? "").toLowerCase() && (
                  <div>
                    <Label className="text-xs">
                      Fator de conversão — quantas {itemSel.unidade_estoque} equivalem a 1{" "}
                      {insumo.unidade ?? "unidade"}
                    </Label>
                    <Input
                      inputMode="decimal"
                      value={fator}
                      onChange={(e) => setFator(e.target.value)}
                    />
                  </div>
                )}
            </div>
          )}

          {dlg === "criar" && (
            <div className="grid gap-3">
              <div>
                <Label className="text-xs">Unidade de estoque</Label>
                <Select value={unidadeNova} onValueChange={setUnidadeNova}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a unidade" />
                  </SelectTrigger>
                  <SelectContent>
                    {((cad?.unidades ?? []) as any[]).map((u) => (
                      <SelectItem key={u.codigo} value={u.codigo}>
                        {u.codigo} — {u.descricao}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {unidadeNova &&
                unidadeNova.toLowerCase() !== (insumo.unidade ?? "").toLowerCase() && (
                  <div>
                    <Label className="text-xs">
                      Fator — quantas {unidadeNova} equivalem a 1 {insumo.unidade ?? "unidade"}
                    </Label>
                    <Input
                      inputMode="decimal"
                      value={fator}
                      onChange={(e) => setFator(e.target.value)}
                    />
                  </div>
                )}
              {semelhantes && semelhantes.length > 0 && (
                <div className="rounded border border-amber-200 bg-amber-50 p-2 text-xs">
                  <p className="mb-1 font-medium text-amber-800">Itens parecidos já cadastrados:</p>
                  <ul className="space-y-0.5 text-amber-900">
                    {semelhantes.map((s) => (
                      <li key={s.id}>
                        <span className="font-mono">{s.codigo}</span> · {s.descricao} (
                        {s.unidade_estoque})
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {dlg === "reservar" && (
            <div className="grid gap-3">
              <p className="text-xs text-[var(--text-secondary)]">
                Disponível: {fmt(estoque?.disponivel ?? 0)} {insumo.unidade ?? ""} · necessário:{" "}
                {fmt(Number(insumo.quantidade))} {insumo.unidade ?? ""}
              </p>
              <div>
                <Label className="text-xs">Quantidade a reservar ({insumo.unidade ?? "un"})</Label>
                <Input
                  inputMode="decimal"
                  value={qtdReserva}
                  onChange={(e) => setQtdReserva(e.target.value)}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDlg(null)}>
              Cancelar
            </Button>
            {dlg === "vincular" && (
              <Button disabled={!itemSel || vincular.isPending} onClick={() => vincular.mutate()}>
                Vincular
              </Button>
            )}
            {dlg === "criar" && (
              <Button
                disabled={!unidadeNova || criar.isPending}
                onClick={() => criar.mutate(!!semelhantes)}
              >
                {semelhantes ? "Criar mesmo assim" : "Criar e vincular"}
              </Button>
            )}
            {dlg === "reservar" && (
              <Button disabled={reservar.isPending} onClick={() => reservar.mutate()}>
                Reservar
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }
}
