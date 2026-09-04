/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Save } from "lucide-react";
import {
  upsertEtapaTemplateBomItem,
  DISCIPLINAS_PROJETO,
  PRIORIDADES,
} from "@/lib/etapa-templates.functions";
import { confirmDiscard } from "@/lib/unsaved-guard";
import { useFormDraft } from "@/hooks/use-form-draft";

export function BomDialog({
  templateId,
  item,
  onClose,
  onSaved,
}: {
  templateId: string;
  item: any;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [descricao, setDescricao] = useState<string>(item.descricao ?? "");
  const [quantidade, setQuantidade] = useState<number>(item.quantidade ?? 1);
  const [unidade, setUnidade] = useState<string>(item.unidade ?? "un");
  const [criticidade, setCriticidade] = useState<string>(item.criticidade ?? "media");
  const [disciplinaProjeto, setDisciplinaProjeto] = useState<string>(
    item.disciplina_projeto ?? item.disciplinaProjeto ?? "mecanico",
  );
  const [equipamentoDisciplina, setEquipamentoDisciplina] = useState<string>(
    item.equipamento_disciplina ?? item.equipamentoDisciplina ?? "engenharia",
  );
  const [partNumber, setPartNumber] = useState<string>(item.part_number ?? "");
  const [fabricante, setFabricante] = useState<string>(item.fabricante ?? "");
  const [link, setLink] = useState<string>(item.link ?? "");
  const [observacoes, setObservacoes] = useState<string>(item.observacoes ?? "");
  const initialDraft = {
    descricao: item.descricao ?? "", quantidade: item.quantidade ?? 1, unidade: item.unidade ?? "un",
    criticidade: item.criticidade ?? "media", disciplinaProjeto: item.disciplina_projeto ?? item.disciplinaProjeto ?? "mecanico",
    equipamentoDisciplina: item.equipamento_disciplina ?? item.equipamentoDisciplina ?? "engenharia",
    partNumber: item.part_number ?? "", fabricante: item.fabricante ?? "", link: item.link ?? "", observacoes: item.observacoes ?? "",
  };
  const currentDraft = { descricao, quantidade, unidade, criticidade, disciplinaProjeto, equipamentoDisciplina, partNumber, fabricante, link, observacoes };
  const { clearDraft, isDirty } = useFormDraft({
    formKey: `template-bom:${templateId}:${item.id ?? "novo"}`,
    value: currentDraft,
    initialValue: initialDraft,
    onRestore: (saved) => {
      setDescricao(saved.descricao); setQuantidade(saved.quantidade); setUnidade(saved.unidade);
      setCriticidade(saved.criticidade); setDisciplinaProjeto(saved.disciplinaProjeto);
      setEquipamentoDisciplina(saved.equipamentoDisciplina); setPartNumber(saved.partNumber);
      setFabricante(saved.fabricante); setLink(saved.link); setObservacoes(saved.observacoes);
    },
  });

  const mut = useMutation({
    mutationFn: () =>
      upsertEtapaTemplateBomItem({
        data: {
          id: item.id,
          templateId,
          descricao,
          quantidade,
          unidade,
          criticidade: criticidade as any,
          disciplinaProjeto: disciplinaProjeto as any,
          equipamentoDisciplina,
          ordem: item.ordem ?? 999,
          partNumber: partNumber || null,
          fabricante: fabricante || null,
          link: link || null,
          observacoes: observacoes || null,
        },
      }),
    onSuccess: () => { clearDraft(); toast.success("Salvo."); onSaved(); },
    onError: (e: any) => toast.error(e?.message ?? "Erro."),
  });

  function tryClose() {
    if (confirmDiscard(isDirty)) { clearDraft(); onClose(); }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && tryClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{item.id ? "Editar item BOM" : "Novo item BOM"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-2">
          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase text-muted-foreground">Identificação</h3>
            <div>
              <Label>Descrição *</Label>
              <Input value={descricao} onChange={(e) => setDescricao(e.target.value)} autoFocus />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Part number sugerido</Label>
                <Input value={partNumber} onChange={(e) => setPartNumber(e.target.value)} />
              </div>
              <div>
                <Label>Fabricante</Label>
                <Input value={fabricante} onChange={(e) => setFabricante(e.target.value)} />
              </div>
              <div className="col-span-2">
                <Label>Link/URL de referência</Label>
                <Input value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://…" />
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase text-muted-foreground">Quantidades e classificação</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Quantidade</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={quantidade}
                  onChange={(e) => setQuantidade(Number(e.target.value))}
                />
              </div>
              <div>
                <Label>Unidade</Label>
                <Input value={unidade} onChange={(e) => setUnidade(e.target.value)} />
              </div>
              <div>
                <Label>Disciplina Projeto</Label>
                <Select value={disciplinaProjeto} onValueChange={setDisciplinaProjeto}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DISCIPLINAS_PROJETO.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Aba EQP</Label>
                <Select value={equipamentoDisciplina} onValueChange={setEquipamentoDisciplina}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planejamento">Planejamento</SelectItem>
                    <SelectItem value="engenharia">Engenharia</SelectItem>
                    <SelectItem value="producao">Automação</SelectItem>
                    <SelectItem value="qualidade">Qualidade</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label>Criticidade</Label>
                <Select value={criticidade} onValueChange={setCriticidade}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PRIORIDADES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase text-muted-foreground">Observações</h3>
            <Textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              rows={2}
              placeholder="Notas técnicas, restrições, alternativos..."
            />
          </section>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={tryClose}>Cancelar</Button>
          <Button onClick={() => mut.mutate()} disabled={!descricao || mut.isPending}>
            <Save className="mr-1 h-4 w-4" /> Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
