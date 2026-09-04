import { createFileRoute, useParams } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { publicGetCotacao, publicSubmitProposta } from "@/lib/cotacoes.functions";

export const Route = createFileRoute("/p/cotacao/$token")({
  ssr: false,
  component: PublicCotacaoPage,
});

type Item = {
  id: string;
  descricao_snapshot: string;
  spec_snapshot: string | null;
  part_number_snapshot: string | null;
  unidade: string;
  quantidade: number;
};

function PublicCotacaoPage() {
  const { token } = useParams({ from: "/p/cotacao/$token" });
  const getFn = useServerFn(publicGetCotacao);
  const submitFn = useServerFn(publicSubmitProposta);
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: ["public-cotacao", token],
    queryFn: () => getFn({ data: { token } }),
    retry: false,
  });

  const [prices, setPrices] = useState<Record<string, { preco: string; prazo: string; obs: string }>>({});
  const [moeda, setMoeda] = useState("BRL");
  const [validoAte, setValidoAte] = useState("");
  const [condPag, setCondPag] = useState("");
  const [obs, setObs] = useState("");
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (q.data?.proposta) {
      const p = q.data.proposta as { moeda: string; valido_ate: string | null; condicoes_pagamento: string | null; observacoes: string | null };
      setMoeda(p.moeda || "BRL");
      setValidoAte(p.valido_ate?.slice(0, 10) ?? "");
      setCondPag(p.condicoes_pagamento ?? "");
      setObs(p.observacoes ?? "");
      const initial: typeof prices = {};
      for (const pi of (q.data.proposta_itens ?? []) as Array<{ cotacao_item_id: string; preco_unitario: number; prazo_entrega_dias: number | null; observacao: string | null }>) {
        initial[pi.cotacao_item_id] = {
          preco: String(pi.preco_unitario ?? ""),
          prazo: pi.prazo_entrega_dias != null ? String(pi.prazo_entrega_dias) : "",
          obs: pi.observacao ?? "",
        };
      }
      setPrices(initial);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q.data?.proposta?.id]);

  if (q.isLoading) {
    return <div className="p-10 text-center">Carregando…</div>;
  }
  if (q.error || !q.data) {
    return (
      <div className="mx-auto max-w-md p-10 text-center">
        <h1 className="text-lg font-semibold">Convite inválido</h1>
        <p className="mt-2 text-sm text-zinc-500">
          Este link pode ter expirado ou está incorreto.
        </p>
      </div>
    );
  }

  const cot = q.data.cotacao as {
    codigo: string;
    titulo: string;
    descricao: string | null;
    prazo_resposta: string | null;
    incoterm: string | null;
    moeda: string;
    condicoes_pagamento: string | null;
  };
  const itens = (q.data.itens ?? []) as Item[];
  const fornecedor = (q.data.convite as { fornecedores?: { nome_fantasia: string; razao_social: string; codigo: string } | null }).fornecedores;

  async function submit() {
    const linhas: Array<{ cotacao_item_id: string; preco_unitario: number; prazo_entrega_dias: number | null; observacao: string | null }> = [];
    for (const it of itens) {
      const p = prices[it.id];
      const preco = p ? Number(p.preco.replace(",", ".")) : NaN;
      if (!p || !isFinite(preco) || preco < 0) {
        toast.error(`Informe um preço válido para "${it.descricao_snapshot}"`);
        return;
      }
      linhas.push({
        cotacao_item_id: it.id,
        preco_unitario: preco,
        prazo_entrega_dias: p.prazo ? Number(p.prazo) : null,
        observacao: p.obs || null,
      });
    }
    setEnviando(true);
    try {
      await submitFn({
        data: {
          token,
          moeda,
          valido_ate: validoAte || null,
          observacoes: obs || null,
          condicoes_pagamento: condPag || null,
          itens: linhas,
        },
      });
      toast.success("Proposta enviada!");
      qc.invalidateQueries({ queryKey: ["public-cotacao", token] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao enviar");
    } finally {
      setEnviando(false);
    }
  }

  function setField(id: string, field: "preco" | "prazo" | "obs", value: string) {
    setPrices((prev) => ({
      ...prev,
      [id]: { ...(prev[id] ?? { preco: "", prazo: "", obs: "" }), [field]: value },
    }));
  }

  const ja = !!q.data.proposta;

  return (
    <div className="min-h-screen bg-zinc-50 py-8">
      <div className="mx-auto max-w-4xl px-4">
        <div className="rounded-lg border bg-white p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-xs uppercase text-zinc-500">Checklist {cot.codigo}</div>
              <h1 className="mt-1 text-2xl font-bold">{cot.titulo}</h1>
              {cot.descricao && <p className="mt-1 text-sm text-zinc-600">{cot.descricao}</p>}
              {fornecedor && (
                <p className="mt-2 text-sm">
                  Fornecedor:{" "}
                  <strong>{fornecedor.nome_fantasia || fornecedor.razao_social}</strong>
                </p>
              )}
            </div>
            {ja && <Badge className="bg-emerald-100 text-emerald-700">Proposta enviada</Badge>}
          </div>

          <div className="mt-4 grid grid-cols-1 gap-2 text-sm sm:grid-cols-3">
            {cot.prazo_resposta && (
              <div>
                <span className="text-zinc-500">Prazo resposta: </span>
                {new Date(cot.prazo_resposta).toLocaleDateString("pt-BR")}
              </div>
            )}
            {cot.incoterm && (
              <div>
                <span className="text-zinc-500">Incoterm: </span>
                {cot.incoterm}
              </div>
            )}
            {cot.condicoes_pagamento && (
              <div>
                <span className="text-zinc-500">Pagamento: </span>
                {cot.condicoes_pagamento}
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 rounded-lg border bg-white p-6">
          <h2 className="mb-3 text-lg font-semibold">Itens solicitados</h2>
          <div className="space-y-3">
            {itens.map((it) => {
              const v = prices[it.id] ?? { preco: "", prazo: "", obs: "" };
              return (
                <div key={it.id} className="rounded border p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-medium">{it.descricao_snapshot}</div>
                      {it.part_number_snapshot && (
                        <div className="text-xs text-zinc-500">PN: {it.part_number_snapshot}</div>
                      )}
                      {it.spec_snapshot && (
                        <div className="mt-1 text-xs text-zinc-600">{it.spec_snapshot}</div>
                      )}
                    </div>
                    <Badge variant="outline">
                      {it.quantidade} {it.unidade}
                    </Badge>
                  </div>
                  <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <div>
                      <Label className="text-xs">Preço unitário ({moeda})</Label>
                      <Input
                        inputMode="decimal"
                        value={v.preco}
                        onChange={(e) => setField(it.id, "preco", e.target.value)}
                        placeholder="0,00"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Prazo (dias)</Label>
                      <Input
                        inputMode="numeric"
                        value={v.prazo}
                        onChange={(e) => setField(it.id, "prazo", e.target.value)}
                        placeholder="30"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Observação</Label>
                      <Input
                        value={v.obs}
                        onChange={(e) => setField(it.id, "obs", e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-4 rounded-lg border bg-white p-6">
          <h2 className="mb-3 text-lg font-semibold">Condições da proposta</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label>Moeda</Label>
              <Input value={moeda} onChange={(e) => setMoeda(e.target.value.toUpperCase())} maxLength={5} />
            </div>
            <div>
              <Label>Válido até</Label>
              <Input type="date" value={validoAte} onChange={(e) => setValidoAte(e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <Label>Condições de pagamento</Label>
              <Input value={condPag} onChange={(e) => setCondPag(e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <Label>Observações gerais</Label>
              <Textarea rows={3} value={obs} onChange={(e) => setObs(e.target.value)} />
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <Button disabled={enviando} onClick={submit}>
              {ja ? "Atualizar proposta" : "Enviar proposta"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
