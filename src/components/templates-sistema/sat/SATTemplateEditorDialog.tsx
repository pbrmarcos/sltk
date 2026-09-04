import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, ChevronDown, ChevronRight, Loader2, GripVertical } from "lucide-react";
import {
  getSATTemplate,
  updateSATTemplate,
  upsertSATSecao,
  deleteSATSecao,
  upsertSATItem,
  deleteSATItem,
  SAT_ITEM_TIPOS,
  type SATItemTipo,
  type SATTemplateItem,
  type SATTemplateSecao,
} from "@/lib/sat-templates.functions";
import { Textarea } from "@/components/ui/textarea";

const TIPO_LABEL: Record<SATItemTipo, string> = {
  sim_nao_comentario: "Sim/Não + comentário",
  texto: "Texto livre",
  numero: "Número",
  data: "Data",
  checkbox_multi: "Checkbox múltiplo",
  parametro_operacional: "Parâmetros (tabela)",
  cabecalho: "Cabeçalho (somente leitura)",
};

export function SATTemplateEditorDialog({
  templateId,
  open,
  onOpenChange,
}: {
  templateId: string;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const qc = useQueryClient();
  const getFn = useServerFn(getSATTemplate);
  const updTplFn = useServerFn(updateSATTemplate);
  const upSecFn = useServerFn(upsertSATSecao);
  const delSecFn = useServerFn(deleteSATSecao);
  const upItemFn = useServerFn(upsertSATItem);
  const delItemFn = useServerFn(deleteSATItem);

  const tplQ = useQuery({
    queryKey: ["sat-template", templateId],
    queryFn: () => getFn({ data: { id: templateId } }),
    enabled: open,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["sat-template", templateId] });
    qc.invalidateQueries({ queryKey: ["sat-templates"] });
  };

  const tpl = tplQ.data ?? null;

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const toggle = (id: string) => setExpanded((s) => ({ ...s, [id]: !s[id] }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            Editor de template SAT {tpl ? `— v${tpl.versao}` : ""}
          </DialogTitle>
        </DialogHeader>

        {tplQ.isLoading || !tpl ? (
          <div className="py-10 text-center text-[var(--text-muted)]">
            <Loader2 className="inline h-5 w-5 animate-spin" />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Nome</Label>
                <Input
                  defaultValue={tpl.nome}
                  onBlur={async (e) => {
                    if (e.currentTarget.value !== tpl.nome) {
                      await updTplFn({ data: { id: tpl.id, nome: e.currentTarget.value } });
                      invalidate();
                    }
                  }}
                />
              </div>
              <div>
                <Label>Descrição</Label>
                <Input
                  defaultValue={tpl.descricao ?? ""}
                  onBlur={async (e) => {
                    if (e.currentTarget.value !== (tpl.descricao ?? "")) {
                      await updTplFn({
                        data: { id: tpl.id, descricao: e.currentTarget.value || null },
                      });
                      invalidate();
                    }
                  }}
                />
              </div>
            </div>

            <div className="space-y-3">
              {tpl.secoes.map((sec, idx) => (
                <SecaoCard
                  key={sec.id}
                  sec={sec}
                  index={idx}
                  expanded={!!expanded[sec.id]}
                  onToggle={() => toggle(sec.id)}
                  onChange={invalidate}
                  onDeleteSec={async () => {
                    if (!confirm(`Excluir seção "${sec.titulo}"?`)) return;
                    await delSecFn({ data: { id: sec.id } });
                    invalidate();
                  }}
                  onRenameSec={async (titulo) => {
                    await upSecFn({
                      data: {
                        id: sec.id,
                        template_id: tpl.id,
                        ordem: sec.ordem,
                        titulo,
                      },
                    });
                    invalidate();
                  }}
                  onUpsertItem={async (item) => {
                    await upItemFn({ data: item });
                    invalidate();
                  }}
                  onDeleteItem={async (id) => {
                    await delItemFn({ data: { id } });
                    invalidate();
                  }}
                />
              ))}

              <Button
                variant="outline"
                className="w-full"
                onClick={async () => {
                  await upSecFn({
                    data: {
                      template_id: tpl.id,
                      ordem: tpl.secoes.length + 1,
                      titulo: "Nova seção",
                    },
                  });
                  invalidate();
                }}
              >
                <Plus className="mr-1 h-4 w-4" /> Adicionar seção
              </Button>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SecaoCard({
  sec,
  index,
  expanded,
  onToggle,
  onDeleteSec,
  onRenameSec,
  onUpsertItem,
  onDeleteItem,
  onChange,
}: {
  sec: SATTemplateSecao;
  index: number;
  expanded: boolean;
  onToggle: () => void;
  onDeleteSec: () => void;
  onRenameSec: (t: string) => Promise<void>;
  onUpsertItem: (
    it: {
      id?: string;
      secao_id: string;
      ordem: number;
      label: string;
      tipo: SATItemTipo;
      obrigatorio: boolean;
      permite_anexo: boolean;
      ajuda?: string | null;
      opcoes: string[];
    },
  ) => Promise<void>;
  onDeleteItem: (id: string) => Promise<void>;
  onChange: () => void;
}) {
  const [novoLabel, setNovoLabel] = useState("");
  const [novoTipo, setNovoTipo] = useState<SATItemTipo>("sim_nao_comentario");

  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--bg-border)] bg-[var(--bg-surface)]">
      <div className="flex items-center gap-2 p-3">
        <GripVertical className="h-4 w-4 text-[var(--text-muted)]" />
        <button onClick={onToggle} className="p-1">
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
        <span className="text-[12px] text-[var(--text-muted)]">{index + 1}.</span>
        <Input
          defaultValue={sec.titulo}
          className="flex-1"
          onBlur={(e) => {
            if (e.currentTarget.value !== sec.titulo) onRenameSec(e.currentTarget.value);
          }}
        />
        <span className="text-[12px] text-[var(--text-muted)]">{sec.itens.length} itens</span>
        <Button variant="ghost" size="sm" onClick={onDeleteSec} className="text-[var(--danger)]">
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {expanded && (
        <div className="border-t border-[var(--bg-border)] p-3 space-y-2">
          {sec.itens.map((it, i) => (
            <ItemRow
              key={it.id}
              it={it}
              index={i}
              onUpsert={onUpsertItem}
              onDelete={() => onDeleteItem(it.id)}
            />
          ))}

          <div className="flex gap-2 pt-2 border-t border-[var(--bg-border)]">
            <Input
              value={novoLabel}
              onChange={(e) => setNovoLabel(e.target.value)}
              placeholder="Texto do novo item"
              className="flex-1"
            />
            <Select value={novoTipo} onValueChange={(v) => setNovoTipo(v as SATItemTipo)}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SAT_ITEM_TIPOS.map((t) => (
                  <SelectItem key={t} value={t}>
                    {TIPO_LABEL[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={async () => {
                if (!novoLabel.trim()) return;
                await onUpsertItem({
                  secao_id: sec.id,
                  ordem: sec.itens.length + 1,
                  label: novoLabel.trim(),
                  tipo: novoTipo,
                  obrigatorio: false,
                  permite_anexo: true,
                  opcoes: [],
                });
                setNovoLabel("");
                onChange();
              }}
            >
              <Plus className="mr-1 h-4 w-4" /> Item
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function ItemRow({
  it,
  index,
  onUpsert,
  onDelete,
}: {
  it: SATTemplateItem;
  index: number;
  onUpsert: (it: {
    id?: string;
    secao_id: string;
    ordem: number;
    label: string;
    tipo: SATItemTipo;
    obrigatorio: boolean;
    permite_anexo: boolean;
    ajuda?: string | null;
    opcoes: string[];
  }) => Promise<void>;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-md border border-[var(--bg-border)]">
      <div className="flex items-center gap-2 p-2">
        <span className="text-[11px] text-[var(--text-muted)] w-6">{index + 1}.</span>
        <Input
          defaultValue={it.label}
          className="flex-1"
          onBlur={async (e) => {
            if (e.currentTarget.value !== it.label)
              await onUpsert({ ...it, label: e.currentTarget.value });
          }}
        />
        <span className="text-[11px] text-[var(--text-muted)]">{TIPO_LABEL[it.tipo]}</span>
        <Button variant="ghost" size="sm" onClick={() => setOpen((o) => !o)}>
          {open ? "Menos" : "Mais"}
        </Button>
        <Button variant="ghost" size="sm" onClick={onDelete} className="text-[var(--danger)]">
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
      {open && (
        <div className="border-t border-[var(--bg-border)] p-3 grid grid-cols-2 gap-3">
          <div>
            <Label>Tipo</Label>
            <Select
              value={it.tipo}
              onValueChange={async (v) => {
                await onUpsert({ ...it, tipo: v as SATItemTipo });
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SAT_ITEM_TIPOS.map((t) => (
                  <SelectItem key={t} value={t}>
                    {TIPO_LABEL[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end gap-4">
            <label className="flex items-center gap-2 text-[12px]">
              <Switch
                checked={it.obrigatorio}
                onCheckedChange={async (v) => {
                  await onUpsert({ ...it, obrigatorio: v });
                }}
              />
              Obrigatório
            </label>
            <label className="flex items-center gap-2 text-[12px]">
              <Switch
                checked={it.permite_anexo}
                onCheckedChange={async (v) => {
                  await onUpsert({ ...it, permite_anexo: v });
                }}
              />
              Permite anexo
            </label>
          </div>
          <div className="col-span-2">
            <Label>Ajuda (opcional)</Label>
            <Input
              defaultValue={it.ajuda ?? ""}
              onBlur={async (e) => {
                if (e.currentTarget.value !== (it.ajuda ?? ""))
                  await onUpsert({ ...it, ajuda: e.currentTarget.value || null });
              }}
            />
          </div>
          {it.tipo === "checkbox_multi" && (
            <div className="col-span-2">
              <Label>Opções (uma por linha)</Label>
              <Textarea
                rows={6}
                defaultValue={it.opcoes.join("\n")}
                onBlur={async (e) => {
                  const next = e.currentTarget.value
                    .split("\n")
                    .map((s) => s.trim())
                    .filter(Boolean);
                  await onUpsert({ ...it, opcoes: next });
                }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}