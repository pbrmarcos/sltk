import { useMemo, useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FormCollapsibleSection } from "@/components/form/FormCollapsibleSection";
import { cn } from "@/lib/utils";
import { useMineracaoStatus } from "./MineracaoContratoLine";
import { rotuloModo, type Campanha } from "./mineracao-utils";

/** Buscas salvas (com responsável) e o que já foi consultado no contrato. */
export function MineracaoHistoricoDialog({
  open,
  onOpenChange,
  campanhas,
  campanhaId,
  onSelecionar,
  onExportar,
  exportandoId,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  campanhas: Campanha[];
  campanhaId: string | null;
  onSelecionar: (id: string) => void;
  onExportar: (c: Campanha) => void;
  exportandoId: string | null;
}) {
  const status = useMineracaoStatus();
  const r = status.data?.dados ?? null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Histórico de buscas</DialogTitle>
          <DialogDescription>
            Cada busca fica salva com o responsável; abrir uma não gasta cota.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[50dvh] space-y-1.5 overflow-y-auto pr-1">
          {campanhas.length === 0 && (
            <p className="py-6 text-center text-[12.5px] text-muted-foreground">
              Nenhuma busca salva ainda.
            </p>
          )}
          {campanhas.map((c) => {
            const sel = campanhaId === c["id"];
            return (
              <div
                key={c["id"]}
                className={cn(
                  "flex items-center gap-2 rounded-md border px-3 py-2 text-[12px]",
                  sel ? "border-[var(--info)]" : "border-border",
                )}
              >
                <button
                  type="button"
                  onClick={() => {
                    onSelecionar(c["id"]);
                    onOpenChange(false);
                  }}
                  className="min-w-0 flex-1 text-left"
                >
                  <div className="truncate font-medium text-foreground">{c["nome"]}</div>
                  <div className="truncate text-muted-foreground">
                    {rotuloModo(c["modo"])} · NCM {(c["rubros"] ?? []).join(", ") || "—"} ·{" "}
                    {c["start_date"]} → {c["end_date"]} · {c["total_empresas"]}{" "}
                    {c["modo"] === "empresas" ? "empresas" : "relações"} · {c["responsavel"] ?? "—"}{" "}
                    · {new Date(c["created_at"]).toLocaleDateString("pt-BR")}
                  </div>
                </button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2"
                  disabled={exportandoId === c["id"]}
                  onClick={() => onExportar(c)}
                  title="Exportar para Excel"
                >
                  {exportandoId === c["id"] ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Download className="h-3.5 w-3.5" />
                  )}
                </Button>
              </div>
            );
          })}
        </div>
        {r && (
          <FormCollapsibleSection title="O que já foi consultado no contrato">
            <div className="grid gap-3 md:grid-cols-3">
              <ListaConsultada titulo="Países / bases" itens={r.bases.lista} />
              <ListaConsultada titulo="NCMs" itens={r.rubros.lista} />
              <ListaConsultada
                titulo="Empresas"
                itens={r.empresas.lista.map((e) => (e.pais ? `${e.nome} (${e.pais})` : e.nome))}
              />
            </div>
          </FormCollapsibleSection>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ListaConsultada({ titulo, itens }: { titulo: string; itens: string[] }) {
  const [q, setQ] = useState("");
  const filtrados = useMemo(() => {
    const t = q.trim().toLowerCase();
    return t ? itens.filter((i) => i.toLowerCase().includes(t)) : itens;
  }, [q, itens]);
  return (
    <div className="rounded-md border bg-muted/20 p-2.5">
      <div className="mb-1.5 flex items-baseline justify-between gap-2 text-[12px]">
        <span className="font-semibold">{titulo}</span>
        <span className="text-muted-foreground">{itens.length}</span>
      </div>
      <Input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Filtrar…"
        className="mb-1.5 h-7 text-[12px]"
      />
      <ul className="max-h-40 space-y-0.5 overflow-y-auto pr-1 text-[11.5px] text-muted-foreground">
        {filtrados.length === 0 && <li>Nada por aqui.</li>}
        {filtrados.map((i) => (
          <li key={i} className="truncate" title={i}>
            {i}
          </li>
        ))}
      </ul>
    </div>
  );
}
