import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronDown, ChevronUp, Plus, Trash2, GripVertical } from "lucide-react";
import type {
  CampoSchema,
  CampoTipo,
  FormularioSchema,
  Idioma,
  SecaoSchema,
} from "@/lib/rfq.shared";
import { RFQFormRenderer } from "@/components/rfq/RFQFormRenderer";

export type RfqTipoDraft = {
  id?: string | null;
  codigo: string;
  nome_pt: string;
  nome_es: string;
  nome_en: string;
  familia: string;
  descricao: string;
  ativo: boolean;
  campos_schema: FormularioSchema;
};

const TIPOS_CAMPO: { value: CampoTipo; label: string }[] = [
  { value: "text", label: "Texto curto" },
  { value: "long_text", label: "Texto longo" },
  { value: "numero", label: "Número" },
  { value: "boolean", label: "Sim/Não" },
  { value: "select", label: "Seleção única" },
  { value: "multi_select", label: "Múltipla escolha" },
  { value: "anexo_multiplo", label: "Anexos" },
];

function slugId(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 32);
}

function moveInArray<T>(arr: T[], from: number, to: number): T[] {
  if (to < 0 || to >= arr.length) return arr;
  const next = arr.slice();
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

export function RfqTipoEditor({
  draft,
  onChange,
  onSave,
  saving,
}: {
  draft: RfqTipoDraft;
  onChange: (next: RfqTipoDraft) => void;
  onSave: () => void;
  saving: boolean;
}) {
  const [previewIdioma, setPreviewIdioma] = useState<Idioma>("pt");

  function updateSecoes(mut: (secoes: SecaoSchema[]) => SecaoSchema[]) {
    onChange({ ...draft, campos_schema: { secoes: mut(draft.campos_schema.secoes) } });
  }
  function updateSecao(idx: number, mut: (s: SecaoSchema) => SecaoSchema) {
    updateSecoes((secoes) => secoes.map((s, i) => (i === idx ? mut(s) : s)));
  }
  function updateCampo(sIdx: number, cIdx: number, mut: (c: CampoSchema) => CampoSchema) {
    updateSecao(sIdx, (s) => ({ ...s, campos: s.campos.map((c, i) => (i === cIdx ? mut(c) : c)) }));
  }

  function addSecao() {
    const id = `secao_${draft.campos_schema.secoes.length + 1}`;
    updateSecoes((secoes) => [
      ...secoes,
      { id, titulo: { pt: "Nova seção", es: "", en: "" }, campos: [] },
    ]);
  }
  function addCampo(sIdx: number) {
    updateSecao(sIdx, (s) => ({
      ...s,
      campos: [
        ...s.campos,
        {
          id: `campo_${s.campos.length + 1}`,
          tipo: "text",
          label: { pt: "Novo campo", es: "", en: "" },
        },
      ],
    }));
  }

  return (
    <Tabs defaultValue="meta" className="w-full">
      <TabsList>
        <TabsTrigger value="meta">Informações</TabsTrigger>
        <TabsTrigger value="secoes">
          Seções e campos
          <Badge variant="secondary" className="ml-2">
            {draft.campos_schema.secoes.length}
          </Badge>
        </TabsTrigger>
        <TabsTrigger value="preview">Pré-visualizar</TabsTrigger>
      </TabsList>

      {/* --- META --- */}
      <TabsContent value="meta" className="space-y-4 pt-4">
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <Label>Código (identificador)</Label>
            <Input
              value={draft.codigo}
              onChange={(e) => onChange({ ...draft, codigo: slugId(e.target.value) })}
              placeholder="empacotamento_termoformado"
              disabled={!!draft.id}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              minúsculas, números e _ · imutável após criar
            </p>
          </div>
          <div>
            <Label>Família</Label>
            <Input
              value={draft.familia}
              onChange={(e) => onChange({ ...draft, familia: e.target.value })}
              placeholder="empacotamento"
            />
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <div>
            <Label>Nome (PT)</Label>
            <Input
              value={draft.nome_pt}
              onChange={(e) => onChange({ ...draft, nome_pt: e.target.value })}
            />
          </div>
          <div>
            <Label>Nome (ES)</Label>
            <Input
              value={draft.nome_es}
              onChange={(e) => onChange({ ...draft, nome_es: e.target.value })}
            />
          </div>
          <div>
            <Label>Nome (EN)</Label>
            <Input
              value={draft.nome_en}
              onChange={(e) => onChange({ ...draft, nome_en: e.target.value })}
            />
          </div>
        </div>
        <div>
          <Label>Descrição interna</Label>
          <Textarea
            rows={2}
            value={draft.descricao}
            onChange={(e) => onChange({ ...draft, descricao: e.target.value })}
          />
        </div>
        <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
          <div>
            <p className="text-sm font-medium">Ativo</p>
            <p className="text-xs text-muted-foreground">
              Tipos inativos não aparecem para o sales emitir novos formulários.
            </p>
          </div>
          <Switch checked={draft.ativo} onCheckedChange={(v) => onChange({ ...draft, ativo: v })} />
        </div>
      </TabsContent>

      {/* --- SEÇÕES --- */}
      <TabsContent value="secoes" className="space-y-4 pt-4">
        {draft.campos_schema.secoes.length === 0 && (
          <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Nenhuma seção. Comece adicionando uma.
          </div>
        )}
        {draft.campos_schema.secoes.map((sec, sIdx) => (
          <div key={sIdx} className="rounded-lg border border-border bg-card p-3">
            <div className="mb-3 flex items-start gap-2">
              <div className="flex flex-col">
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground"
                  onClick={() => updateSecoes((s) => moveInArray(s, sIdx, sIdx - 1))}
                  title="Mover para cima"
                >
                  <ChevronUp className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground"
                  onClick={() => updateSecoes((s) => moveInArray(s, sIdx, sIdx + 1))}
                  title="Mover para baixo"
                >
                  <ChevronDown className="h-4 w-4" />
                </button>
              </div>
              <div className="grid flex-1 gap-2 md:grid-cols-4">
                <div>
                  <Label className="text-[11px]">ID da seção</Label>
                  <Input
                    className="h-8"
                    value={sec.id}
                    onChange={(e) =>
                      updateSecao(sIdx, (s) => ({ ...s, id: slugId(e.target.value) }))
                    }
                  />
                </div>
                <div>
                  <Label className="text-[11px]">Título PT</Label>
                  <Input
                    className="h-8"
                    value={sec.titulo.pt}
                    onChange={(e) =>
                      updateSecao(sIdx, (s) => ({
                        ...s,
                        titulo: { ...s.titulo, pt: e.target.value },
                      }))
                    }
                  />
                </div>
                <div>
                  <Label className="text-[11px]">Título ES</Label>
                  <Input
                    className="h-8"
                    value={sec.titulo.es ?? ""}
                    onChange={(e) =>
                      updateSecao(sIdx, (s) => ({
                        ...s,
                        titulo: { ...s.titulo, es: e.target.value },
                      }))
                    }
                  />
                </div>
                <div>
                  <Label className="text-[11px]">Título EN</Label>
                  <Input
                    className="h-8"
                    value={sec.titulo.en ?? ""}
                    onChange={(e) =>
                      updateSecao(sIdx, (s) => ({
                        ...s,
                        titulo: { ...s.titulo, en: e.target.value },
                      }))
                    }
                  />
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-red-600 hover:bg-red-50"
                onClick={() => updateSecoes((secoes) => secoes.filter((_, i) => i !== sIdx))}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>

            {/* Campos */}
            <div className="space-y-2">
              {sec.campos.map((campo, cIdx) => (
                <div key={cIdx} className="rounded-md border border-border/60 bg-background p-2">
                  <div className="flex items-start gap-2">
                    <div className="mt-1 flex flex-col">
                      <button
                        type="button"
                        className="text-muted-foreground hover:text-foreground"
                        onClick={() =>
                          updateSecao(sIdx, (s) => ({
                            ...s,
                            campos: moveInArray(s.campos, cIdx, cIdx - 1),
                          }))
                        }
                      >
                        <ChevronUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        className="text-muted-foreground hover:text-foreground"
                        onClick={() =>
                          updateSecao(sIdx, (s) => ({
                            ...s,
                            campos: moveInArray(s.campos, cIdx, cIdx + 1),
                          }))
                        }
                      >
                        <ChevronDown className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="grid flex-1 gap-2 md:grid-cols-6">
                      <div className="md:col-span-1">
                        <Label className="text-[11px]">ID</Label>
                        <Input
                          className="h-8"
                          value={campo.id}
                          onChange={(e) =>
                            updateCampo(sIdx, cIdx, (c) => ({ ...c, id: slugId(e.target.value) }))
                          }
                        />
                      </div>
                      <div className="md:col-span-1">
                        <Label className="text-[11px]">Tipo</Label>
                        <Select
                          value={campo.tipo}
                          onValueChange={(v) =>
                            updateCampo(sIdx, cIdx, (c) => ({ ...c, tipo: v as CampoTipo }))
                          }
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {TIPOS_CAMPO.map((t) => (
                              <SelectItem key={t.value} value={t.value}>
                                {t.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="md:col-span-1">
                        <Label className="text-[11px]">Label PT</Label>
                        <Input
                          className="h-8"
                          value={campo.label.pt}
                          onChange={(e) =>
                            updateCampo(sIdx, cIdx, (c) => ({
                              ...c,
                              label: { ...c.label, pt: e.target.value },
                            }))
                          }
                        />
                      </div>
                      <div className="md:col-span-1">
                        <Label className="text-[11px]">Label ES</Label>
                        <Input
                          className="h-8"
                          value={campo.label.es ?? ""}
                          onChange={(e) =>
                            updateCampo(sIdx, cIdx, (c) => ({
                              ...c,
                              label: { ...c.label, es: e.target.value },
                            }))
                          }
                        />
                      </div>
                      <div className="md:col-span-1">
                        <Label className="text-[11px]">Label EN</Label>
                        <Input
                          className="h-8"
                          value={campo.label.en ?? ""}
                          onChange={(e) =>
                            updateCampo(sIdx, cIdx, (c) => ({
                              ...c,
                              label: { ...c.label, en: e.target.value },
                            }))
                          }
                        />
                      </div>
                      <div className="flex items-end justify-between md:col-span-1">
                        <label className="flex cursor-pointer items-center gap-1 text-[11px]">
                          <input
                            type="checkbox"
                            checked={campo.obrigatorio ?? false}
                            onChange={(e) =>
                              updateCampo(sIdx, cIdx, (c) => ({
                                ...c,
                                obrigatorio: e.target.checked,
                              }))
                            }
                          />
                          Obrig.
                        </label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:bg-red-50"
                          onClick={() =>
                            updateSecao(sIdx, (s) => ({
                              ...s,
                              campos: s.campos.filter((_, i) => i !== cIdx),
                            }))
                          }
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  {(campo.tipo === "select" || campo.tipo === "multi_select") && (
                    <div className="mt-2 pl-6">
                      <Label className="text-[11px]">Opções (uma por linha)</Label>
                      <Textarea
                        rows={3}
                        value={(campo.opcoes ?? []).join("\n")}
                        onChange={(e) =>
                          updateCampo(sIdx, cIdx, (c) => ({
                            ...c,
                            opcoes: e.target.value
                              .split("\n")
                              .map((x) => x.trim())
                              .filter(Boolean),
                          }))
                        }
                      />
                    </div>
                  )}
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => addCampo(sIdx)}
              >
                <Plus className="h-3.5 w-3.5" /> Adicionar campo
              </Button>
            </div>
          </div>
        ))}
        <Button type="button" variant="outline" onClick={addSecao}>
          <Plus className="h-3.5 w-3.5" /> Adicionar seção
        </Button>
      </TabsContent>

      {/* --- PREVIEW --- */}
      <TabsContent value="preview" className="space-y-3 pt-4">
        <div className="flex items-center gap-3">
          <Label>Idioma da pré-visualização</Label>
          <Select value={previewIdioma} onValueChange={(v) => setPreviewIdioma(v as Idioma)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pt">Português</SelectItem>
              <SelectItem value="es">Español</SelectItem>
              <SelectItem value="en">English</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="rounded-md border border-dashed border-border bg-muted/30 p-4">
          <RFQFormRenderer schema={draft.campos_schema} idioma={previewIdioma} preview />
        </div>
      </TabsContent>

      <div className="mt-4 flex justify-end gap-2">
        <Button type="button" onClick={onSave} disabled={saving}>
          {saving ? "Salvando…" : draft.id ? "Salvar alterações" : "Criar tipo"}
        </Button>
      </div>
    </Tabs>
  );
}

export function makeEmptyDraft(): RfqTipoDraft {
  return {
    codigo: "",
    nome_pt: "",
    nome_es: "",
    nome_en: "",
    familia: "",
    descricao: "",
    ativo: true,
    campos_schema: { secoes: [] },
  };
}
