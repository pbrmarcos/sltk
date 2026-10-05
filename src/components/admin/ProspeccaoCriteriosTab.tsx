import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Plus, X, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { getProspeccaoConfig, saveProspeccaoConfig } from "@/lib/prospeccao.functions";

export function ProspeccaoCriteriosTab() {
  const getFn = useServerFn(getProspeccaoConfig);
  const saveFn = useServerFn(saveProspeccaoConfig);

  const [perfil, setPerfil] = useState("");
  const [nichos, setNichos] = useState<string[]>([]);
  const [novoNicho, setNovoNicho] = useState("");
  const [semContato, setSemContato] = useState(true);
  const [docInativo, setDocInativo] = useState(true);
  const [mei, setMei] = useState(true);
  const [maxAuto, setMaxAuto] = useState(50);
  const [saving, setSaving] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  const q = useQuery({ queryKey: ["admin", "prospeccao-config"], queryFn: () => getFn() });

  useEffect(() => {
    if (q.data && !hydrated) {
      setPerfil(q.data.perfil_ideal);
      setNichos(q.data.nichos_proibidos);
      setSemContato(q.data.regras_duras.sem_contato ?? true);
      setDocInativo(q.data.regras_duras.doc_inativo ?? true);
      setMei(q.data.regras_duras.mei ?? true);
      setMaxAuto(q.data.max_leads_auto);
      setHydrated(true);
    }
  }, [q.data, hydrated]);

  async function salvar() {
    setSaving(true);
    try {
      await saveFn({
        data: {
          perfil_ideal: perfil.trim(),
          nichos_proibidos: nichos,
          regras_duras: { sem_contato: semContato, doc_inativo: docInativo, mei },
          max_leads_auto: maxAuto,
        },
      });
      toast.success("Critérios de prospecção salvos.");
      await q.refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  if (q.isLoading) {
    return (
      <div className="flex items-center gap-2 p-6 text-sm text-[var(--text-muted)]">
        <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-[var(--bg-border)] bg-[var(--bg-surface)] p-4 text-sm text-[var(--text-muted)]">
        <Target className="mr-1.5 inline h-4 w-4 text-[var(--primary)]" />
        Estes critérios guiam a <strong>qualificação automática de leads por IA</strong> (nota
        A/B/C) na mineração Penta e no suspect por foto. As regras duras reprovam sem gastar IA.
      </div>

      <div className="space-y-4 rounded-lg border border-[var(--bg-border)] bg-[var(--bg-surface)] p-4">
        <div className="space-y-1.5">
          <Label htmlFor="pc-perfil">Perfil ideal de cliente (texto livre, lido pela IA)</Label>
          <Textarea
            id="pc-perfil"
            rows={8}
            maxLength={4000}
            value={perfil}
            onChange={(e) => setPerfil(e.target.value)}
          />
          <p className="text-xs text-[var(--text-muted)]">
            Descreva quem compra da SLTK: setores, porte, sinais positivos e negativos. Os 5 maiores
            clientes ativos entram automaticamente como comparação.
          </p>
        </div>

        <div className="space-y-2">
          <Label>Nichos proibidos (nota C na hora, sem IA)</Label>
          <div className="flex flex-wrap gap-1.5">
            {nichos.map((n, i) => (
              <Badge key={`${n}-${i}`} variant="outline" className="gap-1 pr-1">
                {n}
                <button
                  onClick={() => setNichos(nichos.filter((_, j) => j !== i))}
                  className="rounded-full p-0.5 hover:bg-[var(--bg-elevated)]"
                  aria-label={`Remover ${n}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            {nichos.length === 0 && (
              <span className="text-xs text-[var(--text-muted)]">Nenhum nicho proibido.</span>
            )}
          </div>
          <div className="flex max-w-md gap-2">
            <Input
              placeholder="ex.: varejo / revenda sem produção"
              value={novoNicho}
              onChange={(e) => setNovoNicho(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && novoNicho.trim()) {
                  setNichos([...nichos, novoNicho.trim()]);
                  setNovoNicho("");
                }
              }}
            />
            <Button
              variant="outline"
              size="icon"
              disabled={!novoNicho.trim()}
              onClick={() => {
                setNichos([...nichos, novoNicho.trim()]);
                setNovoNicho("");
              }}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          <Label>Regras duras (reprovam sem IA)</Label>
          <div className="space-y-2.5 text-sm">
            <label className="flex items-center justify-between gap-3">
              <span>Sem nenhum contato (telefone, e-mail ou site) → C</span>
              <Switch checked={semContato} onCheckedChange={setSemContato} />
            </label>
            <label className="flex items-center justify-between gap-3">
              <span>Cadastro fiscal inativo na Receita → C</span>
              <Switch checked={docInativo} onCheckedChange={setDocInativo} />
            </label>
            <label className="flex items-center justify-between gap-3">
              <span>MEI / microempreendedor → C</span>
              <Switch checked={mei} onCheckedChange={setMei} />
            </label>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="pc-max">Análise automática: máximo de leads por busca na Penta</Label>
          <Input
            id="pc-max"
            type="number"
            min={0}
            max={500}
            value={maxAuto}
            onChange={(e) => setMaxAuto(Math.max(0, Math.min(500, Number(e.target.value) || 0)))}
            className="max-w-[120px]"
          />
          <p className="text-xs text-[var(--text-muted)]">
            Acima disso os leads ficam "pendentes" e podem ser analisados sob demanda. 0 desliga a
            análise automática.
          </p>
        </div>

        <Button size="sm" disabled={saving || perfil.trim().length < 10} onClick={salvar}>
          {saving && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
          Salvar critérios
        </Button>
      </div>
    </div>
  );
}
