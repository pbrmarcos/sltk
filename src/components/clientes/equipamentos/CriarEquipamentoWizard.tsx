import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ArrowLeft, ArrowRight, Check, Copy, FileText, Loader2 } from "lucide-react";
import {
  planejamentoTemplatesQueryOptions,
  usuariosDelegarQueryOptions,
} from "@/lib/equipamento-planejamento.queries";
import {
  criarEquipamentoDeOrcamento,
  listCandidatosClone,
} from "@/lib/equipamento-planejamento.functions";
import { EQUIPAMENTO_CATEGORIAS, EQUIPAMENTO_CATEGORIA_LABEL, type EquipamentoCategoria } from "@/lib/equipamentos.shared";
import { useFormDraft } from "@/hooks/use-form-draft";
import { confirmDiscard } from "@/lib/unsaved-guard";

type Step = 1 | 2 | 3;
type Base = "template" | "clone";

export function CriarEquipamentoWizard({
  open,
  onClose,
  clienteId,
  oportunidadeId,
  defaultModelo,
  defaultValor,
}: {
  open: boolean;
  onClose: () => void;
  clienteId: string;
  oportunidadeId?: string | null;
  defaultModelo?: string;
  defaultValor?: number | null;
}) {
  const qc = useQueryClient();
  const nav = useNavigate();
  const [step, setStep] = useState<Step>(1);
  const [base, setBase] = useState<Base>("template");
  const [templateSlug, setTemplateSlug] = useState<string>("desenvolvimento-modelo");
  const [cloneId, setCloneId] = useState<string | null>(null);
  const [modelo, setModelo] = useState(defaultModelo ?? "");
  const [numeroSerie, setNumeroSerie] = useState("");
  const [tagCliente, setTagCliente] = useState("");
  const [categoria, setCategoria] = useState<EquipamentoCategoria>("outro");
  const [dataEntrega, setDataEntrega] = useState("");
  const [valor, setValor] = useState<string>(defaultValor ? String(defaultValor) : "");
  const [engId, setEngId] = useState<string>("");
  const [autoId, setAutoId] = useState<string>("");
  const [observacoes, setObservacoes] = useState("");
  const initialDraft = {
    step: 1 as Step, base: "template" as Base, templateSlug: "desenvolvimento-modelo", cloneId: null as string | null,
    modelo: defaultModelo ?? "", numeroSerie: "", tagCliente: "", categoria: "outro" as EquipamentoCategoria,
    dataEntrega: "", valor: defaultValor ? String(defaultValor) : "", engId: "", autoId: "", observacoes: "",
  };
  const currentDraft = { step, base, templateSlug, cloneId, modelo, numeroSerie, tagCliente, categoria, dataEntrega, valor, engId, autoId, observacoes };
  const { clearDraft, isDirty } = useFormDraft({
    formKey: `equipamento:criar:${clienteId}:${oportunidadeId ?? "sem-oportunidade"}`,
    value: currentDraft,
    initialValue: initialDraft,
    enabled: open,
    onRestore: (saved) => {
      setStep(saved.step); setBase(saved.base); setTemplateSlug(saved.templateSlug); setCloneId(saved.cloneId);
      setModelo(saved.modelo); setNumeroSerie(saved.numeroSerie); setTagCliente(saved.tagCliente);
      setCategoria(saved.categoria); setDataEntrega(saved.dataEntrega); setValor(saved.valor);
      setEngId(saved.engId); setAutoId(saved.autoId); setObservacoes(saved.observacoes);
    },
  });

  function requestClose() {
    if (!confirmDiscard(isDirty)) return;
    clearDraft();
    onClose();
  }

  const { data: templates } = useQuery(planejamentoTemplatesQueryOptions());
  const { data: usuarios } = useQuery(usuariosDelegarQueryOptions());
  const { data: candidatos } = useQuery({
    queryKey: ["clone-candidatos", modelo],
    queryFn: () => listCandidatosClone({ data: { modelo: modelo || undefined } }),
    enabled: open && base === "clone",
  });

  const templatesSorted = useMemo(
    () =>
      (templates ?? []).slice().sort((a, b) => {
        // "Desenvolvimento Modelo" no topo
        if (a.slug === "desenvolvimento-modelo") return -1;
        if (b.slug === "desenvolvimento-modelo") return 1;
        return a.nome.localeCompare(b.nome);
      }),
    [templates],
  );

  const createMut = useMutation({
    mutationFn: () =>
      criarEquipamentoDeOrcamento({
        data: {
          clienteId,
          oportunidadeId: oportunidadeId ?? null,
          base,
          clonarDeEquipamentoId: base === "clone" ? cloneId : null,
          templateSlug,
          modelo: modelo.trim(),
          fabricante: "Solutek",
          numero_serie: numeroSerie.trim() || null,
          tag_cliente: tagCliente.trim() || null,
          categoria,
          data_entrega: dataEntrega || null,
          valor_venda: valor ? Number(valor) : null,
          responsavel_engenharia_id: engId || null,
          responsavel_automacao_id: autoId || null,
          observacoes: observacoes.trim() || null,
        },
      }),
    onSuccess: (r) => {
      clearDraft();
      toast.success("Equipamento criado. Planejamento iniciado.");
      qc.invalidateQueries({ queryKey: ["clientes", clienteId, "equipamentos"] });
      onClose();
      // redireciona para ficha do cliente na aba equipamentos
      nav({ to: "/clientes/$codigo", params: { codigo: clienteId }, search: { tab: "equipamentos" } as any }).catch(() => null);
      return r;
    },
    onError: (e: any) => toast.error(e?.message ?? "Falha ao criar equipamento."),
  });

  const canNext =
    step === 1
      ? base === "template"
        ? !!templateSlug
        : !!cloneId
      : step === 2
        ? modelo.trim().length >= 2
        : true;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && requestClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Criar equipamento do cliente</DialogTitle>
          <DialogDescription>
            Passo {step} de 3 · A partir do orçamento aprovado, geramos o equipamento na ficha do cliente com planejamento pré-carregado.
          </DialogDescription>
        </DialogHeader>

        <div className="mb-3 flex items-center gap-2 text-[11px] text-muted-foreground">
          <StepDot n={1} active={step === 1} done={step > 1} label="Base do projeto" />
          <span>—</span>
          <StepDot n={2} active={step === 2} done={step > 2} label="Confirmar dados" />
          <span>—</span>
          <StepDot n={3} active={step === 3} done={false} label="Delegar responsáveis" />
        </div>

        {step === 1 && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setBase("template")}
                className={cn(
                  "rounded-lg border p-3 text-left transition",
                  base === "template" ? "border-primary bg-primary/5" : "border-border hover:bg-muted/40",
                )}
              >
                <div className="flex items-center gap-2 text-[13px] font-medium">
                  <FileText className="h-4 w-4" /> Iniciar do template
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Usa o template do modelo (25 catalogados) ou o genérico <em>Desenvolvimento Modelo</em>.
                </p>
              </button>
              <button
                type="button"
                onClick={() => setBase("clone")}
                className={cn(
                  "rounded-lg border p-3 text-left transition",
                  base === "clone" ? "border-primary bg-primary/5" : "border-border hover:bg-muted/40",
                )}
              >
                <div className="flex items-center gap-2 text-[13px] font-medium">
                  <Copy className="h-4 w-4" /> Clonar equipamento anterior
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Copia dados de um equipamento já entregue — bom para revisões incrementais.
                </p>
              </button>
            </div>

            {base === "template" ? (
              <label className="block space-y-1 text-[12.5px]">
                <span className="text-muted-foreground">Template do modelo</span>
                <Select value={templateSlug} onValueChange={setTemplateSlug}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Escolher template…" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[360px]">
                    {templatesSorted.map((t) => (
                      <SelectItem key={t.slug} value={t.slug}>
                        {t.nome}
                        {t.slug === "desenvolvimento-modelo" ? " · genérico" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground">
                  {templates?.find((t) => t.slug === templateSlug)?.descricao ?? ""}
                </p>
              </label>
            ) : (
              <div className="space-y-2">
                <Input
                  placeholder="Filtrar por modelo…"
                  value={modelo}
                  onChange={(e) => setModelo(e.target.value)}
                  className="h-9"
                />
                <div className="max-h-[240px] overflow-y-auto rounded-lg border border-border">
                  {(candidatos ?? []).length === 0 ? (
                    <div className="p-4 text-center text-[12px] text-muted-foreground">
                      Nenhum equipamento anterior encontrado.
                    </div>
                  ) : (
                    <ul className="divide-y divide-border">
                      {(candidatos ?? []).map((c: any) => (
                        <li key={c.id}>
                          <button
                            type="button"
                            onClick={() => {
                              setCloneId(c.id);
                              setTemplateSlug(c.planejamento_template_slug ?? "desenvolvimento-modelo");
                              if (!modelo) setModelo(c.modelo);
                            }}
                            className={cn(
                              "flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] hover:bg-muted/40",
                              cloneId === c.id && "bg-primary/5",
                            )}
                          >
                            <Badge variant="outline" className="font-mono text-[10px]">
                              {c.codigo ?? "—"}
                            </Badge>
                            <span className="flex-1 truncate">{c.modelo}</span>
                            <span className="text-muted-foreground">{c.categoria}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="grid grid-cols-2 gap-3 text-[12.5px]">
            <label className="col-span-2 space-y-1">
              <span className="text-muted-foreground">Modelo do equipamento</span>
              <Input value={modelo} onChange={(e) => setModelo(e.target.value)} placeholder="Ex.: Envasadora Linear 1035" />
            </label>
            <label className="space-y-1">
              <span className="text-muted-foreground">Nº de série</span>
              <Input value={numeroSerie} onChange={(e) => setNumeroSerie(e.target.value)} />
            </label>
            <label className="space-y-1">
              <span className="text-muted-foreground">Tag do cliente</span>
              <Input value={tagCliente} onChange={(e) => setTagCliente(e.target.value)} />
            </label>
            <label className="space-y-1">
              <span className="text-muted-foreground">Categoria</span>
              <Select value={categoria} onValueChange={(v) => setCategoria(v as EquipamentoCategoria)}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {EQUIPAMENTO_CATEGORIAS.map((c) => (
                    <SelectItem key={c} value={c}>{EQUIPAMENTO_CATEGORIA_LABEL[c]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
            <label className="space-y-1">
              <span className="text-muted-foreground">Data prevista de entrega</span>
              <Input type="date" value={dataEntrega} onChange={(e) => setDataEntrega(e.target.value)} />
            </label>
            <label className="space-y-1">
              <span className="text-muted-foreground">Valor de venda (BRL)</span>
              <Input type="number" value={valor} onChange={(e) => setValor(e.target.value)} />
            </label>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3 text-[12.5px]">
            <label className="space-y-1 block">
              <span className="text-muted-foreground">Engenheiro responsável <span className="text-[10px]">(mecânica · montagem · campo)</span></span>
              <Select value={engId} onValueChange={setEngId}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Selecionar…" /></SelectTrigger>
                <SelectContent className="max-h-[240px]">
                  {(usuarios ?? []).map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.full_name ?? u.email}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
            <label className="space-y-1 block">
              <span className="text-muted-foreground">Automação responsável <span className="text-[10px]">(elétrica · CLP · IHM)</span></span>
              <Select value={autoId} onValueChange={setAutoId}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Selecionar…" /></SelectTrigger>
                <SelectContent className="max-h-[240px]">
                  {(usuarios ?? []).map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.full_name ?? u.email}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
            <label className="space-y-1 block">
              <span className="text-muted-foreground">Observações iniciais</span>
              <Textarea rows={3} value={observacoes} onChange={(e) => setObservacoes(e.target.value)} />
            </label>
          </div>
        )}

        <div className="mt-4 flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => (step === 1 ? requestClose() : setStep((s) => (s - 1) as Step))}
            disabled={createMut.isPending}
          >
            <ArrowLeft className="h-3.5 w-3.5" /> {step === 1 ? "Cancelar" : "Voltar"}
          </Button>
          {step < 3 ? (
            <Button size="sm" disabled={!canNext} onClick={() => setStep((s) => (s + 1) as Step)}>
              Avançar <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          ) : (
            <Button size="sm" disabled={createMut.isPending || !modelo.trim()} onClick={() => createMut.mutate()}>
              {createMut.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} Criar equipamento
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function StepDot({ n, active, done, label }: { n: number; active: boolean; done: boolean; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span
        className={cn(
          "flex h-5 w-5 items-center justify-center rounded-full border text-[10px] font-semibold",
          active
            ? "border-primary bg-primary text-primary-foreground"
            : done
              ? "border-emerald-500 bg-emerald-500 text-white"
              : "border-border text-muted-foreground",
        )}
      >
        {done ? <Check className="h-3 w-3" /> : n}
      </span>
      <span className={cn(active && "text-foreground font-medium")}>{label}</span>
    </span>
  );
}
