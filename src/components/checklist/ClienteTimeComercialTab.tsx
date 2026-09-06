/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, XCircle, ShieldCheck } from "lucide-react";
import {
  listSalesUsers,
  listClienteLiberacoes,
  liberarClienteParaSales,
  revogarLiberacaoSales,
} from "@/lib/checklist.functions";

export function ClienteTimeComercialTab({ clienteId }: { clienteId: string }) {
  const qc = useQueryClient();
  const salesQ = useQuery({ queryKey: ["sales-users"], queryFn: () => listSalesUsers() });
  const liberacoesQ = useQuery({
    queryKey: ["cliente-liberacoes", clienteId],
    queryFn: () => listClienteLiberacoes({ data: { cliente_id: clienteId } }),
  });
  const [selectedSales, setSelectedSales] = useState<string>("");
  const [obs, setObs] = useState("");

  const liberarMut = useMutation({
    mutationFn: () =>
      liberarClienteParaSales({
        data: { cliente_id: clienteId, sales_id: selectedSales, observacoes: obs || null },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cliente-liberacoes", clienteId] });
      toast.success("Sales liberado para este cliente.");
      setSelectedSales("");
      setObs("");
    },
    onError: (e: any) => toast.error(e.message || "Erro ao liberar."),
  });

  const revogarMut = useMutation({
    mutationFn: (id: string) => revogarLiberacaoSales({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cliente-liberacoes", clienteId] });
      toast.success("Liberação revogada.");
    },
  });

  const ativos = (liberacoesQ.data ?? []).filter((l: any) => !l.revogado_em);
  const historico = (liberacoesQ.data ?? []).filter((l: any) => l.revogado_em);

  const salesDisponiveis = useMemo(() => {
    const usados = new Set(ativos.map((l: any) => l.sales_id));
    return (salesQ.data ?? []).filter((s: any) => !usados.has(s.id));
  }, [ativos, salesQ.data]);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-[14px] font-semibold">Time comercial</h2>
        <p className="text-[12px] text-muted-foreground">
          Libere os sales autorizados a atender este cliente. Sales sem liberação não veem o cliente
          nem podem emitir formulários Checklist.
        </p>
      </div>

      <section className="rounded-lg border border-border bg-card p-4">
        <h3 className="mb-3 text-[13px] font-semibold">Liberar novo sales</h3>
        <div className="grid gap-3 md:grid-cols-[2fr_2fr_auto]">
          <div>
            <Label>Sales</Label>
            <Select value={selectedSales} onValueChange={setSelectedSales}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione…" />
              </SelectTrigger>
              <SelectContent>
                {salesDisponiveis.map((s: any) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.nome} — {s.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Observação (opcional)</Label>
            <Input value={obs} onChange={(e) => setObs(e.target.value)} />
          </div>
          <div className="flex items-end">
            <Button
              disabled={!selectedSales || liberarMut.isPending}
              onClick={() => liberarMut.mutate()}
            >
              <Plus className="h-3.5 w-3.5" /> Liberar
            </Button>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card">
        <div className="border-b border-border px-4 py-2 text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
          Sales ativos ({ativos.length})
        </div>
        {ativos.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">
            Nenhum sales liberado.
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {ativos.map((l: any) => (
              <li key={l.id} className="flex items-center gap-3 px-4 py-2.5">
                <ShieldCheck className="h-4 w-4 text-emerald-500" />
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-medium">{l.sales_nome}</div>
                  <div className="text-[11.5px] text-muted-foreground">
                    {l.sales_email} · desde {new Date(l.liberado_em).toLocaleDateString("pt-BR")}
                    {l.observacoes && ` · ${l.observacoes}`}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => revogarMut.mutate(l.id)}
                  disabled={revogarMut.isPending}
                >
                  <XCircle className="h-3.5 w-3.5" /> Revogar
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {historico.length > 0 && (
        <section className="rounded-lg border border-border bg-card">
          <div className="border-b border-border px-4 py-2 text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
            Histórico ({historico.length})
          </div>
          <ul className="divide-y divide-border">
            {historico.map((l: any) => (
              <li key={l.id} className="flex items-center gap-3 px-4 py-2.5 text-muted-foreground">
                <Badge variant="outline" className="text-[10px]">
                  revogado
                </Badge>
                <div className="min-w-0 flex-1 text-[12.5px]">
                  {l.sales_nome} — revogado em {new Date(l.revogado_em).toLocaleDateString("pt-BR")}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
