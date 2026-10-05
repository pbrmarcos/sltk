import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Camera, ChevronDown, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ComboboxAdd } from "@/components/ui/combobox-add";
import { useCreateOportunidade } from "@/lib/oportunidades.queries";
import { leadOrigensQueryOptions, segmentosQueryOptions } from "@/lib/cadastros.queries";
import { createLeadOrigem } from "@/lib/lead-origens.functions";
import { createSegmento } from "@/lib/segmentos.functions";
import {
  scanSuspectFoto,
  createSuspectRapido,
  type SuspectEmpresa,
  type SuspectScan,
} from "@/lib/suspects.functions";
import { useCameraCaptureInputs } from "@/hooks/useCameraCaptureInputs";
import { compressImage } from "@/lib/image-resize";
import { useFormDraft } from "@/hooks/use-form-draft";
import { confirmDiscard } from "@/lib/unsaved-guard";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { OportunidadeDuplicada } from "@/lib/oportunidades.functions";

type Moeda = "BRL" | "USD";

const PAPEL_LABEL: Record<SuspectEmpresa["papel"], string> = {
  fabricante: "fabricante",
  importador: "importador",
  distribuidor: "distribuidor",
  marca: "marca",
  contato: "cartão",
};

export function NewOportunidadeDialog({
  open,
  onOpenChange,
  clienteId,
  empresaNome,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  /** Quando informado, a oportunidade já nasce vinculada a este cliente. */
  clienteId?: string;
  empresaNome?: string;
}) {
  const [titulo, setTitulo] = useState("");
  const [empresa, setEmpresa] = useState(empresaNome ?? "");
  const [segmentoId, setSegmentoId] = useState<string | null>(null);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [origemId, setOrigemId] = useState<string | null>(null);
  const [valor, setValor] = useState("");
  const [moeda, setMoeda] = useState<Moeda>("BRL");
  const [prob, setProb] = useState("10");
  const [maisDetalhes, setMaisDetalhes] = useState(false);
  const create = useCreateOportunidade();
  /** Chave de idempotência: mesma tentativa nunca gera duas oportunidades. */
  const idemKey = useRef<string>(crypto.randomUUID());
  const [duplicatas, setDuplicatas] = useState<OportunidadeDuplicada[]>([]);

  // Foto (produto ou cartão)
  const [scan, setScan] = useState<SuspectScan | null>(null);
  const [empresaSel, setEmpresaSel] = useState(0);
  const [lendo, setLendo] = useState(false);
  const [criandoSuspect, setCriandoSuspect] = useState(false);
  const [suspectDup, setSuspectDup] = useState<Array<{ razao_social: string; codigo: string }>>([]);

  const qc = useQueryClient();
  const origens = useQuery(leadOrigensQueryOptions());
  const segmentos = useQuery({ ...segmentosQueryOptions(), enabled: open && !clienteId });
  const createOrigemFn = useServerFn(createLeadOrigem);
  const createSegmentoFn = useServerFn(createSegmento);
  const scanFn = useServerFn(scanSuspectFoto);
  const createSuspectFn = useServerFn(createSuspectRapido);

  const ramoNome =
    segmentos.data?.find((s) => s.id === segmentoId)?.nome ??
    (!segmentoId ? (scan?.ramo.nome ?? null) : null);
  const tituloFinal = titulo.trim() || [empresa.trim(), ramoNome].filter(Boolean).join(" — ") || "";

  const initialDraft = {
    titulo: "",
    empresa: empresaNome ?? "",
    segmentoId: null as string | null,
    nome: "",
    email: "",
    telefone: "",
    origemId: null as string | null,
    valor: "",
    moeda: "BRL" as Moeda,
    prob: "10",
  };
  const draft = {
    titulo,
    empresa,
    segmentoId,
    nome,
    email,
    telefone,
    origemId,
    valor,
    moeda,
    prob,
  };
  const { clearDraft, isDirty } = useFormDraft({
    formKey: `oportunidade:nova:${clienteId ?? "pipeline"}`,
    value: draft,
    initialValue: initialDraft,
    enabled: open,
    onRestore: (saved) => {
      setTitulo(saved.titulo);
      setEmpresa(saved.empresa);
      setSegmentoId(saved.segmentoId ?? null);
      setNome(saved.nome);
      setEmail(saved.email);
      setTelefone(saved.telefone);
      setOrigemId(saved.origemId ?? null);
      setValor(saved.valor);
      setMoeda(saved.moeda ?? "BRL");
      setProb(saved.prob);
    },
  });

  function reset() {
    setDuplicatas([]);
    idemKey.current = crypto.randomUUID();
    setTitulo("");
    setEmpresa(empresaNome ?? "");
    setSegmentoId(null);
    setNome("");
    setEmail("");
    setTelefone("");
    setOrigemId(null);
    setValor("");
    setMoeda("BRL");
    setProb("10");
    setMaisDetalhes(false);
    setScan(null);
    setEmpresaSel(0);
    setSuspectDup([]);
  }

  function requestClose() {
    if (!confirmDiscard(isDirty)) return;
    clearDraft();
    reset();
    onOpenChange(false);
  }

  function aplicarEmpresa(s: SuspectScan, idx: number) {
    const e = s.empresas[idx];
    setEmpresaSel(idx);
    setSuspectDup([]);
    if (e) setEmpresa(e.nome);
    setEmail(s.contato.email || e?.email || "");
    setTelefone(s.contato.telefone || e?.telefone || "");
  }

  async function lerFoto(files: FileList) {
    setLendo(true);
    try {
      const imagens = await Promise.all(
        Array.from(files)
          .slice(0, 3)
          .map((f) => compressImage(f)),
      );
      const r = await scanFn({ data: { imagens } });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      const s = r.scan;
      setScan(s);
      aplicarEmpresa(s, 0);
      setNome(s.contato.nome || "");
      setSegmentoId(s.ramo.segmento_id);
      const n = s.empresas.length;
      toast.success(n > 1 ? `${n} empresas na foto — escolha qual cadastrar.` : "Foto lida.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao ler a foto.");
    } finally {
      setLendo(false);
    }
  }

  const camera = useCameraCaptureInputs(lerFoto, { multiple: true });

  function formatTelefone(input: string) {
    // Internacional (+56…): deixa como digitado.
    if (input.trim().startsWith("+")) return input.replace(/[^\d+\s()-]/g, "").slice(0, 25);
    const d = input.replace(/\D/g, "").slice(0, 11);
    if (d.length === 0) return "";
    if (d.length <= 2) return `(${d}`;
    if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
    if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  }

  function formatValor(input: string) {
    const d = input.replace(/\D/g, "");
    if (!d) return "";
    const n = Number(d) / 100;
    return n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function parseValor(formatted: string): number | undefined {
    const d = formatted.replace(/\D/g, "");
    if (!d) return undefined;
    return Number(d) / 100;
  }

  function fechar() {
    clearDraft();
    reset();
    onOpenChange(false);
  }

  /** Ramo sugerido pela foto que ainda não existe: cria na hora de salvar. */
  async function resolverSegmento(): Promise<string | null> {
    if (segmentoId) return segmentoId;
    if (!scan?.ramo.nome) return null;
    try {
      const r = await createSegmentoFn({ data: { nome: scan.ramo.nome } });
      await qc.invalidateQueries({ queryKey: ["cadastros", "segmentos"] });
      return r?.id ?? null;
    } catch {
      return null;
    }
  }

  async function criarSuspect() {
    if (!scan) return;
    const e = scan.empresas[empresaSel];
    setCriandoSuspect(true);
    try {
      const segId = await resolverSegmento();
      const r = await createSuspectFn({
        data: {
          empresa: empresa.trim(),
          pais: e?.pais_iso2 || "BR",
          cidade: e?.cidade ?? null,
          endereco: e?.endereco ?? null,
          site: e?.site ?? null,
          documento_fiscal: e?.documento ?? null,
          contato_nome: nome.trim() || null,
          contato_cargo: scan.contato.cargo ?? null,
          contato_email: email.trim() || null,
          contato_telefone: telefone.trim() || null,
          observacoes:
            [scan.produto_descricao && `Produto: ${scan.produto_descricao}`, scan.observacoes]
              .filter(Boolean)
              .join("\n") || null,
          segmento_id: segId,
          titulo: tituloFinal,
          origem_id: origemId,
          valor_estimado: moeda === "BRL" ? (parseValor(valor) ?? null) : null,
          valor_estimado_usd: moeda === "USD" ? (parseValor(valor) ?? null) : null,
          probabilidade: prob ? Number(prob) : 10,
          confirmar_duplicata: suspectDup.length > 0,
        },
      });
      if (!r.ok) {
        setSuspectDup(r.candidatos);
        toast.warning("Já existe cliente com nome parecido. Confirme se é outra empresa.");
        return;
      }
      await qc.invalidateQueries({ queryKey: ["oportunidades", "pipeline"] });
      await qc.invalidateQueries({ queryKey: ["clientes"] });
      toast.success(`Suspect ${r.cliente.codigo} criado. Abra a ficha para minerar os dados.`);
      fechar();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao criar o suspect.");
    } finally {
      setCriandoSuspect(false);
    }
  }

  function criarOportunidade() {
    create.mutate(
      {
        titulo: tituloFinal,
        empresa_lead: empresa.trim() || undefined,
        nome_lead: nome.trim() || undefined,
        email: email.trim() || undefined,
        telefone: telefone.trim() || undefined,
        origem_id: origemId ?? undefined,
        valor_estimado: moeda === "BRL" ? parseValor(valor) : undefined,
        valor_estimado_usd: moeda === "USD" ? parseValor(valor) : undefined,
        probabilidade: prob ? Number(prob) : 10,
        cliente_id: clienteId,
        idempotency_key: idemKey.current,
        confirmar_duplicata: duplicatas.length > 0,
      },
      {
        onSuccess: (r) => {
          if (r.needsConfirm) {
            setDuplicatas(r.duplicatas);
            toast.warning("Encontramos oportunidade parecida. Revise antes de confirmar.");
            return;
          }
          fechar();
        },
      },
    );
  }

  const viaFoto = !!scan && !clienteId;
  const pending = create.isPending || criandoSuspect;
  const podeCriar = tituloFinal.length >= 2 && (!viaFoto || empresa.trim().length >= 2);

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) requestClose();
        else onOpenChange(true);
      }}
    >
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Nova oportunidade</DialogTitle>
          <DialogDescription>
            {clienteId ? (
              <>
                Para o cliente <strong>{empresaNome}</strong>.
              </>
            ) : (
              "Fotografe o produto ou o cartão, ou preencha à mão."
            )}
          </DialogDescription>
        </DialogHeader>

        {!clienteId && (
          <div className="grid gap-2">
            {camera.renderInputs()}
            <Button
              type="button"
              variant="outline"
              className="h-14 w-full border-dashed text-[15px]"
              disabled={lendo}
              onClick={camera.openCamera}
            >
              {lendo ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Lendo a foto…
                </>
              ) : (
                <>
                  <Camera className="mr-2 h-5 w-5" />
                  {scan ? "Tirar outra foto" : "Foto do produto ou cartão"}
                </>
              )}
            </Button>
            {scan && scan.empresas.length > 1 && (
              <div className="flex flex-wrap gap-2">
                {scan.empresas.map((e, i) => (
                  <button
                    key={`${e.nome}-${i}`}
                    type="button"
                    onClick={() => aplicarEmpresa(scan, i)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-[12.5px] transition-colors",
                      i === empresaSel
                        ? "border-primary bg-primary text-primary-foreground"
                        : "bg-background hover:bg-muted",
                    )}
                  >
                    {e.nome}
                    <span className="ml-1 opacity-70">· {PAPEL_LABEL[e.papel]}</span>
                  </button>
                ))}
              </div>
            )}
            {scan?.produto_descricao && (
              <p className="text-[12px] text-muted-foreground">{scan.produto_descricao}</p>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-2">
          {!clienteId && (
            <div className="grid gap-1">
              <Label htmlFor="opp-empresa">Empresa *</Label>
              <Input
                id="opp-empresa"
                value={empresa}
                onChange={(e) => setEmpresa(e.target.value)}
                maxLength={200}
              />
            </div>
          )}
          {!clienteId && (
            <div className="grid gap-1">
              <Label>Ramo</Label>
              <ComboboxAdd
                options={segmentos.data ?? []}
                value={segmentoId}
                onChange={setSegmentoId}
                placeholder={
                  !segmentoId && scan?.ramo.nome ? `Novo: ${scan.ramo.nome}` : "Arroz, Café…"
                }
                emptyText="Digite para adicionar um ramo."
                onCreate={async (n) => {
                  const r = await createSegmentoFn({ data: { nome: n } });
                  await qc.invalidateQueries({ queryKey: ["cadastros", "segmentos"] });
                  return r;
                }}
              />
            </div>
          )}
          <div className="grid gap-1">
            <Label htmlFor="opp-nome">Contato</Label>
            <Input
              id="opp-nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              maxLength={200}
            />
          </div>
          <div className="grid gap-1">
            <Label htmlFor="opp-tel">Telefone</Label>
            <Input
              id="opp-tel"
              type="tel"
              value={telefone}
              onChange={(e) => setTelefone(formatTelefone(e.target.value))}
              placeholder="(00) 00000-0000"
              maxLength={25}
            />
          </div>
          <div className="grid gap-1 sm:col-span-2">
            <Label htmlFor="opp-email">E-mail</Label>
            <Input
              id="opp-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              maxLength={200}
            />
          </div>
        </div>

        <button
          type="button"
          className="flex w-fit items-center gap-1 text-[12.5px] text-muted-foreground hover:text-foreground"
          onClick={() => setMaisDetalhes((v) => !v)}
          aria-expanded={maisDetalhes}
        >
          <ChevronDown
            className={cn("h-4 w-4 transition-transform", maisDetalhes && "rotate-180")}
          />
          Mais detalhes (opcional)
        </button>

        {maisDetalhes && (
          <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-2">
            <div className="grid gap-1 sm:col-span-2">
              <Label htmlFor="opp-titulo">Título</Label>
              <Input
                id="opp-titulo"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                maxLength={200}
                placeholder={tituloFinal || "Empresa — Ramo"}
              />
            </div>
            <div className="grid gap-1">
              <Label htmlFor="opp-valor">Valor estimado</Label>
              <div className="grid grid-cols-[80px_1fr]">
                <Select value={moeda} onValueChange={(v) => setMoeda(v as Moeda)}>
                  <SelectTrigger className="w-full rounded-r-none border-r-0 px-3">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BRL">R$</SelectItem>
                    <SelectItem value="USD">US$</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  id="opp-valor"
                  inputMode="decimal"
                  value={valor}
                  onChange={(e) => setValor(formatValor(e.target.value))}
                  placeholder="0,00"
                  className="w-full rounded-l-none"
                />
              </div>
            </div>
            <div className="grid gap-1">
              <Label htmlFor="opp-prob">Probabilidade (%)</Label>
              <Input
                id="opp-prob"
                type="number"
                min={0}
                max={100}
                value={prob}
                onChange={(e) => setProb(e.target.value)}
              />
            </div>
            <div className="grid gap-1 sm:col-span-2">
              <Label>Origem do lead</Label>
              <ComboboxAdd
                options={origens.data ?? []}
                value={origemId}
                onChange={setOrigemId}
                placeholder="Indicação, feira, LinkedIn…"
                emptyText="Digite para adicionar uma origem."
                onCreate={async (nomeOrigem) => {
                  const r = await createOrigemFn({ data: { nome: nomeOrigem } });
                  await qc.invalidateQueries({ queryKey: ["cadastros", "lead_origens"] });
                  return r;
                }}
              />
            </div>
          </div>
        )}

        {suspectDup.length > 0 && (
          <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
            Já existe cliente parecido:{" "}
            {suspectDup.map((c) => `${c.codigo} ${c.razao_social}`).join(", ")}. Confirme somente se
            for outra empresa.
          </div>
        )}

        {duplicatas.length > 0 && (
          <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
            Já existe oportunidade parecida aberta nas últimas 24h:{" "}
            {duplicatas.map((d) => `${d.codigo} ${d.titulo}`).join(", ")}. Confirme somente se for
            nova.
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={requestClose}>
            Cancelar
          </Button>
          <Button
            disabled={!podeCriar || pending || lendo}
            onClick={() => (viaFoto ? void criarSuspect() : criarOportunidade())}
          >
            {pending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
            {duplicatas.length > 0 || suspectDup.length > 0 ? "Criar mesmo assim" : "Criar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
