import { useRef, useState } from "react";
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
import { Separator } from "@/components/ui/separator";
import { useCreateOportunidade } from "@/lib/oportunidades.queries";
import { useFormDraft } from "@/hooks/use-form-draft";
import { confirmDiscard } from "@/lib/unsaved-guard";
import { toast } from "sonner";
import type { OportunidadeDuplicada } from "@/lib/oportunidades.functions";

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
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [valor, setValor] = useState("");
  const [valorUsd, setValorUsd] = useState("");
  const [prob, setProb] = useState("10");
  const create = useCreateOportunidade();
  /** Chave de idempotência: mesma tentativa nunca gera duas oportunidades. */
  const idemKey = useRef<string>(crypto.randomUUID());
  const [duplicatas, setDuplicatas] = useState<OportunidadeDuplicada[]>([]);

  const initialDraft = {
    titulo: "", empresa: empresaNome ?? "", nome: "", email: "", telefone: "", valor: "", valorUsd: "", prob: "10",
  };
  const draft = { titulo, empresa, nome, email, telefone, valor, valorUsd, prob };
  const { clearDraft, isDirty } = useFormDraft({
    formKey: `oportunidade:nova:${clienteId ?? "pipeline"}`,
    value: draft,
    initialValue: initialDraft,
    enabled: open,
    onRestore: (saved) => {
      setTitulo(saved.titulo); setEmpresa(saved.empresa); setNome(saved.nome); setEmail(saved.email);
      setTelefone(saved.telefone); setValor(saved.valor); setValorUsd(saved.valorUsd ?? ""); setProb(saved.prob);
    },
  });

  function reset() {
    setDuplicatas([]);
    idemKey.current = crypto.randomUUID();
    setTitulo(""); setEmpresa(empresaNome ?? ""); setNome(""); setEmail(""); setTelefone(""); setValor(""); setValorUsd(""); setProb("10");
  }

  function requestClose() {
    if (!confirmDiscard(isDirty)) return;
    clearDraft();
    reset();
    onOpenChange(false);
  }

  function formatTelefone(input: string) {
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

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) requestClose(); else onOpenChange(true); }}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Nova oportunidade</DialogTitle>
          <DialogDescription>Entra como suspect e avança no pipeline conforme qualificação.</DialogDescription>
        </DialogHeader>

        <div className="rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Antes de criar: </span>
          confirme empresa e um contato válido. Depois de criada, o próximo passo é
          agendar a entrevista e enviar o checklist técnico.
          {clienteId && (
            <span className="block mt-1">
              Esta oportunidade já nasce vinculada ao cliente <strong>{empresaNome}</strong>.
            </span>
          )}
        </div>

        <div className="grid gap-3">
          <div className="grid gap-1">
            <Label htmlFor="opp-titulo">Título *</Label>
            <Input id="opp-titulo" value={titulo} onChange={(e) => setTitulo(e.target.value)} maxLength={200} placeholder="Linha de envase — Aurora Foods" />
            <p className="text-[11px] text-muted-foreground">Resumo curto do escopo + nome da empresa.</p>
          </div>

          <Separator />
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Empresa e contato</p>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1">
              <Label htmlFor="opp-empresa">Empresa</Label>
              <Input id="opp-empresa" value={empresa} onChange={(e) => setEmpresa(e.target.value)} maxLength={200} />
            </div>
            <div className="grid gap-1">
              <Label htmlFor="opp-nome">Contato</Label>
              <Input id="opp-nome" value={nome} onChange={(e) => setNome(e.target.value)} maxLength={200} />
            </div>
            <div className="grid gap-1">
              <Label htmlFor="opp-email">Email</Label>
              <Input id="opp-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={200} />
            </div>
            <div className="grid gap-1">
              <Label htmlFor="opp-tel">Telefone</Label>
              <Input id="opp-tel" value={telefone} onChange={(e) => setTelefone(formatTelefone(e.target.value))} placeholder="(00) 00000-0000" maxLength={16} />
            </div>
          </div>

          <Separator />
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Valores e probabilidade</p>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1">
              <Label htmlFor="opp-valor">Valor estimado (R$)</Label>
              <Input id="opp-valor" inputMode="decimal" value={valor} onChange={(e) => setValor(formatValor(e.target.value))} placeholder="0,00" />
            </div>
            <div className="grid gap-1">
              <Label htmlFor="opp-valor-usd">Valor estimado (US$)</Label>
              <Input id="opp-valor-usd" inputMode="decimal" value={valorUsd} onChange={(e) => setValorUsd(formatValor(e.target.value))} placeholder="0,00" />
              <p className="text-[11px] text-muted-foreground">Informe quando a negociação for em dólar.</p>
            </div>
            <div className="grid gap-1">
              <Label htmlFor="opp-prob">Probabilidade (%)</Label>
              <Input id="opp-prob" type="number" min={0} max={100} value={prob} onChange={(e) => setProb(e.target.value)} />
              <p className="text-[11px] text-muted-foreground">Valor × probabilidade alimenta o “Valor ponderado”.</p>
            </div>
          </div>
        </div>

        {duplicatas.length > 0 && (
          <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
            <p className="font-medium">Possível duplicidade</p>
            <p className="mt-1">
              Já existe oportunidade aberta para este cliente/empresa nas últimas 24h com o mesmo
              título ou valor:
            </p>
            <ul className="mt-1 list-disc pl-4">
              {duplicatas.map((d) => (
                <li key={d.id}>
                  <strong>{d.codigo}</strong> — {d.titulo}
                  {d.valor_estimado != null && (
                    <> · R$ {Number(d.valor_estimado).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</>
                  )}
                </li>
              ))}
            </ul>
            <p className="mt-1">Confirme abaixo somente se realmente for uma oportunidade nova.</p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={requestClose}>Cancelar</Button>
          <Button
            disabled={titulo.trim().length < 2 || create.isPending}
            onClick={() => {
              create.mutate(
                {
                  titulo: titulo.trim(),
                  empresa_lead: empresa.trim() || undefined,
                  nome_lead: nome.trim() || undefined,
                  email: email.trim() || undefined,
                  telefone: telefone.trim() || undefined,
                  valor_estimado: parseValor(valor),
                  valor_estimado_usd: parseValor(valorUsd),
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
                    clearDraft();
                    reset();
                    onOpenChange(false);
                  },
                },
              );
            }}
          >
            {create.isPending ? "Criando…" : duplicatas.length > 0 ? "Criar mesmo assim" : "Criar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
