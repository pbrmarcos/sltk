import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileSignature, Loader2 } from "lucide-react";
import { gerarEtpDeChecklist, listEquipamentosDoCliente } from "@/lib/checklist-etp.functions";

export function GerarEtpDialog({
  submissaoId,
  clienteId,
}: {
  submissaoId: string;
  clienteId: string;
}) {
  const [open, setOpen] = useState(false);
  const [equipamentoId, setEquipamentoId] = useState<string>("");
  const qc = useQueryClient();
  const navigate = useNavigate();

  const eqpsQ = useQuery({
    queryKey: ["checklist-etp-equipamentos", clienteId],
    queryFn: () => listEquipamentosDoCliente({ data: { cliente_id: clienteId } }),
    enabled: open && !!clienteId,
  });

  const gerar = useMutation({
    mutationFn: () =>
      gerarEtpDeChecklist({ data: { submissao_id: submissaoId, equipamento_id: equipamentoId } }),
    onSuccess: (res) => {
      toast.success(`ETP v${res.versao} criado a partir do checklist.`);
      qc.invalidateQueries({ queryKey: ["engenharia"] });
      setOpen(false);
      navigate({ to: "/engenharia/etp/$id", params: { id: res.etp_id } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const equipamentos = (eqpsQ.data ?? []) as Array<{
    id: string;
    codigo: string | null;
    modelo: string | null;
  }>;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <FileSignature className="mr-1.5 h-4 w-4" /> Gerar ETP
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Gerar ETP a partir do checklist</DialogTitle>
          <DialogDescription>
            As respostas viram os requisitos técnicos de um novo ETP em rascunho, vinculado ao
            equipamento escolhido.
          </DialogDescription>
        </DialogHeader>
        <div>
          <Label className="text-xs">Equipamento do cliente</Label>
          <Select value={equipamentoId} onValueChange={setEquipamentoId}>
            <SelectTrigger>
              <SelectValue
                placeholder={eqpsQ.isLoading ? "Carregando…" : "Selecione o equipamento"}
              />
            </SelectTrigger>
            <SelectContent>
              {equipamentos.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.codigo ?? "—"}
                  {e.modelo ? ` — ${e.modelo}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {!eqpsQ.isLoading && equipamentos.length === 0 && (
            <p className="mt-2 text-xs text-amber-700">
              Este cliente ainda não possui equipamentos cadastrados.
            </p>
          )}
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button
            size="sm"
            disabled={!equipamentoId || gerar.isPending}
            onClick={() => gerar.mutate()}
          >
            {gerar.isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
            Gerar ETP
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
